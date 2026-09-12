import Brand from "../components/Brand";
import Icon from "../components/Icon";
import ProgressRing from "../components/ProgressRing";
import { formatDay, formatDuration, shortExerciseName } from "../content/exerciseMeta";
import { planStepName, type Prescription } from "../exercises/prescription";
import {
  currentStreak,
  lastSession,
  sessionCompletion,
  sessionReps,
  sessionTarget,
  sessionsThisWeek,
  type PatientProfile,
} from "../state/patientProfile";
import { totalPrescribedReps } from "../state/prescriptionStore";

type Props = {
  profile: PatientProfile;
  plan: Prescription;
  publishedAt: string | null;
  liveClinic: boolean;
  onStartSession: () => void;
  onOpenProgram: () => void;
};

function greetingForNow(): string {
  const hour = new Date().getHours();

  if (hour < 5) {
    return "Up late";
  }
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 17) {
    return "Good afternoon";
  }
  return "Good evening";
}

export default function HomeScreen({
  profile,
  plan,
  publishedAt,
  liveClinic,
  onStartSession,
  onOpenProgram,
}: Props) {
  const firstName = profile.name.split(" ")[0];
  const streak = currentStreak(profile);
  const weekCount = sessionsThisWeek(profile);
  const latest = lastSession(profile);
  const doneToday = latest ? formatDay(latest.date) === "Today" : false;

  return (
    <div className="screen page">
      <div className="screen__top">
        <Brand />
        {streak > 0 && (
          <span className="chip chip--accent">
            <i className="dot" /> {streak}-day streak
          </span>
        )}
      </div>

      <header className="page__header">
        <p className="eyebrow eyebrow--muted">{greetingForNow()}</p>
        <h1>Hey {firstName}</h1>
      </header>

      <section className="card card--accent plan-card" aria-labelledby="plan-title">
        <div className="plan-card__head">
          <div>
            <p className="card__title">Today's plan</p>
            <h2 id="plan-title" className="plan-card__title">
              {plan.title}
            </h2>
            <p className="plan-card__meta">
              From {plan.therapist}
              {publishedAt ? ` · updated ${formatDay(publishedAt).toLowerCase()}` : ""}
              {liveClinic ? " · live clinic" : ""}
            </p>
          </div>
          <span className="chip">
            {plan.steps.length} {plan.steps.length === 1 ? "exercise" : "exercises"}
          </span>
        </div>

        <ol className="plan-steps">
          {plan.steps.map((step, index) => (
            <li key={step.id} className="plan-step">
              <span className="index-bubble">{index + 1}</span>
              <div>
                <p className="plan-step__name">{planStepName(step)}</p>
              </div>
              <span className="plan-step__reps">×{step.targetReps}</span>
            </li>
          ))}
        </ol>

        <div className="plan-card__footer">
          <span className="muted" style={{ fontSize: "0.84rem" }}>
            {totalPrescribedReps(plan)} reps total
            {doneToday ? " · already done once today" : ""}
          </span>
          <button type="button" className="btn btn--lg btn--glow" onClick={onStartSession}>
            <Icon name="play" solid width={18} height={18} />
            {doneToday ? "Go again" : "Start session"}
          </button>
        </div>
      </section>

      <div className="stat-grid">
        <div className="stat">
          <span className={`stat__value${streak > 0 ? " is-accent" : ""}`}>{streak}</span>
          <span className="stat__label">Day streak</span>
        </div>
        <div className="stat">
          <span className="stat__value">{weekCount}</span>
          <span className="stat__label">Sessions this week</span>
        </div>
        <div className="stat">
          <span className="stat__value">{profile.sessions.length}</span>
          <span className="stat__label">All time</span>
        </div>
      </div>

      {latest ? (
        <section className="card card--tight" aria-label="Last session">
          <div className="last-session">
            <div className="last-session__ring">
              <ProgressRing value={sessionCompletion(latest)} thickness={0.12} />
            </div>
            <div>
              <p className="last-session__title">
                {sessionReps(latest)}/{sessionTarget(latest)} reps ·{" "}
                {Math.round(sessionCompletion(latest) * 100)}%
              </p>
              <p className="last-session__meta">
                {formatDay(latest.date)} · {formatDuration(latest.durationMs)} ·{" "}
                {latest.steps
                  .map((step) => step.exerciseName ?? shortExerciseName(step.exerciseId))
                  .join(", ")}
              </p>
            </div>
            <span className="chip chip--outline">Last</span>
          </div>
        </section>
      ) : (
        <button type="button" className="empty" onClick={onOpenProgram}>
          <strong>No sessions yet</strong>
          <span>Browse the program to see how each exercise is done before you begin.</span>
        </button>
      )}
    </div>
  );
}
