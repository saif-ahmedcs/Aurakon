const { pool } = require("../db");

async function getProgress(userId, db = pool, forUpdate = false) {
  const [rows] = await db.query(
    `SELECT current_level, global_daily_streak, last_full_completion_date, total_xp, shield_balance
     FROM users WHERE id = ?${forUpdate ? " FOR UPDATE" : ""}`,
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

async function updateGlobalDailyStreak(userId, globalDailyStreak, db = pool) {
  await db.query("UPDATE users SET global_daily_streak = ? WHERE id = ?", [
    globalDailyStreak,
    userId,
  ]);
}

async function resetStaleGlobalStreak(userId, asOfDate, db = pool) {
  const [result] = await db.query(
    `UPDATE users
     SET global_daily_streak = 0
     WHERE id = ?
       AND global_daily_streak != 0
       AND last_full_completion_date IS NOT NULL
       AND DATEDIFF(?, last_full_completion_date) > 1`,
    [userId, asOfDate],
  );
  return result.affectedRows > 0;
}

async function updateLastFullCompletionDate(userId, date, db = pool) {
  await db.query(
    "UPDATE users SET last_full_completion_date = ? WHERE id = ?",
    [date, userId],
  );
}

// ------------- SHIELD WALLET ---------------

async function setShieldBalance(userId, balance, db = pool) {
  await db.query("UPDATE users SET shield_balance = ? WHERE id = ?", [
    balance,
    userId,
  ]);
}

module.exports = {
  getProgress,
  updateLevel,
  updateGlobalDailyStreak,
  resetStaleGlobalStreak,
  updateLastFullCompletionDate,
  setShieldBalance,
};
