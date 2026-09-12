import ExerciseDemo from "../components/ExerciseDemo";
import { exerciseGuides } from "../coaching/exerciseGuide";
import type { ExerciseId } from "../exercises/exerciseCatalog";

type Props = {
  exerciseId: ExerciseId;
  onBack: () => void;
  onStartSession: () => void;
};

export default function ExerciseDetailScreen({ exerciseId, onBack, onStartSession }: Props) {
  const guide = exerciseGuides[exerciseId];

  return (
    <div className="page">
      <button type="button" className="back-link" onClick={onBack}>
        ← Program
      </button>

      <header className="page-header">
        <p className="app-eyebrow">Exercise</p>
        <h1>{guide.name}</h1>
        <p className="auth-subtitle">{guide.summary}</p>
      </header>

      {exerciseId === "squat" && <ExerciseDemo />}

      <section className="panel">
        <p className="panel-title">How to do it</p>
        <ol className="guide-steps">
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="guide-tip">{guide.cameraTip}</p>
      </section>

      <button type="button" className="block" onClick={onStartSession}>
        Start session
      </button>
    </div>
  );
}
