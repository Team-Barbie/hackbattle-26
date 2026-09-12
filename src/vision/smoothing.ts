export class RollingAverage {
  private readonly values: number[] = [];
  private readonly size: number;

  constructor(size = 6) {
    this.size = size;
  }

  reset() {
    this.values.length = 0;
  }

  push(value: number): number {
    this.values.push(value);

    if (this.values.length > this.size) {
      this.values.shift();
    }

    return this.values.reduce((sum, item) => sum + item, 0) / this.values.length;
  }
}

/**
 * Smooths a metric and drops single-frame spikes. Sustained travel past
 * `maxJump` is treated as real motion so a fast squat cannot freeze the filter.
 */
export class MetricFilter {
  private readonly average: RollingAverage;
  private readonly maxJump: number;
  private readonly jumpConfirmations: number;
  private last: number | null = null;
  private misses = 0;
  private pendingJumps = 0;

  constructor(maxJump: number, size = 6, jumpConfirmations = 3) {
    this.maxJump = maxJump;
    this.jumpConfirmations = jumpConfirmations;
    this.average = new RollingAverage(size);
  }

  reset() {
    this.average.reset();
    this.last = null;
    this.misses = 0;
    this.pendingJumps = 0;
  }

  push(value: number | null): number | null {
    if (value === null || Number.isNaN(value)) {
      this.misses += 1;
      if (this.misses > 6) {
        this.reset();
        return null;
      }
      return this.last;
    }

    this.misses = 0;

    if (this.last !== null && Math.abs(value - this.last) > this.maxJump) {
      this.pendingJumps += 1;
      if (this.pendingJumps < this.jumpConfirmations) {
        return this.last;
      }
    }

    this.pendingJumps = 0;
    const smoothed = this.average.push(value);
    this.last = smoothed;
    return smoothed;
  }
}
