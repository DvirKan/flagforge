import { describe, expect, it } from "vitest";
import { formatDuration } from "@/lib/time/format";

describe("formatDuration", () => {
  it("formats minutes and seconds", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65_400)).toBe("1:05");
    expect(formatDuration(65_400, { tenths: true })).toBe("1:05.4");
    expect(formatDuration(75 * 60_000 + 4_000)).toBe("75:04");
    expect(formatDuration(-10)).toBe("0:00");
  });
});
