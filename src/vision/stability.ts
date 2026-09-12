import type { DetectedPose, LandmarkPoint } from "./poseDetector";

const JOINTS: Array<keyof DetectedPose> = [
  "leftShoulder",
  "rightShoulder",
  "leftElbow",
  "rightElbow",
  "leftWrist",
  "rightWrist",
  "leftHip",
  "rightHip",
  "leftKnee",
  "rightKnee",
];

function asPoint(value: DetectedPose[keyof DetectedPose]): LandmarkPoint | null {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null;
  }

  if (!("x" in value) || !("y" in value)) {
    return null;
  }

  return value as LandmarkPoint;
}

/** True when several joints teleport — typical MediaPipe flicker, not a person moving. */
export function poseJumped(previous: DetectedPose | null, next: DetectedPose | null): boolean {
  if (!previous || !next) {
    return false;
  }

  let jumps = 0;

  for (const name of JOINTS) {
    const from = asPoint(previous[name]);
    const to = asPoint(next[name]);

    if (!from || !to) {
      continue;
    }

    if (Math.hypot(to.x - from.x, to.y - from.y) > 0.13) {
      jumps += 1;
    }
  }

  return jumps >= 3;
}
