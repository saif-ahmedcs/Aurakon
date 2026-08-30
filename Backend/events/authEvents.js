const crypto = require("crypto");
const { EventEmitter } = require("events");
const emailService = require("../services/emailService");
const {
  getVerificationEmailHtml,
  getPasswordResetEmailHtml,
  getEmailChangeEmailHtml,
  getAccountDeletionEmailHtml,
  getNotificationEmailHtml,
} = require("../utils/emailTemplates");

const appBaseUrl = (() => {
  const rawValue = process.env.APP_BASE_URL;
  if (!rawValue) {
    throw new Error("APP_BASE_URL is required");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawValue);
  } catch (err) {
    throw new Error(
      "APP_BASE_URL is invalid: must be a valid absolute URL (e.g. https://yourdomain.com or http://localhost:3001)",
    );
  }

  const isLocalhost =
    parsedUrl.protocol === "http:" &&
    ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname);

  if (parsedUrl.protocol !== "https:" && !isLocalhost) {
    throw new Error(
      "APP_BASE_URL is invalid: must use https:// in production or http:// with localhost/127.0.0.1/::1 for local development",
    );
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
  const isResend = eventName === "VERIFICATION_RESENT";
  return deliverEmail(
    {
      to: email,
      subject: "Aurakon account confirmation",
      eventName,
      correlationId: buildCorrelationId(rawToken),
      html: getVerificationEmailHtml(appBaseUrl, rawToken, isResend),
    },
    eventName,
  );
}

authEvents.on("USER_REGISTERED", ({ email, rawToken }) => {
  console.log(`[USER_REGISTERED] recipient=${email}`);
  sendVerificationEmail(email, rawToken, "USER_REGISTERED");
});

authEvents.on("VERIFICATION_RESENT", ({ email, rawToken }) => {
  console.log(`[VERIFICATION_RESENT] recipient=${email}`);
  sendVerificationEmail(email, rawToken, "VERIFICATION_RESENT");
});

authEvents.on("PASSWORD_RESET_REQUESTED", ({ email, rawToken }) => {
  console.log(`[PASSWORD_RESET_REQUESTED] recipient=${email}`);

  deliverEmail(
    {
      to: email,
      subject: "Aurakon password reset request",
      eventName: "PASSWORD_RESET_REQUESTED",
      correlationId: buildCorrelationId(rawToken),
      html: getPasswordResetEmailHtml(appBaseUrl, rawToken),
    },
    "PASSWORD_RESET_REQUESTED",
  );
});

authEvents.on("EMAIL_CHANGE_REQUESTED", ({ email, rawToken }) => {
  console.log(`[EMAIL_CHANGE_REQUESTED] recipient=${email}`);

  deliverEmail(
    {
      to: email,
      subject: "Confirm your new Aurakon email address",
      eventName: "EMAIL_CHANGE_REQUESTED",
      correlationId: buildCorrelationId(rawToken),
      html: getEmailChangeEmailHtml(appBaseUrl, rawToken),
    },
    "EMAIL_CHANGE_REQUESTED",
  );
});

authEvents.on("ACCOUNT_DELETION_REQUESTED", ({ email, rawToken }) => {
  console.log(`[ACCOUNT_DELETION_REQUESTED] recipient=${email}`);

  deliverEmail(
    {
      to: email,
      subject: "Aurakon account deletion request",
      eventName: "ACCOUNT_DELETION_REQUESTED",
      correlationId: buildCorrelationId(rawToken),
      html: getAccountDeletionEmailHtml(appBaseUrl, rawToken),
    },
    "ACCOUNT_DELETION_REQUESTED",
  );
});

authEvents.on("PASSWORD_CHANGED", ({ email }) => {
  console.log(`[PASSWORD_CHANGED] recipient=${email}`);

  deliverEmail(
    {
      to: email,
      subject: "Your Aurakon password was changed",
      html: getNotificationEmailHtml({
        title: "Password Changed",
        subtitle: "Security Alert",
        message:
          "Your Aurakon account password was just changed. If you did not make this change, please reset your password immediately and contact support.",
      }),
    },
    "PASSWORD_CHANGED",
  );
});

authEvents.on("PASSWORD_RESET_COMPLETED", ({ email }) => {
  console.log(`[PASSWORD_RESET_COMPLETED] recipient=${email}`);

  deliverEmail(
    {
      to: email,
      subject: "Your Aurakon password was reset",
      html: getNotificationEmailHtml({
        title: "Password Reset Completed",
        subtitle: "Security Alert",
        message:
          "Your Aurakon account password was just successfully reset. If you did not make this change, please contact support immediately.",
      }),
    },
    "PASSWORD_RESET_COMPLETED",
  );
});

authEvents.on("EMAIL_CHANGED", ({ email }) => {
  console.log(`[EMAIL_CHANGED] recipient=${email}`);

  deliverEmail(
    {
      to: email,
      subject: "Your Aurakon account email was changed",
      html: getNotificationEmailHtml({
        title: "Email Address Changed",
        subtitle: "Security Alert",
        message:
          "The email address on your Aurakon account was just changed away from this address. If you did not make this change, please contact support immediately.",
      }),
    },
    "EMAIL_CHANGED",
  );
});

authEvents.on("ACCOUNT_DELETED", ({ email }) => {
  console.log(`[ACCOUNT_DELETED] recipient=${email}`);

  deliverEmail(
    {
      to: email,
      subject: "Your Aurakon account has been deleted",
      html: getNotificationEmailHtml({
        title: "Account Deleted",
        subtitle: "Farewell, Warrior",
        message:
          "Your Aurakon account has been permanently deleted, as requested. All associated data and progression have been wiped.",
      }),
    },
    "ACCOUNT_DELETED",
  );
});

module.exports = authEvents;
