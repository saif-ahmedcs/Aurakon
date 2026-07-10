const { pool } = require("../db");

async function getByDate(userId, date) {
  const [rows] = await pool.query(
    "SELECT * FROM daily_aura_stats WHERE user_id = ? AND stat_date = ?",
    [userId, date],
  );
  return rows[0] || null;
}

async function upsertEnergy(userId, date, delta) {
  await pool.query(
    `INSERT INTO daily_aura_stats (user_id, stat_date, aura_energy, total_habits, completed_habits)
     VALUES (?, ?, ?, 0, 0)
     ON DUPLICATE KEY UPDATE aura_energy = aura_energy + VALUES(aura_energy)`,
    [userId, date, delta],
  );
}

async function markFullCompletion(userId, date) {
  const [result] = await pool.query(
    `UPDATE daily_aura_stats
     SET full_completion = true
     WHERE user_id = ? AND stat_date = ?`,
    [userId, date],
  );
  return result.affectedRows;
}

async function getLifetimeStats(userId) {
  const [rows] = await pool.query(
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
  markFullCompletion,
  getLifetimeStats,
};
