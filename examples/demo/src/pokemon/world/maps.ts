export type Dir = 0 | 1 | 2 | 3;
export const DIR_DOWN: Dir = 0;
export const DIR_UP: Dir = 1;
export const DIR_LEFT: Dir = 2;
export const DIR_RIGHT: Dir = 3;

export const TILE_SIZE = 16;

const SOLID_CHARS = new Set(["T", "~", "#", "=", "S", "r", "b", "g", "p", "m", "x", "w", "c", "B", "t", "P", "s", "v", "E"]);

export type Warp = { x: number; y: number; to: string; tx: number; ty: number };

export type NpcDef = {
  id: string;
  x: number;
  y: number;
  dir: Dir;
  palette: number;
  script: string;
};

export type MapItemDef = { id: string; x: number; y: number; itemKey: string };

export type EncounterEntry = { speciesId: number; weight: number; minLevel: number; maxLevel: number };

export type GameMap = {
  id: string;
  displayName: string;
  rows: string[];
  warps: Warp[];
  npcs: NpcDef[];
  items: MapItemDef[];
  encounters?: EncounterEntry[];
};

function grid(...rows: string[]): string[] {
  const width = rows[0]!.length;
  for (const row of rows) {
    if (row.length !== width) throw new Error(`map row width ${row.length} != ${width}`);
  }
  return rows;
}

function border(rows: string[], char: string): void {
  for (let y = 0; y < rows.length; y++) {
    rows[y] = char + rows[y]!.slice(1, -1) + char;
  }
}

const TOWN_W = 40;
const TOWN_H = 30;
const townRows: string[] = [];
for (let y = 0; y < TOWN_H; y++) {
  let row = "";
  for (let x = 0; x < TOWN_W; x++) {
    if (x === 3 || x === 4 || (y >= 20 && y <= 21)) row += "-";
    else if (x === 7 && y > 7 && y < 16) row += "-";
    else if (x === 11 && y >= 21 && y < 27) row += "-";
    else if (x === 20 && ((y >= 11 && y <= 19) || (y >= 21 && y <= 24))) row += "-";
    else if (x === 28 && y >= 22 && y < 27) row += "-";
    else if (x === 31 && y > 7 && y < 16) row += "-";
    else row += ".";
  }
  townRows.push(row);
}
const putRect = (rows: string[], x0: number, y0: number, w: number, h: number, ch: string) => {
  for (let y = y0; y < y0 + h; y++) {
    rows[y] = rows[y]!.slice(0, x0) + ch.repeat(w) + rows[y]!.slice(x0 + w);
  }
};
const putChar = (rows: string[], x: number, y: number, ch: string) => putRect(rows, x, y, 1, 1, ch);

putRect(townRows, 16, 6, 9, 2, "x");
putRect(townRows, 16, 8, 9, 3, "#");
putChar(townRows, 20, 10, "D");
putRect(townRows, 5, 12, 5, 2, "r");
putRect(townRows, 5, 14, 5, 3, "#");
putChar(townRows, 7, 16, "D");
putRect(townRows, 29, 12, 5, 2, "b");
putRect(townRows, 29, 14, 5, 3, "#");
putChar(townRows, 31, 16, "D");
putRect(townRows, 25, 23, 7, 2, "p");
putRect(townRows, 25, 25, 7, 3, "#");
putChar(townRows, 28, 27, "D");
putRect(townRows, 9, 23, 6, 2, "m");
putRect(townRows, 9, 25, 6, 3, "#");
putChar(townRows, 11, 27, "D");
putRect(townRows, 33, 24, 4, 4, "~");
putChar(townRows, 6, 18, "S");
putChar(townRows, 15, 11, "S");
putChar(townRows, 26, 22, "f");
putChar(townRows, 27, 22, "f");
putChar(townRows, 32, 21, "f");
putChar(townRows, 13, 22, "f");
putChar(townRows, 24, 19, "=");
putChar(townRows, 16, 19, "=");
putChar(townRows, 8, 21, ",");
putChar(townRows, 34, 21, ",");

const TOWN: GameMap = {
  id: "town",
  displayName: "EMBERPINE VILLAGE",
  rows: (() => {
    border(townRows, "T");
    putRect(townRows, 3, 0, 2, 1, "-");
    return grid(...townRows);
  })(),
  warps: [
    { x: 7, y: 16, to: "house", tx: 4, ty: 6 },
    { x: 31, y: 16, to: "rivalhouse", tx: 4, ty: 6 },
    { x: 28, y: 27, to: "pokecenter", tx: 6, ty: 8 },
    { x: 11, y: 27, to: "mart", tx: 6, ty: 8 },
    { x: 20, y: 10, to: "gym", tx: 7, ty: 20 },
    { x: 20, y: 24, to: "lab", tx: 8, ty: 10 },
    { x: 3, y: 0, to: "route1", tx: 12, ty: 52 },
    { x: 4, y: 0, to: "route1", tx: 13, ty: 52 },
  ],
  npcs: [
    { id: "npc_kid", x: 9, y: 21, dir: DIR_DOWN, palette: 3, script: "kidGrass" },
    { id: "npc_elder", x: 33, y: 22, dir: DIR_LEFT, palette: 4, script: "elderPond" },
  ],
  items: [],
};

const ROUTE_W = 26;
const ROUTE_H = 56;
const routeRows: string[] = [];
for (let y = 0; y < ROUTE_H; y++) {
  let row = "";
  for (let x = 0; x < ROUTE_W; x++) {
    const pathCol = x === 12 || x === 13;
    const snake =
      ((y >= 44 && y <= 46) || (y >= 30 && y <= 32) || (y >= 16 && y <= 18)) &&
      x >= 6 && x <= 19;
    if (pathCol && y >= 4) row += "-";
    else if (snake) row += "-";
    else if (x >= 4 && x <= 21 && (y % 7 === 0 || (y + 3) % 8 === 0)) row += ",";
    else row += ".";
  }
  routeRows.push(row);
}
putRect(routeRows, 8, 48, 3, 3, "T");
putRect(routeRows, 16, 38, 3, 3, "T");
putRect(routeRows, 5, 26, 3, 3, "T");
putRect(routeRows, 18, 12, 3, 3, "T");
putChar(routeRows, 9, 47, "S");
putChar(routeRows, 15, 36, "S");
putChar(routeRows, 4, 19, "S");

const ROUTE1: GameMap = {
  id: "route1",
  displayName: "PINECREST PATH",
  rows: (() => {
    border(routeRows, "T");
    putRect(routeRows, 11, ROUTE_H - 1, 4, 1, "-");
    putRect(routeRows, 11, 0, 4, 1, "-");
    return grid(...routeRows);
  })(),
  warps: [
    { x: 12, y: ROUTE_H - 1, to: "town", tx: 3, ty: 1 },
    { x: 13, y: ROUTE_H - 1, to: "town", tx: 4, ty: 1 },
    { x: 12, y: 0, to: "gate", tx: 6, ty: 7 },
    { x: 13, y: 0, to: "gate", tx: 7, ty: 7 },
  ],
  npcs: [
    { id: "trainer_tobi", x: 10, y: 45, dir: DIR_RIGHT, palette: 5, script: "battleTobi" },
    { id: "trainer_mira", x: 17, y: 33, dir: DIR_LEFT, palette: 2, script: "battleMira" },
    { id: "trainer_wren", x: 9, y: 21, dir: DIR_DOWN, palette: 6, script: "battleWren" },
  ],
  items: [
    { id: "route_potion", x: 15, y: 51, itemKey: "potion" },
    { id: "route_antidote", x: 19, y: 39, itemKey: "antidote" },
    { id: "route_greatball", x: 9, y: 27, itemKey: "great-ball" },
  ],
  encounters: [
    { speciesId: 16, weight: 30, minLevel: 2, maxLevel: 4 },
    { speciesId: 19, weight: 30, minLevel: 2, maxLevel: 4 },
    { speciesId: 10, weight: 15, minLevel: 3, maxLevel: 4 },
    { speciesId: 13, weight: 15, minLevel: 3, maxLevel: 4 },
    { speciesId: 41, weight: 5, minLevel: 3, maxLevel: 5 },
    { speciesId: 25, weight: 5, minLevel: 3, maxLevel: 5 },
  ],
};

const GATE_W = 14;
const GATE_H = 10;
const gateRows: string[] = [];
for (let y = 0; y < GATE_H; y++) {
  gateRows.push("_".repeat(GATE_W));
}
putRect(gateRows, 0, 0, GATE_W, 1, "w");
gateRows[GATE_H - 1] = "wwwwwwMMwwwwww";
putRect(gateRows, 2, 2, 2, 1, "P");
putRect(gateRows, 10, 2, 2, 1, "P");
putRect(gateRows, 2, 4, 10, 1, "=");
putChar(gateRows, 6, 4, "_");

const GATE: GameMap = {
  id: "gate",
  displayName: "NORTH GATEHOUSE",
  rows: grid(...(() => {
    border(gateRows, "w");
    return gateRows;
  })()),
  warps: [
    { x: 6, y: GATE_H - 1, to: "route1", tx: 12, ty: 1 },
    { x: 7, y: GATE_H - 1, to: "route1", tx: 13, ty: 1 },
    { x: 6, y: 0, to: "__ending", tx: 0, ty: 0 },
    { x: 7, y: 0, to: "__ending", tx: 0, ty: 0 },
  ],
  npcs: [{ id: "guardian", x: 6, y: 4, dir: DIR_DOWN, palette: 4, script: "guardian" }],  items: [],
};

const LAB_W = 17;
const LAB_H = 13;
const labRows: string[] = [];
for (let y = 0; y < LAB_H; y++) labRows.push("_".repeat(LAB_W));
putRect(labRows, 0, 0, LAB_W, 1, "w");
putChar(labRows, 8, LAB_H - 1, "M");
labRows[LAB_H - 1] = "wwwwwwwwwMwwwwwww";
putRect(labRows, 2, 1, 3, 1, "B");
putRect(labRows, 12, 1, 3, 1, "B");
putRect(labRows, 6, 3, 5, 1, "c");
putChar(labRows, 2, 6, "P");
putRect(labRows, 13, 6, 2, 1, "t");
putRect(labRows, 3, 9, 2, 1, "t");

const LAB: GameMap = {
  id: "lab",
  displayName: "SAGE'S LAB",
  rows: grid(...(() => {
    border(labRows, "w");
    return labRows;
  })()),
  warps: [{ x: 8, y: LAB_H - 1, to: "town", tx: 20, ty: 25 }],
  npcs: [
    { id: "professor", x: 8, y: 2, dir: DIR_DOWN, palette: 1, script: "professor" },
    { id: "rival_lab", x: 10, y: 5, dir: DIR_LEFT, palette: 5, script: "rivalLab" },
    { id: "aide", x: 4, y: 8, dir: DIR_UP, palette: 3, script: "aide" },
  ],
  items: [],
};

const CENTER_W = 13;
const CENTER_H = 11;
const centerRows: string[] = [];
for (let y = 0; y < CENTER_H; y++) centerRows.push("_".repeat(CENTER_W));
centerRows[CENTER_H - 1] = "wwwww_Mwwwwww";
putRect(centerRows, 3, 3, 7, 1, "c");
putChar(centerRows, 5, 2, "E");
putChar(centerRows, 10, 2, "P");

const POKECENTER: GameMap = {
  id: "pokecenter",
  displayName: "MON CENTER",
  rows: grid(...(() => {
    border(centerRows, "w");
    return centerRows;
  })()),
  warps: [{ x: 6, y: CENTER_H - 1, to: "town", tx: 28, ty: 28 }],
  npcs: [{ id: "nurse", x: 6, y: 2, dir: DIR_DOWN, palette: 6, script: "nurse" }],
  items: [],
};

const MART_W = 13;
const MART_H = 10;
const martRows: string[] = [];
for (let y = 0; y < MART_H; y++) martRows.push("_".repeat(MART_W));
martRows[MART_H - 1] = "wwwww_Mwwwwww";
putRect(martRows, 2, 2, 9, 1, "c");
putRect(martRows, 2, 0, 9, 1, "B");

const MART: GameMap = {
  id: "mart",
  displayName: "EMBERPINE MART",
  rows: grid(...(() => {
    border(martRows, "w");
    return martRows;
  })()),
  warps: [{ x: 6, y: MART_H - 1, to: "town", tx: 11, ty: 28 }],
  npcs: [{ id: "clerk", x: 6, y: 1, dir: DIR_DOWN, palette: 2, script: "clerk" }],
  items: [],
};

const HOUSE_W = 9;
const HOUSE_H = 8;
function houseRows(): string[] {
  const rows: string[] = [];
  for (let y = 0; y < HOUSE_H; y++) rows.push("_".repeat(HOUSE_W));
  rows[HOUSE_H - 1] = "www_M_www";
  putRect(rows, 2, 1, 3, 1, "t");
  putRect(rows, 6, 0, 3, 1, "B");
  return rows;
}
function makeHouse(id: string, npc: NpcDef | null): GameMap {
  const rows = houseRows();
  return {
    id,
    displayName: "COZY HOME",
    rows: grid(...(() => {
      border(rows, "w");
      return rows;
    })()),
    warps: [{ x: 4, y: HOUSE_H - 1, to: id === "house" ? "town" : "town", tx: id === "house" ? 7 : 31, ty: 17 }],
    npcs: npc ? [npc] : [],
    items: [],
  };
}
const HOUSE = makeHouse("house", { id: "mom", x: 3, y: 2, dir: DIR_DOWN, palette: 6, script: "mom" });
const RIVAL_HOUSE = makeHouse("rivalhouse", { id: "rival_sis", x: 5, y: 4, dir: DIR_UP, palette: 2, script: "rivalSis" });

const GYM_W = 15;
const GYM_H = 22;
const gymRows: string[] = [];
for (let y = 0; y < GYM_H; y++) gymRows.push("G".repeat(GYM_W));
gymRows[GYM_H - 1] = "wwwwwwwMwwwwwww";
putRect(gymRows, 6, 1, 3, 2, "c");
putChar(gymRows, 3, 6, "s");
putChar(gymRows, 11, 6, "s");
putChar(gymRows, 3, 12, "s");
putChar(gymRows, 11, 12, "s");
putRect(gymRows, 6, 16, 3, 1, "c");

const GYM: GameMap = {
  id: "gym",
  displayName: "TERRA GYM",
  rows: grid(...(() => {
    border(gymRows, "w");
    return gymRows;
  })()),
  warps: [{ x: 7, y: GYM_H - 1, to: "town", tx: 20, ty: 11 }],
  npcs: [
    { id: "keeper_ansel", x: 4, y: 9, dir: DIR_RIGHT, palette: 5, script: "battleAnsel" },
    { id: "keeper_petra", x: 10, y: 15, dir: DIR_LEFT, palette: 2, script: "battlePetra" },
    { id: "leader_bramble", x: 7, y: 3, dir: DIR_DOWN, palette: 4, script: "battleBramble" },
  ],
  items: [],
};

export const MAPS: Record<string, GameMap> = { town: TOWN, route1: ROUTE1, gate: GATE, lab: LAB, pokecenter: POKECENTER, mart: MART, house: HOUSE, rivalhouse: RIVAL_HOUSE, gym: GYM };

export function isSolidTile(ch: string): boolean {
  return SOLID_CHARS.has(ch);
}

export function tileAt(map: GameMap, x: number, y: number): string | null {
  if (y < 0 || y >= map.rows.length) return null;
  const row = map.rows[y]!;
  if (x < 0 || x >= row.length) return null;
  return row[x]!;
}

export function warpAt(map: GameMap, x: number, y: number): Warp | null {
  return map.warps.find((w) => w.x === x && w.y === y) ?? null;
}

export function rollEncounter(table: EncounterEntry[], rng: { next(): number }): EncounterEntry | null {
  let roll = rng.next() * table.reduce((sum, e) => sum + e.weight, 0);
  for (const entry of table) {
    roll -= entry.weight;
    if (roll < 0) return entry;
  }
  return null;
}

export function mapMusicKey(mapId: string): string {
  if (mapId === "gym") return "gym";
  if (mapId === "route1" || mapId === "gate") return "route";
  return "town";
}
