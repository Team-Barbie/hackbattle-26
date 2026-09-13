import Icon from "../components/Icon";
import ProgressRing from "../components/ProgressRing";
import { issueLabel } from "../coaching/feedback";
import { formatDuration } from "../content/exerciseMeta";
import { exerciseName } from "../exercises/exerciseCatalog";
import {
  READINESS_LABELS,
  sessionCompletion,
  sessionReps,
  sessionTarget,
  type PatientProfile,
  type SessionRecord,
} from "../state/patientProfile";

type Props = {
  record: SessionRecord;
  profile: PatientProfile;
  clinicCode?: string;
  therapistDelivery?: "sent" | "skipped" | "failed";
  onDone: () => void;
  onViewProgress: () => void;
};

export default function SessionSummaryScreen({
  record,
  profile,
  clinicCode,
  therapistDelivery = "skipped",
  onDone,
  onViewProgress,
}: Props) {
  const completion = sessionCompletion(record);
  const reps = sessionReps(record);
  const target = sessionTarget(record);
  const goodReps = record.steps.reduce((total, step) => total + step.goodReps, 0);
  const flaggedReps = record.steps.reduce((total, step) => total + step.flaggedReps, 0);
  const mainIssue = record.steps.find((step) => step.mainIssue)?.mainIssue ?? null;

  return (
    <div className="screen screen--narrow screen--centered">
      <div className="summary__hero">
        <div className="summary__ring">
          <ProgressRing value={completion} thickness={0.08} label={`${Math.round(completion * 100)}% complete`} />
          <div className="summary__ring-inner">
            <p className="summary__total">
              {reps}
              <small>of {target} reps</small>
            </p>
          </div>
        </div>
        <div>
          <h1>{completion >= 1 ? "Session complete" : "Session saved"}</h1>
          <p className="lede" style={{ marginTop: 4 }}>
            {record.planTitle} · {formatDuration(record.durationMs)}
            {record.readiness !== null
              ? ` · felt ${READINESS_LABELS[record.readiness].toLowerCase()}`
              : ""}
          </p>
          <p className="lede" style={{ marginTop: 4 }}>
            {goodReps} good reps
            {flaggedReps > 0 ? ` · ${flaggedReps} form corrections` : ""}
            {mainIssue ? ` · main issue: ${issueLabel(mainIssue)}` : ""}
          </p>
          {therapistDelivery === "sent" && (
            <p className="lede" style={{ marginTop: 4 }}>
              Sent to your therapist as {profile.name}
              {clinicCode ? ` · code ${clinicCode}` : ""}
            </p>
          )}
          {therapistDelivery === "failed" && (
            <p className="lede" style={{ marginTop: 4 }}>
              Saved on this device, but the therapist log did not send. Try again from a better connection.
            </p>
          )}
        </div>
      </div>

      <section className="card">
        <ul className="list">
          {record.steps.map((step, index) => {
            const complete = step.reps >= step.targetReps;

            return (
              <li key={`${step.exerciseId}-${index}`} className="row row--indexed">
                <span className={`row__index${complete ? " is-done" : ""}`}>
                  {complete ? <Icon name="check" width={14} height={14} /> : index + 1}
                </span>
                <span>
                  <span className="row__title">{step.exerciseName ?? exerciseName(step.exerciseId)}</span>
                  {step.mainIssue && (
                    <span className="row__sub" style={{ display: "block" }}>
                      {issueLabel(step.mainIssue)}
                    </span>
                  )}
                </span>
                <span className="row__end">
                  {step.reps}/{step.targetReps}
                  {step.flaggedReps > 0 ? ` · ${step.flaggedReps} flagged` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="profile-actions">
        <button type="button" className="btn btn--lg btn--block" onClick={onDone}>
          Done
        </button>
        <button type="button" className="btn btn--ghost btn--block" onClick={onViewProgress}>
          View progress
        </button>
      </div>
    </div>
  );
}
