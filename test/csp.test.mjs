import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("every inline script is allowed by the CSP hash", () => {
  const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.ok(inline.length > 0);
  for (const src of inline) {
    const hash = "sha256-" + createHash("sha256").update(src).digest("base64");
    assert.ok(csp.includes("'" + hash + "'"), "CSP is missing " + hash + " (update it after editing the inline script)");
  }
});

test("no inline style attributes, which the CSP blocks", () => {
  assert.doesNotMatch(html, /\sstyle="/);
});
