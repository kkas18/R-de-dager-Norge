import { h, mount, $ } from "../dom.js";
import { formatRange, formatDayMonth, daysBetween, isoDate, plural } from "../dates.js";
import { countdownTarget, namedRedDay } from "../holidays.js";
import { featuredPause, planBudget, togglePeriod } from "../planning.js";
import { loadPlan, savePlan, prefs } from "../store.js";
import { openSheet, toast } from "../ui.js";
import { today, showDay } from "./shared.js";
import { openPlanner } from "./plan.js";
import { periodCalendar } from "../ics.js";
import { downloadFile } from "../dom.js";

export function showPause(p) {
  const year = p.take[0].getFullYear();
  const body = () => {
    const plan = loadPlan(year);
    const saved = p.take.every(d => plan.days.includes(isoDate(d)));
    const enough = saved || planBudget(plan, p.take).added <= planBudget(plan).left;
    return [h("p", { class: "pause-detail-date" }, formatRange(p.from, p.to)),
      h("p", { class: "muted small" }, "Bruk " + p.vacation + " " + plural(p.vacation, "feriedag", "feriedager") + ". Helger og helligdager er inkludert."),
      h("ol", { class: "pause-days" }, p.days.map(({ d, kind }) => h("li", null,
        h("span", null, formatDayMonth(d)), h("span", { class: kind === "holiday" ? "red" : "muted" },
          kind === "vacation" ? "Ta ferie" : namedRedDay(d)?.name || "Helg")))),
      enough ? null : h("p", { class: "plan-warning" }, "Du har for få feriedager igjen. Endre budsjettet i Mine planer."),
      h("button", { class: "btn-primary btn-block", type: "button", disabled: !enough, onclick: () => {
        const cur = loadPlan(year);
        if (!saved && planBudget(cur, p.take).added > planBudget(cur).left) return;
        savePlan(year, togglePeriod(cur, p.take));
        mount($("#sheetBody"), body());
        $("#sheetBody .btn-primary").focus();
        toast(saved ? "Planen er fjernet." : "Planen er lagret i kalenderen.");
      } }, saved ? "Fjern planen" : "Lagre planen"),
      h("button", { class: "link btn-block", type: "button", onclick: () =>
        downloadFile(periodCalendar(p), "fri-" + isoDate(p.from) + ".ics", "text/calendar") }, "Til telefonens kalender")];
  };
  openSheet({ eyebrow: "Din pause", title: p.total + " dager fri", body: body(), onClose: () => $(".pause-cta")?.focus({ preventScroll: true }) });
}

export function renderPause() {
  const t = today(), p = featuredPause(t);
  const target = countdownTarget(t, prefs.get("sondag", "av") === "pa");
  const gap = daysBetween(t, target.date);
  const name = target.holiday?.name || "Søndag";
  const season = p && namedRedDay(p.days.find(day => namedRedDay(day.d))?.d || p.from)?.season;
  const crossYear = p && p.from.getFullYear() !== p.to.getFullYear();
  mount($("#pause"),
    h("div", { class: "pause-heading" },
      h("p", { class: "pause-eyebrow" }, crossYear ? "Jul & nyttår" : season || "Din neste pause"),
      h("h2", { class: "pause-title" }, p ? [p.total + " dager", h("br"), "helt fri."] : ["Tid til", h("br"), "en pause." ]),
      h("p", { class: "pause-range" }, p ? formatRange(p.from, p.to) : "Finn fridagene som passer deg")),
    h("img", { class: "pause-landscape", src: "assets/norsk-fjord.png", alt: "Vinterlys over en norsk fjord", width: 1536, height: 1024, "fetchpriority": "high" }),
    p ? h("div", { class: "pause-stats" },
      h("p", null, h("strong", null, p.vacation), h("span", null, "feriedager")),
      h("p", null, h("strong", null, p.total), h("span", null, "fridager"))) : null,
    h("button", { class: "btn-primary pause-cta", type: "button", onclick: () => p ? showPause(p) : location.hash = "planlegg" },
      "Se planen", h("span", { "aria-hidden": "true" }, "→")),
    h("a", { class: "pause-other link", href: "#planlegg", onclick: () => openPlanner(p?.take[0].getFullYear() || t.getFullYear(), 4) },
      "Finn en annen pause", h("span", { "aria-hidden": "true" }, "→")),
    h("button", { class: "pause-holiday", type: "button", onclick: () => showDay(target.date),
      "aria-label": "Neste helligdag: " + name + ", " + formatDayMonth(target.date) },
      h("span", null, h("small", null, "Neste helligdag"), h("strong", null, name)),
      h("span", { class: "pause-until" }, gap === 0 ? "I dag" : gap + " dager", h("span", { "aria-hidden": "true" }, "›"))));
}
