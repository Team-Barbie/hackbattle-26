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

  function touch() {
    setJustPublished(false);
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
    setDraft((current) => ({ ...current, steps: [...current.steps, createPlanStep(exerciseId)] }));
    touch();
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
          Sign out
        </button>
        <Brand />
      </div>

      <header className="page__header">
        <h1>Exercise plan</h1>
        <p className="lede">Patients complete these in order. Publish to update what they see.</p>
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
            <p className="label" style={{ marginBottom: 8 }}>
              Add exercise
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
            {stored.publishedAt && (
              <span className="label" style={{ marginRight: "auto", alignSelf: "center" }}>
                Published {formatDay(stored.publishedAt).toLowerCase()}
                {dirty ? " · unpublished changes" : ""}
              </span>
            )}
            <button type="button" className="btn btn--outline" onClick={onResetToDefault}>
              Reset
            </button>
            <button type="button" className="btn btn--ghost" onClick={onPreviewAsPatient}>
              View as patient
            </button>
            <button
              type="button"
              className="btn"
              onClick={handlePublish}
              disabled={draft.steps.length === 0 || (!dirty && justPublished)}
            >
              {justPublished && !dirty ? "Published" : "Publish"}
            </button>
          </div>
        </section>

        <aside className="studio__side">
          <section className="card" aria-label="Patient">
            <h2 className="section-title">Patient</h2>
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
                <strong>No patient on this device</strong>
                Sessions appear here once someone signs in as a patient.
              </p>
            )}
          </section>

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
                          .map((step) => `${shortExerciseName(step.exerciseId)} ${step.reps}/${step.targetReps}`)
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
                  <span className="row__title">{exerciseName(step.exerciseId)}</span>
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
