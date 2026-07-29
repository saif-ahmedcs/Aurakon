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

async function reclaimUnverified(
  userId,
  passwordHash,
  username,
  tokenHash,
  expiresAt,
  db = pool,
) {
  await db.query(
    `UPDATE users
     SET password_hash = ?,
         username = ?,
         email_verification_token_hash = ?,
         email_verification_expires = ?
     WHERE id = ?`,
    [passwordHash, username, tokenHash, expiresAt, userId],
  );
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

async function applyEmailChange(tokenHash, db = pool) {
  const [result] = await db.query(
    `UPDATE users
     SET email = pending_email,
         pending_email = NULL,
         email_change_token_hash = NULL,
         email_change_token_expires = NULL
     WHERE email_change_token_hash = ?
       AND email_change_token_expires > UTC_TIMESTAMP()`,
    [tokenHash],
  );
  return result.affectedRows;
}

async function clearExpiredEmailChangeToken(tokenHash, db = pool) {
  const [result] = await db.query(
    `UPDATE users
     SET pending_email = NULL,
         email_change_token_hash = NULL,
         email_change_token_expires = NULL
     WHERE email_change_token_hash = ?
       AND email_change_token_expires <= UTC_TIMESTAMP()`,
    [tokenHash],
  );
  return result.affectedRows;
}

async function findByValidVerificationToken(tokenHash, db = pool) {
  const [rows] = await db.query(
    `SELECT id FROM users
     WHERE email_verification_token_hash = ?
       AND email_verification_expires > UTC_TIMESTAMP()`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function findByValidEmailChangeToken(tokenHash, db = pool) {
  const [rows] = await db.query(
    `SELECT id FROM users
     WHERE email_change_token_hash = ?
       AND email_change_token_expires > UTC_TIMESTAMP()`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function findByValidEmailChangeTokenWithEmail(tokenHash, db = pool) {
  const [rows] = await db.query(
    `SELECT id, email FROM users
     WHERE email_change_token_hash = ?
       AND email_change_token_expires > UTC_TIMESTAMP()
     FOR UPDATE`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function verifyEmail(tokenHash) {
  const [result] = await pool.query(
    `UPDATE users
     SET is_verified = true,
         email_verification_token_hash = NULL,
         email_verification_expires = NULL
     WHERE email_verification_token_hash = ?
       AND email_verification_expires > UTC_TIMESTAMP()`,
    [tokenHash],
  );
  return result.affectedRows;
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
    "SELECT id, is_verified FROM users WHERE email = ? FOR UPDATE",
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
    `SELECT id FROM users
     WHERE reset_token_hash = ?
       AND reset_token_expires > UTC_TIMESTAMP()`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function updatePasswordAndClearResetToken(
  userId,
  tokenHash,
  passwordHash,
  db = pool,
) {
  const [result] = await db.query(
    `UPDATE users
     SET password_hash = ?,
         reset_token_hash = NULL,
         reset_token_expires = NULL
     WHERE id = ?
       AND reset_token_hash = ?
       AND reset_token_expires > UTC_TIMESTAMP()`,
    [passwordHash, userId, tokenHash],
  );
  return result.affectedRows > 0;
}

async function updatePasswordIfEligible(
  userId,
  passwordHash,
  cooldownMs,
  db = pool,
) {
  const [result] = await db.query(
    `UPDATE users
     SET password_hash = ?, password_changed_at = UTC_TIMESTAMP()
     WHERE id = ?
       AND (password_changed_at IS NULL
            OR password_changed_at <= UTC_TIMESTAMP() - INTERVAL ? SECOND)`,
    [passwordHash, userId, Math.floor(cooldownMs / 1000)],
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

async function clearExpiredVerificationToken(tokenHash) {
  const [result] = await pool.query(
    `UPDATE users
     SET email_verification_token_hash = NULL,
         email_verification_expires = NULL
     WHERE email_verification_token_hash = ?
       AND email_verification_expires <= UTC_TIMESTAMP()`,
    [tokenHash],
  );
  return result.affectedRows;
}

async function clearExpiredResetToken(tokenHash) {
  const [result] = await pool.query(
    `UPDATE users
     SET reset_token_hash = NULL,
         reset_token_expires = NULL
     WHERE reset_token_hash = ?
       AND reset_token_expires <= UTC_TIMESTAMP()`,
    [tokenHash],
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

async function setDeleteToken(userId, tokenHash, expiresAt, db = pool) {
  await db.query(
    `UPDATE users
     SET delete_token_hash = ?,
         delete_token_expires = ?
     WHERE id = ?`,
    [tokenHash, expiresAt, userId],
  );
}

async function findByValidDeleteToken(tokenHash, db = pool) {
  const [rows] = await db.query(
    `SELECT id, email FROM users
     WHERE delete_token_hash = ?
       AND delete_token_expires > UTC_TIMESTAMP()`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function findValidDeleteTokenForUser(userId, tokenHash, db = pool) {
  const [rows] = await db.query(
    `SELECT id, email FROM users
     WHERE id = ?
       AND delete_token_hash = ?
       AND delete_token_expires > UTC_TIMESTAMP()
     FOR UPDATE`,
    [userId, tokenHash],
  );
  return rows[0] || null;
}

async function clearExpiredDeleteToken(tokenHash, db = pool) {
  const [result] = await db.query(
    `UPDATE users
     SET delete_token_hash = NULL,
         delete_token_expires = NULL
     WHERE delete_token_hash = ?
       AND delete_token_expires <= UTC_TIMESTAMP()`,
    [tokenHash],
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
  reclaimUnverified,
  findById,
  getAccountInfo,
  getAuthProfile,
  updateTimezone,
  updateUsernameIfEligible,
  getUsernameChangedAt,
  findForEmailChange,
  findPendingEmailChange,
  setPendingEmailChange,
  applyEmailChange,
  clearExpiredEmailChangeToken,
  findByValidVerificationToken,
  findByValidEmailChangeToken,
  findByValidEmailChangeTokenWithEmail,
  verifyEmail,
  findForResend,
  setVerificationToken,
  findForLogin,
  clearExpiredVerificationToken,
  clearExpiredResetToken,
  clearOwnExpiredResetToken,
  findForPasswordReset,
  setResetToken,
  findByValidResetToken,
  updatePasswordAndClearResetToken,
  updatePasswordIfEligible,
  getPasswordChangedAt,
  setDeleteToken,
  findByValidDeleteToken,
  findValidDeleteTokenForUser,
  clearExpiredDeleteToken,
  deleteById,
};
