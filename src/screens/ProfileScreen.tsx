import type { PatientProfile } from "../state/patientProfile";

type Props = {
  profile: PatientProfile;
  onSwitchUser: () => void;
};

export default function ProfileScreen({ profile, onSwitchUser }: Props) {
  const joined = new Date(profile.createdAt).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="page">
      <header className="page-header">
        <p className="app-eyebrow">Profile</p>
        <h1>{profile.name}</h1>
      </header>

      <section className="panel">
        <p className="panel-title">Patient since</p>
        <p className="plan-detail">{joined}</p>
      </section>

      <button type="button" className="secondary block" onClick={onSwitchUser}>
        Switch user
      </button>
    </div>
  );
}
