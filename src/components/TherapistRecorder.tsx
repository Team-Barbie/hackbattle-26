import { useEffect } from "react";
import { createPlanStep, type Prescription } from "../exercises/prescription";
import { useExerciseSession } from "../hooks/useExerciseSession";
import CameraStage from "./session/CameraStage";
import Readouts from "./session/Readouts";
import SessionControls from "./session/SessionControls";

const RECORDING_PLAN: Prescription = {
  therapist: "Therapist",
  title: "Record custom exercise",
  steps: [createPlanStep("custom", 1)],
};

type Props = {
  onClose: () => void;
  onPublished: () => void;
};

export default function TherapistRecorder({ onClose, onPublished }: Props) {
  const session = useExerciseSession({ plan: RECORDING_PLAN });

  useEffect(() => () => session.stopCamera(), [session.stopCamera]);

  function handleClose() {
    session.stopCamera();
    onClose();
  }

  return (
    <section className="card therapist-recorder" aria-label="Record a custom exercise">
      <div className="therapist-recorder__header">
        <div>
          <p className="label">Custom exercise</p>
          <h2>Record, name, then publish</h2>
          <p className="lede">
            Demonstrate one complete repetition. The exercise stays private until you name and
            publish it.
          </p>
        </div>
        <button type="button" className="btn btn--outline btn--sm" onClick={handleClose}>
          Close recorder
        </button>
      </div>

      <div className="therapist-recorder__grid">
        <CameraStage session={session} />
        <aside className="therapist-recorder__rail">
          <Readouts session={session} />
          <SessionControls
            session={session}
            onRestartPlan={session.restartPlan}
            canManageReference
            onReferencePublished={onPublished}
          />
        </aside>
      </div>
    </section>
  );
}
