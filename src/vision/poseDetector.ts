import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { isReliable, landmarkVisibility } from "./landmarks";
import { LandmarkSmoother } from "./oneEuro";

const MEDIAPIPE_VERSION = "0.10.21";
const LOCAL_WASM_ROOT = `${import.meta.env.BASE_URL}mediapipe/wasm`;
const CDN_WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const LOCAL_MODEL_PATH = `${import.meta.env.BASE_URL}models/pose_landmarker_lite.task`;
const REMOTE_MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const LANDMARK_INDEX = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

const MIN_DETECT_INTERVAL_MS = 16;
const FRAME_MARGIN = 0.03;
const MIN_BODY_CHAIN_LENGTH = 0.4;
const MIN_HEAD_LENGTH = 0.03;
const MAX_HEAD_LENGTH = 0.25;
const MIN_SEGMENT_LENGTH = 0.06;
const MAX_SEGMENT_LENGTH = 0.45;
const MIN_SEGMENT_RATIO = 0.45;
const MAX_SEGMENT_RATIO = 2.2;

export type LandmarkPoint = {
  x: number;
  y: number;
  z: number;
  visibility: number;
};

export type DetectedPose = {
  landmarks: NormalizedLandmark[];
  leftShoulder: LandmarkPoint;
  rightShoulder: LandmarkPoint;
  leftElbow: LandmarkPoint | null;
  rightElbow: LandmarkPoint | null;
  leftWrist: LandmarkPoint | null;
  rightWrist: LandmarkPoint | null;
  leftHip: LandmarkPoint | null;
  rightHip: LandmarkPoint | null;
  leftKnee: LandmarkPoint | null;
  rightKnee: LandmarkPoint | null;
  leftAnkle: LandmarkPoint | null;
  rightAnkle: LandmarkPoint | null;
};

export type PoseDetector = {
  detectPose: (videoFrame: HTMLVideoElement) => DetectedPose | null;
};

type NamedLandmark = keyof typeof LANDMARK_INDEX;

let detectorPromise: Promise<PoseDetector> | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function toPoint(
  landmarks: NormalizedLandmark[],
  name: NamedLandmark,
): LandmarkPoint | null {
  const point = landmarks[LANDMARK_INDEX[name]];

  if (!point) {
    return null;
  }

  return {
    x: point.x,
    y: point.y,
    z: point.z,
    visibility: landmarkVisibility(point),
  };
}

function mapDetectedPose(landmarks: NormalizedLandmark[]): DetectedPose | null {
  const leftShoulder = toPoint(landmarks, "leftShoulder");
  const rightShoulder = toPoint(landmarks, "rightShoulder");

  if (!leftShoulder || !rightShoulder) {
    return null;
  }

  return {
    landmarks,
    leftShoulder,
    rightShoulder,
    leftElbow: toPoint(landmarks, "leftElbow"),
    rightElbow: toPoint(landmarks, "rightElbow"),
    leftWrist: toPoint(landmarks, "leftWrist"),
    rightWrist: toPoint(landmarks, "rightWrist"),
    leftHip: toPoint(landmarks, "leftHip"),
    rightHip: toPoint(landmarks, "rightHip"),
    leftKnee: toPoint(landmarks, "leftKnee"),
    rightKnee: toPoint(landmarks, "rightKnee"),
    leftAnkle: toPoint(landmarks, "leftAnkle"),
    rightAnkle: toPoint(landmarks, "rightAnkle"),
  };
}

function formatPoint(point: LandmarkPoint): string {
  return `(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`;
}

export function isVisible(point: LandmarkPoint | null, threshold = 0.18): point is LandmarkPoint {
  return isReliable(point, threshold);
}

function pointDistance(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isInsideFrame(point: NormalizedLandmark): boolean {
  return (
    point.x >= -FRAME_MARGIN &&
    point.x <= 1 + FRAME_MARGIN &&
    point.y >= -FRAME_MARGIN &&
    point.y <= 1 + FRAME_MARGIN
  );
}

function hasPlausibleSide(
  pose: DetectedPose,
  names: readonly [NamedLandmark, NamedLandmark, NamedLandmark, NamedLandmark],
  threshold: number,
): boolean {
  const [shoulder, hip, knee, ankle] = names.map(
    (name) => pose.landmarks[LANDMARK_INDEX[name]],
  );
  const nose = pose.landmarks[LANDMARK_INDEX.nose];

  if (
    !nose ||
    !shoulder ||
    !hip ||
    !knee ||
    !ankle ||
    [nose, shoulder, hip, knee, ankle].some(
      (point) => landmarkVisibility(point) < threshold || !isInsideFrame(point),
    )
  ) {
    return false;
  }

  const head = pointDistance(nose, shoulder);
  const torso = pointDistance(shoulder, hip);
  const thigh = pointDistance(hip, knee);
  const shin = pointDistance(knee, ankle);
  const bodyChainLength = head + torso + thigh + shin;
  const segments = [torso, thigh, shin];
  const thighToShin = thigh / shin;
  const torsoToThigh = torso / thigh;

  return (
    bodyChainLength >= MIN_BODY_CHAIN_LENGTH &&
    head >= MIN_HEAD_LENGTH &&
    head <= MAX_HEAD_LENGTH &&
    nose.y < shoulder.y &&
    shoulder.y < hip.y + 0.03 &&
    hip.y < ankle.y - 0.08 &&
    knee.y < ankle.y - 0.04 &&
    segments.every(
      (length) => length >= MIN_SEGMENT_LENGTH && length <= MAX_SEGMENT_LENGTH,
    ) &&
    thighToShin >= MIN_SEGMENT_RATIO &&
    thighToShin <= MAX_SEGMENT_RATIO &&
    torsoToThigh >= MIN_SEGMENT_RATIO &&
    torsoToThigh <= MAX_SEGMENT_RATIO
  );
}

/**
 * Visibility confidence alone is not sufficient because Pose Landmarker can
 * fit a confident skeleton to a hand or a cropped person. Require a large,
 * in-frame, proportionally plausible body chain on either side.
 */
export function hasFullBodyVisible(pose: DetectedPose | null, threshold = 0.18): boolean {
  if (!pose) {
    return false;
  }

  return (
    hasPlausibleSide(
      pose,
      ["leftShoulder", "leftHip", "leftKnee", "leftAnkle"],
      threshold,
    ) ||
    hasPlausibleSide(
      pose,
      ["rightShoulder", "rightHip", "rightKnee", "rightAnkle"],
      threshold,
    )
  );
}

/** Shoulders plus at least one arm — enough for curls and lateral raises. */
export function hasUpperBodyVisible(pose: DetectedPose | null, threshold = 0.18): boolean {
  if (!pose) {
    return false;
  }

  if (!isVisible(pose.leftShoulder, threshold) || !isVisible(pose.rightShoulder, threshold)) {
    return false;
  }

  return (
    isVisible(pose.leftElbow, threshold) ||
    isVisible(pose.rightElbow, threshold)
  );
}

export function formatPoseLog(pose: DetectedPose): string {
  const parts = [`L shoulder ${formatPoint(pose.leftShoulder)}`];

  if (isVisible(pose.leftElbow)) {
    parts.push(`L elbow ${formatPoint(pose.leftElbow)}`);
  }
  if (isVisible(pose.leftHip)) {
    parts.push(`L hip ${formatPoint(pose.leftHip)}`);
  }
  if (isVisible(pose.leftKnee)) {
    parts.push(`L knee ${formatPoint(pose.leftKnee)}`);
  }

  return parts.join(" | ");
}

function absoluteUrl(path: string): string {
  return new URL(path, window.location.href).href;
}

function wasmRoot(path: string): string {
  return path.endsWith("/") ? path.slice(0, -1) : path;
}

async function createLandmarker(
  filesetRoot: string,
  modelAssetPath: string,
  delegate: "GPU" | "CPU",
): Promise<PoseLandmarker> {
  const root = wasmRoot(filesetRoot);
  const vision = await FilesetResolver.forVisionTasks(root);

  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath,
      delegate,
    },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.3,
    minPosePresenceConfidence: 0.3,
    minTrackingConfidence: 0.3,
  });
}

async function createPoseDetector(): Promise<PoseDetector> {
  const localModel = absoluteUrl(LOCAL_MODEL_PATH);
  const loadAttempts: Array<{ wasmRoot: string; model: string; delegate: "GPU" | "CPU" }> = [
    { wasmRoot: CDN_WASM_ROOT, model: localModel, delegate: "CPU" },
    { wasmRoot: CDN_WASM_ROOT, model: REMOTE_MODEL_PATH, delegate: "CPU" },
    { wasmRoot: absoluteUrl(`${LOCAL_WASM_ROOT}/`), model: localModel, delegate: "CPU" },
    { wasmRoot: CDN_WASM_ROOT, model: localModel, delegate: "GPU" },
  ];
  let landmarker: PoseLandmarker | undefined;
  let lastError: unknown;

  for (const attempt of loadAttempts) {
    try {
      landmarker = await withTimeout(
        createLandmarker(attempt.wasmRoot, attempt.model, attempt.delegate),
        45000,
        `pose load ${attempt.delegate}`,
      );
      console.info("[pose] loaded", attempt);
      break;
    } catch (error) {
      lastError = error;
      console.warn("[pose] load attempt failed", attempt, error);
    }
  }

  if (!landmarker) {
    throw lastError instanceof Error ? lastError : new Error("Could not load the pose model.");
  }

  let lastTimestamp = 0;
  let lastDetectAt = 0;
  let lastPose: DetectedPose | null = null;
  let missedFrames = 0;
  const smoother = new LandmarkSmoother(1.35, 2.4);

  const nextTimestamp = () => {
    let timestamp = performance.now();
    if (timestamp <= lastTimestamp) {
      timestamp = lastTimestamp + 1;
    }
    lastTimestamp = timestamp;
    return timestamp;
  };

  const detectRaw = (source: HTMLVideoElement | HTMLCanvasElement) =>
    landmarker.detectForVideo(source, nextTimestamp()).landmarks[0] ?? null;

  return {
    detectPose(videoFrame: HTMLVideoElement) {
      if (
        videoFrame.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        videoFrame.videoWidth === 0 ||
        videoFrame.videoHeight === 0
      ) {
        return lastPose;
      }

      const now = performance.now();
      if (now - lastDetectAt < MIN_DETECT_INTERVAL_MS) {
        return lastPose;
      }
      lastDetectAt = now;

      try {
        const nextLandmarks = detectRaw(videoFrame);

        if (nextLandmarks) {
          missedFrames = 0;
          lastPose = mapDetectedPose(smoother.smooth(nextLandmarks, now));
        } else {
          missedFrames += 1;
          if (missedFrames > 14) {
            lastPose = null;
          }
        }
      } catch (detectError) {
        console.warn("[pose] detectForVideo failed", detectError);
        return lastPose;
      }

      return lastPose;
    },
  };
}

export function getPoseDetector(): Promise<PoseDetector> {
  if (!detectorPromise) {
    detectorPromise = createPoseDetector().catch((error) => {
      detectorPromise = null;
      throw error;
    });
  }

  return detectorPromise;
}

export function reloadPoseDetector(): Promise<PoseDetector> {
  detectorPromise = null;
  return getPoseDetector();
}
