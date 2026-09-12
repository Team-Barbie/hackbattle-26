import CameraPanel from "./components/CameraPanel";
import ControlBar from "./components/ControlBar";
import FeedbackPanel from "./components/FeedbackPanel";
import GuidePanel from "./components/GuidePanel";
import RepCounterPanel from "./components/RepCounterPanel";
import { useSquatSession } from "./hooks/useSquatSession";

export default function App() {
  const session = useSquatSession();

  return (
    <div className="app">
      <header className="app-header">
        <p className="app-eyebrow">HackBattle 26</p>
        <h1>Form Coach</h1>
      </header>

      <main className="stage">
        <CameraPanel session={session} />
        <RepCounterPanel session={session} />
        <GuidePanel />
        <FeedbackPanel session={session} />
        <ControlBar session={session} />
      </main>
    </div>
  );
}
