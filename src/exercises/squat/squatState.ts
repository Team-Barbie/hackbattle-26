export type SquatState = "UP" | "DOWN";

export const SQUAT_STANDING_ANGLE = 155;
export const SQUAT_BOTTOM_ANGLE = 110;

export function combineKneeAngles(left: number | null, right: number | null): number | null {
  if (left === null && right === null) {
    return null;
  }

  if (left === null) {
    return right;
  }

  if (right === null) {
    return left;
  }

  return (left + right) / 2;
}

/**
 * Hysteresis keeps the mid-range from flickering:
 * stand up past 155° to become UP, sit below 110° to become DOWN.
 */
export function detectSquatState(
  kneeAngle: number | null,
  previous: SquatState | null = null,
): SquatState | null {
  if (kneeAngle === null) {
    return previous;
  }

  if (kneeAngle > SQUAT_STANDING_ANGLE) {
    return "UP";
  }

  if (kneeAngle < SQUAT_BOTTOM_ANGLE) {
    return "DOWN";
  }

  if (previous === null) {
    return kneeAngle >= (SQUAT_STANDING_ANGLE + SQUAT_BOTTOM_ANGLE) / 2 ? "UP" : "DOWN";
  }

  return previous;
}
