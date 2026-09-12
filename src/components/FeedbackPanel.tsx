import { thighAngleDegrees } from "../biomechanics/thighElevation";
import type { ExerciseSession } from "../hooks/useExerciseSession";

function formatDegrees(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}°`;
}

export default function FeedbackPanel({ session }: { session: ExerciseSession }) {
  const { cue, lastRepDepth, poseReady, poseError } = session;

  return (
    <section className="panel feedback-panel" aria-label="Live feedback">
      <h2 className="panel-title">Live feedback</h2>

      <div className="cue" aria-live="polite">
        <p className={`cue-headline tone-${cue.tone}`}>{cue.headline}</p>
        <p className="cue-detail">{cue.detail}</p>
      </div>

      <dl className="readouts">
        <div>
          <dt>State</dt>
          <dd>{session.movementStateLabel}</dd>
        </div>
        <div>
          <dt>{session.metricLabel}</dt>
          <dd>{session.metricDisplay}</dd>
        </div>
        {session.exerciseId === "squat" && (
          <div>
            <dt>Last rep depth</dt>
            <dd>{formatDegrees(thighAngleDegrees(lastRepDepth))}</dd>
          </div>
        )}
      </dl>

      {!poseReady && !poseError && <p className="feedback-note">Loading pose model…</p>}
      {poseError && <p className="feedback-error">{poseError}</p>}
      {session.error && <p className="feedback-error">{session.error}</p>}
    </section>
  );
}
