const { pool } = require("../db");

async function incrementTotalXp(userId, amount, db = pool) {
  await db.query(
    "UPDATE users SET total_xp = GREATEST(total_xp + ?, 0) WHERE id = ?",
    [amount, userId],
  );
}

async function setTotalXp(userId, amount, db = pool) {
  await db.query("UPDATE users SET total_xp = ? WHERE id = ?", [
    amount,
    userId,
  ]);
}

async function getTotalXp(userId, db = pool) {
  const [rows] = await db.query("SELECT total_xp FROM users WHERE id = ?", [
    userId,
  ]);
  return rows[0] ? rows[0].total_xp : null;
}

module.exports = {
  incrementTotalXp,
  setTotalXp,
  getTotalXp,
};
