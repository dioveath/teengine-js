import type { Rng } from "teengine";
import type { Pokedex } from "../data/pokedex.js";
import { TYPES } from "../data/pokedex.js";
import { Mon, statusFromAilment, type Status } from "./mon.js";

export const SIDE_PLAYER = 0;
export const SIDE_ENEMY = 1;
export type Side = typeof SIDE_PLAYER | typeof SIDE_ENEMY;

export type BattleKind = "wild" | "trainer";

export type BattleAction =
  | { kind: "move"; index: number }
  | { kind: "switch"; partyIndex: number }
  | { kind: "item"; itemKey: string; targetPartyIndex: number }
  | { kind: "run" };

export type BattleEvent =
  | { t: "message"; text: string }
  | { t: "sendout"; side: Side; index: number }
  | { t: "recall"; side: Side }
  | { t: "moveUsed"; side: Side; moveName: string }
  | { t: "missed"; side: Side }
  | { t: "damage"; side: Side; amount: number; hpLeft: number; maxHp: number; effectiveness: number }
  | { t: "heal"; side: Side; hpLeft: number; maxHp: number }
  | { t: "statChange"; side: Side; statName: string; stages: number }
  | { t: "statusApplied"; side: Side; status: Status }
  | { t: "statusCured"; side: Side }
  | { t: "faint"; side: Side }
  | { t: "expGain"; amount: number }
  | { t: "levelUp"; level: number }
  | { t: "caught" }
  | { t: "fled" }
  | { t: "end"; playerWon: boolean };

const STAT_NAMES = ["Attack", "Defense", "Sp. Atk", "Sp. Def", "Speed"] as const;

function makeChart(map: Record<string, string[]>): Map<number, Set<number>> {
  const out = new Map<number, Set<number>>();
  for (const [attack, defends] of Object.entries(map)) {
    out.set(TYPES.indexOf(attack), new Set(defends.map((d) => TYPES.indexOf(d))));
  }
  return out;
}

const SUPER_EFFECTIVE = makeChart({
  fire: ["grass", "ice", "bug", "steel"],
  water: ["fire", "ground", "rock"],
  electric: ["water", "flying"],
  grass: ["water", "ground", "rock"],
  ice: ["grass", "ground", "flying", "dragon"],
  fighting: ["normal", "ice", "rock", "dark", "steel"],
  poison: ["grass", "fairy"],
  ground: ["fire", "electric", "poison", "rock", "steel"],
  flying: ["grass", "fighting", "bug"],
  psychic: ["fighting", "poison"],
  bug: ["grass", "psychic", "dark"],
  rock: ["fire", "ice", "flying", "bug"],
  ghost: ["psychic", "ghost"],
  dragon: ["dragon"],
  dark: ["psychic", "ghost"],
  steel: ["ice", "rock", "fairy"],
  fairy: ["fighting", "dragon", "dark"],
});

const NOT_VERY_EFFECTIVE = makeChart({
  normal: ["rock", "steel"],
  fire: ["fire", "water", "rock", "dragon"],
  water: ["water", "grass", "dragon"],
  electric: ["electric", "grass", "dragon"],
  grass: ["fire", "grass", "poison", "flying", "bug", "dragon", "steel"],
  ice: ["fire", "water", "ice", "steel"],
  fighting: ["poison", "flying", "psychic", "bug", "fairy"],
  poison: ["poison", "ground", "rock", "ghost"],
  ground: ["grass", "bug"],
  flying: ["electric", "rock", "steel"],
  psychic: ["psychic", "steel"],
  bug: ["fire", "fighting", "poison", "flying", "ghost", "steel", "fairy"],
  rock: ["fighting", "ground", "steel"],
  ghost: ["dark"],
  dragon: ["steel"],
  dark: ["fighting", "dark", "fairy"],
  steel: ["fire", "water", "electric", "steel"],
  fairy: ["fire", "poison", "steel"],
});

const NO_EFFECT = makeChart({
  normal: ["ghost"], electric: ["ground"], fighting: ["ghost"], poison: ["steel"],
  ground: ["flying"], psychic: ["dark"], ghost: ["normal"], dragon: ["fairy"],
});

/** Gen VI+ single-type matchup multiplier. */
export function typeMultiplier(attackType: number, defendType: number): number {
  if (NO_EFFECT.get(attackType)?.has(defendType)) return 0;
  if (SUPER_EFFECTIVE.get(attackType)?.has(defendType)) return 2;
  if (NOT_VERY_EFFECTIVE.get(attackType)?.has(defendType)) return 0.5;
  return 1;
}

export function typeEffectiveness(attackType: number, defendTypes: readonly number[]): number {
  let mult = 1;
  for (const d of defendTypes) mult *= typeMultiplier(attackType, d);
  return mult;
}

export function effectivenessLabel(mult: number): string | null {
  if (mult === 0) return "It doesn't affect the foe...";
  if (mult >= 2) return "It's super effective!";
  if (mult < 1) return "It's not very effective...";
  return null;
}

const stageMultiplier = (stage: number) => (stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage));

export const BALL_MULTIPLIERS: Record<string, number> = {
  "poke-ball": 1, "great-ball": 1.5, "ultra-ball": 2,
};

export const POTION_HEALS: Record<string, number> = {
  potion: 20, "super-potion": 50, "hyper-potion": 120,
};

export type Inventory = Map<string, number>;

export interface BattleEnvironment {
  dex: Pokedex;
  rng: Rng;
  inventory: Inventory;
  storage: Mon[];
}

type StageState = { stages: [number, number, number, number, number] };

const emptyStages = (): [number, number, number, number, number] => [0, 0, 0, 0, 0];

export class BattleEngine {
  readonly kind: BattleKind;
  private readonly dex: Pokedex;
  private readonly rng: Rng;
  private readonly inventory: Inventory;
  private readonly storage: Mon[];
  readonly playerParty: Mon[];
  readonly enemyParty: Mon[];

  private playerIndex = 0;
  private enemyIndex = 0;
  private readonly stageState: [StageState, StageState] = [
    { stages: emptyStages() },
    { stages: emptyStages() },
  ];
  private runAttempts = 0;
  private awaitingForcedSwitch = false;
  private over = false;
  private pendingAction: BattleAction | null = null;
  private resultKind: "win" | "lose" | "caught" | "fled" | null = null;

  constructor(env: BattleEnvironment, kind: BattleKind, playerParty: Mon[], enemyParty: Mon[]) {
    this.kind = kind;
    this.dex = env.dex;
    this.rng = env.rng;
    this.inventory = env.inventory;
    this.storage = env.storage;
    this.playerParty = playerParty;
    this.enemyParty = enemyParty;
  }

  get playerMon(): Mon {
    return this.playerParty[this.playerIndex];
  }

  get enemyMon(): Mon {
    return this.enemyParty[this.enemyIndex];
  }

  get isOver(): boolean {
    return this.over;
  }

  /** Set once isOver; 'win' covers both KO victories and successful catches. */
  get outcome(): "win" | "lose" | "caught" | "fled" | null {
    return this.resultKind;
  }

  get needsForcedSwitch(): boolean {
    return this.awaitingForcedSwitch;
  }

  healthyCount(side: Side): number {
    const party = side === SIDE_PLAYER ? this.playerParty : this.enemyParty;
    return party.reduce((n, m) => n + (m.isFainted ? 0 : 1), 0);
  }

  canFlee(): boolean {
    return this.kind === "wild";
  }

  submit(action: BattleAction): void {
    if (!this.over && !this.pendingAction) this.pendingAction = action;
  }

  /** Resolve queued actions until player input is required again or the battle ends. */
  advance(): BattleEvent[] {
    const events: BattleEvent[] = [];
    const push = (e: BattleEvent) => events.push(e);

    while (!this.over) {
      const action = this.pendingAction;
      const forced = this.awaitingForcedSwitch;
      if (!action || (forced && action.kind !== "switch")) break;
      this.pendingAction = null;
      this.awaitingForcedSwitch = false;

      switch (action.kind) {
        case "run":
          this.resolveRun(push);
          break;
        case "switch":
          this.doSwitch(SIDE_PLAYER, action.partyIndex, push, !forced);
          if (!forced) {
            this.enemyTurn(push);
            this.endOfTurn(push);
            this.checkFaints(push);
          }
          break;
        case "item":
          this.resolveItem(action.itemKey, action.targetPartyIndex, push);
          if (!this.over) {
            this.enemyTurn(push);
            this.endOfTurn(push);
            this.checkFaints(push);
          }
          break;
        case "move":
          this.resolveMoveRound(action.index, push);
          break;
      }
    }
    return events;
  }

  doSwitch(side: Side, partyIndex: number, push: (e: BattleEvent) => void, voluntary = true): void {
    const party = side === SIDE_PLAYER ? this.playerParty : this.enemyParty;
    const incoming = party[partyIndex];
    if (!incoming || incoming.isFainted) return;
    if (voluntary) push({ t: "recall", side });
    if (side === SIDE_PLAYER) this.playerIndex = partyIndex;
    else this.enemyIndex = partyIndex;
    this.stageState[side]!.stages = emptyStages();
    push({ t: "sendout", side, index: partyIndex });
  }

  private foePrefix(): string {
    return this.kind === "trainer" ? "Foe " : "Wild ";
  }

  private name(side: Side): string {
    return side === SIDE_PLAYER
      ? this.playerMon.displayName
      : `${this.foePrefix()}${this.enemyMon.displayName}`;
  }

  private monOf(side: Side): Mon {
    return side === SIDE_PLAYER ? this.playerMon : this.enemyMon;
  }

  private stagesOf(side: Side): StageState {
    return this.stageState[side]!;
  }

  private effectiveSpeed(side: Side): number {
    const mon = this.monOf(side);
    const mult = stageMultiplier(this.stagesOf(side).stages[4]!);
    return Math.floor(mon.stat("spe") * mult * (mon.status === "prz" ? 0.25 : 1));
  }

  private usableMove(side: Side, index: number) {
    const slot = this.monOf(side).moves[index];
    return slot && slot.ppLeft > 0 ? this.dex.move(slot.key) : null;
  }

  private chooseEnemyMoveIndex(): number {
    const slots = this.enemyMon.moves
      .map((slot, index) => ({ index, view: slot.ppLeft > 0 ? this.dex.move(slot.key) : null }))
      .filter((s) => s.view !== null);
    if (slots.length === 0) return 0;
    const scored = slots.map(({ index, view }) => {
      const mv = view!;
      const score =
        mv.category === 2
          ? this.rng.range(10, 30)
          : mv.power * typeEffectiveness(mv.type, this.playerMon.species.types) * this.rng.range(0.8, 1.2);
      return { index, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return this.rng.bool(0.7) ? scored[0]!.index : this.rng.pick(scored).index;
  }

  private resolveMoveRound(playerMoveIndex: number, push: (e: BattleEvent) => void): void {
    const enemyMoveIndex = this.chooseEnemyMoveIndex();
    const playerMove = this.usableMove(SIDE_PLAYER, playerMoveIndex);
    const enemyMove = this.usableMove(SIDE_ENEMY, enemyMoveIndex);

    if (!playerMove) {
      push({ t: "message", text: `${this.playerMon.displayName} has no moves left!` });
      return;
    }

    let order: [Side, Side];
    const pp = playerMove.priority - enemyMove!.priority;
    if (pp !== 0) order = pp > 0 ? [SIDE_PLAYER, SIDE_ENEMY] : [SIDE_ENEMY, SIDE_PLAYER];
    else if (this.effectiveSpeed(SIDE_PLAYER) !== this.effectiveSpeed(SIDE_ENEMY)) {
      order =
        this.effectiveSpeed(SIDE_PLAYER) > this.effectiveSpeed(SIDE_ENEMY)
          ? [SIDE_PLAYER, SIDE_ENEMY]
          : [SIDE_ENEMY, SIDE_PLAYER];
    } else {
      order = this.rng.bool() ? [SIDE_PLAYER, SIDE_ENEMY] : [SIDE_ENEMY, SIDE_PLAYER];
    }

    let flinchedSide: Side | null = null;
    for (const side of order) {
      if (this.over || this.monOf(side).isFainted) continue;
      if (flinchedSide === side) {
        push({ t: "message", text: `${this.name(side)} flinched!` });
        continue;
      }
      const move = side === SIDE_PLAYER ? playerMove : enemyMove!;
      const flinched = this.executeMove(side, move, push);
      if (flinched) flinchedSide = side === SIDE_PLAYER ? SIDE_ENEMY : SIDE_PLAYER;
      this.checkFaints(push);
      if (this.over) return;
    }
    this.endOfTurn(push);
    this.checkFaints(push);
  }

  /** Returns true when the defender was made to flinch. */
  private executeMove(attackerSide: Side, move: MoveViewLike, push: (e: BattleEvent) => void): boolean {
    const attacker = this.monOf(attackerSide);
    const defenderSide: Side = attackerSide === SIDE_PLAYER ? SIDE_ENEMY : SIDE_PLAYER;
    const defender = this.monOf(defenderSide);

    if (attacker.status === "slp") {
      if (attacker.sleepTurns > 0) {
        attacker.sleepTurns--;
        push({ t: "message", text: `${this.name(attackerSide)} is fast asleep.` });
        return false;
      }
      attacker.status = null;
      push({ t: "statusCured", side: attackerSide });
      push({ t: "message", text: `${this.name(attackerSide)} woke up!` });
    }
    if (attacker.status === "frz") {
      if (!this.rng.bool(0.2)) {
        push({ t: "message", text: `${this.name(attackerSide)} is frozen solid!` });
        return false;
      }
      attacker.status = null;
      push({ t: "statusCured", side: attackerSide });
      push({ t: "message", text: `${this.name(attackerSide)} thawed out!` });
    }
    if (attacker.status === "prz" && this.rng.bool(0.25)) {
      push({ t: "message", text: `${this.name(attackerSide)} is paralyzed! It can't move!` });
      return false;
    }

    const slot = attacker.moves.find((m) => m.key === move.key)!;
    slot.ppLeft--;
    push({ t: "moveUsed", side: attackerSide, moveName: move.displayName.toUpperCase() });

    if (move.accuracy > 0 && !this.rng.bool(move.accuracy / 100)) {
      push({ t: "missed", side: attackerSide });
      push({ t: "message", text: `${this.name(attackerSide)}'s attack missed!` });
      return false;
    }

    if (move.category === 2) {
      this.applyStatusMove(attackerSide, move, push);
      return false;
    }

    const physical = move.category === 0;
    const attackStat = attacker.stat(physical ? "atk" : "spa");
    const attackMult = stageMultiplier(this.stagesOf(attackerSide).stages[physical ? 0 : 2]!);
    const burnCut = physical && attacker.status === "brn" ? 0.5 : 1;
    const defenseStat = defender.stat(physical ? "def" : "spd");
    const defenseMult = stageMultiplier(this.stagesOf(defenderSide).stages[physical ? 1 : 3]!);

    const eff = typeEffectiveness(move.type, defender.species.types);
    if (eff === 0) {
      push({ t: "damage", side: defenderSide, amount: 0, hpLeft: defender.hp, maxHp: defender.maxHp(), effectiveness: 0 });
      push({ t: "message", text: "It doesn't affect the foe..." });
      return false;
    }

    const crit = this.rng.bool(1 / 16);
    const stab = attacker.species.types.includes(move.type) ? 1.5 : 1;
    const roll = this.rng.range(85, 100) / 100;
    const base =
      Math.floor(
        (Math.floor((Math.floor((2 * attacker.level) / 5 + 2) * move.power * attackStat * attackMult * burnCut) /
          (defenseStat * defenseMult)) /
          50) +
          2,
      );
    const damage = Math.max(1, Math.floor(base * stab * eff * roll * (crit ? 1.5 : 1)));

    defender.hp = Math.max(0, defender.hp - damage);
    push({
      t: "damage",
      side: defenderSide,
      amount: damage,
      hpLeft: defender.hp,
      maxHp: defender.maxHp(),
      effectiveness: eff,
    });
    const label = effectivenessLabel(eff);
    if (label) push({ t: "message", text: label });
    if (crit) push({ t: "message", text: "A critical hit!" });

    if (move.drain > 0 && damage > 0) {
      attacker.restoreHp(Math.max(1, Math.floor((damage * move.drain) / 100)));
      push({ t: "heal", side: attackerSide, hpLeft: attacker.hp, maxHp: attacker.maxHp() });
    }

    if (
      defender.hp > 0 &&
      !defender.status &&
      move.ailment &&
      move.ailmentChance > 0 &&
      this.rng.bool(move.ailmentChance / 100)
    ) {
      this.setStatus(defenderSide, statusFromAilment(move.ailment), push);
    }
    if (defender.hp > 0 && move.flinch > 0 && this.rng.bool(move.flinch / 100)) return true;
    return false;
  }

  /**
   * Stat-change targeting rule: positive deltas buff the user, negative
   * deltas debuff the target (true for every move in the shipped pool).
   */
  private applyStatusMove(userSide: Side, move: MoveViewLike, push: (e: BattleEvent) => void): void {
    const user = this.monOf(userSide);
    if (move.heal > 0) {
      user.restoreHp(Math.floor((user.maxHp() * move.heal) / 100));
      push({ t: "heal", side: userSide, hpLeft: user.hp, maxHp: user.maxHp() });
    }
    const status = statusFromAilment(move.ailment);
    if (status) {
      const targetSide: Side = userSide === SIDE_PLAYER ? SIDE_ENEMY : SIDE_PLAYER;
      if (this.monOf(targetSide).status || this.monOf(targetSide).isFainted) {
        push({ t: "message", text: "But it failed!" });
      } else {
        this.setStatus(targetSide, status, push);
      }
    }
    for (const [statIdx, delta] of move.statChanges) {
      const side: Side = delta >= 0 ? userSide : userSide === SIDE_PLAYER ? SIDE_ENEMY : SIDE_PLAYER;
      const target = this.monOf(side);
      if (target.isFainted) continue;
      const state = this.stagesOf(side);
      const current = state.stages[statIdx]!;
      const next = Math.max(-6, Math.min(6, current + delta));
      if (next === current) {
        push({ t: "message", text: "But it failed!" });
      } else {
        state.stages[statIdx] = next;
        push({
          t: "statChange",
          side,
          statName: STAT_NAMES[statIdx]!,
          stages: delta,
        });
      }
    }
  }

  private setStatus(side: Side, status: Status, push: (e: BattleEvent) => void): void {
    const mon = this.monOf(side);
    if (!status || mon.status) return;
    mon.status = status;
    mon.sleepTurns = status === "slp" ? this.rng.int(1, 3) : 0;
    push({ t: "statusApplied", side, status });
  }

  private enemyTurn(push: (e: BattleEvent) => void): void {
    if (this.over || this.enemyMon.isFainted) return;
    this.executeMove(SIDE_ENEMY, this.usableMove(SIDE_ENEMY, this.chooseEnemyMoveIndex())!, push);
  }

  private endOfTurn(push: (e: BattleEvent) => void): void {
    for (const side of [SIDE_PLAYER, SIDE_ENEMY] as const) {
      const mon = this.monOf(side);
      if (mon.isFainted || (mon.status !== "brn" && mon.status !== "psn")) continue;
      const damage = Math.max(1, Math.floor(mon.maxHp() / (mon.status === "brn" ? 16 : 8)));
      mon.hp = Math.max(0, mon.hp - damage);
      push({
        t: "message",
        text: `${this.name(side)} is hurt by ${mon.status === "brn" ? "its burn" : "poison"}!`,
      });
      push({ t: "damage", side, amount: damage, hpLeft: mon.hp, maxHp: mon.maxHp(), effectiveness: 1 });
    }
  }

  private resolveItem(itemKey: string, targetPartyIndex: number, push: (e: BattleEvent) => void): void {
    const count = this.inventory.get(itemKey) ?? 0;
    if (count <= 0) {
      push({ t: "message", text: "None left!" });
      return;
    }
    this.inventory.set(itemKey, count - 1);

    if (BALL_MULTIPLIERS[itemKey]) {
      this.throwBall(itemKey, push);
      return;
    }
    const target = this.playerParty[targetPartyIndex];
    if (!target) return;
    const cure = itemKey === "antidote" ? "psn" : itemKey === "paralyze-heal" ? "prz" : itemKey === "awakening" ? "slp" : null;
    if (cure && target.status === cure) {
      target.status = null;
      push({ t: "statusCured", side: SIDE_PLAYER });
      push({ t: "message", text: `${target.displayName} snapped out of it!` });
    } else if (POTION_HEALS[itemKey]) {
      const healed = target.restoreHp(POTION_HEALS[itemKey]!);
      push({ t: "heal", side: SIDE_PLAYER, hpLeft: target.hp, maxHp: target.maxHp() });
      push({
        t: "message",
        text: healed > 0 ? `${target.displayName} recovered ${healed} HP!` : "It won't have any effect.",
      });
    } else {
      push({ t: "message", text: "It won't have any effect." });
      this.inventory.set(itemKey, count);
    }
  }

  private throwBall(ballKey: string, push: (e: BattleEvent) => void): void {
    if (this.kind !== "wild") {
      this.inventory.set(ballKey, (this.inventory.get(ballKey) ?? 0) + 1);
      push({ t: "message", text: "You can't catch another trainer's monster!" });
      return;
    }
    const target = this.enemyMon;
    push({ t: "message", text: `You threw one ${BALL_DISPLAY[ballKey] ?? "BALL"}!` });

    const statusBonus =
      target.status === "slp" || target.status === "frz" ? 2 : target.status ? 1.5 : 1;
    const a =
      ((3 * target.maxHp() - 2 * target.hp) *
        target.species.captureRate *
        BALL_MULTIPLIERS[ballKey]! *
        statusBonus) /
      (3 * target.maxHp());
    const shakeProb = a >= 255 ? 65536 : 65536 / Math.pow(255 / a, 0.1875);
    if (this.rng.int(0, 65535) < shakeProb) {
      push({ t: "caught" });
      if (this.playerParty.length < 6) {
        this.playerParty.push(target);
        push({ t: "message", text: `Gotcha! ${target.displayName} was caught!` });
      } else {
        this.storage.push(target);
        push({ t: "message", text: `Gotcha! ${target.displayName} was sent to storage!` });
      }
      this.over = true;
      this.resultKind = "caught";
      push({ t: "end", playerWon: true });
      return;
    }
    const shakes = Math.max(0, Math.min(3, Math.ceil((shakeProb / 65536) * 3) - 1));
    push({
      t: "message",
      text:
        shakes >= 3
          ? "Argh! So close!"
          : shakes >= 2
            ? "Aargh! Almost had it!"
            : shakes >= 1
              ? "Oh no! The monster broke free!"
              : "The ball missed the monster!",
    });
  }

  private resolveRun(push: (e: BattleEvent) => void): void {
    if (this.kind === "trainer") {
      push({ t: "message", text: "No! There's no running from a trainer battle!" });
      return;
    }
    this.runAttempts++;
    const odds =
      (this.effectiveSpeed(SIDE_PLAYER) * 128) / Math.max(1, this.effectiveSpeed(SIDE_ENEMY)) +
      30 * this.runAttempts;
    if (this.rng.int(0, 255) < odds % 256) {
      push({ t: "fled" });
      push({ t: "message", text: "Got away safely!" });
      this.over = true;
      this.resultKind = "fled";
      push({ t: "end", playerWon: false });
      return;
    }
    push({ t: "message", text: "Can't escape!" });
    this.enemyTurn(push);
    this.endOfTurn(push);
    this.checkFaints(push);
  }

  private checkFaints(push: (e: BattleEvent) => void): void {
    if (this.over) return;
    if (this.enemyMon.isFainted) {
      push({ t: "faint", side: SIDE_ENEMY });
      push({ t: "message", text: `${this.foePrefix()}${this.enemyMon.displayName} fainted!` });
      const gain = Math.floor(
        (this.enemyMon.species.baseExp * this.enemyMon.level * (this.kind === "trainer" ? 1.5 : 1)) / 7,
      );
      if (gain > 0 && !this.playerMon.isFainted) {
        push({ t: "expGain", amount: gain });
        push({ t: "message", text: `${this.playerMon.displayName} gained ${gain} EXP.` });
        const levels = this.playerMon.gainExp(gain);
        for (let l = this.playerMon.level - levels + 1; l <= this.playerMon.level; l++) {
          push({ t: "levelUp", level: l });
          const learnedAtLevel = this.dex.learnset(this.playerMon.speciesId).filter((_, i) => 1 + i * 4 === l);
          for (const key of learnedAtLevel) {
            if (this.playerMon.moves.length < 4 && !this.playerMon.moves.some((m) => m.key === key)) {
              this.playerMon.learnMoveSilent(key);
              push({ t: "message", text: `${this.playerMon.displayName} learned ${this.dex.move(key).displayName.toUpperCase()}!` });
            }
          }
        }
      }
      const nextEnemy = this.enemyParty.findIndex((m) => !m.isFainted);
      if (nextEnemy >= 0) {
        this.doSwitch(SIDE_ENEMY, nextEnemy, push);
      } else {
        this.over = true;
        this.resultKind = "win";
        push({ t: "end", playerWon: true });
      }
      return;
    }
    if (this.playerMon.isFainted) {
      push({ t: "faint", side: SIDE_PLAYER });
      push({ t: "message", text: `${this.playerMon.displayName} fainted!` });
      if (this.healthyCount(SIDE_PLAYER) > 0) {
        this.awaitingForcedSwitch = true;
      } else {
        this.over = true;
        this.resultKind = "lose";
        push({ t: "end", playerWon: false });
      }
    }
  }
}

type MoveViewLike = ReturnType<Pokedex["move"]>;
const BALL_DISPLAY: Record<string, string> = {
  "poke-ball": "POKE BALL",
  "great-ball": "GREAT BALL",
  "ultra-ball": "ULTRA BALL",
};
