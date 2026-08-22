import { expect, test, type Page } from "@playwright/test";

const GAME_URL = "/pokemon.html";

type Hooks = {
  state(): {
    scene: string | null;
    map: string | null;
    pos: { x: number; y: number } | null;
    party: Array<{ name: string; level: number; hp: number; maxHp: number }>;
    money: number;
  };
};

async function boot(page: Page): Promise<void> {
  await page.goto(GAME_URL);
  await page.waitForFunction(() => Boolean((window as unknown as { __VELMORA__?: unknown }).__VELMORA__));
}

async function pressKeys(page: Page, codes: string[]): Promise<void> {
  await page.evaluate(async (keys) => {
    for (const code of keys) {
      await (window as unknown as { __VELMORA__: { key(code: string): Promise<void> } }).__VELMORA__.key(code);
    }
  }, codes);
}

async function scene(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const hooks = (window as unknown as { __VELMORA__: Hooks }).__VELMORA__;
    return hooks.state().scene;
  });
}

async function gameState<T>(page: Page): Promise<T> {
  return page.evaluate(() => {
    const hooks = (window as unknown as { __VELMORA__: Hooks }).__VELMORA__;
    return hooks.state() as T;
  });
}

type FullState = {
  scene: string | null;
  map: string | null;
  pos: { x: number; y: number } | null;
  busy: boolean | null;
  party: Array<{ name: string; level: number; hp: number; maxHp: number }>;
};

async function settle(page: Page, timeoutMs = 15_000): Promise<FullState> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const s = await gameState<FullState>(page);
    if (s.scene === "OverworldScene" && s.busy === false) return s;
    if (Date.now() > deadline) return s;
    await pressKeys(page, ["KeyZ"]);
    await page.waitForTimeout(200);
  }
}

async function startNewGame(page: Page): Promise<void> {
  await pressKeys(page, ["KeyZ"]);
  await page.waitForTimeout(400);
  await settle(page);
}

test.describe("Pokémon Velmora", () => {
  test("is listed in the store and launches", async ({ page }) => {
    await page.goto("/");
    const card = page.locator(".game-card", { hasText: "Pokémon Velmora" });
    await expect(card).toBeVisible();
    await card.click();
    await expect(page).toHaveURL(new RegExp(GAME_URL.replace("/", "\\/")));
  });

  test("boots to the title screen", async ({ page }) => {
    await boot(page);
    await page.waitForTimeout(600);
    expect(await scene(page)).toBe("TitleScene");
  });

  test("new game reaches the overworld after the intro", async ({ page }) => {
    await boot(page);
    await page.waitForTimeout(300);
    await startNewGame(page);
    expect(await scene(page)).toBe("OverworldScene");
    const s = await gameState<{ map: string; party: unknown[] }>(page);
    expect(s.map).toBe("town");
    expect(Array.isArray(s.party)).toBe(true);
  });

  test("player can walk and the map tracks position", async ({ page }) => {
    await boot(page);
    await page.waitForTimeout(300);
    await startNewGame(page);
    const before = await gameState<{ pos: { x: number; y: number } }>(page);
    for (let i = 0; i < 3; i++) {
      await pressKeys(page, ["ArrowDown"]);
      await page.waitForTimeout(120);
    }
    const after = await gameState<{ pos: { x: number; y: number } }>(page);
    expect(after.pos!.y).toBeGreaterThan(before.pos!.y);
  });

  test("wild battle runs and returns to the overworld", async ({ page }) => {
    test.setTimeout(90_000);
    await boot(page);
    await page.waitForTimeout(300);
    await startNewGame(page);

    await page.evaluate(() => {
      (window as unknown as { __VELMORA__: { giveMon(id: number, lvl: number): void } }).__VELMORA__.giveMon(6, 30);
    });
    await page.evaluate(() => {
      (window as unknown as { __VELMORA__: { wildBattle(): Promise<void> } }).__VELMORA__.wildBattle();
    });
    await page.waitForTimeout(800);
    expect(await scene(page)).toBe("BattleScene");

    const phase = () =>
      page.evaluate(() => {
        const hooks = (window as unknown as { __VELMORA__: { state(): { phase: string | null } } }).__VELMORA__;
        return hooks.state().phase;
      });

    let slot = 0;
    for (let turn = 0; turn < 12 && (await scene(page)) === "BattleScene"; turn++) {
      for (let i = 0; i < 20 && (await phase()) !== "choose"; i++) {
        await pressKeys(page, ["KeyZ"]);
        await page.waitForTimeout(260);
      }
      if ((await scene(page)) !== "BattleScene") break;
      await pressKeys(page, ["KeyZ"]);
      await page.waitForTimeout(200);
      for (let d = 0; d < slot; d++) {
        await pressKeys(page, ["ArrowDown"]);
        await page.waitForTimeout(120);
      }
      await pressKeys(page, ["KeyZ"]);
      await page.waitForTimeout(200);
      slot = (slot + 1) % 4;
      for (let i = 0; i < 25 && (await phase()) !== "choose"; i++) {
        if ((await scene(page)) !== "BattleScene") break;
        await pressKeys(page, ["KeyZ"]);
        await page.waitForTimeout(240);
      }
    }
    expect(await scene(page)).toBe("OverworldScene");
  });
});
