import Icon from "../components/Icon";
import type { Prescription } from "../exercises/prescription";
import { currentStreak, totalReps, type PatientProfile } from "../state/patientProfile";

type Props = {
  profile: PatientProfile;
  plan: Prescription;
  onClearHistory: () => void;
  onSwitchUser: () => void;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ProfileScreen({ profile, plan, onClearHistory, onSwitchUser }: Props) {
  const joined = new Date(profile.createdAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="screen page">
      <header className="page__header">
        <p className="eyebrow">Profile</p>
      </header>

      <div className="profile-head">
        <span className="avatar" aria-hidden="true">
          {initials(profile.name) || "?"}
        </span>
        <div>
          <h1 style={{ fontSize: "1.6rem" }}>{profile.name}</h1>
          <p className="muted" style={{ fontSize: "0.86rem" }}>
            Patient since {joined}
          </p>
        </div>
      </div>

      <section className="card">
        <p className="card__title">Care team</p>
        <dl className="kv">
          <div>
            <dt>Therapist</dt>
            <dd>{plan.therapist}</dd>
          </div>
          <div>
            <dt>Current plan</dt>
            <dd>{plan.title}</dd>
          </div>
          <div>
            <dt>Sessions</dt>
            <dd>{profile.sessions.length}</dd>
          </div>
          <div>
            <dt>Reps logged</dt>
            <dd>{totalReps(profile)}</dd>
          </div>
          <div>
            <dt>Streak</dt>
            <dd>{currentStreak(profile)} days</dd>
          </div>
          <div>
            <dt>Storage</dt>
            <dd>This device only</dd>
          </div>
        </dl>
      </section>

      <div className="profile-actions">
        <button
          type="button"
          className="btn btn--outline btn--block"
          onClick={onClearHistory}
          disabled={profile.sessions.length === 0}
        >
          <Icon name="trash" width={16} height={16} />
          Clear session history
        </button>
        <button type="button" className="btn btn--ghost btn--block" onClick={onSwitchUser}>
          Switch user
        </button>
      </div>
    </div>
  );
}
