import { exerciseName } from "../exercises/exerciseCatalog";
import { DEFAULT_PRESCRIPTION } from "../exercises/prescription";
import { currentStreak, type PatientProfile } from "../state/patientProfile";

type Props = {
  profile: PatientProfile;
  onStartSession: () => void;
};

export default function HomeScreen({ profile, onStartSession }: Props) {
  const streak = currentStreak(profile);
  const firstName = profile.name.split(" ")[0];
  const plan = DEFAULT_PRESCRIPTION;

  return (
    <div className="page">
      <header className="page-header">
        <p className="app-eyebrow">PhysioLoop</p>
        <h1>Hey {firstName}</h1>
      </header>

      <section className="panel plan-card">
        <p className="panel-title">Today's plan</p>
        <p className="plan-name">{plan.title}</p>
        <p className="plan-detail">
          {plan.steps.length} exercise{plan.steps.length === 1 ? "" : "s"} · prescribed by{" "}
          {plan.therapist}
        </p>
        <ol className="guide-steps">
          {plan.steps.map((step) => (
            <li key={step.id}>
              {exerciseName(step.exerciseId)} · {step.targetReps} reps
            </li>
          ))}
        </ol>
        <button type="button" className="block plan-cta" onClick={onStartSession}>
          Start session
        </button>
      </section>

      <section className="panel streak-strip">
        <div>
          <p className="panel-title">Streak</p>
          <p className="streak-value">{streak}</p>
        </div>
        <p className="streak-note">{streak === 1 ? "day in a row" : "days in a row"}</p>
      </section>
    </div>
  );
}
