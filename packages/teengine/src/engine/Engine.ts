import { WebGPUContext } from "../gpu/WebGPUContext.js";
import { Graphics } from "../graphics/Graphics.js";
import { Input } from "../input/Input.js";

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
  input: Input;
};

export type RenderContext = {
  graphics: Graphics;
  input: Input;
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
  readonly input: Input;
  private readonly gpu: WebGPUContext;
  private readonly fixedDt: number;
  private readonly maxFrameSteps: number;

  private running = false;
  private paused = false;
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
    input: Input,
    fixedDt: number,
    maxFrameSteps: number,
  ) {
    this.gpu = gpu;
    this.graphics = graphics;
    this.input = input;
    this.fixedDt = fixedDt;
    this.maxFrameSteps = maxFrameSteps;
  }

  static async create(options: EngineOptions): Promise<Engine> {
    const gpu = await WebGPUContext.create({ canvas: options.canvas });
    const graphics = await Graphics.create(gpu);
    const input = new Input(options.canvas);
    const engine = new Engine(
      gpu,
      graphics,
      input,
      options.fixedDt ?? DEFAULT_FIXED_DT,
      options.maxFrameSteps ?? DEFAULT_MAX_FRAME_STEPS,
    );
    engine.handleResize();
    return engine;
  }

  setLoop(callbacks: GameLoopCallbacks): void {
    this.loop = callbacks;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  get isPaused(): boolean {
    return this.paused;
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
    this.input.focus();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.gpu.canvas);
    window.addEventListener("resize", this.handleResizeBound);

    const loop = (time: number) => {
      if (!this.running) return;

      const dt = Math.min((time - this.lastTime) / 1000, 0.25);
      this.lastTime = time;

      if (this.loop) {
        this.input.beginFrame();

        if (!this.paused) {
          this.fixedAccumulator += dt;
          let steps = 0;

          while (this.fixedAccumulator >= this.fixedDt && steps < this.maxFrameSteps) {
            this.loop.fixedUpdate({
              dt: this.fixedDt,
              tick: this.tick,
              time: this.simulationTime,
              input: this.input,
            });
            this.simulationTime += this.fixedDt;
            this.fixedAccumulator -= this.fixedDt;
            this.tick += 1;
            steps += 1;
          }
        }

        const alpha = this.fixedAccumulator / this.fixedDt;
        const { width, height } = this.graphics.viewport;

        this.loop.render({
          graphics: this.graphics,
          input: this.input,
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
    this.input.destroy();
  }

  private handleResizeBound = (): void => {
    this.handleResize();
  };

  private handleResize(): void {
    const { width, height } = this.gpu.resizeToDisplaySize();
    this.graphics.resize(width, height);
  }
}
