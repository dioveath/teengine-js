import { afterEach, describe, expect, it } from "vitest";
import { Input } from "./Input.js";

function createCanvasInput(): { input: Input; canvas: HTMLCanvasElement } {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 600;
  document.body.appendChild(canvas);
  return { input: new Input(canvas), canvas };
}

function keyDown(canvas: HTMLCanvasElement, code: string): void {
  canvas.dispatchEvent(
    new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true }),
  );
}

function keyUp(canvas: HTMLCanvasElement, code: string): void {
  canvas.dispatchEvent(
    new KeyboardEvent("keyup", { code, bubbles: true, cancelable: true }),
  );
}

describe("Input", () => {
  let input: Input;
  let canvas: HTMLCanvasElement;

  afterEach(() => {
    input?.destroy();
    canvas?.remove();
  });

  it("reports keyPressed only on the first frame a key is held", () => {
    ({ input, canvas } = createCanvasInput());
    input.focus();

    input.beginFrame();
    keyDown(canvas, "Space");
    expect(input.keyPressed("Space")).toBe(true);
    expect(input.keyPressed("Space")).toBe(false);

    input.beginFrame();
    expect(input.keyPressed("Space")).toBe(false);
    expect(input.keyDown("Space")).toBe(true);
  });

  it("reports keyReleased on the frame after key up", () => {
    ({ input, canvas } = createCanvasInput());
    input.focus();

    input.beginFrame();
    keyDown(canvas, "ArrowLeft");
    expect(input.keyDown("ArrowLeft")).toBe(true);

    input.beginFrame();
    keyUp(canvas, "ArrowLeft");
    expect(input.keyReleased("ArrowLeft")).toBe(true);
    expect(input.keyDown("ArrowLeft")).toBe(false);
  });

  it("clears held keys when the canvas loses focus", () => {
    ({ input, canvas } = createCanvasInput());
    input.focus();

    keyDown(canvas, "KeyW");
    input.beginFrame();
    expect(input.keyDown("KeyW")).toBe(true);

    canvas.dispatchEvent(new Event("blur"));
    input.beginFrame();
    expect(input.keyDown("KeyW")).toBe(false);
  });

  it("maps bound actions to edge-triggered presses", () => {
    ({ input, canvas } = createCanvasInput());
    input.bindAction("jump", ["Space"]);
    input.focus();

    input.beginFrame();
    keyDown(canvas, "Space");
    expect(input.actionPressed("jump")).toBe(true);
    expect(input.actionPressed("jump")).toBe(false);
  });

  it("returns zero axis when opposing actions are held", () => {
    ({ input, canvas } = createCanvasInput());
    input.bindAction("move_left", ["ArrowLeft"]);
    input.bindAction("move_right", ["ArrowRight"]);
    input.focus();

    keyDown(canvas, "ArrowLeft");
    keyDown(canvas, "ArrowRight");
    input.beginFrame();

    expect(input.actionAxis("move_left", "move_right")).toBe(0);
  });
});
