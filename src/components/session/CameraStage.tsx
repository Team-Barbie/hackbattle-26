import type { ExerciseSession } from "../../hooks/useExerciseSession";
import Icon from "../Icon";
import CoachHud from "./CoachHud";

function statusChip(session: ExerciseSession) {
  if (session.poseError) {
    return <span className="chip chip--danger">Model failed</span>;
  }

  if (!session.poseReady) {
    return (
      <span className="chip">
        <i className="dot dot--pulse" /> Loading model
      </span>
    );
  }

  if (session.recordingReference) {
    return (
      <span className="chip chip--danger">
        <i className="dot dot--pulse" /> Recording
      </span>
    );
  }

  if (session.tracking) {
    return (
      <span className="chip chip--live">
        <i className="dot" /> Tracking
      </span>
    );
  }

  if (session.isLive) {
    return (
      <span className="chip chip--warn">
        <i className="dot dot--pulse" /> Looking for you
      </span>
    );
  }

  return <span className="chip">Camera off</span>;
}

function Placeholder({ session }: { session: ExerciseSession }) {
  if (session.status === "starting") {
    return (
      <div className="camera__placeholder">
        <span className="camera__placeholder-icon">
          <Icon name="camera" />
        </span>
        <h2>Starting camera…</h2>
        <p>Allow access when your browser asks.</p>
      </div>
    );
  }

  if (session.status === "error") {
    return (
      <div className="camera__placeholder">
        <span className="camera__placeholder-icon" style={{ color: "var(--danger)" }}>
          <Icon name="camera-off" />
        </span>
        <h2>Camera unavailable</h2>
        <p>{session.error ?? "Could not start the camera."}</p>
        <button type="button" className="btn btn--sm" onClick={() => void session.startCamera()}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="camera__placeholder">
      <span className="camera__placeholder-icon">
        <Icon name="camera-off" />
      </span>
      <h2>Camera is off</h2>
      <p>Turn it on to resume coaching. Your reps for this exercise are kept.</p>
      <button
        type="button"
        className="btn btn--sm"
        onClick={() => void session.startCamera()}
        disabled={session.isBusy}
      >
        <Icon name="camera" width={16} height={16} />
        Turn camera on
      </button>
    </div>
  );
}

export default function CameraStage({ session }: { session: ExerciseSession }) {
  const { isLive, tracking } = session;
  const classes = ["camera", isLive ? "is-live" : "", tracking ? "is-tracking" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes} style={{ aspectRatio: session.videoAspect }} aria-label="Camera">
      <div className="camera__stage">
        <video
          ref={session.videoRef}
          className="camera__video"
          autoPlay
          playsInline
          muted
          aria-label="Live webcam feed"
        />
        <canvas ref={session.overlayRef} className="camera__overlay" aria-hidden="true" />
      </div>

      {!isLive && <Placeholder session={session} />}

      <div className="camera__topbar">
        <div className={`pip${tracking ? " is-live" : ""}`}>
          <canvas ref={session.figureRef} aria-label="Live pose avatar" />
          <span>{tracking ? "Avatar" : "Waiting"}</span>
        </div>
        <div className="camera__badges">{statusChip(session)}</div>
      </div>

      {isLive && <CoachHud session={session} />}
    </section>
  );
}
