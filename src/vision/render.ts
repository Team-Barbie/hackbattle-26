import { DrawingUtils, PoseLandmarker } from "@mediapipe/tasks-vision";
import type { DetectedPose } from "./poseDetector";

const ACCENT = "#3dd68c";
const BONE = "#edf3ef";
const VISIBLE_LANDMARK = 0.16;

const NOSE = 0;
const LEFT_EAR = 7;
const RIGHT_EAR = 8;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;

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

const held: Array<Vec | null> = [];
let viewOrigin = { x: 0.5, y: 0.45 };
let viewSize = 0.7;
let viewReady = false;

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function mid(a: Vec, b: Vec): Vec {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function dist(a: Vec, b: Vec): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function takePoint(landmarks: DetectedPose["landmarks"], index: number): Vec | null {
  const point = landmarks[index];

  if (
    point &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    (point.visibility ?? 1) >= 0.04
  ) {
    held[index] = { x: point.x, y: point.y };
    return held[index];
  }

  return held[index] ?? null;
}

function collectPoints(landmarks: DetectedPose["landmarks"]): Array<Vec | null> {
  const count = Math.max(landmarks.length, held.length, 33);
  const points: Array<Vec | null> = [];

  for (let index = 0; index < count; index += 1) {
    points[index] = takePoint(landmarks, index);
  }

  return points;
}

function bodyFrame(points: Array<Vec | null>): { origin: Vec; size: number } | null {
  const leftShoulder = points[LEFT_SHOULDER];
  const rightShoulder = points[RIGHT_SHOULDER];

  if (!leftShoulder || !rightShoulder) {
    return null;
  }

  const leftHip = points[LEFT_HIP];
  const rightHip = points[RIGHT_HIP];
  const midShoulder = mid(leftShoulder, rightShoulder);
  const midHip =
    leftHip && rightHip
      ? mid(leftHip, rightHip)
      : { x: midShoulder.x, y: midShoulder.y + 0.28 };
  const origin = leftHip && rightHip ? midHip : midShoulder;

  let reach = Math.max(
    dist(leftShoulder, rightShoulder) * 2.4,
    dist(midShoulder, midHip) * 2.1,
    0.2,
  );

  for (const point of points) {
    if (!point) {
      continue;
    }

    reach = Math.max(reach, dist(origin, point));
  }

  return { origin, size: reach * 2.2 };
}

function toScreen(point: Vec, width: number, height: number): Vec {
  const scale = Math.min(width, height) / viewSize;
  return {
    x: width / 2 - (point.x - viewOrigin.x) * scale,
    y: height * 0.48 + (point.y - viewOrigin.y) * scale,
  };
}

function drawSegment(
  context: CanvasRenderingContext2D,
  from: Vec,
  to: Vec,
  width: number,
  height: number,
  weight: number,
) {
  const start = toScreen(from, width, height);
  const end = toScreen(to, width, height);

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
    viewReady = false;
    return;
  }

  const points = collectPoints(pose.landmarks);
  const frame = bodyFrame(points);

  if (!frame) {
    return;
  }

  if (!viewReady) {
    viewOrigin = frame.origin;
    viewSize = frame.size;
    viewReady = true;
  } else {
    viewOrigin = {
      x: lerp(viewOrigin.x, frame.origin.x, 0.28),
      y: lerp(viewOrigin.y, frame.origin.y, 0.28),
    };
    viewSize = lerp(viewSize, frame.size, 0.16);
  }

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

    drawSegment(context, from, to, canvas.width, canvas.height, line);
  }

  const bodyJoints = points
    .map((point, index) => ({ point, index }))
    .filter(({ point, index }) => point && !FACE_ONLY.has(index));

  for (const { point } of bodyJoints) {
    if (!point) {
      continue;
    }

    const { x, y } = toScreen(point, canvas.width, canvas.height);
    context.fillStyle = BONE;
    context.beginPath();
    context.arc(x, y, joint, 0, Math.PI * 2);
    context.fill();
  }

  const nose = points[NOSE];
  const leftEar = points[LEFT_EAR];
  const rightEar = points[RIGHT_EAR];

  if (nose) {
    const head = toScreen(nose, canvas.width, canvas.height);
    const earSpan =
      leftEar && rightEar
        ? dist(
            toScreen(leftEar, canvas.width, canvas.height),
            toScreen(rightEar, canvas.width, canvas.height),
          )
        : line * 8;
    context.fillStyle = ACCENT;
    context.beginPath();
    context.arc(head.x, head.y, Math.max(line * 2.4, earSpan * 0.42), 0, Math.PI * 2);
    context.fill();
  }
}
