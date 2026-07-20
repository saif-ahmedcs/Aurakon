/**
 * Calculates the streak for one habit.
 *
 * The streak can continue if a skipped day is still pending review.
 * This is only used for Guardian Shield rewards and is different from
 * the global daily streak in services/streakService.js.
 *
 */

const { MS_PER_DAY, parseToUTCDay, formatUTCDay } = require("./dateUtils");
const PRESENT_STATUSES = new Set(["completed", "recovered", "shielded"]);

function calculateHabitStreaks(logs, asOfDate) {
  const asOfDay = parseToUTCDay(asOfDate);

  const statusByDay = new Map();
  for (const log of logs) {
    const day = parseToUTCDay(log.date);
    if (day <= asOfDay) {
      statusByDay.set(day, log.status);
    }
  }

  function isBridgedOrAdjacent(fromDay, toDay) {
    const diffDays = (toDay - fromDay) / MS_PER_DAY;
    if (diffDays <= 1) return statusByDay.get(toDay) !== "missed";
    for (let day = fromDay + MS_PER_DAY; day < toDay; day += MS_PER_DAY) {
      if (statusByDay.get(day) !== "pending_review") return false;
    }
    return true;
  }

  const presentDays = [...statusByDay.entries()]
    .filter(([, status]) => PRESENT_STATUSES.has(status))
    .map(([day]) => day)
    .sort((a, b) => a - b);

  if (presentDays.length === 0) {
    return { currentStreak: 0, longestStreak: 0, currentStreakStartDate: null };
  }

  const runs = [];
  let runLength = 1;

  for (let i = 1; i < presentDays.length; i++) {
    if (isBridgedOrAdjacent(presentDays[i - 1], presentDays[i])) {
      runLength += 1;
    } else {
      runs.push({ length: runLength, endDay: presentDays[i - 1] });
      runLength = 1;
    }
  }
  runs.push({
    length: runLength,
    endDay: presentDays[presentDays.length - 1],
  });

  const longestStreak = Math.max(...runs.map((run) => run.length));

  const finalRun = runs[runs.length - 1];
  const currentStreak = isBridgedOrAdjacent(finalRun.endDay, asOfDay)
    ? finalRun.length
    : 0;
  const currentStreakStartDate =
    currentStreak > 0
      ? formatUTCDay(presentDays[presentDays.length - finalRun.length])
      : null;

  return { currentStreak, longestStreak, currentStreakStartDate };
}

function isFullDayCompletion(habitsForDay) {
  if (!Array.isArray(habitsForDay) || habitsForDay.length === 0) {
    return false;
  }
  return habitsForDay.every((h) => PRESENT_STATUSES.has(h.status));
}

module.exports = {
  calculateHabitStreaks,
  isFullDayCompletion,
  PRESENT_STATUSES,
};
