import { WebGPUContext } from "../gpu/WebGPUContext.js";
import { Renderer } from "../gpu/Renderer.js";
import { Graphics } from "../graphics/Graphics.js";

export type EngineOptions = {
  canvas: HTMLCanvasElement;
  clearColor?: import("../math/index.js").Color;
};

export type UpdateCallback = (ctx: {
  graphics: Graphics;
  time: number;
  dt: number;
  width: number;
  height: number;
}) => void;

export class Engine {
  readonly graphics: Graphics;
  private readonly gpu: WebGPUContext;
  private running = false;
  private lastTime = 0;
  private animationFrame = 0;
  private onUpdate: UpdateCallback | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private constructor(gpu: WebGPUContext, graphics: Graphics) {
    this.gpu = gpu;
    this.graphics = graphics;
  }

  static async create(options: EngineOptions): Promise<Engine> {
    const gpu = await WebGPUContext.create({ canvas: options.canvas });
    const renderer = await Renderer.create(gpu);
    const graphics = new Graphics(renderer);
    const engine = new Engine(gpu, graphics);
    engine.handleResize();
    return engine;
  }

  setUpdateCallback(callback: UpdateCallback): void {
    this.onUpdate = callback;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.gpu.canvas);
    window.addEventListener("resize", this.handleResizeBound);

    const loop = (time: number) => {
      if (!this.running) return;
      const dt = (time - this.lastTime) / 1000;
      this.lastTime = time;

      if (this.onUpdate) {
        const { width, height } = this.graphics.viewport;
        this.onUpdate({
          graphics: this.graphics,
          time: time / 1000,
          dt,
          width,
          height,
        });
      }

      this.animationFrame = requestAnimationFrame(loop);
    };

    this.animationFrame = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver?.disconnect();
    window.removeEventListener("resize", this.handleResizeBound);
  }

  private handleResizeBound = (): void => {
    this.handleResize();
  };

  private handleResize(): void {
    const { width, height } = this.gpu.resizeToDisplaySize();
    this.graphics.resize(width, height);
  }
}
