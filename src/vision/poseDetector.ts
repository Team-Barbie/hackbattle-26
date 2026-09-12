import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

const TASKS_VISION_VERSION = "1.0.1";
const WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;
const MODEL_ASSET_PATH =
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

export type LandmarkPoint = {
  x: number;
  y: number;
  z: number;
  visibility: number;
};

export type DetectedPose = {
  leftShoulder: LandmarkPoint;
  rightShoulder: LandmarkPoint;
  leftElbow: LandmarkPoint;
  rightElbow: LandmarkPoint;
  leftHip: LandmarkPoint;
  rightHip: LandmarkPoint;
  leftKnee: LandmarkPoint;
  rightKnee: LandmarkPoint;
  leftAnkle: LandmarkPoint;
  rightAnkle: LandmarkPoint;
};

export type PoseDetector = {
  detectPose: (videoFrame: HTMLVideoElement) => DetectedPose | null;
  close: () => void;
};

type NamedLandmark = keyof typeof LANDMARK_INDEX;

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
  const leftElbow = toPoint(landmarks, "leftElbow");
  const rightElbow = toPoint(landmarks, "rightElbow");
  const leftHip = toPoint(landmarks, "leftHip");
  const rightHip = toPoint(landmarks, "rightHip");
  const leftKnee = toPoint(landmarks, "leftKnee");
  const rightKnee = toPoint(landmarks, "rightKnee");
  const leftAnkle = toPoint(landmarks, "leftAnkle");
  const rightAnkle = toPoint(landmarks, "rightAnkle");

  if (
    !leftShoulder ||
    !rightShoulder ||
    !leftElbow ||
    !rightElbow ||
    !leftHip ||
    !rightHip ||
    !leftKnee ||
    !rightKnee ||
    !leftAnkle ||
    !rightAnkle
  ) {
    return null;
  }

  return {
    leftShoulder,
    rightShoulder,
    leftElbow,
    rightElbow,
    leftHip,
    rightHip,
    leftKnee,
    rightKnee,
    leftAnkle,
    rightAnkle,
  };
}

function formatPoint(point: LandmarkPoint): string {
  return `(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`;
}

export function formatPoseLog(pose: DetectedPose): string {
  return [
    `L shoulder ${formatPoint(pose.leftShoulder)}`,
    `L hip ${formatPoint(pose.leftHip)}`,
    `L knee ${formatPoint(pose.leftKnee)}`,
    `L ankle ${formatPoint(pose.leftAnkle)}`,
    `R knee ${formatPoint(pose.rightKnee)}`,
  ].join(" | ");
}

export async function createPoseDetector(): Promise<PoseDetector> {
  const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
  const landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_ASSET_PATH,
    },
    runningMode: "VIDEO",
    numPoses: 1,
  });

  let lastVideoTime = -1;
  let lastPose: DetectedPose | null = null;

  return {
    detectPose(videoFrame: HTMLVideoElement) {
      if (
        videoFrame.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        videoFrame.videoWidth === 0
      ) {
        return lastPose;
      }

      if (videoFrame.currentTime === lastVideoTime) {
        return lastPose;
      }

      lastVideoTime = videoFrame.currentTime;

      try {
        const result = landmarker.detectForVideo(videoFrame, performance.now());
        lastPose = result.landmarks[0] ? mapDetectedPose(result.landmarks[0]) : null;
      } catch {
        return lastPose;
      }

      return lastPose;
    },
    close() {
      landmarker.close();
    },
  };
}
