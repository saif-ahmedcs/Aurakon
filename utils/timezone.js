const DEFAULT_TIMEZONE = "UTC";

function isValidTimezone(timeZone) {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone });
    return true;
  } catch {
    return false;
  }
}

function getLocalDateString(instant, timeZone) {
  const date =
    instant instanceof Date
      ? instant
      : new Date(`${instant.replace(" ", "T")}Z`);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function todayInTimezone(timeZone, now = new Date()) {
  return getLocalDateString(now, timeZone);
}

function toLocalDateString(utcDateTime, timeZone) {
  return getLocalDateString(utcDateTime, timeZone);
}

function isActiveOnLocalDate(createdAt, archivedAt, date, timeZone) {
  if (toLocalDateString(createdAt, timeZone) > date) return false;
  if (archivedAt && toLocalDateString(archivedAt, timeZone) <= date)
    return false;
  return true;
}

module.exports = {
  DEFAULT_TIMEZONE,
  isValidTimezone,
  getLocalDateString,
  todayInTimezone,
  toLocalDateString,
  isActiveOnLocalDate,
};
