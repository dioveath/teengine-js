import { WebGPUContext } from "../gpu/WebGPUContext.js";
import { Graphics } from "../graphics/Graphics.js";

export const DEFAULT_FIXED_DT = 1 / 60;
export const DEFAULT_MAX_FRAME_STEPS = 5;

export type EngineOptions = {
  canvas: HTMLCanvasElement;
  fixedDt?: number;
  maxFrameSteps?: number;
};

export type FixedUpdateContext = {
  dt: number;
  tick: number;
  time: number;
};

export type RenderContext = {
  graphics: Graphics;
  time: number;
  dt: number;
  alpha: number;
  width: number;
  height: number;
  tick: number;
};

export type GameLoopCallbacks = {
  fixedUpdate: (ctx: FixedUpdateContext) => void;
  render: (ctx: RenderContext) => void;
};

export class Engine {
  readonly graphics: Graphics;
  private readonly gpu: WebGPUContext;
  private readonly fixedDt: number;
  private readonly maxFrameSteps: number;

  private running = false;
  private lastTime = 0;
  private fixedAccumulator = 0;
  private tick = 0;
  private simulationTime = 0;
  private animationFrame = 0;
  private loop: GameLoopCallbacks | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private constructor(
    gpu: WebGPUContext,
    graphics: Graphics,
    fixedDt: number,
    maxFrameSteps: number,
  ) {
    this.gpu = gpu;
    this.graphics = graphics;
    this.fixedDt = fixedDt;
    this.maxFrameSteps = maxFrameSteps;
  }

  static async create(options: EngineOptions): Promise<Engine> {
    const gpu = await WebGPUContext.create({ canvas: options.canvas });
    const graphics = await Graphics.create(gpu);
    const engine = new Engine(
      gpu,
      graphics,
      options.fixedDt ?? DEFAULT_FIXED_DT,
      options.maxFrameSteps ?? DEFAULT_MAX_FRAME_STEPS,
    );
    engine.handleResize();
    return engine;
  }

  setLoop(callbacks: GameLoopCallbacks): void {
    this.loop = callbacks;
  }

  get device(): GPUDevice {
    return this.gpu.device;
  }

  get fixedTimestep(): number {
    return this.fixedDt;
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

      const dt = Math.min((time - this.lastTime) / 1000, 0.25);
      this.lastTime = time;

      if (this.loop) {
        this.fixedAccumulator += dt;
        let steps = 0;

        while (this.fixedAccumulator >= this.fixedDt && steps < this.maxFrameSteps) {
          this.loop.fixedUpdate({
            dt: this.fixedDt,
            tick: this.tick,
            time: this.simulationTime,
          });
          this.simulationTime += this.fixedDt;
          this.fixedAccumulator -= this.fixedDt;
          this.tick += 1;
          steps += 1;
        }

        const alpha = this.fixedAccumulator / this.fixedDt;
        const { width, height } = this.graphics.viewport;

        this.loop.render({
          graphics: this.graphics,
          time: time / 1000,
          dt,
          alpha,
          width,
          height,
          tick: this.tick,
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
