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
      </div>

      <div className="page__header">
        <h1>How are you feeling today?</h1>
        <p className="lede">
          Saved with this session so your therapist can see it. {plan.steps.length} exercises,{" "}
          {totalPrescribedReps(plan)} reps ahead.
        </p>
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
            {label}
          </button>
        ))}
      </div>

      <div className="readiness-actions">
        <button type="button" className="btn btn--lg btn--block" onClick={() => onContinue(readiness)}>
          Continue
        </button>
        <button type="button" className="back-link" onClick={() => onContinue(null)}>
          Skip
        </button>
      </div>
    </div>
  );
}
