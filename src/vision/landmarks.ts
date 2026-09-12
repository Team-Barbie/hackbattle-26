export type Vec3 = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

/** MediaPipe often leaves visibility at 0 even for a good joint. Treat that as visible. */
export function landmarkVisibility(point: Vec3): number {
  const value = point.visibility;

  if (value === undefined || Number.isNaN(value) || value === 0) {
    return 1;
  }

  return value;
}

export function isInFrame(point: Vec3): boolean {
  return (
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    point.x >= -0.12 &&
    point.x <= 1.12 &&
    point.y >= -0.12 &&
    point.y <= 1.12
  );
}

export function isReliable(point: Vec3 | null | undefined, threshold = 0.18): point is Vec3 {
  return Boolean(point && isInFrame(point) && landmarkVisibility(point) >= threshold);
}
