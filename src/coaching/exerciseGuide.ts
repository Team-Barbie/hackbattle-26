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
