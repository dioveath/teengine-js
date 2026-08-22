import type { Graphics, SpriteFrame } from "teengine";
import { spriteFrame } from "teengine";
import { DIR_DOWN, DIR_LEFT, DIR_RIGHT, DIR_UP } from "./maps.js";

const T = 16;

const TILE_PAINTERS: Record<string, TilePainter> = {
  ".": grassBase,
  ",": tallGrass,
  "-": path,
  f: flowers,
  "~": water,
  T: tree,
  "=": fence,
  S: sign,
  "#": wall,
  D: door,
  r: roof(0xd9534f, 0xa93b38),
  b: roof(0x3fbfbf, 0x2d9191),
  g: roof(0x5cb85c, 0x449444),
  p: roof(0xe07bb5, 0xb25587),
  m: roof(0xf0ad4e, 0xc98a34),
  x: roof(0x9a8f80, 0x77695c),
  "_": woodFloor,
  G: gymFloor,
  w: panelWall,
  c: counter,
  B: bookshelf,
  t: table,
  P: pcScreen,
  s: statue,
  v: voidTile,
  M: mat,
  E: healMachine,
};

type TilePainter = (px: PixelPlot) => void;
type PixelPlot = (x: number, y: number, color: number) => void;

function hash2(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >> 13), 1274126177);
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

function fill(px: PixelPlot, color: number): void {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) px(x, y, color);
}

const GRASS = 0x7ec850;
const GRASS_DARK = 0x63aa41;
const PATH = 0xe0c88a;
const WOOD = 0x7a5230;

function grassBase(px: PixelPlot): void {
  fill(px, GRASS);
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      if (hash2(x, y) < 0.18) px(x, y, GRASS_DARK);
    }
  }
}

function tallGrass(px: PixelPlot): void {
  grassBase(px);
  for (let x = 1; x < T; x += 3) {
    const h = 6 + Math.floor(hash2(x, 0) * 5);
    for (let y = T - h; y < T; y++) {
      px(x + (y % 2), y, 0x2e7d32);
      px(x + 1 - (y % 2), y, 0x3e8948);
    }
  }
}

function path(px: PixelPlot): void {
  fill(px, PATH);
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      if (hash2(x + 31, y) < 0.15) px(x, y, 0xc9ab6e);
    }
  }
}

function flowers(px: PixelPlot): void {
  grassBase(px);
  const blossoms: Array<[number, number, number]> = [
    [3, 4, 0xe86a92], [10, 3, 0xf7d354], [6, 10, 0xe86a92], [12, 11, 0xffffff],
  ];
  for (const [bx, by, color] of blossoms) {
    px(bx, by - 1, color);
    px(bx - 1, by, color);
    px(bx + 1, by, color);
    px(bx, by + 1, color);
    px(bx, by, 0xffe9a8);
  }
}

function water(px: PixelPlot): void {
  fill(px, 0x4a90d9);
  for (let y = 2; y < T; y += 5) {
    for (let x = 0; x < T; x++) {
      if ((x + y * 3) % 8 < 4) px(x, y, 0x74b3ea);
    }
  }
}

function tree(px: PixelPlot): void {
  grassBase(px);
  for (let y = 9; y < 14; y++) for (let x = 6; x < 10; x++) px(x, y, WOOD);
  for (let y = 2; y < 11; y++) {
    const half = y < 5 ? 3 : y < 8 ? 4 : 5;
    for (let x = 8 - half; x <= 7 + half; x++) {
      px(x, y, hash2(x, y) < 0.25 ? 0x256b28 : 0x2e7d32);
    }
  }
}

function fence(px: PixelPlot): void {
  grassBase(px);
  for (let y = 5; y < 8; y++) for (let x = 0; x < T; x++) px(x, y, 0xa9744f);
  for (let y = 10; y < 13; y++) for (let x = 0; x < T; x++) px(x, y, 0xa9744f);
  for (let x = 2; x < T; x += 5) {
    for (let y = 3; y < 15; y++) px(x, y, 0x8a5a33);
  }
}

function sign(px: PixelPlot): void {
  grassBase(px);
  for (let y = 8; y < 15; y++) for (let x = 7; x < 9; x++) px(x, y, WOOD);
  for (let y = 2; y < 9; y++) for (let x = 2; x < 14; x++) px(x, y, 0xcaa06a);
  for (let x = 2; x < 14; x++) px(x, 2, 0x8a5a33);
  for (let y = 4; y < 8; y += 2) for (let x = 4; x < 12; x++) px(x, y, 0x7a5230);
}

function wall(px: PixelPlot): void {
  fill(px, 0xe8d8b0);
  for (let y = 0; y < T; y++) {
    const row = Math.floor(y / 4);
    for (let x = 0; x < T; x++) {
      if (y % 4 === 3 || (x + row * 4) % 8 === 0) px(x, y, 0xd4bc90);
    }
  }
}

function door(px: PixelPlot): void {
  fill(px, 0xe8d8b0);
  for (let y = 1; y < T; y++) {
    for (let x = 3; x < 13; x++) {
      const edge = y === 1 || x === 3 || x === 12 || y > 12;
      px(x, y, edge ? 0x5e3d22 : y % 5 === 4 ? 0x7a4a28 : 0x8a5a33);
    }
  }
  px(11, 8, 0xf7d354);
  px(11, 9, 0xf7d354);
}

function roof(base: number, dark: number): TilePainter {
  return (px) => {
    fill(px, base);
    for (let y = 0; y < T; y += 4) {
      for (let x = 0; x < T; x++) px(x, y + 3, dark);
      const off = (y / 4) % 2 === 0 ? 0 : 4;
      for (let x = off; x < T; x += 8) {
        for (let dy = 0; dy < 3; dy++) px(x, y + dy, dark);
      }
    }
  };
}

function woodFloor(px: PixelPlot): void {
  fill(px, 0xcaa06a);
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      if (y % 4 === 3 || (x + Math.floor(y / 4) * 5) % 8 === 0) px(x, y, 0xb98d55);
    }
  }
}

function gymFloor(px: PixelPlot): void {
  fill(px, 0xb8b2a6);
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      if (y % 8 === 7 || x % 8 === 7) px(x, y, 0x948e82);
    }
  }
}

function panelWall(px: PixelPlot): void {
  fill(px, 0x8a6d4f);
  for (let x = 0; x < T; x += 4) {
    for (let y = 0; y < T; y++) px(x, y, 0x75583c);
  }
  for (let x = 0; x < T; x++) px(x, 0, 0x5e4630);
}

function counter(px: PixelPlot): void {
  fill(px, 0xe8e0d0);
  for (let y = 10; y < T; y++) for (let x = 0; x < T; x++) px(x, y, 0xa9744f);
  for (let x = 0; x < T; x++) px(x, 10, 0x8a5a33);
}

function bookshelf(px: PixelPlot): void {
  fill(px, WOOD);
  const books = [0xd9534f, 0x4a90d9, 0x5cb85c, 0xf0ad4e, 0xb56ad9];
  for (const shelfY of [2, 7, 12]) {
    let x = 1;
    let bi = Math.floor(shelfY / 5);
    while (x < 15) {
      const w = 2 + Math.floor(hash2(x, shelfY) * 2);
      for (let dx = 0; dx < w && x + dx < 15; dx++) {
        for (let dy = 0; dy < 3; dy++) px(x + dx, shelfY + dy, books[bi % books.length]!);
      }
      bi++;
      x += w + 1;
    }
    for (let sx = 1; sx < 15; sx++) px(sx, shelfY + 3, 0x5e3d22);
  }
}

function table(px: PixelPlot): void {
  fill(px, 0xe8e0d0);
  for (let y = 6; y < T; y++) {
    for (let x = 1; x < 15; x++) px(x, y, y === 6 ? 0x8a5a33 : 0xa9744f);
  }
}

function pcScreen(px: PixelPlot): void {
  fill(px, 0x5a6572);
  for (let y = 3; y < 10; y++) {
    for (let x = 3; x < 13; x++) {
      px(x, y, y > 4 && y < 9 && x > 4 && x < 12 ? 0x74e0e8 : 0x2e3440);
    }
  }
  for (let y = 12; y < 15; y++) for (let x = 4; x < 12; x++) px(x, y, 0x434c56);
}

function statue(px: PixelPlot): void {
  grassBase(px);
  for (let y = 4; y < 15; y++) {
    for (let x = 5; x < 11; x++) px(x, y, y % 3 === 2 ? 0x77706a : 0x948e82);
  }
  for (let y = 1; y < 4; y++) for (let x = 6; x < 10; x++) px(x, y, 0xb8b2a6);
  px(7, 2, 0x74e0e8);
  px(8, 2, 0x74e0e8);
}

function voidTile(px: PixelPlot): void {
  fill(px, 0x14101d);
}

function mat(px: PixelPlot): void {
  fill(px, PATH);
  for (let y = 3; y < 13; y++) {
    for (let x = 2; x < 14; x++) px(x, y, y % 2 === 0 ? 0xb25587 : 0x8a5a33);
  }
  for (let x = 2; x < 14; x++) {
    px(x, 3, 0x5e4630);
    px(x, 12, 0x5e4630);
  }
}

function healMachine(px: PixelPlot): void {
  fill(px, 0xd8dce2);
  for (let y = 4; y < 11; y++) for (let x = 5; x < 11; x++) px(x, y, 0x2e3440);
  px(6, 5, 0xe86a92);
  px(8, 5, 0xf7d354);
  px(9, 5, 0x74e0e8);
  for (let y = 7; y < 10; y++) for (let x = 6; x < 10; x++) px(x, y, 0x74b3ea);
  for (let x = 3; x < 13; x++) px(x, 2, 0xaeb6c2);
}

function pokeBallIcon(px: PixelPlot): void {
  for (let y = 4; y < 12; y++) {
    for (let x = 4; x < 12; x++) {
      const dx = x - 7.5;
      const dy = y - 7.5;
      const d2 = dx * dx + dy * dy;
      if (d2 <= 12) px(x, y, y < 7 ? 0xe86a92 : y === 7 ? 0x2e3440 : 0xf5f5f5);
      else if (d2 <= 14) px(x, y, 0x2e3440);
    }
  }
}

export type CharacterPalette = { skin: number; hair: number; shirt: number; pants: number };

export const CHAR_PALETTES: CharacterPalette[] = [
  { skin: 0xf0c8a0, hair: 0x3a2a1a, shirt: 0xd93b3b, pants: 0x2e3440 },
  { skin: 0xf0c8a0, hair: 0xcfcfcf, shirt: 0xf5f5f5, pants: 0x586069 },
  { skin: 0xf0c8a0, hair: 0x7a4a22, shirt: 0x3fa34d, pants: 0x5e4630 },
  { skin: 0xe8b088, hair: 0x222222, shirt: 0x4a90d9, pants: 0x2e3440 },
  { skin: 0xf0c8a0, hair: 0x888888, shirt: 0x77706a, pants: 0x4a4038 },
  { skin: 0xf0c8a0, hair: 0x1a1a2e, shirt: 0x7b5cd6, pants: 0x23233c },
  { skin: 0xe8b088, hair: 0xd9903f, shirt: 0xe07bb5, pants: 0xffffff },
];

function drawCharacter(
  px: PixelPlot,
  dir: 0 | 1 | 2 | 3,
  frame: number,
  pal: CharacterPalette,
): void {
  const bob = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  for (let x = 5; x < 11; x++) px(x, 3 + bob, pal.hair);
  for (let y = 4 + bob; y < 8 + bob; y++) {
    for (let x = 5; x < 11; x++) px(x, y, pal.skin);
  }
  if (dir !== DIR_UP) {
    const eyeY = 6 + bob;
    if (dir === DIR_DOWN) {
      px(6, eyeY, 0x1a1a1a);
      px(9, eyeY, 0x1a1a1a);
    } else if (dir === DIR_LEFT) {
      px(5, eyeY, 0x1a1a1a);
    } else if (dir === DIR_RIGHT) {
      px(10, eyeY, 0x1a1a1a);
    }
  }
  for (let y = 8 + bob; y < 13 + bob; y++) {
    for (let x = 4; x < 12; x++) px(x, y, pal.shirt);
  }
  px(3, 9 + bob, pal.skin);
  px(3, 10 + bob, pal.skin);
  px(12, 9 + bob, pal.skin);
  px(12, 10 + bob, pal.skin);
  const legShift = frame === 1 ? -1 : frame === 2 ? 1 : 0;
  for (let y = 13; y < 16; y++) {
    px(6 + legShift, y + Math.max(0, bob), pal.pants);
    px(7 + legShift, y + Math.max(0, bob), pal.pants);
    px(9 - legShift, y + Math.min(0, -bob), pal.pants);
    px(10 - legShift, y + Math.min(0, -bob), pal.pants);
  }
}

export type WorldSprites = {
  tiles: Record<string, SpriteFrame>;
  chars: Array<Array<[SpriteFrame, SpriteFrame, SpriteFrame]>>;
  ball: SpriteFrame;
};

export function buildWorldSprites(graphics: Graphics): WorldSprites {
  const tileKeys = [...Object.keys(TILE_PAINTERS), "__ball"];
  const tileStride = tileKeys.length * T;
  const tilePixels = new Uint8ClampedArray(tileStride * T * 4);
  tileKeys.forEach((key, i) => {
    const ox = i * T;
    const plot: PixelPlot = (lx, ly, color) => {
      setPixel(tilePixels, tileStride, ox + lx, ly, color);
    };
    if (key === "__ball") pokeBallIcon(plot);
    else TILE_PAINTERS[key]!(plot);
  });
  const tileTexture = graphics.uploadRgba(new Uint8Array(tilePixels), tileStride, T);
  const tiles: Record<string, SpriteFrame> = {};
  tileKeys.forEach((key, i) => {
    tiles[key] = spriteFrame(tileTexture, tileStride, T, i * T, 0, T, T);
  });

  const FRAMES_PER_ROW = 12;
  const charStride = FRAMES_PER_ROW * T;
  const charHeight = CHAR_PALETTES.length * T;
  const charPixels = new Uint8ClampedArray(charStride * charHeight * 4);
  CHAR_PALETTES.forEach((pal, pi) => {
    for (let dir = 0; dir < 4; dir++) {
      for (let frame = 0; frame < 3; frame++) {
        const col = (dir as 0 | 1 | 2 | 3) * 3 + frame;
        drawCharacter(
          (lx, ly, color) => setPixel(charPixels, charStride, col * T + lx, pi * T + ly, color),
          dir as 0 | 1 | 2 | 3,
          frame,
          pal,
        );
      }
    }
  });
  const charTexture = graphics.uploadRgba(new Uint8Array(charPixels), charStride, charHeight);
  const chars: Array<Array<[SpriteFrame, SpriteFrame, SpriteFrame]>> = CHAR_PALETTES.map((_, pi) =>
    [0, 1, 2, 3].map((dir) => [
      spriteFrame(charTexture, charStride, charHeight, (dir * 3 + 0) * T, pi * T, T, T),
      spriteFrame(charTexture, charStride, charHeight, (dir * 3 + 1) * T, pi * T, T, T),
      spriteFrame(charTexture, charStride, charHeight, (dir * 3 + 2) * T, pi * T, T, T),
    ] as [SpriteFrame, SpriteFrame, SpriteFrame]),
  );

  return {
    tiles,
    chars,
    ball: tiles["__ball"]!,
  };
}

function setPixel(pixels: Uint8ClampedArray, stride: number, x: number, y: number, color: number): void {
  const i = (y * stride + x) * 4;
  if (i < 0 || i + 3 >= pixels.length) return;
  pixels[i] = (color >> 16) & 0xff;
  pixels[i + 1] = (color >> 8) & 0xff;
  pixels[i + 2] = color & 0xff;
  pixels[i + 3] = 0xff;
}
