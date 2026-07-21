const { pool } = require("../db");

async function hasMilestoneBeenAwarded(
  habitId,
  milestone,
  streakStartDate,
  db = pool,
) {
  const [rows] = await db.query(
    `SELECT 1 FROM guardian_shield_log
     WHERE habit_id = ? AND milestone = ? AND streak_start_date = ?
     LIMIT 1`,
    [habitId, milestone, streakStartDate],
  );
  return rows.length > 0;
}

async function insertAward(
  userId,
  habitId,
  milestone,
  streakStartDate,
  awardedAt,
  db = pool,
) {
  await db.query(
    `INSERT INTO guardian_shield_log (user_id, habit_id, milestone, streak_start_date, awarded_at)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, habitId, milestone, streakStartDate, awardedAt],
  );
}

async function findAwardsFromDate(habitId, fromDate, db = pool) {
  const [rows] = await db.query(
    `SELECT id, milestone, streak_start_date, awarded_at, status, spent_habit_log_id
     FROM guardian_shield_log
     WHERE habit_id = ? AND awarded_at >= ?
     ORDER BY awarded_at ASC, id ASC`,
    [habitId, fromDate],
  );
  return rows;
}

async function findOldestAvailableForUser(userId, db = pool) {
  const [rows] = await db.query(
    `SELECT id, habit_id, milestone, awarded_at
     FROM guardian_shield_log
     WHERE user_id = ? AND status = 'available'
     ORDER BY awarded_at ASC, id ASC
     LIMIT 1
     FOR UPDATE`,
    [userId],
  );
  return rows[0] || null;
}

async function markSpent(id, habitLogId, db = pool) {
  await db.query(
    `UPDATE guardian_shield_log
     SET status = 'spent', spent_habit_log_id = ?
     WHERE id = ? AND status = 'available'`,
    [habitLogId, id],
  );
}

async function countAvailable(userId, db = pool, forUpdate = false) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count FROM guardian_shield_log
     WHERE user_id = ? AND status = 'available'${
       forUpdate ? " FOR UPDATE" : ""
     }`,
    [userId],
  );
  return rows[0].count;
}

async function deleteAward(id, db = pool) {
  const [result] = await db.query(
    `DELETE FROM guardian_shield_log WHERE id = ?`,
    [id],
  );
  return result.affectedRows;
}

module.exports = {
  hasMilestoneBeenAwarded,
  insertAward,
  findAwardsFromDate,
  findOldestAvailableForUser,
  markSpent,
  countAvailable,
  deleteAward,
};
