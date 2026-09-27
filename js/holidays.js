// Norwegian public holidays, free-day rules and the bridge-day planner.
// Pure functions only, so they run in the page, the service worker and node:test.

import { date, addDays, daysBetween, isoDate, isWeekend } from "./dates.js";

/** Easter Sunday, Meeus/Jones/Butcher algorithm (Gregorian calendar). */
export function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4,
    f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7,
    m = Math.floor((a + 11 * h + 22 * l) / 451),
    month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return date(y, month - 1, day);
}

export const KIND_LABEL = { fixed: "Fast dato", easter: "Følger påsken", both: "Fast dato og påske" };

// `inline` is the form used mid-sentence. Proper nouns keep their capital.
// `sundayOnly` marks days that always fall on a Sunday, so they add no day off.
function definitions(y) {
  const E = easter(y);
  return [
    { d: date(y, 0, 1), name: "Første nyttårsdag", inline: "første nyttårsdag", red: true, kind: "fixed",
      note: "Første dag i året er helligdag etter lov om helligdager og helligdagsfred." },
    { d: addDays(E, -7), name: "Palmesøndag", inline: "palmesøndag", red: true, kind: "easter", sundayOnly: true,
      note: "Søndagen før påske, og starten på den stille uke." },
    { d: addDays(E, -3), name: "Skjærtorsdag", inline: "skjærtorsdag", red: true, kind: "easter",
      note: "Torsdagen før påskedag. Skjær kommer av norrønt skír, som betyr ren." },
    { d: addDays(E, -2), name: "Langfredag", inline: "langfredag", red: true, kind: "easter",
      note: "Fredagen før påskedag. Har egne regler for salg og arrangementer." },
    { d: addDays(E, -1), name: "Påskeaften", inline: "påskeaften", red: false, kind: "easter",
      note: "Ikke rød dag, men fri eller halv dag i mange avtaler." },
    { d: E, name: "Første påskedag", inline: "første påskedag", red: true, kind: "easter", sundayOnly: true,
      note: "Første søndag etter første fullmåne på eller etter 21. mars." },
    { d: addDays(E, 1), name: "Andre påskedag", inline: "andre påskedag", red: true, kind: "easter",
      note: "Mandagen etter påskedag." },
    { d: date(y, 4, 1), name: "Første mai", inline: "første mai", red: true, kind: "fixed",
      note: "Arbeidernes dag. Offentlig høytidsdag." },
    { d: date(y, 4, 17), name: "Syttende mai", inline: "syttende mai", red: true, kind: "fixed",
      note: "Grunnlovsdagen. Offentlig høytidsdag siden 1947." },
    { d: addDays(E, 39), name: "Kristi himmelfartsdag", inline: "Kristi himmelfartsdag", red: true, kind: "easter",
      note: "Torsdag, 39 dager etter påskedag. Gir ofte en inneklemt fredag." },
    { d: addDays(E, 49), name: "Første pinsedag", inline: "første pinsedag", red: true, kind: "easter", sundayOnly: true,
      note: "Sju uker etter påskedag." },
    { d: addDays(E, 50), name: "Andre pinsedag", inline: "andre pinsedag", red: true, kind: "easter",
      note: "Pinsemandag, alltid en mandag." },
    { d: date(y, 11, 24), name: "Julaften", inline: "julaften", red: false, kind: "fixed",
      note: "Ikke rød dag. Mange tariffavtaler gir fri eller kort dag." },
    { d: date(y, 11, 25), name: "Første juledag", inline: "første juledag", red: true, kind: "fixed",
      note: "Helligdag etter loven." },
    { d: date(y, 11, 26), name: "Andre juledag", inline: "andre juledag", red: true, kind: "fixed",
      note: "Også kalt annen juledag eller stefansdagen." },
    { d: date(y, 11, 31), name: "Nyttårsaften", inline: "nyttårsaften", red: false, kind: "fixed",
      note: "Ikke rød dag. Ofte halv arbeidsdag." }
  ].sort((a, b) => a.d - b.d);
}

const byYear = new Map();
const byKey = new Map();

/** Named days of a year, sorted. Two names on one date merge into one entry. */
export function holidaysOf(y) {
  if (byYear.has(y)) return byYear.get(y);
  const merged = [];
  for (const h of definitions(y)) {
    const prev = merged[merged.length - 1];
    if (prev && prev.d.getTime() === h.d.getTime()) {
      prev.name += " og " + h.inline;
      prev.inline += " og " + h.inline;
      prev.red = prev.red || h.red;
      prev.note += " " + h.note;
      prev.kind = prev.kind === h.kind ? prev.kind : "both";
      prev.sundayOnly = prev.sundayOnly && h.sundayOnly;
    } else {
      merged.push({ ...h, sundayOnly: !!h.sundayOnly });
    }
  }
  const map = new Map(merged.map(h => [isoDate(h.d), h]));
  byYear.set(y, merged);
  byKey.set(y, map);
  return merged;
}

export function holidayOn(dt) {
  const y = dt.getFullYear();
  if (!byKey.has(y)) holidaysOf(y);
  return byKey.get(y).get(isoDate(dt)) || null;
}

/** The named red holiday on this date, or null. */
export function namedRedDay(dt) {
  const h = holidayOn(dt);
  return h && h.red ? h : null;
}

/** Red in the calendar: every Sunday plus the named red days. */
export const isRedDay = dt => dt.getDay() === 0 || !!namedRedDay(dt);

/** A day off for a Monday–Friday worker. */
export const isFreeDay = dt => isWeekend(dt) || !!namedRedDay(dt);

/** Named days from `from` (inclusive) onwards, spanning into the next years as needed. */
export function upcomingHolidays(from, { redOnly = false, limit = 20, withinDays = 400 } = {}) {
  const end = addDays(from, withinDays);
  const out = [];
  for (let y = from.getFullYear(); y <= end.getFullYear() && out.length < limit; y++) {
    for (const h of holidaysOf(y)) {
      if (h.d < from || h.d > end || (redOnly && !h.red)) continue;
      out.push(h);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** The countdown target: next named red day, or the next red day including plain Sundays. */
export function countdownTarget(from, includeSundays) {
  for (let i = 0, dt = from; i < 400; i++, dt = addDays(dt, 1)) {
    const named = namedRedDay(dt);
    if (named || (includeSundays && dt.getDay() === 0)) return { date: dt, holiday: named };
  }
  return null;
}

export const MAX_RANGE_DAYS = 366 * 25;

/** Counts calendar days, workdays and holidays in [a, b]. */
export function rangeStats(a, b) {
  const span = daysBetween(a, b) + 1;
  if (span < 1) return { error: "reversed" };
  if (span > MAX_RANGE_DAYS) return { error: "tooLong" };
  let work = 0, weekend = 0, redWeekday = 0;
  const holidays = [];
  for (let i = 0, dt = a; i < span; i++, dt = addDays(dt, 1)) {
    const wknd = isWeekend(dt), red = namedRedDay(dt);
    if (wknd) weekend++;
    if (red) holidays.push(red);
    if (red && !wknd) redWeekday++;
    if (!wknd && !red) work++;
  }
  return { total: span, work, weekend, redWeekday, holidays };
}

/** Holidays that can actually land on a weekday, and how many did this year. */
export function yearSummary(y) {
  const movable = holidaysOf(y).filter(h => h.red && !h.sundayOnly);
  const onWeekdays = movable.filter(h => !isWeekend(h.d)).length;
  return { count: movable.length, onWeekdays, easter: easter(y) };
}

function dayKind(dt) {
  if (namedRedDay(dt)) return "holiday";
  return isWeekend(dt) ? "weekend" : "work";
}

/**
 * Bridge-day suggestions: the fewest vacation days that join weekends and
 * holidays into the longest continuous time off.
 *
 * @param {number} y           year the vacation days must fall in
 * @param {number} maxVacation vacation days allowed per suggestion
 * @param {Date}  [notBefore]  hide suggestions whose first vacation day is earlier
 */
export function bridges(y, maxVacation, notBefore = null) {
  const start = date(y - 1, 11, 1), end = date(y + 1, 0, 31);
  const days = [];
  for (let dt = start; dt <= end; dt = addDays(dt, 1)) days.push({ d: dt, free: isFreeDay(dt) });
  const prefix = [0];
  days.forEach((x, i) => prefix.push(prefix[i] + (x.free ? 0 : 1)));

  const best = new Map();
  for (let i = 0; i < days.length; i++) {
    if (days[i].free || days[i].d.getFullYear() !== y) continue;
    if (notBefore && days[i].d < notBefore) continue;
    for (let j = i; j < Math.min(days.length, i + 40); j++) {
      if (days[j].free) continue;
      const vacation = prefix[j + 1] - prefix[i];
      if (vacation > maxVacation) break;
      let L = i; while (L > 0 && days[L - 1].free) L--;
      let R = j; while (R < days.length - 1 && days[R + 1].free) R++;
      const total = R - L + 1;
      if (total - vacation < 2 || total < 4) continue;
      let hasHoliday = false;
      // A holiday that is always a Sunday (Palmesøndag) adds no day off, so it cannot justify a bridge.
      for (let n = L; n <= R && !hasHoliday; n++) {
        const hd = namedRedDay(days[n].d);
        hasHoliday = !!hd && !hd.sundayOnly;
      }
      if (!hasHoliday) continue;
      const k = L + "_" + R, cur = best.get(k);
      if (!cur || vacation < cur.vacation) best.set(k, { L, R, i, j, vacation, total });
    }
  }

  const picked = [];
  [...best.values()]
    .sort((a, b) => (b.total - b.vacation) - (a.total - a.vacation) || a.vacation - b.vacation || b.total - a.total)
    .forEach(r => {
      if (picked.length >= 8 || picked.some(p => r.L <= p.R && r.R >= p.L)) return;
      picked.push(r);
    });

  return picked.sort((a, b) => a.L - b.L).map(r => {
    const span = days.slice(r.L, r.R + 1).map(x => ({
      d: x.d, kind: x.free ? dayKind(x.d) : "vacation"
    }));
    return {
      from: days[r.L].d, to: days[r.R].d, vacation: r.vacation, total: r.total,
      take: span.filter(x => x.kind === "vacation").map(x => x.d), days: span,
      id: isoDate(days[r.L].d) + "_" + isoDate(days[r.R].d)
    };
  });
}

/** The next run of 3+ free days that includes a named holiday, without taking vacation. */
export function nextLongWeekend(from, withinDays = 400) {
  const end = addDays(from, withinDays);
  let dt = from;
  while (dt <= end) {
    if (!namedRedDay(dt)) { dt = addDays(dt, 1); continue; }
    let a = dt, b = dt;
    while (isFreeDay(addDays(a, -1))) a = addDays(a, -1);
    while (isFreeDay(addDays(b, 1))) b = addDays(b, 1);
    const length = daysBetween(a, b) + 1;
    if (length >= 3) return { from: a, to: b, length, holiday: namedRedDay(dt) };
    dt = addDays(b, 1);
  }
  return null;
}

/** The earliest upcoming bridge that costs at most `maxVacation` days. */
export function nextBridge(from, maxVacation = 1) {
  for (const y of [from.getFullYear(), from.getFullYear() + 1]) {
    const hit = bridges(y, maxVacation, from)[0];
    if (hit) return hit;
  }
  return null;
}
