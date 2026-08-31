const { pool } = require("../db");

async function getLastFinalizedDate(userId, db = pool) {
  const [rows] = await db.query(
    `SELECT last_finalized_date FROM user_finalization_checkpoint WHERE user_id = ?`,
    [userId],
  );
  return rows[0] ? rows[0].last_finalized_date : null;
}

async function setLastFinalizedDate(userId, date, db = pool) {
  await db.query(
    `INSERT INTO user_finalization_checkpoint (user_id, last_finalized_date)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE
       last_finalized_date = GREATEST(last_finalized_date, VALUES(last_finalized_date))`,
    [userId, date],
  );
}

module.exports = { getLastFinalizedDate, setLastFinalizedDate };
