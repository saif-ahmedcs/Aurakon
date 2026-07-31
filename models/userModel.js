const { pool } = require("../db");

async function findByEmailForRegistration(email, db = pool) {
  const [rows] = await db.query(
    "SELECT id, is_verified FROM users WHERE email = ? FOR UPDATE",
    [email],
  );
  return rows[0] || null;
}

async function createUser(
  email,
  passwordHash,
  username,
  tokenHash,
  expiresAt,
  db = pool,
) {
  try {
    const [result] = await db.query(
      `INSERT INTO users (email, password_hash, username, is_verified, email_verification_token_hash, email_verification_expires, created_at)
       VALUES (?, ?, ?, false, ?, ?, UTC_TIMESTAMP())`,
      [email, passwordHash, username, tokenHash, expiresAt],
    );
    return result.insertId;
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return null;
    }
    throw err;
  }
}

async function setGender(userId, gender, db = pool) {
  await db.query("UPDATE users SET gender = ? WHERE id = ?", [gender, userId]);
}

async function findById(id, db = pool) {
  const [rows] = await db.query(
    "SELECT id, email, username, gender FROM users WHERE id = ?",
    [id],
  );
  return rows[0] || null;
}

async function getAccountInfo(id, db = pool) {
  const [rows] = await db.query(
    "SELECT email, created_at, gender, timezone FROM users WHERE id = ?",
    [id],
  );
  return rows[0] || null;
}

async function getAuthProfile(id, db = pool) {
  const [rows] = await db.query(
    "SELECT timezone, gender FROM users WHERE id = ?",
    [id],
  );
  return rows[0] || null;
}

async function updateTimezone(userId, timezone, db = pool) {
  await db.query("UPDATE users SET timezone = ? WHERE id = ?", [
    timezone,
    userId,
  ]);
}

async function updateUsernameIfEligible(
  userId,
  username,
  cooldownMs,
  db = pool,
) {
  const [result] = await db.query(
    `UPDATE users
     SET username = ?, username_changed_at = UTC_TIMESTAMP()
     WHERE id = ?
       AND (username_changed_at IS NULL
            OR username_changed_at <= UTC_TIMESTAMP() - INTERVAL ? SECOND)`,
    [username, userId, Math.floor(cooldownMs / 1000)],
  );
  return result.affectedRows > 0;
}

async function getUsernameChangedAt(userId, db = pool) {
  const [rows] = await db.query(
    "SELECT username_changed_at FROM users WHERE id = ?",
    [userId],
  );
  return rows[0] ? rows[0].username_changed_at : null;
}

async function findForEmailChange(userId, db = pool) {
  const [rows] = await db.query(
    "SELECT id, email, password_hash FROM users WHERE id = ?",
    [userId],
  );
  return rows[0] || null;
}

async function findPendingEmailChange(userId, db = pool) {
  const [rows] = await db.query(
    `SELECT pending_email, email_change_token_expires
     FROM users WHERE id = ? FOR UPDATE`,
    [userId],
  );
  return rows[0] || null;
}

async function setPendingEmailChange(
  userId,
  pendingEmail,
  tokenHash,
  expiresAt,
  db = pool,
) {
  await db.query(
    `UPDATE users
     SET pending_email = ?,
         email_change_token_hash = ?,
         email_change_token_expires = ?
     WHERE id = ?`,
    [pendingEmail, tokenHash, expiresAt, userId],
  );
}

async function cancelPendingEmailChange(userId, db = pool) {
  const [result] = await db.query(
    `UPDATE users
     SET pending_email = NULL,
         email_change_token_hash = NULL,
         email_change_token_expires = NULL
     WHERE id = ?
       AND pending_email IS NOT NULL`,
    [userId],
  );
  return result.affectedRows > 0;
}

async function findEmailChangeTokenState(tokenHash, db = pool) {
  const [rows] = await db.query(
    `SELECT id, email, pending_email, email_change_token_expires,
            email_change_consumed_at
     FROM users
     WHERE email_change_token_hash = ?
     FOR UPDATE`,
    [tokenHash],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    pendingEmail: row.pending_email,
    expiresAt: row.email_change_token_expires,
    consumedAt: row.email_change_consumed_at,
  };
}

async function markEmailChangeConsumed(id, db = pool) {
  await db.query(
    `UPDATE users
     SET email = pending_email,
         pending_email = NULL,
         email_change_consumed_at = UTC_TIMESTAMP()
     WHERE id = ?`,
    [id],
  );
}

async function clearExpiredEmailChangeToken(
  tokenHash,
  windowSeconds,
  db = pool,
) {
  const [result] = await db.query(
    `UPDATE users
     SET pending_email = NULL,
         email_change_token_hash = NULL,
         email_change_token_expires = NULL,
         email_change_consumed_at = NULL
     WHERE email_change_token_hash = ?
       AND (
         (email_change_consumed_at IS NULL AND email_change_token_expires <= UTC_TIMESTAMP())
         OR (email_change_consumed_at IS NOT NULL
             AND email_change_consumed_at <= UTC_TIMESTAMP() - INTERVAL ? SECOND)
       )`,
    [tokenHash, windowSeconds],
  );
  return result.affectedRows;
}

async function findByValidVerificationToken(tokenHash, db = pool) {
  const [rows] = await db.query(
    `SELECT id FROM users
     WHERE email_verification_token_hash = ?
       AND email_verification_expires > UTC_TIMESTAMP()
       AND email_verification_consumed_at IS NULL`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function findByValidEmailChangeToken(tokenHash, db = pool) {
  const [rows] = await db.query(
    `SELECT id FROM users
     WHERE email_change_token_hash = ?
       AND email_change_token_expires > UTC_TIMESTAMP()
       AND email_change_consumed_at IS NULL`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function findVerificationTokenState(tokenHash, db = pool) {
  const [rows] = await db.query(
    `SELECT id, email_verification_expires, email_verification_consumed_at
     FROM users
     WHERE email_verification_token_hash = ?
     FOR UPDATE`,
    [tokenHash],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    expiresAt: row.email_verification_expires,
    consumedAt: row.email_verification_consumed_at,
  };
}

async function markVerificationConsumed(id, db = pool) {
  await db.query(
    `UPDATE users
     SET is_verified = true,
         email_verification_consumed_at = UTC_TIMESTAMP()
     WHERE id = ?`,
    [id],
  );
}

async function findForResend(email, db = pool) {
  const [rows] = await db.query(
    "SELECT id, is_verified, email_verification_expires FROM users WHERE email = ? FOR UPDATE",
    [email],
  );
  return rows[0] || null;
}

async function setVerificationToken(userId, tokenHash, expiresAt, db = pool) {
  await db.query(
    `UPDATE users
     SET email_verification_token_hash = ?,
         email_verification_expires = ?
     WHERE id = ?`,
    [tokenHash, expiresAt, userId],
  );
}

async function findForPasswordReset(email, db = pool) {
  const [rows] = await db.query(
    "SELECT id, is_verified, reset_token_expires FROM users WHERE email = ? FOR UPDATE",
    [email],
  );
  return rows[0] || null;
}

async function setResetToken(userId, tokenHash, expiresAt, db = pool) {
  await db.query(
    `UPDATE users
     SET reset_token_hash = ?,
         reset_token_expires = ?
     WHERE id = ?`,
    [tokenHash, expiresAt, userId],
  );
}

async function findByValidResetToken(tokenHash) {
  const [rows] = await pool.query(
    `SELECT id, password_hash FROM users
     WHERE reset_token_hash = ?
       AND reset_token_expires > UTC_TIMESTAMP()
       AND reset_token_consumed_at IS NULL`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function findResetTokenState(tokenHash, db = pool) {
  const [rows] = await db.query(
    `SELECT id, password_hash, reset_token_expires, reset_token_consumed_at
     FROM users
     WHERE reset_token_hash = ?
     FOR UPDATE`,
    [tokenHash],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    passwordHash: row.password_hash,
    expiresAt: row.reset_token_expires,
    consumedAt: row.reset_token_consumed_at,
  };
}

async function markResetTokenConsumed(id, passwordHash, db = pool) {
  await db.query(
    `UPDATE users
     SET password_hash = ?,
         password_changed_at = UTC_TIMESTAMP(),
         reset_token_consumed_at = UTC_TIMESTAMP()
     WHERE id = ?`,
    [passwordHash, id],
  );
}

async function updatePasswordIfEligible(
  userId,
  passwordHash,
  expectedCurrentHash,
  db = pool,
) {
  const [result] = await db.query(
    `UPDATE users SET password_hash = ?, password_changed_at = UTC_TIMESTAMP() WHERE id = ? AND password_hash = ?`,
    [passwordHash, userId, expectedCurrentHash],
  );
  return result.affectedRows > 0;
}

async function getPasswordChangedAt(userId, db = pool) {
  const [rows] = await db.query(
    "SELECT password_changed_at FROM users WHERE id = ?",
    [userId],
  );
  return rows[0] ? rows[0].password_changed_at : null;
}

async function findForLogin(email) {
  const [rows] = await pool.query(
    "SELECT id, email, username, password_hash, is_verified FROM users WHERE email = ?",
    [email],
  );
  return rows[0] || null;
}

async function findPasswordHashById(userId) {
  const [rows] = await pool.query(
    "SELECT password_hash FROM users WHERE id = ?",
    [userId],
  );
  return rows[0] || null;
}

async function clearExpiredVerificationToken(tokenHash, windowSeconds) {
  const [result] = await pool.query(
    `UPDATE users
     SET email_verification_token_hash = NULL,
         email_verification_expires = NULL,
         email_verification_consumed_at = NULL
     WHERE email_verification_token_hash = ?
       AND (
         (email_verification_consumed_at IS NULL AND email_verification_expires <= UTC_TIMESTAMP())
         OR (email_verification_consumed_at IS NOT NULL
             AND email_verification_consumed_at <= UTC_TIMESTAMP() - INTERVAL ? SECOND)
       )`,
    [tokenHash, windowSeconds],
  );
  return result.affectedRows;
}

async function clearResetToken(userId, db = pool) {
  const [result] = await db.query(
    `UPDATE users
     SET reset_token_hash = NULL,
         reset_token_expires = NULL
     WHERE id = ?`,
    [userId],
  );
  return result.affectedRows;
}

async function clearExpiredResetToken(tokenHash, windowSeconds = 0) {
  const [result] = await pool.query(
    `UPDATE users
     SET reset_token_hash = NULL,
         reset_token_expires = NULL,
         reset_token_consumed_at = NULL
     WHERE reset_token_hash = ?
       AND (
         (reset_token_consumed_at IS NULL AND reset_token_expires <= UTC_TIMESTAMP())
         OR (reset_token_consumed_at IS NOT NULL
             AND reset_token_consumed_at <= UTC_TIMESTAMP() - INTERVAL ? SECOND)
       )`,
    [tokenHash, windowSeconds],
  );
  return result.affectedRows;
}

async function clearOwnExpiredResetToken(userId) {
  const [result] = await pool.query(
    `UPDATE users
     SET reset_token_hash = NULL,
         reset_token_expires = NULL
     WHERE id = ?
       AND reset_token_expires <= UTC_TIMESTAMP()
       AND reset_token_hash IS NOT NULL`,
    [userId],
  );
  return result.affectedRows;
}

async function findForAccountDeletion(userId, db = pool) {
  const [rows] = await db.query(
    "SELECT id, email, delete_token_expires FROM users WHERE id = ? FOR UPDATE",
    [userId],
  );
  return rows[0] || null;
}

async function setDeleteToken(userId, tokenHash, expiresAt, db = pool) {
  await db.query(
    `UPDATE users
     SET delete_token_hash = ?,
         delete_token_expires = ?
     WHERE id = ?`,
    [tokenHash, expiresAt, userId],
  );
}

async function cancelPendingAccountDeletion(userId, db = pool) {
  const [result] = await db.query(
    `UPDATE users
     SET delete_token_hash = NULL,
         delete_token_expires = NULL
     WHERE id = ?
       AND delete_token_hash IS NOT NULL`,
    [userId],
  );
  return result.affectedRows > 0;
}

async function findByValidDeleteToken(tokenHash, db = pool) {
  const [rows] = await db.query(
    `SELECT id, email FROM users
     WHERE delete_token_hash = ?
       AND delete_token_expires > UTC_TIMESTAMP()
       AND delete_token_consumed_at IS NULL`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function findDeleteTokenStateForUser(userId, tokenHash, db = pool) {
  const [rows] = await db.query(
    `SELECT id, email, password_hash, delete_token_expires, delete_token_consumed_at
     FROM users
     WHERE id = ?
       AND delete_token_hash = ?
     FOR UPDATE`,
    [userId, tokenHash],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    expiresAt: row.delete_token_expires,
    consumedAt: row.delete_token_consumed_at,
  };
}

async function markDeleteTokenConsumed(id, db = pool) {
  await db.query(
    `UPDATE users SET delete_token_consumed_at = UTC_TIMESTAMP() WHERE id = ?`,
    [id],
  );
}

async function clearExpiredDeleteToken(tokenHash, windowSeconds, db = pool) {
  const [result] = await db.query(
    `UPDATE users
     SET delete_token_hash = NULL,
         delete_token_expires = NULL,
         delete_token_consumed_at = NULL
     WHERE delete_token_hash = ?
       AND (
         (delete_token_consumed_at IS NULL AND delete_token_expires <= UTC_TIMESTAMP())
         OR (delete_token_consumed_at IS NOT NULL
             AND delete_token_consumed_at <= UTC_TIMESTAMP() - INTERVAL ? SECOND)
       )`,
    [tokenHash, windowSeconds],
  );
  return result.affectedRows;
}

async function deleteById(userId, db = pool) {
  const [result] = await db.query(`DELETE FROM users WHERE id = ?`, [userId]);
  return result.affectedRows;
}

module.exports = {
  findByEmailForRegistration,
  createUser,
  setGender,
  findById,
  getAccountInfo,
  getAuthProfile,
  updateTimezone,
  updateUsernameIfEligible,
  getUsernameChangedAt,
  findForEmailChange,
  findPendingEmailChange,
  setPendingEmailChange,
  cancelPendingEmailChange,
  findEmailChangeTokenState,
  markEmailChangeConsumed,
  clearExpiredEmailChangeToken,
  findByValidVerificationToken,
  findByValidEmailChangeToken,
  findVerificationTokenState,
  markVerificationConsumed,
  findForResend,
  setVerificationToken,
  findForLogin,
  findPasswordHashById,
  clearExpiredVerificationToken,
  clearResetToken,
  clearExpiredResetToken,
  clearOwnExpiredResetToken,
  findForPasswordReset,
  setResetToken,
  findByValidResetToken,
  findResetTokenState,
  markResetTokenConsumed,
  updatePasswordIfEligible,
  getPasswordChangedAt,
  findForAccountDeletion,
  setDeleteToken,
  cancelPendingAccountDeletion,
  findByValidDeleteToken,
  findDeleteTokenStateForUser,
  markDeleteTokenConsumed,
  clearExpiredDeleteToken,
  deleteById,
};
