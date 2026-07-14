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

async function findAwardsFromDate(habitId, fromDate, db = pool) {
  const [rows] = await db.query(
    `SELECT milestone, awarded_at FROM guardian_shield_log
     WHERE habit_id = ? AND awarded_at >= ?`,
    [habitId, fromDate],
  );
  return rows;
}

async function deleteAward(habitId, milestone, db = pool) {
  const [result] = await db.query(
    `DELETE FROM guardian_shield_log WHERE habit_id = ? AND milestone = ?`,
    [habitId, milestone],
  );
  return result.affectedRows;
}

module.exports = {
  hasMilestoneBeenAwarded,
  insertAward,
  findAwardsFromDate,
  deleteAward,
};
