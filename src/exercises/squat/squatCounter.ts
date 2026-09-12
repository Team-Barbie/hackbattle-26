import type { SquatState } from "./squatState";

export type SquatRep = {
  index: number;
  minKneeAngle: number | null;
};

export type SquatCounter = {
  readonly reps: SquatRep[];
  readonly count: number;
  update: (state: SquatState | null, kneeAngle: number | null) => SquatRep | null;
  reset: () => void;
};

/**
 * A rep lands on the DOWN → UP edge only, so holding at the bottom or
 * bouncing inside one state never adds to the count.
 */
export function createSquatCounter(): SquatCounter {
  let previous: SquatState | null = null;
  let deepest = Number.POSITIVE_INFINITY;
  let reps: SquatRep[] = [];

  return {
    get reps() {
      return reps;
    },
    get count() {
      return reps.length;
    },
    update(state, kneeAngle) {
      if (kneeAngle !== null) {
        deepest = Math.min(deepest, kneeAngle);
      }

      let completed: SquatRep | null = null;

      if (previous === "DOWN" && state === "UP") {
        completed = {
          index: reps.length + 1,
          minKneeAngle: Number.isFinite(deepest) ? deepest : null,
        };
        reps = [...reps, completed];
        deepest = Number.POSITIVE_INFINITY;
      }

      if (state !== null) {
        previous = state;
      }

      return completed;
    },
    reset() {
      previous = null;
      deepest = Number.POSITIVE_INFINITY;
      reps = [];
    },
  };
}
