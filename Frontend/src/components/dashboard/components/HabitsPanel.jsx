/* ---------------------------------------------------------------- */
/* Today's Trials - the habits panel (highest priority content)      */
/* ---------------------------------------------------------------- */

import { HabitRow } from "./HabitRow";

export function HabitsPanel({
  habits,
  openMenuId,
  onToggleMenu,
  onToggleComplete,
  onAction,
  onOpenDetail,
  onAddHabit,
  sectionRef,
}) {
  return (
    <section
      className="glass-panel habits-panel"
      aria-label="Today's trials"
      ref={sectionRef}
    >
      <div className="panel-header">
        <h2 className="eyebrow">Today's Trials</h2>
        <button type="button" className="add-habit-btn" onClick={onAddHabit}>
          + New Trial
        </button>
      </div>

      <ul className="habit-list">
        {habits.map((h) => (
          <HabitRow
            key={h.id}
            habit={h}
            isMenuOpen={openMenuId === h.id}
            onToggleMenu={onToggleMenu}
            onToggleComplete={onToggleComplete}
            onAction={onAction}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </ul>
    </section>
  );
}
