import type { ExerciseSession } from "../hooks/useExerciseSession";

const MIN_TARGET = 1;
const MAX_TARGET = 50;

export default function RepCounterPanel({ session }: { session: ExerciseSession }) {
  const { reps, targetReps, setTargetReps } = session;
  const remaining = Math.max(0, targetReps - reps);
  const progress = targetReps > 0 ? Math.min(1, reps / targetReps) : 0;

  return (
    <section className="panel reps-panel" aria-label="Rep counter">
      <h2 className="panel-title">Rep counter</h2>

      <div className="reps-block">
        <p className="reps-label">To do</p>
        <div className="reps-target">
          <button
            type="button"
            className="step"
            onClick={() => setTargetReps((value) => Math.max(MIN_TARGET, value - 1))}
            disabled={targetReps <= MIN_TARGET}
            aria-label="Lower target reps"
          >
            −
          </button>
          <span className="reps-value is-muted">{remaining}</span>
          <button
            type="button"
            className="step"
            onClick={() => setTargetReps((value) => Math.min(MAX_TARGET, value + 1))}
            disabled={targetReps >= MAX_TARGET}
            aria-label="Raise target reps"
          >
            +
          </button>
        </div>
        <p className="reps-note">of {targetReps} target</p>
      </div>

      <div className="reps-block">
        <p className="reps-label">Done reps</p>
        <span className="reps-value" aria-live="polite">
          {reps}
        </span>
      </div>

      <div
        className="reps-progress"
        role="progressbar"
        aria-valuenow={reps}
        aria-valuemin={0}
        aria-valuemax={targetReps}
      >
        <span style={{ width: `${progress * 100}%` }} />
      </div>

      <button type="button" className="secondary block" onClick={session.resetSession}>
        Reset count
      </button>
    </section>
  );
}
