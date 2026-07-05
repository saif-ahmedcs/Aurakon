const pool = require("../db");

async function expireStaleReviews() {
  const [result] = await pool.query(
    `UPDATE habit_logs
     SET status = 'missed'
     WHERE status = 'pending_review'
       AND created_at < (UTC_TIMESTAMP() - INTERVAL 24 HOUR)`,
  );
  return result.affectedRows;
}

async function getHabitsMissingLogForDate(logDate) {
  const [rows] = await pool.query(
    `SELECT habits.id, habits.title
     FROM habits
     WHERE NOT EXISTS (
       SELECT 1 FROM habit_logs
       WHERE habit_logs.habit_id = habits.id
         AND habit_logs.log_date = ?
     )`,
    [logDate],
  );
  return rows;
}

async function getLogsForHabit(habitId) {
  const [rows] = await pool.query(
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

async function findPending() {
  const [rows] = await pool.query(
    `SELECT habit_logs.id,
            habit_logs.habit_id,
            habits.title AS habit_name,
            habit_logs.log_date AS missed_date,
            habit_logs.created_at
     FROM habit_logs
     JOIN habits ON habit_logs.habit_id = habits.id
     WHERE habit_logs.status = 'pending_review'`,
  );
  return rows;
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
       AND habits.user_id = ?`,
    [userId],
  );
  return rows;
}

async function findPendingByHabitAndDate(habitId, logDate) {
  const [rows] = await pool.query(
    `SELECT habit_logs.id,
            habit_logs.habit_id,
            habits.title AS habit_name,
            habit_logs.log_date AS missed_date,
            habit_logs.created_at
     FROM habit_logs
     JOIN habits ON habit_logs.habit_id = habits.id
     WHERE habit_logs.status = 'pending_review'
       AND habit_logs.habit_id = ?
       AND habit_logs.log_date = ?`,
    [habitId, logDate],
  );
  return rows[0] || null;
}

async function resolveDecision(habitLogId, status) {
  const [result] = await pool.query(
    `UPDATE habit_logs
     SET status = ?
     WHERE id = ? AND status = 'pending_review'`,
    [status, habitLogId],
  );
  return result.affectedRows;
}

async function findPendingByHabit(habitId) {
  const [rows] = await pool.query(
    `SELECT habit_logs.id,
            habit_logs.habit_id,
            habits.title AS habit_name,
            habit_logs.log_date AS missed_date,
            habit_logs.created_at
     FROM habit_logs
     JOIN habits ON habit_logs.habit_id = habits.id
     WHERE habit_logs.status = 'pending_review'
       AND habit_logs.habit_id = ?`,
    [habitId],
  );
  return rows[0] || null;
}

module.exports = {
  expireStaleReviews,
  getHabitsMissingLogForDate,
  getLogsForHabit,
  insertPendingReview,
  findPending,
  findPendingByHabit,
  findPendingByHabitAndDate,
  resolveDecision,
  findPendingForUser,
};
