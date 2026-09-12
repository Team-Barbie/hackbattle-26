export type PatientTab = "home" | "program" | "progress" | "profile";

type Props = {
  active: PatientTab;
  onSelect: (tab: PatientTab) => void;
};

const TABS: Array<{ id: PatientTab; label: string }> = [
  { id: "home", label: "Home" },
  { id: "program", label: "Program" },
  { id: "progress", label: "Progress" },
  { id: "profile", label: "Profile" },
];

export default function TabBar({ active, onSelect }: Props) {
  return (
    <nav className="tab-bar" aria-label="Primary">
      {TABS.map((tab) => (
        <button
          type="button"
          key={tab.id}
          className={`tab-bar-item${tab.id === active ? " is-active" : ""}`}
          onClick={() => onSelect(tab.id)}
          aria-current={tab.id === active ? "page" : undefined}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
