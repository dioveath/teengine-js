import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../examples/demo/public/sprites/mon");
const BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

const CAST = [
  1, 2, 3, 4, 5, 6, 7, 8, 9,
  10, 11, 12, 13, 14, 15, 16, 17, 18,
  19, 20, 21, 22, 25, 26,
  29, 30, 31, 32, 33, 34,
  41, 42,
  74, 75, 76, 95,
  143, 744, 745,
];

mkdirSync(OUT, { recursive: true });

async function download(url: string, file: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(file, buf);
    return true;
  } catch {
    return false;
  }
}

let ok = 0;
let failed = 0;
const jobs: Promise<void>[] = [];
for (const id of CAST) {
  jobs.push(
    (async () => {
      if (await download(`${BASE}/${id}.png`, join(OUT, `${id}.png`))) ok++;
      else failed++;
      if (await download(`${BASE}/back/${id}.png`, join(OUT, `${id}b.png`))) ok++;
      else failed++;
    })(),
  );
}
await Promise.all(jobs);
console.log(`sprites: ${ok} saved, ${failed} failed -> ${OUT}`);
