process.env.TZ = "UTC";
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { pool, runInTransaction } = require("../db");
const habitModel = require("../models/habitModel");

const WINDOW_DAYS = Number(process.env.CLEANUP_UNVERIFIED_DAYS ?? 7);

async function cleanupUnverified() {
  if (!Number.isInteger(WINDOW_DAYS) || WINDOW_DAYS <= 0) {
    throw new Error("CLEANUP_UNVERIFIED_DAYS must be a positive integer");
  }

  const [rows] = await pool.query(
    `SELECT id FROM users
     WHERE is_verified = false
       AND created_at < (UTC_TIMESTAMP() - INTERVAL ? DAY)`,
    [WINDOW_DAYS],
  );

  let deletedCount = 0;
  let hadFailure = false;

  for (const { id } of rows) {
    try {
      const removed = await runInTransaction(async (tx) => {
        const [eligibleRows] = await tx.query(
          `SELECT id FROM users
           WHERE id = ?
             AND is_verified = false
             AND created_at < (UTC_TIMESTAMP() - INTERVAL ? DAY)
           FOR UPDATE`,
          [id, WINDOW_DAYS],
        );

        if (eligibleRows.length === 0) {
          return 0;
        }

        await habitModel.deleteAllByUser(id, tx);

        const [result] = await tx.query(`DELETE FROM users WHERE id = ?`, [id]);

        return result.affectedRows;
      });

      deletedCount += removed;
    } catch (error) {
      hadFailure = true;
      console.error(`Failed to cleanup unverified user ${id}:`, error);
    }
  }

  if (hadFailure) {
    throw new Error("One or more unverified-account cleanup operations failed");
  }

  console.log(
    `Deleted ${deletedCount} unverified account(s) older than ${WINDOW_DAYS} day(s).`,
  );

  return { deletedCount };
}

if (require.main === module) {
  cleanupUnverified()
    .catch((err) => {
      console.error("Cleanup failed:", err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { cleanupUnverified };
