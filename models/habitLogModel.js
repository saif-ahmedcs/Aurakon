const { pool } = require("../db");

async function expireStaleReviewsForUser(userId) {
  const [result] = await pool.query(
    `UPDATE habit_logs
     JOIN habits ON habit_logs.habit_id = habits.id
     SET habit_logs.status = 'missed'
     WHERE habit_logs.status = 'pending_review'
       AND habits.user_id = ?
       AND habit_logs.created_at < (UTC_TIMESTAMP() - INTERVAL 24 HOUR)`,
    [userId],
  );
  return result.affectedRows;
}

async function getHabitsMissingLogForDate(userId, logDate) {
  const [rows] = await pool.query(
    `SELECT habits.id, habits.title
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

async function findById(id, db = pool) {
  const [rows] = await db.query("SELECT * FROM habit_logs WHERE id = ?", [id]);
  return rows[0] || null;
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

module.exports = {
  expireStaleReviewsForUser,
  getHabitsMissingLogForDate,
  getLogsForHabit,
  insertPendingReview,
  findPendingForUser,
  findPendingByHabit,
  findPendingByHabitAndDate,
  resolveDecision,
  findById,
  insertLog,
  findAllByHabit,
};
