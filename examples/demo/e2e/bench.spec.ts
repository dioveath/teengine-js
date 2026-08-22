import { test } from "@playwright/test";

test("render benchmark", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/bench.html");
  await page.waitForFunction(() => !!window.__BENCH__?.results, null, { timeout: 90_000 });
  const results = await page.evaluate(() => window.__BENCH__!.results);
  console.log("BENCH:" + JSON.stringify(results));
});
