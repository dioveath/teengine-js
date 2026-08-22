import type { Graphics, Input } from "teengine";
import { Color } from "teengine";
import type { Game } from "../game.js";
import type { Scene } from "./manager.js";
import { fadeOverlay, UI_H, UI_W } from "../ui/widgets.js";
import { Jingle } from "../ui/jingles.js";

const PAGES: string[][] = [
  [
    "...and so the TERRA BADGE found its way",
    "to a brand-new trainer.",
    "",
    "Word travels fast in VELMORA.",
  ],
  [
    "KEEPER ORLA lowered the gate's old barrier,",
    "and for the first time in a long while,",
    "the north road breathed open.",
  ],
  [
    "PROFESSOR SAGE wrote in his journal:",
    "'The bond is rekindled. The wilds are calm again.'",
    "",
    "'And this is only Chapter One.'",
  ],
];

export class EndingScene implements Scene {
  readonly done: Promise<void>;

  private page = 0;
  private resolveDone!: () => void;
  private finished = false;

  constructor(private readonly game: Game) {
    this.done = new Promise<void>((resolve) => {
      this.resolveDone = resolve;
    });
    this.game.music.stop();
    Jingle.badge(this.game.audio);
  }

  fixedUpdate(_dt: number, input: Input): void {
    if (this.finished) return;
    if (input.actionPressed("confirm") || input.actionPressed("cancel")) {
      if (this.page < PAGES.length - 1) {
        this.page++;
        Jingle.cursor(this.game.audio);
      } else {
        this.finished = true;
        this.resolveDone();
      }
    }
  }

  render(graphics: Graphics, _alpha: number, width: number, height: number): void {
    void width;
    void height;
    graphics.beginFrame(Color.hex("#070a12"));
    graphics.beginLayer("ui");
    const lines = PAGES[this.page]!;
    let y = UI_H / 2 - lines.length * 12;
    for (const line of lines) {
      this.game.widgets.text(line, UI_W / 2, y, { align: "center", sizePx: 16, color: Color.rgb(0.92, 0.93, 1), z: 10 });
      y += 24;
    }
    this.game.widgets.text(
      this.page < PAGES.length - 1 ? "▼" : "THE END — press Z",
      UI_W / 2,
      UI_H - 60,
      { align: "center", sizePx: 12, color: Color.rgb(0.6, 0.63, 0.72), z: 10 },
    );
    fadeOverlay(graphics, 0.35, 5);
    graphics.endLayer();
  }
}
