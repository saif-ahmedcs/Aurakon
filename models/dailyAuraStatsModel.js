const { pool } = require("../db");

async function getByDate(userId, date, db = pool) {
  const [rows] = await pool.query(
    "SELECT * FROM daily_aura_stats WHERE user_id = ? AND stat_date = ?",
    [userId, date],
  );
  return rows[0] || null;
}

async function upsertEnergy(userId, date, delta, db = pool) {
  await pool.query(
    `INSERT INTO daily_aura_stats (user_id, stat_date, aura_energy, total_habits, completed_habits)
     VALUES (?, ?, ?, 0, 0)
     ON DUPLICATE KEY UPDATE aura_energy = aura_energy + VALUES(aura_energy)`,
    [userId, date, delta],
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
  db = pool,
) {
  await db.query(
    `INSERT INTO daily_aura_stats (user_id, stat_date, aura_energy, total_habits, completed_habits, full_completion)
     VALUES (?, ?, 0, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       total_habits = VALUES(total_habits),
       completed_habits = VALUES(completed_habits),
       full_completion = VALUES(full_completion)`,
    [userId, date, totalHabits, completedHabits, fullCompletion],
  );
}

async function getLifetimeStats(userId, db = pool) {
  const [rows] = await db.query(
    `SELECT
       SUM(CASE WHEN full_completion = true THEN 1 ELSE 0 END) AS fullyCompletedDays,
       SUM(completed_habits) AS lifetimeCompleted,
       SUM(total_habits) AS lifetimeTotal
     FROM daily_aura_stats
     WHERE user_id = ?`,
    [userId],
  );
  const row = rows[0];
  return {
    fullyCompletedDays: Number(row.fullyCompletedDays) || 0,
    lifetimeCompleted: Number(row.lifetimeCompleted) || 0,
    lifetimeTotal: Number(row.lifetimeTotal) || 0,
  };
}

module.exports = {
  getByDate,
  upsertEnergy,
  getLatestStatDate,
  upsertCounts,
  getLifetimeStats,
};
