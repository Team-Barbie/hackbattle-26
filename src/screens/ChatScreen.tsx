import { useEffect, useRef, useState, type FormEvent } from "react";
import Icon from "../components/Icon";
import { formatDay, formatTime } from "../content/exerciseMeta";
import {
  clearClinicChat,
  fetchClinicMessages,
  sendClinicMessage,
  subscribeClinic,
  type ClinicMessage,
  type ClinicMessageSender,
} from "../state/clinicCloud";

type Props = {
  peerName: string;
  patientName: string;
  sender: ClinicMessageSender;
  clinicCode: string;
  cloudEnabled: boolean;
  /** Present when reached from the therapist's inbox; absent for the patient tab. */
  onBack?: () => void;
};

function sameThread(message: ClinicMessage, patientName: string): boolean {
  return message.patientName.trim().toLowerCase() === patientName.trim().toLowerCase();
}

export default function ChatScreen({
  peerName,
  patientName,
  sender,
  clinicCode,
  cloudEnabled,
  onBack,
}: Props) {
  const [messages, setMessages] = useState<ClinicMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [loading, setLoading] = useState(cloudEnabled && Boolean(clinicCode));
  const threadRef = useRef<HTMLDivElement>(null);
  const ready = cloudEnabled && Boolean(clinicCode) && Boolean(patientName.trim());

  useEffect(() => {
    if (!ready) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const thread = await fetchClinicMessages(clinicCode, patientName);
        if (!cancelled) {
          setMessages(thread);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Could not load messages.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    let unsubscribe: () => void = () => undefined;

    try {
      unsubscribe = subscribeClinic(
        clinicCode,
        {
          onMessage(message) {
            if (!sameThread(message, patientName)) {
              return;
            }

            setMessages((current) =>
              current.some((item) => item.id === message.id) ? current : [...current, message],
            );
          },
          onChatCleared(name, clearedAt) {
            if (name.trim().toLowerCase() !== patientName.trim().toLowerCase()) {
              return;
            }

            const cutoff = Date.parse(clearedAt);
            setMessages((current) => current.filter((item) => Date.parse(item.sentAt) > cutoff));
          },
        },
        "chat",
      );
    } catch {
      // Live updates are optional; the thread still loads from fetch.
    }

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [clinicCode, patientName, ready]);

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) {
      thread.scrollTop = thread.scrollHeight;
    }
  }, [messages, loading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!ready || sending) {
      return;
    }

    const body = draft.trim();
    if (!body) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      const sent = await sendClinicMessage(clinicCode, patientName, sender, body);
      setDraft("");
      setMessages((current) => (current.some((item) => item.id === sent.id) ? current : [...current, sent]));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send that message.");
    } finally {
      setSending(false);
    }
  }

  async function handleClear() {
    if (!ready || clearing || messages.length === 0) {
      return;
    }

    if (!window.confirm("Clear this conversation for both sides? New messages can still be sent.")) {
      return;
    }

    setClearing(true);
    setError(null);

    try {
      await clearClinicChat(clinicCode, patientName);
      setMessages([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not clear this conversation.");
    } finally {
      setClearing(false);
    }
  }

  const placeholder = !cloudEnabled
    ? "Add Supabase keys to enable messaging"
    : !clinicCode
      ? onBack
        ? "Publish a plan with an access code first"
        : "Sign in with your therapist's access code"
      : "Write a message";

  return (
    <div className={`screen${onBack ? "" : " page"}`}>
      {onBack && (
        <div className="screen__top">
          <button type="button" className="back-link" onClick={onBack}>
            <Icon name="back" />
            Inbox
          </button>
        </div>
      )}

      <header className="page__header">
        <p className="eyebrow">Messages</p>
        <div className="chat-heading">
          <h1>{peerName}</h1>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={!ready || clearing || messages.length === 0}
            onClick={() => void handleClear()}
          >
            {clearing ? "Clearing…" : "Clear chat"}
          </button>
        </div>
        <p className="lede">
          {onBack
            ? "Conversation with this patient."
            : "Ask about your plan or let your therapist know how a session went."}
        </p>
      </header>

      <section className={`card chat-panel${messages.length === 0 ? " is-empty" : ""}`} aria-label="Conversation">
        {loading ? (
          <div className="empty">
            <strong>Loading messages</strong>
            <span>Fetching this conversation.</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty">
            <strong>No messages yet</strong>
            <span>{ready ? "Start the conversation below." : placeholder}</span>
          </div>
        ) : (
          <div className="chat-thread" ref={threadRef}>
            {messages.map((message) => {
              const mine = message.sender === sender;
              return (
                <article
                  key={message.id}
                  className={`chat-bubble${mine ? " chat-bubble--mine" : " chat-bubble--theirs"}`}
                >
                  <p>{message.body}</p>
                  <time dateTime={message.sentAt}>
                    {formatDay(message.sentAt)} · {formatTime(message.sentAt)}
                  </time>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {error && <p className="notice notice--error">{error}</p>}

      <form className="chat-composer" onSubmit={handleSubmit}>
        <input
          type="text"
          value={draft}
          maxLength={1000}
          placeholder={placeholder}
          disabled={!ready || sending}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Message"
        />
        <button
          type="submit"
          className="btn btn--icon"
          disabled={!ready || sending || !draft.trim()}
          aria-label="Send"
        >
          <Icon name="forward" />
        </button>
      </form>
    </div>
  );
}
