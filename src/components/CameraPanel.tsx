import type { SquatSession } from "../hooks/useSquatSession";

function placeholderText(session: SquatSession): string {
  if (session.status === "starting") {
    return "Starting camera…";
  }

  if (session.status === "error") {
    return "Camera unavailable";
  }

  return "Camera is off. Press Start camera.";
}

export default function CameraPanel({ session }: { session: SquatSession }) {
  const { isLive, tracking } = session;

  return (
    <section className="panel camera-panel" aria-label="Camera">
      <div
        className={`camera-frame${isLive ? " is-live" : ""}`}
        style={{ aspectRatio: session.videoAspect }}
      >
        <div className="camera-stage">
          <video
            ref={session.videoRef}
            className="camera-video"
            autoPlay
            playsInline
            muted
            aria-label="Live webcam feed"
          />
          <canvas ref={session.overlayRef} className="pose-overlay" aria-hidden="true" />
        </div>

        {!isLive && (
          <div className="camera-placeholder">
            {session.status === "starting" ? (
              <div className="skeleton-block" aria-hidden="true" />
            ) : null}
            <p>{placeholderText(session)}</p>
          </div>
        )}

        <div className={`avatar-pip${tracking ? " is-live" : ""}`}>
          <canvas
            ref={session.figureRef}
            className="avatar-canvas"
            aria-label="Live pose avatar"
          />
          <span className="avatar-label">{tracking ? "Avatar" : "Waiting"}</span>
        </div>

        <span className="camera-badge">
          {tracking ? "Tracking" : isLive ? "Live" : "Idle"}
        </span>
      </div>
    </section>
  );
}
