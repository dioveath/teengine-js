import { AudioSystem, Engine, Rng, createCanvas2DRenderer, createWebGpuRenderer } from "teengine";
import type { FrameRenderer } from "teengine";
import { Game } from "./game.js";
import { TitleScene } from "./scenes/title.js";
import { OverworldScene } from "./scenes/overworld.js";

async function createRenderer(canvas: HTMLCanvasElement): Promise<FrameRenderer> {
  if (new URLSearchParams(location.search).get("renderer") === "canvas2d") {
    return createCanvas2DRenderer(canvas);
  }
  try {
    return await createWebGpuRenderer(canvas);
  } catch (error) {
    console.warn("WebGPU unavailable, falling back to Canvas2D", error);
    return createCanvas2DRenderer(canvas);
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  const canvas = document.getElementById("canvas");
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error("Canvas element #canvas not found.");

  const renderer = await createRenderer(canvas);
  const engine = Engine.create({ canvas, renderer });
  const audio = new AudioSystem();
  const unlock = () => audio.unlock();
  window.addEventListener("keydown", unlock, { once: true });
  window.addEventListener("pointerdown", unlock, { once: true });

  engine.input.bindAction("confirm", ["KeyZ", "Enter"]);
  engine.input.bindAction("cancel", ["KeyX", "Escape", "Backspace"]);
  engine.input.bindAction("menu", ["Enter", "KeyM"]);
  engine.input.bindAction("up", ["ArrowUp", "KeyW"]);
  engine.input.bindAction("down", ["ArrowDown", "KeyS"]);
  engine.input.bindAction("left", ["ArrowLeft", "KeyA"]);
  engine.input.bindAction("right", ["ArrowRight", "KeyD"]);

  const game = new Game(engine.graphics, audio, new Rng(0x51f3));
  engine.graphics.registerLayer("world", { camera: game.worldCamera, sort: "y" });
  engine.graphics.registerLayer("ui", { camera: game.uiCamera, sort: "z" });
  game.manager.push(new TitleScene(game));

  interface DebugWindow extends Window {
    __VELMORA__: {
      state(): unknown;
      giveMon(speciesId: number, level: number): void;
      giveItem(key: string, count?: number): void;
      key(code: string, holdMs?: number): Promise<void>;
      press(codes: string[]): Promise<void>;
      wildBattle(): Promise<void>;
      warp(mapId: string): void;
      heal(): void;
    };
  }
  const overworld = () =>
    game.manager.top instanceof OverworldScene ? game.manager.top : null;

  (window as unknown as DebugWindow).__VELMORA__ = {
    state: () => ({
      party: game.party.map((m) => ({ name: m.displayName, level: m.level, hp: m.hp, maxHp: m.maxHp(), status: m.status })),
      money: game.money,
      flags: { ...game.flags },
      counters: { ...game.counters },
      bag: Object.fromEntries(game.bag),
      scene: game.manager.top?.constructor.name ?? null,
      phase: (game.manager.top as { debugPhase?: string } | null)?.debugPhase ?? null,
      map: overworld()?.mapId ?? null,
      pos: overworld()?.playerPos ?? null,
      busy: overworld()?.isBusy ?? null,
    }),
    giveMon: (speciesId, level) => game.addMon(speciesId, level),
    giveItem: (key, count = 1) => game.giveItem(key, count),
    async key(code, holdMs = 110) {
      dispatchEvent(new KeyboardEvent("keydown", { code }));
      await sleep(holdMs);
      dispatchEvent(new KeyboardEvent("keyup", { code }));
      await sleep(70);
    },
    async press(codes) {
      for (const code of codes) await (window as unknown as DebugWindow).__VELMORA__.key(code);
    },
    async wildBattle() {
      await overworld()?.startWildBattle(25, 4);
    },
    warp(mapId: string) {
      overworld()?.debugWarp(mapId);
    },
    heal: () => game.healParty(),
  };

  engine.setLoop({
    fixedUpdate: ({ dt, input }) => game.manager.fixedUpdate(dt, input),
    render: ({ graphics, alpha, width, height }) => {
      game.manager.render(graphics, alpha, width, height);
      graphics.endFrame();
    },
  });
  engine.start();

  const hud = document.getElementById("hud");
  if (hud) hud.textContent = "";
}

void main();
