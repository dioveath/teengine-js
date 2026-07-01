import type { Input } from "../input/Input.js";
import type { PhysicsBridge } from "../physics/PhysicsBridge.js";
import type { World } from "./World.js";

export type FixedSystemContext = {
  world: World;
  dt: number;
  time: number;
  tick: number;
  input: Input;
  physics: PhysicsBridge | null;
};

export type RenderSystemContext = FixedSystemContext & {
  alpha: number;
  width: number;
  height: number;
};

export interface FixedSystem {
  readonly name: string;
  fixedUpdate(ctx: FixedSystemContext): void;
}

export interface RenderSystem {
  readonly name: string;
  render(ctx: RenderSystemContext): void;
}
