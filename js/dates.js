// Pure date helpers and Norwegian date formatting. No DOM access.

export const MONTHS = ["januar", "februar", "mars", "april", "mai", "juni", "juli",
  "august", "september", "oktober", "november", "desember"];
export const MONTHS_SHORT = ["jan", "feb", "mar", "apr", "mai", "jun", "jul",
  "aug", "sep", "okt", "nov", "des"];
// Indexed by Date#getDay(), so Sunday first.
export const WEEKDAYS = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];
export const WEEKDAYS_SHORT = ["sø", "ma", "ti", "on", "to", "fr", "lø"];
export const WEEKDAY_LETTERS = ["S", "M", "T", "O", "T", "F", "L"];
// Monday-first column order used by every grid in the app.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const MS_PER_DAY = 86400000;

export const date = (y, m, d) => new Date(y, m, d);

export function addDays(dt, n) {
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + n);
}

export function startOfDay(dt = new Date()) {
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

/** Whole calendar days from a to b. Rounding absorbs DST shifts. */
export const daysBetween = (a, b) => Math.round((b - a) / MS_PER_DAY);

export const sameDay = (a, b) => a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const isWeekend = dt => dt.getDay() === 0 || dt.getDay() === 6;

export const isLeapYear = y => new Date(y, 1, 29).getMonth() === 1;

export const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

/** "2026-09-27" — also the value format of <input type="date">. */
export function isoDate(dt) {
  return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" +
    String(dt.getDate()).padStart(2, "0");
}

/** Parses "YYYY-MM-DD" as a local date, or returns null. */
export function parseIsoDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  const dt = date(y, mo, d);
  return dt.getMonth() === mo && dt.getDate() === d ? dt : null;
}

export function isoWeek(dt) {
  const t = startOfDay(dt);
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  const w1 = date(t.getFullYear(), 0, 4);
  return 1 + Math.round((daysBetween(w1, t) - 3 + ((w1.getDay() + 6) % 7)) / 7);
}

export const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

export const plural = (n, one, many) => n === 1 ? one : many;

/** "25. desember" */
export const formatDayMonth = dt => dt.getDate() + ". " + MONTHS[dt.getMonth()];

/** "fredag 25. desember 2026" */
export const formatFull = dt => WEEKDAYS[dt.getDay()] + " " + formatDayMonth(dt) + " " + dt.getFullYear();

/** "fr 25.12." */
export const formatCompact = dt =>
  WEEKDAYS_SHORT[dt.getDay()] + " " + dt.getDate() + "." + (dt.getMonth() + 1) + ".";

/** "1.–4. januar", "28. mars – 6. april", "30. desember 2026 – 3. januar 2027" */
export function formatRange(from, to) {
  if (from.getFullYear() !== to.getFullYear()) {
    return formatDayMonth(from) + " " + from.getFullYear() + " – " + formatDayMonth(to) + " " + to.getFullYear();
  }
  if (from.getMonth() === to.getMonth()) {
    return from.getDate() + ".–" + formatDayMonth(to);
  }
  return formatDayMonth(from) + " – " + formatDayMonth(to);
}

/** "i dag", "i morgen", "om 12 dager", "i går", "for 3 dager siden" */
export function relativeDays(n) {
  if (n === 0) return "i dag";
  if (n === 1) return "i morgen";
  if (n === -1) return "i går";
  return n > 0 ? "om " + n + " dager" : "for " + -n + " dager siden";
}
