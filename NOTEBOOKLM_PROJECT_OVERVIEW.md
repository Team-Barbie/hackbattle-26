# PhysioLoop — First Review Source

## Project vision

PhysioLoop is a remote rehabilitation companion that helps patients complete therapist-approved exercise plans from home. Therapists assign rehabilitation cycles and define movement standards for each exercise. Real-time pose tracking compares movement against those standards and can provide immediate, easy-to-follow cues for issues such as inward knee movement, back rounding, or limited range of motion.

The wider product vision includes flagging sessions outside the prescribed pattern for therapist review. Periodic in-person visits remain part of the loop for professional assessment and plan adjustments. PhysioLoop is intended to support therapists, not replace them.

## Problem

Much of rehabilitation happens at home, where a therapist cannot observe every repetition. Patients may perform the correct exercise with incorrect technique, receive feedback only at a later appointment, and struggle to judge their own movement. Therapists also have limited visibility into the quality of home sessions.

## Proposed care loop

1. A therapist defines an exercise plan and movement expectations.
2. The patient completes the prescribed exercises at home.
3. A camera captures movement without requiring wearable hardware.
4. Pose tracking extracts body landmarks.
5. Biomechanics and exercise-specific rules evaluate the movement.
6. The patient receives a clear corrective cue.
7. Unusual sessions can be flagged for therapist review.
8. The therapist uses remote observations and periodic in-person assessment to adjust the plan.

## Current hackathon prototype

The current repository implements the technical foundation using the squat as the first exercise:

- React, TypeScript, and Vite web application
- live browser webcam capture
- MediaPipe Pose Landmarker integration
- real-time body-landmark detection
- pose skeleton overlaid on the camera feed
- a separate mirrored body figure
- One Euro filtering to reduce landmark jitter
- hip–knee–ankle joint-angle calculations
- left and right knee-angle display
- squat `UP` and `DOWN` state detection
- hysteresis thresholds to prevent state flickering
- local MediaPipe assets with GPU, CPU, CDN, and remote-model fallbacks
- camera permission, loading, tracking, and failure handling

## Current processing pipeline

Camera → pose detection → landmark smoothing → joint-angle calculation → squat-state detection → user interface

The code is separated into vision, biomechanics, exercise-state, and interface modules so that later form detectors and coaching logic do not need to be embedded in camera or UI code.

## Development progression

The Git history shows an incremental implementation:

1. Repository initialization
2. Live webcam feed
3. Real-time body-landmark detection
4. Camera integration and MediaPipe asset handling
5. Mirrored pose visualization, smoothing, and more reliable model loading
6. Reusable joint-angle utilities
7. Squat-state detection

## Immediate next milestone

1. Count a repetition after a complete `UP → DOWN → UP` transition.
2. Track the minimum knee angle during each repetition.
3. Detect a shallow squat.
4. Return a structured form issue rather than UI text.
5. Translate the issue into one simple corrective cue.
6. Add a basic session summary.

## Longer-term roadmap

- detect additional issues such as excessive forward lean or inward knee movement
- prioritize one correction instead of overwhelming the patient
- allow therapists to define plans and movement standards
- flag sessions for review
- provide longitudinal session summaries
- collect consented, anonymized pose sequences rather than raw video where appropriate
- validate movement rules with physiotherapists
- introduce exercise-specific machine-learning models behind the same detector interface
- conduct clinical, privacy, security, and accessibility testing

## Important scope distinction

The webcam, pose tracking, visualization, smoothing, knee-angle calculation, and squat-state detection are implemented. Rep counting, automatic form-error detection, corrective coaching, therapist accounts, rehabilitation-cycle assignment, dashboards, session flagging, persistent databases, and clinical validation are planned capabilities and must not be presented as completed.

## First-review framing

The squat prototype is a vertical slice demonstrating that browser camera input can be converted into stable, exercise-specific movement information. It is the technical foundation for the wider PhysioLoop care loop.

Suggested closing statement:

> PhysioLoop does not replace the therapist. It extends the therapist’s guidance into the patient’s home.
