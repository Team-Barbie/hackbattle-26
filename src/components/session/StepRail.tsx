import { shortExerciseName } from "../../content/exerciseMeta";
import { displayExerciseName } from "../../exercises/custom/referenceExercise";
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
    <section className="card" aria-label="Plan progress">
      <h2 className="section-title">
        {plan.title} <small>{plan.therapist}</small>
      </h2>
      <ol className="list">
        {plan.steps.map((step, index) => {
          const status = stepStatus(index, stepIndex, planComplete);
          const done = repsByStep[index] ?? 0;

          return (
            <li key={step.id} className={`row row--indexed step-rail__item is-${status}`}>
              <span className={`row__index is-${status}`}>
                {status === "done" ? <Icon name="check" width={14} height={14} /> : index + 1}
              </span>
              <span className="row__title">
                {step.exerciseId === "custom"
                  ? displayExerciseName(step.exerciseId)
                  : shortExerciseName(step.exerciseId)}
              </span>
              <span className="row__end">
                {status === "queued" ? `${step.targetReps} reps` : `${done}/${step.targetReps}`}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
