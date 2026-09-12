## Target MVP

A user opens the app, allows camera access, performs a squat, and sees:

* their pose skeleton
* rep count
* one detected form issue
* one correction

Keep v1 to **one exercise: squat**.

Architecture:

```text
Camera
  ↓
Pose Detection
  ↓
Pose Data
  ↓
Exercise State
  ↓
Form Rules
  ↓
Feedback
```

Do not train a model yet.

---

## Commit 1 — App shell + camera

**Commit**

```text
feat: add live webcam feed
```

Build:

* simple web page
* start/stop camera
* display webcam feed
* basic layout

Suggested structure:

```text
src/
  components/
    CameraView.tsx
  App.tsx
```

Done when:

> You can open the app and see yourself through the webcam.

Do not add pose detection yet.

---

## Commit 2 — Add pose detection

**Commit**

```text
feat: detect body landmarks from camera
```

Add MediaPipe Pose / Pose Landmarker.

Input:

```text
video frame
```

Output:

```text
shoulder
hip
knee
ankle
etc.
```

Keep pose logic separate:

```text
src/
  vision/
    poseDetector.ts
```

Expose something simple:

```ts
detectPose(videoFrame)
```

Done when:

> You can log body landmark coordinates while moving.

---

## Commit 3 — Draw the skeleton

**Commit**

```text
feat: render pose skeleton over camera
```

Add a canvas over the webcam.

Draw:

```text
shoulder → hip
hip → knee
knee → ankle
```

You can draw the full MediaPipe skeleton if it's easy.

Architecture now:

```text
Camera
  ↓
Pose Detector
  ↓
Landmarks
  ↓
Skeleton Overlay
```

Done when:

> The skeleton follows your body in real time.

This is already a good visual demo checkpoint.

---

## Commit 4 — Add joint-angle utilities

**Commit**

```text
feat: calculate joint angles from pose landmarks
```

Create:

```text
src/
  biomechanics/
    angles.ts
```

Main function:

```ts
calculateAngle(a, b, c)
```

Use:

```text
hip
knee
ankle
```

to calculate knee angle.

Display it temporarily:

```text
Left knee: 132°
Right knee: 129°
```

Done when:

> Knee angle changes correctly as you squat.

Keep this function generic. You will reuse it for every exercise later.

---

## Commit 5 — Detect squat state

**Commit**

```text
feat: detect squat movement state
```

Do not build ML.

Use simple states:

```text
STANDING
DESCENDING
BOTTOM
ASCENDING
```

For MVP, you can simplify even further:

```text
UP
DOWN
```

Example:

```ts
if (kneeAngle > 155) {
  state = "UP"
}

if (kneeAngle < 110) {
  state = "DOWN"
}
```

Put this in:

```text
src/
  exercises/
    squat/
      squatState.ts
```

Architecture:

```text
Pose
 ↓
Angles
 ↓
Squat State
```

Done when:

> The UI correctly shows `UP` and `DOWN` while squatting.

---

# MVP CHECKPOINT 1

At this point you already have:

```text
camera
+ pose tracking
+ skeleton
+ knee angles
+ squat detection
```

This is the foundation. Everything after this builds on it.

---

## Commit 6 — Count reps

**Commit**

```text
feat: count completed squat reps
```

Count a rep only when:

```text
UP
 ↓
DOWN
 ↓
UP
```

Not:

```text
DOWN → DOWN → DOWN
```

Example:

```ts
if (previousState === "DOWN" && currentState === "UP") {
  reps += 1
}
```

Put it inside the squat module.

```text
squat/
  squatState.ts
  squatCounter.ts
```

Done when:

> Doing five squats gives approximately five reps.

Now you have something users immediately understand.

---

## Commit 7 — Detect one form problem

**Commit**

```text
feat: detect shallow squat
```

Start with the easiest form error.

During each rep, track:

```text
minimumKneeAngle
```

Example:

```ts
if (minimumKneeAngle > 120) {
  issue = "SHALLOW_SQUAT"
}
```

Don't obsess over the exact threshold yet.

Return structured data:

```ts
{
  type: "SHALLOW_SQUAT",
  severity: "warning"
}
```

Do not return UI text from the detector.

Architecture:

```text
Pose
 ↓
Angles
 ↓
Squat State
 ↓
Form Detection
```

Done when:

> A shallow squat gets flagged and a deeper squat doesn't.

---

## Commit 8 — Add coaching feedback

**Commit**

```text
feat: show corrective feedback for form issues
```

Create a feedback layer:

```text
src/
  coaching/
    feedback.ts
```

Input:

```ts
{
  type: "SHALLOW_SQUAT"
}
```

Output:

```text
Go slightly deeper on your next rep.
```

UI:

```text
Rep 4

Form
⚠ Shallow squat

Fix
Go slightly deeper on your next rep.
```

Important:

The form detector decides **what happened**.

The coaching layer decides **what to say**.

Keep those separate.

Done when:

> A bad rep produces understandable feedback.

---

# MVP CHECKPOINT 2

This is the hackathon MVP.

```text
Camera
  ↓
Pose Detection
  ↓
Joint Angles
  ↓
Squat Detection
  ↓
Rep Counter
  ↓
Shallow Squat Detection
  ↓
Correction
```

You could stop here and still have a valid project.

---

## Commit 9 — Stabilize noisy pose data

**Commit**

```text
fix: smooth pose landmarks and joint angles
```

Real pose data jumps around.

Add a simple rolling average:

```text
currentAngle =
  average(last 5 knee angles)
```

Create:

```text
vision/
  smoothing.ts
```

Do this before adding more form rules.

Otherwise you'll build rules around noisy data and regret it later.

Done when:

> The knee angle and squat state don't flicker constantly.

---

## Commit 10 — Add second form problem

**Commit**

```text
feat: detect excessive forward lean
```

Use:

```text
shoulder
hip
```

Calculate torso angle.

Then detect excessive forward lean during the bottom of the squat.

Return:

```ts
{
  type: "FORWARD_LEAN"
}
```

Feedback:

```text
Keep your chest slightly more upright.
```

Now your form system should support:

```text
SHALLOW_SQUAT
FORWARD_LEAN
```

Do not add five more.

Two reliable errors are better than eight bad ones.

---

## Commit 11 — Rank feedback

**Commit**

```text
feat: show only highest priority form correction
```

You may eventually detect multiple problems:

```text
shallow squat
forward lean
knee movement
```

Do not show all of them.

Add:

```ts
rankIssues(issues)
```

Return one:

```text
primaryIssue
```

Architecture:

```text
Form detectors
      ↓
Detected issues
      ↓
Issue ranking
      ↓
One correction
```

This makes the app feel much smarter.

---

## Commit 12 — Add session summary

**Commit**

```text
feat: add workout session summary
```

Track:

```text
total reps
good reps
flagged reps
most common issue
```

Show:

```text
Session complete

10 reps

7 good reps
3 form corrections

Main issue:
Shallow squat
```

Do not build accounts or databases yet.

Keep session data in memory.

---

# Hackathon stopping point

I would stop around here.

Your project now has a clean architecture:

```text
Camera
  ↓
Pose Detector
  ↓
Landmark Smoothing
  ↓
Biomechanics
  ↓
Exercise Engine
  ↓
Form Detectors
  ↓
Issue Ranking
  ↓
Coach
  ↓
UI
```

And your project structure can stay simple:

```text
src/

  vision/
    poseDetector.ts
    smoothing.ts

  biomechanics/
    angles.ts

  exercises/
    squat/
      squatState.ts
      squatCounter.ts
      squatForm.ts

  coaching/
    feedback.ts
    issueRanking.ts

  components/
    CameraView.tsx
    PoseOverlay.tsx
    FeedbackPanel.tsx
    SessionSummary.tsx

  App.tsx
```

---

# After the hackathon: prepare for ML

Do not throw away the rule-based system.

Build ML beside it.

## Commit 13

```text
feat: record anonymized pose sequences for completed reps
```

Save:

```text
rep
 ├ frame 1 → pose landmarks
 ├ frame 2 → pose landmarks
 ├ frame 3 → pose landmarks
 ...
```

Not necessarily raw video.

---

## Commit 14

```text
feat: export labeled squat dataset
```

Create data like:

```text
rep_001 → good
rep_002 → shallow
rep_003 → forward_lean
rep_004 → good
```

The current rule system can help pre-label the dataset.

Humans can correct those labels later.

---

## Commit 15

```text
ml: train baseline form classifier
```

Input:

```text
joint angles
relative joint positions
movement speed
minimum knee angle
torso angle
```

Output:

```text
GOOD
SHALLOW
FORWARD_LEAN
```

Start with something simple:

```text
Random Forest
or
XGBoost
```

Not a huge neural network.

---

## Commit 16

```text
feat: add ML form detector behind common interface
```

This is why you separated things earlier.

Your app should support:

```ts
interface FormDetector {
  analyze(rep): FormIssue[]
}
```

Then:

```text
RuleBasedFormDetector
```

can later become:

```text
MLFormDetector
```

without changing:

```text
camera
UI
rep counting
feedback
session summary
```

So the ML replaces one box:

```text
Before

Pose → Rules → Issue


Later

Pose → ML → Issue
```

Everything else survives.

---

# The key sequence

Build in this order:

```text
1 camera
2 pose
3 skeleton
4 angles
5 squat state
6 rep counter
7 one form issue       ← MVP
8 correction           ← strong MVP
9 smoothing
10 second issue
11 issue ranking
12 session summary     ← hackathon demo
13 collect data
14 label data
15 train model
16 swap ML into detector
```

The important architectural rule is:

> **Don't make the UI understand biomechanics, and don't make the biomechanics code understand the UI.**

Keep the pipeline separated, and the hackathon prototype can grow into the trained version instead of being rewritten.
