// Bootstrap: routing between views, tab keyboard support, swipe, service worker.

import { $, reducedMotion } from "./dom.js";
import { WEEKDAYS, MONTHS_SHORT, isoWeek, startOfDay } from "./dates.js";
import { prefs, onPeopleChange, mirrorPeople } from "./store.js";
import { sheetIsOpen, toast } from "./ui.js";
import { renderToday } from "./views/today.js";
import { initCalendar, renderCalendar, updateTodayButton } from "./views/calendar.js";
import { initPeople, renderPeople, leavePeople } from "./views/people.js";
import { initPlan, renderPlan } from "./views/plan.js";
import { initSettings, initInstall, checkReminders, registerPeriodicSync, renderNotificationState } from "./views/settings.js";

const TABS = ["idag", "kalender", "personer", "planlegg"];
const VIEWS = [...TABS, "om"];
// Old tab names from v1 map onto the new structure.
const LEGACY = { na: "idag", kal: "kalender", mine: "personer", kontakter: "personer", beregn: "planlegg" };

let current = null;

const render = {
  idag: renderToday,
  kalender: () => renderCalendar(),
  personer: renderPeople,
  planlegg: renderPlan,
  om: renderNotificationState
};

function viewFromHash() {
  const name = location.hash.slice(1);
  if (VIEWS.includes(name)) return name;
  const saved = prefs.get("tab", "idag");
  return VIEWS.includes(saved) ? saved : LEGACY[saved] || "idag";
}

function show(name, { animate = true, focus = false } = {}) {
  if (name === current) return;
  if (current === "personer") leavePeople();
  current = name;
  if (name !== "om") prefs.set("tab", name);

  for (const btn of document.querySelectorAll(".tabbar [role=tab]")) {
    const on = btn.dataset.view === name;
    btn.setAttribute("aria-selected", String(on));
    btn.tabIndex = on || (name === "om" && btn.dataset.view === "idag") ? 0 : -1;
  }
  for (const view of document.querySelectorAll(".view")) {
    const on = view.id === "v-" + name;
    view.classList.toggle("active", on);
    view.classList.toggle("enter", on && animate && !reducedMotion());
  }
  render[name]();
  updateTodayButton();
  scrollTo({ top: 0 });
  if (focus) $("#v-" + name).focus({ preventScroll: true });
}

function go(name, { push = false, focus = false } = {}) {
  const url = "#" + name;
  if (push) history.pushState(null, "", url); else history.replaceState(null, "", url);
  show(name, { focus });
}

function initTabs() {
  const tabs = [...document.querySelectorAll(".tabbar [role=tab]")];
  tabs.forEach((btn, i) => {
    btn.addEventListener("click", () => go(btn.dataset.view));
    btn.addEventListener("keydown", e => {
      const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      const target = tabs[(next + tabs.length) % tabs.length];
      target.focus();
      go(target.dataset.view);
    });
  });
  let pushedSettings = false;
  $("#openSettings").addEventListener("click", () => {
    if (current === "om") return;
    pushedSettings = true;
    go("om", { push: true, focus: true });
  });
  $("#settingsBack").addEventListener("click", () => {
    if (pushedSettings) { pushedSettings = false; history.back(); } else go(prefs.get("tab", "idag"));
  });
  addEventListener("popstate", () => show(viewFromHash()));
  addEventListener("hashchange", () => show(viewFromHash()));
}

/** Swipe left/right between the four tabs. Edge starts are left to the OS back gesture. */
function initSwipe() {
  const main = $("#main");
  let x0 = null, y0 = null;
  main.addEventListener("touchstart", e => {
    const x = e.touches[0].clientX;
    if (e.touches.length !== 1 || sheetIsOpen() || x < 24 || x > innerWidth - 24 || e.target.closest(".grid, .strip, input, select")) {
      x0 = null; return;
    }
    x0 = x; y0 = e.touches[0].clientY;
  }, { passive: true });
  main.addEventListener("touchmove", e => {
    if (x0 === null) return;
    const dx = e.touches[0].clientX - x0, dy = e.touches[0].clientY - y0;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) { x0 = null; return; }
    if (Math.abs(dx) > 70) {
      const i = TABS.indexOf(current);
      const next = TABS[i + (dx < 0 ? 1 : -1)];
      if (i >= 0 && next) go(next);
      x0 = null;
    }
  }, { passive: true });
  main.addEventListener("touchend", () => { x0 = null; });
}

function renderMasthead() {
  const t = startOfDay();
  $("#brandDate").textContent = WEEKDAYS[t.getDay()] + " " + t.getDate() + ". " + MONTHS_SHORT[t.getMonth()] + ". · uke " + isoWeek(t);
}

function renderAll() {
  renderMasthead();
  renderToday();
  renderCalendar();
  renderPeople();
  renderPlan();
}

/** Registers the worker and offers updates. Never reloads unless the user asked. */
function initServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  let userAccepted = false;
  const offer = worker => toast("En ny versjon er klar.", {
    sticky: true,
    action: { label: "Oppdater", run: () => { userAccepted = true; worker.postMessage("skip"); } }
  });
  navigator.serviceWorker.register("sw.js", { type: "module", updateViaCache: "none" }).then(reg => {
    if (!reg) return;
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const worker = reg.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) offer(worker);
      });
    });
  }).catch(err => console.warn("Service worker ble ikke registrert", err));
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (userAccepted) location.reload(); });
}

(function start() {
  initCalendar({ active: () => current === "kalender" });
  initPeople();
  initPlan();
  initSettings({ onChange: renderToday });
  initInstall();
  initTabs();
  initSwipe();
  onPeopleChange(renderAll);

  renderAll();
  const first = viewFromHash();
  history.replaceState(null, "", "#" + first);
  show(first, { animate: false });

  mirrorPeople();
  initServiceWorker();
  setTimeout(() => { checkReminders(); registerPeriodicSync(); }, 1200);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    renderAll();
    checkReminders();
  });
})();
