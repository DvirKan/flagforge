import { describe, expect, it } from "vitest";
import { dailyShareText } from "@/lib/daily/share";
import countries from "@/server/data/countries.json";

describe("daily share text", () => {
  const base = { date: "2026-11-10", elapsedMs: 14_200, url: "https://flagforge.example/daily", label: "Daily" };

  it("shows the pattern, score, time and link", () => {
    const text = dailyShareText({ ...base, results: [true, true, false, true, true] });
    expect(text).toBe(["FLAGFORGE · Daily 10.11", "🟩🟩🟥🟩🟩", "4/5 · 0:14.2", "https://flagforge.example/daily"].join("\n"));
  });

  it("marks a perfect run", () => {
    expect(dailyShareText({ ...base, results: [true, true, true, true, true] }).split("\n")[1]).toBe("🟩🟩🟩🟩🟩 🏆");
  });

  it("never contains a country name", () => {
    const text = dailyShareText({ ...base, label: "האתגר היומי", results: [true, false, true, false, true] });
    for (const c of countries.countries) {
      expect(text).not.toContain(c.name.en);
      expect(text).not.toContain(c.name.he);
    }
  });
});
