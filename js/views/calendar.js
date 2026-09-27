// Kalender: a printed month page and a printed year calendar with real numerals.

import { h, mount, $, haptic, reducedMotion } from "../dom.js";
import {
  MONTHS, WEEKDAYS, WEEKDAYS_SHORT, WEEK_ORDER, addDays, capitalize, date, daysInMonth, formatFull, formatDayMonth,
  isoWeek, sameDay
} from "../dates.js";
import { holidaysOf, holidayOn, isRedDay, yearSummary } from "../holidays.js";
import { occursOn, hasDate, occurrenceIn } from "../people.js";
import { loadPeople } from "../store.js";
import { openSheet, closeSheet } from "../ui.js";
import { almanac, holidayItem, holidayRow, personRow, showDay, today, openPerson } from "./shared.js";

let cursor = null;          // first of the shown month
let selected = null;
let mode = "month";
let isActive = () => false;

export function initCalendar({ active }) {
  isActive = active;
  const t = today();
  cursor = date(t.getFullYear(), t.getMonth(), 1);

  $("#calPrev").addEventListener("click", () => shift(-1));
  $("#calNext").addEventListener("click", () => shift(1));
  $("#calTitle").addEventListener("click", jumpSheet);
  $("#yearPrev").addEventListener("click", () => shiftYear(-1));
  $("#yearNext").addEventListener("click", () => shiftYear(1));
  $("#yearAllBtn").addEventListener("click", yearListSheet);
  $("#todayBtn").addEventListener("click", () => {
    const t2 = today();
    const dir = cursor < t2 ? 1 : -1;
    cursor = date(t2.getFullYear(), t2.getMonth(), 1);
    selected = null;
    setMode("month");
    renderCalendar(dir);
  });
  for (const btn of document.querySelectorAll("#calMode button")) {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  }

  // Horizontal swipe on the grid changes month.
  let x0 = null, y0 = null;
  const grid = $("#grid");
  grid.addEventListener("touchstart", e => {
    if (e.touches.length !== 1) return;
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, { passive: true });
  grid.addEventListener("touchmove", e => {
    if (x0 === null) return;
    const dx = e.touches[0].clientX - x0, dy = e.touches[0].clientY - y0;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) { x0 = null; return; }
    if (Math.abs(dx) > 55) { shift(dx < 0 ? 1 : -1); x0 = null; }
  }, { passive: true });
  grid.addEventListener("touchend", () => { x0 = null; });
}

function setMode(m) {
  mode = m;
  for (const btn of document.querySelectorAll("#calMode button")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.mode === m));
  }
  $("#monthView").hidden = m !== "month";
  $("#yearView").hidden = m !== "year";
  renderCalendar();
}

function shift(n) {
  cursor = date(cursor.getFullYear(), cursor.getMonth() + n, 1);
  haptic(5);
  renderCalendar(n);
}

function shiftYear(n) {
  cursor = date(cursor.getFullYear() + n, cursor.getMonth(), 1);
  renderCalendar();
}

function peopleDatesIn(y, m) {
  return loadPeople().filter(hasDate)
    .filter(p => p.arlig || p.year === y)
    .map(p => ({ p, d: occurrenceIn(p, y) }))
    .filter(x => x.d.getMonth() === m);
}

function monthGrid(y, m, t) {
  const first = date(y, m, 1);
  const lead = (first.getDay() + 6) % 7;
  const start = addDays(first, -lead);
  const weeks = Math.ceil((lead + daysInMonth(y, m)) / 7);
  const people = loadPeople();

  const cells = [h("span", { class: "hd hd-wk", "aria-hidden": "true" })];
  for (const wd of WEEK_ORDER) cells.push(h("span", { class: "hd", "aria-hidden": "true" }, WEEKDAYS_SHORT[wd]));

  for (let w = 0; w < weeks; w++) {
    const weekStart = addDays(start, w * 7);
    cells.push(h("span", { class: "wk", "aria-label": "Uke " + isoWeek(weekStart) }, isoWeek(weekStart)));
    for (let i = 0; i < 7; i++) {
      const dt = addDays(start, w * 7 + i);
      const hd = holidayOn(dt);
      const own = people.some(p => occursOn(p, dt));
      const label = capitalize(formatFull(dt)) + (hd ? ", " + hd.name : "") + (own ? ", en av dine dager" : "");
      cells.push(h("button", {
        type: "button",
        class: "cell" + (dt.getMonth() !== m ? " is-out" : "") + (isRedDay(dt) ? " is-red" : "") +
          (sameDay(dt, t) ? " is-today" : "") + (selected && sameDay(selected, dt) ? " is-selected" : ""),
        "aria-label": label,
        "aria-current": sameDay(dt, t) ? "date" : null,
        onclick: () => { selected = dt; renderCalendar(); showDay(dt); }
      },
      h("span", null, dt.getDate()),
      hd ? h("span", { class: "mark" + (hd.red ? "" : " grey"), "aria-hidden": "true" }) : null,
      own ? h("span", { class: "own", "aria-hidden": "true" }) : null));
    }
  }
  return cells;
}

function renderMonth(dir) {
  const y = cursor.getFullYear(), m = cursor.getMonth(), t = today();
  mount($("#calTitle"), capitalize(MONTHS[m]) + " ", h("span", { class: "muted" }, y));
  $("#calTitle").setAttribute("aria-label", capitalize(MONTHS[m]) + " " + y + ". Velg måned og år");
  mount($("#grid"), monthGrid(y, m, t));
  if (dir && !reducedMotion()) {
    $("#grid").animate([{ opacity: .3 }, { opacity: 1 }], { duration: 180, easing: "ease-out" });
  }

  const items = holidaysOf(y).filter(hd => hd.d.getMonth() === m).map(hd => holidayItem(hd, t))
    .concat(peopleDatesIn(y, m).map(({ p, d }) => ({ d, row: personRow(p, openPerson, { from: t, occ: d, meta: WEEKDAYS[d.getDay()] }) })))
    .sort((a, b) => a.d - b.d);
  $("#monthListHead").textContent = "Merkedager i " + MONTHS[m];
  mount($("#monthList"), items.length ? items.map(x => x.row)
    : h("p", { class: "alm-empty" }, "Ingen merkedager i " + MONTHS[m] + ". Bare vanlige søndager."));

  const s = yearSummary(y);
  $("#yearNote").textContent = "I " + y + " faller " + s.onWeekdays + " av " + s.count +
    " helligdager på en hverdag. Påskedag er " + formatDayMonth(s.easter) + ", og de bevegelige dagene følger den.";
  $("#yearAllBtn").textContent = "Alle merkedager i " + y;
}

function renderYear() {
  const y = cursor.getFullYear(), t = today();
  mount($("#yearTitle"), String(y));
  const months = MONTHS.map((name, m) => {
    const first = date(y, m, 1);
    const lead = (first.getDay() + 6) % 7;
    const nums = [];
    for (let i = 0; i < lead; i++) nums.push(h("i"));
    for (let d = 1; d <= daysInMonth(y, m); d++) {
      const dt = date(y, m, d);
      nums.push(h("i", { class: (isRedDay(dt) ? "red" : "") + (sameDay(dt, t) ? " today" : "") }, d));
    }
    const reds = holidaysOf(y).filter(hd => hd.red && hd.d.getMonth() === m).length;
    return h("button", {
      type: "button",
      class: "mini" + (y === t.getFullYear() && m === t.getMonth() ? " is-current" : ""),
      "aria-label": capitalize(name) + " " + y + ", " + reds + (reds === 1 ? " helligdag" : " helligdager"),
      onclick: () => { cursor = date(y, m, 1); setMode("month"); }
    }, h("span", { class: "mini-name" }, capitalize(name)), h("span", { class: "mini-grid", "aria-hidden": "true" }, nums));
  });
  mount($("#yearGrid"), months);
}

export function renderCalendar(dir) {
  if (mode === "month") renderMonth(dir); else renderYear();
  updateTodayButton();
}

export function updateTodayButton() {
  const t = today();
  const away = cursor.getFullYear() !== t.getFullYear() || (mode === "month" && cursor.getMonth() !== t.getMonth());
  $("#todayBtn").hidden = !(away && isActive());
}

function jumpSheet() {
  const y = cursor.getFullYear();
  const years = h("div", { class: "tabs", role: "group", "aria-label": "År" },
    [y - 1, y, y + 1, y + 2].map(yy => h("button", {
      type: "button", "aria-pressed": String(yy === y),
      onclick: () => { cursor = date(yy, cursor.getMonth(), 1); closeSheet(); renderCalendar(); }
    }, yy)));
  const months = h("div", null, MONTHS.map((name, m) => {
    const reds = holidaysOf(y).filter(hd => hd.red && hd.d.getMonth() === m).length;
    return h("button", {
      class: "alm-row", type: "button",
      onclick: () => { cursor = date(y, m, 1); closeSheet(); renderCalendar(); }
    }, h("span", { class: "alm-num", "aria-hidden": "true" }, m + 1),
    h("span", { class: "alm-name" }, capitalize(name)),
    h("span", { class: "alm-meta" }, reds ? reds + (reds === 1 ? " helligdag" : " helligdager") : ""));
  }));
  openSheet({ eyebrow: "Gå til", title: String(y), body: [years, months] });
}

function yearListSheet() {
  const y = cursor.getFullYear(), t = today();
  openSheet({
    eyebrow: "Alle merkedager",
    title: String(y),
    body: h("div", null, almanac(holidaysOf(y).map(hd => ({ d: hd.d, row: holidayRow(hd, t) })), date(y, 0, 1)))
  });
}
