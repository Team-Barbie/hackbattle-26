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
        <p className="eyebrow">Patient sign-in</p>
        <h1 className="display">Welcome back</h1>
        <p className="lede">
          Your plan from {therapistName} is ready. Tell us who you are to pick it up.
        </p>
      </div>

      <form className="auth-form card" onSubmit={handleSubmit}>
        <label className="field">
          <span>Your name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Jamie Rivera"
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
            placeholder="e.g. RH-4821"
            autoComplete="off"
          />
        </label>

        <button type="submit" className="btn btn--lg btn--block btn--glow" disabled={!trimmed}>
          Continue
          <Icon name="forward" width={18} height={18} />
        </button>
      </form>
    </div>
  );
}
