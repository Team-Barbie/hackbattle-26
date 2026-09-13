import { useMemo, type CSSProperties } from "react";

const PIECES_PER_SIDE = 14;

type Piece = {
  side: "left" | "right";
  color: "black" | "white";
  offset: number;
  delay: number;
  duration: number;
  drift: number;
  rotate: number;
};

function buildPieces(): Piece[] {
  const pieces: Piece[] = [];

  for (const side of ["left", "right"] as const) {
    for (let i = 0; i < PIECES_PER_SIDE; i += 1) {
      pieces.push({
        side,
        color: i % 2 === 0 ? "black" : "white",
        offset: Math.random() * 3,
        delay: Math.random() * 0.5,
        duration: 2.2 + Math.random() * 1.4,
        drift: (Math.random() - 0.5) * 40,
        rotate: 180 + Math.random() * 540,
      });
    }
  }

  return pieces;
}

/** Two-tone, black-and-white confetti bursting in from the left and right edges. */
export default function Confetti() {
  const pieces = useMemo(buildPieces, []);

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((piece, index) => {
        const style: CSSProperties & Record<string, string> = {
          [piece.side]: `${piece.offset}%`,
          animationDelay: `${piece.delay}s`,
          animationDuration: `${piece.duration}s`,
          "--confetti-drift": `${piece.drift}px`,
          "--confetti-rotate": `${piece.rotate}deg`,
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
