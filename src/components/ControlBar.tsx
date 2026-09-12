import type { ExerciseSession } from "../hooks/useExerciseSession";

export default function ControlBar({ session }: { session: ExerciseSession }) {
  const { isLive, isBusy } = session;

  return (
    <div className="control-bar">
      {session.exerciseId === "custom" &&
        (session.recordingReference ? (
          <button type="button" onClick={session.stopReferenceRecording}>
            Stop and use ({session.referenceFrameCount})
          </button>
        ) : (
          <button
            type="button"
            onClick={session.startReferenceRecording}
            disabled={!isLive}
          >
            Record reference
          </button>
        ))}
      {session.exerciseId === "custom" && session.referenceExercise && (
        <button
          type="button"
          className="secondary"
          onClick={session.clearReference}
          disabled={session.recordingReference}
        >
          Clear reference
        </button>
      )}
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
