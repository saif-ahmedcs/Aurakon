/* ---------------------------------------------------------------- */
/* Calendar date helpers - local, no external date library needed    */
/* ---------------------------------------------------------------- */

export function pad2(n) {
  return n < 10 ? "0" + n : String(n);
}

export function dateKey(year, month, day) {
  return year + "-" + pad2(month + 1) + "-" + pad2(day);
}

export function buildMonthWeeks(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/* "Today" in a given IANA time zone as YYYY-MM-DD. The backend owns
 * day boundaries via the user's stored time zone (see backend
 * docs/01-engineering-standards.md), so check-ins and "completed
 * today" flags must be computed against that zone rather than the
 * browser's. */
export function todayInZone(timeZone) {
  const tz = timeZone || undefined;
  if (tz) {
    try {
      // en-CA yields ISO-like YYYY-MM-DD formatting.
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    } catch {
      // Unknown zone - fall through to browser-local below.
    }
  }
  const now = new Date();
  return dateKey(now.getFullYear(), now.getMonth(), now.getDate());
}
