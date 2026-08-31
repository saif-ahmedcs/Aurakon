require("dotenv").config();
const { pool } = require("../db");
const reviewSyncService = require("../services/reviewSyncService");

async function run() {
  const [users] = await pool.query("SELECT id, timezone FROM users");
  console.log(
    `Backfilling finalization checkpoint for ${users.length} users...`,
  );

  let succeeded = 0;
  let failed = 0;

  for (const user of users) {
    try {
      await reviewSyncService.evaluatePendingReviews(user.id, user.timezone);
      succeeded += 1;
    } catch (err) {
      failed += 1;
      console.error(`user ${user.id} failed:`, err.message);
    }
  }

  console.log(`Done. ${succeeded} succeeded, ${failed} failed.`);
  await pool.end();
}

run().catch((err) => {
  console.error("Backfill script crashed:", err);
  process.exit(1);
});
