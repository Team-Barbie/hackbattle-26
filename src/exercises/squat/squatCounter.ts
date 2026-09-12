import type { SquatState } from "./squatState";

export type SquatRep = {
  index: number;
  /** Lowest thigh elevation reached — 0 is parallel, so smaller is deeper. */
  deepestElevation: number | null;
};

export type SquatCounter = {
  readonly reps: SquatRep[];
  readonly count: number;
  update: (state: SquatState | null, elevation: number | null, now: number) => SquatRep | null;
  cancelCurrentRep: () => void;
  reset: () => void;
};

const STAND_HOLD_MS = 260;
const BOTTOM_HOLD_MS = 220;
/** Loose enough that a shallow attempt still completes a rep. */
const MIN_DEPTH = 0.62;

/**
 * A rep needs a held stand, a held bottom deeper than MIN_DEPTH, then a stand.
 * Landmark flicker that kisses DOWN for a frame does not count.
 */
export function createSquatCounter(): SquatCounter {
  let previous: SquatState | null = null;
  let phaseSince = 0;
  let deepest = Number.POSITIVE_INFINITY;
  let reps: SquatRep[] = [];
  let stoodLongEnough = false;
  let bottomQualified = false;

  return {
    get reps() {
      return reps;
    },
    get count() {
      return reps.length;
    },
    update(state, elevation, now) {
      if (state === null) {
        return null;
      }

      if (state !== previous) {
        let completed: SquatRep | null = null;

        if (previous === "DOWN" && state === "UP" && stoodLongEnough && bottomQualified) {
          completed = {
            index: reps.length + 1,
            deepestElevation: Number.isFinite(deepest) ? deepest : null,
          };
          reps = [...reps, completed];
        }

        previous = state;
        phaseSince = now;
        bottomQualified = false;
        deepest = Number.POSITIVE_INFINITY;

        if (state === "DOWN" && elevation !== null) {
          deepest = elevation;
        }

        return completed;
      }

      if (state === "UP" && now - phaseSince >= STAND_HOLD_MS) {
        stoodLongEnough = true;
      }

      if (state === "DOWN" && elevation !== null) {
        deepest = Math.min(deepest, elevation);
        if (now - phaseSince >= BOTTOM_HOLD_MS && deepest <= MIN_DEPTH) {
          bottomQualified = true;
        }
      }

      return null;
    },
    cancelCurrentRep() {
      previous = null;
      phaseSince = 0;
      deepest = Number.POSITIVE_INFINITY;
      stoodLongEnough = false;
      bottomQualified = false;
    },
    reset() {
      this.cancelCurrentRep();
      reps = [];
    },
  };
}
