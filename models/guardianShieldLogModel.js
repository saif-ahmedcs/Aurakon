const { pool } = require("../db");

async function hasMilestoneBeenAwarded(habitId, milestone, db = pool) {
  const [rows] = await db.query(
    `SELECT 1 FROM guardian_shield_log
     WHERE habit_id = ? AND milestone = ?
     LIMIT 1`,
    [habitId, milestone],
  );
  return rows.length > 0;
}

async function insertAward(userId, habitId, milestone, awardedAt, db = pool) {
  await db.query(
    `INSERT INTO guardian_shield_log (user_id, habit_id, milestone, awarded_at)
     VALUES (?, ?, ?, ?)`,
    [userId, habitId, milestone, awardedAt],
  );
}

module.exports = { hasMilestoneBeenAwarded, insertAward };
