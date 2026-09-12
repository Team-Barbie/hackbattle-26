import { exerciseName } from "../exercises/exerciseCatalog";
import { stepStatus } from "../exercises/prescription";
import type { ExerciseSession } from "../hooks/useExerciseSession";

const STATUS_LABEL: Record<"done" | "now" | "queued", string> = {
  done: "Done",
  now: "Now",
  queued: "Up next",
};

export default function PrescriptionList({ session }: { session: ExerciseSession }) {
  const { plan, stepIndex, planComplete } = session;

  return (
    <section className="plan-board" aria-label="Prescribed session">
      <div className="plan-heading">
        <p className="plan-kicker">Prescribed by {plan.therapist}</p>
        <h2>{plan.title}</h2>
        <p className="plan-progress">
          {planComplete
            ? "All exercises complete"
            : `Exercise ${Math.min(stepIndex + 1, plan.steps.length)} of ${plan.steps.length}`}
        </p>
      </div>

      <ol className="plan-list">
        {plan.steps.map((step, index) => {
          const status = stepStatus(index, stepIndex, planComplete);

          return (
            <li key={step.id} className={`plan-item is-${status}`}>
              <span className="plan-index">{index + 1}</span>
              <div>
                <p className="plan-name">{exerciseName(step.exerciseId)}</p>
                <p className="plan-meta">{step.targetReps} reps</p>
              </div>
              <span className="plan-status">{STATUS_LABEL[status]}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
