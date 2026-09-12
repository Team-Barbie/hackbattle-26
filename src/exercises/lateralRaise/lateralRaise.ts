import { lateralFromPose } from "../../biomechanics/armMetrics";
import type { DetectedPose } from "../../vision/poseDetector";

export type LateralRaiseState = "LATERAL_DOWN" | "LATERAL_UP";

const ARMS_DOWN_DEGREES = 32;
const ARMS_UP_DEGREES = 50;

export function lateralRaiseDegrees(pose: DetectedPose | null): number | null {
  return lateralFromPose(pose).degrees;
}

export function detectLateralRaiseState(
  degrees: number | null,
  previous: LateralRaiseState | null = null,
): LateralRaiseState | null {
  if (degrees === null) {
    return previous;
  }

  if (degrees <= ARMS_DOWN_DEGREES) {
    return "LATERAL_DOWN";
  }

  if (degrees >= ARMS_UP_DEGREES) {
    return "LATERAL_UP";
  }

  return previous;
}
