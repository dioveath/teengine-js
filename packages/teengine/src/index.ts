export * from "@teengine/core";
export { PhysicsWorld, PhysicsBridge } from "@teengine/physics";
export type { PhysicsWorldOptions, RigidBodyHandle, ColliderHandle } from "@teengine/physics";
export { createWebGpuRenderer } from "@teengine/renderer-webgpu";
export { createCanvas2DRenderer } from "@teengine/renderer-canvas2d";

import { Engine, type EngineOptions } from "@teengine/core";
import { createWebGpuRenderer } from "@teengine/renderer-webgpu";

export async function createEngine(
  options: Omit<EngineOptions, "renderer">,
): Promise<Engine> {
  const renderer = await createWebGpuRenderer(options.canvas);
  return Engine.create({ ...options, renderer });
}
