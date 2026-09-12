import { useEffect } from "react";
import CameraPanel from "../components/CameraPanel";
import ControlBar from "../components/ControlBar";
import FeedbackPanel from "../components/FeedbackPanel";
import GuidePanel from "../components/GuidePanel";
import RepCounterPanel from "../components/RepCounterPanel";
import { exerciseName, type ExerciseId } from "../exercises/exerciseCatalog";
import { createPlanStep, DEFAULT_PRESCRIPTION } from "../exercises/prescription";
import { useExerciseSession } from "../hooks/useExerciseSession";

type Props = {
  /** A specific exercise from Program, or null to run today's full prescribed plan from Home. */
  exerciseId: ExerciseId | null;
  onFinish: (reps: number, target: number) => void;
  onBack: () => void;
};

export default function SessionScreen({ exerciseId, onFinish, onBack }: Props) {
  const session = useExerciseSession();
  const { loadPrescription } = session;

  useEffect(() => {
    if (exerciseId) {
      loadPrescription({
        therapist: "",
        title: exerciseName(exerciseId),
        steps: [createPlanStep(exerciseId, 10)],
      });
    } else {
      loadPrescription(DEFAULT_PRESCRIPTION);
    }
    // Only reload when the requested exercise changes, not on every session tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseId]);

  function handleBack() {
    session.stopCamera();
    onBack();
  }

  function handleFinish() {
    session.stopCamera();
    onFinish(session.reps, session.targetReps);
  }

  return (
    <div className="app">
      <header className="app-header session-header">
        <button type="button" className="back-link" onClick={handleBack}>
          ← Dashboard
        </button>
        <div>
          <p className="app-eyebrow">Session</p>
          <h1>{exerciseId ? exerciseName(exerciseId) : DEFAULT_PRESCRIPTION.title}</h1>
        </div>
      </header>

      <main className="stage">
        <CameraPanel session={session} />
        <RepCounterPanel session={session} />
        <GuidePanel session={session} />
        <FeedbackPanel session={session} />
        <ControlBar session={session} />
      </main>

      <button type="button" className="block finish-session" onClick={handleFinish}>
        Finish session
      </button>
    </div>
  );
}
