import { exerciseName } from "../exercises/exerciseCatalog";
import type { ExerciseSession } from "../hooks/useExerciseSession";

export default function RepCounterPanel({ session }: { session: ExerciseSession }) {
  const { reps, targetReps, currentStep, stepIndex, plan, planComplete } = session;
  const remaining = Math.max(0, targetReps - reps);
  const progress = targetReps > 0 ? Math.min(1, reps / targetReps) : 0;

  return (
    <section className="panel reps-panel" aria-label="Rep counter">
      <h2 className="panel-title">This exercise</h2>
      <p className="guide-name">{currentStep ? exerciseName(currentStep.exerciseId) : "·"}</p>
      <p className="reps-note">
        {planComplete
          ? "Plan finished"
          : `${stepIndex + 1} of ${plan.steps.length} · ${targetReps} prescribed reps`}
      </p>

      <div className="reps-block">
        <p className="reps-label">To do</p>
        <span className="reps-value is-muted">{remaining}</span>
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
        Reset this exercise
      </button>
    </section>
  );
}
