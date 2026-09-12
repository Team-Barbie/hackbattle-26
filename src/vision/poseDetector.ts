import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { LandmarkSmoother } from "./oneEuro";

const LOCAL_WASM_ROOT = `${import.meta.env.BASE_URL}mediapipe/wasm`;
const CDN_WASM_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const LOCAL_MODEL_PATH = `${import.meta.env.BASE_URL}models/pose_landmarker_lite.task`;
const REMOTE_MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const LANDMARK_INDEX = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

const MIN_DETECT_INTERVAL_MS = 16;
const CLOSEUP_SCALE = 0.62;

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
const padCanvas = typeof document === "undefined" ? null : document.createElement("canvas");
const padContext = padCanvas?.getContext("2d") ?? null;

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
    visibility: point.visibility ?? 0,
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

export function isVisible(point: LandmarkPoint | null, threshold = 0.3): point is LandmarkPoint {
  return Boolean(point && point.visibility >= threshold);
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

function drawCloseupFrame(video: HTMLVideoElement, scale: number): HTMLCanvasElement | null {
  if (!padCanvas || !padContext) {
    return null;
  }

  if (padCanvas.width !== video.videoWidth || padCanvas.height !== video.videoHeight) {
    padCanvas.width = video.videoWidth;
    padCanvas.height = video.videoHeight;
  }

  padContext.fillStyle = "#000";
  padContext.fillRect(0, 0, padCanvas.width, padCanvas.height);

  const drawnWidth = video.videoWidth * scale;
  const drawnHeight = video.videoHeight * scale;
  padContext.drawImage(
    video,
    (video.videoWidth - drawnWidth) / 2,
    (video.videoHeight - drawnHeight) / 2,
    drawnWidth,
    drawnHeight,
  );

  return padCanvas;
}

function mapFromCloseup(landmarks: NormalizedLandmark[], scale: number): NormalizedLandmark[] {
  const inset = (1 - scale) / 2;

  return landmarks.map((landmark) => ({
    x: (landmark.x - inset) / scale,
    y: (landmark.y - inset) / scale,
    z: landmark.z,
    visibility: landmark.visibility ?? 0,
  }));
}

async function createLandmarker(
  wasmRoot: string,
  modelAssetPath: string,
  delegate: "GPU" | "CPU",
): Promise<PoseLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(wasmRoot);

  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath,
      delegate,
    },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.28,
    minPosePresenceConfidence: 0.28,
    minTrackingConfidence: 0.28,
  });
}

async function createPoseDetector(): Promise<PoseDetector> {
  const loadAttempts: Array<{
    wasmRoot: string;
    modelAssetPath: string;
    delegate: "GPU" | "CPU";
  }> = [
    { wasmRoot: LOCAL_WASM_ROOT, modelAssetPath: LOCAL_MODEL_PATH, delegate: "GPU" },
    { wasmRoot: LOCAL_WASM_ROOT, modelAssetPath: LOCAL_MODEL_PATH, delegate: "CPU" },
    { wasmRoot: CDN_WASM_ROOT, modelAssetPath: LOCAL_MODEL_PATH, delegate: "CPU" },
    { wasmRoot: CDN_WASM_ROOT, modelAssetPath: REMOTE_MODEL_PATH, delegate: "CPU" },
  ];
  let landmarker: PoseLandmarker | undefined;
  let lastError: unknown;

  for (const attempt of loadAttempts) {
    try {
      landmarker = await withTimeout(
        createLandmarker(attempt.wasmRoot, attempt.modelAssetPath, attempt.delegate),
        attempt.delegate === "GPU" ? 8000 : 15000,
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
  let useCloseup = false;
  let framesSinceRawRetry = 0;
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
        let nextLandmarks: NormalizedLandmark[] | null = null;

        framesSinceRawRetry += 1;
        const shouldTryRaw = !useCloseup || framesSinceRawRetry >= 4;

        if (shouldTryRaw) {
          nextLandmarks = detectRaw(videoFrame);
          if (nextLandmarks) {
            useCloseup = false;
            framesSinceRawRetry = 0;
          }
        }

        if (!nextLandmarks && (useCloseup || missedFrames >= 2)) {
          const closeup = drawCloseupFrame(videoFrame, CLOSEUP_SCALE);
          const closeupLandmarks = closeup ? detectRaw(closeup) : null;

          if (closeupLandmarks) {
            nextLandmarks = mapFromCloseup(closeupLandmarks, CLOSEUP_SCALE);
            useCloseup = true;
          }
        }

        if (nextLandmarks) {
          missedFrames = 0;
          lastPose = mapDetectedPose(smoother.smooth(nextLandmarks, now));
        } else {
          missedFrames += 1;
          if (missedFrames > 14) {
            lastPose = null;
            useCloseup = false;
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
