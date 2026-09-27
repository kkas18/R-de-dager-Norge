// Innstillinger og om: theme, countdown, reminders, calendar feed, backup, install.

import { $, downloadFile } from "../dom.js";
import { VERSION } from "../version.js";
import { mergeImport } from "../people.js";
import { runReminders, NOTIFIED_KEY } from "../reminders.js";
import { kvGet, kvSet } from "../kv.js";
import { loadPeople, savePeople, prefs } from "../store.js";
import { toast } from "../ui.js";
import { exportIcs } from "./people.js";
import { today } from "./shared.js";

/* ── Theme: System / Lys / Mørk ───────────────────────────── */
export function applyTheme(choice) {
  const root = document.documentElement;
  if (choice === "light" || choice === "dark") root.dataset.theme = choice;
  else delete root.dataset.theme;
}

export function initSettings({ onChange }) {
  const theme = $("#sTheme");
  theme.value = prefs.get("theme", "system");
  theme.addEventListener("change", () => { prefs.set("theme", theme.value); applyTheme(theme.value); });

  const sunday = $("#sSunday");
  sunday.value = prefs.get("sondag", "av");
  sunday.addEventListener("change", () => { prefs.set("sondag", sunday.value); onChange(); });

  const hour = $("#sAlarm");
  hour.value = prefs.get("alarmHour", "9");
  hour.addEventListener("change", () => prefs.set("alarmHour", hour.value));

  $("#sNotify").addEventListener("click", async () => {
    try {
      if (await Notification.requestPermission() === "granted") { checkReminders(); registerPeriodicSync(); }
    } finally { renderNotificationState(); }
  });

  const feed = new URL("helligdager.ics", location.href);
  $("#sFeedSubscribe").href = "webcal://" + feed.host + feed.pathname;
  $("#sFeedDownload").href = feed.pathname;

  $("#sIcsAll").addEventListener("click", () => exportIcs(loadPeople(), "mine-dager"));
  $("#sBackup").addEventListener("click", () => {
    const list = loadPeople();
    if (!list.length) { toast("Ingenting å ta kopi av ennå."); return; }
    downloadFile(JSON.stringify({ app: "rode-dager", versjon: VERSION, dager: list }, null, 2),
      "rode-dager-kopi.json", "application/json");
  });
  $("#sRestore").addEventListener("click", () => $("#sRestoreFile").click());
  $("#sRestoreFile").addEventListener("change", async e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const incoming = Array.isArray(data) ? data : data && data.dager;
      if (!Array.isArray(incoming)) throw new Error("Ukjent format");
      const { list, added, skipped } = mergeImport(loadPeople(), incoming);
      savePeople(list);
      toast(added ? "Hentet inn " + added + "." + (skipped ? " " + skipped + " ugyldige ble hoppet over." : "")
        : "Alt lå der fra før.");
    } catch {
      toast("Filen kunne ikke leses.");
    }
  });

  $("#version").textContent = "Røde dager " + VERSION + " · virker uten nett";
  renderNotificationState();
}

export function renderNotificationState() {
  const status = $("#sNotifyStatus"), btn = $("#sNotify");
  if (!("Notification" in window)) {
    status.textContent = "Nettleseren støtter ikke varsler. Legg dagene i kalenderen for å få alarm.";
    btn.hidden = true;
    return;
  }
  const p = Notification.permission;
  btn.hidden = p !== "default";
  status.textContent = p === "granted"
    ? "Varsler er på. Du får beskjed når du åpner appen, og på Android også i bakgrunnen når systemet tillater det."
    : p === "denied"
      ? "Varsler er slått av i nettleseren. Kalenderen gir fortsatt alarm."
      : "Få beskjed før dagene dine når du åpner appen. For alarm til fast tid, bruk kalenderen.";
}

/* ── Reminders: one shared "already sent" record in IndexedDB ── */
const LEGACY_NOTIFIED = "rd:varslet"; // v1 kept the sent-record here

/** The active registration, or null. Never waits on a worker that may never install. */
async function activeRegistration() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    return reg && reg.active ? reg : null;
  } catch {
    return null;
  }
}

export async function checkReminders() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const reg = await activeRegistration();
  await runReminders(loadPeople(), today(), {
    load: async () => ({ ...prefs.getJson(LEGACY_NOTIFIED, {}), ...((await kvGet(NOTIFIED_KEY)) || {}) }),
    save: async notified => {
      await kvSet(NOTIFIED_KEY, notified);
      try { localStorage.removeItem(LEGACY_NOTIFIED); } catch { /* blocked storage */ }
    },
    show: async r => {
      if (reg) await reg.showNotification(r.title, { body: r.body, icon: "icons/icon-192.png", badge: "icons/badge-96.png", tag: r.key });
      else new Notification(r.title, { body: r.body, icon: "icons/icon-192.png", tag: r.key });
    }
  }).catch(err => console.warn("Varsler kunne ikke sjekkes", err));
}

export async function registerPeriodicSync() {
  try {
    const reg = await activeRegistration();
    if (!reg || !("periodicSync" in reg)) return;
    const state = await navigator.permissions.query({ name: "periodic-background-sync" });
    if (state.state === "granted") await reg.periodicSync.register("sjekk-dager", { minInterval: 12 * 3600 * 1000 });
  } catch (err) {
    console.warn("Bakgrunnssjekk ikke tilgjengelig", err);
  }
}

/* ── Install prompt ───────────────────────────────────────── */
export function initInstall() {
  let deferred = null;
  const btn = $("#sInstall");
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; btn.hidden = false; });
  btn.addEventListener("click", async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    btn.hidden = true;
  });
  addEventListener("appinstalled", () => { btn.hidden = true; });
}
