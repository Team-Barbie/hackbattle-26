import ExerciseDemo from "../components/ExerciseDemo";
import Icon from "../components/Icon";
import { exerciseArea, exerciseFraming } from "../content/exerciseMeta";
import { exerciseGuides } from "../coaching/exerciseGuide";
import type { ExerciseId } from "../exercises/exerciseCatalog";
import type { Prescription } from "../exercises/prescription";

type Props = {
  exerciseId: ExerciseId;
  plan: Prescription;
  onBack: () => void;
  onStartSession: () => void;
  onPractice: (exerciseId: ExerciseId) => void;
};

export default function ExerciseDetailScreen({
  exerciseId,
  plan,
  onBack,
  onStartSession,
  onPractice,
}: Props) {
  const guide = exerciseGuides[exerciseId];
  const step = plan.steps.find((item) => item.exerciseId === exerciseId);
  const position = step ? plan.steps.indexOf(step) + 1 : null;

  return (
    <div className="screen page">
      <div className="screen__top">
        <button type="button" className="back-link" onClick={onBack}>
          <Icon name="back" />
          Program
        </button>
      </div>

      <header className="page__header">
        <h1>{guide.name}</h1>
        <p className="label">
          {position ? `Exercise ${position} of ${plan.steps.length} · ${step?.targetReps} reps` : "Not in your plan"}
          {" · "}
          {exerciseArea(exerciseId)} · {exerciseFraming(exerciseId).toLowerCase()}
        </p>
        <p className="lede">{guide.summary}</p>
      </header>

      <ExerciseDemo exerciseId={exerciseId} label={exerciseFraming(exerciseId)} />

      <section className="card">
        <h2 className="section-title">How to do it</h2>
        <ol className="guide-steps">
          {guide.steps.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
        <p className="tip">
          <strong>Camera:</strong> {guide.cameraTip}
        </p>
      </section>

      <div className="detail-actions">
        <button type="button" className="btn btn--ghost btn--lg" onClick={() => onPractice(exerciseId)}>
          Practice this only
        </button>
        <button type="button" className="btn btn--lg" onClick={onStartSession}>
          <Icon name="play" solid width={16} height={16} />
          Start session
        </button>
      </div>
    </div>
  );
}
