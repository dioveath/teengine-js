import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: [
    "@teengine/core",
    "@teengine/physics",
    "@teengine/renderer-webgpu",
    "@teengine/renderer-canvas2d",
  ],
});
