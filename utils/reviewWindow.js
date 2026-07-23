const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

const { todayInTimezone } = require("./timezone");

function addUtcDays(dateString, days) {
  const [year, month, day] = dateString.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day) + days * MS_PER_DAY);

  const shiftedYear = shifted.getUTCFullYear();
  const shiftedMonth = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const shiftedDay = String(shifted.getUTCDate()).padStart(2, "0");

  return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
}

function getPreviousLocalDate(timeZone, now = new Date()) {
  return addUtcDays(todayInTimezone(timeZone, now), -1);
}

module.exports = { getPreviousLocalDate, addUtcDays };
