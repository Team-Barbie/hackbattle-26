import type { AnglePoint } from "./angles";
import type { DetectedPose, LandmarkPoint } from "../vision/poseDetector";
import { isVisible } from "../vision/poseDetector";

/**
 * Degrees from vertical. 0 is standing tall; larger means the chest is
 * tipping forward or back in the camera plane.
 */
export function torsoLeanDegrees(
  shoulder: AnglePoint | null | undefined,
  hip: AnglePoint | null | undefined,
): number | null {
  if (!shoulder || !hip) {
    return null;
  }

  const dx = shoulder.x - hip.x;
  const dy = hip.y - shoulder.y;

  if (Math.hypot(dx, dy) < 1e-6) {
    return null;
  }

  return (Math.atan2(Math.abs(dx), Math.max(1e-6, dy)) * 180) / Math.PI;
}

function sideLean(shoulder: LandmarkPoint | null, hip: LandmarkPoint | null): number | null {
  if (!isVisible(shoulder) || !isVisible(hip)) {
    return null;
  }

  return torsoLeanDegrees(shoulder, hip);
}

/** Prefer the better-tracked side so an occluded far shoulder is ignored. */
export function torsoLeanFromPose(pose: DetectedPose | null): number | null {
  if (!pose) {
    return null;
  }

  const left = sideLean(pose.leftShoulder, pose.leftHip);
  const right = sideLean(pose.rightShoulder, pose.rightHip);

  if (left === null) {
    return right;
  }

  if (right === null) {
    return left;
  }

  const leftConfidence = Math.min(pose.leftShoulder.visibility, pose.leftHip?.visibility ?? 0);
  const rightConfidence = Math.min(pose.rightShoulder.visibility, pose.rightHip?.visibility ?? 0);

  if (Math.abs(leftConfidence - rightConfidence) > 0.15) {
    return leftConfidence > rightConfidence ? left : right;
  }

  return (left + right) / 2;
}
