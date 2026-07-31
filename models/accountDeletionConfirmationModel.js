const { pool } = require("../db");

async function recordConsumption(tokenHash, userId, db = pool) {
  await db.query(
    `INSERT INTO account_deletion_confirmations (token_hash, user_id, consumed_at)
     VALUES (?, ?, UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE consumed_at = consumed_at`,
    [tokenHash, userId],
  );
}

async function findByHash(tokenHash, db = pool) {
  const [rows] = await db.query(
    `SELECT token_hash, consumed_at FROM account_deletion_confirmations
     WHERE token_hash = ?`,
    [tokenHash],
  );
  const row = rows[0];
  return row ? { consumedAt: row.consumed_at, expiresAt: null } : null;
}

async function findRecentByUserId(userId, db = pool) {
  const [rows] = await db.query(
    `SELECT consumed_at FROM account_deletion_confirmations
     WHERE user_id = ?
     ORDER BY consumed_at DESC
     LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  return row ? { consumedAt: row.consumed_at, expiresAt: null } : null;
}

async function deleteOlderThan(cutoffDate, db = pool) {
  const [result] = await db.query(
    `DELETE FROM account_deletion_confirmations WHERE consumed_at <= ?`,
    [cutoffDate],
  );
  return result.affectedRows;
}

module.exports = {
  recordConsumption,
  findByHash,
  findRecentByUserId,
  deleteOlderThan,
};
