const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PRESENT_STATUSES = new Set(["completed", "recovered", "shielded"]);

function parseToUTCDay(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function calculateStreaks(logs, asOfDate) {
  const asOfDay = parseToUTCDay(asOfDate);

  // One status per day (UNIQUE(habit_id, log_date) guarantees at most one
  // row per date anyway
  const statusByDay = new Map();
  for (const log of logs) {
    const day = parseToUTCDay(log.date);
    if (day <= asOfDay) {
      statusByDay.set(day, log.status);
    }
  }

  function isBridgedOrAdjacent(fromDay, toDay) {
    const diffDays = (toDay - fromDay) / MS_PER_DAY;
    if (diffDays <= 1) return true;
    if (diffDays === 2) {
      return statusByDay.get(fromDay + MS_PER_DAY) === "pending_review";
    }
    return false;
  }

  const presentDays = [...statusByDay.entries()]
    .filter(([, status]) => PRESENT_STATUSES.has(status))
    .map(([day]) => day)
    .sort((a, b) => a - b);

  if (presentDays.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
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

  return { currentStreak, longestStreak };
}

function isFullDayCompletion(habitsForDay) {
  if (!Array.isArray(habitsForDay) || habitsForDay.length === 0) {
    return false;
  }
  return habitsForDay.every((h) => PRESENT_STATUSES.has(h.status));
}

module.exports = { calculateStreaks, isFullDayCompletion };
