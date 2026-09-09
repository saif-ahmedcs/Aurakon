process.env.TZ = "UTC";
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { pool } = require("../db");
const { calculateHabitStreaks } = require("../utils/streak");
const { todayInTimezone } = require("../utils/timezone");

const sampleArg = process.argv.find((arg) => arg.startsWith("--sample="));
const SAMPLE_SIZE = sampleArg ? parseInt(sampleArg.split("=")[1], 10) : null;

async function verifyStreakSync() {
  const [habits] = await pool.query(
    `SELECT h.id, h.user_id, h.current_streak, h.longest_streak, u.timezone
     FROM habits h
     JOIN users u ON u.id = h.user_id
     WHERE h.archived_at IS NULL
     ${SAMPLE_SIZE ? "ORDER BY RAND() LIMIT ?" : ""}`,
    SAMPLE_SIZE ? [SAMPLE_SIZE] : [],
  );

  let checked = 0;
  let mismatches = 0;

  for (const habit of habits) {
    const [logRows] = await pool.query(
      "SELECT log_date, status FROM habit_logs WHERE habit_id = ?",
      [habit.id],
    );
    const logs = logRows.map((row) => ({
      date: row.log_date,
      status: row.status,
    }));

    const asOfDate = todayInTimezone(habit.timezone);
    const { currentStreak, longestStreak } = calculateHabitStreaks(
      logs,
      asOfDate,
    );

    checked++;

    if (
      currentStreak !== habit.current_streak ||
      longestStreak !== habit.longest_streak
    ) {
      mismatches++;
      console.log(
        `MISMATCH habit_id=${habit.id} user_id=${habit.user_id} ` +
          `stored=(current=${habit.current_streak}, longest=${habit.longest_streak}) ` +
          `recomputed=(current=${currentStreak}, longest=${longestStreak})`,
      );
    }
  }

  console.log(`Checked ${checked} habit(s), found ${mismatches} mismatch(es).`);
  if (mismatches > 0) {
    process.exitCode = 1;
  }
}

verifyStreakSync()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
