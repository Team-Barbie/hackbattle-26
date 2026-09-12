import { squatGuide } from "../coaching/exerciseGuide";

type Props = {
  onOpenSquat: () => void;
};

const COMING_SOON = ["Lunges", "Glute bridges"];

export default function ProgramScreen({ onOpenSquat }: Props) {
  return (
    <div className="page">
      <header className="page-header">
        <p className="app-eyebrow">Program</p>
        <h1>Your exercises</h1>
      </header>

      <ul className="exercise-list">
        <li>
          <button type="button" className="exercise-tile" onClick={onOpenSquat}>
            <span className="exercise-tile-name">{squatGuide.name}</span>
            <span className="exercise-tile-detail">{squatGuide.summary}</span>
          </button>
        </li>

        {COMING_SOON.map((name) => (
          <li key={name}>
            <div className="exercise-tile is-disabled">
              <span className="exercise-tile-name">{name}</span>
              <span className="exercise-tile-badge">Coming soon</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
