import { useState } from "react";
import Brand from "../components/Brand";
import Icon from "../components/Icon";
import ProgressRing from "../components/ProgressRing";
import { exerciseGuides } from "../coaching/exerciseGuide";
import { formatDay, formatDuration, shortExerciseName } from "../content/exerciseMeta";
import { EXERCISES, exerciseName, isExerciseId, type ExerciseId } from "../exercises/exerciseCatalog";
import {
  clonePrescription,
  createPlanStep,
  type PlanStep,
  type Prescription,
} from "../exercises/prescription";
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
  patient: PatientProfile | null;
  onPublish: (plan: Prescription) => void;
  onResetToDefault: () => void;
  onBack: () => void;
  onPreviewAsPatient: () => void;
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
        step.targetReps === b.steps[index].targetReps,
    )
  );
}

export default function TherapistScreen({
  stored,
  patient,
  onPublish,
  onResetToDefault,
  onBack,
  onPreviewAsPatient,
}: Props) {
  const [draft, setDraft] = useState<Prescription>(() => clonePrescription(stored.plan));
  const [justPublished, setJustPublished] = useState(false);
  const dirty = !samePlan(draft, stored.plan);

  function patchStep(id: string, patch: Partial<PlanStep>) {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step) => (step.id === id ? { ...step, ...patch } : step)),
    }));
    setJustPublished(false);
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
    setJustPublished(false);
  }

  function removeStep(id: string) {
    setDraft((current) => ({ ...current, steps: current.steps.filter((step) => step.id !== id) }));
    setJustPublished(false);
  }

  function addStep(exerciseId: ExerciseId) {
    setDraft((current) => ({ ...current, steps: [...current.steps, createPlanStep(exerciseId)] }));
    setJustPublished(false);
  }

  function handlePublish() {
    onPublish(draft);
    setJustPublished(true);
  }

  const recent = patient ? [...patient.sessions].reverse().slice(0, 6) : [];

  return (
    <div className="screen studio">
      <div className="screen__top">
        <button type="button" className="back-link" onClick={onBack}>
          <Icon name="back" />
          Switch role
        </button>
        <Brand />
      </div>

      <header className="page__header">
        <p className="eyebrow">Therapist studio</p>
        <h1>Prescribe the session</h1>
        <p className="lede">
          Patients follow this list in order and can't skip ahead. Publish to hand it over.
        </p>
      </header>

      <div className="studio__grid">
        <section className="card" aria-label="Plan editor">
          <div className="editor-meta">
            <label className="field">
              <span>Session title</span>
              <input
                value={draft.title}
                placeholder="Today's session"
                onChange={(event) => {
                  setDraft((current) => ({ ...current, title: event.target.value }));
                  setJustPublished(false);
                }}
              />
            </label>
            <label className="field">
              <span>Your name</span>
              <input
                value={draft.therapist}
                placeholder="Dr. Mehta"
                onChange={(event) => {
                  setDraft((current) => ({ ...current, therapist: event.target.value }));
                  setJustPublished(false);
                }}
              />
            </label>
          </div>

          <div className="card__row">
            <p className="card__title">Exercises in order</p>
            <span className="chip">
              {draft.steps.length} · {totalPrescribedReps(draft)} reps
            </span>
          </div>

          {draft.steps.length === 0 ? (
            <div className="empty">
              <strong>No exercises yet</strong>
              <span>Add at least one from the list below before publishing.</span>
            </div>
          ) : (
            <ol className="editor-steps">
              {draft.steps.map((step, index) => (
                <li key={step.id} className="editor-step">
                  <span className="index-bubble">{index + 1}</span>

                  <label className="field">
                    <span className="sr-only">Exercise {index + 1}</span>
                    <select
                      value={step.exerciseId}
                      onChange={(event) => {
                        if (isExerciseId(event.currentTarget.value)) {
                          patchStep(step.id, { exerciseId: event.currentTarget.value });
                        }
                      }}
                    >
                      {EXERCISES.map((exercise) => (
                        <option key={exercise.id} value={exercise.id}>
                          {exercise.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="stepper" role="group" aria-label={`Reps for ${exerciseName(step.exerciseId)}`}>
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
            <p className="card__title" style={{ marginBottom: 8 }}>
              Add an exercise
            </p>
            <div className="picker">
              {EXERCISES.map((exercise) => (
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
            </div>
          </div>

          <div className="editor-actions">
            <button type="button" className="btn btn--outline" onClick={onResetToDefault}>
              Reset to default
            </button>
            <button type="button" className="btn btn--ghost" onClick={onPreviewAsPatient}>
              Preview as patient
            </button>
            <button
              type="button"
              className="btn btn--glow"
              onClick={handlePublish}
              disabled={draft.steps.length === 0 || (!dirty && justPublished)}
            >
              <Icon name="check" width={16} height={16} />
              {justPublished && !dirty ? "Published" : "Publish to patient"}
            </button>
          </div>

          {stored.publishedAt && (
            <p className="muted" style={{ fontSize: "0.78rem", textAlign: "right" }}>
              Last published {formatDay(stored.publishedAt).toLowerCase()}
              {dirty ? " · unpublished changes" : ""}
            </p>
          )}
        </section>

        <aside className="studio__side">
          <section className="card card--tight" aria-label="Patient">
            <p className="card__title">Patient</p>
            {patient ? (
              <>
                <div className="card__row">
                  <div>
                    <p style={{ fontWeight: 800 }}>{patient.name}</p>
                    <p className="muted" style={{ fontSize: "0.8rem" }}>
                      {patient.sessions.length} sessions · {currentStreak(patient)}-day streak
                    </p>
                  </div>
                  <span className="chip chip--accent">Active</span>
                </div>
              </>
            ) : (
              <div className="empty">
                <strong>No patient on this device</strong>
                <span>Once someone signs in as a patient, their sessions appear here.</span>
              </div>
            )}
          </section>

          {patient && (
            <section className="card card--tight" aria-label="Recent sessions">
              <div className="card__row">
                <p className="card__title">Recent sessions</p>
                <span className="muted" style={{ fontSize: "0.76rem" }}>
                  latest {recent.length}
                </span>
              </div>
              {recent.length === 0 ? (
                <div className="empty">
                  <strong>Nothing completed yet</strong>
                </div>
              ) : (
                <ul className="activity">
                  {recent.map((session) => (
                    <li key={session.id} className="activity__row">
                      <div className="activity__ring">
                        <ProgressRing value={sessionCompletion(session)} thickness={0.14} />
                      </div>
                      <div>
                        <p className="activity__title">
                          {formatDay(session.date)} · {sessionReps(session)}/{sessionTarget(session)}{" "}
                          reps
                        </p>
                        <p className="activity__meta">
                          {formatDuration(session.durationMs)} ·{" "}
                          {session.steps
                            .map((step) => `${shortExerciseName(step.exerciseId)} ${step.reps}/${step.targetReps}`)
                            .join(" · ")}
                        </p>
                      </div>
                      <span
                        className={`chip${sessionCompletion(session) >= 1 ? " chip--accent" : sessionCompletion(session) < 0.5 ? " chip--warn" : ""}`}
                      >
                        {Math.round(sessionCompletion(session) * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="card card--tight" aria-label="Current live plan">
            <p className="card__title">Live plan</p>
            <p style={{ fontWeight: 800 }}>{stored.plan.title}</p>
            <ol className="plan-steps">
              {stored.plan.steps.map((step, index) => (
                <li key={step.id} className="plan-step">
                  <span className="index-bubble">{index + 1}</span>
                  <span className="plan-step__name">{exerciseName(step.exerciseId)}</span>
                  <span className="plan-step__reps">×{step.targetReps}</span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
