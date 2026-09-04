// Common IANA time zones shown in the account page's Time Zone select.
// Label includes the current UTC offset so it's legible at a glance;
// swap this for a fuller list (or Intl.supportedValuesOf("timeZone"))
// if you need broader coverage.
const TIME_ZONE_IDS = [
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Atlantic/Azores",
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Europe/Athens",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export const TIME_ZONE_OPTIONS = TIME_ZONE_IDS.map((tz) => {
  let offset = "";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    offset = parts.find((p) => p.type === "timeZoneName")?.value || "";
  } catch {
    // ignore
  }
  return {
    value: tz,
    label: `${tz.replace(/_/g, " ")}${offset ? ` (${offset})` : ""}`,
  };
});
