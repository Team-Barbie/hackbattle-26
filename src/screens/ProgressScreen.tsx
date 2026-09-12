import ProgressRing from "../components/ProgressRing";
import { formatDay, formatDuration, formatTime, shortExerciseName } from "../content/exerciseMeta";
import {
  READINESS_LABELS,
  currentStreak,
  recentActivity,
  sessionCompletion,
  sessionReps,
  sessionTarget,
  totalReps,
  type PatientProfile,
} from "../state/patientProfile";

type Props = {
  profile: PatientProfile;
};

export default function ProgressScreen({ profile }: Props) {
  const streak = currentStreak(profile);
  const week = recentActivity(profile, 7);
  const weekMax = Math.max(1, ...week.map((day) => day.reps));
  const weekReps = week.reduce((total, day) => total + day.reps, 0);
  const sessions = [...profile.sessions].reverse();
  const averageCompletion =
    sessions.length > 0
      ? sessions.reduce((total, session) => total + sessionCompletion(session), 0) /
        sessions.length
      : 0;

  return (
    <div className="screen page">
      <header className="page__header">
        <p className="eyebrow">Progress</p>
        <h1>Your history</h1>
      </header>

      <div className="stat-grid">
        <div className="stat">
          <span className={`stat__value${streak > 0 ? " is-accent" : ""}`}>{streak}</span>
          <span className="stat__label">Day streak</span>
        </div>
        <div className="stat">
          <span className="stat__value">{totalReps(profile)}</span>
          <span className="stat__label">Total reps</span>
        </div>
        <div className="stat">
          <span className="stat__value">{Math.round(averageCompletion * 100)}%</span>
          <span className="stat__label">Avg. completion</span>
        </div>
      </div>

      <section className="card" aria-label="Last seven days">
        <div className="card__row">
          <p className="card__title">Last 7 days</p>
          <span className="chip">{weekReps} reps</span>
        </div>
        <div
          className="week-bars"
          role="img"
          aria-label={`${weekReps} reps over the last seven days`}
        >
          {week.map((day) => (
            <div key={day.day} className={`week-bars__col${day.isToday ? " is-today" : ""}`}>
              <div
                className={`week-bars__bar${day.reps > 0 ? " is-active" : ""}`}
                style={{ height: `${Math.max(4, (day.reps / weekMax) * 100)}%` }}
                title={`${day.reps} reps`}
              />
              <span className="week-bars__label">{day.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card" aria-label="All sessions">
        <div className="card__row">
          <p className="card__title">All sessions</p>
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            {sessions.length} total
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="empty">
            <strong>Nothing logged yet</strong>
            <span>Finish a session from Home and it will show up here.</span>
          </div>
        ) : (
          <ul className="history">
            {sessions.map((session) => (
              <li key={session.id} className="history__row">
                <div className="history__ring">
                  <ProgressRing value={sessionCompletion(session)} thickness={0.12} />
                </div>
                <div>
                  <p className="history__title">
                    {formatDay(session.date)} · {formatTime(session.date)}
                  </p>
                  <p className="history__meta">
                    {session.planTitle} · {formatDuration(session.durationMs)}
                    {session.readiness !== null
                      ? ` · felt ${READINESS_LABELS[session.readiness].toLowerCase()}`
                      : ""}
                  </p>
                  <div className="history__steps">
                    {session.steps.map((step, index) => (
                      <span
                        key={`${session.id}-${index}`}
                        className={`chip${step.reps >= step.targetReps ? " chip--accent" : ""}`}
                      >
                        {shortExerciseName(step.exerciseId)} {step.reps}/{step.targetReps}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="history__reps">
                  {sessionReps(session)}
                  <span className="muted">/{sessionTarget(session)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
