// "I dag": one confident countdown, this week, what's coming, and your next days.

import { h, mount, $ } from "../dom.js";
import {
  WEEKDAYS, WEEKDAYS_SHORT, addDays, capitalize, daysBetween, formatDayMonth, formatFull, formatRange, sameDay, plural
} from "../dates.js";
import { countdownTarget, isRedDay, upcomingHolidays, nextLongWeekend, nextBridge } from "../holidays.js";
import { upcoming } from "../people.js";
import { loadPeople, prefs } from "../store.js";
import { holidayRow, personRow, listOrEmpty, showDay, openPerson, today } from "./shared.js";

export const countsSundays = () => prefs.get("sondag", "av") === "pa";

function hero(t) {
  const target = countdownTarget(t, countsSundays());
  const gap = daysBetween(t, target.date);
  const name = target.holiday ? target.holiday.name : "Søndag";
  const inline = target.holiday ? target.holiday.inline : "søndag";

  if (gap === 0) {
    return [
      h("p", { class: "eyebrow" }, "I dag"),
      h("h2", { class: "hero-title" }, name),
      h("p", { class: "hero-date" }, capitalize(formatFull(t)) + " · rød dag")
    ];
  }
  return [
    h("p", { class: "eyebrow" }, countsSundays() ? "Neste røde dag" : "Neste helligdag"),
    h("p", { class: "hero-count" },
      h("span", { class: "num" }, gap),
      h("span", { class: "unit" }, plural(gap, "dag", "dager"))),
    h("h2", { class: "hero-title" }, "til " + inline),
    h("p", { class: "hero-date" }, capitalize(formatFull(target.date)))
  ];
}

function week(t) {
  const monday = addDays(t, -((t.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const dt = addDays(monday, i);
    const isToday = sameDay(dt, t);
    return h("button", {
      type: "button",
      class: (isRedDay(dt) ? "is-red " : "") + (isToday ? "is-today" : ""),
      "aria-label": capitalize(formatFull(dt)) + (isToday ? ", i dag" : ""),
      "aria-current": isToday ? "date" : null,
      onclick: () => showDay(dt)
    }, WEEKDAYS_SHORT[dt.getDay()], h("span", { class: "num" }, dt.getDate()));
  });
}

function insights(t) {
  const rows = [];
  const lw = nextLongWeekend(t);
  if (lw) {
    rows.push(["Langhelg", formatRange(lw.from, lw.to) + " · " + lw.length + " fridager uten å ta ferie"]);
  }
  const br = nextBridge(t, 1);
  if (br) {
    const d = br.take[0];
    rows.push(["Inneklemt", "Ta fri " + WEEKDAYS[d.getDay()] + " " + formatDayMonth(d) +
      " og få " + br.total + " dager fri (" + formatRange(br.from, br.to) + ")"]);
  }
  return rows.map(([k, v]) => h("p", { class: "insight" }, h("span", { class: "k" }, k), h("span", null, v)));
}

export function renderToday() {
  const t = today();
  mount($("#hero"), hero(t));
  mount($("#week"), week(t));
  mount($("#insights"), insights(t));

  const target = countdownTarget(t, countsSundays());
  const coming = upcomingHolidays(t, { limit: 12, withinDays: 366 })
    .filter(hd => !sameDay(hd.d, target.date));
  mount($("#comingList"), listOrEmpty(coming.map(hd => holidayRow(hd, t)), "Ingen merkedager det neste året."));

  const soon = upcoming(loadPeople(), t, 3);
  $("#peopleSoon").hidden = !soon.length;
  mount($("#peopleSoonList"), h("div", { class: "list" }, soon.map(({ p }) => personRow(p, openPerson, { from: t }))));
}
