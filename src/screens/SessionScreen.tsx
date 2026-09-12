import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "../components/Icon";
import CameraStage from "../components/session/CameraStage";
import Readouts from "../components/session/Readouts";
import RepDial from "../components/session/RepDial";
import SessionControls from "../components/session/SessionControls";
import StepRail from "../components/session/StepRail";
import type { Prescription } from "../exercises/prescription";
import { useExerciseSession } from "../hooks/useExerciseSession";
import type { StepResult } from "../state/patientProfile";

export type SessionOutcome = {
  steps: StepResult[];
  durationMs: number;
};

type Props = {
  plan: Prescription;
  onFinish: (outcome: SessionOutcome) => void;
  onExit: () => void;
};

export default function SessionScreen({ plan, onFinish, onExit }: Props) {
  const session = useExerciseSession({ plan });
  const startedAtRef = useRef(performance.now());
  const [repsByStep, setRepsByStep] = useState<number[]>([]);

  // Bank the live rep count against the step it belongs to. The engine resets
  // `reps` to 0 when it advances, so earlier entries keep their final value.
  useEffect(() => {
    setRepsByStep((current) => {
      if (current[session.stepIndex] === session.reps) {
        return current;
      }

      const next = [...current];
      next[session.stepIndex] = session.reps;
      return next;
    });
  }, [session.reps, session.stepIndex]);

  const handleRestart = useCallback(() => {
    setRepsByStep([]);
    session.restartPlan();
  }, [session]);

  const buildOutcome = useCallback(
    (): SessionOutcome => ({
      steps: session.plan.steps.map((step, index) => ({
        exerciseId: step.exerciseId,
        targetReps: step.targetReps,
        reps: Math.min(step.targetReps, repsByStep[index] ?? 0),
      })),
      durationMs: performance.now() - startedAtRef.current,
    }),
    [repsByStep, session.plan.steps],
  );

  function handleExit() {
    session.stopCamera();
    onExit();
  }

  function handleFinish() {
    session.stopCamera();
    onFinish(buildOutcome());
  }

  const bankedReps = repsByStep.reduce((total, reps) => total + (reps ?? 0), 0);
  const { planComplete } = session;

  return (
    <div className="session">
      <header className="session__top">
        <div>
          <button type="button" className="back-link" onClick={handleExit}>
            <Icon name="back" />
            Leave
          </button>
        </div>
        <div className="session__title">
          <h1>{session.plan.title}</h1>
          <p>
            {planComplete
              ? "All exercises complete"
              : `Exercise ${session.stepIndex + 1} of ${session.plan.steps.length}`}
          </p>
        </div>
        <div>
          <span className="label">{session.isLive ? "Camera on" : "Camera off"}</span>
        </div>
      </header>

      <div className="session__grid">
        <CameraStage session={session} />

        <aside className="session__rail">
          <RepDial session={session} />
          <StepRail session={session} repsByStep={repsByStep} />
          <Readouts session={session} />
          <SessionControls session={session} onRestartPlan={handleRestart} className="card--span" />
        </aside>
      </div>

      <footer className="session__footer">
        <div className="session__footer-copy">
          <strong>{planComplete ? "All exercises complete" : `${bankedReps} reps so far`}</strong>
          <span>
            {planComplete
              ? "Finish to save this session."
              : "Finishing early saves what you've done."}
          </span>
        </div>
        <button
          type="button"
          className={`btn btn--lg${planComplete ? "" : " btn--ghost"}`}
          onClick={handleFinish}
        >
          {planComplete ? "Finish session" : "Finish early"}
        </button>
      </footer>
    </div>
  );
}
