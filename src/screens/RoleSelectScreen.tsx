export type Role = "patient" | "therapist";

type Props = {
  onSelectRole: (role: Role) => void;
};

export default function RoleSelectScreen({ onSelectRole }: Props) {
  return (
    <div className="auth-shell">
      <div className="auth-copy">
        <p className="app-eyebrow">PhysioLoop</p>
        <h1>Who's signing in?</h1>
        <p className="auth-subtitle">Choose how you'll use PhysioLoop today.</p>
      </div>

      <div className="role-grid">
        <button type="button" className="role-card" onClick={() => onSelectRole("patient")}>
          <span className="role-badge">P</span>
          <span className="role-name">Patient</span>
          <span className="role-desc">Follow your program and track your reps.</span>
        </button>

        <button type="button" className="role-card is-disabled" disabled>
          <span className="role-badge">T</span>
          <span className="role-name">Therapist</span>
          <span className="role-desc">Coming soon — assign plans and review progress.</span>
        </button>
      </div>
    </div>
  );
}
