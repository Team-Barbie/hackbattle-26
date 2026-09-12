type Point = { x: number; y: number };

type Pose = {
  ankle: Point;
  knee: Point;
  hip: Point;
  shoulder: Point;
  head: Point;
};

const ACCENT = "#e2ff3d";
const BONE = "#f4f4ef";

/** Side-on silhouette, normalised 0-1: standing tall. */
const UP: Pose = {
  ankle: { x: 0.5, y: 0.92 },
  knee: { x: 0.5, y: 0.72 },
  hip: { x: 0.5, y: 0.48 },
  shoulder: { x: 0.52, y: 0.26 },
  head: { x: 0.53, y: 0.14 },
};

/** Side-on silhouette, normalised 0-1: hips back, chest forward, knee tracking over the toe. */
const DOWN: Pose = {
  ankle: { x: 0.5, y: 0.92 },
  knee: { x: 0.62, y: 0.74 },
  hip: { x: 0.4, y: 0.7 },
  shoulder: { x: 0.5, y: 0.42 },
  head: { x: 0.54, y: 0.3 },
};

/** Full up-down-up cycle, in milliseconds. */
export const SQUAT_DEMO_CYCLE_MS = 3200;
/** Fraction of the cycle spent paused at each end, so the pose reads before it moves again. */
const HOLD_FRACTION = 0.16;

function lerpPoint(a: Point, b: Point, amount: number): Point {
  return { x: a.x + (b.x - a.x) * amount, y: a.y + (b.y - a.y) * amount };
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Maps a point in [0, 1] progress through the cycle to a 0-1 "how far down"
 * amount, holding briefly at the top and bottom so each pose is readable
 * before easing into the next.
 */
function descentAmount(progress: number): number {
  const down = 0.5;

  if (progress < HOLD_FRACTION) {
    return 0;
  }

  if (progress < down - HOLD_FRACTION) {
    return easeInOut((progress - HOLD_FRACTION) / (down - HOLD_FRACTION * 2));
  }

  if (progress < down + HOLD_FRACTION) {
    return 1;
  }

  if (progress < 1 - HOLD_FRACTION) {
    return 1 - easeInOut((progress - down - HOLD_FRACTION) / (down - HOLD_FRACTION * 2));
  }

  return 0;
}

function poseAt(progress: number): Pose {
  const amount = descentAmount(progress);

  return {
    ankle: lerpPoint(UP.ankle, DOWN.ankle, amount),
    knee: lerpPoint(UP.knee, DOWN.knee, amount),
    hip: lerpPoint(UP.hip, DOWN.hip, amount),
    shoulder: lerpPoint(UP.shoulder, DOWN.shoulder, amount),
    head: lerpPoint(UP.head, DOWN.head, amount),
  };
}

function toScreen(point: Point, width: number, height: number): Point {
  return { x: point.x * width, y: point.y * height };
}

function drawBone(
  context: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  width: number,
  height: number,
  lineWidth: number,
) {
  const start = toScreen(from, width, height);
  const end = toScreen(to, width, height);

  context.strokeStyle = ACCENT;
  context.lineWidth = lineWidth;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();
}

/**
 * Draws one frame of the looping squat demo at `elapsedMs` since the loop
 * started. Pure keyframe animation — no camera, no pose model — so it can
 * render instantly on a page that never asks for permissions.
 */
export function drawSquatDemoFrame(canvas: HTMLCanvasElement, elapsedMs: number) {
  const width = canvas.clientWidth * window.devicePixelRatio;
  const height = canvas.clientHeight * window.devicePixelRatio;

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

  context.clearRect(0, 0, canvas.width, canvas.height);

  const progress = (elapsedMs % SQUAT_DEMO_CYCLE_MS) / SQUAT_DEMO_CYCLE_MS;
  const pose = poseAt(progress);
  const line = Math.max(2.4, canvas.width * 0.02);
  const jointRadius = Math.max(2.2, line * 0.85);

  drawBone(context, pose.ankle, pose.knee, canvas.width, canvas.height, line);
  drawBone(context, pose.knee, pose.hip, canvas.width, canvas.height, line);
  drawBone(context, pose.hip, pose.shoulder, canvas.width, canvas.height, line);
  drawBone(context, pose.shoulder, pose.head, canvas.width, canvas.height, line);

  for (const joint of [pose.ankle, pose.knee, pose.hip, pose.shoulder]) {
    const { x, y } = toScreen(joint, canvas.width, canvas.height);
    context.fillStyle = BONE;
    context.beginPath();
    context.arc(x, y, jointRadius, 0, Math.PI * 2);
    context.fill();
  }

  const head = toScreen(pose.head, canvas.width, canvas.height);
  context.fillStyle = ACCENT;
  context.beginPath();
  context.arc(head.x, head.y, line * 2.2, 0, Math.PI * 2);
  context.fill();
}
