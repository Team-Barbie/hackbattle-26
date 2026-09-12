import ExerciseDemo from "../components/ExerciseDemo";
import { squatGuide } from "../coaching/exerciseGuide";

type Props = {
  onBack: () => void;
  onStartSession: () => void;
};

export default function ExerciseDetailScreen({ onBack, onStartSession }: Props) {
  return (
    <div className="page">
      <button type="button" className="back-link" onClick={onBack}>
        ← Program
      </button>

      <header className="page-header">
        <p className="app-eyebrow">Exercise</p>
        <h1>{squatGuide.name}</h1>
        <p className="auth-subtitle">{squatGuide.summary}</p>
      </header>

      <ExerciseDemo />

      <section className="panel">
        <p className="panel-title">How to do it</p>
        <ol className="guide-steps">
          {squatGuide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="guide-tip">{squatGuide.cameraTip}</p>
      </section>

      <button type="button" className="block" onClick={onStartSession}>
        Start session
      </button>
    </div>
  );
}
