import { useState, type FormEvent } from "react";
import type { ReferenceExercise } from "../../exercises/custom/referenceExercise";
import type { ExerciseSession } from "../../hooks/useExerciseSession";
import Icon from "../Icon";

type Props = {
  session: ExerciseSession;
  onRestartPlan: () => void;
  className?: string;
  allowReferenceAuthoring?: boolean;
  onReferenceSaved?: (reference: ReferenceExercise) => void | Promise<void>;
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
  const [optionalInstruction, setOptionalInstruction] = useState("");
  const [optionalCue, setOptionalCue] = useState("");
  const [savingReference, setSavingReference] = useState(false);
  const [referenceSaveError, setReferenceSaveError] = useState<string | null>(null);
  const [referenceAwaitingRetry, setReferenceAwaitingRetry] = useState<ReferenceExercise | null>(null);

  async function saveToSharedLibrary(reference: ReferenceExercise) {
    setSavingReference(true);
    setReferenceSaveError(null);
    setReferenceAwaitingRetry(reference);

    try {
      await onReferenceSaved?.(reference);
      setReferenceAwaitingRetry(null);
    } catch (error) {
      setReferenceSaveError(
        error instanceof Error ? error.message : "Could not save this exercise to the shared library.",
      );
    } finally {
      setSavingReference(false);
    }
  }

  async function handleSaveReference(event: FormEvent) {
    event.preventDefault();
    const saved = session.savePendingReference(referenceName, {
      instruction: optionalInstruction,
      cue: optionalCue,
    });

    if (saved) {
      await saveToSharedLibrary(saved);
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
            <div className="notice">
              <strong>Movement detected automatically</strong>
              <p>{session.pendingReference.motionProfile?.summary}</p>
              <p>
                Main joint: {session.pendingReference.motionProfile?.primary.label} ·{" "}
                {session.pendingReference.motionProfile?.primary.minDegrees}–
                {session.pendingReference.motionProfile?.primary.maxDegrees}°
              </p>
            </div>
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
            <details className="notice">
              <summary>Optional: customise the generated guidance</summary>
              <label className="field" style={{ marginTop: 12 }}>
                <span>Client instruction</span>
                <textarea
                  value={optionalInstruction}
                  onChange={(event) => setOptionalInstruction(event.currentTarget.value)}
                  placeholder="Leave blank to use the detected joint action"
                  maxLength={240}
                  rows={3}
                />
              </label>
              <label className="field">
                <span>Short coaching cue</span>
                <input
                  value={optionalCue}
                  onChange={(event) => setOptionalCue(event.currentTarget.value)}
                  placeholder="Leave blank to generate automatically"
                  maxLength={120}
                />
              </label>
            </details>
            <button
              type="submit"
              className="btn btn--sm"
              disabled={!referenceName.trim() || savingReference}
            >
              <Icon name="check" />
              {savingReference ? "Saving…" : "Save exercise"}
            </button>
          </form>
        )}

        {referenceSaveError && (
          <div className="notice notice--error btn--span">
            <p>{referenceSaveError}</p>
            {referenceAwaitingRetry && (
              <button
                type="button"
                className="btn btn--sm btn--outline"
                onClick={() => void saveToSharedLibrary(referenceAwaitingRetry)}
                disabled={savingReference}
              >
                {savingReference ? "Retrying…" : "Retry shared save"}
              </button>
            )}
          </div>
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
