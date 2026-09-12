import { useEffect, useRef, useState } from "react";

type CameraStatus = "idle" | "starting" | "live" | "stopped" | "error";

function cameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Camera permission was blocked. Allow access and try again.";
    }
    if (error.name === "NotFoundError") {
      return "No camera was found on this device.";
    }
    if (error.name === "NotReadableError") {
      return "The camera is already in use by another app.";
    }
  }

  return "Could not start the camera.";
}

export default function CameraView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function requestStream() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });

    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
  }

  async function startCamera() {
    if (streamRef.current || status === "starting") {
      return;
    }

    setStatus("starting");
    setError(null);

    try {
      await requestStream();
      setStatus("live");
    } catch (startError) {
      stopTracks();
      setStatus("error");
      setError(cameraErrorMessage(startError));
    }
  }

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function stopCamera() {
    stopTracks();
    setStatus("stopped");
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;

    async function startOnMount() {
      setStatus("starting");
      setError(null);

      try {
        await requestStream();

        if (cancelled) {
          stopTracks();
          return;
        }

        setStatus("live");
      } catch (startError) {
        if (cancelled) {
          return;
        }

        stopTracks();
        setStatus("error");
        setError(cameraErrorMessage(startError));
      }
    }

    void startOnMount();

    return () => {
      cancelled = true;
      stopTracks();
    };
  }, []);

  const isLive = status === "live";
  const isBusy = status === "starting";

  return (
    <section className="camera-card">
      <div className={`camera-frame${isLive ? " is-live" : ""}`}>
        <video
          ref={videoRef}
          className="camera-video"
          autoPlay
          playsInline
          muted
          aria-label="Live webcam feed"
        />
        {!isLive && (
          <div className="camera-placeholder">
            <p>
              {status === "starting"
                ? "Starting camera…"
                : status === "error"
                  ? "Camera unavailable"
                  : "Camera is off"}
            </p>
          </div>
        )}
        <span className="camera-badge">{isLive ? "Live" : "Idle"}</span>
      </div>

      {error && <p className="camera-error">{error}</p>}

      <div className="camera-controls">
        <button type="button" onClick={() => void startCamera()} disabled={isLive || isBusy}>
          Start camera
        </button>
        <button type="button" onClick={stopCamera} disabled={!isLive} className="secondary">
          Stop camera
        </button>
      </div>
    </section>
  );
}
