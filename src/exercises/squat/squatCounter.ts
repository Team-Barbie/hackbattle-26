import type { SquatState } from "./squatState";

export type SquatRep = {
  index: number;
  /** Lowest thigh elevation reached — 0 is parallel, so smaller is deeper. */
  deepestElevation: number | null;
};

export type SquatCounter = {
  readonly reps: SquatRep[];
  readonly count: number;
  update: (state: SquatState | null, elevation: number | null) => SquatRep | null;
  cancelCurrentRep: () => void;
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
  let startedFromUp = false;

  return {
    get reps() {
      return reps;
    },
    get count() {
      return reps.length;
    },
    update(state, elevation) {
      if (startedFromUp && elevation !== null) {
        deepest = Math.min(deepest, elevation);
      }

      let completed: SquatRep | null = null;

      if (previous === "DOWN" && state === "UP" && startedFromUp) {
        completed = {
          index: reps.length + 1,
          deepestElevation: Number.isFinite(deepest) ? deepest : null,
        };
        reps = [...reps, completed];
        deepest = Number.POSITIVE_INFINITY;
      }

      if (state === "UP") {
        startedFromUp = true;
      }

      if (state !== null) {
        previous = state;
      }

      return completed;
    },
    cancelCurrentRep() {
      previous = null;
      deepest = Number.POSITIVE_INFINITY;
      startedFromUp = false;
    },
    reset() {
      previous = null;
      deepest = Number.POSITIVE_INFINITY;
      reps = [];
      startedFromUp = false;
    },
  };
}
