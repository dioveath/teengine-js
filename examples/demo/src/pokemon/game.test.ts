import { describe, expect, it } from "vitest";
import { Pokedex } from "./data/pokedex.js";
import { typeEffectiveness, typeMultiplier } from "./model/battle.js";
import { Mon, computeStats, expForLevel } from "./model/mon.js";
import {
  BattleEngine,
  SIDE_ENEMY,
  SIDE_PLAYER,
} from "./model/battle.js";
import { MAPS, isSolidTile, rollEncounter, tileAt, type EncounterEntry } from "./world/maps.js";
import { SCRIPTS } from "./world/scripts.js";
import type { Rng } from "teengine";

const dex = new Pokedex();

function scriptedRng(values: number[]): Rng {
  let i = 0;
  return {
    next: () => values[i++ % values.length] ?? 0.999,
    int: (_min: number, _max: number) => Math.floor((values[i++ % values.length] ?? 0.999) * 4),
    bool: (probability = 0.5) => (values[i++ % values.length] ?? 0.999) < probability,
    range: (_a: number, b: number) => b,
    pick: <T>(items: readonly T[]) => items[0]!,
    shuffle: <T>(items: T[]) => items,
    weighted: <T>(entries: ReadonlyArray<readonly [T, number]>) => entries[0]![0],
    state: 0,
  } as unknown as Rng;
}

function damagingMoveIndex(mon: Mon): number {
  return mon.moves
    .map((slot, i) => ({ i, mv: dex.move(slot.key) }))
    .filter((x) => x.mv.category !== 2 && (x.mv.accuracy === 0 || x.mv.accuracy >= 100))
    .sort((a, b) => b.mv.power - a.mv.power)[0]!.i;
}

describe("Pokedex data integrity", () => {
  it("loaded the full national database", () => {
    expect(dex.speciesCount).toBeGreaterThanOrEqual(1000);
  });

  it("exposes species views with valid types", () => {
    const pikachu = dex.species(25);
    expect(pikachu.displayName).toBe("Pikachu");
    expect(pikachu.types).toContain(3);
    expect(pikachu.captureRate).toBeGreaterThan(0);
    expect(pikachu.baseExp).toBeGreaterThan(0);
  });

  it("decodes moves with sensible fields", () => {
    const takedown = dex.move("take-down");
    expect(takedown.power).toBeGreaterThan(0);
    expect(takedown.pp).toBeGreaterThan(0);
    expect(takedown.accuracy).toBeGreaterThanOrEqual(0);
    expect(takedown.category).not.toBe(2);
  });

  it("generates a deterministic learnset for every species", () => {
    for (const id of [1, 4, 7, 25, 150, 95, 744]) {
      const a = dex.learnset(id);
      const b = dex.learnset(id);
      expect(a.length).toBeGreaterThan(3);
      expect(a).toEqual(b);
      for (const key of a) expect(dex.hasMove(key)).toBe(true);
    }
  });

  it("movesAtLevel respects level gating and four slots", () => {
    const early = dex.movesAtLevel(1, 1);
    expect(early.length).toBeLessThanOrEqual(4);
    expect(early.length).toBeGreaterThanOrEqual(1);
    const late = dex.movesAtLevel(6, 40);
    expect(late.length).toBeLessThanOrEqual(4);
    expect(new Set(late).size).toBe(late.length);
  });
});

describe("Type chart", () => {
  it("matches known matchups", () => {
    expect(typeMultiplier(1, 4)).toBe(2); // fire > grass
    expect(typeMultiplier(2, 1)).toBe(2); // water > fire
    expect(typeMultiplier(4, 8)).toBe(2); // grass > ground
    expect(typeMultiplier(0, 13)).toBe(0); // normal vs ghost
    expect(typeMultiplier(8, 9)).toBe(0); // ground vs flying
    expect(typeMultiplier(14, 17)).toBe(0); // dragon vs fairy
    expect(typeMultiplier(1, 1)).toBe(0.5); // fire vs fire
    expect(typeMultiplier(6, 17)).toBe(0.5); // fighting vs fairy
  });

  it("stacks dual-type multipliers", () => {
    expect(typeEffectiveness(1, [4, 16])).toBe(4); // fire vs grass/steel
    expect(typeEffectiveness(2, [12, 8])).toBe(4); // water vs rock/ground
    expect(typeEffectiveness(1, [4, 16])).toBe(4); // fire vs grass/steel
  });
});

describe("Mon stats and progression", () => {
  it("computes canonical stats", () => {
    const stats = computeStats([45, 49, 49, 65, 65, 45], 50);
    expect(stats.hp).toBe(105);
    expect(stats.atk).toBe(54);
    expect(stats.spa).toBe(70);
  });

  it("exp curves hit known values", () => {
    expect(expForLevel(1, "medium")).toBe(0);
    expect(expForLevel(50, "medium")).toBe(125000);
    expect(expForLevel(50, "fast")).toBe(100000);
    expect(expForLevel(50, "slow")).toBe(156250);
  });

  it("gainExp levels up and heals the new max HP delta", () => {
    const mon = Mon.create(dex, 25, 5);
    mon.hp = 1;
    const oldMax = mon.maxHp();
    const gained = mon.gainExp(mon.expToNextLevel() + 1);
    expect(gained).toBe(1);
    expect(mon.level).toBe(6);
    expect(mon.maxHp()).toBeGreaterThan(oldMax);
    expect(mon.hp).toBe(oldMax - oldMax + 1 + (mon.maxHp() - oldMax));
  });

  it("flags evolution when threshold reached", () => {
    const mon = Mon.create(dex, 7, 16);
    expect(mon.evolutionPending()).toBe(8);
    const young = Mon.create(dex, 7, 15);
    expect(young.evolutionPending()).toBe(0);
  });

  it("evolve keeps hp ratio and updates species", () => {
    const mon = Mon.create(dex, 7, 16);
    mon.hp = Math.floor(mon.maxHp() / 2);
    const ratioBefore = mon.hp / mon.maxHp();
    const name = mon.evolve(dex, 8);
    expect(name).toBe("SQUIRTLE");
    expect(mon.speciesId).toBe(8);
    expect(mon.hp / mon.maxHp()).toBeCloseTo(ratioBefore, 1);
  });

  it("round-trips through save data", () => {
    const mon = Mon.create(dex, 6, 30);
    mon.hp -= 20;
    mon.moves[0]!.ppLeft = 1;
    const clone = new Mon(dex, JSON.parse(JSON.stringify(mon.toData())));
    expect(clone.speciesId).toBe(mon.speciesId);
    expect(clone.hp).toBe(mon.hp);
    expect(clone.moves).toEqual(mon.moves);
  });
});

describe("Battle engine", () => {
  function makeEngine(
    player: Mon,
    enemy: Mon,
    rngValues: number[],
    opts: { kind?: "wild" | "trainer"; bag?: Map<string, number>; extraParty?: Mon[] } = {},
  ): BattleEngine {
    return new BattleEngine(
      { dex, rng: scriptedRng(rngValues), inventory: opts.bag ?? new Map(), storage: [] },
      opts.kind ?? "wild",
      [player, ...(opts.extraParty ?? [])],
      [enemy],
    );
  }

  it("resolves a full turn with messages and damage", () => {
    const engine = makeEngine(Mon.create(dex, 7, 20), Mon.create(dex, 19, 10), [0.99]);
    const index = damagingMoveIndex(engine.playerMon);
    engine.submit({ kind: "move", index });
    const events = engine.advance();
    const kinds = events.map((e) => e.t);
    expect(kinds).toContain("moveUsed");
    expect(kinds).toContain("damage");
    expect(events.some((e) => e.t === "damage" && e.side === SIDE_ENEMY && e.amount > 0)).toBe(true);
  });

  it("misses consume the turn without damage", () => {
    const player = Mon.create(dex, 7, 20);
    const diveIndex = player.moves.findIndex((m) => m.key === "triple-dive");
    expect(diveIndex).toBeGreaterThanOrEqual(0);
    const engine = makeEngine(player, Mon.create(dex, 19, 10), [0.99]);
    engine.submit({ kind: "move", index: diveIndex });
    const events = engine.advance();
    expect(events.some((e) => e.t === "missed")).toBe(true);
    expect(events.some((e) => e.t === "damage")).toBe(false);
  });

  it("KOs the enemy, awards exp, and ends the battle", () => {
    const player = Mon.create(dex, 7, 30);
    const enemy = Mon.create(dex, 10, 2);
    enemy.hp = 1;
    const engine = makeEngine(player, enemy, [0.99]);
    engine.submit({ kind: "move", index: damagingMoveIndex(player) });
    const events = engine.advance();
    expect(engine.isOver).toBe(true);
    expect(engine.outcome).toBe("win");
    expect(events.some((e) => e.t === "faint" && e.side === SIDE_ENEMY)).toBe(true);
    expect(events.some((e) => e.t === "expGain")).toBe(true);
  });

  it("handles forced switch on player faint", () => {
    const weak = Mon.create(dex, 10, 1);
    weak.hp = 1;
    const healthy = Mon.create(dex, 6, 40);
    const engine = makeEngine(weak, Mon.create(dex, 6, 30), [0.99], {
      kind: "trainer",
      extraParty: [healthy],
    });
    engine.submit({ kind: "switch", partyIndex: 1 });
    const firstEvents = engine.advance();
    expect(firstEvents.some((e) => e.t === "sendout" && e.index === 1)).toBe(true);
    expect(firstEvents.some((e) => e.t === "recall")).toBe(true);
    expect(engine.needsForcedSwitch).toBe(false);
    expect(engine.playerMon).toBe(healthy);

    const fainted = Mon.create(dex, 10, 1);
    fainted.hp = 1;
    const backup = Mon.create(dex, 6, 40);
    const engine2 = makeEngine(fainted, Mon.create(dex, 6, 30), [0.99], {
      kind: "wild",
      extraParty: [backup],
    });
    engine2.submit({ kind: "move", index: 0 });
    const events = engine2.advance();
    expect(events.some((e) => e.t === "faint" && e.side === SIDE_PLAYER)).toBe(true);
    expect(engine2.needsForcedSwitch).toBe(true);
    engine2.submit({ kind: "switch", partyIndex: 1 });
    const secondEvents = engine2.advance();
    expect(engine2.needsForcedSwitch).toBe(false);
    expect(secondEvents.some((e) => e.t === "sendout" && e.index === 1)).toBe(true);
    expect(secondEvents.some((e) => e.t === "recall")).toBe(false);
  });

  it("ends in loss when the whole party faints", () => {
    const only = Mon.create(dex, 10, 8);
    only.hp = 1;
    const engine = makeEngine(only, Mon.create(dex, 6, 40), [0.99, 0.5]);
    for (let turn = 0; turn < 30 && !engine.isOver; turn++) {
      engine.submit({ kind: "move", index: damagingMoveIndex(engine.playerMon) });
      engine.advance();
    }
    expect(engine.isOver).toBe(true);
    expect(engine.outcome).toBe("lose");
  });

  it("applies burn chip damage at end of turn", () => {
    const burned = Mon.create(dex, 9, 36);
    burned.status = "brn";
    const tank = Mon.create(dex, 143, 25);
    const engine = makeEngine(burned, tank, [0.99]);
    engine.submit({ kind: "move", index: damagingMoveIndex(burned) });
    const events = engine.advance();
    expect(events.some((e) => e.t === "message" && e.text.includes("burn"))).toBe(true);
    expect(burned.hp).toBeLessThan(burned.maxHp());
  });
});

describe("Maps", () => {
  it("all rows share width and tiles resolve", () => {
    for (const map of Object.values(MAPS)) {
      const width = map.rows[0]!.length;
      for (const row of map.rows) expect(row.length).toBe(width);
      expect(tileAt(map, 0, 0)).not.toBeNull();
      expect(tileAt(map, -1, 0)).toBeNull();
      expect(tileAt(map, width, 0)).toBeNull();
    }
  });

  it("warps land on walkable interior tiles of existing maps", () => {
    for (const map of Object.values(MAPS)) {
      for (const warp of map.warps) {
        if (warp.to === "__ending") continue;
        const target = MAPS[warp.to];
        expect(target, `${map.id} -> ${warp.to}`).toBeTruthy();
        const tile = tileAt(target, warp.tx, warp.ty);
        expect(tile, `${map.id} -> ${warp.to} @${warp.tx},${warp.ty}`).not.toBeNull();
        expect(isSolidTile(tile!)).toBe(false);
      }
    }
  });

  it("every npc stands on walkable ground", () => {
    for (const map of Object.values(MAPS)) {
      for (const npc of map.npcs) {
        const tile = tileAt(map, npc.x, npc.y);
        expect(isSolidTile(tile!), `${map.id}:${npc.id} @${npc.x},${npc.y}`).toBe(false);
      }
      for (const item of map.items) {
        expect(isSolidTile(tileAt(map, item.x, item.y)!), `${map.id}:${item.id}`).toBe(false);
      }
    }
  });

  it("encounter tables are populated with valid species ranges", () => {
    const table = MAPS.route1.encounters!;
    expect(table.length).toBeGreaterThanOrEqual(4);
    for (const entry of table as EncounterEntry[]) {
      expect(dex.speciesOrNull(entry.speciesId)).toBeTruthy();
      expect(entry.weight).toBeGreaterThan(0);
      expect(entry.minLevel).toBeLessThanOrEqual(entry.maxLevel);
    }
    const rolled = rollEncounter(table, { next: () => 0.999 });
    expect(rolled).toBeTruthy();
    expect(rolled!.speciesId).toBe(table[table.length - 1]!.speciesId);
    expect(rollEncounter(table, { next: () => 0 })).toEqual(table[0]);
  });
});

describe("Scripts and content wiring", () => {
  it("has a script for every npc reference and sign text keys are parseable", () => {
    for (const map of Object.values(MAPS)) {
      for (const npc of map.npcs) {
        expect(typeof SCRIPTS[npc.script], `${npc.id} -> ${npc.script}`).toBe("function");
      }
    }
  });

  it("starter scripts exist and rival counters work through the professor flow", () => {
    expect(typeof SCRIPTS.intro).toBe("function");
    expect(typeof SCRIPTS.professor).toBe("function");
    expect(typeof SCRIPTS.battleBramble).toBe("function");
  });
});
