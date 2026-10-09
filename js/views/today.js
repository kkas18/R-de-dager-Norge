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
import { openPlanner } from "./plan.js";

export const countsSundays = () => prefs.get("sondag", "av") === "pa";

const NUMBER_WORDS = ["null", "én", "to", "tre", "fire", "fem", "seks", "sju", "åtte", "ni", "ti", "elleve", "tolv"];
const inWords = n => NUMBER_WORDS[n] || String(n);
let expanded = false;
let comingKey = "";

function leaf(t) {
  const target = countdownTarget(t, countsSundays());
  const d = target.date, gap = daysBetween(t, d);
  const name = target.holiday ? target.holiday.name : "Søndag";
  const count = gap === 0 ? [h("strong", null, "I dag"), " er en rød dag."]
    : gap === 1 ? [h("strong", null, "I morgen"), "."]
    : ["Om ", h("strong", null, gap + " dager"), "."];
  return [
    h("div", { class: "leaf-caption" },
      h("p", null, countsSundays() ? "Neste røde dag" : "Neste helligdag"),
      h("span", { class: "leaf-year" }, d.getFullYear())),
    h("div", { class: "leaf-main" }, h("div", { class: "leaf-calendar" },
    h("p", { class: "leaf-weekday" }, WEEKDAYS[d.getDay()]),
    h("p", { class: "leaf-date" },
      h("span", { class: "leaf-day" }, d.getDate()),
      h("span", { class: "leaf-month" }, MONTHS[d.getMonth()]))),
    h("div", { class: "leaf-info" },
    h("p", { class: "leaf-name" }, name),
    h("p", { class: "leaf-count" }, count),
    h("button", { class: "link leaf-action", type: "button", onclick: () => showDay(d),
      "aria-label": "Se " + name.toLowerCase() + ", " + formatDayMonth(d) + " " + d.getFullYear() }, "Se dagen", h("span", { "aria-hidden": "true" }, "↗"))))
  ];
}

/** One useful opportunity, with a direct route to the matching planner year. */
function tips(t) {
  const br = nextBridge(t, 1);
  if (br) {
    const d = br.take[0];
    return h("div", { class: "opportunity" },
      h("p", { class: "opportunity-title" }, "Litt ferie. Mer fri."),
      h("p", { class: "tip" }, "Ta fri " + WEEKDAYS[d.getDay()] + " " + formatDayMonth(d) +
        ". Få " + inWords(br.total) + " dager på rad, " + formatRange(br.from, br.to) + "."),
      h("a", { class: "link", href: "#planlegg", onclick: () => openPlanner(d.getFullYear(), 1) },
        "Se feriemuligheten", h("span", { "aria-hidden": "true" }, "→")));
  }
  const lw = nextLongWeekend(t);
  return lw ? h("div", { class: "opportunity" },
    h("p", { class: "opportunity-title" }, "Neste langhelg"),
    h("p", { class: "tip" }, capitalize(lw.holiday.season || lw.holiday.inline) + ", " +
      formatRange(lw.from, lw.to) + ". " + capitalize(inWords(lw.length)) + " dager fri uten å ta ferie.")) : null;
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
  $("#weekLabel").textContent = "Denne uken · " + isoWeek(t);

  // Days that are always Sundays add nothing to a list of what's coming.
  const target = countdownTarget(t, countsSundays());
  const coming = upcomingHolidays(t, { limit: 12, withinDays: 366 })
    .filter(hd => !sameDay(hd.d, target.date) && !hd.sundayOnly)
    .slice(0, 8);
  const key = coming.map(hd => hd.d.getTime()).join(",");
  if (key !== comingKey) { expanded = false; comingKey = key; }
  const shown = expanded ? coming : coming.slice(0, 4);
  $("#comingKicker").textContent = "hellig- og merkedager";
  mount($("#comingList"), almanac(shown.map(hd => holidayItem(hd, t)), t, "Ingen flere merkedager det neste året."));
  mount($("#comingMore"), coming.length > 4 ? h("button", {
    class: "link", type: "button", "aria-expanded": String(expanded), "aria-controls": "comingList",
    onclick: () => {
      expanded = !expanded;
      renderToday();
      $("#comingMore button").focus({ preventScroll: true });
    }
  }, expanded ? "Vis færre" : "Vis alle " + inWords(coming.length), h("span", { "aria-hidden": "true" }, expanded ? "−" : "+")) : null);

  const soon = upcoming(loadPeople(), t, 3);
  $("#peopleSoon").hidden = !soon.length;
  mount($("#peopleSoonList"), almanac(soon.map(({ p, occ }) => personItem(p, openPerson, { from: t, occ })), t));
}

