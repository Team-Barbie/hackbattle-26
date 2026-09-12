export type MotionPhase = "REST" | "ACTIVE";

export type MotionCounter = {
  readonly count: number;
  update: (phase: MotionPhase | null, metric: number | null, now: number) => boolean;
  cancelCurrentRep: () => void;
  reset: () => void;
};

type Options = {
  /** How far the metric must travel from rest to the peak. */
  minExcursion: number;
  restHoldMs?: number;
  activeHoldMs?: number;
  /** Squat/curl rest is the high number; lateral/shoulder rest is the low number. */
  restIsHigh?: boolean;
};

/**
 * Counts a rep only after a real cycle: hold rest, travel far enough,
 * hold the peak, then return to rest. One-frame landmark flicker cannot score.
 */
export function createMotionCounter(options: Options): MotionCounter {
  const restHoldMs = options.restHoldMs ?? 260;
  const activeHoldMs = options.activeHoldMs ?? 220;
  const minExcursion = options.minExcursion;
  const restIsHigh = options.restIsHigh ?? false;

  let count = 0;
  let phase: MotionPhase | null = null;
  let phaseSince = 0;
  let restAnchor: number | null = null;
  let activeExtreme: number | null = null;
  let armed = false;
  let qualifiedActive = false;

  const extreme = (current: number, next: number) =>
    restIsHigh ? Math.min(current, next) : Math.max(current, next);

  return {
    get count() {
      return count;
    },
    update(nextPhase, metric, now) {
      if (nextPhase === null || metric === null) {
        return false;
      }

      if (phase !== nextPhase) {
        const completed =
          armed && qualifiedActive && nextPhase === "REST" && phase === "ACTIVE";

        phase = nextPhase;
        phaseSince = now;
        qualifiedActive = false;

        if (nextPhase === "ACTIVE") {
          activeExtreme = metric;
        } else {
          restAnchor = restAnchor === null ? metric : restAnchor * 0.55 + metric * 0.45;
        }

        if (completed) {
          const excursion =
            restAnchor === null || activeExtreme === null
              ? 0
              : Math.abs(restAnchor - activeExtreme);
          if (excursion >= minExcursion) {
            count += 1;
            activeExtreme = null;
            return true;
          }
        }

        return false;
      }

      if (nextPhase === "REST") {
        restAnchor = restAnchor === null ? metric : restAnchor * 0.7 + metric * 0.3;
        if (now - phaseSince >= restHoldMs) {
          armed = true;
        }
        return false;
      }

      activeExtreme = activeExtreme === null ? metric : extreme(activeExtreme, metric);

      if (now - phaseSince >= activeHoldMs && restAnchor !== null && activeExtreme !== null) {
        qualifiedActive = Math.abs(restAnchor - activeExtreme) >= minExcursion;
      }

      return false;
    },
    cancelCurrentRep() {
      phase = null;
      phaseSince = 0;
      restAnchor = null;
      activeExtreme = null;
      armed = false;
      qualifiedActive = false;
    },
    reset() {
      count = 0;
      this.cancelCurrentRep();
    },
  };
}
