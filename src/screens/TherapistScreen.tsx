import { useEffect, useRef, useState } from "react";
import Brand from "../components/Brand";
import Icon from "../components/Icon";
import ProgressRing from "../components/ProgressRing";
import { exerciseGuides } from "../coaching/exerciseGuide";
import { formatDay, formatDuration, shortExerciseName } from "../content/exerciseMeta";
import { EXERCISES, isExerciseId, type ExerciseId } from "../exercises/exerciseCatalog";
import { loadReferenceExercise } from "../exercises/custom/referenceExercise";
import {
  DEFAULT_PRESCRIPTION,
  clonePrescription,
  createPlanStep,
  planStepName,
  type PlanStep,
  type Prescription,
} from "../exercises/prescription";
import { type ClinicSession } from "../state/clinicCloud";
import { sharedPlanUrl } from "../state/prescriptionStore";
import {
  currentStreak,
  sessionCompletion,
  sessionReps,
  sessionTarget,
  type PatientProfile,
} from "../state/patientProfile";
import { totalPrescribedReps, type StoredPrescription } from "../state/prescriptionStore";

type Props = {
  stored: StoredPrescription;
  initialDraft?: Prescription;
  patient: PatientProfile | null;
  clinicSessions: ClinicSession[];
  cloudEnabled: boolean;
  onPublish: (plan: Prescription) => void | Promise<void>;
  onResetToDefault: () => void;
  onBack: () => void;
  onPreviewAsPatient: () => void;
  onOpenInbox: () => void;
  onRecordCustomExercise: (draft: Prescription) => void;
};

const MIN_REPS = 1;
const MAX_REPS = 50;

function clampReps(value: number): number {
  return Math.min(MAX_REPS, Math.max(MIN_REPS, Math.round(value) || MIN_REPS));
}

function samePlan(a: Prescription, b: Prescription): boolean {
  return (
    a.title === b.title &&
    a.therapist === b.therapist &&
    a.steps.length === b.steps.length &&
    a.steps.every(
      (step, index) =>
        step.exerciseId === b.steps[index].exerciseId &&
        step.targetReps === b.steps[index].targetReps &&
        step.referenceExercise?.recordedAt === b.steps[index].referenceExercise?.recordedAt,
    )
  );
}

export default function TherapistScreen({
  stored,
  initialDraft,
  patient,
  clinicSessions,
  cloudEnabled,
  onPublish,
  onResetToDefault,
  onBack,
  onPreviewAsPatient,
  onOpenInbox,
  onRecordCustomExercise,
}: Props) {
  const [draft, setDraft] = useState<Prescription>(() =>
    clonePrescription(initialDraft ?? stored.plan),
  );
  const [justPublished, setJustPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const editedRef = useRef(Boolean(initialDraft));
  const customExercise =
    loadReferenceExercise() ??
    draft.steps.find((step) => step.exerciseId === "custom")?.referenceExercise ??
    null;
  const exerciseOptions = EXERCISES.filter((exercise) => exercise.id !== "custom");
  const dirty =
    !samePlan(draft, stored.plan) || (draft.accessCode ?? "") !== (stored.plan.accessCode ?? "");
  const missingCode = cloudEnabled && !draft.accessCode?.trim();

  useEffect(() => {
    if (!editedRef.current) {
      setDraft(clonePrescription(stored.plan));
    }
  }, [stored]);

  function touch() {
    editedRef.current = true;
    setJustPublished(false);
    setPublishError(null);
  }

  function patchStep(id: string, patch: Partial<PlanStep>) {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step) => (step.id === id ? { ...step, ...patch } : step)),
    }));
    touch();
  }

  function moveStep(index: number, delta: -1 | 1) {
    setDraft((current) => {
      const target = index + delta;

      if (target < 0 || target >= current.steps.length) {
        return current;
      }

      const steps = [...current.steps];
      [steps[index], steps[target]] = [steps[target], steps[index]];
      return { ...current, steps };
    });
    touch();
  }

  function removeStep(id: string) {
    setDraft((current) => ({ ...current, steps: current.steps.filter((step) => step.id !== id) }));
    touch();
  }

  function addStep(exerciseId: ExerciseId) {
    const reference = exerciseId === "custom" ? customExercise ?? undefined : undefined;
    setDraft((current) => ({
      ...current,
      steps: [...current.steps, createPlanStep(exerciseId, 8, reference)],
    }));
    touch();
  }

  async function handlePublish() {
    setPublishing(true);
    setPublishError(null);
    setCopyState("idle");

    try {
      await onPublish(draft);
      editedRef.current = false;
      setJustPublished(true);
    } catch (error) {
      setJustPublished(false);
      setPublishError(error instanceof Error ? error.message : "Could not publish to the clinic.");
    } finally {
      setPublishing(false);
    }
  }

  function handleReset() {
    editedRef.current = false;
    onResetToDefault();
    setDraft(clonePrescription(DEFAULT_PRESCRIPTION));
    setJustPublished(false);
    setPublishError(null);
    setCopyState("idle");
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(sharedPlanUrl(stored.plan));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  const recent = patient ? [...patient.sessions].reverse().slice(0, 6) : [];

  return (
    <div className="screen studio">
      <div className="screen__top">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="button" className="back-link" onClick={onBack}>
            <Icon name="back" />
            Sign out
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onOpenInbox}>
            <Icon name="chat" />
            Messages
          </button>
        </div>
        <Brand />
      </div>

      <header className="page__header">
        <h1>Exercise plan</h1>
        <p className="lede">
          {cloudEnabled
            ? "Publish sends this plan to every patient who signs in with the access code."
            : "Patients complete these in order. Publish to update what they see on this device."}
        </p>
      </header>

      <div className="studio__grid">
        <section className="card" aria-label="Plan editor">
          <div className="editor-meta">
            <label className="field">
              <span>Plan title</span>
              <input
                value={draft.title}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, title: event.target.value }));
                  touch();
                }}
              />
            </label>
            <label className="field">
              <span>Therapist</span>
              <input
                value={draft.therapist}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, therapist: event.target.value }));
                  touch();
                }}
              />
            </label>
            <label className="field">
              <span>Patient access code</span>
              <input
                value={draft.accessCode ?? ""}
                onChange={(event) => {
                  setDraft((current) => ({
                    ...current,
                    accessCode: event.target.value,
                  }));
                  touch();
                }}
                placeholder={
                  cloudEnabled
                    ? "Required. Patients on other devices sign in with this code"
                    : "Optional. Required at patient sign-in if set"
                }
                autoComplete="off"
              />
            </label>
          </div>

          <h2 className="section-title">
            Exercises
            <small>
              {draft.steps.length} · {totalPrescribedReps(draft)} reps
            </small>
          </h2>

          {draft.steps.length === 0 ? (
            <p className="empty">
              <strong>No exercises</strong>
              Add at least one below before publishing.
            </p>
          ) : (
            <ol className="list">
              {draft.steps.map((step, index) => (
                <li key={step.id} className="editor-step">
                  <span className="row__index">{index + 1}</span>

                  <label className="field">
                    <span className="sr-only">Exercise {index + 1}</span>
                    <select
                      value={step.exerciseId}
                      onChange={(event) => {
                        if (isExerciseId(event.currentTarget.value)) {
                          const exerciseId = event.currentTarget.value;
                          patchStep(step.id, {
                            exerciseId,
                            referenceExercise:
                              exerciseId === "custom" ? customExercise ?? undefined : undefined,
                          });
                        }
                      }}
                    >
                      {exerciseOptions.map((exercise) => (
                        <option key={exercise.id} value={exercise.id}>
                          {exercise.name}
                        </option>
                      ))}
                      {customExercise && (
                        <option value="custom">{customExercise.name}</option>
                      )}
                    </select>
                  </label>

                  <div className="stepper" role="group" aria-label={`Reps for ${planStepName(step)}`}>
                    <button
                      type="button"
                      onClick={() => patchStep(step.id, { targetReps: clampReps(step.targetReps - 1) })}
                      disabled={step.targetReps <= MIN_REPS}
                      aria-label="Fewer reps"
                    >
                      −
                    </button>
                    <output aria-live="polite">
                      {step.targetReps} <small>reps</small>
                    </output>
                    <button
                      type="button"
                      onClick={() => patchStep(step.id, { targetReps: clampReps(step.targetReps + 1) })}
                      disabled={step.targetReps >= MAX_REPS}
                      aria-label="More reps"
                    >
                      +
                    </button>
                  </div>

                  <div className="editor-step__tools">
                    <button
                      type="button"
                      className="btn btn--icon"
                      onClick={() => moveStep(index, -1)}
                      disabled={index === 0}
                      aria-label="Move up"
                    >
                      <Icon name="up" />
                    </button>
                    <button
                      type="button"
                      className="btn btn--icon"
                      onClick={() => moveStep(index, 1)}
                      disabled={index === draft.steps.length - 1}
                      aria-label="Move down"
                    >
                      <Icon name="down" />
                    </button>
                    <button
                      type="button"
                      className="btn btn--icon"
                      onClick={() => removeStep(step.id)}
                      aria-label="Remove"
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div>
            <p className="label" style={{ marginBottom: 8 }}>
              Add exercise
            </p>
            <div className="picker">
              {exerciseOptions.map((exercise) => (
                <button
                  type="button"
                  key={exercise.id}
                  className="picker__chip"
                  onClick={() => addStep(exercise.id)}
                  title={exerciseGuides[exercise.id].summary}
                >
                  <Icon name="plus" />
                  {exercise.name}
                </button>
              ))}
              {customExercise && (
                <button
                  type="button"
                  className="picker__chip"
                  onClick={() => addStep("custom")}
                  title="Therapist-recorded movement"
                >
                  <Icon name="plus" />
                  {customExercise.name}
                </button>
              )}
              <button
                type="button"
                className="picker__chip"
                onClick={() => onRecordCustomExercise(clonePrescription(draft))}
                title="Record one reference repetition with the camera"
              >
                <Icon name="record" />
                {customExercise ? "Record another custom exercise" : "Record custom exercise"}
              </button>
            </div>
          </div>

          {publishError && <p className="notice notice--error">{publishError}</p>}
          {missingCode && (
            <p className="notice">Set an access code so patients on other laptops can open this plan.</p>
          )}
          {!cloudEnabled && (
            <p className="notice">
              Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env to sync. Until then, use Copy
              patient link.
            </p>
          )}

          <div className="editor-actions">
            {stored.publishedAt && (
              <span className="label" style={{ marginRight: "auto", alignSelf: "center" }}>
                Published {formatDay(stored.publishedAt).toLowerCase()}
                {dirty ? " · unpublished changes" : ""}
                {cloudEnabled && stored.plan.accessCode && !dirty && justPublished
                  ? ` · clinic ${stored.plan.accessCode}`
                  : ""}
              </span>
            )}
            <button type="button" className="btn btn--outline" onClick={handleReset}>
              Reset
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => void handleCopyLink()}>
              {copyState === "copied" ? "Link copied" : copyState === "failed" ? "Copy failed" : "Copy patient link"}
            </button>
            <button type="button" className="btn btn--ghost" onClick={onPreviewAsPatient}>
              View as patient
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => void handlePublish()}
              disabled={
                publishing || draft.steps.length === 0 || missingCode || (!dirty && justPublished)
              }
            >
              {publishing ? "Publishing…" : justPublished && !dirty ? "Published" : "Publish"}
            </button>
          </div>
        </section>

        <aside className="studio__side">
          <section className="card" aria-label="Patient">
            <h2 className="section-title">This device</h2>
            {patient ? (
              <div className="row">
                <div>
                  <p className="row__title">{patient.name}</p>
                  <p className="row__sub">
                    {patient.sessions.length} sessions · {currentStreak(patient)}-day streak
                  </p>
                </div>
              </div>
            ) : (
              <p className="empty">
                <strong>No patient on this laptop</strong>
                Local preview sessions stay here. Clinic sessions appear below.
              </p>
            )}
          </section>

          {cloudEnabled && (
            <section className="card" aria-label="Clinic patients">
              <h2 className="section-title">Clinic patients</h2>
              {clinicSessions.length === 0 ? (
                <p className="empty">
                  <strong>Waiting for sessions</strong>
                  After a patient signs in with this access code and finishes a workout, it shows up
                  here.
                </p>
              ) : (
                <ul className="list">
                  {clinicSessions.slice(0, 8).map((session) => (
                    <li key={session.id} className="row row--leading">
                      <div className="ring-sm" style={{ width: 32, height: 32 }}>
                        <ProgressRing value={sessionCompletion(session)} thickness={0.14} />
                      </div>
                      <div>
                        <p className="row__title">
                          {session.patientName} · {formatDay(session.date)}
                        </p>
                        <p className="row__sub">
                          {sessionReps(session)}/{sessionTarget(session)} reps ·{" "}
                          {formatDuration(session.durationMs)}
                        </p>
                      </div>
                      <span className="row__end">{Math.round(sessionCompletion(session) * 100)}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {patient && recent.length > 0 && (
            <section className="card" aria-label="Recent sessions">
              <h2 className="section-title">Recent sessions</h2>
              <ul className="list">
                {recent.map((session) => (
                  <li key={session.id} className="row row--leading">
                    <div className="ring-sm" style={{ width: 32, height: 32 }}>
                      <ProgressRing value={sessionCompletion(session)} thickness={0.14} />
                    </div>
                    <div>
                      <p className="row__title">
                        {formatDay(session.date)} · {sessionReps(session)}/{sessionTarget(session)} reps
                      </p>
                      <p className="row__sub">
                        {formatDuration(session.durationMs)} ·{" "}
                        {session.steps
                          .map(
                            (step) =>
                              `${step.exerciseName ?? shortExerciseName(step.exerciseId)} ${step.reps}/${step.targetReps}`,
                          )
                          .join(", ")}
                      </p>
                    </div>
                    <span className="row__end">{Math.round(sessionCompletion(session) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card" aria-label="Current live plan">
            <h2 className="section-title">
              Live plan <small>{stored.plan.title}</small>
            </h2>
            <ol className="list">
              {stored.plan.steps.map((step, index) => (
                <li key={step.id} className="row row--indexed">
                  <span className="row__index">{index + 1}</span>
                  <span className="row__title">{planStepName(step)}</span>
                  <span className="row__end">{step.targetReps} reps</span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
