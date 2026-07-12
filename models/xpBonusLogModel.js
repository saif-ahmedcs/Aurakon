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

async function insertBonusAward(userId, bonusType, awardedAt, db = pool) {
  await db.query(
    `INSERT INTO xp_bonus_log (user_id, bonus_type, awarded_at)
     VALUES (?, ?, ?)`,
    [userId, bonusType, awardedAt],
  );
}

module.exports = {
  hasBonusBeenAwarded,
  insertBonusAward,
};
