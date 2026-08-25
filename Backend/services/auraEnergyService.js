const { PRESENT_STATUSES } = require("../utils/streak");

const MAX_ENERGY = 100;

/* Aura energy is the day's completion rate: the share of the user's
 * active habits for that date that count as present (completed,
 * recovered or shielded - the same set used for completed_habits and
 * full_completion). Completing every existing habit therefore always
 * yields exactly 100%, no matter how many habits exist. */
function computeEnergyForDay(statuses) {
  const totalHabits = statuses.length;
  if (totalHabits === 0) {
    return 0;
  }

  const presentHabits = statuses.filter((row) =>
    PRESENT_STATUSES.has(row.status),
  ).length;

  return Math.round((presentHabits / totalHabits) * MAX_ENERGY);
}

module.exports = { computeEnergyForDay, MAX_ENERGY };
