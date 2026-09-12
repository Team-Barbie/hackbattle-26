import { useState } from "react";
import CameraPanel from "./components/CameraPanel";
import ControlBar from "./components/ControlBar";
import FeedbackPanel from "./components/FeedbackPanel";
import GuidePanel from "./components/GuidePanel";
import PlanEditor from "./components/PlanEditor";
import PrescriptionList from "./components/PrescriptionList";
import RepCounterPanel from "./components/RepCounterPanel";
import { useExerciseSession } from "./hooks/useExerciseSession";

export default function App() {
  const session = useExerciseSession();
  const [role, setRole] = useState<"patient" | "therapist">("patient");

  return (
    <div className="app">
      <header className="app-header">
        <p className="app-eyebrow">HackBattle 26</p>
        <div className="app-title-row">
          <h1>PhysioLoop</h1>
          <div className="role-switch" role="group" aria-label="View">
            <button
              type="button"
              className={role === "patient" ? "is-selected" : ""}
              aria-pressed={role === "patient"}
              onClick={() => setRole("patient")}
            >
              Patient
            </button>
            <button
              type="button"
              className={role === "therapist" ? "is-selected" : ""}
              aria-pressed={role === "therapist"}
              onClick={() => setRole("therapist")}
            >
              Therapist
            </button>
          </div>
        </div>
        {role === "therapist" ? (
          <PlanEditor session={session} onStartSession={() => setRole("patient")} />
        ) : (
          <PrescriptionList session={session} />
        )}
      </header>

      {role === "patient" && (
        <main className="stage">
          <CameraPanel session={session} />
          <RepCounterPanel session={session} />
          <GuidePanel session={session} />
          <FeedbackPanel session={session} />
          <ControlBar session={session} />
        </main>
      )}
    </div>
  );
}
