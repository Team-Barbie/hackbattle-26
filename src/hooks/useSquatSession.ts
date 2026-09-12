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
  hasFullBodyVisible,
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
const CUE_SPEAK_DELAY_MS = 350;
const REP_ANNOUNCEMENT_PRIORITY_MS = 1200;
const FULL_BODY_GRACE_MS = 500;
const BODY_STABILITY_MS = 1000;

function cancelSpeech() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

function speak(message: string) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.rate = 1.05;
  utterance.pitch = 1;
  utterance.volume = 1;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

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
  const lastSpokenCueRef = useRef("");
  const lastSpokenRepRef = useRef(0);
  const suppressCuesUntilRef = useRef(0);

  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [poseError, setPoseError] = useState<string | null>(null);
  const [poseReady, setPoseReady] = useState(false);
  const [videoAspect, setVideoAspect] = useState("16 / 9");
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

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

  const toggleAudio = useCallback(() => {
    setAudioEnabled((enabled) => !enabled);
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
    let lastFullBodyAt = 0;
    let validBodySince = 0;
    let bodyReady = false;

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

        const now = performance.now();
        const fullBodyDetected = hasFullBodyVisible(pose);

        if (fullBodyDetected) {
          lastFullBodyAt = now;
          validBodySince ||= now;

          if (now - validBodySince >= BODY_STABILITY_MS) {
            bodyReady = true;
          }
        } else if (lastFullBodyAt === 0 || now - lastFullBodyAt > FULL_BODY_GRACE_MS) {
          validBodySince = 0;
          bodyReady = false;
        }

        const insideGrace = lastFullBodyAt > 0 && now - lastFullBodyAt <= FULL_BODY_GRACE_MS;
        const exerciseTracking = bodyReady && (fullBodyDetected || insideGrace);
        const readings = thighReadingsFromPose(bodyReady && fullBodyDetected ? pose : null);
        const elevation = combineThighElevations(readings.left, readings.right);
        const state = exerciseTracking
          ? detectSquatState(elevation, squatStateRef.current)
          : null;

        if (exerciseTracking) {
          squatStateRef.current = state;
        } else {
          squatStateRef.current = null;
          counterRef.current.cancelCurrentRep();
        }

        const completedRep = exerciseTracking
          ? counterRef.current.update(state, elevation)
          : null;

        if (completedRep) {
          setReps(counterRef.current.count);
          setLastRepDepth(completedRep.deepestElevation);
        }

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
          } else {
            setDirection("still");
          }

          lastPublishedElevation = elevation;
          setTracking(fullBodyDetected);
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

  useEffect(() => {
    if (!isLive || !audioEnabled) {
      cancelSpeech();
      lastSpokenCueRef.current = "";
      return;
    }

    const cueKey = `${cue.headline}|${cue.detail}`;

    if (cueKey === lastSpokenCueRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (performance.now() < suppressCuesUntilRef.current) {
        return;
      }

      lastSpokenCueRef.current = cueKey;
      const message = cue.tone === "wait" ? `${cue.headline}. ${cue.detail}` : cue.headline;
      speak(message);
    }, CUE_SPEAK_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [audioEnabled, cue.detail, cue.headline, cue.tone, isLive]);

  useEffect(() => {
    if (reps === 0) {
      lastSpokenRepRef.current = 0;
      return;
    }

    if (reps <= lastSpokenRepRef.current) {
      return;
    }

    lastSpokenRepRef.current = reps;

    if (!isLive || !audioEnabled) {
      return;
    }

    suppressCuesUntilRef.current = performance.now() + REP_ANNOUNCEMENT_PRIORITY_MS;
    speak(reps >= targetReps ? `${reps} reps. Set complete.` : `Rep ${reps}`);
  }, [audioEnabled, isLive, reps, targetReps]);

  useEffect(() => cancelSpeech, []);

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
    audioEnabled,
    audioSupported:
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      "SpeechSynthesisUtterance" in window,
    toggleAudio,
    startCamera,
    stopCamera,
    resetSession,
  };
}

export type SquatSession = ReturnType<typeof useSquatSession>;
