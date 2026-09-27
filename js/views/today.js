// I dag: the next red day as a leaf from a tear-off calendar, this week, and what's coming.

import { h, mount, $ } from "../dom.js";
import {
  MONTHS, WEEKDAYS, WEEKDAYS_SHORT, addDays, capitalize, daysBetween, formatDayMonth, formatRange, isoWeek,
  sameDay
} from "../dates.js";
import { countdownTarget, isRedDay, upcomingHolidays, nextLongWeekend, nextBridge, namedRedDay } from "../holidays.js";
import { upcoming } from "../people.js";
import { loadPeople, prefs } from "../store.js";
import { almanac, holidayItem, personItem, showDay, openPerson, today } from "./shared.js";

export const countsSundays = () => prefs.get("sondag", "av") === "pa";

const NUMBER_WORDS = ["null", "én", "to", "tre", "fire", "fem", "seks", "sju", "åtte", "ni", "ti", "elleve", "tolv"];
const inWords = n => NUMBER_WORDS[n] || String(n);

function leaf(t) {
  const target = countdownTarget(t, countsSundays());
  const d = target.date, gap = daysBetween(t, d);
  const name = target.holiday ? target.holiday.name : "Søndag";
  const count = gap === 0 ? [h("strong", null, "I dag"), " er en rød dag."]
    : gap === 1 ? [h("strong", null, "I morgen"), "."]
    : ["Om ", h("strong", null, gap + " dager"), "."];
  return [
    h("p", { class: "leaf-weekday" }, WEEKDAYS[d.getDay()]),
    h("p", { class: "leaf-date" },
      h("span", { class: "leaf-day" }, d.getDate()),
      h("span", { class: "leaf-month" }, MONTHS[d.getMonth()] + (d.getFullYear() !== t.getFullYear() ? " " + d.getFullYear() : ""))),
    h("p", { class: "leaf-name" }, name),
    h("p", { class: "leaf-count" }, count)
  ];
}

/** One or two plain sentences instead of a dashboard. */
function tips(t) {
  const out = [];
  const lw = nextLongWeekend(t);
  if (lw) {
    const where = lw.holiday.season || lw.holiday.inline;
    out.push("Neste langhelg er " + where + ", " + formatRange(lw.from, lw.to) + ": " + inWords(lw.length) + " dager fri uten å ta ferie.");
  }
  const br = nextBridge(t, 1);
  if (br) {
    const d = br.take[0];
    out.push("Tar du fri " + WEEKDAYS[d.getDay()] + " " + formatDayMonth(d) + ", får du " + inWords(br.total) + " dager på rad.");
  }
  return out.map(s => h("p", { class: "tip" }, s));
}

function week(t) {
  const monday = addDays(t, -((t.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const dt = addDays(monday, i);
    const isToday = sameDay(dt, t);
    const named = namedRedDay(dt);
    return h("button", {
      type: "button",
      class: (isRedDay(dt) ? "is-red " : "") + (isToday ? "is-today" : ""),
      "aria-label": capitalize(WEEKDAYS[dt.getDay()]) + " " + formatDayMonth(dt) + (isToday ? ", i dag" : "") + (named ? ", " + named.name : ""),
      "aria-current": isToday ? "date" : null,
      onclick: () => showDay(dt)
    }, h("span", { class: "wd", "aria-hidden": "true" }, WEEKDAYS_SHORT[dt.getDay()]), h("span", { class: "num", "aria-hidden": "true" }, dt.getDate()));
  });
}

export function renderToday() {
  const t = today();
  mount($("#leaf"), leaf(t));
  mount($("#tips"), tips(t));
  mount($("#week"), week(t));
  $("#week").setAttribute("aria-label", "Denne uken, uke " + isoWeek(t));

  // Days that are always Sundays add nothing to a list of what's coming.
  const target = countdownTarget(t, countsSundays());
  const coming = upcomingHolidays(t, { limit: 12, withinDays: 366 })
    .filter(hd => !sameDay(hd.d, target.date) && !hd.sundayOnly)
    .slice(0, 8);
  $("#comingKicker").textContent = coming.length > 1 ? "neste " + inWords(coming.length) : "";
  mount($("#comingList"), almanac(coming.map(hd => holidayItem(hd, t)), t, "Ingen flere merkedager det neste året."));

  const soon = upcoming(loadPeople(), t, 3);
  $("#peopleSoon").hidden = !soon.length;
  mount($("#peopleSoonList"), almanac(soon.map(({ p, occ }) => personItem(p, openPerson, { from: t, occ })), t));
}

