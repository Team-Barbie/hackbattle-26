import { useEffect, useMemo, useState, type FormEvent } from "react";
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
  onRefreshSessions?: () => void | Promise<void>;
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
  onRefreshSessions,
  onBack,
}: Props) {
  const [messages, setMessages] = useState<ClinicMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  const [targetName, setTargetName] = useState("");

  async function loadInbox(silent = false) {
    if (!cloudEnabled || !clinicCode) {
      setMessages([]);
      return;
    }

    if (silent) {
      setReloading(true);
    }

    try {
      const [thread] = await Promise.all([
        fetchClinicMessages(clinicCode),
        onRefreshSessions?.(),
      ]);
      setMessages(thread);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load inbox.");
    } finally {
      setReloading(false);
    }
  }

  useEffect(() => {
    if (!cloudEnabled || !clinicCode) {
      setMessages([]);
      return;
    }

    void loadInbox();

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
        <div className="chat-heading">
          <h1>Inbox</h1>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={!cloudEnabled || !clinicCode || reloading}
            onClick={() => void loadInbox(true)}
          >
            <Icon name="reset" />
            {reloading ? "Reloading…" : "Reload"}
          </button>
        </div>
        <p className="lede">Open a patient or type their name to send a message to that person only.</p>
      </header>

      <form
        className="chat-composer"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const name = targetName.trim();
          if (!name) {
            return;
          }

          onOpenChat(name);
        }}
      >
        <input
          type="text"
          value={targetName}
          maxLength={80}
          placeholder="Patient name, exactly as they signed in"
          onChange={(event) => setTargetName(event.target.value)}
          aria-label="Patient to message"
        />
        <button type="submit" className="btn btn--sm" disabled={!targetName.trim()}>
          Message
        </button>
      </form>

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
