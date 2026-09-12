import { EXERCISES } from "../exercises/exerciseCatalog";
import type { ExerciseSession } from "../hooks/useExerciseSession";

export default function ExercisePicker({ session }: { session: ExerciseSession }) {
  return (
    <div className="exercise-tabs" role="tablist" aria-label="Exercise">
      {EXERCISES.map((option) => {
        const selected = session.exerciseId === option.id;

        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={selected ? "exercise-option is-selected" : "exercise-option"}
            onClick={() => session.selectExercise(option.id)}
          >
            {option.name}
          </button>
        );
      })}
    </div>
  );
}
