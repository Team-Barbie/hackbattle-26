export type CyclePhase = "REST" | "ACTIVE";

export type CycleCounter = {
  readonly count: number;
  update: (phase: CyclePhase | null) => boolean;
  cancelCurrentRep: () => void;
  reset: () => void;
};

/** Counts only complete REST -> ACTIVE -> REST movement cycles. */
export function createCycleCounter(): CycleCounter {
  let count = 0;
  let previous: CyclePhase | null = null;
  let armed = false;

  return {
    get count() {
      return count;
    },
    update(phase) {
      if (phase === null) {
        return false;
      }

      const completed = armed && previous === "ACTIVE" && phase === "REST";

      if (completed) {
        count += 1;
      }

      if (phase === "REST") {
        armed = true;
      }

      previous = phase;
      return completed;
    },
    cancelCurrentRep() {
      previous = null;
      armed = false;
    },
    reset() {
      count = 0;
      previous = null;
      armed = false;
    },
  };
}
