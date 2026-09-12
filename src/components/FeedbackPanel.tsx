import type { SquatSession } from "../hooks/useSquatSession";

function formatAngle(angle: number | null): string {
  return angle === null ? "—" : `${Math.round(angle)}°`;
}

export default function FeedbackPanel({ session }: { session: SquatSession }) {
  const { cue, squatState, kneeAngle, lastRepDepth, poseReady, poseError } = session;

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
            {squatState ?? "—"}
          </dd>
        </div>
        <div>
          <dt>Knee angle</dt>
          <dd>{formatAngle(kneeAngle)}</dd>
        </div>
        <div>
          <dt>Last rep depth</dt>
          <dd>{formatAngle(lastRepDepth)}</dd>
        </div>
      </dl>

      {!poseReady && !poseError && <p className="feedback-note">Loading pose model…</p>}
      {poseError && <p className="feedback-error">{poseError}</p>}
      {session.error && <p className="feedback-error">{session.error}</p>}
    </section>
  );
}
