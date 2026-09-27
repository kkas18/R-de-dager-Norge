// Row builders and the day-detail sheet, shared by several views.

import { h } from "../dom.js";
import { openSheet } from "../ui.js";
import {
  MONTHS_SHORT, WEEKDAYS, capitalize, daysBetween, formatDayMonth, isoWeek, relativeDays, startOfDay, plural, MONTHS
} from "../dates.js";
import { holidayOn, isRedDay, upcomingHolidays, KIND_LABEL } from "../holidays.js";
import { occursOn, describe, nextOccurrence, initials, hasDate } from "../people.js";
import { loadPeople } from "../store.js";

export const today = () => startOfDay();

/** "om 12 dager", with "i dag"/"i morgen"; past dates read "passert". */
export function tail(dt, from = today()) {
  const n = daysBetween(from, dt);
  return n < 0 ? "passert" : relativeDays(n);
}

function dateBlock(dt) {
  return h("span", { class: "row-date", "aria-hidden": "true" },
    h("span", { class: "d" }, dt.getDate()), h("span", { class: "m" }, MONTHS_SHORT[dt.getMonth()]));
}

/** A row for a named day. Opens the day sheet. */
export function holidayRow(hd, from = today()) {
  return h("button", {
    class: "row" + (hd.red ? "" : " is-grey"), type: "button",
    onclick: () => showDay(hd.d)
  },
  dateBlock(hd.d),
  h("span", { class: "row-main" },
    h("span", { class: "row-title" }, hd.name),
    h("span", { class: "row-sub" }, capitalize(WEEKDAYS[hd.d.getDay()]) + (hd.red ? "" : " · ikke rød dag"))),
  h("span", { class: "row-tail" }, tail(hd.d, from)));
}

/** A row for a person's occurrence. `onOpen` opens the person sheet. */
export function personRow(p, onOpen, { from = today(), leading = "date", selected = null } = {}) {
  const dated = hasDate(p);
  const occ = dated ? nextOccurrence(p, from) : null;
  let lead;
  if (leading === "check") {
    lead = h("span", { class: "check", "aria-hidden": "true" }, h("span", null, "✓"));
  } else if (leading === "date" && occ) {
    lead = dateBlock(occ);
  } else {
    lead = h("span", { class: "avatar" + (dated ? " has-date" : ""), "aria-hidden": "true" }, initials(p.name));
  }
  const sub = occ ? describe(p, occ, { withDate: leading !== "date" }) : (p.tel || "Ingen dato lagt inn");
  return h("button", {
    class: "row" + (selected ? " is-on" : ""), type: "button",
    "aria-pressed": selected === null ? null : String(selected),
    dataset: { id: p.id },
    onclick: () => onOpen(p)
  },
  lead,
  h("span", { class: "row-main" }, h("span", { class: "row-title" }, p.name), h("span", { class: "row-sub" }, sub)),
  h("span", { class: "row-tail" }, occ ? tail(occ, from) : "sett dato"));
}

export function listOrEmpty(rows, emptyText) {
  return h("div", { class: "list" }, rows.length ? rows : h("p", { class: "list-empty" }, emptyText));
}

let openPersonHandler = () => {};
/** The people view registers how a person sheet opens, so the day sheet can link to it. */
export const setOpenPerson = fn => { openPersonHandler = fn; };
export const openPerson = p => openPersonHandler(p);

/** Details for one calendar date. */
export function showDay(dt) {
  const t = today(), hd = holidayOn(dt), gap = daysBetween(t, dt), red = isRedDay(dt);
  const facts = h("p", { class: "facts" },
    h("span", { class: red ? "is-red" : "" }, red ? "Rød dag" : dt.getDay() === 6 ? "Lørdag, ikke rød" : "Virkedag"),
    h("span", null, capitalize(relativeDays(gap))),
    hd ? h("span", null, KIND_LABEL[hd.kind]) : null);

  const body = [facts];
  if (hd) body.push(h("p", null, h("strong", null, hd.name + ". "), hd.note));
  else if (dt.getDay() === 0) body.push(h("p", null, "Vanlig søndag. Alle søndager er røde dager."));
  else if (dt.getDay() === 6) body.push(h("p", null, "Fri for de fleste, men ikke rød dag."));

  const mine = loadPeople().filter(p => occursOn(p, dt));
  if (mine.length) {
    body.push(h("div", { class: "list" }, mine.map(p => h("button", {
      class: "row", type: "button", onclick: () => openPerson(p)
    }, h("span", { class: "avatar has-date", "aria-hidden": "true" }, initials(p.name)),
    h("span", { class: "row-main" },
      h("span", { class: "row-title" }, p.name),
      h("span", { class: "row-sub" }, describe(p, dt)))))));
  }

  const next = upcomingHolidays(new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + 1), { redOnly: true, limit: 1 })[0];
  if (next) {
    const n = daysBetween(dt, next.d);
    body.push(h("p", { class: "small muted" },
      "Neste helligdag: " + next.inline + ", " + formatDayMonth(next.d) + " (" + n + " " + plural(n, "dag", "dager") + " senere)."));
  }

  openSheet({
    eyebrow: capitalize(WEEKDAYS[dt.getDay()]) + " · uke " + isoWeek(dt),
    title: dt.getDate() + ". " + MONTHS[dt.getMonth()] + " " + dt.getFullYear(),
    red, body
  });
}

