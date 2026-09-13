import { useEffect, useRef } from "react";
import type { ExerciseId } from "../exercises/exerciseCatalog";
import {
  jointExcursionDegrees,
  type DemoFrame,
  type DemoPoint,
  type ReferenceExercise,
} from "../exercises/custom/referenceExercise";
import { drawExerciseDemoFrame } from "../vision/exerciseDemoLoop";

type Props = {
  exerciseId: ExerciseId;
  label?: string;
  reference?: ReferenceExercise;
};

const RECORDED_BONES = [
  ["leftShoulder", "rightShoulder"],
  ["leftShoulder", "leftElbow"], ["leftElbow", "leftWrist"],
  ["rightShoulder", "rightElbow"], ["rightElbow", "rightWrist"],
  ["leftShoulder", "leftHip"], ["rightShoulder", "rightHip"], ["leftHip", "rightHip"],
  ["leftHip", "leftKnee"], ["leftKnee", "leftAnkle"],
  ["rightHip", "rightKnee"], ["rightKnee", "rightAnkle"],
] as const;

function drawRecordedFrame(canvas: HTMLCanvasElement, frame: DemoFrame) {
  const scale = window.devicePixelRatio || 1;
  const width = Math.round(canvas.clientWidth * scale); const height = Math.round(canvas.clientHeight * scale);
  if (width < 2 || height < 2) return;
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const context = canvas.getContext("2d"); if (!context) return;
  const color = getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#f3f3f1";
  const lineWidth = Math.max(2.4, Math.min(width, height) * 0.02);
  context.clearRect(0, 0, width, height); context.strokeStyle = color; context.fillStyle = color;
  context.lineWidth = lineWidth; context.lineCap = "round"; context.lineJoin = "round";
  for (const [from, to] of RECORDED_BONES) {
    const a = frame[from]; const b = frame[to]; if (!a || !b) continue;
    context.beginPath(); context.moveTo(a.x * width, a.y * height); context.lineTo(b.x * width, b.y * height); context.stroke();
  }
  const head = frame.head; const leftShoulder = frame.leftShoulder; const rightShoulder = frame.rightShoulder;
  if (head && leftShoulder && rightShoulder) {
    context.beginPath();
    context.moveTo(head.x * width, head.y * height);
    context.lineTo(((leftShoulder.x + rightShoulder.x) / 2) * width, ((leftShoulder.y + rightShoulder.y) / 2) * height);
    context.stroke();
  }
  for (const [name, point] of Object.entries(frame)) {
    if (name === "head") continue;
    context.beginPath(); context.arc(point.x * width, point.y * height, lineWidth * 0.72, 0, Math.PI * 2); context.fill();
  }
  if (head) {
    context.beginPath(); context.arc(head.x * width, head.y * height, lineWidth * 1.8, 0, Math.PI * 2); context.fill();
  }
}

function median(values: number[]): number {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

/**
 * Pose frames used to be normalised independently, so an outstretched hand
 * could make the torso appear to shrink. Aligning every frame to the median
 * shoulder centre, angle, and width keeps the trunk visually stable while
 * preserving motion at the elbows, wrists, hips, knees, and ankles.
 */
const MIN_ANIMATED_EXCURSION_DEGREES = 14;

function stabiliseRecordedFrames(frames: DemoFrame[], reference: ReferenceExercise): DemoFrame[] {
  const anchors = frames.flatMap((frame) => {
    const left = frame.leftShoulder; const right = frame.rightShoulder;
    if (!left || !right) return [];
    return [{
      x: (left.x + right.x) / 2,
      y: (left.y + right.y) / 2,
      width: Math.hypot(right.x - left.x, right.y - left.y),
      angle: Math.atan2(right.y - left.y, right.x - left.x),
    }];
  });
  if (!anchors.length) return frames;

  const target = {
    x: median(anchors.map((anchor) => anchor.x)),
    y: median(anchors.map((anchor) => anchor.y)),
    // Older recordings were fitted to each frame's full bounding box, which
    // can exaggerate shoulder width whenever both arms are close to the body.
    width: Math.min(0.24, Math.max(0.08, median(anchors.map((anchor) => anchor.width)))),
    angle: median(anchors.map((anchor) => anchor.angle)),
  };

  const aligned = frames.map((frame) => {
    const left = frame.leftShoulder; const right = frame.rightShoulder;
    if (!left || !right) return frame;
    const centreX = (left.x + right.x) / 2; const centreY = (left.y + right.y) / 2;
    const width = Math.hypot(right.x - left.x, right.y - left.y);
    const angle = Math.atan2(right.y - left.y, right.x - left.x);
    const scale = width > 0.001 ? target.width / width : 1;
    const rotation = target.angle - angle;
    const cosine = Math.cos(rotation); const sine = Math.sin(rotation);

    return Object.fromEntries(Object.entries(frame).map(([name, point]) => {
      const localX = (point.x - centreX) * scale; const localY = (point.y - centreY) * scale;
      return [name, {
        x: target.x + localX * cosine - localY * sine,
        y: target.y + localX * sine + localY * cosine,
      }];
    }));
  });

  const typicalLength = (pairs: Array<[string, string]>, fallback: number) => {
    const values = aligned.flatMap((frame) => pairs.flatMap(([from, to]) => {
      const a = frame[from]; const b = frame[to];
      if (!a || !b) return [];
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      return length > 0.005 ? [length] : [];
    }));
    return values.length ? median(values) : fallback;
  };
  const lengths = {
    head: typicalLength([["head", "leftShoulder"], ["head", "rightShoulder"]], 0.12),
    torso: typicalLength([["leftShoulder", "leftHip"], ["rightShoulder", "rightHip"]], 0.28),
    pelvis: typicalLength([["leftHip", "rightHip"]], target.width * 0.55),
    upperArm: typicalLength([["leftShoulder", "leftElbow"], ["rightShoulder", "rightElbow"]], 0.16),
    forearm: typicalLength([["leftElbow", "leftWrist"], ["rightElbow", "rightWrist"]], 0.16),
    thigh: typicalLength([["leftHip", "leftKnee"], ["rightHip", "rightKnee"]], 0.22),
    shin: typicalLength([["leftKnee", "leftAnkle"], ["rightKnee", "rightAnkle"]], 0.22),
  };

  const project = (origin: DemoPoint, rawFrom: DemoPoint, rawTo: DemoPoint, length: number): DemoPoint => {
    const dx = rawTo.x - rawFrom.x; const dy = rawTo.y - rawFrom.y;
    const rawLength = Math.hypot(dx, dy);
    if (rawLength < 0.001) return { ...rawTo };
    return { x: origin.x + (dx / rawLength) * length, y: origin.y + (dy / rawLength) * length };
  };

  const constrained = aligned.map((frame) => {
    const result: DemoFrame = { ...frame };
    const leftShoulder = frame.leftShoulder; const rightShoulder = frame.rightShoulder;
    if (!leftShoulder || !rightShoulder) return result;
    const shoulderMid = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
    };

    if (frame.head) {
      // The stored head point is the nose, so use its median distance to the
      // shoulder line rather than treating it like another limb joint.
      const headLength = Math.max(0.07, lengths.head - target.width / 2);
      result.head = project(shoulderMid, shoulderMid, frame.head, headLength);
    }

    if (frame.leftHip && frame.rightHip) {
      const rawHipMid = {
        x: (frame.leftHip.x + frame.rightHip.x) / 2,
        y: (frame.leftHip.y + frame.rightHip.y) / 2,
      };
      const torsoCentreLength = Math.max(0.08, lengths.torso);
      const hipMid = project(shoulderMid, shoulderMid, rawHipMid, torsoCentreLength);
      const hipAngle = target.angle;
      const halfPelvis = lengths.pelvis / 2;
      result.leftHip = { x: hipMid.x - Math.cos(hipAngle) * halfPelvis, y: hipMid.y - Math.sin(hipAngle) * halfPelvis };
      result.rightHip = { x: hipMid.x + Math.cos(hipAngle) * halfPelvis, y: hipMid.y + Math.sin(hipAngle) * halfPelvis };
    }

    const constrainChain = (rootName: string, middleName: string, endName: string, firstLength: number, secondLength: number) => {
      const root = result[rootName]; const rawRoot = frame[rootName]; const rawMiddle = frame[middleName]; const rawEnd = frame[endName];
      if (!root || !rawRoot || !rawMiddle) return;
      result[middleName] = project(root, rawRoot, rawMiddle, firstLength);
      if (rawEnd) result[endName] = project(result[middleName], rawMiddle, rawEnd, secondLength);
    };
    constrainChain("leftShoulder", "leftElbow", "leftWrist", lengths.upperArm, lengths.forearm);
    constrainChain("rightShoulder", "rightElbow", "rightWrist", lengths.upperArm, lengths.forearm);
    constrainChain("leftHip", "leftKnee", "leftAnkle", lengths.thigh, lengths.shin);
    constrainChain("rightHip", "rightKnee", "rightAnkle", lengths.thigh, lengths.shin);
    return result;
  });

  const movesEnough = (...keys: Parameters<typeof jointExcursionDegrees>[1][]) =>
    Math.max(...keys.map((key) => jointExcursionDegrees(reference, key))) >= movementThreshold;
  const trackedKeys: Parameters<typeof jointExcursionDegrees>[1][] = [
    "leftShoulderElevation", "rightShoulderElevation", "leftElbowFlexion", "rightElbowFlexion",
    "leftHipFlexion", "rightHipFlexion", "leftKneeFlexion", "rightKneeFlexion",
  ];
  const dominantExcursion = Math.max(
    ...trackedKeys.map((key) => jointExcursionDegrees(reference, key)),
  );
  // A joint must be both absolutely meaningful and large relative to the
  // exercise's main action. This filters hip/knee tracking noise during large
  // upper-body movements without suppressing small, intentional rehab moves.
  const movementThreshold = Math.max(
    MIN_ANIMATED_EXCURSION_DEGREES,
    dominantExcursion * 0.3,
  );
  const active = {
    torso: movesEnough("leftHipFlexion", "rightHipFlexion"),
    leftArm: movesEnough("leftShoulderElevation", "leftElbowFlexion"),
    rightArm: movesEnough("rightShoulderElevation", "rightElbowFlexion"),
    leftLeg: movesEnough("leftHipFlexion", "leftKneeFlexion"),
    rightLeg: movesEnough("rightHipFlexion", "rightKneeFlexion"),
  };
  const defaultFrame = constrained[0];
  const freezeChain = (frame: DemoFrame, rootName: string, middleName: string, endName: string) => {
    const root = frame[rootName]; const baseRoot = defaultFrame[rootName];
    const baseMiddle = defaultFrame[middleName]; const baseEnd = defaultFrame[endName];
    if (!root || !baseRoot || !baseMiddle) return;
    frame[middleName] = {
      x: root.x + baseMiddle.x - baseRoot.x,
      y: root.y + baseMiddle.y - baseRoot.y,
    };
    if (baseEnd) {
      frame[endName] = {
        x: frame[middleName].x + baseEnd.x - baseMiddle.x,
        y: frame[middleName].y + baseEnd.y - baseMiddle.y,
      };
    }
  };

  const filtered = constrained.map((source) => {
    const frame: DemoFrame = Object.fromEntries(
      Object.entries(source).map(([name, point]) => [name, { ...point }]),
    );
    const shoulderMid = frame.leftShoulder && frame.rightShoulder ? {
      x: (frame.leftShoulder.x + frame.rightShoulder.x) / 2,
      y: (frame.leftShoulder.y + frame.rightShoulder.y) / 2,
    } : null;
    const baseShoulderMid = defaultFrame.leftShoulder && defaultFrame.rightShoulder ? {
      x: (defaultFrame.leftShoulder.x + defaultFrame.rightShoulder.x) / 2,
      y: (defaultFrame.leftShoulder.y + defaultFrame.rightShoulder.y) / 2,
    } : null;

    if (frame.head && shoulderMid && defaultFrame.head && baseShoulderMid) {
      frame.head = {
        x: shoulderMid.x + defaultFrame.head.x - baseShoulderMid.x,
        y: shoulderMid.y + defaultFrame.head.y - baseShoulderMid.y,
      };
    }

    if (!active.torso && shoulderMid && baseShoulderMid) {
      for (const side of ["left", "right"] as const) {
        const hipName = `${side}Hip`; const currentHip = frame[hipName]; const baseHip = defaultFrame[hipName];
        if (!currentHip || !baseHip) continue;
        const nextHip = {
          x: shoulderMid.x + baseHip.x - baseShoulderMid.x,
          y: shoulderMid.y + baseHip.y - baseShoulderMid.y,
        };
        const dx = nextHip.x - currentHip.x; const dy = nextHip.y - currentHip.y;
        frame[hipName] = nextHip;
        for (const joint of [`${side}Knee`, `${side}Ankle`]) {
          if (frame[joint]) frame[joint] = { x: frame[joint].x + dx, y: frame[joint].y + dy };
        }
      }
    }

    if (!active.leftArm) freezeChain(frame, "leftShoulder", "leftElbow", "leftWrist");
    if (!active.rightArm) freezeChain(frame, "rightShoulder", "rightElbow", "rightWrist");
    if (!active.leftLeg) freezeChain(frame, "leftHip", "leftKnee", "leftAnkle");
    if (!active.rightLeg) freezeChain(frame, "rightHip", "rightKnee", "rightAnkle");
    return frame;
  });

  const allPoints = filtered.flatMap((frame) => Object.values(frame));
  const minX = Math.min(...allPoints.map((point) => point.x));
  const maxX = Math.max(...allPoints.map((point) => point.x));
  const minY = Math.min(...allPoints.map((point) => point.y));
  const maxY = Math.max(...allPoints.map((point) => point.y));
  const width = Math.max(0.01, maxX - minX); const height = Math.max(0.01, maxY - minY);
  const fitScale = Math.min(0.76 / width, 0.84 / height);
  const centreX = (minX + maxX) / 2; const centreY = (minY + maxY) / 2;

  return filtered.map((frame) => Object.fromEntries(Object.entries(frame).map(([name, point]) => [name, {
    x: 0.5 + (point.x - centreX) * fitScale,
    y: 0.5 + (point.y - centreY) * fitScale,
  }])));
}

export default function ExerciseDemo({ exerciseId, label = "Demo", reference }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    let frameHandle = 0;
    const start = performance.now();
    const recordedFrames = reference?.demoFrames?.length
      ? stabiliseRecordedFrames(reference.demoFrames, reference)
      : null;
    const recordedCycle = recordedFrames
      ? [...recordedFrames, ...recordedFrames.slice(0, -1).reverse()]
      : null;

    const tick = (now: number) => {
      if (exerciseId === "custom" && recordedFrames?.length && recordedCycle?.length) {
        const elapsed = Math.max(0, now - start);
        const index = Math.floor((elapsed / 100) % recordedCycle.length);
        drawRecordedFrame(canvas, recordedCycle[index] ?? recordedFrames[0]);
      } else {
        drawExerciseDemoFrame(canvas, exerciseId, now - start);
      }
      frameHandle = requestAnimationFrame(tick);
    };

    frameHandle = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameHandle);
  }, [exerciseId, reference]);

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
