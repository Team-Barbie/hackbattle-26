import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

const WASM_ROOT = `${import.meta.env.BASE_URL}mediapipe/wasm`;
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
};

type NamedLandmark = keyof typeof LANDMARK_INDEX;

let detectorPromise: Promise<PoseDetector> | null = null;

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
    landmarks,
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

async function createLandmarker(modelAssetPath: string): Promise<PoseLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);

  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath,
      delegate: "CPU",
    },
    runningMode: "VIDEO",
    numPoses: 1,
  });
}

async function createPoseDetector(): Promise<PoseDetector> {
  let landmarker: PoseLandmarker;

  try {
    landmarker = await createLandmarker(LOCAL_MODEL_PATH);
  } catch (localError) {
    console.warn("[pose] local model failed, trying remote model", localError);
    landmarker = await createLandmarker(REMOTE_MODEL_PATH);
  }

  let lastTimestamp = 0;
  let lastPose: DetectedPose | null = null;

  return {
    detectPose(videoFrame: HTMLVideoElement) {
      if (
        videoFrame.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        videoFrame.videoWidth === 0 ||
        videoFrame.videoHeight === 0
      ) {
        return lastPose;
      }

      let timestamp = performance.now();
      if (timestamp <= lastTimestamp) {
        timestamp = lastTimestamp + 1;
      }
      lastTimestamp = timestamp;

      try {
        const result = landmarker.detectForVideo(videoFrame, timestamp);
        lastPose = result.landmarks[0] ? mapDetectedPose(result.landmarks[0]) : null;
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
