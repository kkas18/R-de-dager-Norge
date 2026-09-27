// Planlegg: bridge-day suggestions with a vacation budget, and a workday counter.

import { h, mount, $, haptic, downloadFile } from "../dom.js";
import { WEEKDAY_LETTERS, addDays, formatRange, formatCompact, isoDate, parseIsoDate, plural, capitalize, WEEKDAYS } from "../dates.js";
import { bridges, rangeStats, MAX_RANGE_DAYS } from "../holidays.js";
import { periodCalendar } from "../ics.js";
import { prefs } from "../store.js";
import { toast } from "../ui.js";
import { holidayRow, today } from "./shared.js";

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
  mount($("#budget"),
    h("div", null, h("span", { class: "eyebrow" }, "Planlagt"), h("span", { class: "num" }, used)),
    h("div", null, h("span", { class: "eyebrow" }, "Igjen"), h("span", { class: "num" + (left < 0 ? " is-over" : "") }, left)),
    h("div", null, h("span", { class: "eyebrow" }, "Totalt"), h("span", { class: "num" }, plan.total)));
  mount($("#plannedDays"), used ? [
    h("span", null, "Planlagte feriedager: " + plan.days.map(d => formatCompact(parseIsoDate(d))).join(", ") + ". "),
    h("button", {
      class: "btn btn-quiet", type: "button",
      onclick: () => { savePlan(y, { ...plan, days: [] }); renderBridges(); }
    }, "Nullstill")
  ] : null);
  $("#plannedDays").hidden = !used;
}

function strip(period) {
  return h("div", { class: "strip", "aria-hidden": "true" }, period.days.map(({ d, kind }) =>
    h("span", { class: kind }, WEEKDAY_LETTERS[d.getDay()], h("b", null, d.getDate()))));
}

function describePeriod(p) {
  const take = p.take.map(d => WEEKDAYS[d.getDay()] + " " + formatCompact(d).split(" ")[1]).join(", ");
  return capitalize(formatRange(p.from, p.to)) + ". Ta ut " + take + ".";
}

function renderBridges() {
  const y = Number($("#bYear").value), max = Number($("#bMax").value), t = today();
  const plan = loadPlan(y);
  const list = bridges(y, max, y === t.getFullYear() ? t : null);
  renderBudget(y);

  if (!list.length) {
    mount($("#planList"), h("p", { class: "lede" }, y === t.getFullYear()
      ? "Ingen flere forslag i år med inntil " + max + " " + plural(max, "feriedag", "feriedager") + ". Prøv neste år eller flere feriedager."
      : "Ingen forslag med så få feriedager. Øk antallet."));
    return;
  }

  mount($("#planList"), list.map(p => {
    const planned = isPlanned(plan, p);
    return h("article", { class: "plan" + (planned ? " is-planned" : ""), "aria-label": describePeriod(p) },
      h("div", { class: "plan-top" },
        h("p", { class: "plan-gain" }, h("span", { class: "num" }, p.total), "fridager"),
        h("p", { class: "small muted" }, "for " + p.vacation + " " + plural(p.vacation, "feriedag", "feriedager"))),
      h("p", { class: "plan-range" }, capitalize(formatRange(p.from, p.to))),
      h("p", { class: "small muted" }, "Ta ut " + p.take.map(formatCompact).join(", ")),
      strip(p),
      h("div", { class: "btn-row" },
        h("button", {
          class: "btn " + (planned ? "btn-primary" : "btn-secondary"), type: "button", "aria-pressed": String(planned),
          onclick: () => {
            const cur = loadPlan(y);
            const take = p.take.map(isoDate);
            cur.days = planned ? cur.days.filter(d => !take.includes(d)) : [...new Set(cur.days.concat(take))].sort();
            savePlan(y, cur);
            haptic(8);
            renderBridges();
          }
        }, planned ? "Planlagt" : "Planlegg"),
        h("button", {
          class: "btn btn-secondary", type: "button",
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
  if (!a || !b) { mount(out, h("p", { class: "lede" }, "Velg to datoer.")); return; }
  const s = rangeStats(a, b);
  if (s.error === "reversed") { mount(out, h("p", { class: "lede" }, "Sluttdatoen er før startdatoen.")); return; }
  if (s.error === "tooLong") {
    mount(out, h("p", { class: "lede" }, "Velg en periode på under " + Math.floor(MAX_RANGE_DAYS / 366) + " år."));
    return;
  }
  const line = (label, value, lead = false) =>
    h("p", { class: "stat-line" + (lead ? " lead" : "") }, h("span", { class: "muted" }, label), h("span", { class: "num" }, value));
  mount(out,
    line("Virkedager", s.work, true),
    line("Kalenderdager", s.total),
    line("Lørdager og søndager", s.weekend),
    line("Helligdager på hverdager", s.redWeekday));
  if (s.holidays.length) {
    mount(list, h("section", { class: "section" },
      h("div", { class: "section-head" }, h("h2", null, "Helligdager i perioden")),
      h("div", { class: "list" }, s.holidays.slice(0, 60).map(hd => holidayRow(hd)))));
  }
}

export function renderPlan() {
  if (!$("#planBridges").hidden) renderBridges();
  if (!$("#planRange").hidden) renderRange();
}
