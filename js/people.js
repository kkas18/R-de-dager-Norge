// People and their dates (birthdays, anniversaries, other days).
// Pure model code: validation, occurrences and descriptions. Storage lives in store.js.

import { date, daysBetween, daysInMonth, formatDayMonth, isLeapYear } from "./dates.js";

export const TYPES = { bursdag: "Bursdag", jubileum: "Jubileum", annet: "Merkedag" };
export const REMINDER_OPTIONS = [[0, "På dagen"], [1, "1 dag før"], [3, "3 dager før"], [7, "1 uke før"], [-1, "Ingen"]];

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
let idCounter = 0;

export const newId = () => "e" + Date.now().toString(36) + (idCounter++).toString(36);

const int = v => (typeof v === "number" || (typeof v === "string" && v.trim() !== "")) &&
  Number.isInteger(Number(v)) ? Number(v) : null;

/**
 * Turns anything (a stored record, an imported file entry) into a valid person,
 * or null. Every field is checked, so later rendering can trust the shape.
 */
export function normalizePerson(raw) {
  if (!raw || typeof raw !== "object") return null;
  const tel = typeof raw.tel === "string" ? raw.tel.trim().slice(0, 40) : "";
  const name = (typeof raw.name === "string" ? raw.name.trim().slice(0, 120) : "") || tel;
  if (!name) return null;

  let month = int(raw.month), day = int(raw.day), year = int(raw.year);
  const validDate = month >= 1 && month <= 12 && day >= 1 &&
    day <= (month === 2 ? 29 : daysInMonth(2001, month - 1));
  if (!validDate) { month = null; day = null; }
  if (year !== null && (year < 1000 || year > 9999)) year = null;

  // A one-time day needs its year; without one it can only mean "every year".
  let yearly = raw.arlig !== false;
  if (!yearly && (year === null || month === null)) yearly = true;

  let remind = int(raw.remind);
  if (remind === null || remind < -1 || remind > 60) remind = 1;

  return {
    id: typeof raw.id === "string" && ID_PATTERN.test(raw.id) ? raw.id : newId(),
    name,
    type: Object.hasOwn(TYPES, raw.type) ? raw.type : "annet",
    day, month, year,
    arlig: yearly,
    remind,
    tel,
    ...(raw.kilde === "kontakter" ? { kilde: "kontakter" } : {})
  };
}

export const hasDate = p => p.day !== null && p.month !== null;

/** The date in year y. 29 February falls on the 28th in common years. */
export function occurrenceIn(p, y) {
  const day = p.month === 2 && p.day === 29 && !isLeapYear(y) ? 28 : p.day;
  return date(y, p.month - 1, day);
}

/** Next occurrence on or after `from`. A one-time day returns its own date, even when past. */
export function nextOccurrence(p, from) {
  if (!p.arlig) return occurrenceIn(p, p.year);
  const t = occurrenceIn(p, from.getFullYear());
  return t < from ? occurrenceIn(p, from.getFullYear() + 1) : t;
}

export const isPast = (p, from) => hasDate(p) && nextOccurrence(p, from) < from;

/** Age (birthday) or number of years (anniversary) at an occurrence, or null. */
export function yearsAt(p, occ) {
  if (!p.arlig || p.year === null) return null;
  const n = occ.getFullYear() - p.year;
  return n >= 0 ? n : null;
}

export function occursOn(p, dt) {
  if (!hasDate(p)) return false;
  if (!p.arlig && p.year !== dt.getFullYear()) return false;
  const occ = occurrenceIn(p, dt.getFullYear());
  return occ.getMonth() === dt.getMonth() && occ.getDate() === dt.getDate();
}

/** Dated, not-past people ordered by next occurrence. */
export function upcoming(list, from, limit = Infinity) {
  return list.filter(hasDate)
    .map(p => ({ p, occ: nextOccurrence(p, from) }))
    .filter(x => x.occ >= from)
    .sort((a, b) => a.occ - b.occ || a.p.name.localeCompare(b.p.name, "nb"))
    .slice(0, limit);
}

/** "Bursdag 3. oktober · fyller 38", or "Bursdag · fyller 38" without the date. */
export function describe(p, occ, { withDate = true } = {}) {
  const n = yearsAt(p, occ);
  let s = TYPES[p.type];
  if (withDate) s += " " + formatDayMonth(occ) + (p.arlig ? "" : " " + occ.getFullYear());
  else if (!p.arlig) s += " · " + occ.getFullYear();
  if (n !== null) s += p.type === "bursdag" ? " · fyller " + n : " · " + n + " år";
  return s;
}

export function reminderLabel(remind) {
  if (remind < 0) return null;
  return remind === 0 ? "varsel på dagen" : "varsel " + remind + " " + (remind === 1 ? "dag" : "dager") + " før";
}

const signature = p => p.name.toLowerCase() + "|" + p.tel.replace(/\s/g, "") + "|" + p.month + "-" + p.day;

/** Adds valid, not-already-present entries from an import. Contacts without a date are kept. */
export function mergeImport(existing, incoming) {
  const list = existing.slice();
  const ids = new Set(list.map(p => p.id));
  const sigs = new Set(list.map(signature));
  let added = 0, skipped = 0;
  for (const raw of Array.isArray(incoming) ? incoming : []) {
    const p = normalizePerson(raw);
    if (!p) { skipped++; continue; }
    if (sigs.has(signature(p))) continue;
    if (ids.has(p.id)) p.id = newId();
    list.push(p);
    ids.add(p.id);
    sigs.add(signature(p));
    added++;
  }
  return { list, added, skipped };
}

/** Sorting helper for lists that mix dated and undated people. */
export function byNextThenName(from) {
  return (a, b) => {
    const da = hasDate(a) ? daysBetween(from, nextOccurrence(a, from)) : Infinity;
    const db = hasDate(b) ? daysBetween(from, nextOccurrence(b, from)) : Infinity;
    return da - db || a.name.localeCompare(b.name, "nb");
  };
}
