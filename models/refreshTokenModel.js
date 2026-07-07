const pool = require("../db");

async function insert(userId, tokenHash, expiresAt) {
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [userId, tokenHash, expiresAt],
  );
}

async function findByTokenHash(tokenHash) {
  const [rows] = await pool.query(
    `SELECT id, user_id, expires_at
     FROM refresh_tokens
     WHERE token_hash = ?`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function deleteByTokenHash(tokenHash) {
  const [result] = await pool.query(
    `DELETE FROM refresh_tokens WHERE token_hash = ?`,
    [tokenHash],
  );
  return result.affectedRows;
}

async function deleteAllByUserId(userId) {
  const [result] = await pool.query(
    `DELETE FROM refresh_tokens WHERE user_id = ?`,
    [userId],
  );
  return result.affectedRows;
}

async function deleteExpiredForUser(userId) {
  const [result] = await pool.query(
    `DELETE FROM refresh_tokens WHERE user_id = ? AND expires_at < UTC_TIMESTAMP()`,
    [userId],
  );
  return result.affectedRows;
}

module.exports = {
  insert,
  findByTokenHash,
  deleteByTokenHash,
  deleteAllByUserId,
  deleteExpiredForUser,
};
