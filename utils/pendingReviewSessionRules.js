const { MS_PER_DAY, parseToUTCDay } = require("./dateUtils");

const GRACE_PERIOD_DAYS = 3;
const GRACE_PERIOD_MS = GRACE_PERIOD_DAYS * MS_PER_DAY;

function isSessionExpired(lastMissedDate, nowUtcMs) {
  return nowUtcMs > parseToUTCDay(lastMissedDate) + GRACE_PERIOD_MS;
}

module.exports = { GRACE_PERIOD_MS, GRACE_PERIOD_DAYS, isSessionExpired };
