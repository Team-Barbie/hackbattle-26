import { useCallback, useEffect, useRef, useState } from "react";
import { torsoLeanFromPose } from "../biomechanics/torso";
import {
  thighAngleDegrees,
  thighElevation,
  type ThighReading,
} from "../biomechanics/thighElevation";
import { nextCue, type Cue, type MoveDirection } from "../coaching/cues";
import { analyzeCompletedRep } from "../exercises/formAnalysis";
import type { FormIssue, FormIssueType } from "../exercises/formIssues";
import { mostCommonIssue, rankIssues } from "../coaching/issueRanking";
import { createMotionCounter } from "../exercises/motionCounter";
import { exerciseName, usesUpperBody } from "../exercises/exerciseCatalog";
import {
  clearReferenceExercise,
  findReferenceMatch,
  loadReferenceExercise,
  poseFeatureFrame,
  saveReferenceExercise,
  type PoseFeatureFrame,
  type ReferenceExercise,
} from "../exercises/custom/referenceExercise";
import {
  DEFAULT_PRESCRIPTION,
  type Prescription,
} from "../exercises/prescription";
import {
  createBicepCurlCounter,
  detectBicepCurlState,
  bicepCurlDegrees,
  type BicepCurlState,
} from "../exercises/bicepCurl/bicepCurl";
import {
  detectKneeRaiseState,
  kneeRaiseElevation,
  type KneeRaiseState,
} from "../exercises/kneeRaise/kneeRaise";
import {
  detectLateralRaiseState,
  lateralRaiseDegrees,
  type LateralRaiseState,
} from "../exercises/lateralRaise/lateralRaise";
import {
  detectShoulderRaiseState,
  shoulderRaiseAngle,
  type ShoulderRaiseState,
} from "../exercises/shoulderRaise/shoulderRaise";
import { createSquatCounter } from "../exercises/squat/squatCounter";
import {
  combineThighElevations,
  detectSquatState,
  type SquatState,
} from "../exercises/squat/squatState";
import {
  getPoseDetector,
  hasFullBodyVisible,
  hasUpperBodyVisible,
  isVisible,
  type DetectedPose,
  type LandmarkPoint,
  type PoseDetector,
} from "../vision/poseDetector";
import { drawBodyFigure, drawPoseOverlay } from "../vision/render";
import { MetricFilter } from "../vision/smoothing";
import { poseJumped } from "../vision/stability";

export type CameraStatus = "idle" | "starting" | "live" | "stopped" | "error";
export type MovementState =
  | SquatState
  | ShoulderRaiseState
  | KneeRaiseState
  | LateralRaiseState
  | BicepCurlState
  | "NO_REFERENCE"
  | "RECORDING"
  | "MATCHED"
  | "ADJUST";

const PUBLISH_INTERVAL_MS = 120;
const DIRECTION_DEADBAND = 0.03;
const DEFAULT_TARGET_REPS = 10;
const CUE_SPEAK_DELAY_MS = 350;
const REP_ANNOUNCEMENT_PRIORITY_MS = 1200;
const FULL_BODY_GRACE_MS = 280;
const BODY_STABILITY_MS = 1400;
const COUNT_READY_MS = 350;
const REFERENCE_CAPTURE_INTERVAL_MS = 100;
const MIN_REFERENCE_FRAMES = 15;
const MAX_REFERENCE_FRAMES = 300;
const REFERENCE_MATCH_THRESHOLD = 68;
const REFERENCE_PROGRESS_THRESHOLD = 55;

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

function formatDegrees(value: number | null): string {
  return value === null ? "·" : `${Math.round(value)}°`;
}

function stateLabel(state: MovementState | null): string {
  const labels: Record<MovementState, string> = {
    UP: "Standing",
    DOWN: "Squat depth",
    ARMS_DOWN: "Arms down",
    ARMS_UP: "Arms raised",
    FEET_DOWN: "Feet down",
    KNEE_UP: "Knee raised",
    LATERAL_DOWN: "Arms down",
    LATERAL_UP: "Arms out",
    ARMS_EXTENDED: "Arms long",
    ARMS_CURLED: "Curled",
    NO_REFERENCE: "No reference",
    RECORDING: "Recording",
    MATCHED: "Matched",
    ADJUST: "Adjust position",
  };

  return state ? labels[state] : "·";
}

function visibleJoint(point: LandmarkPoint | null) {
  return isVisible(point) ? point : null;
}

function sideReading(hip: LandmarkPoint | null, knee: LandmarkPoint | null): ThighReading {
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

export type ExerciseSessionOptions = {
  plan?: Prescription;
};

export function useExerciseSession(options: ExerciseSessionOptions = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const figureRef = useRef<HTMLCanvasElement>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<PoseDetector | null>(null);
  const movementStateRef = useRef<MovementState | null>(null);
  const ascentLockedRef = useRef(false);
  const squatCounterRef = useRef(createSquatCounter());
  const shoulderCounterRef = useRef(
    createMotionCounter({ minExcursion: 55, restIsHigh: false }),
  );
  const kneeCounterRef = useRef(createMotionCounter({ minExcursion: 0.22, restIsHigh: true }));
  const lateralCounterRef = useRef(
    createMotionCounter({ minExcursion: 20, restIsHigh: false }),
  );
  const curlCounterRef = useRef(createBicepCurlCounter());
  const issueCountsRef = useRef<Partial<Record<FormIssueType, number>>>({});
  const maxLeanRef = useRef(Number.NEGATIVE_INFINITY);
  const repPeakRef = useRef<number | null>(null);
  const metricFilterRef = useRef(new MetricFilter(0.22));
  const lastStablePoseRef = useRef<DetectedPose | null>(null);
  const showSkeletonRef = useRef(true);
  const lastSpokenCueRef = useRef("");
  const lastSpokenRepRef = useRef(0);
  const suppressCuesUntilRef = useRef(0);
  const recordingReferenceRef = useRef(false);
  const recordedFramesRef = useRef<PoseFeatureFrame[]>([]);
  const lastReferenceCaptureAtRef = useRef(0);
  const referenceProgressRef = useRef(0);
  const awaitingReferenceRestartRef = useRef(false);
  const customRepCountRef = useRef(0);
  const lastCustomRepAtRef = useRef(0);
  const lastCustomScoreRef = useRef<number | null>(null);

  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [poseError, setPoseError] = useState<string | null>(null);
  const [poseReady, setPoseReady] = useState(false);
  const [videoAspect, setVideoAspect] = useState("16 / 9");
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [plan, setPlan] = useState<Prescription>(() =>
    options.plan && options.plan.steps.length > 0 ? options.plan : DEFAULT_PRESCRIPTION,
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [referenceExercise, setReferenceExercise] = useState<ReferenceExercise | null>(() =>
    loadReferenceExercise(),
  );
  const referenceExerciseRef = useRef(referenceExercise);
  const [recordingReference, setRecordingReference] = useState(false);
  const [referenceFrameCount, setReferenceFrameCount] = useState(0);
  const [referenceProgress, setReferenceProgress] = useState(0);
  const [referenceMessage, setReferenceMessage] = useState<string | null>(null);

  const [tracking, setTracking] = useState(false);
  const [movementState, setMovementState] = useState<MovementState | null>(null);
  const [movementMetric, setMovementMetric] = useState<number | null>(null);
  const [direction, setDirection] = useState<MoveDirection>("still");
  const [reps, setReps] = useState(0);
  const [lastRepDepth, setLastRepDepth] = useState<number | null>(null);
  const [lastIssue, setLastIssue] = useState<FormIssue | null>(null);
  const [goodReps, setGoodReps] = useState(0);
  const [flaggedReps, setFlaggedReps] = useState(0);
  const [mainIssue, setMainIssue] = useState<FormIssueType | null>(null);

  const currentStep = plan.steps[Math.min(stepIndex, Math.max(0, plan.steps.length - 1))];
  const exerciseId = currentStep?.exerciseId ?? "squat";
  const targetReps = currentStep?.targetReps ?? DEFAULT_TARGET_REPS;
  const isLastStep = stepIndex >= plan.steps.length - 1;
  const stepComplete = reps >= targetReps && targetReps > 0;
  const planComplete = stepComplete && isLastStep;
  const nextStep = !isLastStep ? plan.steps[stepIndex + 1] : undefined;
  const isLive = status === "live";

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
    recordingReferenceRef.current = false;
    setRecordingReference(false);
    setStatus("stopped");
    setError(null);
    movementStateRef.current = null;
    ascentLockedRef.current = false;
    setTracking(false);
    setMovementState(null);
    setMovementMetric(null);
    setDirection("still");
  }, [stopTracks]);

  const resetSession = useCallback(() => {
    squatCounterRef.current.reset();
    shoulderCounterRef.current.reset();
    kneeCounterRef.current.reset();
    lateralCounterRef.current.reset();
    curlCounterRef.current.reset();
    customRepCountRef.current = 0;
    referenceProgressRef.current = 0;
    awaitingReferenceRestartRef.current = false;
    lastCustomRepAtRef.current = 0;
    lastCustomScoreRef.current = null;
    recordingReferenceRef.current = false;
    recordedFramesRef.current = [];
    lastReferenceCaptureAtRef.current = 0;
    movementStateRef.current = null;
    ascentLockedRef.current = false;
    setReps(0);
    setLastRepDepth(null);
    setLastIssue(null);
    setGoodReps(0);
    setFlaggedReps(0);
    setMainIssue(null);
    issueCountsRef.current = {};
    maxLeanRef.current = Number.NEGATIVE_INFINITY;
    repPeakRef.current = null;
    setMovementState(null);
    setMovementMetric(null);
    setDirection("still");
    metricFilterRef.current.reset();
    lastStablePoseRef.current = null;
    setRecordingReference(false);
    setReferenceFrameCount(0);
    setReferenceProgress(0);
    setReferenceMessage(null);
  }, []);

  const toggleSkeleton = useCallback(() => {
    setShowSkeleton((visible) => {
      showSkeletonRef.current = !visible;
      return !visible;
    });
  }, []);

  const loadPrescription = useCallback(
    (nextPlan: Prescription) => {
      const usable = nextPlan.steps.length > 0 ? nextPlan : DEFAULT_PRESCRIPTION;
      resetSession();
      setPlan(usable);
      setStepIndex(0);
      lastSpokenCueRef.current = "";
      lastSpokenRepRef.current = 0;
    },
    [resetSession],
  );

  const restartPlan = useCallback(() => {
    resetSession();
    setStepIndex(0);
    lastSpokenCueRef.current = "";
    lastSpokenRepRef.current = 0;
  }, [resetSession]);

  const skipStep = useCallback(() => {
    if (isLastStep) {
      return;
    }

    resetSession();
    setStepIndex((index) => index + 1);
    lastSpokenCueRef.current = "";
    lastSpokenRepRef.current = 0;

    if (audioEnabled) {
      const upcoming = plan.steps[stepIndex + 1];
      if (upcoming) {
        speak(`Skipping. Next. ${exerciseName(upcoming.exerciseId)}.`);
      }
    }
  }, [audioEnabled, isLastStep, plan.steps, resetSession, stepIndex]);

  const startReferenceRecording = useCallback(() => {
    if (!isLive || exerciseId !== "custom") {
      return;
    }

    resetSession();
    recordedFramesRef.current = [];
    lastReferenceCaptureAtRef.current = 0;
    recordingReferenceRef.current = true;
    setRecordingReference(true);
    setReferenceMessage("Recording one complete repetition…");
    movementStateRef.current = "RECORDING";
    setMovementState("RECORDING");
  }, [exerciseId, isLive, resetSession]);

  const stopReferenceRecording = useCallback(() => {
    recordingReferenceRef.current = false;
    setRecordingReference(false);

    const frames = recordedFramesRef.current;

    if (frames.length < MIN_REFERENCE_FRAMES) {
      setReferenceMessage("Recording was too short. Record one slow, complete repetition.");
      setMovementState(referenceExerciseRef.current ? "ADJUST" : "NO_REFERENCE");
      return;
    }

    const reference: ReferenceExercise = {
      version: 1,
      name: "Custom recorded exercise",
      recordedAt: new Date().toISOString(),
      durationMs: (frames.length - 1) * REFERENCE_CAPTURE_INTERVAL_MS,
      frames: frames.map((frame) => [...frame]),
    };

    try {
      saveReferenceExercise(reference);
      referenceExerciseRef.current = reference;
      setReferenceExercise(reference);
      referenceProgressRef.current = 0;
      awaitingReferenceRestartRef.current = false;
      setReferenceProgress(0);
      setReferenceMessage(
        `Reference saved: ${(reference.durationMs / 1000).toFixed(1)} seconds. Repeat it now.`,
      );
      setMovementState("ADJUST");
    } catch {
      setReferenceMessage("The reference could not be saved in this browser.");
    }
  }, []);

  const clearReference = useCallback(() => {
    clearReferenceExercise();
    referenceExerciseRef.current = null;
    setReferenceExercise(null);
    recordedFramesRef.current = [];
    referenceProgressRef.current = 0;
    awaitingReferenceRestartRef.current = false;
    customRepCountRef.current = 0;
    setReferenceFrameCount(0);
    setReferenceProgress(0);
    setReferenceMessage("Reference cleared.");
    setMovementState("NO_REFERENCE");
    setMovementMetric(null);
    setReps(0);
  }, []);

  const toggleAudio = useCallback(() => {
    setAudioEnabled((enabled) => !enabled);
  }, []);

  useEffect(() => stopTracks, [stopTracks]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void startCamera();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [startCamera]);

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
    let readyToCount = false;

    const upperBodyMetric =
      exerciseId === "lateral-raise" ||
      exerciseId === "bicep-curl" ||
      exerciseId === "shoulder-raise";
    metricFilterRef.current = new MetricFilter(
      upperBodyMetric ? 24 : 0.2,
      exerciseId === "bicep-curl" ? 3 : 6,
    );
    lastStablePoseRef.current = null;

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
        const jumped = poseJumped(lastStablePoseRef.current, pose);
        const personVisible = usesUpperBody(exerciseId)
          ? hasUpperBodyVisible(pose)
          : hasFullBodyVisible(pose);

        if (personVisible) {
          if (!jumped) {
            lastFullBodyAt = now;
            validBodySince ||= now;

            if (now - validBodySince >= BODY_STABILITY_MS) {
              bodyReady = true;
            }
            if (bodyReady && now - validBodySince >= BODY_STABILITY_MS + COUNT_READY_MS) {
              readyToCount = true;
            }
          }

          // Always refresh the comparison baseline on a visible frame, jumped or not.
          // Otherwise one flagged frame freezes the reference pose while the person
          // keeps moving, so every later frame drifts further from it and reads as
          // "still jumping" until the grace period lapses and wipes the whole
          // multi-second stability timer.
          lastStablePoseRef.current = pose;
        } else if (lastFullBodyAt === 0 || now - lastFullBodyAt > FULL_BODY_GRACE_MS) {
          validBodySince = 0;
          bodyReady = false;
          readyToCount = false;
          lastStablePoseRef.current = null;
        }

        const insideGrace = lastFullBodyAt > 0 && now - lastFullBodyAt <= FULL_BODY_GRACE_MS;
        const exerciseTracking = bodyReady && (personVisible || insideGrace) && !jumped;
        const analysisPose = exerciseTracking && personVisible && !jumped ? pose : null;
        const readings = thighReadingsFromPose(analysisPose);
        let rawMetric: number | null = null;
        let state: MovementState | null = null;
        let customCompleted = false;

        if (exerciseTracking && exerciseId === "squat") {
          rawMetric = combineThighElevations(readings.left, readings.right);
        } else if (exerciseTracking && exerciseId === "shoulder-raise") {
          rawMetric = shoulderRaiseAngle(analysisPose);
        } else if (exerciseTracking && exerciseId === "knee-raise") {
          rawMetric = kneeRaiseElevation(readings.left, readings.right);
        } else if (exerciseTracking && exerciseId === "lateral-raise") {
          rawMetric = lateralRaiseDegrees(analysisPose);
        } else if (exerciseTracking && exerciseId === "bicep-curl") {
          rawMetric = bicepCurlDegrees(analysisPose);
        }

        let metric = exerciseTracking ? metricFilterRef.current.push(rawMetric) : null;

        if (exerciseTracking && exerciseId === "squat") {
          const previous =
            movementStateRef.current === "UP" || movementStateRef.current === "DOWN"
              ? movementStateRef.current
              : null;
          state = detectSquatState(metric, previous);
        } else if (exerciseTracking && exerciseId === "shoulder-raise") {
          const previous =
            movementStateRef.current === "ARMS_DOWN" || movementStateRef.current === "ARMS_UP"
              ? movementStateRef.current
              : null;
          state = detectShoulderRaiseState(metric, previous);
        } else if (exerciseTracking && exerciseId === "knee-raise") {
          const previous =
            movementStateRef.current === "FEET_DOWN" || movementStateRef.current === "KNEE_UP"
              ? movementStateRef.current
              : null;
          state = detectKneeRaiseState(metric, previous);
        } else if (exerciseTracking && exerciseId === "lateral-raise") {
          const previous =
            movementStateRef.current === "LATERAL_DOWN" ||
            movementStateRef.current === "LATERAL_UP"
              ? movementStateRef.current
              : null;
          state = detectLateralRaiseState(metric, previous);
        } else if (exerciseTracking && exerciseId === "bicep-curl") {
          const previous =
            movementStateRef.current === "ARMS_EXTENDED" ||
            movementStateRef.current === "ARMS_CURLED"
              ? movementStateRef.current
              : null;
          state = detectBicepCurlState(metric, previous);
        } else if (exerciseTracking && exerciseId === "custom") {
          const feature = poseFeatureFrame(analysisPose);
          const reference = referenceExerciseRef.current;

          if (recordingReferenceRef.current) {
            state = "RECORDING";

            if (
              feature &&
              now - lastReferenceCaptureAtRef.current >= REFERENCE_CAPTURE_INTERVAL_MS &&
              recordedFramesRef.current.length < MAX_REFERENCE_FRAMES
            ) {
              recordedFramesRef.current.push(feature);
              lastReferenceCaptureAtRef.current = now;
              setReferenceFrameCount(recordedFramesRef.current.length);
            }
          } else if (!reference) {
            state = "NO_REFERENCE";
          } else if (feature) {
            const lastIndex = reference.frames.length - 1;
            let match;

            if (awaitingReferenceRestartRef.current) {
              match = findReferenceMatch(
                feature,
                reference,
                0,
                Math.max(2, Math.floor(lastIndex * 0.12)),
              );

              if (match && match.score >= REFERENCE_MATCH_THRESHOLD + 5) {
                awaitingReferenceRestartRef.current = false;
                referenceProgressRef.current = 0;
                setReferenceProgress(0);
              }
            } else {
              const progress = referenceProgressRef.current;
              match = findReferenceMatch(feature, reference, progress - 2, progress + 10);

              if (match && match.score >= REFERENCE_PROGRESS_THRESHOLD) {
                const nextProgress = Math.max(progress, match.index);

                if (nextProgress !== progress) {
                  referenceProgressRef.current = nextProgress;
                  setReferenceProgress(
                    lastIndex > 0 ? Math.round((nextProgress / lastIndex) * 100) : 100,
                  );
                }

                if (
                  nextProgress >= lastIndex - 2 &&
                  match.score >= REFERENCE_MATCH_THRESHOLD &&
                  now - lastCustomRepAtRef.current >= 1000 &&
                  customRepCountRef.current < targetReps
                ) {
                  customRepCountRef.current += 1;
                  lastCustomRepAtRef.current = now;
                  awaitingReferenceRestartRef.current = true;
                  customCompleted = true;
                }
              }
            }

            metric = match?.score ?? 0;
            lastCustomScoreRef.current = metric;
            state = metric >= REFERENCE_MATCH_THRESHOLD ? "MATCHED" : "ADJUST";
          } else {
            metric = lastCustomScoreRef.current;
            state = movementStateRef.current;
          }
        }

        if (exerciseTracking && metric !== null && exerciseId !== "custom") {
          if (exerciseId === "bicep-curl" || exerciseId === "knee-raise") {
            repPeakRef.current =
              repPeakRef.current === null ? metric : Math.min(repPeakRef.current, metric);
          } else if (exerciseId !== "squat") {
            repPeakRef.current =
              repPeakRef.current === null ? metric : Math.max(repPeakRef.current, metric);
          }
        }

        if (exerciseTracking && exerciseId === "squat") {
          const lean = torsoLeanFromPose(analysisPose);

          if (lean !== null && (metric === null || metric < 0.72)) {
            maxLeanRef.current = Math.max(maxLeanRef.current, lean);
          }
        }

        if (exerciseTracking) {
          movementStateRef.current = state;
        } else {
          movementStateRef.current = null;
          ascentLockedRef.current = false;
          squatCounterRef.current.cancelCurrentRep();
          shoulderCounterRef.current.cancelCurrentRep();
          kneeCounterRef.current.cancelCurrentRep();
          lateralCounterRef.current.cancelCurrentRep();
          curlCounterRef.current.cancelCurrentRep();
          metricFilterRef.current.reset();
          maxLeanRef.current = Number.NEGATIVE_INFINITY;
          repPeakRef.current = null;
        }

        let completedRep = false;
        let currentCount = 0;
        let completedDeepest: number | null = null;
        const underTarget = (count: number) => count < targetReps;
        const canCount = exerciseTracking && readyToCount;

        if (canCount && exerciseId === "squat" && underTarget(squatCounterRef.current.count)) {
          const squatState = state === "UP" || state === "DOWN" ? state : null;
          const completedSquat = squatCounterRef.current.update(squatState, metric, now);
          completedRep = completedSquat !== null;
          currentCount = squatCounterRef.current.count;

          if (completedSquat) {
            completedDeepest = completedSquat.deepestElevation;
            setLastRepDepth(completedSquat.deepestElevation);
          }
        } else if (
          canCount &&
          exerciseId === "shoulder-raise" &&
          underTarget(shoulderCounterRef.current.count)
        ) {
          const phase = state === "ARMS_DOWN" ? "REST" : state === "ARMS_UP" ? "ACTIVE" : null;
          completedRep = shoulderCounterRef.current.update(phase, metric, now);
          currentCount = shoulderCounterRef.current.count;
        } else if (canCount && exerciseId === "knee-raise" && underTarget(kneeCounterRef.current.count)) {
          const phase = state === "FEET_DOWN" ? "REST" : state === "KNEE_UP" ? "ACTIVE" : null;
          completedRep = kneeCounterRef.current.update(phase, metric, now);
          currentCount = kneeCounterRef.current.count;
        } else if (
          canCount &&
          exerciseId === "lateral-raise" &&
          underTarget(lateralCounterRef.current.count)
        ) {
          const phase =
            state === "LATERAL_DOWN" ? "REST" : state === "LATERAL_UP" ? "ACTIVE" : null;
          completedRep = lateralCounterRef.current.update(phase, metric, now);
          currentCount = lateralCounterRef.current.count;
        } else if (canCount && exerciseId === "bicep-curl" && underTarget(curlCounterRef.current.count)) {
          const phase =
            state === "ARMS_EXTENDED" ? "REST" : state === "ARMS_CURLED" ? "ACTIVE" : null;
          completedRep = curlCounterRef.current.update(phase, metric, now);
          currentCount = curlCounterRef.current.count;
        } else if (exerciseTracking && exerciseId === "custom") {
          completedRep = customCompleted;
          currentCount = customRepCountRef.current;
        }

        if (completedRep) {
          setReps(currentCount);

          const issues = analyzeCompletedRep(exerciseId, {
            deepestElevation: completedDeepest,
            maxTorsoLean:
              maxLeanRef.current === Number.NEGATIVE_INFINITY ? null : maxLeanRef.current,
            peakMetric: repPeakRef.current,
          });
          const primary = rankIssues(issues);

          if (primary) {
            issueCountsRef.current[primary.type] = (issueCountsRef.current[primary.type] ?? 0) + 1;
            setFlaggedReps((count) => count + 1);
            setLastIssue(primary);
          } else {
            setGoodReps((count) => count + 1);
            setLastIssue(null);
          }

          setMainIssue(mostCommonIssue(issueCountsRef.current));
          maxLeanRef.current = Number.NEGATIVE_INFINITY;
          repPeakRef.current = null;
        }

        if (now - lastPublishedAt >= PUBLISH_INTERVAL_MS) {
          lastPublishedAt = now;

          if (exerciseId === "squat" && metric !== null && lastPublishedElevation !== null) {
            const delta = metric - lastPublishedElevation;
            const measuredDirection: MoveDirection =
              delta < -DIRECTION_DEADBAND
                ? "descending"
                : delta > DIRECTION_DEADBAND
                  ? "ascending"
                  : "still";

            if (state === "DOWN" && measuredDirection === "ascending") {
              ascentLockedRef.current = true;
            } else if (state === "UP") {
              ascentLockedRef.current = false;
            }

            setDirection(ascentLockedRef.current ? "ascending" : measuredDirection);
          } else {
            if (!exerciseTracking || exerciseId !== "squat") {
              ascentLockedRef.current = false;
            }
            setDirection("still");
          }

          lastPublishedElevation = exerciseId === "squat" ? metric : null;
          setTracking(personVisible);
          setMovementState(state);
          setMovementMetric(metric);
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
  }, [exerciseId, isLive, poseReady, targetReps]);

  const cue: Cue = nextCue({
    exerciseId,
    tracking: isLive && tracking,
    state: movementState,
    direction,
    repsDone: reps,
    repsTarget: targetReps,
    nextExerciseName: nextStep ? exerciseName(nextStep.exerciseId) : null,
    sessionComplete: planComplete,
    primaryIssue: lastIssue,
  });

  useEffect(() => {
    if (!isLive || !audioEnabled) {
      cancelSpeech();
      lastSpokenCueRef.current = "";
      return;
    }

    const cueKey = `${exerciseId}|${cue.headline}|${cue.detail}`;

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
  }, [audioEnabled, cue.detail, cue.headline, cue.tone, exerciseId, isLive]);

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
    speak(
      !stepComplete
        ? `Rep ${reps}`
        : planComplete
          ? `${reps} reps. Session complete.`
          : `${reps} reps. Set complete.`,
    );
  }, [audioEnabled, isLive, planComplete, reps, stepComplete]);

  useEffect(() => {
    if (!stepComplete || isLastStep) {
      return;
    }

    const timer = window.setTimeout(() => {
      resetSession();
      setStepIndex((index) => index + 1);
      lastSpokenCueRef.current = "";
      lastSpokenRepRef.current = 0;

      if (audioEnabled) {
        const upcoming = plan.steps[stepIndex + 1];
        if (upcoming) {
          speak(`Next. ${exerciseName(upcoming.exerciseId)}.`);
        }
      }
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [audioEnabled, isLastStep, plan.steps, resetSession, stepComplete, stepIndex]);

  useEffect(() => cancelSpeech, []);

  const metricLabel =
    exerciseId === "custom"
      ? "Reference match"
      : exerciseId === "shoulder-raise"
      ? "Shoulder angle"
      : exerciseId === "lateral-raise"
        ? "Arm lift"
        : exerciseId === "bicep-curl"
          ? "Elbow"
          : "Thigh angle";
  const metricDisplay =
    exerciseId === "custom"
      ? movementMetric === null
        ? "·"
        : `${Math.round(movementMetric)}%`
      : exerciseId === "squat" || exerciseId === "knee-raise"
      ? formatDegrees(thighAngleDegrees(movementMetric))
      : formatDegrees(movementMetric);

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
    exerciseId,
    plan,
    stepIndex,
    currentStep,
    nextStep,
    stepComplete,
    planComplete,
    loadPrescription,
    restartPlan,
    skipStep,
    referenceExercise,
    recordingReference,
    referenceFrameCount,
    referenceProgress,
    referenceMessage,
    startReferenceRecording,
    stopReferenceRecording,
    clearReference,
    tracking,
    movementState,
    movementStateLabel: stateLabel(movementState),
    movementMetric,
    metricLabel,
    metricDisplay,
    direction,
    reps,
    targetReps,
    lastRepDepth,
    lastIssue,
    goodReps,
    flaggedReps,
    mainIssue,
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

export type ExerciseSession = ReturnType<typeof useExerciseSession>;
