import { calculateAngle } from "../../biomechanics/angles";
import { isVisible, type DetectedPose, type LandmarkPoint } from "../../vision/poseDetector";

export type ShoulderRaiseState = "ARMS_DOWN" | "ARMS_UP";

const ARMS_DOWN_ANGLE = 32;
/** Cross into UP on a real attempt; full overhead is judged as form. */
const ARMS_UP_ANGLE = 100;
const CONFIDENCE_GAP = 0.15;

type ArmReading = { angle: number | null; confidence: number };

function armReading(
  hip: LandmarkPoint | null,
  shoulder: LandmarkPoint | null,
  wrist: LandmarkPoint | null,
): ArmReading {
  if (!isVisible(hip) || !isVisible(shoulder) || !isVisible(wrist)) {
    return { angle: null, confidence: 0 };
  }

  return {
    angle: calculateAngle(hip, shoulder, wrist),
    confidence: Math.min(hip.visibility, shoulder.visibility, wrist.visibility),
  };
}

export function shoulderRaiseAngle(pose: DetectedPose | null): number | null {
  if (!pose) {
    return null;
  }

  const readings = [
    armReading(pose.leftHip, pose.leftShoulder, pose.leftWrist),
    armReading(pose.rightHip, pose.rightShoulder, pose.rightWrist),
  ].filter((reading): reading is { angle: number; confidence: number } => reading.angle !== null);

  if (readings.length === 0) {
    return null;
  }

  if (readings.length === 1) {
    return readings[0].angle;
  }

  const [left, right] = readings;

  if (Math.abs(left.angle - right.angle) > 28) {
    return Math.max(left.angle, right.angle);
  }

  if (Math.abs(left.confidence - right.confidence) > CONFIDENCE_GAP) {
    return left.confidence > right.confidence ? left.angle : right.angle;
  }

  return (left.angle + right.angle) / 2;
}

export function detectShoulderRaiseState(
  angle: number | null,
  previous: ShoulderRaiseState | null = null,
): ShoulderRaiseState | null {
  if (angle === null) {
    return previous;
  }

  if (angle <= ARMS_DOWN_ANGLE) {
    return "ARMS_DOWN";
  }

  if (angle >= ARMS_UP_ANGLE) {
    return "ARMS_UP";
  }

  return previous;
}
