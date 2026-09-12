# PhysioLoop — Current system

PhysioLoop is a browser-based rehabilitation companion. A therapist publishes an exercise plan. A patient completes it at home with the webcam. Pose tracking turns movement into reps, form issues, and one correction at a time.

The app does not replace a therapist. It extends guidance into the home session.

## What is implemented

- React, TypeScript, and Vite
- Patient and therapist roles on the same device, plus a shareable patient link (`?plan=`)
- Optional access code checked at patient sign-in
- Live webcam capture and MediaPipe Pose Landmarker (local assets first, CDN fallback)
- Landmark smoothing, jump rejection, and a metric filter that accepts sustained motion
- Exercises: squat, knee raise, lateral raise, bicep curl, shoulder raise, custom recorded movement
- Rep counting with hold times so one-frame flicker does not score
- Form detectors for shallow range and squat forward lean
- Issue ranking so the HUD shows one correction
- Session skip, confirm-on-leave, and a summary with good vs flagged reps
- Local session history, readiness check-in, and local-calendar streaks

## Processing pipeline

Camera → pose detection → landmark smoothing → exercise metric → movement state → rep counter → form detectors → issue ranking → coach → UI

## Important limits

- Plans and history live in this browser unless a therapist copies a patient link
- There is no remote therapist account, cloud database, or clinical validation
- Form rules are heuristic, not a medical device
