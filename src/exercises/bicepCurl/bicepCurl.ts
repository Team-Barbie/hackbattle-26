import { curlFromPose } from "../../biomechanics/armMetrics";
import type { DetectedPose } from "../../vision/poseDetector";

export type BicepCurlState = "ARMS_EXTENDED" | "ARMS_CURLED";

const EXTENDED_DEGREES = 158;
const CURLED_DEGREES = 110;

export function bicepCurlDegrees(pose: DetectedPose | null): number | null {
  return curlFromPose(pose).degrees;
}

export function detectBicepCurlState(
  degrees: number | null,
  previous: BicepCurlState | null = null,
): BicepCurlState | null {
  if (degrees === null) {
    return previous;
  }

  if (degrees >= EXTENDED_DEGREES) {
    return "ARMS_EXTENDED";
  }

  if (degrees <= CURLED_DEGREES) {
    return "ARMS_CURLED";
  }

  return previous;
}
