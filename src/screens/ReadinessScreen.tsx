import { useState } from "react";
import Icon from "../components/Icon";
import type { Prescription } from "../exercises/prescription";
import { READINESS_LABELS } from "../state/patientProfile";
import { totalPrescribedReps } from "../state/prescriptionStore";

type Props = {
  plan: Prescription;
  onContinue: (readiness: number | null) => void;
  onBack: () => void;
};

export default function ReadinessScreen({ plan, onContinue, onBack }: Props) {
  const [readiness, setReadiness] = useState<number | null>(null);

  return (
    <div className="screen screen--narrow screen--centered">
      <div className="screen__top">
        <button type="button" className="back-link" onClick={onBack}>
          <Icon name="back" />
          Back
        </button>
        <span className="chip chip--outline">
          {plan.steps.length} exercises · {totalPrescribedReps(plan)} reps
        </span>
      </div>

      <div className="page__header">
        <p className="eyebrow">Before you start</p>
        <h1 className="display">How's the body feeling?</h1>
        <p className="lede">A quick check-in that gets saved alongside today's session.</p>
      </div>

      <div className="readiness" role="radiogroup" aria-label="Readiness">
        {READINESS_LABELS.map((label, index) => (
          <button
            type="button"
            role="radio"
            key={label}
            className={`readiness__option${readiness === index ? " is-selected" : ""}`}
            onClick={() => setReadiness(index)}
            aria-checked={readiness === index}
          >
            <span className="readiness__level" aria-hidden="true">
              {READINESS_LABELS.map((_, level) => (
                <i
                  key={level}
                  className={level <= index ? "is-lit" : undefined}
                  style={{ height: `${40 + level * 15}%` }}
                />
              ))}
            </span>
            {label}
          </button>
        ))}
      </div>

      <div className="readiness-actions">
        <button
          type="button"
          className="btn btn--lg btn--block btn--glow"
          onClick={() => onContinue(readiness)}
        >
          <Icon name="camera" width={18} height={18} />
          {readiness === null ? "Continue to camera" : "Let's go"}
        </button>
        <button type="button" className="back-link" onClick={() => onContinue(null)}>
          Skip check-in
        </button>
      </div>
    </div>
  );
}
