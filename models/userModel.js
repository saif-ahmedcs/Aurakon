const pool = require("../db");

async function findByEmailForRegistration(email) {
  const [rows] = await pool.query(
    "SELECT id, is_verified FROM users WHERE email = ?",
    [email],
  );
  return rows[0] || null;
}

async function createUser(email, passwordHash, username, tokenHash, expiresAt) {
  const [result] = await pool.query(
    `INSERT INTO users (email, password_hash, username, is_verified, email_verification_token_hash, email_verification_expires)
     VALUES (?, ?, ?, false, ?, ?)`,
    [email, passwordHash, username, tokenHash, expiresAt],
  );
  return result.insertId;
}

async function reclaimUnverified(
  userId,
  passwordHash,
  username,
  tokenHash,
  expiresAt,
) {
  await pool.query(
    `UPDATE users
     SET password_hash = ?,
         username = ?,
         email_verification_token_hash = ?,
         email_verification_expires = ?
     WHERE id = ?`,
    [passwordHash, username, tokenHash, expiresAt, userId],
  );
}

async function findById(id) {
  const [rows] = await pool.query(
    "SELECT id, email, username FROM users WHERE id = ?",
    [id],
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

async function findForResend(email) {
  const [rows] = await pool.query(
    "SELECT id, is_verified, email_verification_expires FROM users WHERE email = ?",
    [email],
  );
  return rows[0] || null;
}

async function setVerificationToken(userId, tokenHash, expiresAt) {
  await pool.query(
    `UPDATE users
     SET email_verification_token_hash = ?,
         email_verification_expires = ?
     WHERE id = ?`,
    [tokenHash, expiresAt, userId],
  );
}

async function findForLogin(email) {
  const [rows] = await pool.query(
    "SELECT id, email, username, password_hash, is_verified FROM users WHERE email = ?",
    [email],
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

module.exports = {
  findByEmailForRegistration,
  createUser,
  reclaimUnverified,
  findById,
  verifyEmail,
  findForResend,
  setVerificationToken,
  findForLogin,
  clearExpiredVerificationToken,
  clearExpiredResetToken,
  clearOwnExpiredResetToken,
};
