import { READINESS_LABELS, currentStreak, type PatientProfile } from "../state/patientProfile";

type Props = {
  profile: PatientProfile;
};

function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ProgressScreen({ profile }: Props) {
  const streak = currentStreak(profile);
  const sessions = [...profile.sessions].reverse();

  return (
    <div className="page">
      <header className="page-header">
        <p className="app-eyebrow">Progress</p>
        <h1>Your history</h1>
      </header>

      <section className="panel streak-strip">
        <div>
          <p className="panel-title">Current streak</p>
          <p className="streak-value">{streak}</p>
        </div>
        <p className="streak-note">{streak === 1 ? "day in a row" : "days in a row"}</p>
      </section>

      <section className="panel">
        <p className="panel-title">All sessions</p>
        {sessions.length === 0 ? (
          <p className="feedback-note">No sessions yet — start your first one from Home.</p>
        ) : (
          <ul className="history-list">
            {sessions.map((session) => (
              <li key={session.date}>
                <span>{formatSessionDate(session.date)}</span>
                <span>
                  {session.reps}/{session.target} reps
                </span>
                <span className="history-readiness">
                  {session.readiness === null ? "—" : READINESS_LABELS[session.readiness]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
