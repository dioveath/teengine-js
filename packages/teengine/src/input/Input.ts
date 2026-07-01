import type { Camera2D } from "../graphics/Camera2D.js";
import { ActionMap } from "./ActionMap.js";

export type MousePosition = {
  x: number;
  y: number;
};

const DEFAULT_PREVENT_CODES = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
]);

export class Input {
  readonly actions = new ActionMap();

  private readonly canvas: HTMLCanvasElement;
  private readonly keysDown = new Set<string>();
  private previousKeys = new Set<string>();
  private readonly consumedPresses = new Set<string>();
  private readonly boundCodes = new Set<string>();

  private mouseX = 0;
  private mouseY = 0;
  private mouseInCanvas = false;

  private readonly scratch = { x: 0, y: 0 };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.shouldPreventDefault(event.code)) {
      event.preventDefault();
    }
    this.keysDown.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (this.shouldPreventDefault(event.code)) {
      event.preventDefault();
    }
    this.keysDown.delete(event.code);
  };

  private readonly onBlur = (): void => {
    this.keysDown.clear();
    this.mouseInCanvas = false;
  };

  private readonly onMouseMove = (event: MouseEvent): void => {
    this.updateMousePosition(event);
    this.mouseInCanvas = true;
  };

  private readonly onMouseLeave = (): void => {
    this.mouseInCanvas = false;
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.tabIndex = 0;
    canvas.style.outline = "none";

    canvas.addEventListener("keydown", this.onKeyDown);
    canvas.addEventListener("keyup", this.onKeyUp);
    canvas.addEventListener("blur", this.onBlur);
    canvas.addEventListener("mousemove", this.onMouseMove);
    canvas.addEventListener("mouseleave", this.onMouseLeave);
  }

  /** Call once at the start of each visual frame (before the fixed-update loop). */
  beginFrame(): void {
    this.previousKeys = new Set(this.keysDown);
    this.consumedPresses.clear();
  }

  bindAction(action: string, codes: readonly string[]): void {
    this.actions.bind(action, codes);
    for (const code of codes) {
      this.boundCodes.add(code);
    }
  }

  keyDown(code: string): boolean {
    return this.keysDown.has(code);
  }

  keyPressed(code: string): boolean {
    if (!this.keysDown.has(code) || this.previousKeys.has(code)) return false;
    if (this.consumedPresses.has(code)) return false;
    this.consumedPresses.add(code);
    return true;
  }

  keyReleased(code: string): boolean {
    return !this.keysDown.has(code) && this.previousKeys.has(code);
  }

  actionDown(action: string): boolean {
    return this.actions.getCodes(action).some((code) => this.keyDown(code));
  }

  actionPressed(action: string): boolean {
    return this.actions.getCodes(action).some((code) => this.keyPressed(code));
  }

  actionReleased(action: string): boolean {
    return this.actions.getCodes(action).some((code) => this.keyReleased(code));
  }

  /** Returns -1, 0, or 1 from paired negative/positive actions. */
  actionAxis(negativeAction: string, positiveAction: string): number {
    const neg = this.actionDown(negativeAction) ? 1 : 0;
    const pos = this.actionDown(positiveAction) ? 1 : 0;
    return pos - neg;
  }

  /** Mouse position in canvas pixel coordinates (matches viewport). */
  get mouseScreen(): MousePosition {
    return { x: this.mouseX, y: this.mouseY };
  }

  get isMouseInCanvas(): boolean {
    return this.mouseInCanvas;
  }

  mouseWorld(camera: Camera2D, viewportW: number, viewportH: number): MousePosition {
    camera.screenToWorld(this.mouseX, this.mouseY, viewportW, viewportH, this.scratch);
    return { x: this.scratch.x, y: this.scratch.y };
  }

  focus(): void {
    this.canvas.focus();
  }

  destroy(): void {
    this.canvas.removeEventListener("keydown", this.onKeyDown);
    this.canvas.removeEventListener("keyup", this.onKeyUp);
    this.canvas.removeEventListener("blur", this.onBlur);
    this.canvas.removeEventListener("mousemove", this.onMouseMove);
    this.canvas.removeEventListener("mouseleave", this.onMouseLeave);
  }

  private updateMousePosition(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? this.canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? this.canvas.height / rect.height : 1;
    this.mouseX = (event.clientX - rect.left) * scaleX;
    this.mouseY = (event.clientY - rect.top) * scaleY;
  }

  private shouldPreventDefault(code: string): boolean {
    return DEFAULT_PREVENT_CODES.has(code) || this.boundCodes.has(code);
  }
}
