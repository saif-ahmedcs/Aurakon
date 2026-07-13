const { pool } = require("../db");

async function expireStaleReviewsForUser(userId) {
  const [result] = await pool.query(
    `UPDATE habit_logs
     JOIN habits ON habit_logs.habit_id = habits.id
     SET habit_logs.status = 'missed'
     WHERE habit_logs.status = 'pending_review'
       AND habits.user_id = ?
       AND UTC_TIMESTAMP() > DATE_ADD(habit_logs.log_date, INTERVAL 48 HOUR)`,
    [userId],
  );
  return result.affectedRows;
}

async function getHabitsMissingLogForDate(userId, logDate) {
  const [rows] = await pool.query(
    `SELECT habits.id, habits.title
     FROM habits
     WHERE habits.user_id = ?
       AND DATE(habits.created_at) <= ?
       AND (habits.archived_at IS NULL OR DATE(habits.archived_at) >= ?)
       AND NOT EXISTS (
         SELECT 1 FROM habit_logs
         WHERE habit_logs.habit_id = habits.id
           AND habit_logs.log_date = ?
       )`,
    [userId, logDate, logDate, logDate],
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

async function insertPendingReview(habitId, logDate) {
  await pool.query(
    `INSERT IGNORE INTO habit_logs (habit_id, log_date, status, created_at)
     VALUES (?, ?, 'pending_review', UTC_TIMESTAMP())`,
    [habitId, logDate],
  );
}

async function findPendingForUser(userId) {
  const [rows] = await pool.query(
    `SELECT habit_logs.id,
            habit_logs.habit_id,
            habits.title AS habit_name,
            habit_logs.log_date AS missed_date,
            habit_logs.created_at
     FROM habit_logs
     JOIN habits ON habit_logs.habit_id = habits.id
     WHERE habit_logs.status = 'pending_review'
       AND habits.user_id = ?
       AND habits.archived_at IS NULL`,
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
       AND habits.archived_at IS NULL
     FOR UPDATE`,
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

async function findPendingByHabit(habitId, db = pool) {
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
       AND habits.archived_at IS NULL`,
    [habitId],
  );
  return rows[0] || null;
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
    "INSERT INTO habit_logs (habit_id, log_date, status) VALUES (?, ?, 'completed')",
    [habitId, logDate],
  );
  const [rows] = await db.query("SELECT * FROM habit_logs WHERE id = ?", [
    result.insertId,
  ]);
  return rows[0];
}

async function findAllByHabit(habitId) {
  const [rows] = await pool.query(
    "SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY log_date ASC",
    [habitId],
  );
  return rows;
}

async function getStatusesForUserAndDate(userId, logDate, db = pool) {
  const [rows] = await db.query(
    `SELECT habits.id AS habit_id,
            habits.difficulty AS difficulty,
            COALESCE(habit_logs.status, 'missing') AS status
     FROM habits
     LEFT JOIN habit_logs
       ON habit_logs.habit_id = habits.id
       AND habit_logs.log_date = ?
     WHERE habits.user_id = ?
       AND DATE(habits.created_at) <= ?
       AND (habits.archived_at IS NULL OR DATE(habits.archived_at) >= ?)`,
    [logDate, userId, logDate, logDate],
  );
  return rows;
}

module.exports = {
  expireStaleReviewsForUser,
  getHabitsMissingLogForDate,
  getLogsForHabit,
  insertPendingReview,
  findPendingForUser,
  findPendingByHabit,
  findPendingByHabitAndDate,
  resolveDecision,
  resolvePendingReviewsForHabit,
  findById,
  findByHabitAndDate,
  deleteCompletedLog,
  insertLog,
  findAllByHabit,
  getStatusesForUserAndDate,
};
