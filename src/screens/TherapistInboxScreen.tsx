import Brand from "../components/Brand";
import Icon from "../components/Icon";
import { currentStreak, type PatientProfile } from "../state/patientProfile";

type Props = {
  /** This device only ever holds one patient today; the list shape is ready for more. */
  patient: PatientProfile | null;
  onOpenChat: (patientName: string) => void;
  onBack: () => void;
};

export default function TherapistInboxScreen({ patient, onOpenChat, onBack }: Props) {
  const patients = patient ? [patient] : [];

  return (
    <div className="screen studio">
      <div className="screen__top">
        <button type="button" className="back-link" onClick={onBack}>
          <Icon name="back" />
          Studio
        </button>
        <Brand />
      </div>

      <header className="page__header">
        <p className="eyebrow">Messages</p>
        <h1>Inbox</h1>
        <p className="lede">Conversations with your patients.</p>
      </header>

      {patients.length === 0 ? (
        <div className="empty">
          <strong>No patients yet</strong>
          <span>Once someone signs in as a patient, they'll show up here.</span>
        </div>
      ) : (
        <ul className="list">
          {patients.map((person) => (
            <li key={person.name}>
              <button
                type="button"
                className="row"
                style={{ width: "100%" }}
                onClick={() => onOpenChat(person.name)}
              >
                <div>
                  <p className="row__title">{person.name}</p>
                  <p className="row__sub">
                    {person.sessions.length} sessions · {currentStreak(person)}-day streak
                  </p>
                </div>
                <Icon name="forward" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
