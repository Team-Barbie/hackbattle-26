import { EXERCISES, type ExerciseId } from "../exercises/exerciseCatalog";
import { exerciseGuides } from "../coaching/exerciseGuide";

type Props = {
  onOpenExercise: (id: ExerciseId) => void;
};

export default function ProgramScreen({ onOpenExercise }: Props) {
  return (
    <div className="page">
      <header className="page-header">
        <p className="app-eyebrow">Program</p>
        <h1>Your exercises</h1>
      </header>

      <ul className="exercise-list">
        {EXERCISES.map((exercise) => (
          <li key={exercise.id}>
            <button
              type="button"
              className="exercise-tile"
              onClick={() => onOpenExercise(exercise.id)}
            >
              <span className="exercise-tile-name">{exercise.name}</span>
              <span className="exercise-tile-detail">
                {exerciseGuides[exercise.id].summary}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
