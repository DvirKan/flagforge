import { expect, test, type Page } from "@playwright/test";

async function answerAll(page: Page, total = 10) {
  for (let i = 1; i <= total; i++) {
    await expect(page.getByText(new RegExp(`Question ${i} of ${total}`))).toBeVisible();
    const options = page.getByRole("group", { name: "Which country does this flag belong to?" }).getByRole("button");
    await expect(options).toHaveCount(4);
    await options.nth((i * 3) % 4).click();
    const next = page.getByRole("button", { name: i === total ? "See results" : "Next flag" });
    await expect(next).toBeVisible();
    await expect(next).toBeFocused();
    await next.click();
  }
}

test.describe("standard game (guest)", () => {
  test("a guest can play a full game and see server-computed results", async ({ page }) => {
    const startPayloads: string[] = [];
    page.on("response", async (res) => {
      if (res.url().endsWith("/api/game/start")) startPayloads.push(await res.text());
    });
    await page.goto("/play/easy");
    await answerAll(page);
    await expect(page.getByRole("heading", { level: 2, name: /of 10 correct/ })).toBeVisible();
    await expect(page.getByText("Guest game — this result is not saved anywhere.")).toBeVisible();
    await expect(page.locator("ol img")).toHaveCount(10);
    // The initial payload carries no answer information.
    expect(startPayloads[0]).toBeDefined();
    const start = JSON.parse(startPayloads[0] ?? "{}");
    expect(JSON.stringify(start.question)).not.toMatch(/iso2|correct/);
    expect(start.question.options).toHaveLength(4);
  });

  test("keyboard: digits answer, Enter continues", async ({ page, isMobile }) => {
    test.skip(!!isMobile, "keyboard flow is desktop-only");
    await page.goto("/play/medium");
    await expect(page.getByText("Question 1 of 10")).toBeVisible();
    await page.keyboard.press("2");
    await expect(page.getByRole("button", { name: "Next flag" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Question 2 of 10")).toBeVisible();
  });

  test("switching language mid-game keeps the current question", async ({ page }) => {
    await page.goto("/play/hard");
    const group = page.getByRole("group", { name: "Which country does this flag belong to?" });
    await group.getByRole("button").first().click();
    await page.getByRole("button", { name: "Next flag" }).click();
    await expect(page.getByText("Question 2 of 10")).toBeVisible();
    await page.getByRole("button", { name: /switch language to עברית/i }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByText("שאלה 2 מתוך 10")).toBeVisible();
  });

  test("flags load and the image alt text does not reveal the answer", async ({ page }) => {
    await page.goto("/play/easy");
    const img = page.getByRole("img", { name: "Flag to identify" });
    await expect(img).toBeVisible();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    expect(await img.getAttribute("src")).toMatch(/^\/api\/game\/flag\/[\w-]+$/);
  });
});
