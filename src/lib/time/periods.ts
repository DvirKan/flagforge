import { addCalendarDays, parseCalendarDate } from "./zoned";

/**
 * Calendar periods for the weekly and monthly Hall of Fame. All values are challenge dates (YYYY-MM-DD in
 * Asia/Jerusalem), so no instant arithmetic — and no DST edge cases — are involved.
 * Weeks run Monday → Sunday (ISO 8601).
 */
export type PeriodKind = "weekly" | "monthly";

export interface PeriodRange {
  kind: PeriodKind;
  from: string;
  to: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO weekday of a calendar date: Monday = 1 … Sunday = 7. */
export function isoWeekday(date: string): number {
  const { year, month, day } = parseCalendarDate(date);
  const d = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return d === 0 ? 7 : d;
}

export function weekRange(date: string): PeriodRange {
  const from = addCalendarDays(date, 1 - isoWeekday(date));
  return { kind: "weekly", from, to: addCalendarDays(from, 6) };
}

export function monthRange(date: string): PeriodRange {
  const { year, month } = parseCalendarDate(date);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { kind: "monthly", from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(last)}` };
}

export function periodRange(kind: PeriodKind, date: string): PeriodRange {
  return kind === "weekly" ? weekRange(date) : monthRange(date);
}

/** The period before (-1) or after (+1) the one containing `range`. */
export function shiftPeriod(range: PeriodRange, step: -1 | 1): PeriodRange {
  if (range.kind === "weekly") return weekRange(addCalendarDays(range.from, 7 * step));
  return monthRange(step === 1 ? addCalendarDays(range.to, 1) : addCalendarDays(range.from, -1));
}

/** True while the period has not finished yet (it contains today). */
export function isCurrentPeriod(range: PeriodRange, today: string): boolean {
  return range.from <= today && today <= range.to;
}
