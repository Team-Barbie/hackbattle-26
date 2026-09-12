import { EXERCISES, isExerciseId } from "../exercises/exerciseCatalog";
import type { ExerciseSession } from "../hooks/useExerciseSession";

export default function ControlBar({ session }: { session: ExerciseSession }) {
  const { isLive, isBusy } = session;

  return (
    <div className="control-bar">
      <label className="exercise-picker">
        <span>Exercise</span>
        <select
          value={session.exerciseId}
          onChange={(event) => {
            if (isExerciseId(event.currentTarget.value)) {
              session.selectExercise(event.currentTarget.value);
            }
          }}
          aria-label="Choose exercise"
        >
          {EXERCISES.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => void session.startCamera()}
        disabled={isLive || isBusy}
      >
        Start cam
      </button>
      <button
        type="button"
        className="secondary"
        onClick={session.stopCamera}
        disabled={!isLive}
      >
        End cam
      </button>
      <button
        type="button"
        className="secondary"
        onClick={session.toggleSkeleton}
        aria-pressed={session.showSkeleton}
      >
        Skeleton: {session.showSkeleton ? "on" : "off"}
      </button>
      <button
        type="button"
        className="secondary"
        onClick={session.toggleAudio}
        disabled={!session.audioSupported}
        aria-pressed={session.audioEnabled}
        title={session.audioSupported ? undefined : "Speech is not supported in this browser"}
      >
        Voice: {session.audioEnabled ? "on" : "off"}
      </button>
    </div>
  );
}
