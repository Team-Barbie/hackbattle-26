import Icon, { type IconName } from "./Icon";

export type PatientTab = "home" | "program" | "progress" | "profile";

type Props = {
  active: PatientTab;
  onSelect: (tab: PatientTab) => void;
};

const TABS: Array<{ id: PatientTab; label: string; icon: IconName }> = [
  { id: "home", label: "Home", icon: "home" },
  { id: "program", label: "Program", icon: "program" },
  { id: "progress", label: "Progress", icon: "progress" },
  { id: "profile", label: "Profile", icon: "profile" },
];

export default function TabBar({ active, onSelect }: Props) {
  return (
    <nav className="tab-bar" aria-label="Primary">
      {TABS.map((tab) => {
        const isActive = tab.id === active;

        return (
          <button
            type="button"
            key={tab.id}
            className={`tab-bar__item${isActive ? " is-active" : ""}`}
            onClick={() => onSelect(tab.id)}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon name={tab.icon} solid={isActive && tab.icon === "home"} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
