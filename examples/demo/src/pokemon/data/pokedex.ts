import speciesJson from "./species.json";
import movesJson from "./moves.json";

export const TYPES: readonly string[] = (speciesJson as { types: string[] }).types;
export const TYPE = Object.fromEntries(TYPES.map((t, i) => [t, i])) as Record<string, number>;

const RAW_SPECIES = (speciesJson as unknown as { species: SpeciesRow[] }).species;
const RAW_MOVES = (movesJson as unknown as { moves: MoveRow[] }).moves;

export type SpeciesRow = [
  id: number, name: string, types: number[],
  hp: number, atk: number, def: number, spa: number, spd: number, spe: number,
  captureRate: number, baseExp: number, growthRate: string,
  evoTo: number, evoLevel: number,
];

export type MoveRow = [
  id: number, name: string, type: number,
  category: 0 | 1 | 2, power: number, accuracy: number, pp: number, priority: number,
  ailment: number, ailmentChance: number,
  statChanges: Array<[stat: number, stages: number]>,
  heal: number, drain: number, flinch: number,
];

export type SpeciesView = {
  id: number;
  name: string;
  displayName: string;
  types: number[];
  base: [number, number, number, number, number, number];
  captureRate: number;
  baseExp: number;
  growthRate: GrowthRate;
  evoTo: number;
  evoLevel: number;
};

export type MoveView = {
  id: number;
  key: string;
  name: string;
  displayName: string;
  type: number;
  category: 0 | 1 | 2;
  power: number;
  accuracy: number;
  pp: number;
  priority: number;
  ailment: string | null;
  ailmentChance: number;
  statChanges: ReadonlyArray<readonly [number, number]>;
  heal: number;
  drain: number;
  flinch: number;
};

export type GrowthRate =
  | "slow" | "medium" | "fast" | "medium-slow" | "slow-then-very-fast" | "fast-then-very-slow";

function titleCase(raw: string): string {
  return raw
    .split("-")
    .map((part) => {
      if (/^\d/.test(part)) return part.toUpperCase();
      if (part.length <= 2 && part === part.toLowerCase() && /^[a-z]+$/.test(part) && ["po", "hi", "k"].includes(part)) {
        return part.toUpperCase();
      }
      return part[0].toUpperCase() + part.slice(1);
    })
    .join(" ");
}

export class Pokedex {
  private readonly speciesById = new Map<number, SpeciesView>();
  private readonly moveByKey = new Map<string, MoveView>();
  private readonly learnsetCache = new Map<number, string[]>();

  constructor(
    implementedAilments: ReadonlySet<string> = IMPLEMENTED_AILMENTS,
    private readonly universalMoves = UNIVERSAL_MOVE_KEYS,
  ) {
    for (const row of RAW_SPECIES) {
      this.speciesById.set(row[0], {
        id: row[0],
        name: row[1],
        displayName: titleCase(row[1]),
        types: row[2],
        base: [row[3], row[4], row[5], row[6], row[7], row[8]],
        captureRate: row[9],
        baseExp: row[10],
        growthRate: row[11] as GrowthRate,
        evoTo: row[12],
        evoLevel: row[13],
      });
    }
    for (const row of RAW_MOVES) {
      const ailmentName = row[8] >= 0 ? AILMENT_NAMES[row[8]] : null;
      if (row[3] === 2 && ailmentName !== null && !implementedAilments.has(ailmentName) && row[10].length === 0) {
        continue;
      }
      const view: MoveView = {
        id: row[0],
        key: row[1],
        name: row[1],
        displayName: titleCase(row[1]),
        type: row[2],
        category: row[3],
        power: row[4],
        accuracy: row[5],
        pp: row[6],
        priority: row[7],
        ailment: ailmentName,
        ailmentChance: row[9],
        statChanges: row[10],
        heal: row[11],
        drain: row[12],
        flinch: row[13],
      };
      this.moveByKey.set(view.key, view);
    }
  }

  species(id: number): SpeciesView {
    const s = this.speciesById.get(id);
    if (!s) throw new Error(`Unknown species id ${id}`);
    return s;
  }

  speciesOrNull(id: number): SpeciesView | null {
    return this.speciesById.get(id) ?? null;
  }

  get speciesCount(): number {
    return this.speciesById.size;
  }

  move(key: string): MoveView {
    const m = this.moveByKey.get(key);
    if (!m) throw new Error(`Unknown move '${key}'`);
    return m;
  }

  hasMove(key: string): boolean {
    return this.moveByKey.has(key);
  }

  search(prefix: string, limit = 10): SpeciesView[] {
    const q = prefix.toLowerCase();
    const out: SpeciesView[] = [];
    for (const s of this.speciesById.values()) {
      if (s.name.startsWith(q)) out.push(s);
      if (out.length >= limit) break;
    }
    return out;
  }

  /**
   * Deterministic synthetic learnset: a level-1 opener, then progressively
   * stronger moves alternating damaging/status from the species' own types
   * plus the universal pool. Every species therefore has a sensible growing
   * movepool without shipping per-species learnsets.
   */
  learnset(speciesId: number): string[] {
    let cached = this.learnsetCache.get(speciesId);
    if (cached) return cached;

    const sp = this.species(speciesId);
    const ownTypes = new Set(sp.types);
    const damaging: MoveView[] = [];
    const buffs: MoveView[] = [];
    for (const mv of this.moveByKey.values()) {
      const eligible = ownTypes.has(mv.type) || this.universalMoves.has(mv.key);
      if (!eligible) continue;
      if (mv.category === 2) {
        const useful = mv.statChanges.length > 0 || mv.heal > 0 || (mv.ailment !== null && IMPLEMENTED_AILMENTS.has(mv.ailment));
        if (useful && mv.displayName.length <= 12) buffs.push(mv);
      } else if (mv.power >= 20 && mv.power <= 130 && !mv.key.startsWith("hiddenpower")) {
        damaging.push(mv);
      }
    }
    const byPower = (a: MoveView, b: MoveView) => a.power - b.power || a.id - b.id;
    damaging.sort(byPower);
    buffs.sort((a, b) => b.pp - a.pp || a.id - b.id);

    const plan: Array<{ level: number; key: string }> = [];
    const opener =
      buffs.find((m) => m.statChanges.some(([stat]) => stat === 0)) ??
      buffs[0] ??
      damaging.find((m) => m.power <= 45) ??
      damaging[0];
    if (opener) plan.push({ level: 1, key: opener.key });

    let d = 0;
    if (opener && opener.category !== 2) {
      d = damaging.findIndex((m) => m.key === opener.key) + 1;
    }
    let b = 0;
    while (d < damaging.length || b < buffs.length) {
      const level = Math.min(60, plan.length * 4 + 1);
      if (d < damaging.length && (plan.length % 3 !== 2 || b >= buffs.length)) {
        plan.push({ level, key: damaging[d++].key });
      } else {
        const candidate = buffs[b++];
        if (candidate && candidate.key !== plan[plan.length - 1]?.key) {
          plan.push({ level, key: candidate.key });
        }
      }
    }

    const seenKeys = new Set<string>();
    cached = plan.filter((p) => !seenKeys.has(p.key) && seenKeys.add(p.key)).map((p) => p.key);
    this.learnsetCache.set(speciesId, cached);
    return cached;
  }

  movesAtLevel(speciesId: number, level: number): string[] {
    const known = this.learnset(speciesId).filter((_, i) => 1 + i * 4 <= level);
    return known.slice(-4);
  }
}

export const STAT_INDEX: Record<string, number> = {
  attack: 0, defense: 1, "special-attack": 2, "special-defense": 3, speed: 4,
};

export const AILMENT_NAMES: readonly string[] = (speciesJson as unknown as { ailments: string[] }).ailments;

export const IMPLEMENTED_AILMENTS: ReadonlySet<string> = new Set([
  "paralysis", "burn", "poison", "sleep", "freeze",
]);

const UNIVERSAL_MOVE_KEYS: ReadonlySet<string> = new Set([
  "swift", "body-slam", "hyper-beam", "double-edge", "take-down", "rapid-spin",
  "facade", "return", "frustration", "hidden-power", "round", "echoed-voice",
  "growl", "tail-whip", "harden", "defense-curl", "quick-attack", "focus-energy",
  "rest", "protect", "substitute", "swords-dance", "agility", "work-up",
]);
