import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "../examples/demo/src/pokemon/data");
const API = "https://pokeapi.co/api/v2";
const CONCURRENCY = 64;

const TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
];
const STATS = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"];
const AILMENTS = new Map();
function ailmentId(name) {
  if (!name || name === "none") return -1;
  if (!AILMENTS.has(name)) AILMENTS.set(name, AILMENTS.size);
  return AILMENTS.get(name);
}

async function getJson(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
      if (res.status === 404) return null;
    } catch {}
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  throw new Error(`failed: ${url}`);
}

async function pooled(items, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return out;
}

const speciesList = (await getJson(`${API}/pokemon?limit=1025`)).results;
const moveList = (await getJson(`${API}/move?limit=1000`)).results;

const chainUrls = [...new Set(
  (await pooled(speciesList, async (s) => {
    const sp = await getJson(`${API}/pokemon-species/${nameToId(s.url)}`);
    return sp?.evolution_chain?.url ?? null;
  })).filter(Boolean),
)];

const evoMap = new Map();
await pooled(chainUrls, async (url) => {
  const chain = await getJson(url);
  if (!chain) return;
  walk(chain.chain);
  function walk(node) {
    const from = idFromUrl(node.species.url);
    for (const edge of node.evolves_to) {
      const to = idFromUrl(edge.species.url);
      const detail = edge.evolution_details[0];
      if (detail?.min_level) evoMap.set(from, { to, level: detail.min_level });
      walk(edge);
    }
  }
});

console.log(`evolution edges: ${evoMap.size}, chains fetched: ${chainUrls.length}`);

function nameToId(url) {
  return url.match(/\/(\d+)\/?$/)[1];
}
function idFromUrl(url) {
  return Number(url.match(/\/(\d+)\/?$/)[1]);
}

const species = await pooled(speciesList, async (s, i) => {
  const id = i + 1;
  const p = await getJson(`${API}/pokemon/${id}`);
  const sp = await getJson(`${API}/pokemon-species/${id}`);
  if (!p || !sp) throw new Error(`missing species ${id}`);
  const stats = Object.fromEntries(p.stats.map((x) => [x.stat.name, x.base_stat]));
  const evo = evoMap.get(id) ?? null;
  const row = [
    id,
    p.name,
    p.types.sort((a, b) => a.slot - b.slot).map((t) => TYPES.indexOf(t.type.name)),
    stats.hp, stats.attack, stats.defense, stats["special-attack"], stats["special-defense"], stats.speed,
    sp.capture_rate,
    p.base_experience ?? 0,
    sp.growth_rate?.name ?? "medium",
    evo ? evo.to : 0,
    evo ? evo.level : 0,
  ];
  if ((i + 1) % 200 === 0) console.log(`species ${i + 1}/1025`);
  return row;
});

const moves = [];
await pooled(moveList, async (m, i) => {
  const mv = await getJson(m.url);
  if (!mv) throw new Error(`missing move ${m.url}`);
  if (/-max$|^max-|^g-max/.test(mv.name)) return;
  if (!mv.power && mv.damage_class.name === "physical") return;
  const damaging = typeof mv.power === "number" && mv.power > 0;
  const status =
    mv.damage_class.name === "status" &&
    (mv.meta?.ailment?.name !== "none" || (mv.stat_changes?.length ?? 0) > 0 || (mv.meta?.healing ?? 0) > 0);
  if (!damaging && !status) return;
  if (mv.target === "users-field" || mv.target === "opponents-field") return;
  const sc = (mv.stat_changes ?? []).map((c) => [STATS.indexOf(c.stat.name), c.change]);
  moves.push([
    mv.id,
    mv.name,
    TYPES.indexOf(mv.type.name),
    { physical: 0, special: 1, status: 2 }[mv.damage_class.name],
    mv.power ?? 0,
    mv.accuracy ?? 0,
    mv.pp,
    mv.priority ?? 0,
    ailmentId(damaging ? mv.meta?.ailment?.name : mv.meta?.ailment?.name),
    mv.meta?.ailment_chance ?? 0,
    sc,
    mv.meta?.healing ?? 0,
    mv.meta?.drain ?? 0,
    mv.meta?.flinch_chance ?? 0,
  ]);
  if ((i + 1) % 300 === 0) console.log(`moves ${moves.length}`);
});

moves.sort((a, b) => a[0] - b[0]);

writeFileSync(join(OUT_DIR, "species.json"), JSON.stringify({
  types: TYPES,
  ailments: [...AILMENTS.keys()],
  species,
}));
writeFileSync(join(OUT_DIR, "moves.json"), JSON.stringify({ moves }));
console.log(`done: ${species.length} species, ${moves.length} moves`);
