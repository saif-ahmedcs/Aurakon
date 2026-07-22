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
  try {
    const [result] = await db.query(
      `INSERT INTO pending_review_sessions (habit_id, last_missed_date, active_habit_id, opened_at)
       VALUES (?, ?, ?, UTC_TIMESTAMP())`,
      [habitId, lastMissedDate, habitId],
    );
    return result.insertId;
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return null;
    }
    throw err;
  }
}

async function updateLastMissedDate(sessionId, lastMissedDate, db = pool) {
  await db.query(
    `UPDATE pending_review_sessions
     SET last_missed_date = GREATEST(last_missed_date, ?)
     WHERE id = ?`,
    [lastMissedDate, sessionId],
  );
}

async function resolve(sessionId, db = pool) {
  await db.query(
    `UPDATE pending_review_sessions SET status = 'resolved', active_habit_id = NULL WHERE id = ?`,
    [sessionId],
  );
}

async function resolveIfNoPending(habitId, db = pool) {
  const [result] = await db.query(
    `UPDATE pending_review_sessions
     SET status = 'resolved', active_habit_id = NULL
     WHERE habit_id = ?
       AND status = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM habit_logs
         JOIN habits ON habits.id = habit_logs.habit_id
         WHERE habit_logs.review_session_id = pending_review_sessions.id
           AND habit_logs.status = 'pending_review'
           AND habits.archived_at IS NULL
       )`,
    [habitId],
  );
  return result.affectedRows > 0;
}

module.exports = {
  findActiveByHabit,
  create,
  updateLastMissedDate,
  resolve,
  resolveIfNoPending,
};
