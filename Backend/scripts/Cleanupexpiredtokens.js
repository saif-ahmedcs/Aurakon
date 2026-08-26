process.env.TZ = "UTC";
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { pool } = require("../db");
const {
  USED_TOKEN_GRACE_PERIOD_MS,
} = require("../utils/constants");

async function cleanupExpiredTokens() {
  const results = {};
  let hadFailure = false;

  try {
    const [refreshTokens] = await pool.query(
      `DELETE FROM refresh_tokens WHERE expires_at < UTC_TIMESTAMP()`,
    );
    results.refreshTokens = refreshTokens;
  } catch (error) {
    hadFailure = true;
    console.error("Cleanup failed for refresh_tokens:", error);
  }

  try {
    const usedGraceCutoff = new Date(Date.now() - USED_TOKEN_GRACE_PERIOD_MS);
    const [usedTokens] = await pool.query(
      `DELETE FROM refresh_tokens WHERE used_at IS NOT NULL AND used_at < ?`,
      [usedGraceCutoff],
    );
    results.usedTokens = usedTokens;
  } catch (error) {
    hadFailure = true;
    console.error("Cleanup failed for used refresh_tokens:", error);
  }

  try {
    const [resetToken] = await pool.query(
      `UPDATE users
       SET reset_token_hash = NULL,
           reset_token_expires = NULL
       WHERE reset_token_hash IS NOT NULL
         AND reset_token_expires <= UTC_TIMESTAMP()
         AND reset_token_consumed_at IS NULL`,
    );
    results.resetToken = resetToken;
  } catch (error) {
    hadFailure = true;
    console.error("Cleanup failed for reset_token:", error);
  }

  try {
    const [emailVerification] = await pool.query(
      `UPDATE users
       SET email_verification_token_hash = NULL,
           email_verification_expires = NULL
       WHERE is_verified = false
         AND email_verification_token_hash IS NOT NULL
         AND email_verification_expires <= UTC_TIMESTAMP()`,
    );
    results.emailVerification = emailVerification;
  } catch (error) {
    hadFailure = true;
    console.error("Cleanup failed for email_verification:", error);
  }

  try {
    const [deleteToken] = await pool.query(
      `UPDATE users
       SET delete_token_hash = NULL,
           delete_token_expires = NULL
       WHERE delete_token_hash IS NOT NULL
         AND delete_token_expires <= UTC_TIMESTAMP()`,
    );
    results.deleteToken = deleteToken;
  } catch (error) {
    hadFailure = true;
    console.error("Cleanup failed for delete_token:", error);
  }

  try {
    const [emailChange] = await pool.query(
      `UPDATE users
       SET pending_email = NULL,
           email_change_token_hash = NULL,
           email_change_token_expires = NULL
       WHERE email_change_token_hash IS NOT NULL
         AND email_change_token_expires <= UTC_TIMESTAMP()
         AND email_change_consumed_at IS NULL`,
    );
    results.emailChange = emailChange;
  } catch (error) {
    hadFailure = true;
    console.error("Cleanup failed for email_change:", error);
  }

  if (hadFailure) {
    process.exitCode = 1;
  }

  console.log(
    `Cleaned up expired tokens: ` +
      `refresh_tokens=${results.refreshTokens?.affectedRows ?? 0}, ` +
      `used_refresh_tokens=${results.usedTokens?.affectedRows ?? 0}, ` +
      `reset_token=${results.resetToken?.affectedRows ?? 0}, ` +
      `email_verification=${results.emailVerification?.affectedRows ?? 0}, ` +
      `delete_token=${results.deleteToken?.affectedRows ?? 0}, ` +
      `email_change=${results.emailChange?.affectedRows ?? 0}.`,
  );
}

cleanupExpiredTokens()
  .catch((err) => {
    console.error("Cleanup failed:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
