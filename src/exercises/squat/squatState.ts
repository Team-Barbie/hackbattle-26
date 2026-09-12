import type { ThighReading } from "../../biomechanics/thighElevation";

export type SquatState = "UP" | "DOWN";

/** Thigh elevation, where 1 is standing upright and 0 is thighs parallel. */
export const SQUAT_STANDING_ELEVATION = 0.86;
export const SQUAT_BOTTOM_ELEVATION = 0.3;

/** Past this visibility gap the better-tracked leg is trusted on its own. */
const CONFIDENCE_GAP = 0.15;

/**
 * Side-on is the stance we ask for, so the far leg is often occluded and its
 * reading is noise. Averaging both legs drags the good one toward that noise,
 * so a clearly better-tracked leg wins outright.
 */
export function combineThighElevations(
  left: ThighReading,
  right: ThighReading,
): number | null {
  const usable = [left, right].filter(
    (reading): reading is { elevation: number; confidence: number } =>
      reading.elevation !== null,
  );

  if (usable.length === 0) {
    return null;
  }

  if (usable.length === 1) {
    return usable[0].elevation;
  }

  const [a, b] = usable;

  if (Math.abs(a.confidence - b.confidence) > CONFIDENCE_GAP) {
    return a.confidence > b.confidence ? a.elevation : b.elevation;
  }

  return (a.elevation + b.elevation) / 2;
}

/**
 * Hysteresis keeps the mid-range from flickering: stand up past 0.8 to become
 * UP, sink below 0.35 to become DOWN.
 */
export function detectSquatState(
  elevation: number | null,
  previous: SquatState | null = null,
): SquatState | null {
  if (elevation === null) {
    return previous;
  }

  if (elevation > SQUAT_STANDING_ELEVATION) {
    return "UP";
  }

  if (elevation < SQUAT_BOTTOM_ELEVATION) {
    return "DOWN";
  }

  if (previous === null) {
    return elevation >= (SQUAT_STANDING_ELEVATION + SQUAT_BOTTOM_ELEVATION) / 2
      ? "UP"
      : "DOWN";
  }

  return previous;
}
