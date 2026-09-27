// Almanac tables and the day sheet, shared by several views.

import { h } from "../dom.js";
import { openSheet } from "../ui.js";
import {
  MONTHS, WEEKDAYS, capitalize, daysBetween, formatDayMonth, isoWeek, relativeDays, startOfDay, plural
} from "../dates.js";
import { holidayOn, isRedDay, upcomingHolidays, KIND_LABEL } from "../holidays.js";
import { occursOn, describe, nextOccurrence, hasDate } from "../people.js";
import { loadPeople } from "../store.js";

export const today = () => startOfDay();

/** "om 12 dager" close by, the weekday further out, "passert" behind us. */
export function when(dt, from = today()) {
  const n = daysBetween(from, dt);
  if (n < 0) return "passert";
  return n <= 45 ? relativeDays(n) : WEEKDAYS[dt.getDay()];
}

/** Groups dated rows under italic month headings, the way an almanac does. */
export function almanac(items, from = today(), emptyText = "") {
  if (!items.length) return emptyText ? h("p", { class: "alm-empty" }, emptyText) : null;
  const out = [];
  let last = "";
  for (const { d, row } of items) {
    const label = d ? MONTHS[d.getMonth()] + (d.getFullYear() !== from.getFullYear() ? " " + d.getFullYear() : "") : "";
    if (d && label !== last) {
      out.push(h("p", { class: "alm-month" }, label));
      last = label;
    }
    out.push(row);
  }
  return out;
}

/** A named day. Red numeral for red days, grey for the others. */
export function holidayRow(hd, from = today()) {
  return h("button", {
    class: "alm-row " + (hd.red ? "is-red" : "is-grey"), type: "button",
    "aria-label": hd.name + ", " + WEEKDAYS[hd.d.getDay()] + " " + formatDayMonth(hd.d) + (hd.red ? "" : ", ikke rød dag") +
      ", " + (daysBetween(from, hd.d) < 0 ? "passert" : relativeDays(daysBetween(from, hd.d))),
    onclick: () => showDay(hd.d)
  },
  h("span", { class: "alm-num", "aria-hidden": "true" }, hd.d.getDate()),
  h("span", { class: "alm-name", "aria-hidden": "true" }, hd.name,
    hd.red ? null : h("span", { class: "alm-detail" }, "ikke rød dag")),
  h("span", { class: "alm-meta", "aria-hidden": "true" }, when(hd.d, from)));
}

export const holidayItem = (hd, from) => ({ d: hd.d, row: holidayRow(hd, from) });

/**
 * A person on a given occurrence (the next one by default). In select mode the meta
 * column becomes a checkbox. The label carries the full date, since the numeral and
 * the month heading are visual only.
 */
export function personRow(p, onOpen, { from = today(), occ, meta, selected = null } = {}) {
  if (occ === undefined) occ = hasDate(p) ? nextOccurrence(p, from) : null;
  const detail = occ ? describe(p, occ, { withDate: false }).toLowerCase() : (p.tel || "ingen dato");
  const metaText = meta ?? (occ ? when(occ, from) : "sett dato");
  const label = p.name + ", " + (occ
    ? describe(p, occ).toLowerCase() + ", " + WEEKDAYS[occ.getDay()] + (meta ? "" : ", " + (daysBetween(from, occ) < 0 ? "passert" : relativeDays(daysBetween(from, occ))))
    : "ingen dato" + (p.tel ? ", " + p.tel : ""));
  return h("button", {
    class: "alm-row" + (selected ? " is-on" : ""), type: "button",
    "aria-label": label,
    "aria-pressed": selected === null ? null : String(selected),
    dataset: { id: p.id },
    onclick: () => onOpen(p)
  },
  h("span", { class: "alm-num", "aria-hidden": "true" }, occ ? occ.getDate() : "–"),
  h("span", { class: "alm-name", "aria-hidden": "true" }, p.name, h("span", { class: "alm-detail" }, detail)),
  selected !== null
    ? h("span", { class: "alm-check", "aria-hidden": "true" }, "✓")
    : h("span", { class: "alm-meta", "aria-hidden": "true" }, metaText));
}

export function personItem(p, onOpen, opts = {}) {
  const occ = opts.occ !== undefined ? opts.occ : hasDate(p) ? nextOccurrence(p, opts.from || today()) : null;
  return { d: occ, row: personRow(p, onOpen, { ...opts, occ }) };
}

let openPersonHandler = () => {};
/** The people view registers how a person sheet opens, so the day sheet can link to it. */
export const setOpenPerson = fn => { openPersonHandler = fn; };
export const openPerson = p => openPersonHandler(p);

/** Details for one calendar date. */
export function showDay(dt) {
  const t = today(), hd = holidayOn(dt), gap = daysBetween(t, dt), red = isRedDay(dt);
  const kind = red ? "rød dag" : dt.getDay() === 6 ? "lørdag, ikke rød" : "virkedag";
  const body = [h("p", { class: "facts" },
    capitalize(relativeDays(gap)) + " · " + kind + (hd ? " · " + KIND_LABEL[hd.kind].toLowerCase() : ""))];

  if (hd) body.push(h("p", null, h("strong", null, hd.name + ". "), hd.note));
  else if (dt.getDay() === 0) body.push(h("p", null, "En vanlig søndag. Alle søndager er røde dager."));
  else if (dt.getDay() === 6) body.push(h("p", null, "Fri for de fleste, men ikke en rød dag."));

  const mine = loadPeople().filter(p => occursOn(p, dt));
  if (mine.length) {
    body.push(h("div", null, mine.map(p => personRow(p, openPerson, { from: t, occ: dt, meta: "åpne" }))));
  }

  const next = upcomingHolidays(new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + 1), { redOnly: true, limit: 1 })[0];
  if (next) {
    const n = daysBetween(dt, next.d);
    body.push(h("p", { class: "small muted" },
      "Neste helligdag er " + next.inline + ", " + formatDayMonth(next.d) + ", " + n + " " + plural(n, "dag", "dager") + " senere."));
  }

  openSheet({
    eyebrow: capitalize(WEEKDAYS[dt.getDay()]) + " · uke " + isoWeek(dt),
    title: formatDayMonth(dt) + " " + dt.getFullYear(),
    red, body
  });
}
