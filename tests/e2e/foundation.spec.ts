import { expect, test } from "@playwright/test";

const ROUTES = [
  "/",
  "/play",
  "/play/easy",
  "/daily",
  "/leaderboards",
  "/leaderboards?period=weekly",
  "/leaderboards?period=monthly",
  "/profile",
  "/map",
  "/achievements",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/settings",
  "/admin",
  "/privacy",
];

test.describe("foundation", () => {
  for (const route of ROUTES) {
    test(`renders ${route} without horizontal overflow`, async ({ page }) => {
      const res = await page.goto(route);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("atlas: every UN member is listed and selectable from the map and the list", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "ff_locale", value: "en", url: baseURL ?? "http://localhost:3100" }]);
    await page.goto("/map");
    const list = page.getByRole("region", { name: "All 193 countries" }).or(page.locator("section[aria-labelledby=atlas-list]"));
    await expect(list.locator("li button")).toHaveCount(193);
    await expect(page.locator("svg [data-iso]").first()).toBeVisible();
    expect(await page.locator("svg path[data-iso]").count() + 0).toBeGreaterThan(150);
    await page.locator('svg path[data-iso="BR"]').click();
    await expect(page.locator("aside h2")).toHaveText("Brazil");
    await list.getByRole("button", { name: /^Tuvalu/ }).click();
    await expect(page.locator("aside h2")).toHaveText("Tuvalu");
    await page.getByRole("button", { name: "Still to find", exact: true }).click();
    await expect(list.locator("li button")).toHaveCount(193); // a guest has discovered nothing
    await page.getByRole("button", { name: "Discovered", exact: true }).click();
    await expect(list.locator("li button")).toHaveCount(0);
  });

  test("is installable: manifest, icons and iOS home-screen tags", async ({ page, request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest).toMatchObject({ display: "standalone", start_url: "/" });
    expect(manifest.icons.map((i: { purpose: string }) => i.purpose)).toEqual(expect.arrayContaining(["any", "maskable"]));
    for (const icon of manifest.icons as { src: string }[]) {
      const img = await request.get(icon.src);
      expect(img.status(), icon.src).toBe(200);
      expect(img.headers()["content-type"]).toContain("image/png");
    }
    await page.goto("/");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/icons/apple-touch-icon.png");
    expect((await request.get("/icons/apple-touch-icon.png")).status()).toBe(200);
  });

  test("shared links have a rich preview (Open Graph image, title, description)", async ({ page, request }) => {
    await page.goto("/daily");
    const og = (p: string) => page.locator(`meta[property="og:${p}"]`).getAttribute("content");
    expect(await og("image")).toMatch(/\/og\.png$/);
    expect(await og("title")).toBeTruthy();
    expect(await og("description")).toBeTruthy();
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    const img = await request.get("/og.png");
    expect(img.status()).toBe(200);
    expect(img.headers()["content-type"]).toContain("image/png");
  });

  test("a shared link's language applies to first-time visitors only", async ({ browser, baseURL }) => {
    // First visit (like WhatsApp's preview bot or a friend clicking the link): Hebrew, and remembered.
    const fresh = await browser.newContext({ extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" } });
    const p1 = await fresh.newPage();
    await p1.goto(`${baseURL}/daily?lang=he`);
    await expect(p1.locator("html")).toHaveAttribute("lang", "he");
    await p1.goto(`${baseURL}/`);
    await expect(p1.locator("html")).toHaveAttribute("lang", "he");
    await fresh.close();
    // A visitor who already chose English keeps it.
    const chosen = await browser.newContext();
    await chosen.addCookies([{ name: "ff_locale", value: "en", url: baseURL ?? "http://localhost:3100" }]);
    const p2 = await chosen.newPage();
    await p2.goto(`${baseURL}/daily?lang=he`);
    await expect(p2.locator("html")).toHaveAttribute("lang", "en");
    await chosen.close();
  });

  test("the privacy policy is linked from the footer and the sign-up page", async ({ page }) => {
    await page.goto("/register");
    await page.locator("main").getByRole("link", { name: /privacy policy/i }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.locator("h1")).toHaveText(/Privacy policy|מדיניות פרטיות/);
    await expect(page.getByRole("link", { name: "flagforge.game@gmail.com" })).toBeVisible();
  });

  test("unknown difficulty returns 404", async ({ page }) => {
    const res = await page.goto("/play/impossible");
    expect(res?.status()).toBe(404);
  });

  test("language switch flips direction and keeps the route", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "ff_locale", value: "en", url: baseURL ?? "http://localhost:3100" }]);
    await page.goto("/daily");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await page.getByRole("button", { name: /switch language to עברית/i }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "he");
    await expect(page).toHaveURL(/\/daily$/);
    await page.getByRole("button", { name: "החלפת שפה לEnglish" }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });

  test("Accept-Language selects Hebrew for first-time visitors", async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ locale: "he-IL", extraHTTPHeaders: { "Accept-Language": "he-IL,he;q=0.9" } });
    const page = await ctx.newPage();
    await page.goto(`${baseURL}/`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await ctx.close();
  });

  test("countdown shows a time below 25 hours", async ({ page }) => {
    await page.goto("/");
    const label = page.locator("p.sr-only", { hasText: /next challenge in/i });
    const text = await label.textContent();
    const hours = Number(/in (\d+) hours/i.exec(text ?? "")?.[1]);
    expect(hours).toBeGreaterThanOrEqual(0);
    expect(hours).toBeLessThan(25);
  });
});

test.describe("mobile navigation", () => {
  test.skip(({ isMobile }) => !isMobile, "mobile only");

  test("menu dialog opens, navigates and closes with Escape", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await page.getByRole("button", { name: "Open menu" }).click();
    await dialog.getByRole("link", { name: /Hall of Fame/ }).click();
    await expect(page).toHaveURL(/\/leaderboards$/);
    await expect(dialog).toBeHidden();
  });

  test("bottom tab bar reaches the daily challenge", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Quick navigation" }).getByRole("link", { name: "Daily" }).click();
    await expect(page).toHaveURL(/\/daily$/);
    await expect(page.getByRole("navigation", { name: "Quick navigation" }).getByRole("link", { name: "Daily" })).toHaveAttribute("aria-current", "page");
  });
});

test.describe("desktop navigation", () => {
  test.skip(({ isMobile }) => !!isMobile, "desktop only");

  test("primary nav marks the active section", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Primary" }).first();
    await nav.getByRole("link", { name: /Atlas/ }).click();
    await expect(page).toHaveURL(/\/map$/);
    await expect(nav.getByRole("link", { name: /Atlas/ })).toHaveAttribute("aria-current", "page");
  });

  test("keyboard users can skip to content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
  });
});
