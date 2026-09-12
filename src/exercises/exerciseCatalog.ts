export type ExerciseId = "squat" | "shoulder-raise" | "knee-raise";

export const EXERCISES: ReadonlyArray<{ id: ExerciseId; name: string }> = [
  { id: "squat", name: "Bodyweight squat" },
  { id: "shoulder-raise", name: "Standing shoulder raise" },
  { id: "knee-raise", name: "Standing knee raise" },
];

export function isExerciseId(value: string): value is ExerciseId {
  return EXERCISES.some((exercise) => exercise.id === value);
}
