import type { ExerciseSession } from "../../hooks/useExerciseSession";

export default function CoachHud({ session }: { session: ExerciseSession }) {
  const { cue, reps, targetReps, stepComplete, recordingReference } = session;

  const headline = recordingReference ? "Recording" : cue.headline;
  const detail = recordingReference
    ? `${session.referenceFrameCount} frames captured. Do one slow, complete rep, then stop.`
    : cue.detail;
  const tone = recordingReference ? "hold" : cue.tone;

  return (
    <div className="hud" aria-live="polite">
      <div className="hud__cue">
        <p className={`hud__headline tone-${tone}`}>{headline}</p>
        <p className="hud__detail">{detail}</p>
      </div>
      <div className="hud__reps" aria-hidden="true">
        <span className={`hud__reps-value${stepComplete ? " is-complete" : ""}`}>{reps}</span>
        <span className="hud__reps-target">/ {targetReps}</span>
      </div>
    </div>
  );
}
