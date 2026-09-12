import { squatGuide } from "../coaching/exerciseGuide";

export default function GuidePanel() {
  return (
    <section className="panel guide-panel" aria-label="Exercise instructions">
      <h2 className="panel-title">How to do it</h2>
      <p className="guide-name">{squatGuide.name}</p>
      <p className="guide-summary">{squatGuide.summary}</p>

      <ol className="guide-steps">
        {squatGuide.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <p className="guide-tip">{squatGuide.cameraTip}</p>
    </section>
  );
}
