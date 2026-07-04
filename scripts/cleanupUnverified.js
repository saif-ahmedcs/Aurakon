require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const pool = require("../db");

const WINDOW_DAYS = Number(process.env.CLEANUP_UNVERIFIED_DAYS ?? 7);

if (!Number.isInteger(WINDOW_DAYS) || WINDOW_DAYS <= 0) {
  console.error("CLEANUP_UNVERIFIED_DAYS must be a positive number");
  process.exit(1);
}

async function cleanupUnverified() {
  const [result] = await pool.query(
    `DELETE FROM users
     WHERE is_verified = false
       AND created_at < (UTC_TIMESTAMP() - INTERVAL ? DAY)`,
    [WINDOW_DAYS],
  );

  console.log(
    `Deleted ${result.affectedRows} unverified account(s) older than ${WINDOW_DAYS} day(s).`,
  );
}

cleanupUnverified()
  .catch((err) => {
    console.error("Cleanup failed:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
