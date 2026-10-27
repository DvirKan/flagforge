import { describe, expect, it } from "vitest";
import { isCurrentPeriod, isoWeekday, monthRange, periodRange, shiftPeriod, weekRange } from "@/lib/time/periods";

describe("calendar periods", () => {
  it("knows ISO weekdays", () => {
    expect(isoWeekday("2026-10-26")).toBe(1); // Monday
    expect(isoWeekday("2026-11-01")).toBe(7); // Sunday
  });

  it("builds Monday–Sunday weeks, including across months and years", () => {
    expect(weekRange("2026-10-27")).toEqual({ kind: "weekly", from: "2026-10-26", to: "2026-11-01" });
    expect(weekRange("2026-11-01")).toEqual({ kind: "weekly", from: "2026-10-26", to: "2026-11-01" });
    expect(weekRange("2026-10-26")).toEqual({ kind: "weekly", from: "2026-10-26", to: "2026-11-01" });
    expect(weekRange("2027-01-01")).toEqual({ kind: "weekly", from: "2026-12-28", to: "2027-01-03" });
  });

  it("is unaffected by the October DST change in Israel", () => {
    // Israel leaves summer time on the last Sunday before 30 October 2026 (25 Oct). Dates are pure calendar values.
    expect(weekRange("2026-10-25")).toEqual({ kind: "weekly", from: "2026-10-19", to: "2026-10-25" });
  });

  it("builds months, including February in leap years", () => {
    expect(monthRange("2026-10-27")).toEqual({ kind: "monthly", from: "2026-10-01", to: "2026-10-31" });
    expect(monthRange("2028-02-10")).toEqual({ kind: "monthly", from: "2028-02-01", to: "2028-02-29" });
    expect(monthRange("2027-02-10").to).toBe("2027-02-28");
  });

  it("shifts periods backwards and forwards", () => {
    expect(shiftPeriod(weekRange("2026-10-27"), -1)).toEqual(weekRange("2026-10-19"));
    expect(shiftPeriod(weekRange("2026-12-30"), 1)).toEqual(weekRange("2027-01-04"));
    expect(shiftPeriod(monthRange("2026-01-15"), -1)).toEqual(monthRange("2025-12-01"));
    expect(shiftPeriod(monthRange("2026-12-15"), 1)).toEqual(monthRange("2027-01-01"));
    expect(shiftPeriod(monthRange("2026-03-31"), -1).to).toBe("2026-02-28");
  });

  it("detects the current period", () => {
    expect(isCurrentPeriod(periodRange("weekly", "2026-10-27"), "2026-11-01")).toBe(true);
    expect(isCurrentPeriod(periodRange("weekly", "2026-10-19"), "2026-10-27")).toBe(false);
    expect(isCurrentPeriod(periodRange("monthly", "2026-10-01"), "2026-10-31")).toBe(true);
  });
});
