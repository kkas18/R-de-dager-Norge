// Personer: a birthday almanac. Everyone grouped by the month of their next day,
// then those without a date, then one-time days that have passed.

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
import { almanac, personItem, setOpenPerson, today } from "./shared.js";
import { canPickPhone, pickPhone } from "../contacts.js";

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
  $("#pSelect").addEventListener("click", () => setSelecting(!selecting));
  $("#pAdd").addEventListener("click", () => personForm(null));
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
  $("#pSelect").textContent = on ? "Ferdig" : "Velg flere";
  renderPeople();
}

function toggleSelected(id) {
  if (selection.has(id)) selection.delete(id); else selection.add(id);
  renderPeople();
}

const matches = (p, q) => !q || p.name.toLowerCase().includes(q) ||
  p.tel.replace(/\s/g, "").includes(q.replace(/\s/g, ""));

function group(title, action, rows) {
  return h("section", { class: "section" },
    h("div", { class: "section-head" }, h("h3", null, title), action),
    rows);
}

export function renderPeople() {
  const t = today();
  const all = loadPeople();
  const typed = $("#pSearch").value.trim();
  const q = typed.toLowerCase();
  $("#pSearchWrap").hidden = all.length < 6;
  $("#pSelect").hidden = !all.length;

  const shown = all.filter(p => matches(p, q)).sort(byNextThenName(t));
  const open = p => selecting ? toggleSelected(p.id) : personSheet(p);
  const opts = p => ({ from: t, selected: selecting ? selection.has(p.id) : null });
  const withLongPress = item => { addLongPress(item.row, item.row.dataset.id); return item; };

  const upcomingPeople = shown.filter(p => hasDate(p) && !isPast(p, t));
  const undated = shown.filter(p => !hasDate(p));
  const past = shown.filter(p => isPast(p, t));

  let content;
  if (!all.length) {
    content = h("p", { class: "lede" }, "Legg inn bursdager og merkedager du vil huske. De dukker opp i kalenderen og på forsiden.");
  } else if (!shown.length) {
    content = h("p", { class: "alm-empty" }, "Ingen treff på «" + typed + "».");
  } else {
    content = [
      upcomingPeople.length ? almanac(upcomingPeople.map(p => withLongPress(personItem(p, open, opts(p)))), t) : null,
      undated.length ? group("Uten dato",
        selecting ? null : h("button", { class: "link red", type: "button", onclick: wizard }, "Sett datoer"),
        undated.map(p => withLongPress(personItem(p, open, opts(p))).row)) : null,
      past.length ? group("Passert", null, past.map(p => withLongPress(personItem(p, open, opts(p))).row)) : null
    ];
  }
  mount($("#pList"), content);

  $("#selBar").hidden = !(selecting && selection.size);
  const datedSel = all.filter(p => selection.has(p.id) && hasDate(p)).length;
  $("#selIcs").textContent = "Til kalender" + (datedSel ? " (" + datedSel + ")" : "");
  $("#selIcs").disabled = !datedSel;
  $("#selDel").textContent = "Slett " + selection.size;
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
    const n = yearsAt(p, occ);
    const facts = [capitalize(relativeDays(daysBetween(t, occ))), p.arlig ? "hvert år" : "én gang", reminderLabel(p.remind)]
      .filter(Boolean).join(" · ");
    body.push(h("p", { class: "facts" }, facts));
    body.push(h("p", null, capitalize(formatFull(occ)) + "." +
      (n !== null ? (p.type === "bursdag" ? " " + p.name.split(" ")[0] + " fyller " + n + " år." : " Det er " + n + " år.") : "") +
      (isRedDay(occ) ? " Dagen er rød." : "")));
  } else {
    body.push(h("p", { class: "muted" }, "Ingen dato ennå. Sett en, så kommer dagen i kalenderen og på forsiden."));
  }
  const links = [];
  if (p.tel) {
    const nr = p.tel.replace(/[^0-9+#*]/g, "");
    links.push(h("a", { class: "link", href: "tel:" + nr }, "Ring"), h("a", { class: "link", href: "sms:" + nr }, "Send melding"));
  }
  if (hasDate(p)) links.push(h("button", { class: "link", type: "button", onclick: () => exportIcs([p], p.name) }, "Legg i kalender"));
  links.push(h("button", {
    class: "link red", type: "button",
    onclick: () => {
      const undo = removePeople([p.id]);
      closeSheet();
      haptic(10);
      undoable(p.name + " er slettet.", undo);
    }
  }, "Slett"));
  body.push(h("div", { class: "link-row" }, links));
  body.push(h("button", { class: "btn-primary btn-block", type: "button", "data-autofocus": true, onclick: () => personForm(p) },
    hasDate(p) ? "Endre" : "Sett dato"));
  openSheet({ eyebrow: TYPES[p.type], title: p.name, body });
}

/* ── Add / edit form: labels above, checkboxes for yes/no ──── */
const fld = (label, id, control) => h("div", { class: "fld" }, h("label", { for: id }, label), control);
const select = (id, options, value) =>
  h("select", { id }, options.map(([v, l]) => h("option", { value: String(v), selected: String(v) === String(value) || null }, l)));
const check = (id, label, checked) =>
  h("label", { class: "check-row" }, h("input", { type: "checkbox", id, checked: !!checked }), label);

function personForm(existing, prefill = {}) {
  const contactRequest = new AbortController();
  const isNew = !existing;
  const p = existing || normalizePerson({ id: newId(), name: prefill.name || prefill.tel || "Ny", type: "bursdag", remind: 1, ...prefill });
  const dateValue = hasDate(p) ? isoDate(new Date(p.year || 2000, p.month - 1, p.day)) : "";
  const form = h("form", { class: "form", id: "personForm", novalidate: true },
    fld("Navn", "fName", h("input", { id: "fName", type: "text", autocomplete: "name", required: true, value: isNew && !prefill.name && !prefill.tel ? "" : p.name })),
    h("div", { class: "fld-row" },
      fld("Dato", "fDate", h("input", { id: "fDate", type: "date", value: dateValue })),
      fld("Hva slags dag", "fType", select("fType", Object.entries(TYPES), p.type))),
    fld("Varsel", "fRemind", select("fRemind", REMINDER_OPTIONS, p.remind)),
    h("div", null,
      check("fRepeat", "Gjentas hvert år", p.arlig),
      check("fYear", "Vis alder eller antall år", isNew || p.year !== null)),
    h("details", { class: "more-fields", open: p.tel ? true : null },
      h("summary", null, "Telefonnummer"),
      h("div", { class: "form" }, fld("Telefon", "fTel", h("input", { id: "fTel", type: "tel", autocomplete: "tel", value: p.tel, placeholder: "Valgfritt" })),
        canPickPhone() ? h("button", { id: "fPickContact", class: "link", type: "button", onclick: async e => {
          const button = e.currentTarget;
          button.disabled = true;
          try {
            const contact = await pickPhone({ signal: contactRequest.signal });
            if (!contact || !form.isConnected || contactRequest.signal.aborted) return;
            const phone = $("#fTel", form);
            phone.value = contact.numbers[0];
            const name = $("#fName", form);
            if (!name.value.trim() && contact.name) name.value = contact.name;
            mount($("#fContactNumbers", form), contact.numbers.length > 1 ? fld("Velg nummer", "fPickedNumber",
              h("select", { id: "fPickedNumber", onchange: event => { phone.value = event.target.value; } },
                contact.numbers.map(n => h("option", { value: n }, n)))) : null);
            phone.dispatchEvent(new Event("input", { bubbles: true }));
            phone.focus();
          } catch {
            if (!contactRequest.signal.aborted) toast("Kontaktlisten kunne ikke åpnes. Du kan skrive nummeret selv.");
          } finally { button.disabled = false; }
        } }, "Velg fra kontakter") : null,
        h("div", { id: "fContactNumbers" }))));

  const save = e => {
    e.preventDefault();
    const name = $("#fName").value.trim();
    if (!name) { toast("Skriv inn et navn."); $("#fName").focus(); return; }
    const dt = parseIsoDate($("#fDate").value);
    const once = !$("#fRepeat").checked;
    if (once && !dt) { toast("En dag som skjer én gang, trenger en dato."); return; }
    upsertPerson(normalizePerson({
      ...p, name,
      type: $("#fType").value,
      day: dt ? dt.getDate() : null, month: dt ? dt.getMonth() + 1 : null,
      // One-time days always keep their year; yearly days keep it only for age.
      year: dt && (once || $("#fYear").checked) ? dt.getFullYear() : null,
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
    eyebrow: isNew ? "Ny dag" : "Endre",
    title: isNew ? "Hvem eller hva?" : p.name,
    onClose: () => contactRequest.abort(),
    body: [form, h("button", { class: "btn-primary btn-block", type: "submit", form: "personForm" }, "Lagre")]
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
      fld("Bursdag", "wDate", h("input", { id: "wDate", type: "date" })),
      fld("Varsel", "wRemind", select("wRemind", REMINDER_OPTIONS, 1)));
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
      body: [p.tel ? h("p", { class: "facts" }, p.tel) : null, form,
        h("button", { class: "btn-primary btn-block", type: "submit", form: "wizForm" }, "Lagre og neste"),
        h("button", { class: "link", type: "button", onclick: next }, "Hopp over")]
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
    savePeople(list);
    toast(added ? added + " lagt til. Sett datoene under «Uten dato»." : "Alle lå der fra før.");
  } catch {
    toast("Kontaktlisten kunne ikke åpnes.");
  }
}
