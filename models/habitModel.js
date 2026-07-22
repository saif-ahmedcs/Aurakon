const { pool } = require("../db");

async function findAllByUser(userId) {
  const [rows] = await pool.query(
    "SELECT * FROM habits WHERE user_id = ? AND archived_at IS NULL",
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

async function update(id, title, difficulty) {
  await pool.query("UPDATE habits SET title = ?, difficulty = ? WHERE id = ?", [
    title,
    difficulty,
    id,
  ]);
  const [rows] = await pool.query("SELECT * FROM habits WHERE id = ?", [id]);
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

async function getEarliestCreatedDate(userId, db = pool) {
  const [rows] = await db.query(
    "SELECT DATE(MIN(created_at)) AS earliestDate FROM habits WHERE user_id = ?",
    [userId],
  );
  return rows[0] ? rows[0].earliestDate : null;
}

module.exports = {
  findAllByUser,
  findById,
  existsForUser,
  create,
  update,
  archive,
  countByUser,
  getEarliestCreatedDate,
};
