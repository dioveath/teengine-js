import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { defineConfig } from "vitest/config";

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const rapier = path.join(path.dirname(require.resolve("@dimforge/rapier2d/package.json")), "rapier.js");

export default defineConfig({
  plugins: [wasm(), topLevelAwait()],
  resolve: {
    alias: {
      "@teengine/core": path.resolve(packageDir, "../core/src/index.ts"),
      "@dimforge/rapier2d": rapier,
    },
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
    testTimeout: 15_000,
    pool: "forks",
    server: {
      deps: { inline: ["@dimforge/rapier2d"] },
    },
  },
});
