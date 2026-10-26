import { expect, test } from "@playwright/test";

const ROUTES = [
  "/",
  "/play",
  "/play/easy",
  "/daily",
  "/leaderboards",
  "/leaderboards?period=weekly",
  "/profile",
  "/map",
  "/achievements",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/settings",
  "/admin",
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
    await dialog.getByRole("link", { name: /Leaderboards/ }).click();
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
