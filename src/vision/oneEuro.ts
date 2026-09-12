class LowPass {
  private value: number | null = null;

  next(sample: number, alpha: number): number {
    this.value = this.value === null ? sample : this.value + alpha * (sample - this.value);
    return this.value;
  }
}

export class OneEuroFilter {
  private previousTime = 0;
  private previousValue: number | null = null;
  private readonly valueFilter = new LowPass();
  private readonly deltaFilter = new LowPass();
  private readonly minCutoff: number;
  private readonly beta: number;
  private readonly dCutoff: number;

  constructor(minCutoff: number, beta: number, dCutoff = 1) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  filter(sample: number, timestamp: number): number {
    const dt = this.previousTime ? Math.max(0.001, (timestamp - this.previousTime) / 1000) : 1 / 60;
    this.previousTime = timestamp;

    const delta = this.previousValue === null ? 0 : (sample - this.previousValue) / dt;
    const smoothedDelta = this.deltaFilter.next(delta, alpha(dt, this.dCutoff));
    const cutoff = this.minCutoff + this.beta * Math.abs(smoothedDelta);
    const next = this.valueFilter.next(sample, alpha(dt, cutoff));
    this.previousValue = sample;
    return next;
  }
}

function alpha(dt: number, cutoff: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

export class LandmarkSmoother {
  private filters: Array<{ x: OneEuroFilter; y: OneEuroFilter; z: OneEuroFilter }> = [];
  private readonly minCutoff: number;
  private readonly beta: number;

  constructor(minCutoff = 0.9, beta = 1.4) {
    this.minCutoff = minCutoff;
    this.beta = beta;
  }

  smooth(
    landmarks: Array<{ x: number; y: number; z: number; visibility?: number }>,
    timestamp: number,
  ) {
    while (this.filters.length < landmarks.length) {
      this.filters.push({
        x: new OneEuroFilter(this.minCutoff, this.beta),
        y: new OneEuroFilter(this.minCutoff, this.beta),
        z: new OneEuroFilter(this.minCutoff, this.beta),
      });
    }

    return landmarks.map((landmark, index) => ({
      x: this.filters[index].x.filter(landmark.x, timestamp),
      y: this.filters[index].y.filter(landmark.y, timestamp),
      z: this.filters[index].z.filter(landmark.z, timestamp),
      visibility: landmark.visibility ?? 0,
    }));
  }
}
