const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseToUTCDay(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function formatUTCDay(utcDayValue) {
  const d = new Date(utcDayValue);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

module.exports = { MS_PER_DAY, parseToUTCDay, formatUTCDay };
