import { expect, test } from "@playwright/test";

test.describe("Store", () => {
  test("lists Space Invaders", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".game-card", { hasText: "Space Invaders" })).toBeVisible();
  });

  test("Play now navigates to space-invaders.html", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Play now" }).click();
    await expect(page).toHaveURL(/space-invaders\.html/);
  });

  test("Space Invaders card navigates to space-invaders.html", async ({ page }) => {
    await page.goto("/");
    await page.locator(".game-card[href='space-invaders.html']").click();
    await expect(page).toHaveURL(/space-invaders\.html/);
  });
});
