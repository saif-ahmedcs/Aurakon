const { MS_PER_DAY, parseToUTCDay, formatUTCDay } = require("./dateUtils");
const { todayInTimezone } = require("./timezone");

function addUtcDays(dateString, days) {
  return formatUTCDay(parseToUTCDay(dateString) + days * MS_PER_DAY);
}

function getPreviousLocalDate(timeZone, now = new Date()) {
  return addUtcDays(todayInTimezone(timeZone, now), -1);
}

module.exports = { getPreviousLocalDate, addUtcDays };
