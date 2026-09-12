import Icon from "../components/Icon";

type Props = {
  peerName: string;
  /** Present when reached from the therapist's inbox; absent for the patient tab. */
  onBack?: () => void;
};

export default function ChatScreen({ peerName, onBack }: Props) {
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
        <h1>{peerName}</h1>
        <p className="lede">
          {onBack
            ? "Conversation with this patient."
            : "Ask about your plan or let your therapist know how a session went."}
        </p>
      </header>

      <section className="card chat-panel" aria-label="Conversation">
        <div className="empty">
          <strong>No messages yet</strong>
          <span>Start the conversation below.</span>
        </div>
      </section>

      <form className="chat-composer" onSubmit={(event) => event.preventDefault()}>
        <input type="text" placeholder="Messaging isn't connected yet" disabled />
        <button type="submit" className="btn btn--icon" disabled aria-label="Send">
          <Icon name="forward" />
        </button>
      </form>
    </div>
  );
}
