import { useEffect, useRef, useState } from "react";
import {
  createPoseDetector,
  formatPoseLog,
  type DetectedPose,
  type PoseDetector,
} from "../vision/poseDetector";

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
  const detectorRef = useRef<PoseDetector | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [poseError, setPoseError] = useState<string | null>(null);
  const [poseReady, setPoseReady] = useState(false);
  const [pose, setPose] = useState<DetectedPose | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    let detector: PoseDetector | null = null;

    async function loadDetector() {
      try {
        detector = await createPoseDetector();

        if (cancelled) {
          detector.close();
          return;
        }

        detectorRef.current = detector;
        setPoseReady(true);
        setPoseError(null);
      } catch (loadError) {
        console.error("[pose] failed to load detector", loadError);

        if (!cancelled) {
          setPoseReady(false);
          setPoseError("Could not load the pose model.");
        }
      }
    }

    void loadDetector();

    return () => {
      cancelled = true;
      detector?.close();
      detectorRef.current = null;
      setPoseReady(false);
    };
  }, []);

  const isLive = status === "live";
  const isBusy = status === "starting";

  useEffect(() => {
    if (!isLive || !poseReady) {
      return;
    }

    let frameId = 0;
    let lastLoggedAt = 0;

    const detectFrame = () => {
      const video = videoRef.current;
      const detector = detectorRef.current;

      if (video && detector) {
        const nextPose = detector.detectPose(video);
        const now = performance.now();

        if (now - lastLoggedAt >= 400) {
          lastLoggedAt = now;
          setPose(nextPose);

          if (nextPose) {
            console.log("[pose]", formatPoseLog(nextPose), nextPose);
          }
        }
      }

      frameId = requestAnimationFrame(detectFrame);
    };

    frameId = requestAnimationFrame(detectFrame);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isLive, poseReady]);

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
      {poseError && <p className="camera-error">{poseError}</p>}

      <div className="pose-log" aria-live="polite">
        <p className="pose-log-title">
          {poseReady ? (pose ? "Pose landmarks" : "Looking for a person…") : "Loading pose model…"}
        </p>
        {pose && (
          <pre className="pose-log-coords">
            {`L shoulder ${pose.leftShoulder.x.toFixed(2)}, ${pose.leftShoulder.y.toFixed(2)}
L hip      ${pose.leftHip.x.toFixed(2)}, ${pose.leftHip.y.toFixed(2)}
L knee     ${pose.leftKnee.x.toFixed(2)}, ${pose.leftKnee.y.toFixed(2)}
L ankle    ${pose.leftAnkle.x.toFixed(2)}, ${pose.leftAnkle.y.toFixed(2)}
R knee     ${pose.rightKnee.x.toFixed(2)}, ${pose.rightKnee.y.toFixed(2)}`}
          </pre>
        )}
      </div>

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
