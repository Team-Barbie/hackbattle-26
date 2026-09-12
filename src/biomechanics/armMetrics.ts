import { calculateAngleOrNull } from "./angles";
import type { DetectedPose, LandmarkPoint } from "../vision/poseDetector";
import { isVisible } from "../vision/poseDetector";

export type ArmReading = {
  value: number | null;
  degrees: number | null;
  confidence: number;
};

const CONFIDENCE_GAP = 0.15;

function visible(point: LandmarkPoint | null) {
  return isVisible(point) ? point : null;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/**
 * Elbow angle mapped so 1 is arms hanging straight and 0 is a tight curl.
 * Same rest/peak scale as squat thigh elevation.
 */
export function curlReading(
  shoulder: LandmarkPoint | null,
  elbow: LandmarkPoint | null,
  wrist: LandmarkPoint | null,
): ArmReading {
  const angle = calculateAngleOrNull(visible(shoulder), visible(elbow), visible(wrist));

  if (angle === null) {
    return { value: null, degrees: null, confidence: 0 };
  }

  return {
    value: clamp01((angle - 55) / 115),
    degrees: angle,
    confidence: Math.min(shoulder?.visibility ?? 0, elbow?.visibility ?? 0, wrist?.visibility ?? 0),
  };
}

/**
 * Upper-arm lift from hanging. 1 is arms at the sides, 0 is about shoulder height.
 */
export function lateralReading(shoulder: LandmarkPoint | null, elbow: LandmarkPoint | null): ArmReading {
  const from = visible(shoulder);
  const to = visible(elbow);

  if (!from || !to) {
    return { value: null, degrees: null, confidence: 0 };
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);

  if (length < 1e-6) {
    return { value: null, degrees: null, confidence: 0 };
  }

  const raise = (from.y - to.y) / length;
  const abduction = (Math.acos(Math.min(1, Math.max(-1, -raise))) * 180) / Math.PI;

  return {
    value: clamp01(-raise),
    degrees: abduction,
    confidence: Math.min(from.visibility, to.visibility),
  };
}

export function combineArmReadings(
  left: ArmReading,
  right: ArmReading,
  maxDisagreement = 28,
  onDisagreement: "null" | "higher" | "lower" = "higher",
): ArmReading {
  const usable = [left, right].filter(
    (reading): reading is { value: number; degrees: number; confidence: number } =>
      reading.value !== null && reading.degrees !== null,
  );

  if (usable.length === 0) {
    return { value: null, degrees: null, confidence: 0 };
  }

  if (usable.length === 1) {
    return usable[0];
  }

  const [a, b] = usable;

  if (Math.abs(a.degrees - b.degrees) > maxDisagreement) {
    if (onDisagreement === "null") {
      return { value: null, degrees: null, confidence: 0 };
    }

    if (onDisagreement === "lower") {
      return a.degrees < b.degrees ? a : b;
    }

    return a.degrees > b.degrees ? a : b;
  }

  const pick =
    Math.abs(a.confidence - b.confidence) > CONFIDENCE_GAP
      ? a.confidence > b.confidence
        ? a
        : b
      : {
          value: (a.value + b.value) / 2,
          degrees: (a.degrees + b.degrees) / 2,
          confidence: (a.confidence + b.confidence) / 2,
        };

  return pick;
}

export function curlFromPose(pose: DetectedPose | null): ArmReading {
  if (!pose) {
    return { value: null, degrees: null, confidence: 0 };
  }

  return combineArmReadings(
    curlReading(pose.leftShoulder, pose.leftElbow, pose.leftWrist),
    curlReading(pose.rightShoulder, pose.rightElbow, pose.rightWrist),
    34,
    "lower",
  );
}

export function lateralFromPose(pose: DetectedPose | null): ArmReading {
  if (!pose) {
    return { value: null, degrees: null, confidence: 0 };
  }

  return combineArmReadings(
    lateralReading(pose.leftShoulder, pose.leftElbow),
    lateralReading(pose.rightShoulder, pose.rightElbow),
  );
}
