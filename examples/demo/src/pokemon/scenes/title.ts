import type { Graphics, Input } from "teengine";
import { Color } from "teengine";
import { Game } from "../game.js";
import type { Scene } from "./manager.js";
import { ListMenu, UI_H, UI_W } from "../ui/widgets.js";
import { Jingle } from "../ui/jingles.js";
import { OverworldScene } from "./overworld.js";
import { mapMusicKey } from "../world/maps.js";

export class TitleScene implements Scene {
  private menu: ListMenu | null = null;
  private started = false;
  private clock = 0;

  private launched = false;

  constructor(private readonly game: Game) {}

  fixedUpdate(dt: number, input: Input): void {
    this.clock += dt;
    if (this.started) return;
    if (!this.menu) {
      const options = Game.hasSave() ? ["CONTINUE", "NEW GAME"] : ["NEW GAME"];
      this.menu = new ListMenu(this.game.widgets, options, {
        x: UI_W / 2 - 90,
        y: UI_H / 2 + 30,
        w: 180,
      });
      Jingle.confirm(this.game.audio);
    }
    this.menu.update(input, () => Jingle.cursor(this.game.audio));
    if (this.menu.done) {
      const choice = this.menu.result();
      const options = Game.hasSave() ? ["CONTINUE", "NEW GAME"] : ["NEW GAME"];
      if (!this.launched && ((options[choice] ?? "") === "CONTINUE" || choice === 0)) {
        this.launched = true;
        this.started = true;
        this.menu = null;
        void this.launch(choice);
      }
    }
  }

  private async launch(choice: number): Promise<void> {
    const hasSave = Game.hasSave();
    const continuing = hasSave && choice === 0;
    let mapId = "town";
    let x = 7;
    let y = 18;
    let dir = 0 as 0 | 1 | 2 | 3;
    if (continuing) {
      const data = this.game.loadInto();
      if (data) {
        mapId = data.map;
        x = data.x;
        y = data.y;
        dir = data.dir as 0 | 1 | 2 | 3;
      }
    }
    const overworld = new OverworldScene(this.game, mapId, x, y, dir);
    this.game.manager.replaceAll(overworld);
    if (!continuing) {
      this.game.party = [];
      this.game.storage = [];
      this.game.bag = new Map();
      this.game.money = 3000;
      this.game.flags = {};
      this.game.counters = {};
      await overworld.runScript("intro");
    }
    this.game.music.play(mapMusicKey(mapId));
    this.started = false;
  }

  render(graphics: Graphics, _alpha: number, width: number, height: number): void {
    void width;
    void height;
    graphics.beginFrame(Color.hex("#0d1220"));
    graphics.beginLayer("ui");
    graphics.drawRect(0, 0, UI_W, UI_H, Color.rgb(0.05, 0.07, 0.13), { z: 0 });
    for (let i = 0; i < 40; i++) {
      const sx = (i * 97) % UI_W;
      const sy = (i * 53) % 200;
      graphics.drawRect(sx, sy, 2, 2, { r: 1, g: 1, b: 1, a: 0.3 + ((i * 37) % 50) / 100 }, { z: 1 });
    }
    graphics.drawCircle(UI_W / 2, 108, 62, Color.rgb(0.85, 0.35, 0.3), { z: 2 });
    graphics.drawRect(UI_W / 2 - 64, 104, 128, 8, Color.rgb(0.16, 0.15, 0.2), { z: 3 });
    graphics.drawCircle(UI_W / 2 + 22, 96, 10, { r: 1, g: 1, b: 1, a: 0.85 }, { z: 4 });

    this.game.widgets.text("POKéMON", UI_W / 2, 58, { align: "center", sizePx: 34, color: Color.rgb(1, 0.9, 0.4), z: 5 });
    this.game.widgets.text("VELMORA", UI_W / 2, 96, { align: "center", sizePx: 26, color: Color.rgb(0.95, 0.95, 1), z: 5 });
    this.game.widgets.text("CHAPTER ONE — THE TERRA BADGE", UI_W / 2, 140, { align: "center", sizePx: 12, color: Color.rgb(0.75, 0.78, 0.88), z: 5 });

    if (this.clock % 1 < 0.6 && !this.menu) {
      this.game.widgets.text("PRESS Z", UI_W / 2, UI_H / 2 + 60, { align: "center", color: Color.rgb(1, 1, 1), z: 5 });
    }
    this.menu?.render();
    this.game.widgets.text("built on TEENGINE", UI_W - 12, UI_H - 24, { align: "right", sizePx: 10, color: Color.rgb(0.55, 0.58, 0.68), z: 5 });
    graphics.endLayer();
  }
}

