import type { ExerciseSession } from "../../hooks/useExerciseSession";
import Icon from "../Icon";
import CoachHud from "./CoachHud";

function statusTag(session: ExerciseSession) {
  if (session.poseError) {
    return <span className="tag tag--danger">Model failed</span>;
  }

  if (!session.poseReady) {
    return <span className="tag">Loading model…</span>;
  }

  if (session.recordingReference) {
    return <span className="tag tag--danger">Recording</span>;
  }

  if (session.tracking) {
    return <span className="tag tag--live">Tracking</span>;
  }

  if (session.isLive) {
    return <span className="tag tag--warn">Looking for you</span>;
  }

  return <span className="tag">Camera off</span>;
}

function Placeholder({ session }: { session: ExerciseSession }) {
  if (session.status === "starting") {
    return (
      <div className="camera__placeholder">
        <span className="camera__placeholder-icon">
          <Icon name="camera" />
        </span>
        <h2>Starting camera</h2>
        <p>Allow access if your browser asks.</p>
      </div>
    );
  }

  if (session.status === "error") {
    return (
      <div className="camera__placeholder">
        <span className="camera__placeholder-icon">
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
      <h2>Camera off</h2>
      <p>Your reps for this exercise are kept.</p>
      <button
        type="button"
        className="btn btn--sm"
        onClick={() => void session.startCamera()}
        disabled={session.isBusy}
      >
        Turn camera on
      </button>
    </div>
  );
}

export default function CameraStage({ session }: { session: ExerciseSession }) {
  const { isLive, tracking } = session;

  return (
    <section className="camera" style={{ aspectRatio: session.videoAspect }} aria-label="Camera">
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
        </div>
        {statusTag(session)}
      </div>

      {isLive && <CoachHud session={session} />}
    </section>
  );
}
