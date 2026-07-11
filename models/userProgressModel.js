const { pool } = require("../db");

async function getProgress(userId, db = pool) {
  const [rows] = await db.query(
    `SELECT current_level, global_daily_streak, last_full_completion_date, total_xp, shield_balance
     FROM users WHERE id = ?`,
    [userId],
  );
  return rows[0] || null;
}

async function updateLevel(userId, currentLevel, db = pool) {
  await db.query(
    "UPDATE users SET current_level = GREATEST(current_level, ?) WHERE id = ?",
    [currentLevel, userId],
  );
}

async function updateGlobalDailyStreak(userId, globalDailyStreak) {
  await pool.query("UPDATE users SET global_daily_streak = ? WHERE id = ?", [
    globalDailyStreak,
    userId,
  ]);
}

async function updateLastFullCompletionDate(userId, date) {
  await pool.query(
    "UPDATE users SET last_full_completion_date = ? WHERE id = ?",
    [date, userId],
  );
}

// ------------- SHIELD WALLET ---------------

async function getShieldBalance(userId) {
  const [rows] = await pool.query(
    "SELECT shield_balance FROM users WHERE id = ?",
    [userId],
  );
  return rows[0] ? rows[0].shield_balance : null;
}

async function incrementShieldBalance(userId) {
  await pool.query(
    "UPDATE users SET shield_balance = shield_balance + 1 WHERE id = ?",
    [userId],
  );
}

async function decrementShieldBalanceIfAvailable(userId) {
  const [result] = await pool.query(
    "UPDATE users SET shield_balance = shield_balance - 1 WHERE id = ? AND shield_balance > 0",
    [userId],
  );
  return result.affectedRows > 0;
}

module.exports = {
  getProgress,
  updateLevel,
  updateGlobalDailyStreak,
  updateLastFullCompletionDate,
  getShieldBalance,
  incrementShieldBalance,
  decrementShieldBalanceIfAvailable,
};
