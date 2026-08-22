import type { Graphics, Input } from "teengine";
import { Color } from "teengine";
import {
  BALL_MULTIPLIERS,
  POTION_HEALS,
  SIDE_ENEMY,
  SIDE_PLAYER,
  type BattleAction,
  BattleEngine,
  type BattleEvent,
  type Side,
} from "../model/battle.js";
import { expForLevel, Mon } from "../model/mon.js";
import type { BattleSpec } from "../world/scripts.js";
import { itemName } from "../data/items.js";
import type { Game } from "../game.js";
import type { Scene } from "./manager.js";
import { DialogBox, fadeOverlay, ListMenu, UI_H, UI_W, uiScale as uiScaleFor, type MenuStyle } from "../ui/widgets.js";
import { Jingle } from "../ui/jingles.js";
import type { SpriteFrame } from "teengine";

const STATUS_TAGS: Record<string, string> = { brn: "BRN", psn: "PSN", prz: "PRZ", slp: "SLP", frz: "FRZ" };
const STATUS_APPLIED_TEXT: Record<string, string> = {
  brn: "was burned!",
  psn: "was poisoned!",
  prz: "is paralyzed! It may be unable to move!",
  slp: "fell asleep!",
  frz: "was frozen solid!",
};

export type BattleOutcome = { won: boolean; caught: boolean; fled: boolean; wiped: boolean };

type Pose = {
  offsetX: number;
  offsetY: number;
  targetX: number;
  targetY: number;
  visible: boolean;
  flash: number;
  lunge: number;
};

const idlePose = (): Pose => ({ offsetX: 0, offsetY: 0, targetX: 0, targetY: 0, visible: true, flash: 0, lunge: 0 });

export class BattleScene implements Scene {
  readonly result: Promise<BattleOutcome>;
  private resolveResult!: (outcome: BattleOutcome) => void;

  private readonly engine: BattleEngine;
  private readonly dialog: DialogBox;
  private menu: ListMenu | null = null;
  private menuResolve: ((value: number) => void) | null = null;
  private readonly timers: Array<{ due: number; resolve: () => void }> = [];
  private clock = 0;

  private enemyHpShown = 0;
  private playerHpShown = 0;
  private readonly poses: [Pose, Pose] = [idlePose(), idlePose()];
  private enemyHidden = false;
  private fadeAlpha = 0;
  debugPhase = "construct";

  constructor(
    private readonly game: Game,
    private readonly spec: BattleSpec,
    musicKey: string,
  ) {
    this.dialog = new DialogBox(game.widgets);
    const enemyParty = spec.party.map((p) => Mon.create(game.dex, p.speciesId, p.level));
    this.engine = new BattleEngine(
      { dex: game.dex, rng: game.rng, inventory: game.bag, storage: game.storage },
      spec.kind,
      game.party,
      enemyParty,
    );
    this.enemyHpShown = this.engine.enemyMon.maxHp();
    this.playerHpShown = Math.max(0, this.engine.playerMon.hp);
    this.result = new Promise<BattleOutcome>((resolve) => {
      this.resolveResult = resolve;
    });
    game.music.play(musicKey);
    void this.run();
  }

  fixedUpdate(dt: number, input: Input): void {
    this.clock += dt;
    for (let i = this.timers.length - 1; i >= 0; i--) {
      if (this.clock >= this.timers[i]!.due) {
        this.timers[i]!.resolve();
        this.timers.splice(i, 1);
      }
    }
    this.dialog.update(input);
    if (this.menu && !this.menu.done) {
      this.menu.update(input, () => Jingle.cursor(this.game.audio));
      if (this.menu.done) {
        const value = this.menu.result();
        const resolve = this.menuResolve;
        this.menu = null;
        this.menuResolve = null;
        resolve?.(value);
      }
    }

    this.tweenPose(this.poses[SIDE_PLAYER]!, dt);
    this.tweenPose(this.poses[SIDE_ENEMY]!, dt);
    this.poses[SIDE_PLAYER]!.flash = Math.max(0, this.poses[SIDE_PLAYER]!.flash - dt * 3);
    this.poses[SIDE_ENEMY]!.flash = Math.max(0, this.poses[SIDE_ENEMY]!.flash - dt * 3);

    const hpSpeed = Math.max(24, this.engine?.playerMon?.maxHp() ?? 40) * dt * 1.6;
    this.playerHpShown = approachValue(this.playerHpShown, Math.max(0, this.engine?.playerMon?.hp ?? 0), hpSpeed);
    this.enemyHpShown = approachValue(this.enemyHpShown, this.enemyHidden ? 0 : Math.max(0, this.engine?.enemyMon?.hp ?? 0), hpSpeed);
  }

  private tweenPose(pose: Pose, dt: number): void {
    pose.offsetX = approachValue(pose.offsetX, pose.targetX, 900 * dt);
    pose.offsetY = approachValue(pose.offsetY, pose.targetY, 900 * dt);
    pose.lunge = Math.max(0, pose.lunge - dt * 2.6);
  }

  private wait(seconds: number): Promise<void> {
    return new Promise((resolve) => {
      this.timers.push({ due: this.clock + seconds, resolve });
    });
  }

  private async say(text: string): Promise<void> {
    await this.dialog.show(text);
  }

  private choose(options: string[], style: MenuStyle = {}): Promise<number> {
    this.menu = new ListMenu(this.game.widgets, options, style);
    return new Promise<number>((resolve) => {
      this.menuResolve = resolve;
    });
  }

  private async run(): Promise<void> {
    try {
      this.debugPhase = "intro";
      if (this.spec.kind === "wild") {
        this.poses[SIDE_ENEMY]!.offsetX = -280;
        await this.say(`Wild ${this.engine.enemyMon.displayName} appeared!`);
        this.slideIn(SIDE_ENEMY);
        await this.wait(0.45);
      } else {
        await this.say(`${this.spec.trainerName} wants to battle!`);
        this.slideIn(SIDE_ENEMY);
        await this.wait(0.3);
        await this.say(`${this.spec.trainerName} sent out ${this.engine.enemyMon.displayName}!`);
      }
      this.poses[SIDE_PLAYER]!.offsetY = 320;
      await this.say(`Go! ${this.engine.playerMon.displayName}!`);
      this.slideIn(SIDE_PLAYER);
      Jingle.confirm(this.game.audio);
      await this.wait(0.45);

      this.debugPhase = "loop";
      while (!this.engine.isOver) {
        this.debugPhase = "choose";
        const action = await this.chooseAction();
        this.debugPhase = "resolve";
        this.engine.submit(action);
        await this.playEvents(this.engine.advance());
        if (this.engine.isOver) break;
        if (this.engine.needsForcedSwitch) {
          await this.say("Choose your next monster!");
          const index = await this.pickHealthySwitch();
          this.engine.submit({ kind: "switch", partyIndex: index });
          this.poses[SIDE_PLAYER]!.visible = true;
          await this.playEvents(this.engine.advance());
        }
      }
      this.debugPhase = "finish";
      await this.finish();
    } catch (error) {
      console.error("battle error", error);
      this.resolveResult({ won: false, caught: false, fled: false, wiped: false });
    }
  }

  private slideIn(side: Side): void {
    const pose = this.poses[side]!;
    pose.visible = true;
    pose.targetX = 0;
    pose.targetY = 0;
  }

  private async pickHealthySwitch(): Promise<number> {
    for (;;) {
      const index = await this.pickPartyMember();
      const mon = this.engine.playerParty[index];
      if (index < 0 || !mon || mon.isFainted) {
        await this.say(`${mon ? mon.displayName : "That monster"} can't battle!`);
        continue;
      }
      return index;
    }
  }

  private async pickPartyMember(): Promise<number> {
    return this.choose(
      this.engine.playerParty.map((m) => `${m.displayName} Lv${m.level}`),
      {
        cancelable: true,
        x: 16,
        y: 20,
        w: 330,
        suffixes: this.engine.playerParty.map((m) => `${Math.max(0, m.hp)}/${m.maxHp()}`),
      },
    );
  }

  private async chooseAction(): Promise<BattleAction> {
    for (;;) {
      const choice = await this.choose(["FIGHT", "BAG", "PARTY", "RUN"], {
        x: UI_W - 190,
        y: UI_H - 84 - 4 * 26 - 8,
        rowHeight: 26,
      });
      if (choice === 0) {
        const action = await this.chooseMove();
        if (action) return action;
      } else if (choice === 1) {
        const action = await this.chooseItem();
        if (action) return action;
      } else if (choice === 2) {
        const index = await this.pickPartyMember();
        const mon = this.engine.playerParty[index];
        if (index >= 0 && mon && !mon.isFainted && mon !== this.engine.playerMon) {
          return { kind: "switch", partyIndex: index };
        }
        await this.say("It's already out or can't battle!");
      } else if (choice === 3) {
        return { kind: "run" };
      }
    }
  }

  private async chooseMove(): Promise<BattleAction | null> {
    const mon = this.engine.playerMon;
    for (;;) {
      const index = await this.choose(
        mon.moves.map((slot) => this.game.dex.move(slot.key).displayName.toUpperCase()),
        {
          cancelable: true,
          x: UI_W - 260,
          y: UI_H - 84 - mon.moves.length * 26 - 8,
          w: 252,
          rowHeight: 26,
          suffixes: mon.moves.map((slot) => `${slot.ppLeft}/${this.game.dex.move(slot.key).pp}`),
        },
      );
      if (index < 0) return null;
      if (mon.moves[index]!.ppLeft <= 0) {
        await this.say("No PP left for that move!");
        continue;
      }
      return { kind: "move", index };
    }
  }

  private async chooseItem(): Promise<BattleAction | null> {
    for (;;) {
      const entries = [...this.game.bag.entries()].filter(([key, count]) => count > 0 && usableInBattle(key));
      if (entries.length === 0) {
        await this.say("No usable items!");
        return null;
      }
      const index = await this.choose(
        entries.map(([key]) => itemName(key)),
        { cancelable: true, x: 16, y: 20, w: 300, suffixes: entries.map(([, count]) => `x${count}`) },
      );
      if (index < 0) return null;
      const [itemKey] = entries[index]!;
      if (BALL_MULTIPLIERS[itemKey]) {
        Jingle.ballThrow(this.game.audio);
        return { kind: "item", itemKey, targetPartyIndex: 0 };
      }
      const target = await this.pickPartyMember();
      if (target < 0) continue;
      return { kind: "item", itemKey, targetPartyIndex: target };
    }
  }

  private async playEvents(events: BattleEvent[]): Promise<void> {
    for (const event of events) {
      switch (event.t) {
        case "message":
          if (event.text) await this.say(event.text);
          break;
        case "recall":
          this.poses[SIDE_PLAYER]!.targetX = -320;
          await this.wait(0.3);
          this.poses[SIDE_PLAYER]!.visible = false;
          break;
        case "sendout":
          if (event.side === SIDE_PLAYER) {
            this.playerHpShown = Math.max(0, this.engine.playerMon.hp);
            this.poses[SIDE_PLAYER]!.offsetX = -320;
            this.slideIn(SIDE_PLAYER);
            Jingle.confirm(this.game.audio);
            await this.say(`Go! ${this.engine.playerMon.displayName}!`);
          } else {
            this.enemyHidden = false;
            this.enemyHpShown = this.engine.enemyMon.maxHp();
            this.poses[SIDE_ENEMY]!.offsetX = -280;
            this.slideIn(SIDE_ENEMY);
            await this.wait(0.35);
          }
          break;
        case "moveUsed": {
          const pose = this.poses[event.side]!;
          pose.lunge = 1;
          await this.wait(0.28);
          break;
        }
        case "missed":
          break;
        case "damage": {
          this.poses[event.side]!.flash = 1;
          Jingle.hit(this.game.audio, event.effectiveness >= 2);
          if (event.side === SIDE_PLAYER) this.playerHpShown = event.hpLeft;
          else this.enemyHpShown = event.hpLeft;
          await this.waitForHp(event.side);
          await this.wait(0.12);
          break;
        }
        case "heal":
          Jingle.heal(this.game.audio);
          if (event.side === SIDE_PLAYER) this.playerHpShown = event.hpLeft;
          else this.enemyHpShown = event.hpLeft;
          await this.wait(0.3);
          break;
        case "statChange": {
          Jingle.cursor(this.game.audio);
          const who = event.side === SIDE_PLAYER
            ? this.engine.playerMon.displayName
            : `${this.engine.kind === "trainer" ? "Foe" : "Wild"} ${this.engine.enemyMon.displayName}`;
          await this.say(`${who}'s ${event.statName} ${event.stages > 0 ? "rose" : "fell"}!`);
          break;
        }
        case "statusApplied": {
          Jingle.cancel(this.game.audio);
          const who = event.side === SIDE_PLAYER
            ? this.engine.playerMon.displayName
            : `${this.engine.kind === "trainer" ? "Foe" : "Wild"} ${this.engine.enemyMon.displayName}`;
          await this.say(`${who} ${STATUS_APPLIED_TEXT[event.status!] ?? "changed state!"}`);
          break;
        }
        case "statusCured":
          break;
        case "faint":
          this.poses[event.side]!.visible = false;
          Jingle.faint(this.game.audio);
          await this.wait(0.5);
          break;
        case "expGain":
          break;
        case "levelUp":
          Jingle.levelUp(this.game.audio);
          await this.say(`${this.engine.playerMon.displayName} grew to level ${event.level}!`);
          break;
        case "caught":
          this.enemyHidden = true;
          Jingle.caught(this.game.audio);
          break;
        case "fled":
          break;
        case "end":
          break;
      }
    }
  }

  private async waitForHp(side: Side): Promise<void> {
    for (let i = 0; i < 180; i++) {
      const actual = Math.max(0, side === SIDE_PLAYER ? this.engine.playerMon.hp : this.engine.enemyMon.hp);
      const shown = side === SIDE_PLAYER ? this.playerHpShown : this.enemyHpShown;
      if (Math.abs(shown - actual) < 1) return;
      await this.wait(1 / 60);
    }
  }

  private async finish(): Promise<void> {
    const outcome = this.engine.outcome;
    const won = outcome === "win" || outcome === "caught";
    const wiped = outcome === "lose";
    const caught = outcome === "caught";
    const fled = outcome === "fled";

    if (won && this.spec.kind === "trainer") {
      await this.say(`You defeated ${this.spec.trainerName}!`);
      this.game.addMoney(this.spec.payout);
      if (this.spec.npcId) this.game.counters[this.spec.npcId] = 1;
      await this.say(`You got ₽${this.spec.payout} prize money!`);
    } else if (!won && wiped) {
      await this.say("You have no monsters left... You blacked out!");
    }

    for (let i = 0; i <= 30; i++) {
      this.fadeAlpha = i / 30;
      await this.wait(1 / 60);
    }
    this.resolveResult({ won: outcome === "win" || caught, caught, fled, wiped });
  }

  render(graphics: Graphics, _alpha: number, width: number, height: number): void {
    this.game.uiCamera.zoom = uiScaleFor(width, height);
    this.game.uiCamera.lookAt(UI_W / 2, UI_H / 2);
    graphics.beginFrame(Color.hex("#182034"));
    graphics.beginLayer("world");
    graphics.drawRect(0, 0, UI_W, 214, Color.rgb(0.55, 0.72, 0.9), { z: 0 });
    graphics.drawRect(0, 214, UI_W, 106, Color.rgb(0.44, 0.66, 0.4), { z: 0 });
    graphics.drawCircle(332, 216, 64, Color.rgb(0.58, 0.78, 0.52), { z: 1 });
    graphics.drawCircle(128, 296, 76, Color.rgb(0.58, 0.78, 0.52), { z: 1 });

    const enemyPose = this.poses[SIDE_ENEMY]!;
    if (!this.enemyHidden && enemyPose.visible) {
      const bob = Math.sin(this.clock * 2.2) * 2;
      drawShadow(graphics, 332, 220);
      drawMon(graphics, this.game.monSprites.front(this.engine.enemyMon.speciesId), 332 + lungeOffset(enemyPose, -1), 220 + enemyPose.offsetY + bob, 1.7, enemyPose.flash);
    }
    const playerPose = this.poses[SIDE_PLAYER]!;
    if (playerPose.visible) {
      const bob = Math.sin(this.clock * 2.2 + 1) * 2;
      drawShadow(graphics, 128, 310);
      drawMon(graphics, this.game.monSprites.back(this.engine.playerMon.speciesId), 128 + lungeOffset(playerPose, 1), 310 + playerPose.offsetY + bob, 1.9, playerPose.flash);
    }
    graphics.endLayer();

    graphics.beginLayer("ui");
    this.drawPanels(graphics);
    this.dialog.render();
    this.menu?.render();
    fadeOverlay(graphics, this.fadeAlpha, 9600);
    graphics.endLayer();
  }

  private drawPanels(graphics: Graphics): void {
    void graphics;
    const w = this.game.widgets;
    const enemy = this.engine.enemyMon;
    const player = this.engine.playerMon;

    w.panel(12, 12, 232, 62, 8000);
    w.text(enemy.displayName, 26, 22, { z: 8001 });
    w.text(`Lv${enemy.level}`, 192, 22, { z: 8001 });
    w.hpBar(28, 50, 186, this.enemyHpShown, enemy.maxHp(), 8001);
    if (enemy.status) w.text(STATUS_TAGS[enemy.status]!, 168, 36, { z: 8001, color: Color.rgb(0.75, 0.3, 0.3) });

    w.panel(UI_W - 264, UI_H - 162, 252, 74, 8000);
    w.text(player.displayName, UI_W - 250, UI_H - 150, { z: 8001 });
    w.text(`Lv${player.level}`, UI_W - 68, UI_H - 150, { z: 8001 });
    w.hpBar(UI_W - 246, UI_H - 120, 194, this.playerHpShown, player.maxHp(), 8001);
    w.text(`${Math.max(0, Math.round(this.playerHpShown))}/${player.maxHp()}`, UI_W - 108, UI_H - 106, { z: 8001 });
    w.text(expBarLabel(player), UI_W - 250, UI_H - 102, { z: 8001 });
    if (player.status) w.text(STATUS_TAGS[player.status]!, UI_W - 96, UI_H - 136, { z: 8001, color: Color.rgb(0.75, 0.3, 0.3) });
  }
}

function expBarLabel(mon: Mon): string {
  const prev = expForLevel(mon.level, mon.species.growthRate);
  const next = expForLevel(mon.level + 1, mon.species.growthRate);
  const ratio = next > prev ? Math.min(1, (mon.exp - prev) / (next - prev)) : 0;
  return `EXP ${(ratio * 100).toFixed(0)}%`;
}

function lungeOffset(pose: Pose, direction: number): number {
  return Math.sin(pose.lunge * Math.PI) * 26 * direction;
}

function approachValue(current: number, target: number, maxStep: number): number {
  const diff = target - current;
  if (Math.abs(diff) <= maxStep) return target;
  return current + Math.sign(diff) * maxStep;
}

function usableInBattle(key: string): boolean {
  return Boolean(BALL_MULTIPLIERS[key] || POTION_HEALS[key] || key === "antidote" || key === "paralyze-heal" || key === "awakening");
}

function drawShadow(graphics: Graphics, cx: number, cy: number): void {
  graphics.drawCircle(cx, cy, 32, { r: 0, g: 0, b: 0, a: 0.22 }, { z: 2 });
}

function drawMon(
  graphics: Graphics,
  frame: SpriteFrame | null,
  x: number,
  y: number,
  scale: number,
  flash: number,
): void {
  if (!frame) {
    graphics.drawCircle(x, y - 34 * scale, 24 * scale, { r: 0.22, g: 0.22, b: 0.28, a: 0.55 }, { z: 3 });
    return;
  }
  const tint = flash > 0 && Math.floor(flash * 12) % 2 === 0 ? Color.rgb(1, 0.45, 0.45) : Color.rgb(1, 1, 1);
  graphics.drawSprite(frame, {
    x,
    y,
    scale: { x: scale, y: scale },
    origin: { x: frame.width / 2, y: frame.height },
    z: 3,
    tint,
  });
}
