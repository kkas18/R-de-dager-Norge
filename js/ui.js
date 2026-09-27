// Shared floating UI: the bottom sheet (a real modal dialog) and the toast.

import { h, mount, $ } from "./dom.js";

/* ── Bottom sheet ─────────────────────────────────────────── */
const sheet = $("#sheet"), scrim = $("#scrim");
const sheetTitle = $("#sheetTitle"), sheetEyebrow = $("#sheetEyebrow"), sheetBody = $("#sheetBody");
const background = () => document.querySelectorAll("[data-app-root]");
let returnFocus = null;
let onCloseFn = null;
// While open, the sheet owns one history entry, so Back closes it. history.back() is
// asynchronous, so we count the pops we caused ourselves and ignore them when they land.
let historyEntry = false;
let ownPops = 0;

function pushEntry() {
  history.pushState({ sheet: true }, "", location.href);
  historyEntry = true;
}

export const sheetIsOpen = () => sheet.classList.contains("is-open");

/**
 * Opens the sheet. Everything behind it becomes inert, so focus and screen
 * readers stay inside, and focus returns to the trigger on close.
 */
export function openSheet({ eyebrow = "", title, red = false, body, onClose = null }) {
  if (!sheetIsOpen()) {
    returnFocus = document.activeElement;
    // If our own Back is still in flight, the entry is re-pushed when it lands.
    if (!ownPops) pushEntry();
  }
  onCloseFn = onClose;
  sheetEyebrow.textContent = eyebrow;
  sheetEyebrow.hidden = !eyebrow;
  sheetTitle.textContent = title;
  sheetTitle.classList.toggle("is-red", red);
  mount(sheetBody, body);
  sheetBody.scrollTop = 0;
  background().forEach(el => { el.inert = true; });
  sheet.classList.add("is-open");
  scrim.classList.add("is-open");
  const first = sheetBody.querySelector("input, select, [data-autofocus]");
  (first || sheetTitle).focus({ preventScroll: true });
}

export function closeSheet({ fromHistory = false } = {}) {
  if (!sheetIsOpen()) return;
  if (historyEntry && !fromHistory) { ownPops++; history.back(); }
  historyEntry = false;
  sheet.classList.remove("is-open");
  scrim.classList.remove("is-open");
  background().forEach(el => { el.inert = false; });
  const fn = onCloseFn;
  onCloseFn = null;
  if (returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
  returnFocus = null;
  if (fn) fn();
}

scrim.addEventListener("click", () => closeSheet());
$("#sheetClose").addEventListener("click", () => closeSheet());
// Android's Back button and the browser back button close the sheet first.
addEventListener("popstate", e => {
  if (ownPops) {
    ownPops--;
    if (sheetIsOpen() && !historyEntry) pushEntry(); // a sheet opened while our Back was pending
    return;
  }
  if (sheetIsOpen()) { closeSheet({ fromHistory: true }); return; }
  // Forward onto an orphaned sheet entry (sheet already closed): step back off it.
  if (e.state && e.state.sheet) { ownPops++; history.back(); }
});
// A reload while a sheet was open leaves its entry behind; drop it.
if (history.state && history.state.sheet) { ownPops++; history.back(); }
document.addEventListener("keydown", e => { if (e.key === "Escape" && sheetIsOpen()) closeSheet(); });

(function dragToClose() {
  const grab = $("#sheetGrab");
  let y0 = null;
  grab.addEventListener("touchstart", e => { y0 = e.touches[0].clientY; sheet.style.transition = "none"; }, { passive: true });
  grab.addEventListener("touchmove", e => {
    if (y0 === null) return;
    sheet.style.transform = "translateY(" + Math.max(0, e.touches[0].clientY - y0) + "px)";
  }, { passive: true });
  grab.addEventListener("touchend", e => {
    if (y0 === null) return;
    const dy = e.changedTouches[0].clientY - y0;
    sheet.style.transition = "";
    sheet.style.transform = "";
    y0 = null;
    if (dy > 90) closeSheet();
  });
})();

/* ── Toast ────────────────────────────────────────────────── */
const toastEl = $("#toast");
let toastTimer = null;
let pinned = null; // a sticky toast (the update offer) comes back after transient ones

/**
 * Shows a message. With `action`, a button is added; `sticky` keeps it until used.
 * A newer toast always replaces the older one and its timer.
 */
export function toast(message, { action = null, sticky = false, duration = 3500 } = {}) {
  clearTimeout(toastTimer);
  if (sticky) pinned = { message, action };
  const children = [h("span", null, message)];
  if (action) {
    children.push(h("button", {
      class: "link", type: "button",
      onclick: () => { if (sticky) pinned = null; hideToast(); action.run(); }
    }, action.label));
  }
  mount(toastEl, children);
  toastEl.classList.toggle("is-raised", !$("#selBar").hidden);
  toastEl.classList.add("is-open");
  if (!sticky) toastTimer = setTimeout(hideToast, action ? Math.max(duration, 5000) : duration);
}

export function hideToast() {
  clearTimeout(toastTimer);
  toastEl.classList.remove("is-open");
  if (pinned) {
    const { message, action } = pinned;
    toastTimer = setTimeout(() => toast(message, { action, sticky: true }), 400);
  }
}

/** A confirmation-free delete: act now, offer undo for five seconds. */
export function undoable(message, undo) {
  toast(message, { action: { label: "Angre", run: undo } });
}
