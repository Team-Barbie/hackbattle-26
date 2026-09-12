import type { ExerciseId } from "../exercises/exerciseCatalog";
import type { FormIssue } from "../exercises/formIssues";
import { correctionFor, issueLabel } from "./feedback";

export type MoveDirection = "descending" | "ascending" | "still";

export type CueTone = "wait" | "down" | "up" | "hold" | "correct";

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
  nextExerciseName?: string | null;
  sessionComplete?: boolean;
  primaryIssue?: FormIssue | null;
};

const WAIT_IN_FRAME: Record<ExerciseId, Cue> = {
  squat: {
    headline: "Step into frame",
    detail: "Move back until your head, hips, knees, and ankles are all visible.",
    tone: "wait",
  },
  "lateral-raise": {
    headline: "Step into frame",
    detail: "Face the camera so both shoulders and arms stay visible.",
    tone: "wait",
  },
  "bicep-curl": {
    headline: "Step into frame",
    detail: "Face the camera until both elbows and wrists are clearly visible.",
    tone: "wait",
  },
  "shoulder-raise": {
    headline: "Step into frame",
    detail: "Stand so your torso and both hands stay inside the frame.",
    tone: "wait",
  },
  "knee-raise": {
    headline: "Step into frame",
    detail: "Move back until your head, hips, knees, and ankles are all visible.",
    tone: "wait",
  },
  custom: {
    headline: "Step into frame",
    detail: "Keep your full body visible while recording and practising.",
    tone: "wait",
  },
};

function isRestingForCue(
  exerciseId: ExerciseId,
  state: string | null,
  direction: MoveDirection,
): boolean {
  if (exerciseId === "squat") {
    return state === "UP" && direction !== "descending";
  }

  return (
    state === "ARMS_DOWN" ||
    state === "FEET_DOWN" ||
    state === "LATERAL_DOWN" ||
    state === "ARMS_EXTENDED" ||
    state === "ADJUST" ||
    state === "MATCHED"
  );
}

export function nextCue({
  exerciseId,
  tracking,
  state,
  direction,
  repsDone,
  repsTarget,
  nextExerciseName = null,
  sessionComplete = false,
  primaryIssue = null,
}: CueInput): Cue {
  if (!tracking) {
    return WAIT_IN_FRAME[exerciseId];
  }

  if (repsDone >= repsTarget && repsTarget > 0) {
    if (sessionComplete) {
      return {
        headline: "Session complete",
        detail: `That's the full plan. ${repsDone} reps on this last exercise.`,
        tone: "wait",
      };
    }

    return {
      headline: "Set complete",
      detail: nextExerciseName
        ? `That's ${repsDone} reps. Next: ${nextExerciseName}.`
        : `That's ${repsDone} reps. Stay ready for the next exercise.`,
      tone: "wait",
    };
  }

  if (primaryIssue && isRestingForCue(exerciseId, state, direction)) {
    const correction = correctionFor(primaryIssue);
    return {
      headline: correction.headline,
      detail: `${issueLabel(primaryIssue)}. ${correction.detail}`,
      tone: "correct",
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

  if (exerciseId === "lateral-raise") {
    if (state === "LATERAL_UP") {
      return {
        headline: "Lower slowly",
        detail: "Control the way down — don't drop the arms.",
        tone: "down",
      };
    }

    return state === "LATERAL_DOWN"
      ? {
          headline: "Raise the arms",
          detail: "Lift both arms out to the sides, up to shoulder height.",
          tone: "up",
        }
      : {
          headline: "Get set",
          detail: "Stand tall, arms relaxed at your sides.",
          tone: "wait",
        };
  }

  if (exerciseId === "bicep-curl") {
    if (state === "ARMS_CURLED") {
      return {
        headline: "Lower slowly",
        detail: "Straighten the arms all the way without swinging.",
        tone: "down",
      };
    }

    return state === "ARMS_EXTENDED"
      ? {
          headline: "Curl up",
          detail: "Bend the elbows and bring both hands toward your shoulders.",
          tone: "up",
        }
      : {
          headline: "Get set",
          detail: "Elbows close to your ribs, arms long.",
          tone: "wait",
        };
  }

  if (exerciseId === "custom") {
    if (state === "RECORDING") {
      return {
        headline: "Recording reference",
        detail: "Perform one complete repetition, then press Stop and use.",
        tone: "hold",
      };
    }

    if (state === "NO_REFERENCE") {
      return {
        headline: "Record a reference",
        detail: "Use the recording control below, then perform one complete repetition.",
        tone: "wait",
      };
    }

    if (state === "MATCHED") {
      return {
        headline: "Good match",
        detail: "Keep following the recorded movement at a controlled pace.",
        tone: "up",
      };
    }

    return {
      headline: "Follow the reference",
      detail: "Adjust your joint positions to improve the live match score.",
      tone: "down",
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
