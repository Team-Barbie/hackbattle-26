import type { Prescription } from "../exercises/prescription";
import { currentStreak, totalReps, type PatientProfile } from "../state/patientProfile";

type Props = {
  profile: PatientProfile;
  plan: Prescription;
  onClearHistory: () => void;
  onSwitchUser: () => void;
};

export default function ProfileScreen({ profile, plan, onClearHistory, onSwitchUser }: Props) {
  const joined = new Date(profile.createdAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="screen page">
      <header className="page__header">
        <h1>{profile.name}</h1>
        <p className="label">Patient since {joined}</p>
      </header>

      <section className="card">
        <h2 className="section-title">Details</h2>
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
            <dd>This browser only</dd>
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
          Clear session history
        </button>
        <button type="button" className="btn btn--ghost btn--block" onClick={onSwitchUser}>
          Sign out
        </button>
      </div>
    </div>
  );
}
