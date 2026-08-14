const { pool } = require("../db");

async function findAllByUser(userId) {
  const [rows] = await pool.query(
    "SELECT * FROM habits WHERE user_id = ? AND archived_at IS NULL ORDER BY id ASC",
    [userId],
  );
  return rows;
}

async function findById(id, userId, db = pool) {
  const [rows] = await db.query(
    "SELECT * FROM habits WHERE id = ? AND user_id = ? AND archived_at IS NULL",
    [id, userId],
  );
  return rows[0] || null;
}

async function existsForUser(id, userId) {
  const [rows] = await pool.query(
    "SELECT 1 FROM habits WHERE id = ? AND user_id = ? AND archived_at IS NULL LIMIT 1",
    [id, userId],
  );
  return rows.length > 0;
}

async function create(title, userId, difficulty, db = pool) {
  const [result] = await db.query(
    "INSERT INTO habits (title, user_id, difficulty, created_at) VALUES (?, ?, ?, UTC_TIMESTAMP())",
    [title, userId, difficulty],
  );
  const [rows] = await db.query("SELECT * FROM habits WHERE id = ?", [
    result.insertId,
  ]);
  return rows[0];
}

async function update(id, userId, title, difficulty, db = pool) {
  await db.query(
    "UPDATE habits SET title = ?, difficulty = ? WHERE id = ? AND user_id = ?",
    [title, difficulty, id, userId],
  );
  const [rows] = await db.query("SELECT * FROM habits WHERE id = ?", [id]);
  return rows[0];
}

async function archive(id, userId, db = pool) {
  const [result] = await db.query(
    "UPDATE habits SET archived_at = UTC_TIMESTAMP() WHERE id = ? AND user_id = ? AND archived_at IS NULL",
    [id, userId],
  );
  return result.affectedRows;
}

async function countByUser(userId, db = pool) {
  const [rows] = await db.query(
    "SELECT COUNT(*) AS count FROM habits WHERE user_id = ? AND archived_at IS NULL",
    [userId],
  );
  return rows[0].count;
}

async function getEarliestCreatedAt(userId, db = pool) {
  const [rows] = await db.query(
    "SELECT MIN(created_at) AS earliestCreatedAt FROM habits WHERE user_id = ?",
    [userId],
  );
  return rows[0] ? rows[0].earliestCreatedAt : null;
}

async function getShieldDeferredSince(id, db = pool) {
  const [rows] = await db.query(
    "SELECT shield_deferred_since FROM habits WHERE id = ?",
    [id],
  );
  return rows[0] ? rows[0].shield_deferred_since : null;
}

async function lockForShieldDeferral(id, db = pool) {
  await db.query("SELECT id FROM habits WHERE id = ? FOR UPDATE", [id]);
}

async function recordShieldDeferral(id, date, db = pool) {
  await db.query(
    `UPDATE habits
     SET shield_deferred_since = LEAST(COALESCE(shield_deferred_since, ?), ?)
     WHERE id = ?`,
    [date, date, id],
  );
}

async function clearShieldDeferral(id, db = pool) {
  const [result] = await db.query(
    `UPDATE habits
     SET shield_deferred_since = NULL
     WHERE id = ?
       AND NOT EXISTS (
         SELECT 1 FROM habit_logs
         WHERE habit_logs.habit_id = habits.id
           AND habit_logs.status = 'pending_review'
       )`,
    [id],
  );
  return result.affectedRows;
}

async function updateStreaks(id, currentStreak, longestStreak, db = pool) {
  await db.query(
    "UPDATE habits SET current_streak = ?, longest_streak = ? WHERE id = ?",
    [currentStreak, longestStreak, id],
  );
}

async function deleteAllByUser(userId, db = pool) {
  const [result] = await db.query("DELETE FROM habits WHERE user_id = ?", [
    userId,
  ]);
  return result.affectedRows;
}

module.exports = {
  findAllByUser,
  findById,
  existsForUser,
  create,
  update,
  archive,
  countByUser,
  getEarliestCreatedAt,
  getShieldDeferredSince,
  lockForShieldDeferral,
  recordShieldDeferral,
  clearShieldDeferral,
  updateStreaks,
  deleteAllByUser,
};
