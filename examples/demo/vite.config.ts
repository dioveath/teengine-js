import { resolve } from "node:path";
import { defineConfig } from "vite";

// GitHub Pages project sites are served from /repo-name/ (set via VITE_BASE in CI).
const base = process.env.VITE_BASE ?? "/";

export default defineConfig({
  base,
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: "es2022",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        platformer: resolve(__dirname, "platformer.html"),
        spaceInvaders: resolve(__dirname, "space-invaders.html"),
      },
    },
  },
  assetsInclude: ["**/*.wasm"],
  optimizeDeps: {
    exclude: ["@dimforge/rapier2d"],
  },
});
