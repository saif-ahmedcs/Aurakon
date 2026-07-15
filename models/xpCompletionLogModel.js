const { pool } = require("../db");

async function findAward(habitId, logDate, db = pool) {
  const [rows] = await db.query(
    `SELECT id, xp_amount FROM xp_completion_log
     WHERE habit_id = ? AND log_date = ?
     LIMIT 1`,
    [habitId, logDate],
  );
  return rows[0] || null;
}

async function insertAward(userId, habitId, logDate, xpAmount, db = pool) {
  await db.query(
    `INSERT INTO xp_completion_log (user_id, habit_id, log_date, xp_amount)
     VALUES (?, ?, ?, ?)`,
    [userId, habitId, logDate, xpAmount],
  );
}

async function deleteAward(habitId, logDate, db = pool) {
  const [result] = await db.query(
    `DELETE FROM xp_completion_log WHERE habit_id = ? AND log_date = ?`,
    [habitId, logDate],
  );
  return result.affectedRows;
}

module.exports = { findAward, insertAward, deleteAward };
