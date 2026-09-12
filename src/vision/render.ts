import { DrawingUtils, PoseLandmarker } from "@mediapipe/tasks-vision";
import type { DetectedPose } from "./poseDetector";

const ACCENT = "#f1af35";
const BONE = "#efefef";
const VISIBLE_LANDMARK = 0.16;

const NOSE = 0;
const LEFT_EAR = 7;
const RIGHT_EAR = 8;

const FACE_ONLY = new Set([1, 2, 3, 4, 5, 6, 9, 10]);

let overlayUtils: DrawingUtils | null = null;

export function drawPoseOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  pose: DetectedPose | null,
) {
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    overlayUtils = null;
  }

  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  if (!pose) {
    return;
  }

  const visibleLandmarks = pose.landmarks.map((landmark) =>
    (landmark.visibility ?? 0) >= VISIBLE_LANDMARK ? landmark : undefined,
  );
  const visibleConnections = PoseLandmarker.POSE_CONNECTIONS.filter(
    (connection) => visibleLandmarks[connection.start] && visibleLandmarks[connection.end],
  );

  overlayUtils ??= new DrawingUtils(context);
  overlayUtils.drawConnectors(pose.landmarks, visibleConnections, {
    color: ACCENT,
    lineWidth: 4,
  });
  overlayUtils.drawLandmarks(
    visibleLandmarks.filter((landmark): landmark is NonNullable<typeof landmark> =>
      Boolean(landmark),
    ),
    {
      color: BONE,
      radius: 5,
      fillColor: ACCENT,
    },
  );
}

type Vec = { x: number; y: number };
type HeldPoint = { x: number; y: number; at: number };
type Box = { cx: number; cy: number; w: number; h: number };
type Transform = { cx: number; cy: number; scale: number };

/** A joint keeps its last good position this long after it stops being tracked. */
const HOLD_MS = 400;
const MIN_VISIBILITY = 0.2;
const FIT_PADDING = 0.84;
const MIN_BOX_WIDTH = 0.1;
const MIN_BOX_HEIGHT = 0.2;
const MIN_TRACKED_POINTS = 6;

const held: Array<HeldPoint | null> = [];
let view: Box | null = null;

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function dist(a: Vec, b: Vec): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function takePoint(
  landmarks: DetectedPose["landmarks"],
  index: number,
  now: number,
): Vec | null {
  const point = landmarks[index];

  if (
    point &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    (point.visibility ?? 1) >= MIN_VISIBILITY
  ) {
    held[index] = { x: point.x, y: point.y, at: now };
    return { x: point.x, y: point.y };
  }

  const previous = held[index];

  if (previous && now - previous.at <= HOLD_MS) {
    return { x: previous.x, y: previous.y };
  }

  held[index] = null;
  return null;
}

function collectPoints(
  landmarks: DetectedPose["landmarks"],
  now: number,
): Array<Vec | null> {
  const count = Math.max(landmarks.length, held.length, 33);
  const points: Array<Vec | null> = [];

  for (let index = 0; index < count; index += 1) {
    points[index] = takePoint(landmarks, index, now);
  }

  return points;
}

/**
 * Frame the figure by the extent of what is actually tracked. Sizing off a
 * single furthest joint lets one bad landmark shrink the whole body.
 */
function bodyBox(points: Array<Vec | null>): Box | null {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let seen = 0;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];

    if (!point || FACE_ONLY.has(index)) {
      continue;
    }

    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
    seen += 1;
  }

  if (seen < MIN_TRACKED_POINTS) {
    return null;
  }

  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    w: Math.max(maxX - minX, MIN_BOX_WIDTH),
    h: Math.max(maxY - minY, MIN_BOX_HEIGHT),
  };
}

/** x is flipped here because the avatar canvas sits outside the mirrored camera stage. */
function toScreen(point: Vec, transform: Transform, width: number, height: number): Vec {
  return {
    x: width / 2 - (point.x - transform.cx) * transform.scale,
    y: height / 2 + (point.y - transform.cy) * transform.scale,
  };
}

function drawSegment(
  context: CanvasRenderingContext2D,
  from: Vec,
  to: Vec,
  transform: Transform,
  width: number,
  height: number,
  weight: number,
) {
  const start = toScreen(from, transform, width, height);
  const end = toScreen(to, transform, width, height);

  context.strokeStyle = ACCENT;
  context.lineWidth = weight;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();
}

export function drawBodyFigure(canvas: HTMLCanvasElement, pose: DetectedPose | null) {
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

  if (!pose) {
    view = null;
    return;
  }

  const now = performance.now();
  const points = collectPoints(pose.landmarks, now);
  const box = bodyBox(points);

  if (!box) {
    return;
  }

  view = view
    ? {
        cx: lerp(view.cx, box.cx, 0.3),
        cy: lerp(view.cy, box.cy, 0.3),
        w: lerp(view.w, box.w, 0.14),
        h: lerp(view.h, box.h, 0.14),
      }
    : box;

  const transform: Transform = {
    cx: view.cx,
    cy: view.cy,
    scale: Math.min((width * FIT_PADDING) / view.w, (height * FIT_PADDING) / view.h),
  };

  const line = Math.max(2.4, canvas.width * 0.014);
  const joint = Math.max(2.2, line * 0.85);

  for (const connection of PoseLandmarker.POSE_CONNECTIONS) {
    if (FACE_ONLY.has(connection.start) || FACE_ONLY.has(connection.end)) {
      continue;
    }

    const from = points[connection.start];
    const to = points[connection.end];

    if (!from || !to) {
      continue;
    }

    drawSegment(context, from, to, transform, canvas.width, canvas.height, line);
  }

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];

    if (!point || FACE_ONLY.has(index)) {
      continue;
    }

    const { x, y } = toScreen(point, transform, canvas.width, canvas.height);
    context.fillStyle = BONE;
    context.beginPath();
    context.arc(x, y, joint, 0, Math.PI * 2);
    context.fill();
  }

  const nose = points[NOSE];
  const leftEar = points[LEFT_EAR];
  const rightEar = points[RIGHT_EAR];

  if (nose) {
    const head = toScreen(nose, transform, canvas.width, canvas.height);
    const earSpan =
      leftEar && rightEar
        ? dist(
            toScreen(leftEar, transform, canvas.width, canvas.height),
            toScreen(rightEar, transform, canvas.width, canvas.height),
          )
        : line * 8;
    context.fillStyle = ACCENT;
    context.beginPath();
    context.arc(head.x, head.y, Math.max(line * 2.4, earSpan * 0.42), 0, Math.PI * 2);
    context.fill();
  }
}
