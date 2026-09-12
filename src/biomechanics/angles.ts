export type AnglePoint = {
  x: number;
  y: number;
  z?: number;
};

function vectorBetween(from: AnglePoint, to: AnglePoint) {
  return {
    x: to.x - from.x,
    y: to.y - from.y,
    z: (to.z ?? 0) - (from.z ?? 0),
  };
}

function magnitude(vector: { x: number; y: number; z: number }) {
  return Math.hypot(vector.x, vector.y, vector.z);
}

/**
 * Interior angle at `b` formed by points `a` → `b` → `c`, in degrees.
 * Uses x/y/z when present so a front-facing squat still changes the reading.
 */
export function calculateAngle(a: AnglePoint, b: AnglePoint, c: AnglePoint): number {
  const ba = vectorBetween(b, a);
  const bc = vectorBetween(b, c);
  const baLength = magnitude(ba);
  const bcLength = magnitude(bc);

  if (baLength < 1e-8 || bcLength < 1e-8) {
    return 0;
  }

  const cosine = (ba.x * bc.x + ba.y * bc.y + ba.z * bc.z) / (baLength * bcLength);
  return (Math.acos(Math.min(1, Math.max(-1, cosine))) * 180) / Math.PI;
}

export function calculateAngleOrNull(
  a: AnglePoint | null | undefined,
  b: AnglePoint | null | undefined,
  c: AnglePoint | null | undefined,
): number | null {
  if (!a || !b || !c) {
    return null;
  }

  return calculateAngle(a, b, c);
}
