const { pool } = require("../db");

// ---------------------------------------------------------------------------
// Account lookup, registration & deletion
// ---------------------------------------------------------------------------

async function findByEmailForRegistration(email, db = pool) {
  const [rows] = await db.query(
    "SELECT id, is_verified FROM users WHERE email = ? FOR UPDATE",
    [email],
  );
  return rows[0] || null;
}

async function findByEmailOrPendingEmailForUpdate(
  email,
  excludeUserId,
  db = pool,
) {
  const [rows] = await db.query(
    "SELECT id FROM users WHERE (email = ? OR pending_email = ?) AND id <> ? FOR UPDATE",
    [email, email, excludeUserId],
  );
  return rows[0] || null;
}

async function createUser(
  email,
  passwordHash,
  username,
  gender,
  timezone,
  timezoneSource,
  tokenHash,
  expiresAt,
  db = pool,
) {
  try {
    const [result] = await db.query(
      `INSERT INTO users (email, password_hash, username, gender, timezone, timezone_source, is_verified, email_verification_token_hash, email_verification_expires, created_at)
       VALUES (?, ?, ?, ?, ?, ?, false, ?, ?, UTC_TIMESTAMP())`,
      [
        email,
        passwordHash,
        username,
        gender,
        timezone,
        timezoneSource,
        tokenHash,
        expiresAt,
      ],
    );
    return result.insertId;
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return null;
    }
    throw err;
  }
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
    "SELECT email, created_at, gender, timezone, timezone_source FROM users WHERE id = ?",
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

async function deleteById(userId, db = pool) {
  const [result] = await db.query(`DELETE FROM users WHERE id = ?`, [userId]);
  return result.affectedRows;
}

// ---------------------------------------------------------------------------
// Profile fields (gender, timezone, username)
// ---------------------------------------------------------------------------

async function setGender(userId, gender, db = pool) {
  const [result] = await db.query(
    "UPDATE users SET gender = ? WHERE id = ? AND gender IS NULL",
    [gender, userId],
  );
  return result.affectedRows > 0;
}

async function updateTimezone(userId, timezone, db = pool) {
  await db.query(
    "UPDATE users SET timezone = ?, timezone_source = 'manual' WHERE id = ?",
    [timezone, userId],
  );
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

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

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
         email_verification_expires = ?,
         email_verification_consumed_at = NULL
     WHERE id = ?`,
    [tokenHash, expiresAt, userId],
  );
}

async function clearExpiredVerificationToken(
  tokenHash,
  windowSeconds,
  db = pool,
) {
  const [result] = await db.query(
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

// ---------------------------------------------------------------------------
// Email change
// ---------------------------------------------------------------------------

async function findForEmailChange(userId, db = pool) {
  const [rows] = await db.query(
    "SELECT id, email, password_hash, email_change_token_expires FROM users WHERE id = ? FOR UPDATE",
    [userId],
  );
  return rows[0] || null;
}

async function findPendingEmailChange(userId, db = pool) {
  const [rows] = await db.query(
    `SELECT pending_email, email_change_token_expires, email_change_token_hash
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
         email_change_token_expires = ?,
         email_change_consumed_at = NULL
     WHERE id = ?`,
    [pendingEmail, tokenHash, expiresAt, userId],
  );
}

async function cancelPendingEmailChange(
  userId,
  db = pool,
  expectedTokenHash = null,
) {
  const [result] = await db.query(
    `UPDATE users
     SET pending_email = NULL,
         email_change_token_hash = NULL,
         email_change_token_expires = NULL,
         email_change_consumed_at = NULL
     WHERE id = ?
       AND pending_email IS NOT NULL
       ${expectedTokenHash ? "AND email_change_token_hash = ?" : ""}`,
    expectedTokenHash ? [userId, expectedTokenHash] : [userId],
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

async function findEmailChangeTokenStateForUser(userId, tokenHash, db = pool) {
  const [rows] = await db.query(
    `SELECT id, email, password_hash, pending_email,
            email_change_token_expires, email_change_consumed_at
     FROM users
     WHERE id = ?
       AND email_change_token_hash = ?
     FOR UPDATE`,
    [userId, tokenHash],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    pendingEmail: row.pending_email,
    expiresAt: row.email_change_token_expires,
    consumedAt: row.email_change_consumed_at,
  };
}

async function markEmailChangeConsumed(id, db = pool) {
  try {
    const [result] = await db.query(
      `UPDATE users AS target
       LEFT JOIN users AS existing
         ON existing.email = target.pending_email
         AND existing.id <> target.id
       SET target.email = target.pending_email,
           target.pending_email = NULL,
           target.email_change_consumed_at = UTC_TIMESTAMP()
       WHERE target.id = ?
         AND target.pending_email IS NOT NULL
         AND existing.id IS NULL`,
      [id],
    );

    if (result.affectedRows === 0) {
      const [rows] = await db.query(
        `SELECT pending_email FROM users WHERE id = ?`,
        [id],
      );
      const row = rows[0];

      if (row?.pending_email) {
        const [conflictRows] = await db.query(
          `SELECT id FROM users WHERE email = ? AND id <> ?`,
          [row.pending_email, id],
        );
        if (conflictRows[0]) {
          return {
            affectedRows: result.affectedRows,
            reason: "duplicate_address",
          };
        }
      }

      return { affectedRows: result.affectedRows, reason: "invalid" };
    }

    return { affectedRows: result.affectedRows, reason: null };
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return {
        affectedRows: 0,
        reason: "duplicate_address",
      };
    }
    throw err;
  }
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

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

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
         reset_token_expires = ?,
         reset_token_consumed_at = NULL
     WHERE id = ?`,
    [tokenHash, expiresAt, userId],
  );
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

async function markResetTokenConsumedIfHashMatches(
  id,
  expectedCurrentHash,
  passwordHash,
  db = pool,
) {
  const [result] = await db.query(
    `UPDATE users
     SET password_hash = ?,
         password_changed_at = UTC_TIMESTAMP(),
         reset_token_consumed_at = UTC_TIMESTAMP()
     WHERE id = ? AND password_hash = ?`,
    [passwordHash, id, expectedCurrentHash],
  );
  return result.affectedRows > 0;
}

async function clearResetToken(userId, db = pool) {
  const [result] = await db.query(
    `UPDATE users
     SET reset_token_hash = NULL,
         reset_token_expires = NULL,
         reset_token_consumed_at = NULL
     WHERE id = ?`,
    [userId],
  );
  return result.affectedRows;
}

async function clearExpiredResetToken(tokenHash, windowSeconds, db = pool) {
  const [result] = await db.query(
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

async function clearOwnExpiredResetToken(userId, db = pool) {
  const [result] = await db.query(
    `UPDATE users
     SET reset_token_hash = NULL,
         reset_token_expires = NULL
    WHERE id = ?
     AND reset_token_expires <= UTC_TIMESTAMP()
     AND reset_token_hash IS NOT NULL
     AND reset_token_consumed_at IS NULL`,
    [userId],
  );
  return result.affectedRows;
}

// ---------------------------------------------------------------------------
// Password change (authenticated)
// ---------------------------------------------------------------------------

async function findPasswordHashById(userId, db = pool) {
  const [rows] = await db.query(
    "SELECT password_hash FROM users WHERE id = ?",
    [userId],
  );
  return rows[0] || null;
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

// ---------------------------------------------------------------------------
// Login & lockout
// ---------------------------------------------------------------------------

async function findForLoginForUpdate(email, db = pool) {
  const [rows] = await db.query(
    "SELECT id, email, username, password_hash, is_verified, failed_login_count, locked_until FROM users WHERE email = ? FOR UPDATE",
    [email],
  );
  return rows[0] || null;
}

async function registerFailedLogin(userId, maxAttempts, lockoutMs, db = pool) {
  await db.query(
    `UPDATE users
     SET failed_login_count = failed_login_count + 1,
         locked_until = CASE
           WHEN failed_login_count + 1 >= ? THEN UTC_TIMESTAMP() + INTERVAL ? SECOND
           ELSE locked_until
         END
     WHERE id = ?`,
    [maxAttempts, Math.floor(lockoutMs / 1000), userId],
  );
}

async function clearFailedLogins(userId, db = pool) {
  await db.query(
    `UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = ?`,
    [userId],
  );
}

// ---------------------------------------------------------------------------
// Account deletion
// ---------------------------------------------------------------------------

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

async function findDeleteTokenState(tokenHash, db = pool) {
  const [rows] = await db.query(
    `SELECT id, email, delete_token_expires
     FROM users
     WHERE delete_token_hash = ?
     FOR UPDATE`,
    [tokenHash],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    expiresAt: row.delete_token_expires,
  };
}

async function findDeleteTokenStateForUser(userId, tokenHash, db = pool) {
  const [rows] = await db.query(
    `SELECT id, email, password_hash, delete_token_expires
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
  };
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

module.exports = {
  findByEmailForRegistration,
  findByEmailOrPendingEmailForUpdate,
  createUser,
  findById,
  getAccountInfo,
  getAuthProfile,
  deleteById,
  setGender,
  updateTimezone,
  updateUsernameIfEligible,
  getUsernameChangedAt,
  findVerificationTokenState,
  markVerificationConsumed,
  findForResend,
  setVerificationToken,
  clearExpiredVerificationToken,
  findForEmailChange,
  findPendingEmailChange,
  setPendingEmailChange,
  cancelPendingEmailChange,
  findEmailChangeTokenState,
  findEmailChangeTokenStateForUser,
  markEmailChangeConsumed,
  clearExpiredEmailChangeToken,
  findForPasswordReset,
  setResetToken,
  findResetTokenState,
  markResetTokenConsumedIfHashMatches,
  clearResetToken,
  clearExpiredResetToken,
  clearOwnExpiredResetToken,
  findPasswordHashById,
  updatePasswordIfEligible,
  findForLoginForUpdate,
  registerFailedLogin,
  clearFailedLogins,
  findForAccountDeletion,
  setDeleteToken,
  cancelPendingAccountDeletion,
  findDeleteTokenState,
  findDeleteTokenStateForUser,
  clearExpiredDeleteToken,
};
