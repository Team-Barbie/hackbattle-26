import Icon from "../components/Icon";
import ProgressRing from "../components/ProgressRing";
import { formatDuration } from "../content/exerciseMeta";
import { exerciseName } from "../exercises/exerciseCatalog";
import {
  READINESS_LABELS,
  currentStreak,
  sessionCompletion,
  sessionReps,
  sessionTarget,
  type PatientProfile,
  type SessionRecord,
} from "../state/patientProfile";

type Props = {
  record: SessionRecord;
  profile: PatientProfile;
  onDone: () => void;
  onViewProgress: () => void;
};

function headline(completion: number): string {
  if (completion >= 1) {
    return "Plan complete";
  }
  if (completion >= 0.7) {
    return "Nearly there";
  }
  if (completion > 0) {
    return "Good start";
  }
  return "Session logged";
}

export default function SessionSummaryScreen({ record, profile, onDone, onViewProgress }: Props) {
  const completion = sessionCompletion(record);
  const reps = sessionReps(record);
  const target = sessionTarget(record);
  const streak = currentStreak(profile);

  return (
    <div className="screen screen--narrow screen--centered">
      <div className="summary__hero">
        <p className="eyebrow">{headline(completion)}</p>
        <div className="summary__ring" style={{ position: "relative" }}>
          <ProgressRing
            value={completion}
            thickness={0.08}
            label={`${Math.round(completion * 100)}% complete`}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
            }}
          >
            <p className="summary__total">
              {reps}
              <small>of {target} reps</small>
            </p>
          </div>
        </div>
        <p className="lede">
          {completion >= 1
            ? `Every prescribed rep done in ${formatDuration(record.durationMs)}.`
            : `${Math.round(completion * 100)}% of "${record.planTitle}" in ${formatDuration(record.durationMs)}. Every rep counts.`}
        </p>
        <div className="summary-strip">
          {streak > 0 && (
            <span className="chip chip--accent">
              <i className="dot" /> {streak}-day streak
            </span>
          )}
          {record.readiness !== null && (
            <span className="chip">Felt {READINESS_LABELS[record.readiness].toLowerCase()}</span>
          )}
        </div>
      </div>

      <section className="card">
        <p className="card__title">By exercise</p>
        <ul className="result-list">
          {record.steps.map((step, index) => {
            const complete = step.reps >= step.targetReps;

            return (
              <li
                key={`${step.exerciseId}-${index}`}
                className={`result-row${complete ? " is-complete" : ""}`}
              >
                <span className={`index-bubble${complete ? " is-done" : ""}`}>
                  {complete ? <Icon name="check" width={14} height={14} /> : index + 1}
                </span>
                <span className="result-row__name">{exerciseName(step.exerciseId)}</span>
                <span className="result-row__reps">
                  {step.reps}/{step.targetReps}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="profile-actions">
        <button type="button" className="btn btn--lg btn--block btn--glow" onClick={onDone}>
          Back to home
        </button>
        <button type="button" className="btn btn--ghost btn--block" onClick={onViewProgress}>
          View progress
        </button>
      </div>
    </div>
  );
}
