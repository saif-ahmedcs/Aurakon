const { EventEmitter } = require("events");
const emailService = require("../services/emailService");

const authEvents = new EventEmitter();

function sendVerificationEmail(email, rawToken) {
  return emailService.sendEmail({
    to: email,
    subject: "Aurakon account confirmation",
    html: `<p>Hello,</p>
           <p>Please confirm your Aurakon account using the link below.</p>
           <p><a href="${process.env.APP_BASE_URL}/api/auth/verify-email?token=${rawToken}">
           Confirm my account</a></p>
           <p>If you did not create this account, you can ignore this message.</p>`,
  });
}

authEvents.on("USER_REGISTERED", ({ email, rawToken }) => {
  console.log(`[USER_REGISTERED] recipient=${email}`);
  sendVerificationEmail(email, rawToken);
});

authEvents.on("VERIFICATION_RESENT", ({ email, rawToken }) => {
  console.log(`[VERIFICATION_RESENT] recipient=${email}`);
  sendVerificationEmail(email, rawToken);
});

authEvents.on("PASSWORD_RESET_REQUESTED", ({ email, rawToken }) => {
  console.log(`[PASSWORD_RESET_REQUESTED] recipient=${email}`);

  emailService.sendEmail({
    to: email,
    subject: "Aurakon password reset request",
    html: `<p>Hello,</p>
           <p>Here is your password reset code, valid for 1 hour:</p>
           <p><code>${rawToken}</code></p>
           <p>If you did not request this, you can ignore this message.</p>`,
  });
});

module.exports = authEvents;
