process.env.TZ = "UTC";
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { pool } = require("../db");
const accountDeletionConfirmationModel = require("../models/accountDeletionConfirmationModel");
const { CONFIRMATION_IDEMPOTENCY_WINDOW_MS } = require("../utils/constants");

const WINDOW_SECONDS = Math.floor(CONFIRMATION_IDEMPOTENCY_WINDOW_MS / 1000);

async function cleanupConsumedConfirmationTokens() {
  const results = {};
  let hadFailure = false;

  try {
    const [emailVerification] = await pool.query(
      `UPDATE users
       SET email_verification_token_hash = NULL,
           email_verification_expires = NULL,
           email_verification_consumed_at = NULL
       WHERE email_verification_consumed_at IS NOT NULL
         AND email_verification_consumed_at <= UTC_TIMESTAMP() - INTERVAL ? SECOND`,
      [WINDOW_SECONDS],
    );
    results.emailVerification = emailVerification;
  } catch (error) {
    hadFailure = true;
    console.error("Cleanup failed for email_verification:", error);
  }

  try {
    const [emailChange] = await pool.query(
      `UPDATE users
       SET email_change_token_hash = NULL,
           email_change_token_expires = NULL,
           email_change_consumed_at = NULL
       WHERE email_change_consumed_at IS NOT NULL
         AND email_change_consumed_at <= UTC_TIMESTAMP() - INTERVAL ? SECOND`,
      [WINDOW_SECONDS],
    );
    results.emailChange = emailChange;
  } catch (error) {
    hadFailure = true;
    console.error("Cleanup failed for email_change:", error);
  }

  try {
    const [resetToken] = await pool.query(
      `UPDATE users
       SET reset_token_hash = NULL,
           reset_token_expires = NULL,
           reset_token_consumed_at = NULL
       WHERE reset_token_consumed_at IS NOT NULL
         AND reset_token_consumed_at <= UTC_TIMESTAMP() - INTERVAL ? SECOND`,
      [WINDOW_SECONDS],
    );
    results.resetToken = resetToken;
  } catch (error) {
    hadFailure = true;
    console.error("Cleanup failed for reset_token:", error);
  }

  try {
    const cutoff = new Date(Date.now() - CONFIRMATION_IDEMPOTENCY_WINDOW_MS);
    results.deletionRecords =
      await accountDeletionConfirmationModel.deleteOlderThan(cutoff);
  } catch (error) {
    hadFailure = true;
    console.error("Cleanup failed for account_deletion_confirmations:", error);
  }

  if (hadFailure) {
    throw new Error(
      "One or more consumed-confirmation-token cleanup operations failed",
    );
  }

  console.log(
    `Cleaned up consumed confirmation tokens: ` +
      `email_verification=${results.emailVerification?.affectedRows ?? 0}, ` +
      `email_change=${results.emailChange?.affectedRows ?? 0}, ` +
      `reset_token=${results.resetToken?.affectedRows ?? 0}, ` +
      `account_deletion_confirmations=${results.deletionRecords ?? 0}.`,
  );

  return results;
}

if (require.main === module) {
  cleanupConsumedConfirmationTokens()
    .catch((err) => {
      console.error("Cleanup failed:", err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { cleanupConsumedConfirmationTokens };
