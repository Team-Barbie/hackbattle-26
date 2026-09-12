import { thighAngleDegrees } from "../biomechanics/thighElevation";
import type { SquatSession } from "../hooks/useSquatSession";

function formatThigh(elevation: number | null): string {
  const degrees = thighAngleDegrees(elevation);
  return degrees === null ? "·" : `${Math.round(degrees)}°`;
}

export default function FeedbackPanel({ session }: { session: SquatSession }) {
  const { cue, squatState, elevation, lastRepDepth, poseReady, poseError } = session;

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
          <dd className={squatState ? `is-${squatState.toLowerCase()}` : ""}>
            {squatState ?? "·"}
          </dd>
        </div>
        <div>
          <dt>Thigh (0° = parallel)</dt>
          <dd>{formatThigh(elevation)}</dd>
        </div>
        <div>
          <dt>Last rep depth</dt>
          <dd>{formatThigh(lastRepDepth)}</dd>
        </div>
      </dl>

      {!poseReady && !poseError && (
        <div className="loading-row">
          <span className="skeleton-pip" aria-hidden="true" />
          <p className="feedback-note">Loading pose model…</p>
        </div>
      )}
      {poseError && <p className="feedback-error">{poseError}</p>}
      {session.error && <p className="feedback-error">{session.error}</p>}
    </section>
  );
}
