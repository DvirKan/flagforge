/**
 * Time-zone-correct calendar helpers built on Intl (no dependency).
 * All instants are UTC `Date`s; "calendar dates" are ISO strings (YYYY-MM-DD) in the given zone.
 * DST-safe: offsets are re-derived at the target instant rather than assuming 24-hour days.
 */

export interface ZonedParts {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let fmt = formatterCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(timeZone, fmt);
  }
  return fmt;
}

export function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const parts = formatterFor(timeZone).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

/** Offset of `timeZone` from UTC at `instant`, in milliseconds (e.g. +2h → 7_200_000). */
export function zoneOffsetMs(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const truncated = instant.getTime() - instant.getUTCMilliseconds();
  return asUtc - truncated;
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** The calendar date (YYYY-MM-DD) that `instant` falls on in `timeZone`. */
export function calendarDateIn(instant: Date, timeZone: string): string {
  const p = zonedParts(instant, timeZone);
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
}

export function parseCalendarDate(date: string): { year: number; month: number; day: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new RangeError(`Invalid calendar date: ${date}`);
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    throw new RangeError(`Invalid calendar date: ${date}`);
  }
  return { year, month, day };
}

/** Adds whole calendar days to a YYYY-MM-DD date (zone-independent). */
export function addCalendarDays(date: string, days: number): string {
  const { year, month, day } = parseCalendarDate(date);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/**
 * The UTC instant at which local midnight of `date` occurs in `timeZone`.
 * Iterates the offset twice so a DST change between the guess and the answer is handled.
 */
export function startOfCalendarDate(date: string, timeZone: string): Date {
  const { year, month, day } = parseCalendarDate(date);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0);
  let guess = wallClockAsUtc - zoneOffsetMs(new Date(wallClockAsUtc), timeZone);
  guess = wallClockAsUtc - zoneOffsetMs(new Date(guess), timeZone);
  return new Date(guess);
}

/** The next daily rollover (local midnight) strictly after `instant`. */
export function nextDayBoundary(instant: Date, timeZone: string): Date {
  const today = calendarDateIn(instant, timeZone);
  return startOfCalendarDate(addCalendarDays(today, 1), timeZone);
}

/** 1-based ordinal day of the year for the calendar date of `instant` in `timeZone`. */
export function dayOfYearIn(instant: Date, timeZone: string): number {
  const { year, month, day } = parseCalendarDate(calendarDateIn(instant, timeZone));
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86_400_000) + 1;
}

/** Splits a non-negative duration into h/m/s for countdown display. */
export function splitDuration(ms: number): { hours: number; minutes: number; seconds: number } {
  const total = Math.max(0, Math.floor(ms / 1000));
  return { hours: Math.floor(total / 3600), minutes: Math.floor((total % 3600) / 60), seconds: total % 60 };
}
