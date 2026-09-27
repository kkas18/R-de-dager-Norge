import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const sw = readFileSync(join(root, "sw.js"), "utf8");
const shell = JSON.parse("[" + /const SHELL = \[([\s\S]*?)\];/.exec(sw)[1].replace(/,\s*$/, "") + "]");

const walk = dir => readdirSync(join(root, dir)).flatMap(f => {
  const p = join(dir, f);
  return statSync(join(root, p)).isDirectory() ? walk(p) : [p];
});

test("every precached file exists", () => {
  for (const f of shell.filter(f => f !== "./")) assert.ok(existsSync(join(root, f)), f + " is missing");
});

test("every runtime file is precached, so the app works offline", () => {
  const runtime = [...walk("js"), ...walk("css"), ...walk("fonts").filter(f => f.endsWith(".woff2"))]
    .map(f => relative(".", f).split("\\").join("/"));
  for (const f of runtime) assert.ok(shell.includes(f), f + " is not in the SHELL list in sw.js");
});

test("the manifest's icons are precached", () => {
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
  for (const icon of manifest.icons) assert.ok(shell.includes(icon.src), icon.src);
});
