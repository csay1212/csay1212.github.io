// Local storage for universes and their media (photos, songs).
// Universes live in IndexedDB so photos and audio can be stored as blobs.
// Everything stays on this device unless the person exports a gift file.
const DB_NAME = 'littleverse', VER = 1;
let dbp = null;
function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    let req;
    try { req = indexedDB.open(DB_NAME, VER); } catch (e) { rej(e); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('universes')) db.createObjectStore('universes', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('media')) db.createObjectStore('media', { keyPath: 'id' });
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  }).catch(e => { console.warn('IndexedDB unavailable, using memory', e); return null; });
  return dbp;
}
const mem = { universes: new Map(), media: new Map() };
async function tx(store, mode, fn) {
  const db = await open();
  if (!db) return fn(null, mem[store]);
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let out;
    Promise.resolve(fn(s)).then(v => { out = v; });
    t.oncomplete = () => res(out);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}
const reqP = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

// Universes live only on this device, so once there's one that isn't an example, ask
// the browser not to clear this storage when space runs low (once per session).
let kept = false;
function keep() {
  if (kept) return;
  kept = true;
  try { navigator.storage.persisted().then(p => p || navigator.storage.persist()).catch(() => {}); } catch {}
}

const subs = new Set();
const emit = () => subs.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });

export const db = {
  onChange(fn) { subs.add(fn); return () => subs.delete(fn); },
  async all() {
    const list = await tx('universes', 'readonly', (s, m) => s ? reqP(s.getAll()) : [...m.values()]);
    return (list || []).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  },
  async get(id) { return tx('universes', 'readonly', (s, m) => s ? reqP(s.get(id)) : m.get(id)); },
  async put(u, { touch = true } = {}) {
    if (touch) u.updatedAt = Date.now();
    if (!u.demo) keep();
    const clean = JSON.parse(JSON.stringify(u));
    await tx('universes', 'readwrite', (s, m) => s ? reqP(s.put(clean)) : m.set(clean.id, clean));
    emit();
    return clean;
  },
  async remove(id) {
    const u = await this.get(id);
    await tx('universes', 'readwrite', (s, m) => s ? reqP(s.delete(id)) : m.delete(id));
    if (u) for (const mid of mediaIds(u)) await this.dropMedia(mid);
    try { localStorage.removeItem('lv-progress-' + id); } catch {}
    emit();
  },
  /* ---------- media ---------- */
  async putMedia(blob, meta = {}) {
    const id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    await tx('media', 'readwrite', (s, m) => s ? reqP(s.put({ id, blob, type: blob.type, ...meta })) : m.set(id, { id, blob, type: blob.type, ...meta }));
    return id;
  },
  async getMedia(id) { return tx('media', 'readonly', (s, m) => s ? reqP(s.get(id)) : m.get(id)); },
  async dropMedia(id) { if (!id || isAsset(id)) return; urlCache.delete(id); return tx('media', 'readwrite', (s, m) => s ? reqP(s.delete(id)) : m.delete(id)); },
};

// A media reference is either a bundled asset path ("assets/…") or a stored blob id.
export const isAsset = ref => typeof ref === 'string' && (ref.startsWith('assets/') || ref.startsWith('data:') || ref.startsWith('blob:') || ref.startsWith('http'));
const urlCache = new Map();
export async function mediaURL(ref) {
  if (!ref) return null;
  if (isAsset(ref)) return ref;
  if (urlCache.has(ref)) return urlCache.get(ref);
  const rec = await db.getMedia(ref);
  if (!rec || !rec.blob) return null;
  const url = URL.createObjectURL(rec.blob);
  urlCache.set(ref, url);
  return url;
}
export function mediaIds(u) {
  const ids = new Set();
  const add = r => { if (r && !isAsset(r)) ids.add(r); };
  add(u.them?.photo); add(u.me?.photo);
  (u.copy?.memories?.items || []).forEach(m => add(m.photo));
  (u.copy?.mixtape?.tracks || []).forEach(t => add(t.media));
  (u.puzzles || []).forEach(p => add(p));
  return [...ids];
}

// Shrink a photo before storing it (phones take huge pictures).
export function compressImage(file, max = 1600, q = 0.86) {
  return new Promise(res => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => res(b || file), 'image/jpeg', q);
    };
    img.onerror = () => { URL.revokeObjectURL(url); res(file); };
    img.src = url;
  });
}

/* ---------- app settings (small, so localStorage) ---------- */
const SKEY = 'lv-settings';
export const settings = {
  get() { try { return { name: '', sfx: true, haptics: true, onboarded: false, ...(JSON.parse(localStorage.getItem(SKEY) || '{}')) }; } catch { return { name: '', sfx: true, haptics: true }; } },
  set(patch) { const s = { ...this.get(), ...patch }; try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch {} return s; },
};
