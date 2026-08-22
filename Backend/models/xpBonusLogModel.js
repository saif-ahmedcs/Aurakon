const { pool } = require("../db");

async function hasBonusBeenAwarded(userId, bonusType, awardedAt, db = pool) {
  const [rows] = await db.query(
    `SELECT 1 FROM xp_bonus_log
     WHERE user_id = ? AND bonus_type = ? AND awarded_at = ?
     LIMIT 1`,
    [userId, bonusType, awardedAt],
  );
  return rows.length > 0;
}

async function countByUserAndType(
  userId,
  bonusType,
  db = pool,
  forUpdate = false,
) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count FROM xp_bonus_log WHERE user_id = ? AND bonus_type = ?${
      forUpdate ? " FOR UPDATE" : ""
    }`,
    [userId, bonusType],
  );
  return Number(rows[0].count);
}

async function insertBonusAward(
  userId,
  bonusType,
  awardedAt,
  requiredHabitCount,
  db = pool,
) {
  await db.query(
    `INSERT INTO xp_bonus_log (user_id, bonus_type, awarded_at, required_habit_count)
     VALUES (?, ?, ?, ?)`,
    [userId, bonusType, awardedAt, requiredHabitCount],
  );
}

async function findAwardsFromDate(userId, fromDate, db = pool) {
  const [rows] = await db.query(
    `SELECT bonus_type, awarded_at, required_habit_count FROM xp_bonus_log
     WHERE user_id = ? AND awarded_at >= ? FOR UPDATE`,
    [userId, fromDate],
  );
  return rows;
}

async function deleteAward(userId, bonusType, awardedAt, db = pool) {
  const [result] = await db.query(
    `DELETE FROM xp_bonus_log WHERE user_id = ? AND bonus_type = ? AND awarded_at = ?`,
    [userId, bonusType, awardedAt],
  );
  return result.affectedRows;
}

module.exports = {
  hasBonusBeenAwarded,
  countByUserAndType,
  insertBonusAward,
  findAwardsFromDate,
  deleteAward,
};
