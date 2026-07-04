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

module.exports = { clearExpiredVerificationToken };
