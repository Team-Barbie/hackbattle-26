import Icon from "./Icon";

type Props = {
  size?: "md" | "lg";
  /** Hide the wordmark and show only the mark. */
  markOnly?: boolean;
};

export default function Brand({ size = "md", markOnly = false }: Props) {
  return (
    <span className={`brand${size === "lg" ? " brand--lg" : ""}`}>
      <span className="brand__mark">
        <Icon name="logo" strokeWidth={2.4} />
      </span>
      {!markOnly && <span>PhysioLoop</span>}
    </span>
  );
}
