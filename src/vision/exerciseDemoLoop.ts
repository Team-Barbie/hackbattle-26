import type { ExerciseId } from "../exercises/exerciseCatalog";

type Point = { x: number; y: number };

/**
 * A simplified full-body figure in normalised 0-1 canvas space. Side-on
 * exercises overlap the left/right joints so the silhouette reads as one limb.
 */
type Figure = {
  head: Point;
  neck: Point;
  lShoulder: Point;
  rShoulder: Point;
  lElbow: Point;
  rElbow: Point;
  lWrist: Point;
  rWrist: Point;
  lHip: Point;
  rHip: Point;
  lKnee: Point;
  rKnee: Point;
  lAnkle: Point;
  rAnkle: Point;
};

type Keyframes = {
  rest: Figure;
  active: Figure;
  /** Full rest → active → rest cycle length. */
  cycleMs: number;
};

const BONES: Array<[keyof Figure, keyof Figure]> = [
  ["neck", "head"],
  ["lShoulder", "rShoulder"],
  ["neck", "lShoulder"],
  ["neck", "rShoulder"],
  ["lShoulder", "lElbow"],
  ["lElbow", "lWrist"],
  ["rShoulder", "rElbow"],
  ["rElbow", "rWrist"],
  ["lShoulder", "lHip"],
  ["rShoulder", "rHip"],
  ["lHip", "rHip"],
  ["lHip", "lKnee"],
  ["lKnee", "lAnkle"],
  ["rHip", "rKnee"],
  ["rKnee", "rAnkle"],
];

const JOINTS: Array<keyof Figure> = [
  "lShoulder",
  "rShoulder",
  "lElbow",
  "rElbow",
  "lWrist",
  "rWrist",
  "lHip",
  "rHip",
  "lKnee",
  "rKnee",
  "lAnkle",
  "rAnkle",
];

/** Facing the camera, arms relaxed. */
const FRONT_REST: Figure = {
  head: { x: 0.5, y: 0.12 },
  neck: { x: 0.5, y: 0.22 },
  lShoulder: { x: 0.4, y: 0.25 },
  rShoulder: { x: 0.6, y: 0.25 },
  lElbow: { x: 0.36, y: 0.4 },
  rElbow: { x: 0.64, y: 0.4 },
  lWrist: { x: 0.34, y: 0.53 },
  rWrist: { x: 0.66, y: 0.53 },
  lHip: { x: 0.45, y: 0.52 },
  rHip: { x: 0.55, y: 0.52 },
  lKnee: { x: 0.45, y: 0.72 },
  rKnee: { x: 0.55, y: 0.72 },
  lAnkle: { x: 0.45, y: 0.91 },
  rAnkle: { x: 0.55, y: 0.91 },
};

/** Side-on, standing tall (both sides overlap). */
const SIDE_REST: Figure = {
  head: { x: 0.53, y: 0.13 },
  neck: { x: 0.52, y: 0.23 },
  lShoulder: { x: 0.52, y: 0.26 },
  rShoulder: { x: 0.52, y: 0.26 },
  lElbow: { x: 0.53, y: 0.4 },
  rElbow: { x: 0.53, y: 0.4 },
  lWrist: { x: 0.54, y: 0.52 },
  rWrist: { x: 0.54, y: 0.52 },
  lHip: { x: 0.5, y: 0.5 },
  rHip: { x: 0.5, y: 0.5 },
  lKnee: { x: 0.5, y: 0.72 },
  rKnee: { x: 0.5, y: 0.72 },
  lAnkle: { x: 0.5, y: 0.92 },
  rAnkle: { x: 0.5, y: 0.92 },
};

const KEYFRAMES: Record<ExerciseId, Keyframes> = {
  squat: {
    rest: SIDE_REST,
    active: {
      ...SIDE_REST,
      head: { x: 0.56, y: 0.31 },
      neck: { x: 0.52, y: 0.4 },
      lShoulder: { x: 0.51, y: 0.43 },
      rShoulder: { x: 0.51, y: 0.43 },
      lElbow: { x: 0.64, y: 0.46 },
      rElbow: { x: 0.64, y: 0.46 },
      lWrist: { x: 0.76, y: 0.44 },
      rWrist: { x: 0.76, y: 0.44 },
      lHip: { x: 0.4, y: 0.7 },
      rHip: { x: 0.4, y: 0.7 },
      lKnee: { x: 0.62, y: 0.74 },
      rKnee: { x: 0.62, y: 0.74 },
    },
    cycleMs: 3200,
  },
  "knee-raise": {
    rest: SIDE_REST,
    active: {
      ...SIDE_REST,
      rKnee: { x: 0.66, y: 0.56 },
      rAnkle: { x: 0.62, y: 0.74 },
    },
    cycleMs: 2800,
  },
  "lateral-raise": {
    rest: FRONT_REST,
    active: {
      ...FRONT_REST,
      lElbow: { x: 0.24, y: 0.27 },
      rElbow: { x: 0.76, y: 0.27 },
      lWrist: { x: 0.09, y: 0.25 },
      rWrist: { x: 0.91, y: 0.25 },
    },
    cycleMs: 3000,
  },
  "shoulder-raise": {
    rest: FRONT_REST,
    active: {
      ...FRONT_REST,
      lElbow: { x: 0.38, y: 0.1 },
      rElbow: { x: 0.62, y: 0.1 },
      lWrist: { x: 0.42, y: 0.03 },
      rWrist: { x: 0.58, y: 0.03 },
    },
    cycleMs: 3400,
  },
  "bicep-curl": {
    rest: FRONT_REST,
    active: {
      ...FRONT_REST,
      lWrist: { x: 0.4, y: 0.27 },
      rWrist: { x: 0.6, y: 0.27 },
    },
    cycleMs: 2600,
  },
  custom: {
    rest: FRONT_REST,
    active: {
      ...FRONT_REST,
      lElbow: { x: 0.3, y: 0.36 },
      rElbow: { x: 0.7, y: 0.36 },
      lWrist: { x: 0.26, y: 0.47 },
      rWrist: { x: 0.74, y: 0.47 },
    },
    cycleMs: 3600,
  },
};

/** Fraction of the cycle spent paused at each end, so the pose reads before it moves again. */
const HOLD_FRACTION = 0.16;

function lerp(a: Point, b: Point, amount: number): Point {
  return { x: a.x + (b.x - a.x) * amount, y: a.y + (b.y - a.y) * amount };
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Maps 0-1 progress through the cycle to a 0-1 "how far into the movement"
 * amount, holding briefly at each end so both poses are readable.
 */
function activationAmount(progress: number): number {
  const midpoint = 0.5;
  const travel = midpoint - HOLD_FRACTION * 2;

  if (progress < HOLD_FRACTION) {
    return 0;
  }

  if (progress < midpoint - HOLD_FRACTION) {
    return easeInOut((progress - HOLD_FRACTION) / travel);
  }

  if (progress < midpoint + HOLD_FRACTION) {
    return 1;
  }

  if (progress < 1 - HOLD_FRACTION) {
    return 1 - easeInOut((progress - midpoint - HOLD_FRACTION) / travel);
  }

  return 0;
}

function figureAt(frames: Keyframes, progress: number): Figure {
  const amount = activationAmount(progress);
  const result = {} as Figure;

  for (const key of Object.keys(frames.rest) as Array<keyof Figure>) {
    result[key] = lerp(frames.rest[key], frames.active[key], amount);
  }

  return result;
}

function themeColour(name: string, fallback: string): string {
  if (typeof document === "undefined") {
    return fallback;
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * Draws one frame of the looping demonstration for `exerciseId` at
 * `elapsedMs` since the loop started. Pure keyframe animation — no camera,
 * no pose model — so it renders instantly on pages that never ask for
 * permissions.
 */
export function drawExerciseDemoFrame(
  canvas: HTMLCanvasElement,
  exerciseId: ExerciseId,
  elapsedMs: number,
) {
  const scale = window.devicePixelRatio || 1;
  const width = Math.round(canvas.clientWidth * scale);
  const height = Math.round(canvas.clientHeight * scale);

  if (width < 2 || height < 2) {
    return;
  }

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  const frames = KEYFRAMES[exerciseId];
  const progress = (elapsedMs % frames.cycleMs) / frames.cycleMs;
  const figure = figureAt(frames, progress);
  const accent = themeColour("--accent", "#f3f3f1");
  const bone = themeColour("--text", "#f3f3f1");
  const floor = themeColour("--line-strong", "#3a3a3a");

  const toScreen = (point: Point): Point => ({ x: point.x * width, y: point.y * height });
  const lineWidth = Math.max(2.4, Math.min(width, height) * 0.02);

  context.clearRect(0, 0, width, height);

  // Floor line under the feet so the figure has somewhere to stand.
  const floorY = height * 0.93;
  context.strokeStyle = floor;
  context.lineWidth = Math.max(1, scale);
  context.setLineDash([lineWidth, lineWidth * 1.4]);
  context.beginPath();
  context.moveTo(width * 0.12, floorY);
  context.lineTo(width * 0.88, floorY);
  context.stroke();
  context.setLineDash([]);

  context.strokeStyle = accent;
  context.lineWidth = lineWidth;
  context.lineCap = "round";
  context.lineJoin = "round";

  for (const [from, to] of BONES) {
    const start = toScreen(figure[from]);
    const end = toScreen(figure[to]);
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
  }

  context.fillStyle = bone;
  const jointRadius = lineWidth * 0.75;

  for (const joint of JOINTS) {
    const { x, y } = toScreen(figure[joint]);
    context.beginPath();
    context.arc(x, y, jointRadius, 0, Math.PI * 2);
    context.fill();
  }

  const head = toScreen(figure.head);
  context.fillStyle = accent;
  context.beginPath();
  context.arc(head.x, head.y, lineWidth * 1.9, 0, Math.PI * 2);
  context.fill();
}
