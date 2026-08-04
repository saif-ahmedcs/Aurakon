require("dotenv").config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  dateStrings: true,
  timezone: "Z",
});

pool.on("connection", (connection) => {
  connection.query("SET time_zone = '+00:00'", (err) => {
    if (err) console.error("Failed to set session time_zone to UTC:", err);
  });
});

const RETRYABLE_ERROR_CODES = new Set([
  "ER_LOCK_DEADLOCK",
  "ER_LOCK_WAIT_TIMEOUT",
]);
const MAX_TRANSACTION_RETRIES = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runInTransaction(callback) {
  for (let attempt = 1; attempt <= MAX_TRANSACTION_RETRIES; attempt++) {
    const connection = await pool.getConnection();
    let retryable = false;
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      if (
        !RETRYABLE_ERROR_CODES.has(err.code) ||
        attempt === MAX_TRANSACTION_RETRIES
      ) {
        throw err;
      }
      retryable = true;
    } finally {
      connection.release();
    }
    if (retryable) {
      await sleep(attempt * 50 + Math.random() * 50);
    }
  }
}

module.exports = {
  pool,
  runInTransaction,
};
