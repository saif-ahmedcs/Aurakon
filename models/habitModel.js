const { pool } = require("../db");

async function findAllByUser(userId) {
  const [rows] = await pool.query("SELECT * FROM habits WHERE user_id = ?", [
    userId,
  ]);
  return rows;
}

async function findById(id, userId) {
  const [rows] = await pool.query(
    "SELECT * FROM habits WHERE id = ? AND user_id = ?",
    [id, userId],
  );
  return rows[0] || null;
}

async function existsForUser(id, userId) {
  const [rows] = await pool.query(
    "SELECT 1 FROM habits WHERE id = ? AND user_id = ? LIMIT 1",
    [id, userId],
  );
  return rows.length > 0;
}

async function create(title, userId, difficulty) {
  const [result] = await pool.query(
    "INSERT INTO habits (title, user_id, difficulty) VALUES (?, ?, ?)",
    [title, userId, difficulty],
  );
  const [rows] = await pool.query("SELECT * FROM habits WHERE id = ?", [
    result.insertId,
  ]);
  return rows[0];
}

async function update(id, title, targetDays, difficulty) {
  await pool.query(
    "UPDATE habits SET title = ?, target_days = ?, difficulty = ? WHERE id = ?",
    [title, targetDays, difficulty, id],
  );
  const [rows] = await pool.query("SELECT * FROM habits WHERE id = ?", [id]);
  return rows[0];
}

async function remove(id, userId) {
  const [result] = await pool.query(
    "DELETE FROM habits WHERE id = ? AND user_id = ?",
    [id, userId],
  );
  return result.affectedRows;
}

async function countByUser(userId) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS count FROM habits WHERE user_id = ?",
    [userId],
  );
  return rows[0].count;
}

module.exports = {
  findAllByUser,
  findById,
  existsForUser,
  create,
  update,
  remove,
  countByUser,
};
