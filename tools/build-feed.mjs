// Writes helligdager.ics: every named day from FIRST to LAST, for calendar subscription.
// Usage: node tools/build-feed.mjs [--check]   (--check exits 1 if the committed file is stale)

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { holidayCalendar } from "../js/ics.js";

export const FIRST = 2020, LAST = 2045;
// A fixed DTSTAMP keeps the file byte-stable, so --check only flags real changes.
const STAMP = new Date(Date.UTC(2026, 0, 1));

const out = fileURLToPath(new URL("../helligdager.ics", import.meta.url));
const ics = holidayCalendar(FIRST, LAST, { now: STAMP });

if (process.argv.includes("--check")) {
  if (!existsSync(out) || readFileSync(out, "utf8") !== ics) {
    console.error("helligdager.ics is out of date. Run: npm run feed");
    process.exit(1);
  }
  console.log("helligdager.ics is up to date.");
} else {
  writeFileSync(out, ics);
  console.log("Wrote helligdager.ics (" + FIRST + "–" + LAST + ", " + (ics.match(/BEGIN:VEVENT/g) || []).length + " events).");
}
