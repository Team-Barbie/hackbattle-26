import Brand from "../components/Brand";
import Icon from "../components/Icon";
import ProgressRing from "../components/ProgressRing";
import { formatDay, formatDuration } from "../content/exerciseMeta";
import type { Prescription } from "../exercises/prescription";
import { displayExerciseName } from "../exercises/custom/referenceExercise";
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
  onStartSession: () => void;
  onOpenProgram: () => void;
};

export default function HomeScreen({
  profile,
  plan,
  publishedAt,
  onStartSession,
  onOpenProgram,
}: Props) {
  const streak = currentStreak(profile);
  const weekCount = sessionsThisWeek(profile);
  const latest = lastSession(profile);
  const doneToday = latest ? formatDay(latest.date) === "Today" : false;
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="screen page">
      <div className="screen__top">
        <Brand />
        <span className="label">{profile.name}</span>
      </div>

      <header className="page__header">
        <h1>Today</h1>
        <p className="label">{today}</p>
      </header>

      <section className="card" aria-labelledby="plan-title">
        <div className="plan-card__head">
          <h2 id="plan-title">{plan.title}</h2>
          <p className="plan-card__meta">
            {plan.therapist}
            {publishedAt ? ` · updated ${formatDay(publishedAt).toLowerCase()}` : ""}
          </p>
        </div>

        <ol className="list">
          {plan.steps.map((step, index) => (
            <li key={step.id} className="row row--indexed">
              <span className="row__index">{index + 1}</span>
              <span className="row__title">{displayExerciseName(step.exerciseId)}</span>
              <span className="row__end">{step.targetReps} reps</span>
            </li>
          ))}
        </ol>

        <div className="plan-card__footer">
          <span className="label">
            {plan.steps.length} exercises · {totalPrescribedReps(plan)} reps
            {doneToday ? " · completed once today" : ""}
          </span>
          <button type="button" className="btn btn--lg" onClick={onStartSession}>
            <Icon name="play" solid width={16} height={16} />
            {doneToday ? "Start again" : "Start session"}
          </button>
        </div>
      </section>

      <div className="stats">
        <div>
          <span className="stats__value">{streak}</span>
          <span className="stats__label">Day streak</span>
        </div>
        <div>
          <span className="stats__value">{weekCount}</span>
          <span className="stats__label">This week</span>
        </div>
        <div>
          <span className="stats__value">{profile.sessions.length}</span>
          <span className="stats__label">Total sessions</span>
        </div>
      </div>

      {latest ? (
        <section className="card" aria-label="Last session">
          <div className="row row--leading">
            <div className="ring-sm">
              <ProgressRing value={sessionCompletion(latest)} thickness={0.12} />
            </div>
            <div>
              <p className="row__title">
                Last session · {sessionReps(latest)}/{sessionTarget(latest)} reps
              </p>
              <p className="row__sub">
                {formatDay(latest.date)} · {formatDuration(latest.durationMs)}
              </p>
            </div>
            <span className="row__end">{Math.round(sessionCompletion(latest) * 100)}%</span>
          </div>
        </section>
      ) : (
        <button type="button" className="empty" onClick={onOpenProgram}>
          <strong>No sessions yet</strong>
          See how each exercise is done in the Program tab.
        </button>
      )}
    </div>
  );
}
