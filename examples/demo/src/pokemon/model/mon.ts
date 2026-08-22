import { Pokedex, type MoveView, type SpeciesView } from "../data/pokedex.js";

export type StatBlock = { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };

export const STATUS_KEYS = ["brn", "psn", "prz", "slp", "frz"] as const;
export type Status = (typeof STATUS_KEYS)[number] | null;

const AILMENT_TO_STATUS: Record<string, Status> = {
  burn: "brn", poison: "psn", paralysis: "prz", sleep: "slp", freeze: "frz",
};

export function statusFromAilment(ailment: string | null): Status {
  return ailment ? (AILMENT_TO_STATUS[ailment] ?? null) : null;
}

export function expForLevel(level: number, growth: GrowthRate): number {
  if (level <= 1) return 0;
  const n = level;
  switch (growth) {
    case "fast":
      return Math.floor((4 * n * n * n) / 5);
    case "slow":
      return Math.floor((5 * n * n * n) / 4);
    case "medium-slow":
      return Math.max(1, Math.floor((6 / 5) * n ** 3 - 15 * n * n + 100 * n - 140));
    case "slow-then-very-fast": {
      if (n < 50) return Math.floor((n ** 3 * (100 - n)) / 50);
      if (n < 68) return Math.floor((n ** 3 * (150 - n)) / 100);
      if (n < 98) return Math.floor(n ** 3 * Math.floor((1911 - 10 * n) / 3) / 500);
      return Math.floor((n ** 3 * (160 - n)) / 100);
    }
    case "fast-then-very-slow": {
      if (n < 15) return Math.floor(n ** 3 * (Math.floor((n + 1) / 3) + 24) / 50);
      if (n < 36) return Math.floor(n ** 3 * (n + 14) / 50);
      return Math.floor(n ** 3 * (Math.floor(n / 2) + 32) / 50);
    }
    default:
      return n * n * n;
  }
}
type GrowthRate = SpeciesView["growthRate"];

export type MonMove = { key: string; ppLeft: number };

export type MonData = {
  speciesId: number;
  level: number;
  exp: number;
  hp: number;
  status: Status;
  sleepTurns: number;
  moves: MonMove[];
};

let monCounter = 0;

export class Mon {
  readonly uid = ++monCounter;
  speciesId: number;
  level: number;
  exp: number;
  hp: number;
  status: Status = null;
  sleepTurns = 0;
  moves: MonMove[] = [];
  private statsCache: StatBlock;

  constructor(private readonly dex: Pokedex, data: MonData) {
    this.speciesId = data.speciesId;
    this.level = data.level;
    this.exp = data.exp;
    this.status = data.status;
    this.sleepTurns = data.sleepTurns;
    this.moves = data.moves.map((m) => ({ ...m }));
    this.statsCache = computeStats(this.species.base, this.level);
    if (this.moves.length === 0) this.setFreshMoves();
    this.hp = clampHp(data.hp, this.maxHp());
  }

  static create(dex: Pokedex, speciesId: number, level: number): Mon {
    const mon = new Mon(dex, {
      speciesId,
      level,
      exp: expForLevel(level, dex.species(speciesId).growthRate),
      hp: Number.MAX_SAFE_INTEGER,
      status: null,
      sleepTurns: 0,
      moves: [],
    });
    mon.hp = mon.maxHp();
    return mon;
  }

  get species(): SpeciesView {
    return this.dex.species(this.speciesId);
  }

  get displayName(): string {
    return this.species.displayName.toUpperCase();
  }

  get isFainted(): boolean {
    return this.hp <= 0;
  }

  moveViews(): MoveView[] {
    return this.moves.map((m) => this.dex.move(m.key));
  }

  setFreshMoves(): void {
    this.moves = this.dex
      .movesAtLevel(this.speciesId, this.level)
      .map((key) => ({ key, ppLeft: this.dex.move(key).pp }));
  }

  maxHp(): number {
    return this.statsCache.hp;
  }

  stats(): StatBlock {
    return { ...this.statsCache };
  }

  stat(name: Exclude<keyof StatBlock, "hp">): number {
    return this.statsCache[name];
  }

  expToNextLevel(): number {
    return expForLevel(this.level + 1, this.species.growthRate);
  }

  /** Apply exp; returns levels gained. Evolution check is separate. */
  gainExp(amount: number): number {
    let gainedLevels = 0;
    this.exp += amount;
    while (this.level < 100 && this.exp >= expForLevel(this.level + 1, this.species.growthRate)) {
      const oldMax = this.maxHp();
      this.level++;
      this.statsCache = computeStats(this.species.base, this.level);
      this.hp = clampHp(this.hp + (this.maxHp() - oldMax), this.maxHp());
      gainedLevels++;
    }
    return gainedLevels;
  }

  evolutionPending(): number {
    const { evoTo, evoLevel } = this.species;
    return evoTo !== 0 && this.level >= evoLevel ? evoTo : 0;
  }

  evolve(dex: Pokedex, toSpeciesId: number): string {
    const before = this.displayName;
    const ratio = this.hp / this.maxHp();
    this.speciesId = toSpeciesId;
    this.statsCache = computeStats(this.species.base, this.level);
    this.hp = clampHp(Math.round(this.maxHp() * ratio), this.maxHp());
    for (const learned of dex.movesAtLevel(toSpeciesId, this.level)) {
      if (!this.moves.some((m) => m.key === learned)) {
        if (this.moves.length < 4) this.learnMoveSilent(learned);
        break;
      }
    }
    return before;
  }

  learnMoveSilent(key: string): boolean {
    if (this.moves.length >= 4 || this.moves.some((m) => m.key === key)) return false;
    this.moves.push({ key, ppLeft: this.dex.move(key).pp });
    return true;
  }

  healFull(): void {
    this.hp = this.maxHp();
    this.status = null;
    this.sleepTurns = 0;
    for (const m of this.moves) m.ppLeft = this.dex.move(m.key).pp;
  }

  restoreHp(amount: number): number {
    const healed = Math.min(amount, this.maxHp() - this.hp);
    this.hp += healed;
    return healed;
  }

  toData(): MonData {
    return {
      speciesId: this.speciesId,
      level: this.level,
      exp: this.exp,
      hp: this.hp,
      status: this.status,
      sleepTurns: this.sleepTurns,
      moves: this.moves.map((m) => ({ ...m })),
    };
  }
}

function clampHp(hp: number, max: number): number {
  return Math.max(0, Math.min(max, hp));
}

export function computeStats(base: readonly number[], level: number): StatBlock {
  const stat = (b: number) => Math.floor((2 * b * level) / 100) + 5;
  return {
    hp: Math.floor((2 * base[0]! * level) / 100) + level + 10,
    atk: stat(base[1]!),
    def: stat(base[2]!),
    spa: stat(base[3]!),
    spd: stat(base[4]!),
    spe: stat(base[5]!),
  };
}
