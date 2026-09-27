import { test } from "node:test";
import assert from "node:assert/strict";
import { date } from "../js/dates.js";
import { normalizePerson } from "../js/people.js";
import { peopleCalendar, holidayCalendar, periodCalendar, fold, escapeText } from "../js/ics.js";
import { bridges } from "../js/holidays.js";

const now = new Date(Date.UTC(2026, 8, 27, 12));

test("lines are folded at 75 octets without breaking characters", () => {
  const long = "SUMMARY:" + "ø".repeat(60);
  const folded = fold(long);
  for (const line of folded.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75);
  assert.equal(folded.replace(/\r\n /g, ""), long);
});

test("text escaping", () => {
  assert.equal(escapeText("a;b,c\\d\ne"), "a\\;b\\,c\\\\d\\ne");
});

test("people calendar: alarm at chosen hour and leap-day rule", () => {
  const leap = normalizePerson({ id: "p1", name: "Skudd", day: 29, month: 2, year: 2000, remind: 1 });
  const same = normalizePerson({ id: "p2", name: "Dag", day: 5, month: 5, remind: 0 });
  const ics = peopleCalendar([leap, same], { today: date(2026, 8, 27), alarmHour: 8, now });
  assert.match(ics, /RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1/);
  assert.match(ics, /DTSTART;VALUE=DATE:20270228/);
  assert.match(ics, /TRIGGER:-PT16H/, "one day before at 08:00");
  assert.match(ics, /TRIGGER:PT8H/, "on the day at 08:00");
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
});

test("holiday feed covers every named day", () => {
  const ics = holidayCalendar(2026, 2027, { now });
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 31); // 2027: 17 May and Whit Monday coincide
  assert.match(ics, /UID:2026-12-25@rode-dager\r/);
  assert.match(ics, /SUMMARY:Julaften \(ikke rød dag\)/);
});

test("period calendar", () => {
  const b = bridges(2026, 1)[0];
  const ics = periodCalendar(b, { now });
  assert.match(ics, /SUMMARY:Fri: \d+ dager/);
});

test("a bare carriage return cannot start a new calendar line", () => {
  assert.equal(escapeText("a\rBEGIN:VALARM"), "a\\nBEGIN:VALARM");
});
