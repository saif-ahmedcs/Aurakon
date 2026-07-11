const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const REVIEW_WINDOW_MS = 24 * MS_PER_HOUR;

function parseUtcDateTime(value) {
  if (value instanceof Date) {
    return value.getTime();
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(
    value,
  );

  if (!match) {
    throw new Error(`Unparseable UTC datetime: ${value}`);
  }

  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  return Date.UTC(year, month - 1, day, hour, minute, second);
}

function getPreviousUtcDate(now = new Date()) {
  const todayUtcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const yesterday = new Date(todayUtcMidnight - MS_PER_DAY);

  const year = yesterday.getUTCFullYear();
  const month = String(yesterday.getUTCMonth() + 1).padStart(2, "0");
  const day = String(yesterday.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addUtcDays(dateString, days) {
  const [year, month, day] = dateString.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day) + days * MS_PER_DAY);

  const shiftedYear = shifted.getUTCFullYear();
  const shiftedMonth = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const shiftedDay = String(shifted.getUTCDate()).padStart(2, "0");

  return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
}

function isWithinReviewWindow(createdAt, now = new Date()) {
  const createdAtMs = parseUtcDateTime(createdAt);
  const nowMs = now.getTime();

  return nowMs - createdAtMs < REVIEW_WINDOW_MS;
}

module.exports = { getPreviousUtcDate, addUtcDays, isWithinReviewWindow };
