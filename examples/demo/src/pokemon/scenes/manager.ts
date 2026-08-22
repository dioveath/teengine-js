import type { Graphics, Input } from "teengine";

export interface Scene {
  fixedUpdate(dt: number, input: Input): void;
  render(graphics: Graphics, alpha: number, width: number, height: number): void;
}

export class SceneManager {
  private stack: Scene[] = [];

  get top(): Scene | null {
    return this.stack[this.stack.length - 1] ?? null;
  }

  get depth(): number {
    return this.stack.length;
  }

  push(scene: Scene): void {
    this.stack.push(scene);
  }

  pop(): void {
    if (this.stack.length > 0) this.stack.pop();
  }

  replaceAll(...scenes: Scene[]): void {
    this.stack = [...scenes];
  }

  fixedUpdate(dt: number, input: Input): void {
    this.top?.fixedUpdate(dt, input);
  }

  render(graphics: Graphics, alpha: number, width: number, height: number): void {
    this.top?.render(graphics, alpha, width, height);
  }
}
