import { curlFromPose } from "../../biomechanics/armMetrics";
import type { DetectedPose } from "../../vision/poseDetector";
import { createMotionCounter } from "../motionCounter";

export type BicepCurlState = "ARMS_EXTENDED" | "ARMS_CURLED";

/** Camera perspective usually makes a straight arm read below anatomical 180°. */
export const BICEP_EXTENDED_DEGREES = 145;
export const BICEP_CURLED_DEGREES = 125;

export function createBicepCurlCounter() {
  return createMotionCounter({
    minExcursion: 30,
    restHoldMs: 180,
    activeHoldMs: 100,
    restIsHigh: true,
  });
}

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

  if (degrees >= BICEP_EXTENDED_DEGREES) {
    return "ARMS_EXTENDED";
  }

  if (degrees <= BICEP_CURLED_DEGREES) {
    return "ARMS_CURLED";
  }

  return previous;
}
