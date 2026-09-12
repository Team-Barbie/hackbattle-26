type Props = {
  /** 0-1 completion. Values outside the range are clamped. */
  value: number;
  /** Stroke width as a fraction of the diameter (0.08 = 8%). */
  thickness?: number;
  className?: string;
  label?: string;
};

const SIZE = 100;

export default function ProgressRing({ value, thickness = 0.1, className, label }: Props) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const stroke = SIZE * thickness;
  const radius = (SIZE - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg
      className={`ring${className ? ` ${className}` : ""}`}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <circle
        className="ring__track"
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
      />
      <circle
        className={`ring__fill${clamped >= 1 ? " is-complete" : ""}`}
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped)}
      />
    </svg>
  );
}
