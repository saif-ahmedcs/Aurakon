const {
  resetDemoAccount,
  DEMO_EMAIL,
  DEMO_PASSWORD,
} = require("../scripts/resetDemoAccount");
const authService = require("./authService");

let demoStartQueue = Promise.resolve();

function runExclusive(fn) {
  const run = demoStartQueue.catch(() => {}).then(fn);
  demoStartQueue = run.catch(() => {});
  return run;
}

async function startDemoSession() {
  return runExclusive(async () => {
    await resetDemoAccount();
    return authService.login(DEMO_EMAIL, DEMO_PASSWORD);
  });
}

module.exports = { startDemoSession };
