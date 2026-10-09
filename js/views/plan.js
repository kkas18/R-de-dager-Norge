// Planlegg: bridge-day suggestions set as sentences and a table, a vacation budget, and a workday counter.

import { h, mount, $, haptic, downloadFile } from "../dom.js";
import { WEEKDAY_LETTERS, addDays, formatRange, formatCompact, isoDate, parseIsoDate, plural, capitalize, WEEKDAYS } from "../dates.js";
import { bridges, rangeStats, MAX_RANGE_DAYS } from "../holidays.js";
import { periodCalendar } from "../ics.js";
import { prefs, loadPlan, savePlan } from "../store.js";
import { planBudget, togglePeriod } from "../planning.js";
import { toast } from "../ui.js";
import { almanac, holidayItem, today } from "./shared.js";

const isPlanned = (plan, period) => period.take.every(d => plan.days.includes(isoDate(d)));

export function openPlanner(year, max = 1) {
  $("#bYear").value = year;
  $("#bMax").value = max;
  prefs.set("rd:maxPerPeriod", max);
  for (const btn of document.querySelectorAll("#planMode button")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.mode === "bridges"));
  }
  $("#planBridges").hidden = false;
  $("#planRange").hidden = true;
  syncBudgetInput();
  renderPlan();
}

export function initPlan() {
  const t = today();
  mount($("#bYear"), [0, 1, 2, 3].map(i => h("option", { value: t.getFullYear() + i }, t.getFullYear() + i)));
  $("#bYear").addEventListener("change", () => { syncBudgetInput(); renderPlan(); });
  $("#bMax").value = prefs.get("rd:maxPerPeriod", "4");
  $("#bMax").addEventListener("change", () => { prefs.set("rd:maxPerPeriod", $("#bMax").value); renderPlan(); });
  $("#bTotal").addEventListener("change", () => {
    const y = Number($("#bYear").value), plan = loadPlan(y), n = Number($("#bTotal").value);
    if ($("#bTotal").value !== "" && Number.isInteger(n) && n >= 0 && n <= 99) {
      plan.total = n; savePlan(y, plan); renderBridges();
    } else {
      syncBudgetInput();
      toast("Velg mellom 0 og 99 feriedager.");
    }
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
  const { used, left } = planBudget(plan);
  $("#budgetText").textContent = used === 0
    ? "Ingen planlagt."
    : used + " er planlagt, " + (left >= 0 ? left + " igjen." : -left + " for mange.");
  $("#budget").classList.toggle("is-over", left < 0);
  $("#budgetMeter").max = Math.max(1, plan.total);
  $("#budgetMeter").value = Math.min(used, Math.max(1, plan.total));
  $("#budgetMeter").setAttribute("aria-label", used + " av " + plan.total + " feriedager planlagt");
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
    const { left, added } = planBudget(plan, p.take);
    const enough = planned || added <= left;
    const label = capitalize(formatRange(p.from, p.to)) + ": " + p.total + " dager fri for " + p.vacation + " " +
      plural(p.vacation, "feriedag", "feriedager") + ". Ta fri " + takeText(p);
    return h("article", { class: "plan" + (planned ? " is-planned" : ""), dataset: { period: p.id }, "aria-label": label },
      h("div", { class: "plan-top" },
        h("p", { class: "plan-gain" }, h("span", { class: "num" }, p.total), "dager fri"),
        h("p", { class: "plan-cost" }, "for " + p.vacation + " " + plural(p.vacation, "feriedag", "feriedager"))),
      h("p", { class: "plan-range" }, capitalize(formatRange(p.from, p.to))),
      h("details", { class: "quiet-details plan-details" }, h("summary", null, "Datoer og ferie"),
        h("p", { class: "plan-take" }, "Ta fri " + takeText(p)), strip(p)),
      enough ? null : h("p", { class: "plan-warning", id: "cost-" + p.id },
        "Du trenger " + (added - left) + " flere feriedager i budsjettet."),
      h("div", { class: "link-row" },
        h("button", {
          class: "plan-save" + (planned ? " is-saved" : ""), type: "button", "aria-pressed": String(planned),
          disabled: !enough, "aria-describedby": enough ? null : "cost-" + p.id,
          onclick: () => {
            const cur = loadPlan(y);
            if (!isPlanned(cur, p) && planBudget(cur, p.take).added > planBudget(cur).left) return;
            savePlan(y, togglePeriod(cur, p.take));
            haptic(8);
            renderBridges();
            const button = $('[data-period="' + p.id + '"] .plan-save');
            (button.disabled ? $("#bTotal") : button).focus({ preventScroll: true });
            toast(planned ? "Perioden er fjernet fra ferieplanen." : "Planlagt. Feriedagene vises nå i kalenderen.");
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
