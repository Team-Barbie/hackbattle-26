import { useEffect, useRef } from "react";
import { drawSquatDemoFrame } from "../vision/squatDemoLoop";

export default function ExerciseDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    let frameHandle = 0;
    const start = performance.now();

    const tick = (now: number) => {
      drawSquatDemoFrame(canvas, now - start);
      frameHandle = requestAnimationFrame(tick);
    };

    frameHandle = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameHandle);
  }, []);

  return (
    <div className="demo-frame">
      <canvas ref={canvasRef} className="demo-canvas" aria-label="Looping demonstration of the exercise" />
    </div>
  );
}
