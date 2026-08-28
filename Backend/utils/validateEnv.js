require("dotenv").config();

const required = [
  "NODE_ENV",
  "JWT_SECRET",
  "DB_HOST",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "GMAIL_USER",
  "GMAIL_APP_PASSWORD",
  "APP_BASE_URL",
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(
    `\n[startup] FATAL: Missing required environment variables:\n  ${missing.join("\n  ")}\n\n` +
      "Add them to .env (see .env.example) and restart.\n",
  );
  process.exit(1);
}

const JWT_SECRET_MIN_LENGTH = 32;

if (process.env.JWT_SECRET.length < JWT_SECRET_MIN_LENGTH) {
  console.error("[startup] FATAL: JWT_SECRET must be at least 32 characters.");
  process.exit(1);
}
