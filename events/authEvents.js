const { EventEmitter } = require("events");

const authEvents = new EventEmitter();

authEvents.on("USER_REGISTERED", ({ email, rawToken }) => {
  console.log(
    `[USER_REGISTERED] Verify email: GET /api/auth/verify-email?token=${rawToken} (for ${email})`,
  );
});

authEvents.on("VERIFICATION_RESENT", ({ email, rawToken }) => {
  console.log(
    `[VERIFICATION_RESENT] Verify email: GET /api/auth/verify-email?token=${rawToken} (for ${email})`,
  );
});

authEvents.on("PASSWORD_RESET_REQUESTED", ({ email, rawToken }) => {
  console.log(
    `[PASSWORD_RESET_REQUESTED] Reset password: POST /api/auth/reset-password with token=${rawToken} (for ${email})`,
  );
});

module.exports = authEvents;
