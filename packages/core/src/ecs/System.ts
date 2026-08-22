import type { Input } from "../input/Input.js";
import type { PhysicsAdapter } from "./PhysicsAdapter.js";
import type { World } from "./World.js";

export type FixedUpdateSystemContext = {
  world: World;
  dt: number;
  time: number;
  tick: number;
  input: Input;
  physics: PhysicsAdapter | null;
};

export type RenderSystemContext = FixedUpdateSystemContext & {
  alpha: number;
  width: number;
  height: number;
};

export interface FixedUpdateSystem {
  readonly name: string;
  fixedUpdate(ctx: FixedUpdateSystemContext): void;
}

export interface RenderSystem {
  readonly name: string;
  render(ctx: RenderSystemContext): void;
}
