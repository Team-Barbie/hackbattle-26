import ExerciseDemo from "../components/ExerciseDemo";
import Icon from "../components/Icon";
import { exerciseArea, exerciseFraming } from "../content/exerciseMeta";
import { guideForExercise } from "../coaching/exerciseGuide";
import type { ExerciseId } from "../exercises/exerciseCatalog";
import { motionProfileFor, type ReferenceExercise } from "../exercises/custom/referenceExercise";
import { planStepName, type Prescription } from "../exercises/prescription";

type Props = {
  exerciseId: ExerciseId;
  plan: Prescription;
  onBack: () => void;
  onStartSession: () => void;
  onPractice: (exerciseId: ExerciseId, referenceExercise?: ReferenceExercise) => void;
  referenceExercise?: ReferenceExercise;
};

export default function ExerciseDetailScreen({
  exerciseId,
  plan,
  onBack,
  onStartSession,
  onPractice,
  referenceExercise,
}: Props) {
  const guide = guideForExercise(exerciseId, referenceExercise);
  const step = plan.steps.find((item) =>
    exerciseId === "custom"
      ? Boolean(item.referenceExercise && referenceExercise) &&
        (item.referenceExercise?.id && referenceExercise?.id
          ? item.referenceExercise.id === referenceExercise.id
          : item.referenceExercise?.recordedAt === referenceExercise?.recordedAt)
      : item.exerciseId === exerciseId,
  );
  const position = step ? plan.steps.indexOf(step) + 1 : null;
  const motionProfile = referenceExercise ? motionProfileFor(referenceExercise) : null;

  return (
    <div className="screen page">
      <div className="screen__top">
        <button type="button" className="back-link" onClick={onBack}>
          <Icon name="back" />
          Program
        </button>
        <div style={{ display: "flex", gap: 6 }}>
          <span className="chip chip--outline">{exerciseArea(exerciseId)}</span>
          <span className="chip chip--outline">{exerciseFraming(exerciseId)}</span>
        </div>
      </div>

      <header className="page__header">
        <p className="eyebrow">
          {position ? `Exercise ${position} of ${plan.steps.length}` : "From the library"}
        </p>
        <h1>{step ? planStepName(step) : guide.name}</h1>
        <p className="lede">{guide.summary}</p>
      </header>

      <ExerciseDemo exerciseId={exerciseId} label={exerciseFraming(exerciseId)} reference={referenceExercise} />

      {motionProfile && (
        <section className="card">
          <p className="card__title">Movement detected</p>
          <p className="lede">{motionProfile.summary}</p>
          <div className="readouts" style={{ marginTop: 16 }}>
            {[motionProfile.primary, ...motionProfile.supporting].map((motion) => (
              <dl key={motion.key} className="readout">
                <dt>{motion.label}</dt>
                <dd>{motion.minDegrees}–{motion.maxDegrees}°</dd>
              </dl>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <p className="card__title">How to do it</p>
        <ol className="guide-steps">
          {guide.steps.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
        <p className="tip">
          <Icon name="camera" />
          <span>{guide.cameraTip}</span>
        </p>
      </section>

      <div className="detail-actions">
        <button
          type="button"
          className="btn btn--ghost btn--lg"
          onClick={() => onPractice(exerciseId, referenceExercise)}
        >
          Practice only this
        </button>
        <button type="button" className="btn btn--lg btn--glow" onClick={onStartSession}>
          <Icon name="play" solid width={18} height={18} />
          {step ? "Start session" : "Start today's plan"}
        </button>
      </div>
    </div>
  );
}
