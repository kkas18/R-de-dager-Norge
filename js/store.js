// Page-side persistence: preferences and people in localStorage, mirrored to
// IndexedDB for the service worker. Views subscribe and re-render on change.

import { normalizePerson } from "./people.js";
import { kvSet } from "./kv.js";

const PEOPLE_KEY = "rd:events";

export const prefs = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, String(value)); } catch { /* storage full or blocked: keep running */ }
  },
  getJson(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
  },
  setJson(key, value) { this.set(key, JSON.stringify(value)); }
};

const listeners = new Set();
let cache = null;

export function loadPeople() {
  if (cache) return cache;
  const raw = prefs.getJson(PEOPLE_KEY, []);
  cache = (Array.isArray(raw) ? raw : []).map(normalizePerson).filter(Boolean);
  // Persist repairs (new ids, fixed fields) at once, so ids stay stable across launches.
  if (JSON.stringify(cache) !== JSON.stringify(raw)) prefs.setJson(PEOPLE_KEY, cache);
  return cache;
}

export function mirrorPeople() {
  return kvSet("events", loadPeople()).catch(err => console.warn("Kunne ikke speile dagene til IndexedDB", err));
}

export function savePeople(list) {
  cache = list.map(normalizePerson).filter(Boolean);
  prefs.setJson(PEOPLE_KEY, cache);
  mirrorPeople();
  listeners.forEach(fn => fn());
}

export const findPerson = id => loadPeople().find(p => p.id === id) || null;

export function upsertPerson(person) {
  savePeople(loadPeople().filter(p => p.id !== person.id).concat(person));
}

export function removePeople(ids) {
  const set = new Set(ids);
  const before = loadPeople();
  savePeople(before.filter(p => !set.has(p.id)));
  return () => savePeople(before);
}

export function onPeopleChange(fn) { listeners.add(fn); }

// Another window or the installed app changed the list: drop the cache and re-render,
// so this window never writes a stale copy back over it.
addEventListener("storage", e => {
  if (e.key !== PEOPLE_KEY && e.key !== null) return;
  cache = null;
  listeners.forEach(fn => fn());
});
