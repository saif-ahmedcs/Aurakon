"use client";

import { GLOBAL_STREAK_LOGO } from "../../../constants/assets";
import { XpIcon, ShieldIcon } from "./icons";

/* ---------------------------------------------------------------- */
/* Overall stats - lowest priority, grouped at the end of the page.  */
/* Lifetime XP and the global streak are backend-provided             */
/* (GET /api/progress: totalXp / globalDailyStreak).                  */
/* ---------------------------------------------------------------- */

export function OverallStatsSection({
  shieldsAvailable,
  lifetimeXpLabel,
  globalStreakDays,
  sectionRef,
}) {
  return (
    <section
      className="bottom-stats-section"
      aria-label="Overall progress"
      ref={sectionRef}
    >
      <h2 className="eyebrow bottom-stats-eyebrow">Overall Progress</h2>
      <div className="bottom-stats">
        <div className="glass-panel bottom-stat bottom-stat-level bottom-stat-shields">
          <span className="bottom-stat-label">Total XP Earned</span>
          <span className="bottom-stat-value bottom-stat-value-hero">
            {lifetimeXpLabel}
          </span>
          <span className="bottom-stat-sub">
            Lifetime accumulated XP
          </span>
          <XpIcon size={110} className="bottom-stat-shields-icon" />
        </div>
        <div className="glass-panel bottom-stat bottom-stat-streak">
          <div className="bottom-stat-streak-head">
            <span className="bottom-stat-label">Global Streak</span>
            <span className="bottom-stat-value">
              {globalStreakDays}
              <span className="bottom-stat-value-sub"> days</span>
            </span>
          </div>
          <img
            src={GLOBAL_STREAK_LOGO}
            alt="Global Streak"
            className="bottom-stat-streak-logo"
          />
          <span className="bottom-stat-sub">
            Complete All Habits to Keep Your Global Streak
          </span>
        </div>
        <div className="glass-panel bottom-stat bottom-stat-xp">
          <span className="bottom-stat-label">Shields</span>
          <span className="bottom-stat-value">{shieldsAvailable}</span>
          <ShieldIcon size={110} className="bottom-stat-xp-icon-big" />
          {/* Mirrors the backend earning rules: hard habits earn a
              shield every 30 present days, medium every 45; easy
              habits are not shield-eligible. */}
          <span className="bottom-stat-sub">
            Keep a Hard habit going for 30 days (45 for Medium) to earn a
            new shield
          </span>
        </div>
      </div>
    </section>
  );
}
