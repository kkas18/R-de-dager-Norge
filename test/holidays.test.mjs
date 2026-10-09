import { test } from "node:test";
import assert from "node:assert/strict";
import { date, isoDate, isoWeek } from "../js/dates.js";
import {
  easter, holidaysOf, holidayOn, isRedDay, isFreeDay, countdownTarget, rangeStats,
  yearSummary, bridges, nextLongWeekend, nextBridge, upcomingHolidays, MAX_RANGE_DAYS
} from "../js/holidays.js";

test("easter matches published dates", () => {
  const known = { 1818: "1818-03-22", 2024: "2024-03-31", 2025: "2025-04-20", 2026: "2026-04-05",
    2027: "2027-03-28", 2038: "2038-04-25", 2100: "2100-03-28", 2285: "2285-03-22" };
  for (const [y, iso] of Object.entries(known)) assert.equal(isoDate(easter(Number(y))), iso);
});

test("ISO week edge cases", () => {
  assert.equal(isoWeek(date(2026, 0, 1)), 1);
  assert.equal(isoWeek(date(2027, 0, 1)), 53);
  assert.equal(isoWeek(date(2021, 0, 3)), 53);
  assert.equal(isoWeek(date(2024, 11, 30)), 1);
  assert.equal(isoWeek(date(2026, 11, 31)), 53);
});

test("a year has 13 red named days and 3 grey ones", () => {
  const list = holidaysOf(2026);
  assert.equal(list.filter(h => h.red).length, 13);
  assert.deepEqual(list.filter(h => !h.red).map(h => h.name), ["Påskeaften", "Julaften", "Nyttårsaften"]);
});

test("coinciding days merge and keep proper nouns capitalised", () => {
  const h = holidayOn(date(2012, 4, 17));
  assert.equal(h.name, "Syttende mai og Kristi himmelfartsdag");
  assert.equal(h.kind, "both");
  assert.equal(h.sundayOnly, false);
});

test("red and free days", () => {
  assert.ok(isRedDay(date(2026, 8, 27)), "plain Sunday is red");
  assert.ok(!isRedDay(date(2026, 8, 26)), "Saturday is not red");
  assert.ok(isFreeDay(date(2026, 8, 26)), "Saturday is free");
  assert.ok(isRedDay(date(2026, 4, 14)), "Ascension 2026");
  assert.ok(!isRedDay(date(2026, 11, 24)), "Christmas Eve is not red");
});

test("countdown skips plain Sundays unless asked", () => {
  const from = date(2026, 8, 27);
  assert.equal(isoDate(countdownTarget(from, false).date), "2026-12-25");
  assert.equal(isoDate(countdownTarget(from, true).date), "2026-09-27");
});

test("range stats count workdays and refuse absurd ranges", () => {
  const r = rangeStats(date(2026, 11, 21), date(2027, 0, 3));
  assert.equal(r.total, 14);
  assert.equal(r.redWeekday, 2); // 25 Dec (Fri) and 1 Jan (Fri); 26 Dec is a Saturday
  assert.equal(r.work, 8);
  assert.equal(rangeStats(date(2026, 1, 2), date(2026, 1, 1)).error, "reversed");
  assert.equal(rangeStats(date(1000, 0, 1), date(1000 + Math.ceil(MAX_RANGE_DAYS / 365) + 1, 0, 1)).error, "tooLong");
});

test("year summary ignores holidays that are always Sundays", () => {
  const s = yearSummary(2026);
  assert.equal(s.count, 10);
  assert.ok(s.onWeekdays <= s.count);
});

test("bridges suggest Ascension Friday and hide past periods", () => {
  const all = bridges(2026, 1);
  assert.ok(all.some(b => b.take.some(d => isoDate(d) === "2026-05-15")), "Friday after Ascension");
  const later = bridges(2026, 3, date(2026, 8, 27));
  assert.ok(later.length > 0);
  for (const b of later) for (const d of b.take) assert.ok(d >= date(2026, 8, 27), "no past vacation days");
  for (const b of all) {
    assert.equal(b.days.length, b.total);
    assert.equal(b.days.filter(d => d.kind === "vacation").length, b.vacation);
  }
});

test("next long weekend and next bridge", () => {
  const lw = nextLongWeekend(date(2026, 8, 27));
  assert.equal(isoDate(lw.from), "2026-12-25");
  assert.equal(lw.length, 3);
  const nb = nextBridge(date(2026, 8, 27), 1);
  assert.ok(nb && nb.from >= date(2026, 8, 27));
});

test("upcoming holidays span the year boundary", () => {
  const list = upcomingHolidays(date(2026, 11, 20), { redOnly: true, limit: 4 });
  assert.deepEqual(list.map(h => isoDate(h.d)), ["2026-12-25", "2026-12-26", "2027-01-01", "2027-03-21"]);
});

test("a Palm Sunday weekend is not a bridge", () => {
  assert.ok(!bridges(2026, 2).some(b => b.id === "2026-03-26_2026-03-29"));
});

test("long weekends know their season", () => {
  assert.equal(nextLongWeekend(date(2026, 8, 27)).holiday.season, "jula");
  assert.equal(nextLongWeekend(date(2027, 2, 1)).holiday.season, "påsken");
});

test("bridge vacation days belong to the budget year even at New Year", () => {
  for (const y of [2026, 2027, 2028]) {
    for (const period of bridges(y, 8)) {
      assert.ok(period.take.every(d => d.getFullYear() === y));
    }
  }
});
