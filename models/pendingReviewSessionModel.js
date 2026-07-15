const { pool } = require("../db");

async function findActiveByHabit(habitId, db = pool) {
  const [rows] = await db.query(
    `SELECT id, habit_id, status, opened_at, last_missed_date
     FROM pending_review_sessions
     WHERE habit_id = ? AND status = 'active'
     FOR UPDATE`,
    [habitId],
  );
  return rows[0] || null;
}

async function create(habitId, lastMissedDate, db = pool) {
  const [result] = await db.query(
    `INSERT INTO pending_review_sessions (habit_id, last_missed_date)
     VALUES (?, ?)`,
    [habitId, lastMissedDate],
  );
  return result.insertId;
}

async function updateLastMissedDate(sessionId, lastMissedDate, db = pool) {
  await db.query(
    `UPDATE pending_review_sessions SET last_missed_date = ? WHERE id = ?`,
    [lastMissedDate, sessionId],
  );
}

async function resolve(sessionId, db = pool) {
  await db.query(
    `UPDATE pending_review_sessions SET status = 'resolved' WHERE id = ?`,
    [sessionId],
  );
}

module.exports = { findActiveByHabit, create, updateLastMissedDate, resolve };
