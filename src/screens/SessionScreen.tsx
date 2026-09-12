import CameraPanel from "../components/CameraPanel";
import ControlBar from "../components/ControlBar";
import FeedbackPanel from "../components/FeedbackPanel";
import GuidePanel from "../components/GuidePanel";
import RepCounterPanel from "../components/RepCounterPanel";
import { useExerciseSession } from "../hooks/useExerciseSession";

type Props = {
  onFinish: (reps: number, target: number) => void;
  onBack: () => void;
};

export default function SessionScreen({ onFinish, onBack }: Props) {
  const session = useExerciseSession();

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
          <h1>Bodyweight Squat</h1>
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
