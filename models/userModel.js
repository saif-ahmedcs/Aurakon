const pool = require("../db");

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
  clearExpiredVerificationToken,
  clearExpiredResetToken,
  clearOwnExpiredResetToken,
};
