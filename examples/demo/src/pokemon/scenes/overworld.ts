import type { Graphics, Input, SpriteFrame } from "teengine";
import { Color } from "teengine";
import { Camera2D } from "teengine";
import { DIR_DOWN, DIR_LEFT, DIR_RIGHT, DIR_UP, isSolidTile, MAPS, rollEncounter, tileAt, TILE_SIZE, warpAt, type Dir, type GameMap } from "../world/maps.js";
import { SIGN_TEXT, SCRIPTS, type BattleResult, type ScriptApi } from "../world/scripts.js";
import { ITEMS, MART_STOCK } from "../data/items.js";
import { itemName } from "../data/items.js";
import { Mon } from "../model/mon.js";
import type { Game } from "../game.js";
import { BattleScene } from "./battle.js";
import { EndingScene } from "./ending.js";
import { TitleScene } from "./title.js";
import type { BattleSpec } from "../world/scripts.js";
import type { Scene } from "./manager.js";
import { DialogBox, fadeOverlay, ListMenu, UI_H, UI_W, uiScale } from "../ui/widgets.js";
import { Jingle } from "../ui/jingles.js";
import { mapMusicKey } from "../world/maps.js";

const WALK_SECONDS = 0.16;
const ENCOUNTER_CHANCE = 0.12;
const FADE_SECONDS = 0.28;

type Actor = {
  x: number;
  y: number;
  px: number;
  py: number;
  dir: Dir;
  moveT: number;
  moving: boolean;
  fromX: number;
  fromY: number;
  palette: number;
  npcId: string | null;
  hidden: boolean;
};

type OverworldState =
  | { phase: "roam" }
  | { phase: "busy" }
  | { phase: "fade"; t: number; after: () => void; returned: boolean };

export class OverworldScene implements Scene {
  readonly dialog: DialogBox;
  private map: GameMap;
  private player: Actor;
  private npcs: Actor[] = [];
  private state: OverworldState = { phase: "roam" };
  private menu: ListMenu | null = null;
  private menuResolve: ((value: number) => void) | null = null;
  private shopMenu: ListMenu | null = null;
  private nameBanner = 0;
  constructor(private readonly game: Game, mapId: string, x: number, y: number, dir: Dir) {
    this.dialog = new DialogBox(game.widgets);
    this.map = MAPS[mapId]!;
    this.player = makeActor(x, y, dir, 0, null);
    this.spawnNpcs();
    this.nameBanner = 3.5;
  }

  get mapId(): string {
    return this.map.id;
  }

  get playerPos(): { x: number; y: number; dir: Dir } {
    return { x: this.player.x, y: this.player.y, dir: this.player.dir };
  }

  get isBusy(): boolean {
    return (
      this.state.phase !== "roam" ||
      this.dialog.isOpen ||
      this.menu !== null
    );
  }

  private spawnNpcs(): void {
    this.npcs = [];
    for (const def of this.map.npcs) {
      const actor = makeActor(def.x, def.y, def.dir, def.palette, def.id);
      if (def.id === "guardian" && this.game.flags.badge) {
        actor.x = 12;
        actor.y = 3;
        actor.px = 12 * TILE_SIZE;
        actor.py = 3 * TILE_SIZE;
      }
      this.npcs.push(actor);
    }
  }

  private actorAt(x: number, y: number): Actor | null {
    if (this.player.x === x && this.player.y === y && !this.player.hidden) return this.player;
    return this.npcs.find((n) => !n.hidden && n.x === x && n.y === y) ?? null;
  }

  private blocked(x: number, y: number): boolean {
    const tile = tileAt(this.map, x, y);
    if (tile === null || isSolidTile(tile)) return true;
    return this.actorAt(x, y) !== null;
  }

  private prevPx = 0;
  private prevPy = 0;
  private drawX = 0;
  private drawY = 0;

  fixedUpdate(dt: number, input: Input): void {
    this.prevPx = this.player.px;
    this.prevPy = this.player.py;
    this.nameBanner = Math.max(0, this.nameBanner - dt);
    if (this.menu) {
      this.menu.update(input, () => Jingle.cursor(this.game.audio));
      if (this.menu.done) {
        const menu = this.menu;
        const value = menu.result();
        this.menu = null;
        this.menuResolve?.(value);
        this.menuResolve = null;
      }
      this.dialog.update(input);
      return;
    }
    if (this.dialog.isOpen) {
      this.dialog.update(input);
      return;
    }
    if (this.state.phase === "fade") {
      const t = Math.min(2, this.state.t + dt / FADE_SECONDS);
      if (t >= 1 && !this.state.returned) {
        this.state.returned = true;
        this.state.after();
      }
      this.state.t = t;
      if (t >= 2) this.state = { phase: "roam" };
      return;
    }
    if (this.state.phase === "busy") return;

    this.game.music.play(mapMusicKey(this.map.id));
    if (input.actionPressed("menu")) {
      void this.openStartMenu();
      return;
    }
    if (input.actionPressed("confirm")) {
      this.interact();
      return;
    }
    this.updateMovement(dt, input);
  }

  private updateMovement(dt: number, input: Input): void {
    const player = this.player;
    if (player.moving) {
      player.moveT += dt / WALK_SECONDS;
      if (player.moveT >= 1) {
        player.moving = false;
        player.px = player.x * TILE_SIZE;
        player.py = player.y * TILE_SIZE;
        this.onStep();
      } else {
        player.px = Math.round(lerp(player.fromX, player.x, player.moveT) * TILE_SIZE);
        player.py = Math.round(lerp(player.fromY, player.y, player.moveT) * TILE_SIZE);
      }
      return;
    }
    const dir = heldDir(input);
    if (dir === null) {
      return;
    }
    if (player.dir !== dir) {
      player.dir = dir;
      return;
    }
    const nx = player.x + (dir === DIR_LEFT ? -1 : dir === DIR_RIGHT ? 1 : 0);
    const ny = player.y + (dir === DIR_UP ? -1 : dir === DIR_DOWN ? 1 : 0);
    if (this.blocked(nx, ny)) {
      return;
    }
    player.fromX = player.x;
    player.fromY = player.y;
    player.x = nx;
    player.y = ny;
    player.moveT = 0;
    player.moving = true;
    for (const npc of this.npcs) {
      if (!npc.moving && this.game.rng.bool(0.02)) {
        npc.dir = [DIR_DOWN, DIR_UP, DIR_LEFT, DIR_RIGHT][this.game.rng.int(0, 3)]! as Dir;
      }
    }
  }

  private onStep(): void {
    const warp = warpAt(this.map, this.player.x, this.player.y);
    if (warp) {
      if (warp.to === "__ending") {
        void this.runEnding();
        return;
      }
      this.startTransition(() => {
        this.map = MAPS[warp.to]!;
        this.player.x = warp.tx;
        this.player.y = warp.ty;
        this.player.px = warp.tx * TILE_SIZE;
        this.player.py = warp.ty * TILE_SIZE;
        this.player.moving = false;
        this.spawnNpcs();
        this.nameBanner = 2.5;
      });
      return;
    }
    const tile = tileAt(this.map, this.player.x, this.player.y);
    if (tile === "," && this.map.encounters && this.game.rng.bool(ENCOUNTER_CHANCE)) {
      const entry = rollEncounter(this.map.encounters, this.game.rng);
      if (entry) {
        const level = this.game.rng.int(entry.minLevel, entry.maxLevel);
        void this.runWildBattle(entry.speciesId, level);
      }
    }
  }

  private interact(): void {
    const targetX = this.player.x + (this.player.dir === DIR_LEFT ? -1 : this.player.dir === DIR_RIGHT ? 1 : 0);
    const targetY = this.player.y + (this.player.dir === DIR_UP ? -1 : this.player.dir === DIR_DOWN ? 1 : 0);
    const npc = this.actorAt(targetX, targetY);
    if (npc && npc.npcId) {
      npc.dir = opposite(this.player.dir);
      void this.runScript(npc.npcId);
      return;
    }
    const item = this.map.items.find((i) => i.x === targetX && i.y === targetY);
    if (item && !this.game.flags[`item_${item.id}`]) {
      void this.pickUpItem(item.id, item.itemKey);
      return;
    }
    if (tileAt(this.map, targetX, targetY) === "S") {
      const text = SIGN_TEXT[`${this.map.id}:${targetX},${targetY}`];
      if (text) void this.say(text);
    }
  }

  private async pickUpItem(id: string, itemKey: string): Promise<void> {
    this.state = { phase: "busy" };
    this.game.flags[`item_${id}`] = true;
    this.game.giveItem(itemKey);
    Jingle.confirm(this.game.audio);
    await this.say(`You found one ${itemName(itemKey)}!`);
    this.state = { phase: "roam" };
  }

  private startTransition(after: () => void): void {
    this.state = { phase: "fade", t: 0, after, returned: false };
  }

  private say(text: string): Promise<void> {
    this.state = { phase: "busy" };
    return this.dialog.show(text).then(() => {
      this.state = { phase: "roam" };
    });
  }

  private choose(prompt: string, options: string[], cancelable = false): Promise<number> {
    this.state = { phase: "busy" };
    return this.dialog.show(prompt).then(() => {
      this.menu = new ListMenu(this.game.widgets, options, { cancelable, x: UI_W - 200, y: UI_H - 84 - options.length * 24 - 20 });
      return new Promise<number>((resolve) => {
        this.menuResolve = (value) => {
          this.state = { phase: "roam" };
          resolve(value);
        };
      });
    });
  }

  private async runWildBattle(speciesId: number, level: number): Promise<void> {
    await this.startBattle({ kind: "wild", party: [{ speciesId, level }] }, mapMusicKey(this.map.id));
  }

  async startBattle(spec: BattleSpec, musicKey = "battle"): Promise<BattleResult> {
    this.state = { phase: "busy" };
    const scene = new BattleScene(this.game, spec, musicKey);
    this.game.manager.push(scene);
    const result = await scene.result;
    this.game.manager.pop();
    if (result.wiped) {
      this.respawnAtCenter();
      Jingle.heal(this.game.audio);
      await this.say("NURSE IVY: You were out cold! Your monsters are rested now. Do be careful!");
    }
    this.state = { phase: "roam" };
    return result;
  }

  private respawnAtCenter(): void {
    this.map = MAPS["pokecenter"]!;
    this.player.x = 6;
    this.player.y = 7;
    this.player.px = 6 * TILE_SIZE;
    this.player.py = 7 * TILE_SIZE;
    this.player.moving = false;
    this.spawnNpcs();
    this.game.healParty();
  }

  async startWildBattle(speciesId: number, level: number): Promise<void> {
    if (this.state.phase === "roam") await this.runWildBattle(speciesId, level);
  }

  debugWarp(mapId: string): void {
    const target = MAPS[mapId];
    if (!target) return;
    this.map = target;
    this.player.x = Math.floor(target.rows[0]!.length / 2);
    this.player.y = Math.max(1, target.rows.length - 3);
    this.player.px = this.player.x * TILE_SIZE;
    this.player.py = this.player.y * TILE_SIZE;
    this.player.moving = false;
    this.spawnNpcs();
    this.nameBanner = 2.5;
  }

  async runScript(scriptId: string): Promise<void> {
    const script = SCRIPTS[scriptId];
    if (!script) return;
    this.state = { phase: "busy" };
    const api = this.makeScriptApi();
    try {
      await script(api);
    } finally {
      this.menu = null;
      this.state = { phase: "roam" };
    }
  }

  makeScriptApi(): ScriptApi {
    return {
      say: (text) => this.say(text),
      choose: (prompt, options, cancelable) => this.choose(prompt, options, cancelable),
      battle: (spec) => this.startBattle(spec, spec.kind === "trainer" && this.map.id === "gym" ? "gym" : "battle"),
      shop: () => this.openShop(),
      ending: () => this.runEnding(),
      game: this.game,
    };
  }

  private async openShop(): Promise<void> {
    this.state = { phase: "busy" };
    let shopping = true;
    while (shopping) {
      const options = [...MART_STOCK.map((k) => `${ITEMS[k]!.displayName}`), "EXIT"];
      const suffixes: Array<string | null> = [...MART_STOCK.map((k) => `₽${ITEMS[k]!.price}`), null];
      this.menu = new ListMenu(this.game.widgets, options, { cancelable: true, x: 16, y: 40, w: 300, suffixes });
      this.shopMenu = this.menu;
      const choice = await new Promise<number>((resolve) => {
        this.menuResolve = resolve;
      });
      this.shopMenu = null;
      if (choice < 0 || choice >= MART_STOCK.length) {
        shopping = false;
        break;
      }
      const key = MART_STOCK[choice]!;
      const def = ITEMS[key]!;
      if (this.game.money < def.price) {
        await this.say("You don't have enough money!");
        continue;
      }
      this.game.addMoney(-def.price);
      this.game.giveItem(key);
      Jingle.confirm(this.game.audio);
      await this.say(`${def.displayName} — that's ₽${def.price}. Thank you!`);
    }
    this.state = { phase: "roam" };
  }

  private async runEnding(): Promise<void> {
    this.state = { phase: "busy" };
    const scene = new EndingScene(this.game);
    this.game.manager.push(scene);
    await scene.done;
    this.game.clearSave();
    this.game.manager.replaceAll();
    this.game.manager.push(new TitleScene(this.game));
  }

  private async openStartMenu(): Promise<void> {
    Jingle.confirm(this.game.audio);
    this.state = { phase: "busy" };
    for (;;) {
      const options = ["MONSTERS", "BAG", "SAVE", "EXIT"];
      this.menu = new ListMenu(this.game.widgets, options, { cancelable: true, x: UI_W - 150, y: 12, w: 138 });
      const choice = await new Promise<number>((resolve) => {
        this.menuResolve = resolve;
      });
      if (choice < 0 || choice === 3) break;
      if (choice === 0) await this.partyScreen();
      if (choice === 1) await this.bagScreen();
      if (choice === 2) {
        this.game.saveAt(this.map.id, this.player.x, this.player.y, this.player.dir);
        Jingle.heal(this.game.audio);
        await this.say(`${this.map.displayName} — progress saved!`);
      }
    }
    this.state = { phase: "roam" };
  }

  private async partyScreen(): Promise<void> {
    for (;;) {
      const mons = this.game.party;
      const menu = new ListMenu(
        this.game.widgets,
        mons.map((m) => `${m.displayName}  Lv${m.level}`),
        { cancelable: true, x: 16, y: 16, w: 300, suffixes: mons.map((m) => `${m.hp}/${m.maxHp()}`) },
      );
      this.menu = menu;
      const choice = await new Promise<number>((resolve) => {
        this.menuResolve = resolve;
      });
      if (choice < 0) return;
      const action = await this.choose(`${mons[choice]!.displayName}: what?`, ["SUMMARY", "MOVE UP", "BACK"], true);
      if (action === 0) {
        await this.showSummary(mons[choice]!);
      } else if (action === 1 && choice > 0) {
        const [mon] = mons.splice(choice, 1);
        mons.unshift(mon!);
      }
    }
  }

  private async showSummary(mon: Mon): Promise<void> {
    this.state = { phase: "busy" };
    const sp = mon.species;
    await this.say(
      `${mon.displayName}  Lv${mon.level}  ${typeNames(sp.types).join("/")} — HP ${mon.hp}/${mon.maxHp()}, ATK ${mon.stat("atk")}, DEF ${mon.stat("def")}, SPA ${mon.stat("spa")}, SPD ${mon.stat("spd")}, SPE ${mon.stat("spe")}.`,
    );
    this.state = { phase: "roam" };
  }

  private async bagScreen(): Promise<void> {
    for (;;) {
      const entries = [...this.game.bag.entries()].filter(([, count]) => count > 0);
      if (entries.length === 0) {
        await this.say("The BAG is empty!");
        return;
      }
      const menu = new ListMenu(
        this.game.widgets,
        entries.map(([key]) => itemName(key)),
        { cancelable: true, x: 16, y: 16, w: 280, suffixes: entries.map(([, count]) => `x${count}`) },
      );
      this.menu = menu;
      const choice = await new Promise<number>((resolve) => {
        this.menuResolve = resolve;
      });
      if (choice < 0) return;
      const [itemKey] = entries[choice]!;
      const used = await this.useItemOverworld(itemKey);
      if (used) break;
    }
  }

  private async useItemOverworld(itemKey: string): Promise<boolean> {
    const def = ITEMS[itemKey]!;
    if (def.kind === "ball") {
      await this.say("Better save that for a wild battle!");
      return false;
    }
    const target = await this.pickPartyMember(`Use ${def.displayName} on which monster?`);
    if (target < 0) return false;
    const mon = this.game.party[target]!;
    if (def.kind === "heal") {
      if (mon.isFainted || mon.hp >= mon.maxHp()) {
        await this.say("It won't have any effect.");
        return false;
      }
      this.game.takeItem(itemKey);
      const healed = mon.restoreHp(itemKey === "potion" ? 20 : itemKey === "super-potion" ? 50 : 120);
      await this.say(`${mon.displayName} recovered ${healed} HP!`);
      return true;
    }
    const cure = itemKey === "antidote" ? "psn" : itemKey === "paralyze-heal" ? "prz" : "slp";
    if (mon.status !== cure) {
      await this.say("It won't have any effect.");
      return false;
    }
    this.game.takeItem(itemKey);
    mon.status = null;
    await this.say(`${mon.displayName} feels better!`);
    return true;
  }

  private pickPartyMember(prompt: string): Promise<number> {
    this.state = { phase: "busy" };
    return this.dialog.show(prompt).then(() => {
      const mons = this.game.party;
      this.menu = new ListMenu(
        this.game.widgets,
        mons.map((m) => `${m.displayName}  Lv${m.level}`),
        { cancelable: true, x: 16, y: 16, w: 300, suffixes: mons.map((m) => `${m.hp}/${m.maxHp()}`) },
      );
      return new Promise<number>((resolve) => {
        this.menuResolve = (value) => {
          this.menu = null;
          this.menuResolve = null;
          resolve(value);
        };
      });
    });
  }

  render(graphics: Graphics, alpha: number, width: number, height: number): void {
    const ix = this.prevPx + (this.player.px - this.prevPx) * alpha;
    const iy = this.prevPy + (this.player.py - this.prevPy) * alpha;
    const scale = uiScale(width, height);
    const worldCam = this.game.worldCamera;
    worldCam.zoom = scale;
    this.game.uiCamera.zoom = scale;
    this.game.uiCamera.lookAt(UI_W / 2, UI_H / 2);
    const halfW = width / (2 * scale);
    const halfH = height / (2 * scale);
    worldCam.lookAt(
      clamp(ix + TILE_SIZE / 2, halfW, this.map.rows[0]!.length * TILE_SIZE - halfW),
      clamp(iy + TILE_SIZE / 2, halfH, this.map.rows.length * TILE_SIZE - halfH),
    );
    this.drawX = ix;
    this.drawY = iy;

    graphics.beginFrame(Color.hex("#101018"));
    graphics.beginLayer("world");
    this.drawTiles(graphics, worldCam, width, height, scale);
    this.drawItems(graphics);
    this.drawActors(graphics);
    graphics.endLayer();

    graphics.beginLayer("ui");
    this.dialog.render();
    this.menu?.render();
    if (this.shopMenu) this.drawMoney(graphics);
    if (this.nameBanner > 0) {
      const alpha = Math.min(1, this.nameBanner);
      graphics.drawRect(12, 12, 240, 34, { r: 0.1, g: 0.1, b: 0.14, a: 0.75 }, { z: 8500 });
      this.game.widgets.text(this.map.displayName, 24, 22, { z: 8501, color: { r: 1, g: 1, b: 1, a: alpha } });
    }
    if (this.state.phase === "fade") {
      const t = this.state.t;
      fadeOverlay(graphics, t < 1 ? t : 2 - t);
    }
    graphics.endLayer();
  }

  private drawMoney(graphics: Graphics): void {
    graphics.drawRect(UI_W - 170, 12, 158, 30, { r: 0.1, g: 0.1, b: 0.14, a: 0.8 }, { z: 8500 });
    this.game.widgets.text(`₽${this.game.money}`, UI_W - 158, 22, { z: 8501, color: { r: 1, g: 0.9, b: 0.4, a: 1 } });
  }

  private drawTiles(graphics: Graphics, cam: Camera2D, width: number, height: number, scale: number): void {
    const tiles = this.game.worldSprites.tiles;
    const mapW = this.map.rows[0]!.length;
    const mapH = this.map.rows.length;
    const halfW = width / (2 * scale) + TILE_SIZE;
    const halfH = height / (2 * scale) + TILE_SIZE;
    const minX = Math.max(0, Math.floor((cam.x - halfW) / TILE_SIZE));
    const maxX = Math.min(mapW - 1, Math.ceil((cam.x + halfW) / TILE_SIZE));
    const minY = Math.max(0, Math.floor((cam.y - halfH) / TILE_SIZE));
    const maxY = Math.min(mapH - 1, Math.ceil((cam.y + halfH) / TILE_SIZE));
    for (let ty = minY; ty <= maxY; ty++) {
      const row = this.map.rows[ty]!;
      for (let tx = minX; tx <= maxX; tx++) {
        const frame = tiles[row[tx]!];
        if (!frame) continue;
        graphics.drawSprite(frame, {
          x: tx * TILE_SIZE,
          y: (ty + 1) * TILE_SIZE,
          origin: { x: 0, y: TILE_SIZE },
        });
      }
    }
  }

  private drawItems(graphics: Graphics): void {
    const ball = this.game.worldSprites.ball;
    for (const item of this.map.items) {
      if (this.game.flags[`item_${item.id}`]) continue;
      graphics.drawSprite(ball, {
        x: item.x * TILE_SIZE + 2,
        y: (item.y + 1) * TILE_SIZE - 2,
        scale: { x: 0.75, y: 0.75 },
        origin: { x: 0, y: TILE_SIZE },
      });
    }
  }

  private drawActors(graphics: Graphics): void {
    const chars = this.game.worldSprites.chars;
    const actors = [this.player, ...this.npcs.filter((n) => !n.hidden)];
    actors.sort((a, b) => a.py - b.py);
    const frameIndex = this.player.moving ? (Math.floor(this.player.moveT * 2) % 2 === 0 ? 1 : 2) : 0;
    for (const actor of actors) {
      const trio = chars[actor.palette]?.[actor.dir];
      if (!trio) continue;
      const frame: SpriteFrame = actor.moving ? trio[frameIndex === 0 ? 0 : frameIndex]! : trio[0]!;
      const isPlayer = actor === this.player;
      graphics.drawSprite(frame, {
        x: isPlayer ? this.drawX : actor.px,
        y: (isPlayer ? this.drawY : actor.py) + TILE_SIZE,
        origin: { x: 0, y: TILE_SIZE },
      });
    }
  }
}

function makeActor(x: number, y: number, dir: Dir, palette: number, npcId: string | null): Actor {
  return { x, y, px: x * TILE_SIZE, py: y * TILE_SIZE, dir, moveT: 0, moving: false, fromX: x, fromY: y, palette, npcId, hidden: false };
}

function heldDir(input: Input): Dir | null {
  if (input.actionDown("up")) return DIR_UP;
  if (input.actionDown("down")) return DIR_DOWN;
  if (input.actionDown("left")) return DIR_LEFT;
  if (input.actionDown("right")) return DIR_RIGHT;
  return null;
}

function opposite(dir: Dir): Dir {
  return dir === DIR_DOWN ? DIR_UP : dir === DIR_UP ? DIR_DOWN : dir === DIR_LEFT ? DIR_RIGHT : DIR_LEFT;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}


const TYPE_NAMES = ["NORMAL", "FIRE", "WATER", "ELECTRIC", "GRASS", "ICE", "FIGHTING", "POISON", "GROUND", "FLYING", "PSYCHIC", "BUG", "ROCK", "GHOST", "DRAGON", "DARK", "STEEL", "FAIRY"];

function typeNames(types: number[]): string[] {
  return types.map((t) => TYPE_NAMES[t] ?? "?");
}
