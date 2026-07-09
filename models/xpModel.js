const { pool } = require("../db");

async function incrementTotalXp(userId, amount) {
  await pool.query("UPDATE users SET total_xp = total_xp + ? WHERE id = ?", [
    amount,
    userId,
  ]);
}

async function getTotalXp(userId) {
  const [rows] = await pool.query("SELECT total_xp FROM users WHERE id = ?", [
    userId,
  ]);
  return rows[0] ? rows[0].total_xp : null;
}

module.exports = {
  incrementTotalXp,
  getTotalXp,
};
