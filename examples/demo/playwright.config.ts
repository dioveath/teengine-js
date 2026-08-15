import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const demoRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: "http://localhost:5173",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    cwd: demoRoot,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: [
            "--enable-unsafe-webgpu",
            "--enable-webgpu-developer-features",
            "--ignore-gpu-blocklist",
            "--use-angle=swiftshader",
          ],
          ignoreDefaultArgs: ["--disable-gpu"],
        },
      },
    },
  ],
});
