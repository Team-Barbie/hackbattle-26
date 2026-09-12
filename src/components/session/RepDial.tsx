import { exerciseArea, exerciseFraming } from "../../content/exerciseMeta";
import { exerciseName } from "../../exercises/exerciseCatalog";
import type { ExerciseSession } from "../../hooks/useExerciseSession";
import ProgressRing from "../ProgressRing";

export default function RepDial({ session }: { session: ExerciseSession }) {
  const { reps, targetReps, exerciseId, stepIndex, plan, stepComplete, planComplete } = session;
  const remaining = Math.max(0, targetReps - reps);
  const progress = targetReps > 0 ? reps / targetReps : 0;

  return (
    <section className="card" aria-label="Rep counter">
      <div className="rep-dial">
        <div className="rep-dial__ring">
          <ProgressRing value={progress} thickness={0.09} />
          <span className={`rep-dial__ring-value${stepComplete ? " is-complete" : ""}`} aria-live="polite">
            {reps}
          </span>
        </div>
        <div className="rep-dial__copy">
          <p className="rep-dial__name">{exerciseName(exerciseId)}</p>
          <p className="rep-dial__sub">
            {planComplete ? "Plan finished" : `Exercise ${stepIndex + 1} of ${plan.steps.length}`} ·{" "}
            {exerciseArea(exerciseId)} · {exerciseFraming(exerciseId).toLowerCase()}
          </p>
          <p className="rep-dial__sub">
            {planComplete
              ? "All prescribed reps done."
              : stepComplete
                ? "Set complete, moving on."
                : `${remaining} of ${targetReps} to go`}
          </p>
        </div>
      </div>
    </section>
  );
}
