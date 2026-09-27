// Røde dager – service worker (ES module).
// The app shell is cached per version and served cache-first, so a release is
// atomic: every file comes from the same version until the user taps "Oppdater".
// Bump VERSION in js/version.js to ship a new release.

import { VERSION } from "./js/version.js";
import { kvGet, kvSet } from "./js/kv.js";
import { runReminders, NOTIFIED_KEY } from "./js/reminders.js";
import { normalizePerson } from "./js/people.js";
import { startOfDay } from "./js/dates.js";

const CACHE = "rode-dager-" + VERSION;
const SHELL = [
  "./",
  "index.html",
  "manifest.json",
  "helligdager.ics",
  "css/app.css",
  "fonts/source-serif-4-400.woff2",
  "fonts/source-serif-4-600.woff2",
  "fonts/source-serif-4-400-italic.woff2",
  "fonts/source-sans-3-400.woff2",
  "fonts/source-sans-3-600.woff2",
  "js/app.js",
  "js/dates.js",
  "js/dom.js",
  "js/holidays.js",
  "js/ics.js",
  "js/kv.js",
  "js/people.js",
  "js/reminders.js",
  "js/store.js",
  "js/ui.js",
  "js/version.js",
  "js/views/calendar.js",
  "js/views/people.js",
  "js/views/plan.js",
  "js/views/settings.js",
  "js/views/shared.js",
  "js/views/today.js",
  "icons/favicon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-192.png",
  "icons/maskable-512.png",
  "icons/apple-touch-icon.png",
  "icons/badge-96.png"
];

// A failed precache fails the install, so a broken release never takes over.
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(url => new Request(url, { cache: "reload" })))));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("rode-dager-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", e => {
  if (e.data === "skip") self.skipWaiting();
});

const scope = new URL(self.registration.scope);
const isAppNavigation = url =>
  url.pathname === scope.pathname || url.pathname === scope.pathname + "index.html";

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === "navigate") {
    // Only the app itself is served from cache. Other pages (a 404, README) go to the network untouched.
    if (!isAppNavigation(url)) return;
    e.respondWith(caches.match("index.html", { cacheName: CACHE }).then(hit => hit || fetch(req)));
    return;
  }

  e.respondWith(caches.match(req, { cacheName: CACHE, ignoreSearch: true }).then(hit => hit || fetch(req)));
});

/* ── Background reminders (Chrome on Android, installed app) ── */
async function checkReminders() {
  const people = (await kvGet("events").catch(() => [])) || [];
  await runReminders(people.map(normalizePerson).filter(Boolean), startOfDay(), {
    load: () => kvGet(NOTIFIED_KEY),
    save: notified => kvSet(NOTIFIED_KEY, notified),
    show: r => self.registration.showNotification(r.title, {
      body: r.body, icon: "icons/icon-192.png", badge: "icons/badge-96.png", tag: r.key
    })
  });
}

self.addEventListener("periodicsync", e => {
  if (e.tag === "sjekk-dager") e.waitUntil(checkReminders());
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    const open = list.find(c => "focus" in c);
    return open ? open.focus() : self.clients.openWindow("./#personer");
  }));
});
