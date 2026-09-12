import type { ExerciseId } from "../exercises/exerciseCatalog";

export type MoveDirection = "descending" | "ascending" | "still";

export type CueTone = "wait" | "down" | "up" | "hold";

export type Cue = {
  headline: string;
  detail: string;
  tone: CueTone;
};

export type CueInput = {
  exerciseId: ExerciseId;
  tracking: boolean;
  state: string | null;
  direction: MoveDirection;
  repsDone: number;
  repsTarget: number;
};

/**
 * The state machine decides what the body is doing; this decides what to say
 * about it. Nothing here reads landmarks, and nothing upstream writes copy.
 */
export function nextCue({
  exerciseId,
  tracking,
  state,
  direction,
  repsDone,
  repsTarget,
}: CueInput): Cue {
  if (!tracking) {
    return {
      headline: "Step into frame",
      detail: "Move back until your head, hips, knees, and ankles are all visible.",
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

  if (exerciseId === "shoulder-raise") {
    if (state === "ARMS_UP") {
      return {
        headline: "Lower with control",
        detail: "Bring both arms smoothly back to your sides to finish the rep.",
        tone: "down",
      };
    }

    return state === "ARMS_DOWN"
      ? {
          headline: "Raise your arms",
          detail: "Lift both arms overhead without shrugging your shoulders.",
          tone: "up",
        }
      : {
          headline: "Arms by your sides",
          detail: "Stand tall with both hands visible before you begin.",
          tone: "wait",
        };
  }

  if (exerciseId === "knee-raise") {
    if (state === "KNEE_UP") {
      return {
        headline: "Lower with control",
        detail: "Return your foot to the floor without leaning back.",
        tone: "down",
      };
    }

    return state === "FEET_DOWN"
      ? {
          headline: "Lift one knee",
          detail: "Bring one knee toward hip height while keeping your torso tall.",
          tone: "up",
        }
      : {
          headline: "Stand tall",
          detail: "Place both feet on the floor before you begin.",
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
