/* Røde dager – service worker
   HTML hentes fra nett først, slik at appen oppdaterer seg selv
   så snart du pusher nye filer til GitHub. Alt annet caches. */

const CACHE = "rode-dager-v1.7.0";
const ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-192.png",
  "icons/maskable-512.png",
  "icons/apple-touch-icon.png",
  "icons/favicon.svg"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {})
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", e => {
  if (e.data === "skip") self.skipWaiting();
});

/* ── Varsler om egne dager ────────────────────────────────
   Leser dagene fra IndexedDB, som appen holder oppdatert.
   periodicsync gis av systemet til installerte apper, som
   regel én gang i døgnet. Tidspunktet bestemmes av Android,
   så for alarm på minuttet bør dagen ligge i telefonkalenderen. */

const DAGER = ["søndag","mandag","tirsdag","onsdag","torsdag","fredag","lørdag"];
const MND = ["januar","februar","mars","april","mai","juni","juli","august","september","oktober","november","desember"];
const TYPER = { bursdag:"Bursdag", jubileum:"Jubileum", annet:"Merkedag" };

function lesDager() {
  return new Promise(res => {
    try {
      const r = indexedDB.open("rode-dager", 1);
      r.onupgradeneeded = () => { try { r.result.createObjectStore("kv"); } catch (e) {} };
      r.onerror = () => res([]);
      r.onsuccess = () => {
        try {
          const q = r.result.transaction("kv", "readonly").objectStore("kv").get("events");
          q.onsuccess = () => res(Array.isArray(q.result) ? q.result : []);
          q.onerror = () => res([]);
        } catch (e) { res([]); }
      };
    } catch (e) { res([]); }
  });
}

function nesteDato(ev, fra) {
  const lag = y => {
    let d = ev.day;
    if (ev.month === 2 && ev.day === 29 && new Date(y, 1, 29).getMonth() !== 1) d = 28;
    return new Date(y, ev.month - 1, d);
  };
  if (!ev.arlig) return lag(ev.year || fra.getFullYear());
  const i = lag(fra.getFullYear());
  return i < fra ? lag(fra.getFullYear() + 1) : i;
}

async function sjekkDager() {
  const dager = await lesDager();
  if (!dager.length) return;
  const n = new Date();
  const idag = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  const cache = await caches.open(CACHE);
  const svar = await cache.match("varslet.json");
  let sendt = {};
  if (svar) { try { sendt = await svar.json(); } catch (e) {} }

  for (const ev of dager) {
    if (!ev || !ev.day || !ev.month || ev.remind < 0) continue;
    const dato = nesteDato(ev, idag);
    const gap = Math.round((dato - idag) / 86400000);
    if (gap < 0 || gap > ev.remind) continue;
    const nokkel = ev.id + "_" + dato.getFullYear();
    if (sendt[nokkel]) continue;
    const nar = gap === 0 ? "i dag" : gap === 1 ? "i morgen" : "om " + gap + " dager";
    const alder = ev.year ? dato.getFullYear() - ev.year : null;
    const tekst = ev.name +
      (ev.type === "bursdag"
        ? (alder !== null && alder >= 0 ? " fyller " + alder + " år " : " har bursdag ") + nar
        : " – " + nar) +
      ", " + DAGER[dato.getDay()] + " " + dato.getDate() + ". " + MND[dato.getMonth()] + ".";
    await self.registration.showNotification((TYPER[ev.type] || "Merkedag") + " " + nar, {
      body: tekst, icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: nokkel
    });
    sendt[nokkel] = 1;
  }
  await cache.put("varslet.json", new Response(JSON.stringify(sendt), {
    headers: { "Content-Type": "application/json" }
  }));
}

self.addEventListener("periodicsync", e => {
  if (e.tag === "sjekk-dager") e.waitUntil(sjekkDager());
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) if ("focus" in c) return c.focus();
    return clients.openWindow("./");
  }));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  const isDoc = req.mode === "navigate" || req.destination === "document";

  if (isDoc) {
    // Nett først: nyeste versjon vinner, cache er reserve uten dekning.
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put("index.html", copy));
          return res;
        })
        .catch(() => caches.match("index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  // Cache først for ikoner og manifest, med stille oppfriskning.
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
