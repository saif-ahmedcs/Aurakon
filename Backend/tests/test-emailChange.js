process.env.TZ = "UTC";
require("dotenv").config();

// Mock emailService so no real SMTP call is made (same pattern as test-authEvents.js)
const Module = require("module");
const originalRequire = Module.prototype.require;
const sentEmails = [];

Module.prototype.require = function (id) {
  if (
    id === "../services/emailService" ||
    id.endsWith("services/emailService")
  ) {
    return {
      sendEmail: (args) => {
        sentEmails.push(args);
        return Promise.resolve(null);
      },
    };
  }
  return originalRequire.apply(this, arguments);
};

const bcrypt = require("bcrypt");
const express = require("express");
const cookieParser = require("cookie-parser");
const { pool } = require("../db");
const emailChangeService = require("../services/emailChangeService");
const authRouter = require("../routes/auth");
const errorHandler = require("../middleware/errorHandler");
const { generateAccessToken } = require("../utils/tokenUtils");
const {
  requestEmailChangeSchema,
} = require("../middleware/schemas/authSchemas");
Module.prototype.require = originalRequire;

const TEST_EMAIL = "email-change-harness@local.test";
const OTHER_EMAIL = "email-change-harness-other@local.test";
const NEW_EMAIL = "email-change-harness-new@local.test";
const SECOND_NEW_EMAIL = "email-change-harness-second@local.test";
const SUPERSEDE_X_EMAIL = "email-change-harness-x@local.test";
const SUPERSEDE_Y_EMAIL = "email-change-harness-y@local.test";
const RATE_LIMIT_EMAIL = "email-change-harness-ratelimit@local.test";
const VALIDATION_EMAIL = "email-change-harness-validation@local.test";
const PASSWORD = "Passw0rd1";

const ALL_HARNESS_EMAILS = [
  TEST_EMAIL,
  OTHER_EMAIL,
  NEW_EMAIL,
  SECOND_NEW_EMAIL,
  SUPERSEDE_X_EMAIL,
  SUPERSEDE_Y_EMAIL,
  RATE_LIMIT_EMAIL,
  VALIDATION_EMAIL,
];

let pass = 0,
  fail = 0;

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(
    (ok ? "PASS" : "FAIL") +
      " - " +
      name +
      " => " +
      JSON.stringify(actual) +
      " (expected " +
      JSON.stringify(expected) +
      ")",
  );
  if (ok) pass++;
  else fail++;
}

async function resetHarnessUsers() {
  await pool.query(
    `DELETE FROM users WHERE email IN (${ALL_HARNESS_EMAILS.map(() => "?").join(",")})`,
    ALL_HARNESS_EMAILS,
  );
}

async function createUser(email, username = "harness") {
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  const [result] = await pool.query(
    `INSERT INTO users (email, password_hash, username, is_verified, timezone, created_at)
     VALUES (?, ?, ?, true, 'UTC', UTC_TIMESTAMP())`,
    [email, passwordHash, username],
  );
  return result.insertId;
}

async function resetAndCreateUsers() {
  await resetHarnessUsers();

  const testUserId = await createUser(TEST_EMAIL, "harness");
  await createUser(OTHER_EMAIL, "harness-other");

  return testUserId;
}

function extractToken(html) {
  const match = html.match(/token=([a-f0-9]+)/);
  return match ? match[1] : null;
}

async function main() {
  const userId = await resetAndCreateUsers();

  // 1. wrong current password
  try {
    await emailChangeService.requestEmailChange(userId, NEW_EMAIL, "wrongpass");
    check("wrong password rejected", "no error thrown", "error thrown");
  } catch (err) {
    check("wrong password rejected", err.status, 401);
  }

  // 2. same email as current - a deliberate no-op success, not an error
  sentEmails.length = 0;
  const noopResult = await emailChangeService.requestEmailChange(
    userId,
    TEST_EMAIL,
    PASSWORD,
  );
  check(
    "same email returns no-op message",
    typeof noopResult.message,
    "string",
  );
  check("same email sends no email", sentEmails.length, 0);
  const [noopRows] = await pool.query(
    "SELECT pending_email FROM users WHERE id = ?",
    [userId],
  );
  check("same email stores no pending change", noopRows[0].pending_email, null);

  // 3. email already used by another account
  try {
    await emailChangeService.requestEmailChange(userId, OTHER_EMAIL, PASSWORD);
    check("duplicate email rejected", "no error thrown", "error thrown");
  } catch (err) {
    check("duplicate email rejected", err.status, 409);
  }

  // 4. happy path request
  sentEmails.length = 0;
  const requestResult = await emailChangeService.requestEmailChange(
    userId,
    NEW_EMAIL,
    PASSWORD,
  );
  check("request returns message", typeof requestResult.message, "string");
  check("email sent to new address", sentEmails[0]?.to, NEW_EMAIL);

  const [pendingRows] = await pool.query(
    "SELECT pending_email, email_change_token_hash, email_change_token_expires FROM users WHERE id = ?",
    [userId],
  );
  check("pending_email stored", pendingRows[0].pending_email, NEW_EMAIL);
  check(
    "token hash stored",
    typeof pendingRows[0].email_change_token_hash,
    "string",
  );
  check(
    "email unchanged until confirmed",
    (await pool.query("SELECT email FROM users WHERE id = ?", [userId]))[0][0]
      .email,
    TEST_EMAIL,
  );

  const rawToken = extractToken(sentEmails[0].html);
  check("token extracted from email link", !!rawToken, true);

  // 5. confirm with valid token (confirmation re-checks the current password)
  const confirmResult = await emailChangeService.confirmEmailChange(
    rawToken,
    PASSWORD,
  );
  check("confirm returns message", typeof confirmResult.message, "string");

  const [afterRows] = await pool.query(
    "SELECT email, pending_email, email_change_token_hash, email_change_token_expires, email_change_consumed_at FROM users WHERE id = ?",
    [userId],
  );
  check("email updated to new address", afterRows[0].email, NEW_EMAIL);
  check("pending_email cleared", afterRows[0].pending_email, null);
  // The hash/expiry are intentionally retained until the idempotency
  // window passes - they power the "recently consumed" replay state.
  check(
    "token hash retained for replay window",
    typeof afterRows[0].email_change_token_hash,
    "string",
  );
  check("consumed_at stamped", !!afterRows[0].email_change_consumed_at, true);

  // 6. token reuse inside the idempotency window replays the success
  const replayResult = await emailChangeService.confirmEmailChange(
    rawToken,
    PASSWORD,
  );
  check("recent reuse replays success", typeof replayResult.message, "string");
  const [replayRows] = await pool.query(
    "SELECT email FROM users WHERE id = ?",
    [userId],
  );
  check("email unchanged after replay", replayRows[0].email, NEW_EMAIL);

  // 6b. token reuse with the wrong password is rejected
  try {
    await emailChangeService.confirmEmailChange(rawToken, "wrongpass");
    check(
      "reuse with wrong password rejected",
      "no error thrown",
      "error thrown",
    );
  } catch (err) {
    check("reuse with wrong password rejected", err.status, 401);
  }

  // 7. expired token rejected and cleared
  sentEmails.length = 0;
  // The retained expiry from the previous issuance still gates the
  // re-request cooldown - backdate it so the cooldown has elapsed while
  // keeping the flow otherwise identical.
  await pool.query(
    "UPDATE users SET email_change_token_expires = UTC_TIMESTAMP() + INTERVAL 22 HOUR WHERE id = ?",
    [userId],
  );
  await emailChangeService.requestEmailChange(
    userId,
    SECOND_NEW_EMAIL,
    PASSWORD,
  );
  const expiredToken = extractToken(sentEmails[0].html);

  await pool.query(
    "UPDATE users SET email_change_token_expires = UTC_TIMESTAMP() - INTERVAL 1 HOUR WHERE id = ?",
    [userId],
  );

  try {
    await emailChangeService.confirmEmailChange(expiredToken, PASSWORD);
    check("expired token rejected", "no error thrown", "error thrown");
  } catch (err) {
    check("expired token rejected", err.status, 400);
  }

  const [expiredRows] = await pool.query(
    "SELECT email, pending_email, email_change_token_hash FROM users WHERE id = ?",
    [userId],
  );
  check("email unchanged after expired token", expiredRows[0].email, NEW_EMAIL);
  check(
    "stale pending_email cleared after expiry",
    expiredRows[0].pending_email,
    null,
  );
  check(
    "stale token hash cleared after expiry",
    expiredRows[0].email_change_token_hash,
    null,
  );

  // 8. missing token
  try {
    await emailChangeService.confirmEmailChange(null, PASSWORD);
    check("missing token rejected", "no error thrown", "error thrown");
  } catch (err) {
    check("missing token rejected", err.status, 400);
  }

  // 9. superseding pending requests - a re-request is only allowed once
  // the 2-minute cooldown since the previous issuance has elapsed, so
  // backdate the first token's expiry into the still-active range with
  // its issuance far enough in the past.
  const supersedeUserId = await createUser(
    "email-change-harness-supersede@local.test",
    "harness-supersede",
  );

  sentEmails.length = 0;
  await emailChangeService.requestEmailChange(
    supersedeUserId,
    SUPERSEDE_X_EMAIL,
    PASSWORD,
  );
  const tokenX = extractToken(sentEmails[0].html);

  await pool.query(
    "UPDATE users SET email_change_token_expires = UTC_TIMESTAMP() + INTERVAL 22 HOUR WHERE id = ?",
    [supersedeUserId],
  );

  sentEmails.length = 0;
  await emailChangeService.requestEmailChange(
    supersedeUserId,
    SUPERSEDE_Y_EMAIL,
    PASSWORD,
  );
  const tokenY = extractToken(sentEmails[0].html);

  const [supersedeRow] = await pool.query(
    "SELECT pending_email FROM users WHERE id = ?",
    [supersedeUserId],
  );
  check(
    "pending_email updated to latest request",
    supersedeRow[0].pending_email,
    SUPERSEDE_Y_EMAIL,
  );

  try {
    await emailChangeService.confirmEmailChange(tokenX, PASSWORD);
    check("superseded token rejected", "no error thrown", "error thrown");
  } catch (err) {
    check("superseded token rejected", err.status, 400);
  }

  const confirmY = await emailChangeService.confirmEmailChange(
    tokenY,
    PASSWORD,
  );
  check(
    "latest token confirms successfully",
    typeof confirmY.message,
    "string",
  );

  const [supersedeAfter] = await pool.query(
    "SELECT email FROM users WHERE id = ?",
    [supersedeUserId],
  );
  check(
    "email updated to latest requested address",
    supersedeAfter[0].email,
    SUPERSEDE_Y_EMAIL,
  );

  // ---------- HTTP-level scenarios (rate limiting + validation enforcement) ----------

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/auth", authRouter);
  app.use(errorHandler);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/auth`;

  async function patchEmail(token, body) {
    return fetch(`${baseUrl}/email`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  }

  async function verifyEmailChange(token) {
    return fetch(
      `${baseUrl}/verify-email-change?token=${encodeURIComponent(token)}`,
    );
  }

  // 10. rate limiting - PATCH /api/auth/email (max 5 per 15 min, keyed by user id)
  const rateLimitUserId = await createUser(RATE_LIMIT_EMAIL, "harness-rl");
  const rateLimitAccessToken = generateAccessToken({
    id: rateLimitUserId,
    email: RATE_LIMIT_EMAIL,
    username: "harness-rl",
  });

  let sawPatchRateLimit = false;
  for (let i = 0; i < 6; i++) {
    // invalid email keeps every request from ever reaching the service layer
    const res = await patchEmail(rateLimitAccessToken, {
      newEmail: "not-an-email",
      currentPassword: PASSWORD,
    });
    if (i < 5) {
      check(
        `PATCH /email request ${i + 1} not rate limited`,
        res.status !== 429,
        true,
      );
    } else {
      sawPatchRateLimit = res.status === 429;
    }
  }
  check(
    "PATCH /email rate limited after exceeding max",
    sawPatchRateLimit,
    true,
  );

  // 11. rate limiting - GET /api/auth/verify-email-change (max 10 per 15 min, keyed by IP)
  let sawVerifyRateLimit = false;
  for (let i = 0; i < 11; i++) {
    const res = await verifyEmailChange("not-a-real-token");
    if (i < 10) {
      check(
        `GET /verify-email-change request ${i + 1} not rate limited`,
        res.status !== 429,
        true,
      );
    } else {
      sawVerifyRateLimit = res.status === 429;
    }
  }
  check(
    "GET /verify-email-change rate limited after exceeding max",
    sawVerifyRateLimit,
    true,
  );

  // 12. input validation - enforced by requestEmailChangeSchema, not the service layer
  check(
    "schema rejects invalid email format",
    requestEmailChangeSchema.safeParse({
      newEmail: "not-an-email",
      currentPassword: PASSWORD,
    }).success,
    false,
  );
  check(
    "schema rejects empty currentPassword",
    requestEmailChangeSchema.safeParse({
      newEmail: NEW_EMAIL,
      currentPassword: "",
    }).success,
    false,
  );
  check(
    "schema rejects missing currentPassword",
    requestEmailChangeSchema.safeParse({ newEmail: NEW_EMAIL }).success,
    false,
  );
  check(
    "schema rejects missing newEmail",
    requestEmailChangeSchema.safeParse({ currentPassword: PASSWORD }).success,
    false,
  );
  check(
    "schema accepts valid payload",
    requestEmailChangeSchema.safeParse({
      newEmail: NEW_EMAIL,
      currentPassword: PASSWORD,
    }).success,
    true,
  );

  const validationUserId = await createUser(VALIDATION_EMAIL, "harness-val");
  const validationAccessToken = generateAccessToken({
    id: validationUserId,
    email: VALIDATION_EMAIL,
    username: "harness-val",
  });

  let requestEmailChangeCalls = 0;
  const originalRequestEmailChange = emailChangeService.requestEmailChange;
  emailChangeService.requestEmailChange = (...args) => {
    requestEmailChangeCalls++;
    return originalRequestEmailChange(...args);
  };

  const invalidRes = await patchEmail(validationAccessToken, {
    newEmail: "not-an-email",
    currentPassword: "",
  });
  const invalidBody = await invalidRes.json();

  emailChangeService.requestEmailChange = originalRequestEmailChange;

  check("invalid input returns 400", invalidRes.status, 400);
  check(
    "validation error surfaced to client",
    typeof invalidBody.error,
    "string",
  );
  check(
    "service layer never invoked for invalid input",
    requestEmailChangeCalls,
    0,
  );

  await new Promise((resolve) => server.close(resolve));

  await pool.query("DELETE FROM users WHERE email = ?", [
    "email-change-harness-supersede@local.test",
  ]);
  await resetHarnessUsers();

  console.log("---");
  console.log(pass + " passed, " + fail + " failed");
}

main()
  .catch((err) => {
    console.error("Harness failed:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
