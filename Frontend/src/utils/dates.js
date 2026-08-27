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

export function yearMonthInZone(timeZone) {
  const tz = timeZone || undefined;
  if (tz) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "numeric",
      }).formatToParts(new Date());
      const y = parseInt(parts.find((p) => p.type === "year").value, 10);
      const m = parseInt(parts.find((p) => p.type === "month").value, 10) - 1;
      return { year: y, month: m };
    } catch {}
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function todayInZone(timeZone) {
  const tz = timeZone || undefined;
  if (tz) {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    } catch {}
  }
  const now = new Date();
  return dateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

export function msUntilNextMidnight(timeZone) {
  if (!timeZone) return null;
  try {
    const now = Date.now();
    const dateFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const localDateAt = (ms) => dateFormatter.format(new Date(ms));
    const todayStr = localDateAt(now);

    let lo = now;
    let hi = now + 26 * 60 * 60 * 1000;

    if (localDateAt(hi) === todayStr) {
      return 24 * 60 * 60 * 1000;
    }

    while (hi - lo > 1000) {
      const mid = Math.floor((lo + hi) / 2);
      if (localDateAt(mid) === todayStr) {
        lo = mid;
      } else {
        hi = mid;
      }
    }

    const msUntilMidnight = hi - now;
    return msUntilMidnight > 0 ? msUntilMidnight : 24 * 60 * 60 * 1000;
  } catch {
    return null;
  }
}
