const crypto = require("crypto");
const { EventEmitter } = require("events");
const emailService = require("../services/emailService");

const appBaseUrl = (() => {
  const rawValue = process.env.APP_BASE_URL;
  if (!rawValue) {
    throw new Error("APP_BASE_URL is required");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawValue);
  } catch (err) {
    throw new Error("APP_BASE_URL is invalid");
  }

  const isLocalhost =
    parsedUrl.protocol === "http:" &&
    ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname);

  if (parsedUrl.protocol !== "https:" && !isLocalhost) {
    throw new Error("APP_BASE_URL is invalid");
  }

  return parsedUrl.toString().replace(/\/$/, "");
})();

const authEvents = new EventEmitter();

function buildCorrelationId(rawToken) {
  return crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex")
    .slice(0, 16);
}

function deliverEmail(payload, fallbackEventName) {
  const eventName = payload.eventName || fallbackEventName;

  return emailService.sendEmail({ ...payload, eventName }).catch((error) => {
    console.error(`[${eventName}] email delivery failed: ${error.message}`);
  });
}

function sendVerificationEmail(email, rawToken, eventName) {
  return deliverEmail(
    {
      to: email,
      subject: "Aurakon account confirmation",
      eventName,
      correlationId: buildCorrelationId(rawToken),
      html: `<p>Hello,</p>
             <p>Please confirm your Aurakon account using the link below.</p>
             <p><a href="${appBaseUrl}/verify-email?token=${rawToken}">
             Confirm my account</a></p>
             <p>If you did not create this account, you can ignore this message.</p>`,
    },
    eventName,
  );
}

authEvents.on("USER_REGISTERED", ({ email, rawToken }) => {
  console.log("[USER_REGISTERED]");
  sendVerificationEmail(email, rawToken, "USER_REGISTERED");
});

authEvents.on("VERIFICATION_RESENT", ({ email, rawToken }) => {
  console.log("[VERIFICATION_RESENT]");
  sendVerificationEmail(email, rawToken, "VERIFICATION_RESENT");
});

authEvents.on("PASSWORD_RESET_REQUESTED", ({ email, rawToken }) => {
  console.log("[PASSWORD_RESET_REQUESTED]");

  deliverEmail(
    {
      to: email,
      subject: "Aurakon password reset request",
      eventName: "PASSWORD_RESET_REQUESTED",
      correlationId: buildCorrelationId(rawToken),
      html: `<p>Hello,</p>
             <p>Click the link below to reset your Aurakon password. This link is valid for 1 hour.</p>
             <p><a href="${appBaseUrl}/reset-password?token=${rawToken}">
             Reset my password</a></p>
             <p>If you did not request this, you can ignore this message.</p>`,
    },
    "PASSWORD_RESET_REQUESTED",
  );
});

authEvents.on("EMAIL_CHANGE_REQUESTED", ({ email, rawToken }) => {
  console.log("[EMAIL_CHANGE_REQUESTED]");

  deliverEmail(
    {
      to: email,
      subject: "Confirm your new Aurakon email address",
      eventName: "EMAIL_CHANGE_REQUESTED",
      correlationId: buildCorrelationId(rawToken),
      html: `<p>Hello,</p>
             <p>Click the link below to confirm this email address for your Aurakon account.</p>
             <p><a href="${appBaseUrl}/confirm-email-change?token=${rawToken}">
             Confirm my new email</a></p>
             <p>If you did not request this, you can ignore this message.</p>`,
    },
    "EMAIL_CHANGE_REQUESTED",
  );
});

authEvents.on("ACCOUNT_DELETION_REQUESTED", ({ email, rawToken }) => {
  console.log("[ACCOUNT_DELETION_REQUESTED]");

  deliverEmail(
    {
      to: email,
      subject: "Confirm account deletion",
      eventName: "ACCOUNT_DELETION_REQUESTED",
      correlationId: buildCorrelationId(rawToken),
      html: `<p>Hello,</p>
             <p>Click the link below to confirm permanent deletion of your Aurakon account. This action cannot be undone.</p>
             <p><a href="${appBaseUrl}/confirm-account-deletion?token=${rawToken}">
             Confirm account deletion</a></p>
             <p>If you did not request this, you can ignore this message and your account will remain unchanged.</p>`,
    },
    "ACCOUNT_DELETION_REQUESTED",
  );
});

authEvents.on("PASSWORD_CHANGED", ({ email }) => {
  console.log("[PASSWORD_CHANGED]");

  deliverEmail(
    {
      to: email,
      subject: "Your Aurakon password was changed",
      html: `<p>Hello,</p>
             <p>Your Aurakon account password was just changed.</p>
             <p>If you did not make this change, please reset your password immediately and contact support.</p>`,
    },
    "PASSWORD_CHANGED",
  );
});

authEvents.on("PASSWORD_RESET_COMPLETED", ({ email }) => {
  console.log("[PASSWORD_RESET_COMPLETED]");

  deliverEmail(
    {
      to: email,
      subject: "Your Aurakon password was reset",
      html: `<p>Hello,</p>
             <p>Your Aurakon account password was just reset.</p>
             <p>If you did not make this change, please contact support immediately.</p>`,
    },
    "PASSWORD_RESET_COMPLETED",
  );
});

authEvents.on("EMAIL_CHANGED", ({ email }) => {
  console.log("[EMAIL_CHANGED]");

  deliverEmail(
    {
      to: email,
      subject: "Your Aurakon account email was changed",
      html: `<p>Hello,</p>
             <p>The email address on your Aurakon account was just changed away from this address.</p>
             <p>If you did not make this change, please contact support immediately.</p>`,
    },
    "EMAIL_CHANGED",
  );
});

authEvents.on("ACCOUNT_DELETED", ({ email }) => {
  console.log("[ACCOUNT_DELETED]");

  deliverEmail(
    {
      to: email,
      subject: "Your Aurakon account has been deleted",
      html: `<p>Hello,</p>
             <p>Your Aurakon account has been permanently deleted, as requested.</p>`,
    },
    "ACCOUNT_DELETED",
  );
});

module.exports = authEvents;
