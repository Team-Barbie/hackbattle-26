import { exerciseArea, exerciseFraming } from "../../content/exerciseMeta";
import { exerciseName } from "../../exercises/exerciseCatalog";
import type { ExerciseSession } from "../../hooks/useExerciseSession";
import ProgressRing from "../ProgressRing";

export default function RepDial({ session }: { session: ExerciseSession }) {
  const { reps, targetReps, exerciseId, stepIndex, plan, stepComplete, planComplete } = session;
  const remaining = Math.max(0, targetReps - reps);
  const progress = targetReps > 0 ? reps / targetReps : 0;

  return (
    <section className="card card--tight" aria-label="Rep counter">
      <div className="rep-dial">
        <div className="rep-dial__ring">
          <ProgressRing value={progress} thickness={0.09} />
          <span className={`rep-dial__ring-value${stepComplete ? " is-complete" : ""}`} aria-live="polite">
            {reps}
          </span>
        </div>
        <div className="rep-dial__copy">
          <span className="eyebrow eyebrow--muted">
            {planComplete ? "Plan finished" : `Exercise ${stepIndex + 1} of ${plan.steps.length}`}
          </span>
          <p className="rep-dial__name">{exerciseName(exerciseId)}</p>
          <p className="rep-dial__sub">
            {exerciseArea(exerciseId)} · {exerciseFraming(exerciseId)}
          </p>
          <p className="rep-dial__remaining">
            {planComplete ? (
              "All prescribed reps done."
            ) : stepComplete ? (
              "Set complete — moving on."
            ) : (
              <>
                <b>{remaining}</b> to go of {targetReps}
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
