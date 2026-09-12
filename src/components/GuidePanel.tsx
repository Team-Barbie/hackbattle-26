import { exerciseGuides } from "../coaching/exerciseGuide";
import type { ExerciseSession } from "../hooks/useExerciseSession";

export default function GuidePanel({ session }: { session: ExerciseSession }) {
  const guide = exerciseGuides[session.exerciseId];

  return (
    <section className="panel guide-panel" aria-label="Exercise instructions">
      <h2 className="panel-title">How to do it</h2>
      <p className="guide-name">{guide.name}</p>
      <p className="guide-summary">{guide.summary}</p>

      <ol className="guide-steps">
        {guide.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <p className="guide-tip">{guide.cameraTip}</p>
    </section>
  );
}
