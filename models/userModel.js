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
) {
  const [result] = await pool.query(
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
  findForPasswordReset,
  setResetToken,
  findByValidResetToken,
  updatePasswordAndClearResetToken,
};
