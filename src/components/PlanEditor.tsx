import { useState } from "react";
import { EXERCISES, isExerciseId } from "../exercises/exerciseCatalog";
import {
  clonePrescription,
  createPlanStep,
  type Prescription,
} from "../exercises/prescription";
import type { ExerciseSession } from "../hooks/useExerciseSession";

export default function PlanEditor({
  session,
  onStartSession,
}: {
  session: ExerciseSession;
  onStartSession: () => void;
}) {
  const [draft, setDraft] = useState<Prescription>(() => clonePrescription(session.plan));

  const updateStep = (id: string, patch: Partial<(typeof draft.steps)[number]>) => {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step) => (step.id === id ? { ...step, ...patch } : step)),
    }));
  };

  return (
    <section className="plan-editor" aria-label="Write a prescription">
      <div className="plan-heading">
        <p className="plan-kicker">Therapist</p>
        <h2>Prescribe today’s session</h2>
        <p className="plan-progress">Patients follow this list in order. They cannot skip ahead.</p>
      </div>

      <label className="plan-field">
        <span>Your name</span>
        <input
          value={draft.therapist}
          onChange={(event) => setDraft((current) => ({ ...current, therapist: event.target.value }))}
        />
      </label>

      <label className="plan-field">
        <span>Session title</span>
        <input
          value={draft.title}
          onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
        />
      </label>

      <ol className="plan-draft">
        {draft.steps.map((step, index) => (
          <li key={step.id} className="plan-draft-row">
            <span className="plan-index">{index + 1}</span>
            <select
              value={step.exerciseId}
              aria-label={`Exercise ${index + 1}`}
              onChange={(event) => {
                if (isExerciseId(event.currentTarget.value)) {
                  updateStep(step.id, { exerciseId: event.currentTarget.value });
                }
              }}
            >
              {EXERCISES.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
            <label className="plan-reps-field">
              <span>Reps</span>
              <input
                type="number"
                min={1}
                max={50}
                value={step.targetReps}
                onChange={(event) =>
                  updateStep(step.id, {
                    targetReps: Math.min(50, Math.max(1, Number(event.currentTarget.value) || 1)),
                  })
                }
              />
            </label>
            <button
              type="button"
              className="secondary"
              disabled={draft.steps.length <= 1}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  steps: current.steps.filter((item) => item.id !== step.id),
                }))
              }
            >
              Remove
            </button>
          </li>
        ))}
      </ol>

      <div className="plan-editor-actions">
        <button
          type="button"
          className="secondary"
          onClick={() => setDraft((current) => ({ ...current, steps: [...current.steps, createPlanStep()] }))}
        >
          Add exercise
        </button>
        <button
          type="button"
          onClick={() => {
            session.loadPrescription({
              ...draft,
              therapist: draft.therapist.trim() || "Therapist",
              title: draft.title.trim() || "Today's session",
              steps: draft.steps.length > 0 ? draft.steps : [createPlanStep()],
            });
            onStartSession();
          }}
        >
          Give to patient
        </button>
      </div>
    </section>
  );
}
