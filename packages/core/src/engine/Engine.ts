import { Graphics } from "../graphics/Graphics.js";
import type { FrameRenderer } from "../graphics/FrameRenderer.js";
import { Input } from "../input/Input.js";
import {
  clampFrameDt,
  createFixedTimestepState,
  runFixedTimestep,
  type FixedTimestepState,
} from "./FixedTimestep.js";

export const DEFAULT_FIXED_DT = 1 / 60;
export const DEFAULT_MAX_FRAME_STEPS = 5;

export type EngineOptions = {
  canvas: HTMLCanvasElement;
  renderer: FrameRenderer;
  input?: Input;
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
  private readonly renderer: FrameRenderer;
  private readonly fixedDt: number;
  private readonly maxFrameSteps: number;

  private running = false;
  private paused = false;
  private lastTime = 0;
  private timestepState: FixedTimestepState = createFixedTimestepState();
  private animationFrame = 0;
  private loop: GameLoopCallbacks | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(options: EngineOptions) {
    this.renderer = options.renderer;
    this.graphics = new Graphics(options.renderer);
    this.input = options.input ?? new Input(options.canvas);
    this.fixedDt = options.fixedDt ?? DEFAULT_FIXED_DT;
    this.maxFrameSteps = options.maxFrameSteps ?? DEFAULT_MAX_FRAME_STEPS;
    this.handleResize();
  }

  static create(options: EngineOptions): Engine {
    return new Engine(options);
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

  get fixedTimestep(): number {
    return this.fixedDt;
  }

  /** Run `ticks` fixed steps without rAF. Used by play-headless / tests. */
  step(ticks: number): void {
    if (!this.loop) return;
    for (let i = 0; i < ticks; i++) {
      this.input.beginFrame();
      this.loop.fixedUpdate({
        dt: this.fixedDt,
        tick: this.timestepState.tick,
        time: this.timestepState.simulationTime,
        input: this.input,
      });
      this.timestepState.tick += 1;
      this.timestepState.simulationTime += this.fixedDt;
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.input.focus();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.renderer.canvas);
    window.addEventListener("resize", this.handleResizeBound);

    const loop = (time: number) => {
      if (!this.running) return;
      const dt = clampFrameDt((time - this.lastTime) / 1000);
      this.lastTime = time;

      if (this.loop) {
        this.input.beginFrame();
        const { state, alpha } = runFixedTimestep(
          this.timestepState,
          dt,
          { fixedDt: this.fixedDt, maxFrameSteps: this.maxFrameSteps },
          this.paused,
          (step) => {
            this.loop!.fixedUpdate({
              dt: step.dt,
              tick: step.tick,
              time: step.time,
              input: this.input,
            });
          },
        );
        this.timestepState = state;
        const { width, height } = this.graphics.viewport;
        this.loop.render({
          graphics: this.graphics,
          input: this.input,
          time: time / 1000,
          dt,
          alpha,
          width,
          height,
          tick: state.tick,
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
    this.renderer.dispose();
  }

  private handleResizeBound = (): void => {
    this.handleResize();
  };

  private handleResize(): void {
    const { width, height } = this.renderer.resizeToDisplaySize();
    this.graphics.resize(width, height);
  }
}
