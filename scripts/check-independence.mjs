#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const PKG_DIRS = [
  "core",
  "physics",
  "renderer-webgpu",
  "renderer-canvas2d",
  "storage",
  "gen",
  "ai",
  "editor",
  "teengine",
];
const EDGES = new Map([
  ["core", new Set()],
  ["physics", new Set(["@teengine/core"])],
  ["renderer-webgpu", new Set(["@teengine/core"])],
  ["renderer-canvas2d", new Set(["@teengine/core"])],
  ["storage", new Set(["@teengine/core"])],
  ["gen", new Set()],
  ["ai", new Set(["@teengine/core"])],
  ["editor", new Set(["@teengine/core"])],
  [
    "teengine",
    new Set([
      "@teengine/core",
      "@teengine/physics",
      "@teengine/renderer-webgpu",
      "@teengine/renderer-canvas2d",
    ]),
  ],
]);

const IMPORTS_RE = /from\s+["']([^"']+)["']/g;
let failed = false;

function listFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else if (name.endsWith(".ts")) out.push(full);
  }
  return out;
}

for (const dir of PKG_DIRS) {
  const src = join(ROOT, "packages", dir, "src");
  const allowed = EDGES.get(dir);
  for (const file of listFiles(src)) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(IMPORTS_RE)) {
      const spec = match[1];
      if (!spec.startsWith("@teengine/")) continue;
      if (spec === `@teengine/${dir}`) {
        console.error(`✗ ${file} imports its own package name`);
        failed = true;
        continue;
      }
      if (!allowed.has(spec)) {
        console.error(`✗ ${file} imports ${spec} (not in DAG)`);
        failed = true;
      }
    }
  }
}

if (failed) process.exit(1);
console.log("independence ok");
