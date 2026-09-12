import { useEffect, useState } from "react";
import type { ExerciseSession } from "../../hooks/useExerciseSession";
import Icon from "../Icon";

type Props = {
  session: ExerciseSession;
  onRestartPlan: () => void;
  canManageReference?: boolean;
  onReferencePublished?: () => void;
  className?: string;
};

export default function SessionControls({
  session,
  onRestartPlan,
  canManageReference = false,
  onReferencePublished,
  className,
}: Props) {
  const { isLive, isBusy, exerciseId, recordingReference } = session;
  const isCustom = exerciseId === "custom";
  const [exerciseName, setExerciseName] = useState("");

  useEffect(() => {
    if (session.pendingReference) {
      setExerciseName("");
    }
  }, [session.pendingReference]);

  return (
    <section
      className={`card${className ? ` ${className}` : ""}`}
      aria-label="Session controls"
    >
      <h2 className="section-title">Controls</h2>

      {canManageReference && isCustom && recordingReference && (
        <p className="recording-banner">
          Recording reference · {session.referenceFrameCount} frames
        </p>
      )}

      <div className="controls">
        {canManageReference && isCustom && session.pendingReference ? (
          <form
            className="reference-publish"
            onSubmit={(event) => {
              event.preventDefault();
              if (session.publishReference(exerciseName)) {
                onReferencePublished?.();
              }
            }}
          >
            <label className="field" htmlFor="recorded-exercise-name">
              <span>Exercise name</span>
              <input
                id="recorded-exercise-name"
                value={exerciseName}
                onChange={(event) => setExerciseName(event.currentTarget.value)}
                placeholder="e.g. Seated ankle pump"
                autoComplete="off"
                autoFocus
              />
            </label>
            <button type="submit" className="btn btn--sm" disabled={!exerciseName.trim()}>
              Publish exercise
            </button>
            <button
              type="button"
              className="btn btn--sm btn--outline"
              onClick={session.discardPendingReference}
            >
              Discard
            </button>
          </form>
        ) : canManageReference && isCustom &&
          (recordingReference ? (
            <button
              type="button"
              className="btn btn--sm btn--span"
              onClick={session.stopReferenceRecording}
            >
              <Icon name="stop" solid />
              Finish recording
            </button>
          ) : (
            <button
              type="button"
              className={`btn btn--sm${session.referenceExercise ? " btn--ghost" : ""} btn--span`}
              onClick={session.startReferenceRecording}
              disabled={!isLive}
            >
              <Icon name="record" solid />
              {session.referenceExercise ? "Re-record exercise" : "Record exercise"}
            </button>
          ))}

        {canManageReference && isCustom && session.referenceExercise && !session.pendingReference && (
          <button
            type="button"
            className="btn btn--sm btn--outline btn--span"
            onClick={session.clearReference}
            disabled={recordingReference}
          >
            <Icon name="trash" />
            Clear reference
          </button>
        )}

        {isLive ? (
          <button type="button" className="btn btn--sm btn--ghost" onClick={session.stopCamera}>
            <Icon name="camera-off" />
            Camera off
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => void session.startCamera()}
            disabled={isBusy}
          >
            <Icon name="camera" />
            Camera on
          </button>
        )}

        <button
          type="button"
          className="btn btn--sm btn--outline"
          onClick={session.toggleSkeleton}
          aria-pressed={session.showSkeleton}
        >
          <Icon name="skeleton" />
          Skeleton {session.showSkeleton ? "on" : "off"}
        </button>

        <button
          type="button"
          className="btn btn--sm btn--outline"
          onClick={session.toggleAudio}
          disabled={!session.audioSupported}
          aria-pressed={session.audioEnabled}
          title={session.audioSupported ? undefined : "Speech is not supported in this browser"}
        >
          <Icon name={session.audioEnabled ? "voice" : "voice-off"} />
          Voice {session.audioEnabled ? "on" : "off"}
        </button>

        <button
          type="button"
          className="btn btn--sm btn--outline"
          onClick={session.resetSession}
          disabled={recordingReference}
        >
          <Icon name="reset" />
          Reset exercise
        </button>

        <button
          type="button"
          className="btn btn--sm btn--outline btn--span"
          onClick={onRestartPlan}
          disabled={recordingReference}
        >
          <Icon name="restart" />
          Restart whole plan
        </button>
      </div>
    </section>
  );
}
