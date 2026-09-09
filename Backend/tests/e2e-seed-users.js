process.env.TZ = "UTC";
require("dotenv").config();
const bcrypt = require("bcrypt");
const { pool } = require("../db");

const PASSWORD = "E2eVerify123";
const USERS = [
  { email: "verify-user-a@aurakon.test", username: "verifierA", gender: "male" },
  { email: "verify-user-b@aurakon.test", username: "verifierB", gender: "female" },
];

(async () => {
  try {
    const hash = await bcrypt.hash(PASSWORD, 10);
    for (const u of USERS) {
      await pool.query(`DELETE FROM habits WHERE user_id = (SELECT id FROM users WHERE email = ?)`, [u.email]);
      await pool.query(`DELETE FROM users WHERE email = ?`, [u.email]);
      const [r] = await pool.query(
        `INSERT INTO users (email, password_hash, username, gender, is_verified, timezone)
         VALUES (?, ?, ?, ?, true, 'UTC')`,
        [u.email, hash, u.username, u.gender]
      );
      console.log("created user", u.email, "id:", r.insertId);
    }
    console.log("password for both:", PASSWORD);
  } catch (e) {
    console.error("ERR:", e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();

