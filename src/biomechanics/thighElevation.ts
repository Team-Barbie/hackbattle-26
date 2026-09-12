import type { AnglePoint } from "./angles";

export type ThighReading = {
  elevation: number | null;
  confidence: number;
};

/**
 * Vertical drop from hip to knee over thigh length — the sine of the thigh's
 * angle above horizontal. 1 is standing, 0 is thighs parallel to the floor,
 * negative means the hips dropped below the knees.
 *
 * Only x/y are read: MediaPipe's z is too noisy to trust. Dividing by the
 * thigh's own length makes the reading independent of camera distance, and
 * two landmarks stay far better conditioned than a three-point knee angle,
 * which goes unstable exactly where the leg straightens out.
 */
export function thighElevation(
  hip: AnglePoint | null | undefined,
  knee: AnglePoint | null | undefined,
): number | null {
  if (!hip || !knee) {
    return null;
  }

  const dx = knee.x - hip.x;
  const dy = knee.y - hip.y;
  const thigh = Math.hypot(dx, dy);

  if (thigh < 1e-6) {
    return null;
  }

  return dy / thigh;
}

/** Elevation as a thigh angle in degrees: 90 standing, 0 at parallel. */
export function thighAngleDegrees(elevation: number | null): number | null {
  if (elevation === null) {
    return null;
  }

  return (Math.asin(Math.min(1, Math.max(-1, elevation))) * 180) / Math.PI;
}
