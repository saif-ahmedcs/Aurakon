const pool = require("../db");

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

async function create(title, userId) {
  const [result] = await pool.query(
    "INSERT INTO habits (title, user_id) VALUES (?, ?)",
    [title, userId],
  );
  const [rows] = await pool.query("SELECT * FROM habits WHERE id = ?", [
    result.insertId,
  ]);
  return rows[0];
}

async function update(id, title, targetDays) {
  await pool.query(
    "UPDATE habits SET title = ?, target_days = ? WHERE id = ?",
    [title, targetDays, id],
  );
  const [rows] = await pool.query("SELECT * FROM habits WHERE id = ?", [id]);
  return rows[0];
}

async function remove(id) {
  await pool.query("DELETE FROM habits WHERE id = ?", [id]);
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
  create,
  update,
  remove,
  countByUser,
};
