type Props = {
  reps: number;
  target: number;
  onDone: () => void;
};

export default function SessionSummaryScreen({ reps, target, onDone }: Props) {
  const complete = reps >= target && target > 0;

  return (
    <div className="auth-shell summary-shell">
      <p className="app-eyebrow">Session complete</p>
      <p className="summary-reps">{reps}</p>
      <p className="summary-note">
        {complete
          ? `Nice work. You hit your target of ${target} reps.`
          : `You logged ${reps} of ${target} reps. Every rep counts.`}
      </p>
      <button type="button" className="block" onClick={onDone}>
        Back to dashboard
      </button>
    </div>
  );
}
