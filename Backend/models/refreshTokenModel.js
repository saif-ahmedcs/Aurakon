const { pool } = require("../db");

async function insert(userId, tokenHash, expiresAt, db = pool) {
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, UTC_TIMESTAMP())`,
    [userId, tokenHash, expiresAt],
  );
}

async function findByTokenHashForUpdate(tokenHash, db = pool) {
  const [rows] = await db.query(
    `SELECT id, user_id, expires_at, used_at
     FROM refresh_tokens
     WHERE token_hash = ?
     FOR UPDATE`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function markUsed(id, db = pool) {
  const [result] = await db.query(
    `UPDATE refresh_tokens SET used_at = UTC_TIMESTAMP() WHERE id = ? AND used_at IS NULL`,
    [id],
  );
  return result.affectedRows > 0;
}

async function deleteByTokenHash(tokenHash, db = pool) {
  const [result] = await db.query(
    `DELETE FROM refresh_tokens WHERE token_hash = ?`,
    [tokenHash],
  );
  return result.affectedRows;
}

async function deleteAllByUserId(userId, db = pool) {
  const [result] = await db.query(
    `DELETE FROM refresh_tokens WHERE user_id = ?`,
    [userId],
  );
  return result.affectedRows;
}

async function deleteExpiredForUser(userId, db = pool) {
  const [result] = await db.query(
    `DELETE FROM refresh_tokens WHERE user_id = ? AND (expires_at < UTC_TIMESTAMP() OR used_at IS NOT NULL)`,
    [userId],
  );
  return result.affectedRows;
}

async function lockActiveForUser(userId, db = pool) {
  await db.query(
    `SELECT id FROM refresh_tokens
     WHERE user_id = ? AND expires_at > UTC_TIMESTAMP() AND used_at IS NULL
     FOR UPDATE`,
    [userId],
  );
}

async function countActiveByUserId(userId, db = pool) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count FROM refresh_tokens WHERE user_id = ? AND expires_at > UTC_TIMESTAMP() AND used_at IS NULL`,
    [userId],
  );
  return rows[0].count;
}

async function deleteOldestByUserId(userId, db = pool) {
  const [result] = await db.query(
    `DELETE FROM refresh_tokens
     WHERE id = (
       SELECT id FROM (
         SELECT id FROM refresh_tokens
         WHERE user_id = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP()
         ORDER BY created_at ASC, id ASC
         LIMIT 1
       ) AS oldest
     )`,
    [userId],
  );
  return result.affectedRows;
}

module.exports = {
  insert,
  findByTokenHashForUpdate,
  markUsed,
  deleteByTokenHash,
  deleteAllByUserId,
  deleteExpiredForUser,
  lockActiveForUser,
  countActiveByUserId,
  deleteOldestByUserId,
};
