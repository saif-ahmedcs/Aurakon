process.env.TZ = "UTC";
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { pool } = require("../db");

async function cleanupExpiredTokens() {
  const [refreshTokens] = await pool.query(
    `DELETE FROM refresh_tokens WHERE expires_at < UTC_TIMESTAMP()`,
  );

  const [resetToken] = await pool.query(
    `UPDATE users
     SET reset_token_hash = NULL,
         reset_token_expires = NULL
     WHERE reset_token_hash IS NOT NULL
       AND reset_token_expires <= UTC_TIMESTAMP()`,
  );

  const [emailVerification] = await pool.query(
    `UPDATE users
     SET email_verification_token_hash = NULL,
         email_verification_expires = NULL
     WHERE is_verified = false
       AND email_verification_token_hash IS NOT NULL
       AND email_verification_expires <= UTC_TIMESTAMP()`,
  );

  const [deleteToken] = await pool.query(
    `UPDATE users
     SET delete_token_hash = NULL,
         delete_token_expires = NULL
     WHERE delete_token_hash IS NOT NULL
       AND delete_token_expires <= UTC_TIMESTAMP()`,
  );

  const [emailChange] = await pool.query(
    `UPDATE users
     SET pending_email = NULL,
         email_change_token_hash = NULL,
         email_change_token_expires = NULL
     WHERE email_change_token_hash IS NOT NULL
       AND email_change_token_expires <= UTC_TIMESTAMP()`,
  );

  console.log(
    `Cleaned up expired tokens: ` +
      `refresh_tokens=${refreshTokens.affectedRows}, ` +
      `reset_token=${resetToken.affectedRows}, ` +
      `email_verification=${emailVerification.affectedRows}, ` +
      `delete_token=${deleteToken.affectedRows}, ` +
      `email_change=${emailChange.affectedRows}.`,
  );
}

cleanupExpiredTokens()
  .catch((err) => {
    console.error("Cleanup failed:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
