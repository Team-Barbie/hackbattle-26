import { useState, type FormEvent } from "react";
import Icon from "../components/Icon";

type Props = {
  therapistName: string;
  onLogin: (name: string) => void;
  onBack: () => void;
};

export default function LoginScreen({ therapistName, onLogin, onBack }: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const trimmed = name.trim();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (trimmed) {
      onLogin(trimmed);
    }
  }

  return (
    <div className="screen screen--narrow screen--centered">
      <div className="screen__top">
        <button type="button" className="back-link" onClick={onBack}>
          <Icon name="back" />
          Back
        </button>
      </div>

      <div className="page__header">
        <h1>Patient sign-in</h1>
        <p className="lede">Enter your name to open the plan from {therapistName}.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
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
            autoComplete="off"
          />
        </label>

        <button type="submit" className="btn btn--lg btn--block" disabled={!trimmed}>
          Continue
        </button>
      </form>
    </div>
  );
}
