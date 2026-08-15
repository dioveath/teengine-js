import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    __TE_SI__?: {
      state: {
        score: number;
        lives: number;
        gameOver: boolean;
        won: boolean;
        playerBulletId: number | null;
      };
      playerX: () => number;
    };
  }
}

async function gotoPlayingOrSkip(page: Page): Promise<void> {
  await page.goto("/space-invaders.html");
  const playing = page.locator('#hud[data-status="Playing"]');
  const fallback = page.locator("#fallback");
  await expect(async () => {
    expect((await playing.isVisible()) || (await fallback.isVisible())).toBe(true);
  }).toPass();
  if (await fallback.isVisible()) {
    test.skip(true, "WebGPU unavailable");
  }
}

test.describe("Space Invaders", () => {
  test("boots with canvas, HUD, and debug hook", async ({ page }) => {
    await gotoPlayingOrSkip(page);

    const canvas = page.locator("#canvas");
    await expect(canvas).toBeVisible();
    await expect(page.locator("#fallback")).toBeHidden();

    const hud = page.locator("#hud");
    await expect(hud).toHaveAttribute("data-status", "Playing");
    await expect(hud).toHaveAttribute("data-lives", "3");
    await expect(hud).toHaveAttribute("data-score", "0");

    const size = await canvas.evaluate((el: HTMLCanvasElement) => ({
      width: el.width,
      height: el.height,
    }));
    expect(size.width).toBeGreaterThan(1);
    expect(size.height).toBeGreaterThan(1);

    const hook = await page.evaluate(() => window.__TE_SI__);
    expect(hook).toBeDefined();
  });

  test("ArrowLeft moves the player left", async ({ page }) => {
    await gotoPlayingOrSkip(page);
    await page.locator("#canvas").click();

    const before = await page.evaluate(() => window.__TE_SI__!.playerX());
    await page.keyboard.down("ArrowLeft");
    await page.waitForTimeout(400);
    await page.keyboard.up("ArrowLeft");
    const after = await page.evaluate(() => window.__TE_SI__!.playerX());
    expect(after).toBeLessThan(before);
  });

  test("holding Space fires and scores", async ({ page }) => {
    await gotoPlayingOrSkip(page);

    await page.keyboard.down("Space");
    await expect
      .poll(async () => page.evaluate(() => window.__TE_SI__!.state.score), { timeout: 12_000 })
      .toBeGreaterThan(0);
    await page.keyboard.up("Space");
  });

  test("Space restarts after game over", async ({ page }) => {
    await gotoPlayingOrSkip(page);

    await page.evaluate(() => {
      window.__TE_SI__!.state.gameOver = true;
    });
    await expect(page.locator("#hud")).toHaveAttribute("data-status", "Game over");

    await page.keyboard.press("Space");
    await expect(page.locator("#hud")).toHaveAttribute("data-status", "Playing");
    await expect(page.locator("#hud")).toHaveAttribute("data-lives", "3");
    await expect(page.locator("#hud")).toHaveAttribute("data-score", "0");
  });
});
