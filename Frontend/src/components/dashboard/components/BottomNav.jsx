import {
  HomeTabIcon,
  HabitsTabIcon,
  JourneyTabIcon,
  ProgressTabIcon,
} from "./icons";

export function BottomNav({ active, onNavigate }) {
  const items = [
    { id: "home", label: "Home", Icon: HomeTabIcon },
    { id: "habits", label: "Habits", Icon: HabitsTabIcon },
    { id: "journey", label: "Journey", Icon: JourneyTabIcon },
    { id: "progress", label: "Progress", Icon: ProgressTabIcon },
  ];
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={
            "bottom-nav-item" + (active === id ? " bottom-nav-item-active" : "")
          }
          onClick={() => onNavigate(id)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
