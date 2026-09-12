import ProgressRing from "../components/ProgressRing";
import { formatDay, formatDuration, formatTime, shortExerciseName } from "../content/exerciseMeta";
import { issueLabel } from "../coaching/feedback";
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
        <h1>Progress</h1>
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
        <h2 className="section-title">
          Last 7 days <small>{weekReps} reps</small>
        </h2>
        <div className="week-bars" role="img" aria-label={`${weekReps} reps over the last seven days`}>
          {week.map((day) => (
            <div key={day.day} className={`week-bars__col${day.isToday ? " is-today" : ""}`}>
              <div
                className={`week-bars__bar${day.reps > 0 ? " is-active" : ""}`}
                style={{ height: `${Math.max(3, (day.reps / weekMax) * 100)}%` }}
                title={`${day.reps} reps`}
              />
              <span className="week-bars__label">{day.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card" aria-label="All sessions">
        <h2 className="section-title">
          Sessions <small>{sessions.length} total</small>
        </h2>

        {sessions.length === 0 ? (
          <p className="empty">
            <strong>Nothing logged yet</strong>
            Finish a session and it will appear here.
          </p>
        ) : (
          <ul className="list">
            {sessions.map((session) => (
              <li key={session.id} className="row row--leading">
                <div className="ring-sm">
                  <ProgressRing value={sessionCompletion(session)} thickness={0.12} />
                </div>
                <div>
                  <p className="row__title">
                    {formatDay(session.date)}, {formatTime(session.date)}
                  </p>
                  <p className="row__sub">
                    {session.planTitle} · {formatDuration(session.durationMs)}
                    {session.readiness !== null
                      ? ` · felt ${READINESS_LABELS[session.readiness].toLowerCase()}`
                      : ""}
                  </p>
                  <p className="history__steps">
                      {session.steps.map((step, index) => (
                      <span
                        key={`${session.id}-${index}`}
                        className={step.reps >= step.targetReps ? "is-complete" : undefined}
                      >
                        {step.exerciseName ?? shortExerciseName(step.exerciseId)} {step.reps}/
                        {step.targetReps}
                        {step.mainIssue ? ` · ${issueLabel(step.mainIssue)}` : ""}
                      </span>
                    ))}
                  </p>
                </div>
                <span className="row__end">
                  {sessionReps(session)}/{sessionTarget(session)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
