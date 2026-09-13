import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "../components/Icon";
import CameraStage from "../components/session/CameraStage";
import Readouts from "../components/session/Readouts";
import RepDial from "../components/session/RepDial";
import SessionControls from "../components/session/SessionControls";
import StepRail from "../components/session/StepRail";
import type { Prescription } from "../exercises/prescription";
import type { ReferenceExercise } from "../exercises/custom/referenceExercise";
import { useExerciseSession } from "../hooks/useExerciseSession";
import type { StepResult } from "../state/patientProfile";

export type SessionOutcome = {
  steps: StepResult[];
  durationMs: number;
  earlyExitReason: string | null;
};

export const PAIN_DISCOMFORT_REASON = "Pain or discomfort";

const EARLY_EXIT_REASONS = [
  PAIN_DISCOMFORT_REASON,
  "Ran out of time",
  "Feeling tired",
  "Technical issue",
];

type Props = {
  plan: Prescription;
  onFinish: (outcome: SessionOutcome) => void;
  onExit: () => void;
  referenceAuthoring?: boolean;
  onReferenceSaved?: (reference: ReferenceExercise) => void | Promise<void>;
};

type BankedStep = StepResult;

export default function SessionScreen({
  plan,
  onFinish,
  onExit,
  referenceAuthoring = false,
  onReferenceSaved,
}: Props) {
  const session = useExerciseSession({ plan });
  const startedAtRef = useRef(performance.now());
  const [repsByStep, setRepsByStep] = useState<BankedStep[]>([]);
  const [leavePrompt, setLeavePrompt] = useState(false);
  const [reasonPrompt, setReasonPrompt] = useState(false);

  useEffect(() => {
    setRepsByStep((current) => {
      const nextEntry: BankedStep = {
        exerciseId: session.exerciseId,
        exerciseName: session.currentStep?.referenceExercise?.name,
        targetReps: session.targetReps,
        reps: session.reps,
        goodReps: session.goodReps,
        flaggedReps: session.flaggedReps,
        mainIssue: session.mainIssue,
      };
      const previous = current[session.stepIndex];

      if (
        previous &&
        previous.reps === nextEntry.reps &&
        previous.goodReps === nextEntry.goodReps &&
        previous.flaggedReps === nextEntry.flaggedReps &&
        previous.mainIssue === nextEntry.mainIssue
      ) {
        return current;
      }

      const next = [...current];
      next[session.stepIndex] = nextEntry;
      return next;
    });
  }, [
    session.exerciseId,
    session.flaggedReps,
    session.goodReps,
    session.mainIssue,
    session.reps,
    session.stepIndex,
    session.targetReps,
  ]);

  const handleRestart = useCallback(() => {
    setRepsByStep([]);
    session.restartPlan();
  }, [session]);

  const buildOutcome = useCallback(
    (earlyExitReason: string | null = null): SessionOutcome => ({
      steps: session.plan.steps.map((step, index) => {
        const banked = repsByStep[index];
        const reps = Math.min(step.targetReps, banked?.reps ?? 0);

        return {
          exerciseId: step.exerciseId,
          exerciseName: step.referenceExercise?.name,
          targetReps: step.targetReps,
          reps,
          goodReps: Math.min(reps, banked?.goodReps ?? 0),
          flaggedReps: Math.min(reps, banked?.flaggedReps ?? 0),
          mainIssue: banked?.mainIssue ?? null,
        };
      }),
      durationMs: performance.now() - startedAtRef.current,
      earlyExitReason,
    }),
    [repsByStep, session.plan.steps],
  );

  const hasProgress =
    session.reps > 0 || session.planComplete || repsByStep.some((step) => (step?.reps ?? 0) > 0);

  function leaveWithoutSaving() {
    session.stopCamera();
    onExit();
  }

  function handleExit() {
    if (referenceAuthoring) {
      leaveWithoutSaving();
      return;
    }

    if (hasProgress) {
      setLeavePrompt(true);
      return;
    }

    leaveWithoutSaving();
  }

  function handleFinish(earlyExitReason: string | null = null) {
    session.stopCamera();
    onFinish(buildOutcome(earlyExitReason));
  }

  const { planComplete } = session;

  function requestFinish() {
    if (planComplete) {
      handleFinish();
      return;
    }

    setLeavePrompt(false);
    setReasonPrompt(true);
  }

  const bankedReps = repsByStep.reduce((total, step) => total + (step?.reps ?? 0), 0);

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
          <StepRail session={session} repsByStep={repsByStep.map((step) => step?.reps ?? 0)} />
          <Readouts session={session} />
          <SessionControls
            session={session}
            onRestartPlan={handleRestart}
            className="card--span"
            allowReferenceAuthoring={referenceAuthoring}
            onReferenceSaved={async (reference) => {
              await onReferenceSaved?.(reference);
              session.stopCamera();
            }}
          />
        </aside>
      </div>

      <footer className="session__footer">
        {referenceAuthoring ? (
          <>
            <div className="session__footer-copy">
              <strong>Therapist exercise studio</strong>
              <span>Record one full repetition, stop, then name it to add it to the plan picker.</span>
            </div>
            <button type="button" className="btn btn--ghost" onClick={handleExit}>
              Back to plan
            </button>
          </>
        ) : leavePrompt ? (
          <>
            <div className="session__footer-copy">
              <strong>Leave this session?</strong>
              <span>Save what you’ve done, or discard it.</span>
            </div>
            <div className="session__footer-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setLeavePrompt(false)}>
                Stay
              </button>
              <button type="button" className="btn btn--outline" onClick={leaveWithoutSaving}>
                Discard
              </button>
              <button type="button" className="btn" onClick={requestFinish}>
                Save and leave
              </button>
            </div>
          </>
        ) : reasonPrompt ? (
          <>
            <div className="session__footer-copy">
              <strong>Why are you stopping early?</strong>
              <span>This gets saved with your session so your therapist has the context.</span>
            </div>
            <div className="session__footer-actions">
              {EARLY_EXIT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  className="btn btn--outline"
                  onClick={() => handleFinish(reason)}
                >
                  {reason}
                </button>
              ))}
              <button type="button" className="btn btn--ghost" onClick={() => handleFinish()}>
                Skip
              </button>
            </div>
          </>
        ) : (
          <>
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
              onClick={requestFinish}
            >
              {planComplete ? "Finish session" : "Finish early"}
            </button>
          </>
        )}
      </footer>
    </div>
  );
}
