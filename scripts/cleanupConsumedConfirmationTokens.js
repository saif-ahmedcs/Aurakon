process.env.TZ = "UTC";
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { pool } = require("../db");
const accountDeletionConfirmationModel = require("../models/accountDeletionConfirmationModel");
const { CONFIRMATION_IDEMPOTENCY_WINDOW_MS } = require("../utils/constants");

const WINDOW_SECONDS = Math.floor(CONFIRMATION_IDEMPOTENCY_WINDOW_MS / 1000);

async function cleanupConsumedConfirmationTokens() {
  const [emailVerification] = await pool.query(
    `UPDATE users
     SET email_verification_token_hash = NULL,
         email_verification_expires = NULL,
         email_verification_consumed_at = NULL
     WHERE email_verification_consumed_at IS NOT NULL
       AND email_verification_consumed_at <= UTC_TIMESTAMP() - INTERVAL ? SECOND`,
    [WINDOW_SECONDS],
  );

  const [emailChange] = await pool.query(
    `UPDATE users
     SET email_change_token_hash = NULL,
         email_change_token_expires = NULL,
         email_change_consumed_at = NULL
     WHERE email_change_consumed_at IS NOT NULL
       AND email_change_consumed_at <= UTC_TIMESTAMP() - INTERVAL ? SECOND`,
    [WINDOW_SECONDS],
  );

  const [deleteToken] = await pool.query(
    `UPDATE users
     SET delete_token_hash = NULL,
         delete_token_expires = NULL,
         delete_token_consumed_at = NULL
     WHERE delete_token_consumed_at IS NOT NULL
       AND delete_token_consumed_at <= UTC_TIMESTAMP() - INTERVAL ? SECOND`,
    [WINDOW_SECONDS],
  );

  const cutoff = new Date(Date.now() - CONFIRMATION_IDEMPOTENCY_WINDOW_MS);
  const deletionRecords =
    await accountDeletionConfirmationModel.deleteOlderThan(cutoff);

  console.log(
    `Cleaned up consumed confirmation tokens: ` +
      `email_verification=${emailVerification.affectedRows}, ` +
      `email_change=${emailChange.affectedRows}, ` +
      `delete_token=${deleteToken.affectedRows}, ` +
      `account_deletion_confirmations=${deletionRecords}.`,
  );
}

cleanupConsumedConfirmationTokens()
  .catch((err) => {
    console.error("Cleanup failed:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
