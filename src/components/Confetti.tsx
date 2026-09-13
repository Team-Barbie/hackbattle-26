import { useMemo, type CSSProperties } from "react";

const PIECES_PER_SIDE = 10;

type Piece = {
  side: "left" | "right";
  color: "black" | "white";
  top: number;
  delay: number;
  duration: number;
  midX: number;
  midY: number;
  midRotate: number;
  endX: number;
  endY: number;
  endRotate: number;
};

function buildPieces(): Piece[] {
  const pieces: Piece[] = [];

  for (const side of ["left", "right"] as const) {
    const sign = side === "left" ? 1 : -1;

    for (let i = 0; i < PIECES_PER_SIDE; i += 1) {
      const midX = sign * (70 + Math.random() * 70);
      const midRotate = Math.random() * 180;

      pieces.push({
        side,
        color: i % 2 === 0 ? "black" : "white",
        top: 35 + Math.random() * 30,
        delay: Math.random() * 0.35,
        duration: 2.6 + Math.random() * 1.2,
        midX,
        midY: -(30 + Math.random() * 50),
        midRotate,
        endX: midX * (1.15 + Math.random() * 0.3),
        endY: 240 + Math.random() * 180,
        endRotate: midRotate + 180 + Math.random() * 360,
      });
    }
  }

  return pieces;
}

/**
 * Two-tone, black-and-white confetti shot in from the left and right edges,
 * arcing inward before falling - kept low-opacity and few in number so it
 * reads as a quiet flourish rather than a full-screen burst.
 */
export default function Confetti() {
  const pieces = useMemo(buildPieces, []);

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((piece, index) => {
        const style: CSSProperties & Record<string, string> = {
          top: `${piece.top}%`,
          [piece.side]: "-4px",
          animationDelay: `${piece.delay}s`,
          animationDuration: `${piece.duration}s`,
          "--confetti-mid-x": `${piece.midX}px`,
          "--confetti-mid-y": `${piece.midY}px`,
          "--confetti-mid-rotate": `${piece.midRotate}deg`,
          "--confetti-end-x": `${piece.endX}px`,
          "--confetti-end-y": `${piece.endY}px`,
          "--confetti-end-rotate": `${piece.endRotate}deg`,
        };

        return (
          <span
            key={`${piece.side}-${index}`}
            className={`confetti__piece confetti__piece--${piece.color}`}
            style={style}
          />
        );
      })}
    </div>
  );
}
