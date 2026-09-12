import { useCallback, useEffect, useRef, useState } from "react";
import { thighElevation, type ThighReading } from "../biomechanics/thighElevation";
import { nextCue, type Cue, type MoveDirection } from "../coaching/cues";
import { createSquatCounter } from "../exercises/squat/squatCounter";
import {
  combineThighElevations,
  detectSquatState,
  type SquatState,
} from "../exercises/squat/squatState";
import {
  getPoseDetector,
  isVisible,
  type DetectedPose,
  type LandmarkPoint,
  type PoseDetector,
} from "../vision/poseDetector";
import { drawBodyFigure, drawPoseOverlay } from "../vision/render";

export type CameraStatus = "idle" | "starting" | "live" | "stopped" | "error";

const PUBLISH_INTERVAL_MS = 120;
/** Elevation is a 0-1 ratio, so this is a fraction of thigh length, not degrees. */
const DIRECTION_DEADBAND = 0.03;
const DEFAULT_TARGET_REPS = 10;

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

function visibleJoint(point: LandmarkPoint | null) {
  return isVisible(point) ? point : null;
}

function sideReading(
  hip: LandmarkPoint | null,
  knee: LandmarkPoint | null,
): ThighReading {
  return {
    elevation: thighElevation(visibleJoint(hip), visibleJoint(knee)),
    confidence: Math.min(hip?.visibility ?? 0, knee?.visibility ?? 0),
  };
}

function thighReadingsFromPose(pose: DetectedPose | null) {
  if (!pose) {
    const empty: ThighReading = { elevation: null, confidence: 0 };
    return { left: empty, right: empty };
  }

  return {
    left: sideReading(pose.leftHip, pose.leftKnee),
    right: sideReading(pose.rightHip, pose.rightKnee),
  };
}

export function useSquatSession() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const figureRef = useRef<HTMLCanvasElement>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<PoseDetector | null>(null);
  const squatStateRef = useRef<SquatState | null>(null);
  const counterRef = useRef(createSquatCounter());
  const showSkeletonRef = useRef(true);

  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [poseError, setPoseError] = useState<string | null>(null);
  const [poseReady, setPoseReady] = useState(false);
  const [videoAspect, setVideoAspect] = useState("16 / 9");
  const [showSkeleton, setShowSkeleton] = useState(true);

  const [tracking, setTracking] = useState(false);
  const [squatState, setSquatState] = useState<SquatState | null>(null);
  const [elevation, setElevation] = useState<number | null>(null);
  const [direction, setDirection] = useState<MoveDirection>("still");
  const [reps, setReps] = useState(0);
  const [lastRepDepth, setLastRepDepth] = useState<number | null>(null);
  const [targetReps, setTargetReps] = useState(DEFAULT_TARGET_REPS);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (streamRef.current) {
      return;
    }

    setStatus("starting");
    setError(null);

    try {
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

      setStatus("live");
    } catch (startError) {
      stopTracks();
      setStatus("error");
      setError(cameraErrorMessage(startError));
    }
  }, [stopTracks]);

  const stopCamera = useCallback(() => {
    stopTracks();
    setStatus("stopped");
    setError(null);
    squatStateRef.current = null;
    setTracking(false);
    setSquatState(null);
    setElevation(null);
    setDirection("still");
  }, [stopTracks]);

  const resetSession = useCallback(() => {
    counterRef.current.reset();
    squatStateRef.current = null;
    setReps(0);
    setLastRepDepth(null);
    setSquatState(null);
    setDirection("still");
  }, []);

  const toggleSkeleton = useCallback(() => {
    setShowSkeleton((visible) => {
      showSkeletonRef.current = !visible;
      return !visible;
    });
  }, []);

  useEffect(() => stopTracks, [stopTracks]);

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
            loadError instanceof Error ? loadError.message : "Could not load the pose model.",
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

  useEffect(() => {
    if (!isLive || !poseReady) {
      return;
    }

    let stopped = false;
    let rafId = 0;
    let frameHandle: number | null = null;
    let lastPublishedAt = 0;
    let lastPublishedElevation: number | null = null;

    const detectFrame = () => {
      if (stopped) {
        return;
      }

      const video = videoRef.current;
      const detector = detectorRef.current;

      if (video && detector) {
        const pose = detector.detectPose(video);

        if (overlayRef.current) {
          drawPoseOverlay(overlayRef.current, video, showSkeletonRef.current ? pose : null);
        }

        if (figureRef.current) {
          drawBodyFigure(figureRef.current, pose);
        }

        const readings = thighReadingsFromPose(pose);
        const elevation = combineThighElevations(readings.left, readings.right);
        const state = detectSquatState(elevation, squatStateRef.current);
        squatStateRef.current = state;

        const completedRep = counterRef.current.update(state, elevation);

        if (completedRep) {
          setReps(counterRef.current.count);
          setLastRepDepth(completedRep.deepestElevation);
        }

        const now = performance.now();

        if (now - lastPublishedAt >= PUBLISH_INTERVAL_MS) {
          lastPublishedAt = now;

          if (elevation !== null && lastPublishedElevation !== null) {
            const delta = elevation - lastPublishedElevation;
            setDirection(
              delta < -DIRECTION_DEADBAND
                ? "descending"
                : delta > DIRECTION_DEADBAND
                  ? "ascending"
                  : "still",
            );
          }

          lastPublishedElevation = elevation;
          setTracking(Boolean(pose));
          setSquatState(state);
          setElevation(elevation);
        }
      }

      scheduleNext();
    };

    const scheduleNext = () => {
      if (stopped) {
        return;
      }

      const video = videoRef.current;

      if (video && "requestVideoFrameCallback" in video) {
        frameHandle = video.requestVideoFrameCallback(() => detectFrame());
        return;
      }

      rafId = requestAnimationFrame(detectFrame);
    };

    scheduleNext();

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);

      const video = videoRef.current;

      if (video && frameHandle !== null && "cancelVideoFrameCallback" in video) {
        video.cancelVideoFrameCallback(frameHandle);
      }
    };
  }, [isLive, poseReady]);

  const cue: Cue = nextCue({
    tracking: isLive && tracking,
    state: squatState,
    direction,
    repsDone: reps,
    repsTarget: targetReps,
  });

  return {
    videoRef,
    overlayRef,
    figureRef,
    status,
    isLive,
    isBusy: status === "starting",
    error,
    poseError,
    poseReady,
    videoAspect,
    tracking,
    squatState,
    elevation,
    direction,
    reps,
    targetReps,
    setTargetReps,
    lastRepDepth,
    cue,
    showSkeleton,
    toggleSkeleton,
    startCamera,
    stopCamera,
    resetSession,
  };
}

export type SquatSession = ReturnType<typeof useSquatSession>;
