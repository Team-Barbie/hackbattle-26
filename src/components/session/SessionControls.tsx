import { useState, type FormEvent } from "react";
import type { ReferenceExercise } from "../../exercises/custom/referenceExercise";
import type { ExerciseSession } from "../../hooks/useExerciseSession";
import Icon from "../Icon";

type Props = {
  session: ExerciseSession;
  onRestartPlan: () => void;
  className?: string;
  allowReferenceAuthoring?: boolean;
  onReferenceSaved?: (reference: ReferenceExercise) => void;
};

export default function SessionControls({
  session,
  onRestartPlan,
  className,
  allowReferenceAuthoring = false,
  onReferenceSaved,
}: Props) {
  const { isLive, isBusy, exerciseId, recordingReference } = session;
  const isCustom = exerciseId === "custom";
  const [referenceName, setReferenceName] = useState("");

  function handleSaveReference(event: FormEvent) {
    event.preventDefault();
    const saved = session.savePendingReference(referenceName);

    if (saved) {
      onReferenceSaved?.(saved);
    }
  }

  return (
    <section
      className={`card${className ? ` ${className}` : ""}`}
      aria-label="Session controls"
    >
      <h2 className="section-title">Controls</h2>

      {isCustom && recordingReference && (
        <p className="recording-banner">
          Recording reference · {session.referenceFrameCount} frames
        </p>
      )}

      <div className="controls">
        {isCustom && allowReferenceAuthoring &&
          (recordingReference ? (
            <button
              type="button"
              className="btn btn--sm btn--span"
              onClick={session.stopReferenceRecording}
            >
              <Icon name="stop" solid />
              Stop and use this rep
            </button>
          ) : (
            <button
              type="button"
              className={`btn btn--sm${session.referenceExercise ? " btn--ghost" : ""} btn--span`}
              onClick={session.startReferenceRecording}
              disabled={!isLive}
            >
              <Icon name="record" solid />
              {session.referenceExercise ? "Re-record reference" : "Record reference rep"}
            </button>
          ))}

        {isCustom && allowReferenceAuthoring && session.pendingReference && (
          <form className="reference-name" onSubmit={handleSaveReference}>
            <label className="field">
              <span>Exercise name</span>
              <input
                value={referenceName}
                onChange={(event) => setReferenceName(event.currentTarget.value)}
                placeholder="e.g. Seated ankle rotation"
                maxLength={60}
                autoFocus
                required
              />
            </label>
            <button type="submit" className="btn btn--sm" disabled={!referenceName.trim()}>
              <Icon name="check" />
              Save exercise
            </button>
          </form>
        )}

        {isCustom && allowReferenceAuthoring && session.referenceExercise && !session.pendingReference && (
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
          className="btn btn--sm btn--outline"
          onClick={session.skipStep}
          disabled={recordingReference || !session.nextStep}
        >
          <Icon name="forward" />
          Skip exercise
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
