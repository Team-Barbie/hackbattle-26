import { useEffect, useMemo, useState } from "react";
import Brand from "../components/Brand";
import Icon from "../components/Icon";
import { formatDay, formatTime } from "../content/exerciseMeta";
import {
  fetchClinicMessages,
  mergeClinicInbox,
  subscribeClinic,
  type ClinicConversation,
  type ClinicMessage,
  type ClinicSession,
} from "../state/clinicCloud";
import { currentStreak, type PatientProfile } from "../state/patientProfile";

type Props = {
  patient: PatientProfile | null;
  clinicSessions: ClinicSession[];
  clinicCode: string;
  cloudEnabled: boolean;
  onOpenChat: (patientName: string) => void;
  onBack: () => void;
};

function conversationPreview(conversation: ClinicConversation, local: PatientProfile | null): string {
  if (conversation.lastMessage) {
    const who = conversation.lastMessage.sender === "therapist" ? "You" : conversation.patientName;
    return `${who}: ${conversation.lastMessage.body}`;
  }

  if (conversation.sessionCount > 0) {
    return `${conversation.sessionCount} sessions`;
  }

  if (local && local.name.trim().toLowerCase() === conversation.patientName.trim().toLowerCase()) {
    return `${local.sessions.length} sessions · ${currentStreak(local)}-day streak`;
  }

  return "No messages yet";
}

export default function TherapistInboxScreen({
  patient,
  clinicSessions,
  clinicCode,
  cloudEnabled,
  onOpenChat,
  onBack,
}: Props) {
  const [messages, setMessages] = useState<ClinicMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cloudEnabled || !clinicCode) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const thread = await fetchClinicMessages(clinicCode);
        if (!cancelled) {
          setMessages(thread);
          setError(null);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Could not load inbox.");
        }
      }
    })();

    const unsubscribe = subscribeClinic(
      clinicCode,
      {
        onMessage(message) {
          setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
        },
        onChatCleared(name, clearedAt) {
          const cutoff = Date.parse(clearedAt);
          setMessages((current) =>
            current.filter(
              (item) =>
                item.patientName.trim().toLowerCase() !== name.trim().toLowerCase() ||
                Date.parse(item.sentAt) > cutoff,
            ),
          );
        },
      },
      "inbox",
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [clinicCode, cloudEnabled]);

  const conversations = useMemo(
    () => mergeClinicInbox(clinicSessions, messages, patient ? [patient.name] : []),
    [clinicSessions, messages, patient],
  );

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

      {error && <p className="notice notice--error">{error}</p>}

      {conversations.length === 0 ? (
        <div className="empty">
          <strong>No patients yet</strong>
          <span>
            {cloudEnabled
              ? "Patients who sign in with this access code will show up here."
              : "Once someone signs in as a patient, they'll show up here."}
          </span>
        </div>
      ) : (
        <ul className="list">
          {conversations.map((conversation) => (
            <li key={conversation.patientName.toLowerCase()}>
              <button
                type="button"
                className="row"
                style={{ width: "100%" }}
                onClick={() => onOpenChat(conversation.patientName)}
              >
                <div>
                  <p className="row__title">{conversation.patientName}</p>
                  <p className="row__sub">{conversationPreview(conversation, patient)}</p>
                </div>
                <div className="row__end">
                  {conversation.lastMessage && (
                    <span className="row__sub">
                      {formatDay(conversation.lastMessage.sentAt)} · {formatTime(conversation.lastMessage.sentAt)}
                    </span>
                  )}
                  <Icon name="forward" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
