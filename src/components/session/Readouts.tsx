import { thighAngleDegrees } from "../../biomechanics/thighElevation";
import { issueLabel } from "../../coaching/feedback";
import type { ExerciseSession } from "../../hooks/useExerciseSession";

function formatDegrees(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}°`;
}

export default function Readouts({ session }: { session: ExerciseSession }) {
  const { poseReady, poseError, error, referenceMessage, exerciseId } = session;

  return (
    <section className="card" aria-label="Live readouts">
      <h2 className="section-title">Readouts</h2>
      <dl className="readouts">
        <div className="readouts__item">
          <dt>State</dt>
          <dd>{session.movementStateLabel}</dd>
        </div>
        <div className="readouts__item">
          <dt>{session.metricLabel}</dt>
          <dd>{session.metricDisplay}</dd>
        </div>
        {exerciseId === "squat" && (
          <div className="readouts__item">
            <dt>Last rep depth</dt>
            <dd>{formatDegrees(thighAngleDegrees(session.lastRepDepth))}</dd>
          </div>
        )}
        <div className="readouts__item">
          <dt>Form</dt>
          <dd>
            {session.goodReps} good
            {session.flaggedReps > 0 ? ` · ${session.flaggedReps} flagged` : ""}
          </dd>
        </div>
        {session.lastIssue && (
          <div className="readouts__item">
            <dt>Last issue</dt>
            <dd>{issueLabel(session.lastIssue)}</dd>
          </div>
        )}
        {exerciseId === "custom" && session.referenceExercise && (
          <div className="readouts__item">
            <dt>Reference progress</dt>
            <dd>{session.referenceProgress}%</dd>
          </div>
        )}
        {exerciseId === "custom" && session.referenceExercise && (
          <div className="readouts__item">
            <dt>Reference length</dt>
            <dd>{(session.referenceExercise.durationMs / 1000).toFixed(1)}s</dd>
          </div>
        )}
      </dl>

      {exerciseId === "custom" && referenceMessage && <p className="notice">{referenceMessage}</p>}
      {!poseReady && !poseError && <p className="notice">Loading the pose model…</p>}
      {poseError && <p className="notice notice--error">{poseError}</p>}
      {error && session.status !== "error" && <p className="notice notice--error">{error}</p>}
    </section>
  );
}
