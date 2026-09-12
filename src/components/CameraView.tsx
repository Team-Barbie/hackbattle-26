import { useEffect, useRef, useState } from "react";
import { DrawingUtils, PoseLandmarker } from "@mediapipe/tasks-vision";
import {
  formatPoseLog,
  getPoseDetector,
  isVisible,
  type DetectedPose,
  type LandmarkPoint,
  type PoseDetector,
} from "../vision/poseDetector";
import PoseFigure, { drawBodyFigure } from "./PoseFigure";

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

function formatOptionalJoint(label: string, point: LandmarkPoint | null) {
  if (!isVisible(point)) {
    return "";
  }

  return `${label} ${point.x.toFixed(2)}, ${point.y.toFixed(2)}`;
}

const VISIBLE_LANDMARK = 0.16;
let overlayUtils: DrawingUtils | null = null;

function drawPose(canvas: HTMLCanvasElement, video: HTMLVideoElement, pose: DetectedPose | null) {
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    overlayUtils = null;
  }

  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  if (!pose) {
    return;
  }

  const visibleLandmarks = pose.landmarks.map((landmark) =>
    (landmark.visibility ?? 0) >= VISIBLE_LANDMARK ? landmark : undefined,
  );
  const visibleConnections = PoseLandmarker.POSE_CONNECTIONS.filter(
    (connection) => visibleLandmarks[connection.start] && visibleLandmarks[connection.end],
  );

  overlayUtils ??= new DrawingUtils(context);
  overlayUtils.drawConnectors(pose.landmarks, visibleConnections, {
    color: "#3dd68c",
    lineWidth: 4,
  });
  overlayUtils.drawLandmarks(
    visibleLandmarks.filter((landmark): landmark is NonNullable<typeof landmark> => Boolean(landmark)),
    {
      color: "#edf3ef",
      radius: 5,
      fillColor: "#3dd68c",
    },
  );
}

export default function CameraView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const figureRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<PoseDetector | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [poseError, setPoseError] = useState<string | null>(null);
  const [poseReady, setPoseReady] = useState(false);
  const [pose, setPose] = useState<DetectedPose | null>(null);
  const [videoAspect, setVideoAspect] = useState("16 / 9");

  async function requestStream() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 60 },
      },
      audio: false,
    });

    streamRef.current = stream;

    const video = videoRef.current;

    if (!video) {
      throw new Error("Video element is not ready.");
    }

    video.srcObject = stream;
    await video.play();

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await new Promise<void>((resolve) => {
        video.onloadeddata = () => resolve();
      });
    }

    if (video.videoWidth > 0 && video.videoHeight > 0) {
      setVideoAspect(`${video.videoWidth} / ${video.videoHeight}`);
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
    setPose(null);
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

    async function loadDetector() {
      try {
        const detector = await getPoseDetector();

        if (cancelled) {
          return;
        }

        detectorRef.current = detector;
        setPoseReady(true);
        setPoseError(null);
      } catch (loadError) {
        console.error("[pose] failed to load detector", loadError);

        if (!cancelled) {
          setPoseReady(false);
          setPoseError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load the pose model.",
          );
        }
      }
    }

    void loadDetector();

    return () => {
      cancelled = true;
    };
  }, []);

  const isLive = status === "live";
  const isBusy = status === "starting";

  useEffect(() => {
    if (!isLive || !poseReady) {
      return;
    }

    const video = videoRef.current;
    let rafId = 0;
    let videoFrameHandle: number | null = null;
    let lastLoggedAt = 0;
    let stopped = false;

    const detectFrame = () => {
      if (stopped) {
        return;
      }

      const liveVideo = videoRef.current;
      const canvas = canvasRef.current;
      const detector = detectorRef.current;

      if (liveVideo && canvas && detector) {
        const nextPose = detector.detectPose(liveVideo);
        drawPose(canvas, liveVideo, nextPose);

        if (figureRef.current) {
          drawBodyFigure(figureRef.current, nextPose);
        }

        const now = performance.now();

        if (now - lastLoggedAt >= 400) {
          lastLoggedAt = now;
          setPose(nextPose);

          if (nextPose) {
            console.log("[pose]", formatPoseLog(nextPose));
          }
        }
      }

      scheduleNext();
    };

    const scheduleNext = () => {
      if (stopped) {
        return;
      }

      const liveVideo = videoRef.current;

      if (liveVideo && "requestVideoFrameCallback" in liveVideo) {
        videoFrameHandle = liveVideo.requestVideoFrameCallback(() => {
          detectFrame();
        });
        return;
      }

      rafId = requestAnimationFrame(detectFrame);
    };

    scheduleNext();

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);

      if (video && videoFrameHandle !== null && "cancelVideoFrameCallback" in video) {
        video.cancelVideoFrameCallback(videoFrameHandle);
      }
    };
  }, [isLive, poseReady]);

  return (
    <section className="camera-card">
      <div className="studio">
      <div
        className={`camera-frame${isLive ? " is-live" : ""}`}
        style={{ aspectRatio: videoAspect }}
      >
        <div className="camera-stage">
          <video
            ref={videoRef}
            className="camera-video"
            autoPlay
            playsInline
            muted
            aria-label="Live webcam feed"
          />
          <canvas ref={canvasRef} className="pose-overlay" aria-hidden="true" />
        </div>
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
        <span className="camera-badge">{pose ? "Tracking" : isLive ? "Live" : "Idle"}</span>
      </div>
      <PoseFigure canvasRef={figureRef} tracking={Boolean(pose)} />
      </div>

      {error && <p className="camera-error">{error}</p>}
      {poseError && <p className="camera-error">{poseError}</p>}

      <div className="pose-log" aria-live="polite">
        <p className="pose-log-title">
          {!poseReady
            ? "Loading pose model…"
            : pose
              ? "Pose landmarks"
              : "Keep shoulders in frame and hit the Dougie — the figure should snap with you"}
        </p>
        {pose && (
          <pre className="pose-log-coords">
            {[
              `L shoulder ${pose.leftShoulder.x.toFixed(2)}, ${pose.leftShoulder.y.toFixed(2)}`,
              formatOptionalJoint("L hip     ", pose.leftHip),
              formatOptionalJoint("L knee    ", pose.leftKnee),
              formatOptionalJoint("L ankle   ", pose.leftAnkle),
              formatOptionalJoint("R knee    ", pose.rightKnee),
            ]
              .filter(Boolean)
              .join("\n")}
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
