import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import topLevelAwait from "vite-plugin-top-level-await";
import wasm from "vite-plugin-wasm";

const root = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(root, "../../packages/physics/package.json"));
const rapier = join(dirname(require.resolve("@dimforge/rapier2d/package.json")), "rapier.js");
const base = process.env.VITE_BASE ?? "/";

export default defineConfig({
  base,
  plugins: [wasm(), topLevelAwait()],
  resolve: {
    alias: { "@dimforge/rapier2d": rapier },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: "es2022",
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        platformer: resolve(root, "platformer.html"),
        spaceInvaders: resolve(root, "space-invaders.html"),
      },
    },
  },
  assetsInclude: ["**/*.wasm"],
  optimizeDeps: {
    exclude: ["@dimforge/rapier2d"],
  },
});
