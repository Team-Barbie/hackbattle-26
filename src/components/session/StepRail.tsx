import { shortExerciseName } from "../../content/exerciseMeta";
import { stepStatus } from "../../exercises/prescription";
import type { ExerciseSession } from "../../hooks/useExerciseSession";
import Icon from "../Icon";

type Props = {
  session: ExerciseSession;
  /** Reps banked for each step so far, indexed by step. */
  repsByStep: number[];
};

export default function StepRail({ session, repsByStep }: Props) {
  const { plan, stepIndex, planComplete } = session;

  return (
    <section className="card card--tight" aria-label="Plan progress">
      <div className="card__row">
        <p className="card__title">{plan.title}</p>
        <span className="muted" style={{ fontSize: "0.76rem" }}>
          {plan.therapist}
        </span>
      </div>
      <ol className="step-rail">
        {plan.steps.map((step, index) => {
          const status = stepStatus(index, stepIndex, planComplete);
          const done = repsByStep[index] ?? 0;

          return (
            <li key={step.id} className={`step-rail__item is-${status}`}>
              <span className={`index-bubble is-${status}`}>
                {status === "done" ? <Icon name="check" width={14} height={14} /> : index + 1}
              </span>
              <span className="step-rail__name">{shortExerciseName(step.exerciseId)}</span>
              <span className="step-rail__reps">
                {status === "queued" ? `×${step.targetReps}` : `${done}/${step.targetReps}`}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
