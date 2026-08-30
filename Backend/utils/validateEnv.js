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

if (
  process.env.CLEANUP_UNVERIFIED_DAYS !== undefined &&
  (!Number.isInteger(Number(process.env.CLEANUP_UNVERIFIED_DAYS)) ||
    Number(process.env.CLEANUP_UNVERIFIED_DAYS) <= 0)
) {
  console.error(
    "[startup] FATAL: CLEANUP_UNVERIFIED_DAYS must be a positive integer.",
  );
  process.exit(1);
}

let parsedAppBaseUrl;
try {
  parsedAppBaseUrl = new URL(process.env.APP_BASE_URL);
} catch (err) {
  console.error(
    "[startup] FATAL: APP_BASE_URL must be a valid absolute URL (e.g. https://yourdomain.com or http://localhost:3001).",
  );
  process.exit(1);
}

const isLocalhost =
  parsedAppBaseUrl.protocol === "http:" &&
  ["localhost", "127.0.0.1", "::1"].includes(parsedAppBaseUrl.hostname);

if (parsedAppBaseUrl.protocol !== "https:" && !isLocalhost) {
  console.error(
    "[startup] FATAL: APP_BASE_URL must use https:// in production. Plain http:// is only permitted for localhost / 127.0.0.1 / ::1 in local development.",
  );
  process.exit(1);
}
