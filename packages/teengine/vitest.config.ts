import path from "node:path";
import { fileURLToPath } from "node:url";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { defineConfig } from "vitest/config";

const packageDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [wasm(), topLevelAwait()],
  resolve: {
    alias: {
      "@dimforge/rapier2d": path.resolve(
        packageDir,
        "../../node_modules/@dimforge/rapier2d/rapier.js",
      ),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
    testTimeout: 15_000,
    pool: "forks",
    server: {
      deps: {
        inline: ["@dimforge/rapier2d"],
      },
    },
  },
});
