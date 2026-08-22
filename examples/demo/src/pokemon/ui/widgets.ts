import type { Graphics, Input } from "teengine";
import { Color } from "teengine";

export const UI_W = 480;
export const UI_H = 320;

export function uiScale(width: number, height: number): number {
  return Math.max(1, Math.min(4, Math.floor(Math.min(width / UI_W, height / UI_H))));
}
const TEXT_SIZE = 14;
const LINE_HEIGHT = 18;

const PANEL_BG = Color.rgb(0.98, 0.96, 0.9);
const PANEL_BORDER = Color.rgb(0.2, 0.19, 0.25);
const TEXT_DARK = Color.rgb(0.13, 0.12, 0.17);
const CURSOR_COLOR = Color.rgb(0.85, 0.3, 0.25);

export type FontOptions = { sizePx?: number };

export class Widgets {
  constructor(private readonly graphics: Graphics) {}

  panel(x: number, y: number, w: number, h: number, z: number): void {
    this.graphics.drawRect(x - 2, y - 2, w + 4, h + 4, PANEL_BORDER, { z });
    this.graphics.drawRect(x, y, w, h, PANEL_BG, { z });
  }

  text(
    text: string,
    x: number,
    y: number,
    options: { color?: Color; sizePx?: number; align?: "left" | "center" | "right"; z?: number } = {},
  ): void {
    this.graphics.drawText(text, x, y, {
      sizePx: options.sizePx ?? TEXT_SIZE,
      font: "ui-monospace, SFMono-Regular, Menlo, monospace",
      color: options.color ?? TEXT_DARK,
      align: options.align,
      z: options.z ?? 9000,
    });
  }

  hpBar(x: number, y: number, w: number, hp: number, maxHp: number, z: number): void {
    this.graphics.drawRect(x, y, w, 6, Color.rgb(0.3, 0.28, 0.32), { z });
    const ratio = Math.max(0, Math.min(1, hp / maxHp));
    const color = ratio > 0.5 ? Color.rgb(0.3, 0.8, 0.35) : ratio > 0.2 ? Color.rgb(0.95, 0.75, 0.2) : Color.rgb(0.9, 0.25, 0.22);
    this.graphics.drawRect(x + 1, y + 1, (w - 2) * ratio, 4, color, { z });
  }

  expBar(x: number, y: number, w: number, ratio: number, z: number): void {
    this.graphics.drawRect(x, y, w, 4, Color.rgb(0.3, 0.28, 0.32), { z });
    this.graphics.drawRect(x + 1, y + 1, Math.max(0, (w - 2) * Math.min(1, ratio)), 2, Color.rgb(0.3, 0.55, 0.95), { z });
  }

  measure(text: string, sizePx = TEXT_SIZE): number {
    return this.graphics.measureText(text, { font: MONO_FONT, sizePx });
  }
}

export const MONO_FONT = "ui-monospace, SFMono-Regular, Menlo, monospace";

export function wrapText(widgets: Widgets, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (widgets.measure(candidate) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

type DialogState =
  | { phase: "idle" }
  | { phase: "typing"; lines: string[]; charsShown: number; totalChars: number }
  | { phase: "wait"; lines: string[] };

export class DialogBox {
  readonly height = 84;
  private state: DialogState = { phase: "idle" };
  private resolveFn: (() => void) | null = null;
  private arrowBlink = 0;

  constructor(private readonly widgets: Widgets) {}

  get isOpen(): boolean {
    return this.state.phase !== "idle";
  }

  show(text: string): Promise<void> {
    const lines = wrapText(this.widgets, text, UI_W - 48);
    let totalChars = 0;
    for (const line of lines) totalChars += line.length;
    this.state = { phase: "typing", lines, charsShown: 0, totalChars };
    return new Promise((resolve) => {
      this.resolveFn = resolve;
    });
  }

  update(input: Input): void {
    this.arrowBlink += 1;
    if (this.state.phase === "typing") {
      this.state.charsShown += 1.6;
      if (input.actionPressed("confirm")) this.state.charsShown = this.state.totalChars;
      if (this.state.charsShown >= this.state.totalChars) {
        this.state = { phase: "wait", lines: this.state.lines };
      }
    } else if (this.state.phase === "wait") {
      if (input.actionPressed("confirm")) {
        this.state = { phase: "idle" };
        this.resolveFn?.();
        this.resolveFn = null;
      }
    }
  }

  render(): void {
    if (this.state.phase === "idle") return;
    const g = this.widgets;
    const y = UI_H - this.height;
    g.panel(8, y, UI_W - 16, this.height - 8, 8000);
    const budget = this.state.phase === "typing" ? Math.floor(this.state.charsShown) : Number.MAX_SAFE_INTEGER;
    let remaining = budget;
    let ly = y + 14;
    for (const line of this.state.lines) {
      const shown = line.slice(0, Math.max(0, Math.floor(remaining)));
      g.text(shown, 24, ly, { z: 8001 });
      remaining -= line.length;
      ly += LINE_HEIGHT;
      if (remaining <= 0) break;
    }
    if (this.state.phase === "wait" && Math.floor(this.arrowBlink / 30) % 2 === 0) {
      g.text("▼", UI_W - 40, y + this.height - 30, { z: 8001, color: CURSOR_COLOR });
    }
  }
}

export type MenuStyle = {
  x?: number;
  y?: number;
  w?: number;
  cancelable?: boolean;
  rowHeight?: number;
  suffixes?: Array<string | null>;
  colors?: Array<Color | null>;
};

export class ListMenu {
  cursor = 0;
  scrollRow = 0;
  private resultValue: number | null | undefined;
  private readonly style: Required<Pick<MenuStyle, "x" | "y" | "w" | "cancelable" | "rowHeight">>;
  private readonly suffixes: Array<string | null> | undefined;
  private readonly colors: Array<Color | null> | undefined;
  private blinkTimer = 0;

  constructor(
    private readonly widgets: Widgets,
    private readonly options: string[],
    style: MenuStyle = {},
  ) {
    this.style = {
      x: style.x ?? UI_W - 190,
      y: style.y ?? UI_H - 84 - 8 - Math.min(options.length, 4) * 24 - 10,
      w: style.w ?? 182,
      cancelable: style.cancelable ?? false,
      rowHeight: style.rowHeight ?? 24,
    };
    this.suffixes = style.suffixes;
    this.colors = style.colors;
  }

  get done(): boolean {
    return this.resultValue !== undefined && this.resultValue !== null;
  }

  /** Selected index, or -1 when canceled. */
  result(): number {
    return this.resultValue ?? -1;
  }

  update(input: Input, onCursor?: () => void): void {
    this.blinkTimer++;
    if (this.resultValue !== undefined) return;
    const max = this.options.length;
    if (input.actionPressed("down")) {
      this.cursor = (this.cursor + 1) % max;
      onCursor?.();
      if (this.cursor < this.scrollRow) this.scrollRow = this.cursor;
      if (this.cursor >= this.scrollRow + this.visibleRowCount()) this.scrollRow = this.cursor - this.visibleRowCount() + 1;
    } else if (input.actionPressed("up")) {
      this.cursor = (this.cursor - 1 + max) % max;
      onCursor?.();
      if (this.cursor < this.scrollRow) this.scrollRow = this.cursor;
      if (this.cursor >= this.scrollRow + this.visibleRowCount()) this.scrollRow = this.cursor - this.visibleRowCount() + 1;
    } else if (input.actionPressed("confirm")) {
      this.resultValue = this.cursor;
    } else if (this.style.cancelable && input.actionPressed("cancel")) {
      this.resultValue = -1;
    }
  }

  private visibleRowCount(): number {
    return Math.max(4, Math.min(this.options.length, 6));
  }

  render(): void {
    const rows = this.visibleRowCount();
    const height = rows * this.style.rowHeight + 12;
    const y = Math.min(this.style.y, UI_H - height - 4);
    this.widgets.panel(this.style.x, y, this.style.w, height, 8000);
    for (let row = 0; row < rows; row++) {
      const index = this.scrollRow + row;
      if (index >= this.options.length) break;
      const ry = y + 8 + row * this.style.rowHeight;
      if (index === this.cursor && Math.floor(this.blinkTimer / 20) % 2 === 0) {
        this.widgets.text("▶", this.style.x + 8, ry + 1, { z: 8001, color: CURSOR_COLOR });
      }
      const color = this.colors?.[index] ?? TEXT_DARK;
      const suffix = this.suffixes?.[index];
      const labelWidth = suffix ? this.widgets.measure(suffix, TEXT_SIZE) + 10 : 0;
      this.widgets.text(
        truncate(this.widgets, this.options[index]!, this.style.w - 34 - labelWidth),
        this.style.x + 26,
        ry + 1,
        { z: 8001, color },
      );
      if (suffix) {
        this.widgets.text(suffix, this.style.x + this.style.w - 10 - labelWidth, ry + 1, { z: 8001, color });
      }
    }
  }
}

function truncate(widgets: Widgets, text: string, maxWidth: number): string {
  if (widgets.measure(text) <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && widgets.measure(`${out}…`) > maxWidth) out = out.slice(0, -1);
  return `${out}…`;
}

export function fadeOverlay(graphics: Graphics, alpha: number, z = 9500): void {
  if (alpha <= 0) return;
  graphics.drawRect(0, 0, UI_W, UI_H, { r: 0.04, g: 0.03, b: 0.07, a: alpha }, { z });
}
