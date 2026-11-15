import { describe, expect, it } from "vitest";
import { dailyShareText } from "@/lib/daily/share";
import countries from "@/server/data/countries.json";
import en from "@/messages/en";
import he from "@/messages/he";

const copyOf = (m: typeof en) => ({ label: m.daily.shareLabel, dareFaster: m.daily.shareDareFaster, dareBetter: m.daily.shareDareBetter });

describe("daily share text", () => {
  const base = { date: "2026-11-15", elapsedMs: 14_200, url: "https://flagforge.example/daily" };

  it("shows the pattern, score and time, then dares the reader to beat it", () => {
    const text = dailyShareText({ ...base, results: [true, true, false, true, true], copy: copyOf(en) });
    expect(text).toBe(
      ["FLAGFORGE · Daily 15.11", "🟩🟩🟥🟩🟩 4/5 · 0:14.2", "Think you can beat that? 👇", "https://flagforge.example/daily"].join("\n"),
    );
  });

  it("dares the reader to be faster after a perfect run", () => {
    const lines = dailyShareText({ ...base, results: [true, true, true, true, true], copy: copyOf(he) }).split("\n");
    expect(lines[0]).toBe("FLAGFORGE · האתגר היומי 15.11");
    expect(lines[1]).toBe("🟩🟩🟩🟩🟩 5/5 · 0:14.2 🏆");
    expect(lines[2]).toBe("נראה אותך עושה את זה מהר יותר 👇");
  });

  it("never contains a country name", () => {
    for (const copy of [copyOf(en), copyOf(he)]) {
      const text = dailyShareText({ ...base, results: [true, false, true, false, true], copy });
      for (const c of countries.countries) {
        expect(text).not.toContain(c.name.en);
        expect(text).not.toContain(c.name.he);
      }
    }
  });
});
