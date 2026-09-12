import type { SquatSession } from "../hooks/useSquatSession";

export default function ControlBar({ session }: { session: SquatSession }) {
  const { isLive, isBusy } = session;

  return (
    <div className="control-bar">
      <button
        type="button"
        onClick={() => void session.startCamera()}
        disabled={isLive || isBusy}
      >
        Start cam
      </button>
      <button
        type="button"
        className="secondary"
        onClick={session.stopCamera}
        disabled={!isLive}
      >
        End cam
      </button>
      <button
        type="button"
        className="secondary"
        onClick={session.toggleSkeleton}
        aria-pressed={session.showSkeleton}
      >
        Skeleton: {session.showSkeleton ? "on" : "off"}
      </button>
    </div>
  );
}
