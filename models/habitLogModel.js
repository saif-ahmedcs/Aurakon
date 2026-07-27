const { pool } = require("../db");

async function expireStaleReviewsForUser(userId, cutoffDate, db = pool) {
  const [staleLogs] = await db.query(
    `SELECT habit_logs.id, habit_logs.habit_id, habit_logs.log_date, habit_logs.review_session_id
     FROM habit_logs
     JOIN habits ON habits.id = habit_logs.habit_id
     WHERE habits.user_id = ?
       AND habit_logs.status = 'pending_review'
       AND habit_logs.log_date <= ? FOR UPDATE`,
    [userId, cutoffDate],
  );

  if (staleLogs.length === 0) {
    return [];
  }

  const staleIds = staleLogs.map((row) => row.id);
  await db.query(
    `UPDATE habit_logs SET status = 'missed' WHERE id IN (?) AND status = 'pending_review'`,
    [staleIds],
  );

  const sessionIds = [
    ...new Set(staleLogs.map((row) => row.review_session_id)),
  ];
  for (const sessionId of sessionIds) {
    await db.query(
      `UPDATE pending_review_sessions
       SET status = 'resolved', active_habit_id = NULL
       WHERE id = ?
         AND NOT EXISTS (
           SELECT 1 FROM habit_logs
           WHERE review_session_id = ? AND status = 'pending_review'
         )`,
      [sessionId, sessionId],
    );
  }

  return staleLogs.map((row) => ({
    habitId: row.habit_id,
    logDate: row.log_date,
  }));
}

async function getHabitsMissingLogForDate(userId, logDate, db = pool) {
  const [rows] = await db.query(
    `SELECT habits.id, habits.title, habits.created_at, habits.archived_at
     FROM habits
      WHERE habits.user_id = ?
       AND NOT EXISTS (
         SELECT 1 FROM habit_logs
         WHERE habit_logs.habit_id = habits.id
           AND habit_logs.log_date = ?
       )`,
    [userId, logDate],
  );
  return rows;
}

async function getLogsForHabit(habitId, db = pool) {
  const [rows] = await db.query(
    `SELECT log_date, status FROM habit_logs WHERE habit_id = ?`,
    [habitId],
  );
  return rows;
}

async function insertPendingReviewLog(habitId, logDate, sessionId, db = pool) {
  await db.query(
    `INSERT IGNORE INTO habit_logs (habit_id, log_date, status, review_session_id, created_at)
     VALUES (?, ?, 'pending_review', ?, UTC_TIMESTAMP())`,
    [habitId, logDate, sessionId],
  );
}

async function insertMissedLog(habitId, logDate, db = pool) {
  await db.query(
    `INSERT IGNORE INTO habit_logs (habit_id, log_date, status, created_at)
     VALUES (?, ?, 'missed', UTC_TIMESTAMP())`,
    [habitId, logDate],
  );
}

async function expirePendingLogsForSession(sessionId, db = pool) {
  const [rows] = await db.query(
    `SELECT id, habit_id, log_date FROM habit_logs
     WHERE review_session_id = ? AND status = 'pending_review' FOR UPDATE`,
    [sessionId],
  );

  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((row) => row.id);
  await db.query(
    `UPDATE habit_logs SET status = 'missed' WHERE id IN (?) AND status = 'pending_review'`,
    [ids],
  );

  return rows.map((row) => ({ habitId: row.habit_id, logDate: row.log_date }));
}

async function findPendingForUser(userId, db = pool) {
  const [rows] = await db.query(
    `SELECT habit_logs.id,
            habit_logs.habit_id,
            habit_logs.review_session_id,
            habits.title AS habit_name,
            habit_logs.log_date AS missed_date,
            habit_logs.created_at
     FROM habit_logs
     JOIN habits ON habit_logs.habit_id = habits.id
     WHERE habit_logs.status = 'pending_review'
       AND habits.user_id = ?
       AND habits.archived_at IS NULL
     ORDER BY habit_logs.habit_id ASC, habit_logs.log_date ASC`,
    [userId],
  );
  return rows;
}

async function findPendingByHabitAndDate(habitId, logDate, userId, db = pool) {
  const [rows] = await db.query(
    `SELECT habit_logs.id,
            habit_logs.habit_id,
            habits.title AS habit_name,
            habit_logs.log_date AS missed_date,
            habit_logs.created_at
     FROM habit_logs
     JOIN habits ON habit_logs.habit_id = habits.id
     WHERE habit_logs.status = 'pending_review'
       AND habit_logs.habit_id = ?
       AND habit_logs.log_date = ?
       AND habits.user_id = ?
       AND habits.archived_at IS NULL FOR UPDATE`,
    [habitId, logDate, userId],
  );
  return rows[0] || null;
}

async function resolveDecision(habitLogId, status, db = pool) {
  const [result] = await db.query(
    `UPDATE habit_logs
     SET status = ?
     WHERE id = ? AND status = 'pending_review'`,
    [status, habitLogId],
  );
  return result.affectedRows;
}

async function findPendingByHabit(habitId, db = pool, forUpdate = false) {
  const [rows] = await db.query(
    `SELECT habit_logs.id,
            habit_logs.habit_id,
            habits.title AS habit_name,
            habit_logs.log_date AS missed_date,
            habit_logs.created_at
     FROM habit_logs
     JOIN habits ON habit_logs.habit_id = habits.id
     WHERE habit_logs.status = 'pending_review'
       AND habit_logs.habit_id = ?
       AND habits.archived_at IS NULL${forUpdate ? " FOR UPDATE" : ""}`,
    [habitId],
  );
  return rows[0] || null;
}

async function findAllPendingByHabit(habitId, db = pool) {
  const [rows] = await db.query(
    `SELECT habit_logs.id,
            habit_logs.habit_id,
            habit_logs.review_session_id,
            habits.title AS habit_name,
            habit_logs.log_date AS missed_date,
            habit_logs.created_at
     FROM habit_logs
     JOIN habits ON habit_logs.habit_id = habits.id
     WHERE habit_logs.status = 'pending_review'
       AND habit_logs.habit_id = ?
       AND habits.archived_at IS NULL
     ORDER BY habit_logs.log_date ASC`,
    [habitId],
  );
  return rows;
}

async function resolvePendingReviewsForHabit(habitId, db = pool) {
  const [result] = await db.query(
    `UPDATE habit_logs
     SET status = 'missed'
     WHERE habit_id = ? AND status = 'pending_review'`,
    [habitId],
  );
  return result.affectedRows;
}

async function revertShieldedLog(habitLogId, db = pool) {
  const [rows] = await db.query(
    `SELECT id, habit_id, log_date FROM habit_logs WHERE id = ? AND status = 'shielded' FOR UPDATE`,
    [habitLogId],
  );
  const row = rows[0];
  if (!row) return null;

  await db.query(
    `UPDATE habit_logs SET status = 'missed' WHERE id = ? AND status = 'shielded'`,
    [habitLogId],
  );
  return row;
}

async function findById(id, db = pool) {
  const [rows] = await db.query("SELECT * FROM habit_logs WHERE id = ?", [id]);
  return rows[0] || null;
}

async function findByHabitAndDate(habitId, logDate, db = pool) {
  const [rows] = await db.query(
    "SELECT * FROM habit_logs WHERE habit_id = ? AND log_date = ? FOR UPDATE",
    [habitId, logDate],
  );
  return rows[0] || null;
}

async function deleteCompletedLog(habitLogId, db = pool) {
  const [result] = await db.query(
    "DELETE FROM habit_logs WHERE id = ? AND status = 'completed'",
    [habitLogId],
  );
  return result.affectedRows;
}

async function insertLog(habitId, logDate, db = pool) {
  const [result] = await db.query(
    "INSERT INTO habit_logs (habit_id, log_date, status, created_at) VALUES (?, ?, 'completed', UTC_TIMESTAMP())",
    [habitId, logDate],
  );
  const [rows] = await db.query("SELECT * FROM habit_logs WHERE id = ?", [
    result.insertId,
  ]);
  return rows[0];
}

async function findAllByHabit(habitId, db = pool) {
  const [rows] = await db.query(
    "SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY log_date ASC",
    [habitId],
  );
  return rows;
}

async function getStatusesForUserAndDate(
  userId,
  logDate,
  db = pool,
  forUpdate = false,
) {
  const [rows] = await db.query(
    `SELECT habits.id AS habit_id,
            habits.difficulty AS difficulty,
            habits.created_at AS created_at,
            habits.archived_at AS archived_at,
            COALESCE(habit_logs.status, 'missing') AS status
     FROM habits
     LEFT JOIN habit_logs
       ON habit_logs.habit_id = habits.id
       AND habit_logs.log_date = ?
     WHERE habits.user_id = ?${forUpdate ? " FOR UPDATE" : ""}`,
    [logDate, userId],
  );
  return rows;
}

async function countPresentStatusesForDate(userId, logDate, db = pool) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM habit_logs
     JOIN habits ON habits.id = habit_logs.habit_id
     WHERE habits.user_id = ?
       AND habit_logs.log_date = ?
       AND habit_logs.status IN ('completed', 'recovered', 'shielded')`,
    [userId, logDate],
  );
  return Number(rows[0].count);
}

module.exports = {
  expireStaleReviewsForUser,
  getHabitsMissingLogForDate,
  getLogsForHabit,
  insertPendingReviewLog,
  expirePendingLogsForSession,
  findAllPendingByHabit,
  findPendingForUser,
  findPendingByHabit,
  findPendingByHabitAndDate,
  resolveDecision,
  resolvePendingReviewsForHabit,
  findById,
  revertShieldedLog,
  findByHabitAndDate,
  deleteCompletedLog,
  insertLog,
  findAllByHabit,
  getStatusesForUserAndDate,
  countPresentStatusesForDate,
};
