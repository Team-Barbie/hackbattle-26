import type { ExerciseId } from "../exercises/exerciseCatalog";

export type ExerciseGuide = {
  name: string;
  summary: string;
  steps: string[];
  cameraTip: string;
};

export const squatGuide: ExerciseGuide = {
  name: "Bodyweight squat",
  summary: "Slow and controlled beats fast and shallow.",
  steps: [
    "Stand with feet shoulder-width apart, toes turned slightly out.",
    "Sit back into your hips as if reaching for a chair behind you.",
    "Lower until your thighs are roughly parallel to the floor.",
    "Keep your chest up and let your knees track over your toes.",
    "Drive through your heels and stand all the way tall.",
  ],
  cameraTip: "Stand side-on, about two metres back, with your whole body in frame.",
};

export const exerciseGuides: Record<ExerciseId, ExerciseGuide> = {
  squat: squatGuide,
  "lateral-raise": {
    name: "Lateral raise",
    summary: "Lift from the shoulders, not a swing.",
    steps: [
      "Stand tall facing the camera, arms relaxed at your sides.",
      "Keep a soft bend in the elbows — don't lock them.",
      "Raise both arms out to the sides until they are about shoulder height.",
      "Pause briefly at the top without shrugging.",
      "Lower slowly back to your sides.",
    ],
    cameraTip: "Face the camera with your torso and both arms fully in frame.",
  },
  "bicep-curl": {
    name: "Bicep curl",
    summary: "Only the forearms should move.",
    steps: [
      "Stand facing the camera, elbows pinned close to your ribs.",
      "Start with arms long, palms facing forward.",
      "Curl both hands toward your shoulders without swinging.",
      "Squeeze at the top, then lower all the way down.",
      "Keep the elbows still — don't let them drift forward.",
    ],
    cameraTip: "Face the camera close enough that both shoulders, elbows, and wrists stay visible.",
  },
  "shoulder-raise": {
    name: "Standing shoulder raise",
    summary: "Use a comfortable range and keep the movement slow.",
    steps: [
      "Stand tall with both arms relaxed by your sides.",
      "Keep your elbows comfortably straight without locking them.",
      "Raise both arms overhead in a smooth, controlled arc.",
      "Pause briefly at the top without shrugging your shoulders.",
      "Lower both arms back to your sides to complete the rep.",
    ],
    cameraTip: "Face slightly side-on with your full body and both hands inside the frame.",
  },
  "knee-raise": {
    name: "Standing knee raise",
    summary: "Stay upright and use support nearby if balance is difficult.",
    steps: [
      "Stand tall with both feet on the floor.",
      "Shift your weight onto one leg without leaning backward.",
      "Lift the other knee toward hip height in a controlled motion.",
      "Pause briefly while keeping your torso upright.",
      "Return the foot to the floor to complete the rep.",
    ],
    cameraTip: "Stand side-on with your head, hips, knees, and ankles visible.",
  },
  custom: {
    name: "Custom recorded exercise",
    summary: "Record one clear reference repetition, then practise against it.",
    steps: [
      "Start the camera and stand fully inside the frame.",
      "Press Record reference and perform one slow, complete repetition.",
      "Press Stop and use after returning to the starting position.",
      "Repeat the movement while PhysioLoop follows your reference timeline.",
      "Use the live match score to stay close to the recorded movement.",
    ],
    cameraTip: "Keep the same camera position and orientation for recording and practice.",
  },
};
