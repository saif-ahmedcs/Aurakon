const { pool } = require("../db");

async function getByDate(userId, date, db = pool) {
  const [rows] = await db.query(
    "SELECT * FROM daily_aura_stats WHERE user_id = ? AND stat_date = ?",
    [userId, date],
  );
  return rows[0] || null;
}

async function lockRow(userId, date, db = pool) {
  await db.query(
    `INSERT INTO daily_aura_stats (user_id, stat_date, total_habits, completed_habits)
     VALUES (?, ?, 0, 0)
     ON DUPLICATE KEY UPDATE id = id`,
    [userId, date],
  );
  await db.query(
    `SELECT id FROM daily_aura_stats WHERE user_id = ? AND stat_date = ? FOR UPDATE`,
    [userId, date],
  );
}

async function getLatestStatDate(userId, db = pool) {
  const [rows] = await db.query(
    `SELECT MAX(stat_date) AS latestDate FROM daily_aura_stats WHERE user_id = ?`,
    [userId],
  );
  return rows[0] ? rows[0].latestDate : null;
}

async function upsertCounts(
  userId,
  date,
  totalHabits,
  completedHabits,
  fullCompletion,
  auraEnergy,
  db = pool,
) {
  await db.query(
    `INSERT INTO daily_aura_stats (user_id, stat_date, aura_energy, total_habits, completed_habits, full_completion)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       aura_energy = VALUES(aura_energy),
       total_habits = VALUES(total_habits),
       completed_habits = VALUES(completed_habits),
       full_completion = VALUES(full_completion)`,
    [userId, date, auraEnergy, totalHabits, completedHabits, fullCompletion],
  );
}

async function getFullCompletionDates(userId, db = pool, forUpdate = false) {
  const [rows] = await db.query(
    `SELECT stat_date FROM daily_aura_stats
     WHERE user_id = ? AND full_completion = true
     ORDER BY stat_date ASC${forUpdate ? " FOR UPDATE" : ""}`,
    [userId],
  );
  return rows;
}

async function getFullCompletionDatesUpTo(userId, date, db = pool) {
  const [rows] = await db.query(
    `SELECT stat_date FROM daily_aura_stats
     WHERE user_id = ? AND full_completion = true AND stat_date <= ?
     ORDER BY stat_date ASC`,
    [userId, date],
  );
  return rows;
}

async function getLifetimeStats(userId, db = pool) {
  const [rows] = await db.query(
    `SELECT
       SUM(CASE WHEN full_completion = true THEN 1 ELSE 0 END) AS fullyCompletedDays,
       SUM(completed_habits) AS lifetimeCompleted,
       SUM(total_habits) AS lifetimeTotal,
       COUNT(*) AS daysTracked
     FROM daily_aura_stats
     WHERE user_id = ?`,
    [userId],
  );
  const row = rows[0];
  return {
    fullyCompletedDays: Number(row.fullyCompletedDays) || 0,
    lifetimeCompleted: Number(row.lifetimeCompleted) || 0,
    lifetimeTotal: Number(row.lifetimeTotal) || 0,
    // Distinct calendar days with a stats row - one per (user_id, stat_date)
    // thanks to the unique_user_date constraint, so this is a true count of
    // elapsed tracked days regardless of how many habits are active.
    daysTracked: Number(row.daysTracked) || 0,
  };
}

module.exports = {
  getByDate,
  lockRow,
  getLatestStatDate,
  upsertCounts,
  getLifetimeStats,
  getFullCompletionDates,
  getFullCompletionDatesUpTo,
};
