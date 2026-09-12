import { useState } from "react";
import { squatGuide } from "../coaching/exerciseGuide";
import { currentStreak, type PatientProfile } from "../state/patientProfile";

type Props = {
  profile: PatientProfile;
  onStartSession: () => void;
  onSwitchUser: () => void;
};

const READINESS_LABELS = ["Rough", "Sore", "Okay", "Good", "Great"];

function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function PatientDashboard({ profile, onStartSession, onSwitchUser }: Props) {
  const [readiness, setReadiness] = useState<number | null>(null);
  const streak = currentStreak(profile);
  const recentSessions = [...profile.sessions].reverse().slice(0, 5);
  const firstName = profile.name.split(" ")[0];

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="app-eyebrow">PhysioLoop</p>
          <h1>Hey {firstName}</h1>
        </div>
        <button type="button" className="secondary" onClick={onSwitchUser}>
          Switch user
        </button>
      </header>

      <div className="dashboard-grid">
        <section className="panel plan-card">
          <p className="panel-title">Today's plan</p>
          <p className="plan-name">{squatGuide.name}</p>
          <p className="plan-detail">1 set · 10 reps</p>
          <button type="button" className="block plan-cta" onClick={onStartSession}>
            Start session
          </button>
        </section>

        <section className="panel streak-card">
          <p className="panel-title">Streak</p>
          <p className="streak-value">{streak}</p>
          <p className="streak-note">{streak === 1 ? "day in a row" : "days in a row"}</p>
        </section>

        <section className="panel readiness-card">
          <p className="panel-title">How's it feeling today?</p>
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
        </section>

        <section className="panel history-card">
          <p className="panel-title">Recent sessions</p>
          {recentSessions.length === 0 ? (
            <p className="feedback-note">No sessions yet — start your first one today.</p>
          ) : (
            <ul className="history-list">
              {recentSessions.map((session) => (
                <li key={session.date}>
                  <span>{formatSessionDate(session.date)}</span>
                  <span>
                    {session.reps}/{session.target} reps
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel guide-card">
          <p className="panel-title">How to do it</p>
          <p className="guide-name">{squatGuide.name}</p>
          <ol className="guide-steps">
            {squatGuide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
