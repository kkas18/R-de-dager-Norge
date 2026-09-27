// Planlegg: bridge-day suggestions set as sentences and a table, a vacation budget, and a workday counter.

import { h, mount, $, haptic, downloadFile } from "../dom.js";
import { WEEKDAY_LETTERS, addDays, formatRange, formatCompact, isoDate, parseIsoDate, plural, capitalize, WEEKDAYS } from "../dates.js";
import { bridges, rangeStats, MAX_RANGE_DAYS } from "../holidays.js";
import { periodCalendar } from "../ics.js";
import { prefs } from "../store.js";
import { toast } from "../ui.js";
import { almanac, holidayItem, today } from "./shared.js";

const planKey = y => "rd:plan:" + y;
// The plan is the set of vacation days taken, not suggestion ids: suggestions change
// with the per-period limit, days do not, so nothing is hidden or counted twice.
const loadPlan = y => {
  const v = prefs.getJson(planKey(y), {});
  const days = (Array.isArray(v.days) ? v.days : []).filter(d => typeof d === "string" && parseIsoDate(d));
  return { total: Number.isInteger(v.total) ? v.total : 25, days: [...new Set(days)].sort() };
};
const isPlanned = (plan, period) => period.take.every(d => plan.days.includes(isoDate(d)));
const savePlan = (y, plan) => prefs.setJson(planKey(y), plan);

export function initPlan() {
  const t = today();
  mount($("#bYear"), [0, 1, 2, 3].map(i => h("option", { value: t.getFullYear() + i }, t.getFullYear() + i)));
  $("#bYear").addEventListener("change", () => { syncBudgetInput(); renderPlan(); });
  $("#bMax").value = prefs.get("rd:maxPerPeriod", "3");
  $("#bMax").addEventListener("change", () => { prefs.set("rd:maxPerPeriod", $("#bMax").value); renderPlan(); });
  $("#bTotal").addEventListener("input", () => {
    const y = Number($("#bYear").value), plan = loadPlan(y), n = Number($("#bTotal").value);
    if (Number.isInteger(n) && n >= 0 && n <= 99) { plan.total = n; savePlan(y, plan); renderBudget(y); }
  });
  syncBudgetInput();

  for (const btn of document.querySelectorAll("#planMode button")) {
    btn.addEventListener("click", () => {
      for (const b of document.querySelectorAll("#planMode button")) b.setAttribute("aria-pressed", String(b === btn));
      $("#planBridges").hidden = btn.dataset.mode !== "bridges";
      $("#planRange").hidden = btn.dataset.mode !== "range";
      renderPlan();
    });
  }

  $("#rFrom").value = isoDate(t);
  $("#rTo").value = isoDate(addDays(t, 30));
  $("#rFrom").addEventListener("input", renderRange);
  $("#rTo").addEventListener("input", renderRange);
}

function syncBudgetInput() {
  $("#bTotal").value = loadPlan(Number($("#bYear").value)).total;
}

function renderBudget(y) {
  const plan = loadPlan(y);
  const used = plan.days.length;
  const left = plan.total - used;
  $("#budgetText").textContent = used === 0
    ? "Ingen er planlagt ennå."
    : used + " er planlagt, " + (left >= 0 ? left + " igjen." : -left + " for mange.");
  mount($("#plannedDays"), used ? [
    "Planlagt: " + plan.days.map(d => formatCompact(parseIsoDate(d))).join(", ") + ". ",
    h("button", {
      class: "link", type: "button",
      onclick: () => { savePlan(y, { ...plan, days: [] }); renderBridges(); }
    }, "Nullstill")
  ] : null);
  $("#plannedDays").hidden = !used;
}

function strip(period) {
  return h("div", { class: "strip", "aria-hidden": "true" }, period.days.map(({ d, kind }) =>
    h("span", { class: kind }, h("i", null, WEEKDAY_LETTERS[d.getDay()]), h("b", null, d.getDate()))));
}

const takeText = p => p.take.map(d => WEEKDAYS[d.getDay()] + " " + d.getDate() + ".").join(", ");

function renderBridges() {
  const y = Number($("#bYear").value), max = Number($("#bMax").value), t = today();
  const plan = loadPlan(y);
  const list = bridges(y, max, y === t.getFullYear() ? t : null);
  renderBudget(y);

  if (!list.length) {
    mount($("#planList"), h("p", { class: "alm-empty" }, y === t.getFullYear()
      ? "Ingen flere forslag i år med inntil " + max + " " + plural(max, "feriedag", "feriedager") + ". Prøv neste år."
      : "Ingen forslag med så få feriedager. Velg flere."));
    return;
  }

  mount($("#planList"), list.map(p => {
    const planned = isPlanned(plan, p);
    const label = capitalize(formatRange(p.from, p.to)) + ": " + p.total + " dager fri for " + p.vacation + " " +
      plural(p.vacation, "feriedag", "feriedager") + ". Ta fri " + takeText(p);
    return h("article", { class: "plan" + (planned ? " is-planned" : ""), "aria-label": label },
      h("div", { class: "plan-top" },
        h("p", { class: "plan-gain" }, h("span", { class: "num" }, p.total), "dager fri"),
        h("p", { class: "plan-cost" }, "for " + p.vacation + " " + plural(p.vacation, "feriedag", "feriedager"))),
      h("p", { class: "plan-range" }, capitalize(formatRange(p.from, p.to)) + " · ta fri " + takeText(p)),
      strip(p),
      h("div", { class: "link-row" },
        h("button", {
          class: "link" + (planned ? " red" : ""), type: "button", "aria-pressed": String(planned),
          onclick: () => {
            const cur = loadPlan(y);
            const take = p.take.map(isoDate);
            cur.days = planned ? cur.days.filter(d => !take.includes(d)) : [...new Set(cur.days.concat(take))].sort();
            savePlan(y, cur);
            haptic(8);
            renderBridges();
          }
        }, planned ? "Planlagt ✓" : "Planlegg"),
        h("button", {
          class: "link", type: "button",
          onclick: () => {
            downloadFile(periodCalendar(p), "fri-" + isoDate(p.from) + ".ics", "text/calendar");
            toast("Åpne filen for å legge perioden i kalenderen.");
          }
        }, "Til kalender")));
  }));
}

function renderRange() {
  const a = parseIsoDate($("#rFrom").value), b = parseIsoDate($("#rTo").value);
  const out = $("#rangeOut"), list = $("#rangeHolidays");
  mount(list);
  if (!a || !b) { mount(out, h("p", { class: "alm-empty" }, "Velg to datoer.")); return; }
  const s = rangeStats(a, b);
  if (s.error === "reversed") { mount(out, h("p", { class: "alm-empty" }, "Sluttdatoen er før startdatoen.")); return; }
  if (s.error === "tooLong") {
    mount(out, h("p", { class: "alm-empty" }, "Velg en periode på under " + Math.floor(MAX_RANGE_DAYS / 366) + " år."));
    return;
  }
  const line = (label, value) =>
    h("p", { class: "stat-line" }, h("span", null, label), h("span", { class: "num" }, value));
  mount(out,
    h("p", { class: "stat-lead" }, h("span", { class: "num" }, s.work), h("span", null, plural(s.work, "virkedag", "virkedager"))),
    line("Kalenderdager", s.total),
    line("Lørdager og søndager", s.weekend),
    line("Helligdager på hverdager", s.redWeekday));
  if (s.holidays.length) {
    mount(list, h("section", { class: "section" },
      h("div", { class: "section-head" }, h("h3", null, "Helligdager i perioden")),
      almanac(s.holidays.slice(0, 60).map(hd => holidayItem(hd)), a)));
  }
}

export function renderPlan() {
  if (!$("#planBridges").hidden) renderBridges();
  if (!$("#planRange").hidden) renderRange();
}
