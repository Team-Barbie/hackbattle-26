import type { ThighReading } from "../../biomechanics/thighElevation";

export type KneeRaiseState = "FEET_DOWN" | "KNEE_UP";

const FEET_DOWN_ELEVATION = 0.84;
const KNEE_UP_ELEVATION = 0.32;
const CONFIDENCE_GAP = 0.15;

export function kneeRaiseElevation(left: ThighReading, right: ThighReading): number | null {
  const readings = [left, right].filter(
    (reading): reading is { elevation: number; confidence: number } =>
      reading.elevation !== null,
  );

  if (readings.length === 0) {
    return null;
  }

  if (readings.length === 1) {
    return readings[0].elevation;
  }

  const [a, b] = readings;

  if (Math.abs(a.confidence - b.confidence) > CONFIDENCE_GAP) {
    return a.confidence > b.confidence ? a.elevation : b.elevation;
  }

  return Math.min(a.elevation, b.elevation);
}

export function detectKneeRaiseState(
  elevation: number | null,
  previous: KneeRaiseState | null = null,
): KneeRaiseState | null {
  if (elevation === null) {
    return previous;
  }

  if (elevation >= FEET_DOWN_ELEVATION) {
    return "FEET_DOWN";
  }

  if (elevation <= KNEE_UP_ELEVATION) {
    return "KNEE_UP";
  }

  return previous;
}
