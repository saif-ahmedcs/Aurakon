const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseToUTCDay(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

module.exports = { MS_PER_DAY, parseToUTCDay };
