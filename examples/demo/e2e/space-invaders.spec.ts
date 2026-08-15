import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    __TE_SI__?: {
      state: { score: number; lives: number; gameOver: boolean; won: boolean };
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

  test("firing increases score", async ({ page }) => {
    await gotoPlayingOrSkip(page);
    await page.locator("#canvas").click();

    await page.keyboard.down("ArrowLeft");
    await page.waitForTimeout(130);
    await page.keyboard.up("ArrowLeft");

    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      await page.keyboard.down("Space");
      await page.waitForTimeout(80);
      await page.keyboard.up("Space");
      const score = await page.evaluate(() => window.__TE_SI__!.state.score);
      if (score > 0) break;
      await page.waitForTimeout(1000);
    }

    expect(await page.evaluate(() => window.__TE_SI__!.state.score)).toBeGreaterThan(0);
  });
});
