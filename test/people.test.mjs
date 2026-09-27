import { test } from "node:test";
import assert from "node:assert/strict";
import { date, isoDate } from "../js/dates.js";
import {
  normalizePerson, nextOccurrence, occurrenceIn, occursOn, upcoming, yearsAt, describe, mergeImport, isPast
} from "../js/people.js";
import { dueReminders, pruneNotified } from "../js/reminders.js";

const kari = { id: "e1", name: "Kari Nordmann", type: "bursdag", day: 3, month: 10, year: 1988, arlig: true, remind: 1, tel: "+47 912 34 567" };

test("normalize rejects garbage and repairs fields", () => {
  assert.equal(normalizePerson(null), null);
  assert.equal(normalizePerson({ name: "  " }), null);
  const p = normalizePerson({ id: "x\"><img src=x onerror=alert(1)>", name: "A", day: "31", month: "2", remind: "abc", type: "<b>" });
  assert.match(p.id, /^[A-Za-z0-9_-]+$/);
  assert.equal(p.day, null, "31 February is not a date");
  assert.equal(p.remind, 1);
  assert.equal(p.type, "annet");
});

test("one-time days keep their year; without one they become yearly", () => {
  assert.equal(normalizePerson({ name: "Fest", day: 10, month: 6, year: 2026, arlig: false }).arlig, false);
  assert.equal(normalizePerson({ name: "Fest", day: 10, month: 6, year: null, arlig: false }).arlig, true);
});

test("leap-day birthdays fall on 28 February in common years", () => {
  const p = normalizePerson({ name: "Skudd", day: 29, month: 2, year: 2000 });
  assert.equal(isoDate(occurrenceIn(p, 2027)), "2027-02-28");
  assert.equal(isoDate(occurrenceIn(p, 2028)), "2028-02-29");
  assert.ok(occursOn(p, date(2027, 1, 28)));
});

test("next occurrence, age and description", () => {
  const p = normalizePerson(kari);
  const occ = nextOccurrence(p, date(2026, 8, 27));
  assert.equal(isoDate(occ), "2026-10-03");
  assert.equal(yearsAt(p, occ), 38);
  assert.equal(describe(p, occ), "Bursdag 3. oktober · fyller 38");
  assert.equal(isoDate(nextOccurrence(p, date(2026, 9, 4))), "2027-10-03");
});

test("past one-time days are past, and not upcoming", () => {
  const p = normalizePerson({ name: "Konsert", day: 1, month: 3, year: 2026, arlig: false });
  assert.ok(isPast(p, date(2026, 8, 27)));
  assert.equal(upcoming([p], date(2026, 8, 27)).length, 0);
});

test("import keeps contacts without a date and skips duplicates", () => {
  const existing = [normalizePerson(kari)];
  const { list, added } = mergeImport(existing, [
    kari,
    { id: "e2", name: "Ola", tel: "+47 400 00 000", kilde: "kontakter" },
    { name: "" },
    { id: "e1", name: "Annen person med samme id", day: 1, month: 1 }
  ]);
  assert.equal(added, 2);
  assert.equal(list.length, 3);
  assert.ok(list.some(p => p.name === "Ola" && p.day === null));
  assert.equal(new Set(list.map(p => p.id)).size, 3, "ids stay unique");
});

test("reminders are due once and pruned by year", () => {
  const p = normalizePerson(kari);
  const due = dueReminders([p], date(2026, 9, 2), {});
  assert.equal(due.length, 1);
  assert.equal(due[0].key, "e1_2026");
  assert.equal(due[0].body, "Kari Nordmann fyller 38 år i morgen, lørdag 3. oktober.");
  assert.equal(dueReminders([p], date(2026, 9, 2), { e1_2026: 1 }).length, 0);
  assert.equal(dueReminders([p], date(2026, 8, 27), {}).length, 0, "not yet within reminder window");
  assert.deepEqual(pruneNotified({ e1_2020: 1, e1_2026: 1 }, date(2026, 9, 2)), { e1_2026: 1 });
});

test("runReminders records only what was shown and keeps going after a failure", async () => {
  const { runReminders } = await import("../js/reminders.js");
  const a = normalizePerson({ ...kari, id: "a" });
  const b = normalizePerson({ ...kari, id: "b", name: "Bjørn" });
  const shown = [];
  let saved = null;
  const result = await runReminders([a, b], date(2026, 9, 2), {
    load: async () => ({ legacy_2019: 1 }),
    save: async n => { saved = n; },
    show: async r => { if (r.key.startsWith("a_")) throw new Error("denied"); shown.push(r.key); }
  });
  assert.deepEqual(shown, ["b_2026"]);
  assert.equal(saved, result);
  assert.ok(!("a_2026" in saved), "a failed, so it will be retried");
  assert.ok(!("legacy_2019" in saved), "old records are pruned");
});
