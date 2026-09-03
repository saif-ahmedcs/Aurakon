process.env.TZ = "UTC";
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { pool, runInTransaction } = require("../db");
const habitModel = require("../models/habitModel");

const DEMO_ACCOUNT_TTL_HOURS = Number(process.env.CLEANUP_DEMO_HOURS ?? 24);

async function cleanupExpiredDemoAccounts() {
  if (!Number.isInteger(DEMO_ACCOUNT_TTL_HOURS) || DEMO_ACCOUNT_TTL_HOURS <= 0) {
    throw new Error("CLEANUP_DEMO_HOURS must be a positive integer");
  }

  const [rows] = await pool.query(
    `SELECT id FROM users
     WHERE (email LIKE 'demo+%@aurakon.app' OR email = 'demo@aurakon.app')
       AND created_at < (UTC_TIMESTAMP() - INTERVAL ? HOUR)`,
    [DEMO_ACCOUNT_TTL_HOURS],
  );

  let deletedCount = 0;
  let hadFailure = false;

  for (const { id } of rows) {
    try {
      const removed = await runInTransaction(async (tx) => {
        const [eligibleRows] = await tx.query(
          `SELECT id FROM users
           WHERE id = ?
             AND (email LIKE 'demo+%@aurakon.app' OR email = 'demo@aurakon.app')
             AND created_at < (UTC_TIMESTAMP() - INTERVAL ? HOUR)
           FOR UPDATE`,
          [id, DEMO_ACCOUNT_TTL_HOURS],
        );

        if (eligibleRows.length === 0) {
          return 0;
        }

        await tx.query(
          "DELETE FROM account_deletion_confirmations WHERE user_id = ?",
          [id],
        );
        await habitModel.deleteAllByUser(id, tx);

        const [result] = await tx.query(`DELETE FROM users WHERE id = ?`, [id]);

        return result.affectedRows;
      });

      deletedCount += removed;
    } catch (error) {
      hadFailure = true;
      console.error(`Failed to cleanup expired demo user ${id}:`, error);
    }
  }

  if (hadFailure) {
    throw new Error(
      "One or more expired demo-account cleanup operations failed",
    );
  }

  console.log(
    `Deleted ${deletedCount} expired demo account(s) older than ${DEMO_ACCOUNT_TTL_HOURS} hour(s).`,
  );

  return { deletedCount };
}

if (require.main === module) {
  cleanupExpiredDemoAccounts()
    .catch((err) => {
      console.error("Cleanup failed:", err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { cleanupExpiredDemoAccounts };
