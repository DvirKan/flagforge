import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  calendarDateIn,
  dayOfYearIn,
  nextDayBoundary,
  parseCalendarDate,
  splitDuration,
  startOfCalendarDate,
  zoneOffsetMs,
} from "@/lib/time/zoned";

const TZ = "Asia/Jerusalem";
const H = 3_600_000;

describe("calendarDateIn", () => {
  it("uses the Jerusalem calendar day, not the UTC day", () => {
    // 22:30 UTC on 1 Jan = 00:30 on 2 Jan in Israel (UTC+2 in winter)
    expect(calendarDateIn(new Date("2026-01-01T22:30:00Z"), TZ)).toBe("2026-01-02");
    expect(calendarDateIn(new Date("2026-01-01T21:59:59Z"), TZ)).toBe("2026-01-01");
  });

  it("handles summer time (UTC+3)", () => {
    expect(calendarDateIn(new Date("2026-07-01T21:00:00Z"), TZ)).toBe("2026-07-02");
    expect(calendarDateIn(new Date("2026-07-01T20:59:59Z"), TZ)).toBe("2026-07-01");
  });
});

describe("zoneOffsetMs", () => {
  it("returns +2h in winter and +3h in summer", () => {
    expect(zoneOffsetMs(new Date("2026-01-15T12:00:00Z"), TZ)).toBe(2 * H);
    expect(zoneOffsetMs(new Date("2026-07-15T12:00:00Z"), TZ)).toBe(3 * H);
  });
});

describe("startOfCalendarDate / nextDayBoundary", () => {
  it("finds local midnight in winter and summer", () => {
    expect(startOfCalendarDate("2026-01-10", TZ).toISOString()).toBe("2026-01-09T22:00:00.000Z");
    expect(startOfCalendarDate("2026-07-10", TZ).toISOString()).toBe("2026-07-09T21:00:00.000Z");
  });

  it("produces a 23-hour day when summer time starts (27 Mar 2026)", () => {
    const start = startOfCalendarDate("2026-03-27", TZ);
    const next = nextDayBoundary(start, TZ);
    expect(start.toISOString()).toBe("2026-03-26T22:00:00.000Z");
    expect(next.toISOString()).toBe("2026-03-27T21:00:00.000Z");
    expect(next.getTime() - start.getTime()).toBe(23 * H);
  });

  it("produces a 25-hour day when summer time ends (25 Oct 2026)", () => {
    const start = startOfCalendarDate("2026-10-25", TZ);
    const next = nextDayBoundary(new Date(start.getTime() + 1), TZ);
    expect(start.toISOString()).toBe("2026-10-24T21:00:00.000Z");
    expect(next.toISOString()).toBe("2026-10-25T22:00:00.000Z");
    expect(next.getTime() - start.getTime()).toBe(25 * H);
  });

  it("is strictly after the given instant, even exactly at midnight", () => {
    const midnight = startOfCalendarDate("2026-05-05", TZ);
    expect(nextDayBoundary(midnight, TZ).getTime()).toBeGreaterThan(midnight.getTime());
    expect(calendarDateIn(nextDayBoundary(midnight, TZ), TZ)).toBe("2026-05-06");
  });
});

describe("calendar arithmetic", () => {
  it("adds days across month and leap-year boundaries", () => {
    expect(addCalendarDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addCalendarDays("2027-02-28", 1)).toBe("2027-03-01");
    expect(addCalendarDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addCalendarDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("rejects malformed and impossible dates", () => {
    expect(() => parseCalendarDate("2026-02-30")).toThrow(RangeError);
    expect(() => parseCalendarDate("26-1-1")).toThrow(RangeError);
  });

  it("computes day of year in the zone", () => {
    expect(dayOfYearIn(new Date("2026-01-01T10:00:00Z"), TZ)).toBe(1);
    expect(dayOfYearIn(new Date("2026-12-31T22:30:00Z"), TZ)).toBe(1); // already 1 Jan 2027 in Israel
    expect(dayOfYearIn(new Date("2026-10-26T12:00:00Z"), TZ)).toBe(299);
  });
});

describe("splitDuration", () => {
  it("splits and clamps", () => {
    expect(splitDuration(3_723_999)).toEqual({ hours: 1, minutes: 2, seconds: 3 });
    expect(splitDuration(-5)).toEqual({ hours: 0, minutes: 0, seconds: 0 });
    expect(splitDuration(25 * H)).toEqual({ hours: 25, minutes: 0, seconds: 0 });
  });
});
