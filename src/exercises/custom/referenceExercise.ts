import { calculateAngle } from "../../biomechanics/angles";
import { isVisible, type DetectedPose, type LandmarkPoint } from "../../vision/poseDetector";

const LEGACY_STORAGE_KEY = "physioloop.reference-exercise.v1";
const LIBRARY_STORAGE_KEY = "physioloop.reference-exercises.v2";
const MIN_COMPARABLE_FEATURES = 4;

export const JOINT_METRIC_KEYS = [
  "leftShoulderElevation", "rightShoulderElevation", "leftElbowFlexion", "rightElbowFlexion",
  "leftHipFlexion", "rightHipFlexion", "leftKneeFlexion", "rightKneeFlexion",
] as const;

export type JointMetricKey = (typeof JOINT_METRIC_KEYS)[number];
export type PoseFeatureFrame = Partial<Record<JointMetricKey, number | null>>;
export type LegacyPoseFeatureFrame = Array<number | null>;
export type DemoPoint = { x: number; y: number };
export type DemoFrame = Record<string, DemoPoint>;
export type JointMotion = {
  key: JointMetricKey; label: string; startDegrees: number; activeDegrees: number;
  minDegrees: number; maxDegrees: number; changeDegrees: number; action: string;
};
export type GeneratedCue = { headline: string; detail: string };
export type MotionProfile = {
  primary: JointMotion;
  supporting: JointMotion[];
  summary: string;
  cues: Record<"start" | "perform" | "return" | "adjust", GeneratedCue>;
};
export type ReferenceExercise = {
  version: 1;
  id?: string;
  name: string;
  recordedAt: string;
  durationMs: number;
  frames: Array<PoseFeatureFrame | LegacyPoseFeatureFrame>;
  demoFrames?: DemoFrame[];
  motionProfile?: MotionProfile;
  overrides?: { instruction?: string; cue?: string };
};
export type ReferenceMatch = { index: number; score: number };

const METRIC_LABELS: Record<JointMetricKey, string> = {
  leftShoulderElevation: "left shoulder", rightShoulderElevation: "right shoulder",
  leftElbowFlexion: "left elbow", rightElbowFlexion: "right elbow",
  leftHipFlexion: "left hip", rightHipFlexion: "right hip",
  leftKneeFlexion: "left knee", rightKneeFlexion: "right knee",
};

function referenceId(recordedAt: string): string {
  return `recorded-${recordedAt.replace(/\D/g, "").slice(0, 17)}-${Math.random().toString(36).slice(2, 7)}`;
}

function asFeatureFrame(value: unknown): PoseFeatureFrame | null {
  if (Array.isArray(value)) {
    const frame: PoseFeatureFrame = {};
    JOINT_METRIC_KEYS.forEach((key, index) => {
      const metric = value[index];
      frame[key] = typeof metric === "number" && Number.isFinite(metric) ? metric : null;
    });
    return frame;
  }
  if (!value || typeof value !== "object") return null;
  const frame: PoseFeatureFrame = {};
  for (const key of JOINT_METRIC_KEYS) {
    const metric = (value as Record<string, unknown>)[key];
    frame[key] = typeof metric === "number" && Number.isFinite(metric) ? metric : null;
  }
  return frame;
}

function jointAction(key: JointMetricKey, deltaDegrees: number): string {
  if (key.includes("Shoulder")) return deltaDegrees >= 0 ? "raise the arm" : "lower the arm";
  if (key.includes("Elbow")) return deltaDegrees <= 0 ? "bend the elbow" : "straighten the elbow";
  if (key.includes("Hip")) return deltaDegrees <= 0 ? "bend at the hip" : "extend the hip";
  return deltaDegrees <= 0 ? "bend the knee" : "straighten the knee";
}
const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function analyseRecordedMotion(frames: Array<PoseFeatureFrame | LegacyPoseFeatureFrame>): MotionProfile {
  const namedFrames = frames.map((frame) => asFeatureFrame(frame) ?? {});
  const motions = JOINT_METRIC_KEYS.flatMap((key): JointMotion[] => {
    const values = namedFrames.flatMap((frame) => typeof frame[key] === "number" ? [frame[key]! * 180] : []);
    if (values.length < 2) return [];
    const startWindow = values.slice(0, Math.max(2, Math.ceil(values.length * 0.12)));
    const startDegrees = startWindow.reduce((sum, value) => sum + value, 0) / startWindow.length;
    const minDegrees = Math.min(...values); const maxDegrees = Math.max(...values);
    const activeDegrees = Math.abs(maxDegrees - startDegrees) >= Math.abs(minDegrees - startDegrees) ? maxDegrees : minDegrees;
    const delta = activeDegrees - startDegrees;
    return [{
      key, label: METRIC_LABELS[key], startDegrees: Math.round(startDegrees),
      activeDegrees: Math.round(activeDegrees), minDegrees: Math.round(minDegrees),
      maxDegrees: Math.round(maxDegrees), changeDegrees: Math.round(Math.abs(delta)),
      action: jointAction(key, delta),
    }];
  }).sort((a, b) => b.changeDegrees - a.changeDegrees);

  const primary = motions[0] ?? {
    key: "leftShoulderElevation" as const, label: "shoulder", startDegrees: 0, activeDegrees: 0,
    minDegrees: 0, maxDegrees: 0, changeDegrees: 0, action: "follow the recorded movement",
  };
  const supporting = motions.slice(1).filter((motion) => motion.changeDegrees >= 12).slice(0, 2);
  const summary = `${capitalise(primary.action)} using the ${primary.label}${supporting.length ? `, supported by the ${supporting.map((motion) => motion.label).join(" and ")}` : ""}.`;
  return {
    primary, supporting, summary,
    cues: {
      start: { headline: "Match the starting position", detail: `Set your ${primary.label} near ${primary.startDegrees}° before beginning.` },
      perform: { headline: capitalise(primary.action), detail: `Move the ${primary.label} toward ${primary.activeDegrees}° with control.` },
      return: { headline: "Return with control", detail: `Bring the ${primary.label} back toward ${primary.startDegrees}° to complete the rep.` },
      adjust: { headline: `Check your ${primary.label}`, detail: `Follow the recorded ${primary.action} path; the target range is ${primary.minDegrees}–${primary.maxDegrees}°.` },
    },
  };
}

export function motionProfileFor(reference: ReferenceExercise): MotionProfile {
  return reference.motionProfile ?? analyseRecordedMotion(reference.frames);
}

export function jointExcursionDegrees(reference: ReferenceExercise, key: JointMetricKey): number {
  const values = reference.frames.flatMap((frame) => {
    const value = asFeatureFrame(frame)?.[key];
    return typeof value === "number" ? [value * 180] : [];
  });
  return values.length > 1 ? Math.max(...values) - Math.min(...values) : 0;
}

export function parseReferenceExercise(value: unknown): ReferenceExercise | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const name = typeof candidate.name === "string" ? candidate.name.trim().slice(0, 60) : "";
  const recordedAt = typeof candidate.recordedAt === "string" ? candidate.recordedAt : "";
  const frames = Array.isArray(candidate.frames) ? candidate.frames.flatMap((frame) => asFeatureFrame(frame) ?? []) : [];
  if (candidate.version !== 1 || !name || !recordedAt || !Number.isFinite(candidate.durationMs) || !frames.length) return null;
  return {
    version: 1,
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : referenceId(recordedAt),
    name, recordedAt, durationMs: candidate.durationMs as number, frames,
    ...(Array.isArray(candidate.demoFrames) ? { demoFrames: candidate.demoFrames as DemoFrame[] } : {}),
    ...(candidate.overrides && typeof candidate.overrides === "object" ? {
      overrides: {
        ...((candidate.overrides as Record<string, unknown>).instruction && typeof (candidate.overrides as Record<string, unknown>).instruction === "string"
          ? { instruction: ((candidate.overrides as Record<string, string>).instruction).trim().slice(0, 240) }
          : {}),
        ...((candidate.overrides as Record<string, unknown>).cue && typeof (candidate.overrides as Record<string, unknown>).cue === "string"
          ? { cue: ((candidate.overrides as Record<string, string>).cue).trim().slice(0, 120) }
          : {}),
      },
    } : {}),
    motionProfile: analyseRecordedMotion(frames),
  };
}

function jointAngle(a: LandmarkPoint | null, b: LandmarkPoint | null, c: LandmarkPoint | null): number | null {
  return isVisible(a) && isVisible(b) && isVisible(c) ? calculateAngle(a, b, c) / 180 : null;
}

export function poseFeatureFrame(pose: DetectedPose | null): PoseFeatureFrame | null {
  if (!pose) return null;
  const features: PoseFeatureFrame = {
    leftShoulderElevation: jointAngle(pose.leftHip, pose.leftShoulder, pose.leftWrist),
    rightShoulderElevation: jointAngle(pose.rightHip, pose.rightShoulder, pose.rightWrist),
    leftElbowFlexion: jointAngle(pose.leftShoulder, pose.leftElbow, pose.leftWrist),
    rightElbowFlexion: jointAngle(pose.rightShoulder, pose.rightElbow, pose.rightWrist),
    leftHipFlexion: jointAngle(pose.leftShoulder, pose.leftHip, pose.leftKnee),
    rightHipFlexion: jointAngle(pose.rightShoulder, pose.rightHip, pose.rightKnee),
    leftKneeFlexion: jointAngle(pose.leftHip, pose.leftKnee, pose.leftAnkle),
    rightKneeFlexion: jointAngle(pose.rightHip, pose.rightKnee, pose.rightAnkle),
  };
  return JOINT_METRIC_KEYS.filter((key) => features[key] !== null).length >= MIN_COMPARABLE_FEATURES ? features : null;
}

export function poseDemoFrame(pose: DetectedPose | null): DemoFrame | null {
  if (!pose) return null;
  const source: Record<string, LandmarkPoint | null> = {
    head: pose.landmarks[0] ? { ...pose.landmarks[0], visibility: 1 } : null,
    leftShoulder: pose.leftShoulder, rightShoulder: pose.rightShoulder,
    leftElbow: pose.leftElbow, rightElbow: pose.rightElbow,
    leftWrist: pose.leftWrist, rightWrist: pose.rightWrist,
    leftHip: pose.leftHip, rightHip: pose.rightHip,
    leftKnee: pose.leftKnee, rightKnee: pose.rightKnee,
    leftAnkle: pose.leftAnkle, rightAnkle: pose.rightAnkle,
  };
  const visible = Object.entries(source).filter((entry): entry is [string, LandmarkPoint] => isVisible(entry[1]));
  if (visible.length < 9) return null;
  const xs = visible.map(([, point]) => point.x); const ys = visible.map(([, point]) => point.y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const width = Math.max(0.01, maxX - minX); const height = Math.max(0.01, maxY - minY);
  return Object.fromEntries(visible.map(([key, point]) => [key, {
    x: 0.12 + ((point.x - minX) / width) * 0.76,
    y: 0.08 + ((point.y - minY) / height) * 0.84,
  }]));
}

function frameScore(current: PoseFeatureFrame, referenceValue: PoseFeatureFrame | LegacyPoseFeatureFrame): number | null {
  const reference = asFeatureFrame(referenceValue) ?? {};
  let difference = 0; let compared = 0;
  for (const key of JOINT_METRIC_KEYS) {
    const a = current[key]; const b = reference[key];
    if (typeof a !== "number" || typeof b !== "number") continue;
    difference += Math.abs(a - b); compared += 1;
  }
  if (compared < MIN_COMPARABLE_FEATURES) return null;
  return Math.max(0, Math.min(100, (1 - (difference / compared) * 2.5) * 100));
}

export function findReferenceMatch(current: PoseFeatureFrame, reference: ReferenceExercise, fromIndex = 0, toIndex = reference.frames.length - 1): ReferenceMatch | null {
  let best: ReferenceMatch | null = null;
  for (let index = Math.max(0, fromIndex); index <= Math.min(reference.frames.length - 1, toIndex); index += 1) {
    const score = frameScore(current, reference.frames[index]);
    if (score !== null && (!best || score > best.score)) best = { index, score };
  }
  return best;
}

export function loadReferenceExercises(): ReferenceExercise[] {
  try {
    const stored = JSON.parse(localStorage.getItem(LIBRARY_STORAGE_KEY) ?? "[]");
    const library = Array.isArray(stored) ? stored.flatMap((item) => parseReferenceExercise(item) ?? []) : [];
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    const legacy = legacyRaw ? parseReferenceExercise(JSON.parse(legacyRaw)) : null;
    if (legacy && !library.some((item) => item.recordedAt === legacy.recordedAt)) library.push(legacy);
    return library.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  } catch { return []; }
}

export function saveReferenceExercise(reference: ReferenceExercise): void {
  const library = loadReferenceExercises().filter((item) => item.id !== reference.id && item.recordedAt !== reference.recordedAt);
  localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify([reference, ...library]));
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}
export function loadReferenceExercise(): ReferenceExercise | null { return loadReferenceExercises()[0] ?? null; }
export function clearReferenceExercise(id?: string): void {
  if (!id) return;
  localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(loadReferenceExercises().filter((item) => item.id !== id)));
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}
