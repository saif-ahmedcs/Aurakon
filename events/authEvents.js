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

  return parsedUrl.toString().replace(/\/$/, "");
})();

const authEvents = new EventEmitter();

function sendVerificationEmail(email, rawToken) {
  return emailService.sendEmail({
    to: email,
    subject: "Aurakon account confirmation",
    html: `<p>Hello,</p>
           <p>Please confirm your Aurakon account using the link below.</p>
           <p><a href="${appBaseUrl}/api/auth/verify-email?token=${rawToken}">
           Confirm my account</a></p>
           <p>If you did not create this account, you can ignore this message.</p>`,
  });
}

authEvents.on("USER_REGISTERED", ({ email, rawToken }) => {
  console.log("[USER_REGISTERED]");
  sendVerificationEmail(email, rawToken);
});

authEvents.on("VERIFICATION_RESENT", ({ email, rawToken }) => {
  console.log("[VERIFICATION_RESENT]");
  sendVerificationEmail(email, rawToken);
});

authEvents.on("PASSWORD_RESET_REQUESTED", ({ email, rawToken }) => {
  console.log("[PASSWORD_RESET_REQUESTED]");

  emailService.sendEmail({
    to: email,
    subject: "Aurakon password reset request",
    html: `<p>Hello,</p>
           <p>Click the link below to reset your Aurakon password. This link is valid for 1 hour.</p>
           <p><a href="${appBaseUrl}/api/auth/reset-password?token=${rawToken}">
           Reset my password</a></p>
           <p>If you did not request this, you can ignore this message.</p>`,
  });
});

authEvents.on("EMAIL_CHANGE_REQUESTED", ({ email, rawToken }) => {
  console.log("[EMAIL_CHANGE_REQUESTED]");

  emailService.sendEmail({
    to: email,
    subject: "Confirm your new Aurakon email address",
    html: `<p>Hello,</p>
           <p>Click the link below to confirm this email address for your Aurakon account.</p>
           <p><a href="${appBaseUrl}/api/auth/verify-email-change?token=${rawToken}">
           Confirm my new email</a></p>
           <p>If you did not request this, you can ignore this message.</p>`,
  });
});

authEvents.on("ACCOUNT_DELETION_REQUESTED", ({ email, rawToken }) => {
  console.log("[ACCOUNT_DELETION_REQUESTED]");

  emailService.sendEmail({
    to: email,
    subject: "Confirm account deletion",
    html: `<p>Hello,</p>
           <p>Click the link below to confirm permanent deletion of your Aurakon account. This action cannot be undone.</p>
           <p><a href="${appBaseUrl}/api/auth/delete-account/verify?token=${rawToken}">
           Confirm account deletion</a></p>
           <p>If you did not request this, you can ignore this message and your account will remain unchanged.</p>`,
  });
});

authEvents.on("PASSWORD_CHANGED", ({ email }) => {
  console.log("[PASSWORD_CHANGED]");

  emailService.sendEmail({
    to: email,
    subject: "Your Aurakon password was changed",
    html: `<p>Hello,</p>
           <p>Your Aurakon account password was just changed.</p>
           <p>If you did not make this change, please reset your password immediately and contact support.</p>`,
  });
});

authEvents.on("PASSWORD_RESET_COMPLETED", ({ email }) => {
  console.log("[PASSWORD_RESET_COMPLETED]");

  emailService.sendEmail({
    to: email,
    subject: "Your Aurakon password was reset",
    html: `<p>Hello,</p>
           <p>Your Aurakon account password was just reset.</p>
           <p>If you did not make this change, please contact support immediately.</p>`,
  });
});

authEvents.on("EMAIL_CHANGED", ({ email }) => {
  console.log("[EMAIL_CHANGED]");

  emailService.sendEmail({
    to: email,
    subject: "Your Aurakon account email was changed",
    html: `<p>Hello,</p>
           <p>The email address on your Aurakon account was just changed away from this address.</p>
           <p>If you did not make this change, please contact support immediately.</p>`,
  });
});

authEvents.on("ACCOUNT_DELETED", ({ email }) => {
  console.log("[ACCOUNT_DELETED]");

  emailService.sendEmail({
    to: email,
    subject: "Your Aurakon account has been deleted",
    html: `<p>Hello,</p>
           <p>Your Aurakon account has been permanently deleted, as requested.</p>`,
  });
});

module.exports = authEvents;
