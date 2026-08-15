import type { AtlasRegion } from "teengine";
import { CELL, createTextureFromRgba, regionAt, setPixel } from "../shared/atlasUtils.js";

export type SpaceInvadersAtlas = {
  player: AtlasRegion;
  invaderA: AtlasRegion;
  invaderAAlt: AtlasRegion;
  invaderB: AtlasRegion;
  invaderBAlt: AtlasRegion;
  bullet: AtlasRegion;
  enemyBullet: AtlasRegion;
  uiHeart: AtlasRegion;
};

const COLS = 4;
const ROWS = 2;
const ATLAS_W = CELL * COLS;

const CANNON = [
  "......##......",
  "......##......",
  ".....####.....",
  "....######....",
  "...##.##.##...",
  "..##########..",
  ".############.",
  "##############",
  "##..######..##",
  "#....####....#",
];

const SQUID = [
  "..#.....#..",
  "...#...#...",
  "..#######..",
  ".##.###.##.",
  "###########",
  "#.#######.#",
  "#.#.....#.#",
  "...##.##...",
];

const SQUID_ALT = [
  "..#.....#..",
  "#..#...#..#",
  "#.#######.#",
  "###.###.###",
  "###########",
  ".#.#######.",
  "..#.....#..",
  ".#.......#.",
];

const CRAB = [
  ".#.....#.",
  "..#...#..",
  ".#######.",
  "##.###.##",
  "#########",
  "#.#####.#",
  "#.#...#.#",
  "..#...#..",
];

const CRAB_ALT = [
  ".#.....#.",
  "#.#...#.#",
  "#.#####.#",
  "##.###.##",
  "#########",
  ".#.#####.",
  "#.#...#.#",
  "#.......#",
];

const HEART = [
  ".##.##.",
  "#######",
  "#######",
  ".#####.",
  "..###..",
  "...#...",
];

function patternWidth(rows: readonly string[]): number {
  let w = 0;
  for (const row of rows) w = Math.max(w, row.length);
  return w;
}

function blit(
  pixels: Uint8ClampedArray,
  ox: number,
  oy: number,
  rows: readonly string[],
  rgb: readonly [number, number, number],
  scale = 1,
): { x: number; y: number; w: number; h: number } {
  for (let y = 0; y < rows.length; y++) {
    const line = rows[y];
    if (line === undefined) continue;
    for (let x = 0; x < line.length; x++) {
      if (line[x] !== "#") continue;
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          setPixel(pixels, ATLAS_W, ox + x * scale + sx, oy + y * scale + sy, rgb[0], rgb[1], rgb[2]);
        }
      }
    }
  }
  return { x: ox, y: oy, w: patternWidth(rows) * scale, h: rows.length * scale };
}

function cellOrigin(col: number, row: number, w: number, h: number): { x: number; y: number } {
  return {
    x: col * CELL + Math.floor((CELL - w) / 2),
    y: row * CELL + Math.floor((CELL - h) / 2),
  };
}

export function createSpaceInvadersAtlas(device: GPUDevice): SpaceInvadersAtlas {
  const pixels = new Uint8ClampedArray(ATLAS_W * CELL * ROWS * 4);
  const cyan: [number, number, number] = [0xb8, 0xff, 0xf0];
  const orange: [number, number, number] = [0xf7, 0x81, 0x66];
  const violet: [number, number, number] = [0xa3, 0x71, 0xf7];
  const gold: [number, number, number] = [0xff, 0xe0, 0x66];
  const rose: [number, number, number] = [0xff, 0x4d, 0x6d];

  const scale = 2;
  const shipBox = cellOrigin(0, 0, patternWidth(CANNON) * scale, CANNON.length * scale);
  const squidBox = cellOrigin(1, 0, patternWidth(SQUID) * scale, SQUID.length * scale);
  const squidAltBox = cellOrigin(2, 0, patternWidth(SQUID_ALT) * scale, SQUID_ALT.length * scale);
  const crabBox = cellOrigin(3, 0, patternWidth(CRAB) * scale, CRAB.length * scale);
  const crabAltBox = cellOrigin(0, 1, patternWidth(CRAB_ALT) * scale, CRAB_ALT.length * scale);
  const heartBox = cellOrigin(3, 1, patternWidth(HEART) * scale, HEART.length * scale);

  const ship = blit(pixels, shipBox.x, shipBox.y, CANNON, cyan, scale);
  const squid = blit(pixels, squidBox.x, squidBox.y, SQUID, orange, scale);
  const squidAlt = blit(pixels, squidAltBox.x, squidAltBox.y, SQUID_ALT, orange, scale);
  const crab = blit(pixels, crabBox.x, crabBox.y, CRAB, violet, scale);
  const crabAlt = blit(pixels, crabAltBox.x, crabAltBox.y, CRAB_ALT, violet, scale);
  const heart = blit(pixels, heartBox.x, heartBox.y, HEART, rose, scale);

  const bullet = { x: 1 * CELL + 14, y: 1 * CELL + 8, w: 4, h: 12 };
  for (let y = 0; y < bullet.h; y++) {
    const w = y < 3 ? 4 : 2;
    const x0 = bullet.x + Math.floor((bullet.w - w) / 2);
    for (let x = 0; x < w; x++) {
      setPixel(pixels, ATLAS_W, x0 + x, bullet.y + y, gold[0], gold[1], gold[2]);
    }
  }

  const enemyBolt = { x: 2 * CELL + 14, y: 1 * CELL + 8, w: 4, h: 12 };
  for (let y = 0; y < enemyBolt.h; y++) {
    const zigzag = (Math.floor(y / 2) % 2) * 2;
    setPixel(pixels, ATLAS_W, enemyBolt.x + zigzag, enemyBolt.y + y, rose[0], rose[1], rose[2]);
    setPixel(pixels, ATLAS_W, enemyBolt.x + zigzag + 1, enemyBolt.y + y, rose[0], rose[1], rose[2]);
  }

  const texture = createTextureFromRgba(device, pixels, ATLAS_W, CELL * ROWS);
  const pack = (box: { x: number; y: number; w: number; h: number }) =>
    regionAt(texture, box.x, box.y, box.w, box.h);

  return {
    player: pack(ship),
    invaderA: pack(squid),
    invaderAAlt: pack(squidAlt),
    invaderB: pack(crab),
    invaderBAlt: pack(crabAlt),
    bullet: pack(bullet),
    enemyBullet: pack(enemyBolt),
    uiHeart: pack(heart),
  };
}
