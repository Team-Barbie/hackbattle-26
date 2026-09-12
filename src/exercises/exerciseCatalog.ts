export type ExerciseId =
  | "squat"
  | "shoulder-raise"
  | "knee-raise"
  | "lateral-raise"
  | "bicep-curl"
  | "custom";

export const EXERCISES: ReadonlyArray<{ id: ExerciseId; name: string }> = [
  { id: "squat", name: "Bodyweight squat" },
  { id: "lateral-raise", name: "Lateral raise" },
  { id: "bicep-curl", name: "Bicep curl" },
  { id: "shoulder-raise", name: "Standing shoulder raise" },
  { id: "knee-raise", name: "Standing knee raise" },
  { id: "custom", name: "Custom recorded exercise" },
];

export function isExerciseId(value: string): value is ExerciseId {
  return EXERCISES.some((exercise) => exercise.id === value);
}

export function exerciseName(id: ExerciseId): string {
  return EXERCISES.find((exercise) => exercise.id === id)?.name ?? id;
}

export function usesUpperBody(id: ExerciseId): boolean {
  return id === "shoulder-raise" || id === "lateral-raise" || id === "bicep-curl";
}
