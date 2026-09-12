import { useState } from "react";
import { READINESS_LABELS } from "../state/patientProfile";

type Props = {
  onContinue: (readiness: number | null) => void;
  onBack: () => void;
};

export default function ReadinessScreen({ onContinue, onBack }: Props) {
  const [readiness, setReadiness] = useState<number | null>(null);

  return (
    <div className="auth-shell">
      <button type="button" className="back-link" onClick={onBack}>
        ← Back
      </button>

      <div className="auth-copy">
        <p className="app-eyebrow">Before you start</p>
        <h1>How's it feeling today?</h1>
        <p className="auth-subtitle">This gets saved with today's session.</p>
      </div>

      <div className="readiness-row">
        {READINESS_LABELS.map((label, index) => (
          <button
            type="button"
            key={label}
            className={`readiness-pip${readiness === index ? " is-selected" : ""}`}
            onClick={() => setReadiness(index)}
            aria-pressed={readiness === index}
          >
            {label}
          </button>
        ))}
      </div>

      <button type="button" className="block" onClick={() => onContinue(readiness)}>
        Continue
      </button>
      <button type="button" className="back-link" onClick={() => onContinue(null)}>
        Skip
      </button>
    </div>
  );
}
