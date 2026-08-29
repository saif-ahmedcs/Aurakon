/* ---------------------------------------------------------------- */
/* Today's Trials - the habits panel (highest priority content)      */
/* ---------------------------------------------------------------- */

import { HabitRow } from "./HabitRow";

export function HabitsPanel({
  habits,
  openMenuId,
  onToggleMenu,
  onToggleComplete,
  checkInLocked,
  onAction,
  onOpenDetail,
  onAddHabit,
  sectionRef,
  atHabitLimit,
  currentHabitCount,
  habitLimit,
}) {
  return (
    <section
      className="glass-panel habits-panel"
      aria-label="Today's trials"
      ref={sectionRef}
    >
      <div className="panel-header">
        <h2 className="eyebrow">Today's Trials</h2>
        <button
          type="button"
          className={`add-habit-btn ${atHabitLimit ? "btn-disabled" : ""}`}
          onClick={onAddHabit}
          disabled={atHabitLimit}
        >
          {atHabitLimit ? "Limit Reached" : "+ New Trial"}
        </button>
      </div>

      {atHabitLimit && (
        <p className="habit-limit-info at-limit" style={{ margin: "0 0 14px", textAlign: "center" }}>
          {currentHabitCount} / {habitLimit} active trials — limit reached for your current level
        </p>
      )}

      <ul className="habit-list">
        {habits.map((h) => (
          <HabitRow
            key={h.id}
            habit={h}
            isMenuOpen={openMenuId === h.id}
            onToggleMenu={onToggleMenu}
            onToggleComplete={onToggleComplete}
            checkInLocked={checkInLocked}
            onAction={onAction}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </ul>
    </section>
  );
}
