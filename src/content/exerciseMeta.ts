import { exerciseName, usesUpperBody, type ExerciseId } from "../exercises/exerciseCatalog";

/** Short, two-letter monogram used in tiles and rails. */
const MONOGRAM: Record<ExerciseId, string> = {
  squat: "SQ",
  "knee-raise": "KR",
  "lateral-raise": "LR",
  "shoulder-raise": "SR",
  "bicep-curl": "BC",
  custom: "RX",
};

export function exerciseMonogram(id: ExerciseId): string {
  return MONOGRAM[id];
}

export function exerciseArea(id: ExerciseId): string {
  if (id === "custom") {
    return "Recorded";
  }

  return usesUpperBody(id) ? "Upper body" : "Lower body";
}

export function exerciseFraming(id: ExerciseId): string {
  if (id === "custom") {
    return "Full body";
  }

  return usesUpperBody(id) ? "Face camera" : "Side-on";
}

export function shortExerciseName(id: ExerciseId): string {
  const name = exerciseName(id)
    .replace(/^Standing /, "")
    .replace(/^Bodyweight /, "")
    .replace(/^Custom /, "");

  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function formatDay(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
