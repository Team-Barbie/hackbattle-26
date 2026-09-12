import Icon from "../components/Icon";
import { exerciseArea, exerciseFraming } from "../content/exerciseMeta";
import { exerciseGuides } from "../coaching/exerciseGuide";
import { EXERCISES, type ExerciseId } from "../exercises/exerciseCatalog";
import type { Prescription } from "../exercises/prescription";
import { totalPrescribedReps } from "../state/prescriptionStore";

type Props = {
  plan: Prescription;
  onOpenExercise: (exerciseId: ExerciseId) => void;
  onStartSession: () => void;
};

export default function ProgramScreen({ plan, onOpenExercise, onStartSession }: Props) {
  const prescribed = new Set(plan.steps.map((step) => step.exerciseId));
  const library = EXERCISES.filter((exercise) => !prescribed.has(exercise.id));

  return (
    <div className="screen page">
      <header className="page__header">
        <h1>Program</h1>
        <p className="label">
          {plan.title} · {plan.therapist}
        </p>
      </header>

      <section className="card" aria-label="Prescribed exercises">
        <h2 className="section-title">
          Prescribed
          <small>
            {plan.steps.length} exercises · {totalPrescribedReps(plan)} reps
          </small>
        </h2>
        <ol className="list">
          {plan.steps.map((step, index) => (
            <li key={step.id}>
              <button
                type="button"
                className="row row--indexed"
                onClick={() => onOpenExercise(step.exerciseId)}
              >
                <span className="row__index">{index + 1}</span>
                <span>
                  <span className="row__title">{exerciseGuides[step.exerciseId].name}</span>
                  <span className="row__sub" style={{ display: "block" }}>
                    {step.targetReps} reps · {exerciseArea(step.exerciseId)} ·{" "}
                    {exerciseFraming(step.exerciseId).toLowerCase()}
                  </span>
                </span>
                <Icon name="forward" className="row__chevron" />
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn--block btn--lg" onClick={onStartSession}>
          <Icon name="play" solid width={16} height={16} />
          Start session
        </button>
      </section>

      {library.length > 0 && (
        <section className="card" aria-label="Other exercises">
          <h2 className="section-title">
            Other exercises <small>not in your plan</small>
          </h2>
          <ul className="list">
            {library.map((exercise) => (
              <li key={exercise.id}>
                <button type="button" className="row" onClick={() => onOpenExercise(exercise.id)}>
                  <span>
                    <span className="row__title">{exercise.name}</span>
                    <span className="row__sub" style={{ display: "block" }}>
                      {exerciseGuides[exercise.id].summary}
                    </span>
                  </span>
                  <Icon name="forward" className="row__chevron" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
