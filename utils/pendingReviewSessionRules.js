const { parseToUTCDay } = require("./dateUtils");

const GRACE_PERIOD_MS = 48 * 60 * 60 * 1000;

function isSessionExpired(lastMissedDate, nowUtcMs) {
  return nowUtcMs > parseToUTCDay(lastMissedDate) + GRACE_PERIOD_MS;
}

module.exports = { GRACE_PERIOD_MS, isSessionExpired };
