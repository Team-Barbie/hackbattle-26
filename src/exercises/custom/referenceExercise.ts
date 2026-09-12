import { calculateAngle } from "../../biomechanics/angles";
import { isVisible, type DetectedPose, type LandmarkPoint } from "../../vision/poseDetector";

const STORAGE_KEY = "physioloop.reference-exercise.v1";
const MIN_COMPARABLE_FEATURES = 4;

export type PoseFeatureFrame = Array<number | null>;

export type ReferenceExercise = {
  version: 1;
  name: string;
  recordedAt: string;
  durationMs: number;
  frames: PoseFeatureFrame[];
};

export type ReferenceMatch = {
  index: number;
  score: number;
};

export function parseReferenceExercise(value: unknown): ReferenceExercise | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<ReferenceExercise>;
  const name = typeof candidate.name === "string" ? candidate.name.trim().slice(0, 60) : "";

  if (
    candidate.version !== 1 ||
    !name ||
    typeof candidate.recordedAt !== "string" ||
    !Number.isFinite(candidate.durationMs) ||
    !Array.isArray(candidate.frames) ||
    candidate.frames.length === 0
  ) {
    return null;
  }

  return { ...candidate, name } as ReferenceExercise;
}

function jointAngle(
  a: LandmarkPoint | null,
  b: LandmarkPoint | null,
  c: LandmarkPoint | null,
): number | null {
  if (!isVisible(a) || !isVisible(b) || !isVisible(c)) {
    return null;
  }

  return calculateAngle(a, b, c) / 180;
}

/**
 * Joint angles are translation, scale, and camera-distance independent. Only
 * these derived avatar features are stored; camera frames never leave memory.
 */
export function poseFeatureFrame(pose: DetectedPose | null): PoseFeatureFrame | null {
  if (!pose) {
    return null;
  }

  const features: PoseFeatureFrame = [
    jointAngle(pose.leftHip, pose.leftShoulder, pose.leftWrist),
    jointAngle(pose.rightHip, pose.rightShoulder, pose.rightWrist),
    jointAngle(pose.leftShoulder, pose.leftElbow, pose.leftWrist),
    jointAngle(pose.rightShoulder, pose.rightElbow, pose.rightWrist),
    jointAngle(pose.leftShoulder, pose.leftHip, pose.leftKnee),
    jointAngle(pose.rightShoulder, pose.rightHip, pose.rightKnee),
    jointAngle(pose.leftHip, pose.leftKnee, pose.leftAnkle),
    jointAngle(pose.rightHip, pose.rightKnee, pose.rightAnkle),
  ];

  return features.filter((value) => value !== null).length >= MIN_COMPARABLE_FEATURES
    ? features
    : null;
}

function frameScore(current: PoseFeatureFrame, reference: PoseFeatureFrame): number | null {
  let difference = 0;
  let compared = 0;

  for (let index = 0; index < current.length; index += 1) {
    const currentValue = current[index];
    const referenceValue = reference[index];

    if (currentValue === null || referenceValue === null) {
      continue;
    }

    difference += Math.abs(currentValue - referenceValue);
    compared += 1;
  }

  if (compared < MIN_COMPARABLE_FEATURES) {
    return null;
  }

  const meanDifference = difference / compared;
  return Math.max(0, Math.min(100, (1 - meanDifference * 2.5) * 100));
}

export function findReferenceMatch(
  current: PoseFeatureFrame,
  reference: ReferenceExercise,
  fromIndex = 0,
  toIndex = reference.frames.length - 1,
): ReferenceMatch | null {
  let best: ReferenceMatch | null = null;
  const from = Math.max(0, fromIndex);
  const to = Math.min(reference.frames.length - 1, toIndex);

  for (let index = from; index <= to; index += 1) {
    const score = frameScore(current, reference.frames[index]);

    if (score !== null && (!best || score > best.score)) {
      best = { index, score };
    }
  }

  return best;
}

export function saveReferenceExercise(reference: ReferenceExercise): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reference));
}

export function loadReferenceExercise(): ReferenceExercise | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    return parseReferenceExercise(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearReferenceExercise(): void {
  localStorage.removeItem(STORAGE_KEY);
}
