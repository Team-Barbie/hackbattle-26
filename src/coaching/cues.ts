import type { SquatState } from "../exercises/squat/squatState";

export type MoveDirection = "descending" | "ascending" | "still";

export type CueTone = "wait" | "down" | "up" | "hold";

export type Cue = {
  headline: string;
  detail: string;
  tone: CueTone;
};

export type CueInput = {
  tracking: boolean;
  state: SquatState | null;
  direction: MoveDirection;
  repsDone: number;
  repsTarget: number;
};

/**
 * The state machine decides what the body is doing; this decides what to say
 * about it. Nothing here reads landmarks, and nothing upstream writes copy.
 */
export function nextCue({
  tracking,
  state,
  direction,
  repsDone,
  repsTarget,
}: CueInput): Cue {
  if (!tracking) {
    return {
      headline: "Step into frame",
      detail: "Move back until your hips, knees, and ankles are all visible.",
      tone: "wait",
    };
  }

  if (repsDone >= repsTarget && repsTarget > 0) {
    return {
      headline: "Set complete",
      detail: `That's ${repsDone} reps. Shake it out, or raise the target for another set.`,
      tone: "wait",
    };
  }

  if (state === "UP") {
    return direction === "descending"
      ? {
          headline: "Going down",
          detail: "Sit back into the hips and keep your chest tall.",
          tone: "down",
        }
      : {
          headline: "Go down",
          detail: "Start the rep — bend the knees and sit back, slow and controlled.",
          tone: "down",
        };
  }

  if (state === "DOWN") {
    if (direction === "descending") {
      return {
        headline: "A little deeper",
        detail: "Keep sinking until your thighs are about parallel.",
        tone: "down",
      };
    }

    if (direction === "ascending") {
      return {
        headline: "Drive up",
        detail: "Push through your heels and stand all the way tall.",
        tone: "up",
      };
    }

    return {
      headline: "Hold the position",
      detail: "Brace here for a beat, then drive up.",
      tone: "hold",
    };
  }

  return {
    headline: "Get set",
    detail: "Feet shoulder-width apart, toes turned slightly out.",
    tone: "wait",
  };
}
