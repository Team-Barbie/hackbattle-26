import Brand from "../components/Brand";
import Icon from "../components/Icon";

export type Role = "patient" | "therapist";

type Props = {
  cloudEnabled: boolean;
  onSelectRole: (role: Role) => void;
};

export default function RoleSelectScreen({ cloudEnabled, onSelectRole }: Props) {
  return (
    <div className="screen screen--centered">
      <div className="hero">
        <Brand size="lg" markOnly />
        <div>
          <p className="eyebrow">PhysioLoop</p>
          <h1 className="display">Rehab that watches your form.</h1>
        </div>
        <p className="lede">
          Camera-guided exercise sessions, prescribed by your therapist and coached rep by rep.
        </p>
      </div>

      <div className="role-grid">
        <button type="button" className="role-card" onClick={() => onSelectRole("patient")}>
          <span className="role-card__icon">
            <Icon name="patient" />
          </span>
          <span className="role-card__name">I'm a patient</span>
          <span className="role-card__desc">
            Follow today's plan, get live cues, and track your streak.
          </span>
          <span className="role-card__cta">Continue →</span>
        </button>

        <button type="button" className="role-card" onClick={() => onSelectRole("therapist")}>
          <span className="role-card__icon">
            <Icon name="therapist" />
          </span>
          <span className="role-card__name">I'm a therapist</span>
          <span className="role-card__desc">
            Build the plan, share it with your patient, and review their sessions.
          </span>
          <span className="role-card__cta">Open studio →</span>
        </button>
      </div>

      <p className="footnote">
        {cloudEnabled
          ? "Therapist publishes an access code. Patients on any device sign in with that code to get the live plan."
          : "Plans stay on this device until you add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env."}
      </p>
    </div>
  );
}
