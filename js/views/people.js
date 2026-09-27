// Personer: one list for birthdays, anniversaries and other days, with or without a date.

import { h, mount, $, haptic, downloadFile, slug } from "../dom.js";
import { capitalize, formatFull, isoDate, parseIsoDate, relativeDays, daysBetween } from "../dates.js";
import { isRedDay } from "../holidays.js";
import {
  TYPES, REMINDER_OPTIONS, hasDate, nextOccurrence, isPast, yearsAt, newId, normalizePerson,
  reminderLabel, byNextThenName, mergeImport
} from "../people.js";
import { peopleCalendar } from "../ics.js";
import { loadPeople, savePeople, findPerson, upsertPerson, removePeople, prefs } from "../store.js";
import { openSheet, closeSheet, toast, undoable } from "../ui.js";
import { personRow, setOpenPerson, today } from "./shared.js";

let filter = "alle";
let selecting = false;
const selection = new Set();

export const alarmHour = () => Number(prefs.get("alarmHour", "9"));

export function exportIcs(list, label) {
  const dated = list.filter(hasDate);
  if (!dated.length) { toast("Ingen dager med dato å legge i kalenderen."); return; }
  downloadFile(peopleCalendar(dated, { today: today(), alarmHour: alarmHour() }), slug(label) + ".ics", "text/calendar");
  toast("Åpne filen for å legge " + (dated.length === 1 ? "dagen" : "dagene") + " i kalenderen.");
}

export function initPeople() {
  setOpenPerson(p => personSheet(findPerson(p.id) || p));
  $("#pSearch").addEventListener("input", renderPeople);
  for (const btn of document.querySelectorAll("#pFilter button")) {
    btn.addEventListener("click", () => { filter = btn.dataset.filter; renderPeople(); });
  }
  $("#pSelect").addEventListener("click", () => setSelecting(!selecting));
  $("#pAdd").addEventListener("click", () => personForm(null));
  $("#pWizard").addEventListener("click", wizard);
  $("#selIcs").addEventListener("click", () => {
    exportIcs(loadPeople().filter(p => selection.has(p.id)), "utvalg");
    setSelecting(false);
  });
  $("#selDel").addEventListener("click", () => {
    const n = selection.size;
    const undo = removePeople([...selection]);
    setSelecting(false);
    haptic(10);
    undoable(n === 1 ? "Slettet." : n + " slettet.", undo);
  });

  if ("contacts" in navigator && "ContactsManager" in window) {
    $("#pContacts").hidden = false;
    $("#pContacts").addEventListener("click", importContacts);
  }
}

export function leavePeople() { if (selecting) setSelecting(false); }

function setSelecting(on) {
  selecting = on;
  selection.clear();
  $("#pSelect").textContent = on ? "Ferdig" : "Velg";
  renderPeople();
}

function toggleSelected(id) {
  if (selection.has(id)) selection.delete(id); else selection.add(id);
  renderPeople();
}

function matches(p, q) {
  if (!q) return true;
  return p.name.toLowerCase().includes(q) || p.tel.replace(/\s/g, "").includes(q.replace(/\s/g, ""));
}

export function renderPeople() {
  const t = today();
  const all = loadPeople();
  const q = $("#pSearch").value.trim().toLowerCase();
  const undated = all.filter(p => !hasDate(p));
  const counts = { alle: all.length, med: all.length - undated.length, uten: undated.length };
  for (const btn of document.querySelectorAll("#pFilter button")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.filter === filter));
    mount(btn, btn.dataset.label, h("span", { class: "count" }, counts[btn.dataset.filter]));
  }
  $("#pFilter").hidden = !all.length;
  $("#pSearchWrap").hidden = all.length < 6;
  $("#pSelect").hidden = !all.length;
  $("#pWizard").hidden = !undated.length || selecting;
  $("#pWizard").textContent = "Sett dato for " + undated.length + " " + (undated.length === 1 ? "person" : "personer");

  const shown = all.filter(p => matches(p, q) && (filter === "alle" || (filter === "med") === hasDate(p)));
  const groups = [
    ["Kommende", shown.filter(p => hasDate(p) && !isPast(p, t))],
    ["Uten dato", shown.filter(p => !hasDate(p))],
    ["Passert", shown.filter(p => isPast(p, t))]
  ];

  const open = p => selecting ? toggleSelected(p.id) : personSheet(p);
  const sections = groups.filter(([, list]) => list.length).map(([title, list]) =>
    h("section", { class: "section" },
      h("h3", { class: "eyebrow section-label" }, title),
      h("div", { class: "list" }, list.sort(byNextThenName(t)).map(p => {
        const row = personRow(p, open, {
          from: t, leading: selecting ? "check" : (hasDate(p) ? "date" : "avatar"),
          selected: selecting ? selection.has(p.id) : null
        });
        addLongPress(row, p.id);
        return row;
      }))));

  let empty = null;
  if (!all.length) empty = h("p", { class: "lede" }, "Legg inn bursdager og merkedager du vil huske.");
  else if (!shown.length) empty = h("p", { class: "lede" }, "Ingen treff.");
  mount($("#pList"), empty, sections);

  $("#selBar").hidden = !(selecting && selection.size);
  const datedSel = all.filter(p => selection.has(p.id) && hasDate(p)).length;
  $("#selIcs").textContent = "Til kalender" + (datedSel ? " (" + datedSel + ")" : "");
  $("#selIcs").disabled = !datedSel;
  $("#selDel").textContent = "Slett (" + selection.size + ")";
}

function addLongPress(row, id) {
  let timer = null;
  let fired = false;
  row.addEventListener("touchstart", () => {
    fired = false;
    timer = setTimeout(() => {
      fired = true;
      haptic(12);
      if (!selecting) { setSelecting(true); selection.add(id); renderPeople(); } else toggleSelected(id);
    }, 450);
  }, { passive: true });
  const cancel = () => clearTimeout(timer);
  row.addEventListener("touchmove", cancel, { passive: true });
  row.addEventListener("touchend", cancel);
  row.addEventListener("touchcancel", cancel);
  // A long press must not also count as a tap.
  row.addEventListener("click", e => { if (fired) { e.stopImmediatePropagation(); fired = false; } }, true);
}

/* ── Person sheet ─────────────────────────────────────────── */
function personSheet(p) {
  const t = today();
  const body = [];
  if (hasDate(p)) {
    const occ = nextOccurrence(p, t);
    const gap = daysBetween(t, occ);
    const n = yearsAt(p, occ);
    body.push(h("p", { class: "facts" },
      h("span", { class: "is-red" }, capitalize(relativeDays(gap))),
      h("span", null, p.arlig ? "Hvert år" : "Én gang"),
      reminderLabel(p.remind) ? h("span", null, capitalize(reminderLabel(p.remind))) : null));
    body.push(h("p", null, capitalize(formatFull(occ)) + "." +
      (n !== null ? (p.type === "bursdag" ? " Fyller " + n + " år." : " " + n + " år.") : "") +
      (isRedDay(occ) ? " Faller på en rød dag." : "")));
  } else {
    body.push(h("p", { class: "muted" }, "Ingen dato ennå. Sett en, så dukker dagen opp i kalenderen og på forsiden."));
  }
  if (p.tel) {
    const nr = p.tel.replace(/[^0-9+#*]/g, "");
    body.push(h("div", { class: "btn-row" },
      h("a", { class: "btn btn-secondary", href: "tel:" + nr }, "Ring"),
      h("a", { class: "btn btn-secondary", href: "sms:" + nr }, "Send melding")));
  }
  body.push(h("div", { class: "btn-row" },
    hasDate(p) ? h("button", { class: "btn btn-secondary", type: "button", onclick: () => exportIcs([p], p.name) }, "Legg i kalender") : null,
    h("button", { class: "btn btn-primary", type: "button", "data-autofocus": true, onclick: () => personForm(p) },
      hasDate(p) ? "Endre" : "Sett dato")));
  body.push(h("button", {
    class: "btn btn-danger btn-block", type: "button",
    onclick: () => {
      const undo = removePeople([p.id]);
      closeSheet();
      haptic(10);
      undoable(p.name + " er slettet.", undo);
    }
  }, "Slett"));
  openSheet({ eyebrow: TYPES[p.type], title: p.name, body });
}

/* ── Add / edit form ──────────────────────────────────────── */
function field(label, id, control) {
  return h("div", { class: "field" }, h("label", { for: id }, label), control);
}

function select(id, options, value) {
  return h("select", { id }, options.map(([v, l]) => h("option", { value: String(v), selected: String(v) === String(value) || null }, l)));
}

function personForm(existing, prefill = {}) {
  const isNew = !existing;
  const p = existing || normalizePerson({ id: newId(), name: prefill.name || prefill.tel || "Ny", type: "bursdag", remind: 1, ...prefill });
  const dateValue = hasDate(p) ? isoDate(new Date(p.year || 2000, p.month - 1, p.day)) : "";
  const form = h("form", { class: "form", id: "personForm", novalidate: true },
    field("Navn", "fName", h("input", { id: "fName", type: "text", autocomplete: "name", required: true, value: isNew && !prefill.name && !prefill.tel ? "" : p.name })),
    field("Type", "fType", select("fType", Object.entries(TYPES), p.type)),
    field("Dato", "fDate", h("input", { id: "fDate", type: "date", value: dateValue })),
    field("Årstall", "fYear", select("fYear", [["1", "Vis alder og år"], ["0", "Ikke kjent"]], p.year || isNew ? "1" : "0")),
    field("Gjentas", "fRepeat", select("fRepeat", [["1", "Hvert år"], ["0", "Bare én gang"]], p.arlig ? "1" : "0")),
    field("Varsel", "fRemind", select("fRemind", REMINDER_OPTIONS, p.remind)),
    field("Telefon", "fTel", h("input", { id: "fTel", type: "tel", autocomplete: "tel", value: p.tel, placeholder: "Valgfritt" })));

  const save = e => {
    e.preventDefault();
    const name = $("#fName").value.trim();
    if (!name) { toast("Skriv inn et navn."); $("#fName").focus(); return; }
    const dt = parseIsoDate($("#fDate").value);
    const once = $("#fRepeat").value === "0";
    if (once && !dt) { toast("En dag som skjer én gang trenger en dato."); return; }
    upsertPerson(normalizePerson({
      ...p, name,
      type: $("#fType").value,
      day: dt ? dt.getDate() : null, month: dt ? dt.getMonth() + 1 : null,
      // One-time days always keep their year; yearly days keep it only for age.
      year: dt && (once || $("#fYear").value === "1") ? dt.getFullYear() : null,
      arlig: !once,
      remind: Number($("#fRemind").value),
      tel: $("#fTel").value
    }));
    haptic(8);
    closeSheet();
    toast(isNew ? "Lagret." : "Endringen er lagret.");
  };
  form.addEventListener("submit", save);
  openSheet({
    eyebrow: isNew ? "Ny" : "Endre", title: isNew ? "Legg til" : p.name,
    body: [form, h("button", { class: "btn btn-primary btn-block", type: "submit", form: "personForm" }, "Lagre")]
  });
}

/* ── Wizard: set dates for everyone without one ───────────── */
function wizard() {
  const queue = loadPeople().filter(p => !hasDate(p)).map(p => p.id);
  let i = 0, done = 0;
  const step = () => {
    const p = findPerson(queue[i]);
    if (!p) { closeSheet(); toast(done ? done + " " + (done === 1 ? "dato" : "datoer") + " lagt inn." : "Ingen datoer ble satt."); return; }
    const next = () => { i++; step(); };
    const form = h("form", { class: "form", id: "wizForm" },
      field("Bursdag", "wDate", h("input", { id: "wDate", type: "date" })),
      field("Varsel", "wRemind", select("wRemind", REMINDER_OPTIONS, 1)));
    form.addEventListener("submit", e => {
      e.preventDefault();
      const dt = parseIsoDate($("#wDate").value);
      if (!dt) { toast("Velg en dato, eller hopp over."); return; }
      upsertPerson({ ...p, day: dt.getDate(), month: dt.getMonth() + 1, year: dt.getFullYear(), remind: Number($("#wRemind").value) });
      done++;
      haptic(8);
      next();
    });
    openSheet({
      eyebrow: (i + 1) + " av " + queue.length, title: p.name,
      body: [p.tel ? h("p", { class: "muted" }, p.tel) : null, form,
        h("div", { class: "btn-row" },
          h("button", { class: "btn btn-secondary", type: "button", onclick: next }, "Hopp over"),
          h("button", { class: "btn btn-primary", type: "submit", form: "wizForm" }, "Lagre og neste"))]
    });
  };
  step();
}

/* ── Contact Picker (Chrome on Android) ───────────────────── */
async function importContacts() {
  try {
    const available = await navigator.contacts.getProperties();
    const props = ["name", "tel"].filter(x => available.includes(x));
    if (!props.length) { toast("Kontaktlisten gir ingen felt appen kan bruke."); return; }
    const picked = await navigator.contacts.select(props, { multiple: true });
    const clean = (picked || []).map(c => ({
      name: (c.name || []).find(n => n && n.trim()) || "",
      tel: (c.tel || []).find(n => n && n.trim()) || ""
    })).filter(c => c.name || c.tel);
    if (!clean.length) return;
    if (clean.length === 1) {
      personForm(null, { ...clean[0], kilde: "kontakter" });
      toast("Bursdagen følger ikke med fra kontaktlisten. Fyll den inn.");
      return;
    }
    const { list, added } = mergeImport(loadPeople(),
      clean.map(c => ({ ...c, id: newId(), type: "bursdag", kilde: "kontakter", remind: 1 })));
    filter = "uten";
    savePeople(list);
    toast(added ? added + " lagt til. Sett datoene med «Sett dato»." : "Alle lå der fra før.");
  } catch {
    toast("Kontaktlisten kunne ikke åpnes.");
  }
}

