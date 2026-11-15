import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regression guard: `dir` on a table cell left-aligns its content on RTL pages and glues it to the next column
 * (seen on the profile's recent games and on the Hall of Fame). Numbers must be isolated with an inner
 * <span dir="ltr"> instead.
 */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : path.endsWith(".tsx") ? [path] : [];
  });
}

describe("RTL tables", () => {
  it("never put dir on a <td> or <th>", () => {
    const offenders = files(join(process.cwd(), "src")).filter((f) => /<t[dh]\b[^>]*\bdir=/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
