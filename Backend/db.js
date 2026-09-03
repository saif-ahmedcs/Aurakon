require("dotenv").config();
const fs = require("fs");
const mysql = require("mysql2/promise");

const sslEnabled = process.env.DB_SSL === "true";
const sslOptions = sslEnabled
  ? {
      minVersion: "TLSv1.2",
      ...(process.env.DB_SSL_CA_PATH
        ? { ca: fs.readFileSync(process.env.DB_SSL_CA_PATH) }
        : {}),
    }
  : undefined;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  dateStrings: true,
  timezone: "Z",
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || "10", 10),
  ...(sslOptions ? { ssl: sslOptions } : {}),
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
    let destroyed = false;
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (err) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        destroyed = true;
        connection.destroy();
        throw err;
      }
      if (
        !RETRYABLE_ERROR_CODES.has(err.code) ||
        attempt === MAX_TRANSACTION_RETRIES
      ) {
        throw err;
      }
      retryable = true;
    } finally {
      if (!destroyed) connection.release();
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
