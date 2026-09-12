import Brand from "../components/Brand";
import Icon from "../components/Icon";

export type Role = "patient" | "therapist";

type Props = {
  onSelectRole: (role: Role) => void;
};

export default function RoleSelectScreen({ onSelectRole }: Props) {
  return (
    <div className="screen screen--narrow screen--centered">
      <div className="page__header">
        <Brand />
        <h1 style={{ marginTop: 20 }}>Sign in</h1>
        <p className="lede">Choose how you're using PhysioLoop on this device.</p>
      </div>

      <div className="role-list">
        <button type="button" className="role-card" onClick={() => onSelectRole("patient")}>
          <span className="role-card__icon">
            <Icon name="patient" />
          </span>
          <span>
            <span className="role-card__name">Patient</span>
            <span className="role-card__desc">Do today's exercises with camera guidance.</span>
          </span>
          <Icon name="forward" className="role-card__chevron" />
        </button>

        <button type="button" className="role-card" onClick={() => onSelectRole("therapist")}>
          <span className="role-card__icon">
            <Icon name="therapist" />
          </span>
          <span>
            <span className="role-card__name">Therapist</span>
            <span className="role-card__desc">Edit the exercise plan and review sessions.</span>
          </span>
          <Icon name="forward" className="role-card__chevron" />
        </button>
      </div>

      <p className="footnote">Data is stored locally in this browser.</p>
    </div>
  );
}
