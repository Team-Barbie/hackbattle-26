import Icon from "../components/Icon";
import { exerciseArea, exerciseFraming, exerciseMonogram } from "../content/exerciseMeta";
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
        <p className="eyebrow">Program</p>
        <h1>{plan.title}</h1>
        <p className="lede">
          Prescribed by {plan.therapist}. Exercises run in this order — {totalPrescribedReps(plan)}{" "}
          reps in total.
        </p>
      </header>

      <section aria-label="Prescribed exercises" style={{ display: "grid", gap: 10 }}>
        <h2 className="section-title">
          Your prescription <small>tap to learn how</small>
        </h2>
        <ol className="tile-list">
          {plan.steps.map((step, index) => (
            <li key={step.id}>
              <button
                type="button"
                className="exercise-tile"
                onClick={() => onOpenExercise(step.exerciseId)}
              >
                <span className="exercise-tile__glyph">{exerciseMonogram(step.exerciseId)}</span>
                <span>
                  <span className="exercise-tile__name">
                    {index + 1}. {exerciseGuides[step.exerciseId].name}
                  </span>
                  <span className="exercise-tile__sub">
                    {exerciseArea(step.exerciseId)} · {exerciseFraming(step.exerciseId)}
                  </span>
                </span>
                <span className="exercise-tile__end">
                  <span className="chip">×{step.targetReps}</span>
                  <Icon name="forward" />
                </span>
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn--block btn--lg" onClick={onStartSession}>
          <Icon name="play" solid width={18} height={18} />
          Start full session
        </button>
      </section>

      {library.length > 0 && (
        <section aria-label="Exercise library" style={{ display: "grid", gap: 10 }}>
          <h2 className="section-title">
            Library <small>not in today's plan</small>
          </h2>
          <ul className="tile-list">
            {library.map((exercise) => (
              <li key={exercise.id}>
                <button
                  type="button"
                  className="exercise-tile"
                  onClick={() => onOpenExercise(exercise.id)}
                >
                  <span className="exercise-tile__glyph is-neutral">
                    {exerciseMonogram(exercise.id)}
                  </span>
                  <span>
                    <span className="exercise-tile__name">{exercise.name}</span>
                    <span className="exercise-tile__sub">{exerciseGuides[exercise.id].summary}</span>
                  </span>
                  <span className="exercise-tile__end">
                    <Icon name="forward" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
