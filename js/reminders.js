// Which reminders are due, and their text. Shared by the page and the service
// worker so both produce identical notifications and share one "already sent" record.

import { formatDayMonth, relativeDays, daysBetween, WEEKDAYS } from "./dates.js";
import { TYPES, hasDate, nextOccurrence, yearsAt } from "./people.js";

export const NOTIFIED_KEY = "notified";

/** @returns {{key:string,title:string,body:string}[]} reminders not yet in `notified` */
export function dueReminders(list, today, notified = {}) {
  const out = [];
  for (const p of list) {
    if (!hasDate(p) || p.remind < 0) continue;
    const occ = nextOccurrence(p, today);
    const gap = daysBetween(today, occ);
    if (gap < 0 || gap > p.remind) continue;
    const key = p.id + "_" + occ.getFullYear();
    if (notified[key]) continue;
    const when = relativeDays(gap);
    const age = yearsAt(p, occ);
    const what = p.type === "bursdag"
      ? (age !== null ? " fyller " + age + " år " : " har bursdag ") + when
      : " – " + TYPES[p.type].toLowerCase() + " " + when;
    out.push({
      key,
      title: TYPES[p.type] + " " + when,
      body: p.name + what + ", " + WEEKDAYS[occ.getDay()] + " " + formatDayMonth(occ) + "."
    });
  }
  return out;
}

/**
 * Shows every due reminder once. Shared by the page and the service worker so
 * both record what was sent in the same place, the same way.
 *
 * @param {object} io  { load(): Promise<object>, save(obj): Promise, show(reminder): Promise }
 */
export async function runReminders(list, today, io) {
  const notified = pruneNotified(await io.load().catch(() => ({})), today);
  for (const r of dueReminders(list, today, notified)) {
    try {
      await io.show(r);
      notified[r.key] = Date.now();
    } catch (err) {
      console.warn("Varsel feilet", err);
    }
  }
  await io.save(notified);
  return notified;
}

/** Drops records older than a year so the store does not grow forever. */
export function pruneNotified(notified, today) {
  const out = {};
  for (const [k, v] of Object.entries(notified || {})) {
    const y = Number(k.slice(k.lastIndexOf("_") + 1));
    if (y >= today.getFullYear() - 1) out[k] = v;
  }
  return out;
}
