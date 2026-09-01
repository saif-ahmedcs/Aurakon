const {
  resetDemoAccount,
  DEMO_EMAIL,
  DEMO_PASSWORD,
} = require("../scripts/resetDemoAccount");
const authService = require("./authService");

async function startDemoSession() {
  await resetDemoAccount();
  return authService.login(DEMO_EMAIL, DEMO_PASSWORD);
}

module.exports = { startDemoSession };
