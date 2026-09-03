const crypto = require("crypto");
const {
  provisionDemoAccount,
  DEMO_PASSWORD,
} = require("../scripts/resetDemoAccount");
const authService = require("./authService");

async function startDemoSession() {
  const email = `demo+${crypto.randomUUID()}@aurakon.app`;
  await provisionDemoAccount({ email, password: DEMO_PASSWORD });
  return authService.login(email, DEMO_PASSWORD);
}

module.exports = { startDemoSession };
