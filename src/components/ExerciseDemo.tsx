import { useEffect, useRef } from "react";
import type { ExerciseId } from "../exercises/exerciseCatalog";
import { drawExerciseDemoFrame } from "../vision/exerciseDemoLoop";

type Props = {
  exerciseId: ExerciseId;
  label?: string;
};

export default function ExerciseDemo({ exerciseId, label = "Demo" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    let frameHandle = 0;
    const start = performance.now();

    const tick = (now: number) => {
      drawExerciseDemoFrame(canvas, exerciseId, now - start);
      frameHandle = requestAnimationFrame(tick);
    };

    frameHandle = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameHandle);
  }, [exerciseId]);

  return (
    <figure className="demo">
      <canvas
        ref={canvasRef}
        className="demo__canvas"
        aria-label="Looping demonstration of the exercise"
      />
      <figcaption className="chip chip--outline demo__label">{label}</figcaption>
    </figure>
  );
}
