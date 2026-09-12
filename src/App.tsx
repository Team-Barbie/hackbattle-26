import CameraPanel from "./components/CameraPanel";
import ControlBar from "./components/ControlBar";
import FeedbackPanel from "./components/FeedbackPanel";
import GuidePanel from "./components/GuidePanel";
import RepCounterPanel from "./components/RepCounterPanel";
import { useExerciseSession } from "./hooks/useExerciseSession";

export default function App() {
  const session = useExerciseSession();

  return (
    <div className="app">
      <header className="app-header">
        <p className="app-eyebrow">HackBattle 26</p>
        <h1>PhysioLoop</h1>
      </header>

      <main className="stage">
        <CameraPanel session={session} />
        <RepCounterPanel session={session} />
        <GuidePanel session={session} />
        <FeedbackPanel session={session} />
        <ControlBar session={session} />
      </main>
    </div>
  );
}
