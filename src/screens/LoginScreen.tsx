import { useState, type FormEvent } from "react";

type Props = {
  onLogin: (name: string) => void;
  onBack: () => void;
};

export default function LoginScreen({ onLogin, onBack }: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();

    if (!trimmed) {
      return;
    }

    onLogin(trimmed);
  }

  return (
    <div className="auth-shell">
      <button type="button" className="back-link" onClick={onBack}>
        ← Back
      </button>

      <div className="auth-copy">
        <p className="app-eyebrow">Patient sign-in</p>
        <h1>Welcome back</h1>
        <p className="auth-subtitle">Enter your name to continue your program.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Your name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Jamie Rivera"
            autoFocus
            required
          />
        </label>

        <label className="field">
          <span>
            Therapist code <em>(optional)</em>
          </span>
          <input
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="e.g. RH-4821"
          />
        </label>

        <button type="submit" className="block" disabled={!name.trim()}>
          Continue
        </button>
      </form>
    </div>
  );
}
