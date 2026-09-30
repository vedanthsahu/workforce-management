const INDIA_TIME_ZONE = "Asia/Kolkata";

const indiaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: INDIA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Return the current India calendar date as YYYY-MM-DD. */
export function todayIsoInIndia(now: Date = new Date()): string {
  const parts = Object.fromEntries(
    indiaDateFormatter
      .formatToParts(now)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Return the India calendar date `days` after now as YYYY-MM-DD. */
export function indiaDateIsoAfterDays(days: number, now: Date = new Date()): string {
  const today = todayIsoInIndia(now);
  const [year, month, day] = today.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return result.toISOString().slice(0, 10);
}

/** Convert an absolute timestamp into its India calendar date. */
export function timestampToIndiaDateIso(value: string): string {
  return todayIsoInIndia(new Date(value));
}
