import { AssetManager, Camera2D, type AudioSystem, type Graphics, type Rng } from "teengine";
import { Pokedex } from "./data/pokedex.js";
import type { WorldSprites } from "./world/tiles.js";
import { buildWorldSprites } from "./world/tiles.js";
import { MonSpriteCache } from "./ui/monSprites.js";
import { MusicBox } from "./ui/jingles.js";
import { Widgets } from "./ui/widgets.js";
import { GameSave, type SaveData } from "./model/save.js";
import { Mon } from "./model/mon.js";
import type { GameFacade } from "./world/scripts.js";
import { SceneManager } from "./scenes/manager.js";

export class Game implements GameFacade {
  readonly dex: Pokedex;
  readonly rng: Rng;
  readonly audio: AudioSystem;
  readonly music: MusicBox;
  readonly widgets: Widgets;
  readonly monSprites: MonSpriteCache;
  worldSprites: WorldSprites;
  playTicks = 0;
  readonly assets = new AssetManager();
  readonly worldCamera = new Camera2D();
  readonly uiCamera = new Camera2D();
  readonly manager = new SceneManager();

  party: Mon[] = [];
  storage: Mon[] = [];
  bag = new Map<string, number>([["poke-ball", 0], ["potion", 0]]);
  money = 3000;
  flags: Record<string, boolean> = {};
  counters: Record<string, number> = {};


  constructor(
    graphics: Graphics,
    audio: AudioSystem,
    rng: Rng,
    dex?: Pokedex,
    worldSprites?: WorldSprites,
  ) {
    this.dex = dex ?? new Pokedex();
    this.rng = rng;
    this.audio = audio;
    this.music = new MusicBox(audio);
    this.widgets = new Widgets(graphics);
    this.monSprites = new MonSpriteCache(graphics, this.assets);
    this.worldSprites = worldSprites ?? buildWorldSprites(graphics);
  }

  addMon(speciesId: number, level: number): Mon {
    const mon = Mon.create(this.dex, speciesId, level);
    if (this.party.length < 6) this.party.push(mon);
    else this.storage.push(mon);
    return mon;
  }

  healParty(): void {
    for (const mon of this.party) mon.healFull();
  }

  giveItem(itemKey: string, count = 1): void {
    this.bag.set(itemKey, (this.bag.get(itemKey) ?? 0) + count);
  }

  takeItem(itemKey: string, count = 1): boolean {
    const have = this.bag.get(itemKey) ?? 0;
    if (have < count) return false;
    this.bag.set(itemKey, have - count);
    return true;
  }

  addMoney(amount: number): void {
    this.money += amount;
  }

  firstHealthy(): Mon | null {
    return this.party.find((m) => !m.isFainted) ?? null;
  }

  saveAt(map: string, x: number, y: number, dir: number): void {
    const data: SaveData = {
      version: 1,
      party: this.party.map((m) => m.toData()),
      storage: this.storage.map((m) => m.toData()),
      bag: [...this.bag.entries()],
      money: this.money,
      map,
      x,
      y,
      dir,
      flags: { ...this.flags },
      counters: { ...this.counters },
      playTicks: this.playTicks,
    };
    GameSave.persist(data);
  }

  loadInto(): SaveData | null {
    const data = GameSave.load();
    if (!data) return null;
    this.party = data.party.map((m) => new Mon(this.dex, m));
    this.storage = data.storage.map((m) => new Mon(this.dex, m));
    this.bag = new Map(data.bag);
    this.money = data.money;
    this.flags = { ...data.flags };
    this.counters = { ...data.counters };
    this.playTicks = data.playTicks;
    return data;
  }

  static hasSave(): boolean {
    return GameSave.load() !== null;
  }

  clearSave(): void {
    GameSave.clear();
  }
}
