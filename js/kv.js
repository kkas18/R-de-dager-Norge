// A tiny IndexedDB key-value store, shared by the page and the service worker
// (the worker cannot read localStorage).

const DB = "rode-dager", STORE = "kv";

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run(mode, fn) {
  return open().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(req.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  }));
}

export const kvGet = key => run("readonly", s => s.get(key));
export const kvSet = (key, value) => run("readwrite", s => s.put(value, key));
