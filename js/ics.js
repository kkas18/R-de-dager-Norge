// iCalendar (RFC 5545) builders: people, the public holiday feed and planned vacations.

import { addDays, formatCompact, isoDate } from "./dates.js";
import { holidaysOf, KIND_LABEL } from "./holidays.js";
import { TYPES, hasDate, nextOccurrence } from "./people.js";

export const escapeText = s => String(s)
  .replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Folds a content line at 75 octets, as the RFC requires, without splitting UTF-8 sequences. */
export function fold(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts = [];
  let cur = "", size = 0, limit = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (size + n > limit) { parts.push(cur); cur = ""; size = 0; limit = 74; }
    cur += ch; size += n;
  }
  parts.push(cur);
  return parts.join("\r\n ");
}

const icsDate = dt => isoDate(dt).replace(/-/g, "");
const stampOf = now => now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function calendar(lines, extra = []) {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Røde dager//NO", "CALSCALE:GREGORIAN", ...extra,
    ...lines, "END:VCALENDAR"].map(fold).join("\r\n") + "\r\n";
}

function allDay(uid, start, end, summary, now, extra = []) {
  return ["BEGIN:VEVENT", "UID:" + uid, "DTSTAMP:" + stampOf(now),
    "DTSTART;VALUE=DATE:" + icsDate(start), "DTEND;VALUE=DATE:" + icsDate(addDays(end, 1)),
    "SUMMARY:" + escapeText(summary), "TRANSP:TRANSPARENT", ...extra, "END:VEVENT"];
}

/**
 * People as yearly (or one-time) all-day events with an alarm at `alarmHour`
 * local time, `remind` days before.
 */
export function peopleCalendar(list, { today, alarmHour = 9, now = new Date() }) {
  const lines = [];
  for (const p of list.filter(hasDate)) {
    const start = nextOccurrence(p, today);
    const title = p.type === "bursdag" ? p.name + " har bursdag" : p.name + " – " + TYPES[p.type].toLowerCase();
    const extra = [];
    if (p.arlig) {
      // Leap-day birthdays: last day of February, so every year gets an event.
      extra.push(p.month === 2 && p.day === 29 ? "RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1" : "RRULE:FREQ=YEARLY");
    }
    const desc = [p.year && p.arlig ? "Fra " + p.year + "." : "", p.tel ? "Telefon: " + p.tel : ""].filter(Boolean).join(" ");
    if (desc) extra.push("DESCRIPTION:" + escapeText(desc));
    if (p.remind >= 0) {
      const hours = p.remind * 24 - alarmHour;
      extra.push("BEGIN:VALARM", "ACTION:DISPLAY",
        "TRIGGER:" + (hours <= 0 ? "PT" + -hours + "H" : "-PT" + hours + "H"),
        "DESCRIPTION:" + escapeText(title), "END:VALARM");
    }
    lines.push(...allDay(p.id + "@rode-dager", start, start, title, now, extra));
  }
  return calendar(lines);
}

/** Every named day for a range of years: the subscribable holiday feed. */
export function holidayCalendar(fromYear, toYear, { now = new Date() } = {}) {
  const lines = [];
  for (let y = fromYear; y <= toYear; y++) {
    for (const h of holidaysOf(y)) {
      const summary = h.red ? h.name : h.name + " (ikke rød dag)";
      lines.push(...allDay(isoDate(h.d) + "@rode-dager", h.d, h.d, summary, now,
        ["DESCRIPTION:" + escapeText(h.note + " " + KIND_LABEL[h.kind] + "."),
          "CATEGORIES:" + (h.red ? "Helligdag" : "Merkedag")]));
    }
  }
  return calendar(lines, ["X-WR-CALNAME:Røde dager i Norge", "X-WR-TIMEZONE:Europe/Oslo",
    "REFRESH-INTERVAL;VALUE=DURATION:P1W", "X-PUBLISHED-TTL:P1W"]);
}

/** One planned vacation period from the bridge planner. */
export function periodCalendar(period, { now = new Date() } = {}) {
  const desc = "Ta ut: " + period.take.map(formatCompact).join(", ") + ". " +
    period.total + " fridager for " + period.vacation + (period.vacation === 1 ? " feriedag." : " feriedager.");
  return calendar(allDay("ferie-" + period.id + "@rode-dager", period.from, period.to,
    "Fri: " + period.total + " dager", now, ["DESCRIPTION:" + escapeText(desc)]));
}
