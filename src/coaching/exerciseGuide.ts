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
};
