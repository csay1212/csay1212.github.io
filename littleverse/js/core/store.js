// Progress inside a universe (stardust, stamps, high scores, opened letters…),
// saved on this device. One JSON blob per universe in localStorage. If storage
// is blocked (private mode), it still works for the visit.
let KEY = 'lv-progress-none';
const listeners = {};
let data = load();
let saveT = null;

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d && typeof d === 'object') return normalize(d);
  } catch {}
  return normalize({});
}
function normalize(d) {
  d.stardust = Number.isFinite(d.stardust) ? Math.max(0, d.stardust) : 0;
  d.earned = Number.isFinite(d.earned) ? d.earned : d.stardust;
  for (const k of ['stamps', 'best', 'stats', 'seen', 'hidden', 'stickers', 'coupons', 'letters', 'game']) if (!d[k] || typeof d[k] !== 'object') d[k] = {};
  if (!d.settings || typeof d.settings !== 'object') d.settings = {};
  if (d.settings.sfx === undefined) d.settings.sfx = true;
  return d;
}
function persist() {
  clearTimeout(saveT);
  saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} }, 120);
}
function emit(ev, payload) { (listeners[ev] || []).forEach(fn => { try { fn(payload); } catch (e) { console.error(e); } }); }

export const store = {
  // switch to a universe's progress (called when a universe starts playing)
  use(id) {
    this.flush();
    KEY = 'lv-progress-' + id;
    data = load();
    emit('reset', null);
  },
  key: () => KEY,
  on(ev, fn) { (listeners[ev] ||= []).push(fn); return () => { listeners[ev] = listeners[ev].filter(f => f !== fn); }; },

  // generic per-feature storage: store.get('game.flight') / store.set('game.flight', {...})
  get(path, def) {
    let o = data;
    for (const k of path.split('.')) { if (o == null || typeof o !== 'object' || !(k in o)) return def; o = o[k]; }
    return o === undefined ? def : o;
  },
  set(path, val) {
    const ks = path.split('.'); let o = data;
    for (let i = 0; i < ks.length - 1; i++) { if (!o[ks[i]] || typeof o[ks[i]] !== 'object') o[ks[i]] = {}; o = o[ks[i]]; }
    o[ks.at(-1)] = val; persist(); emit('change', path);
    return val;
  },
  update(path, fn, def) { return this.set(path, fn(this.get(path, def))); },

  /* ---- stardust (the currency) ---- */
  stardust() { return data.stardust; },
  totalEarned() { return data.earned; },
  // award(n) adds stardust and fires the HUD animation. opts: {x, y} screen point to fly from
  award(n, opts = {}) {
    n = Math.round(n); if (!(n > 0)) return 0;
    data.stardust += n; data.earned += n; persist();
    emit('stardust', { total: data.stardust, delta: n, ...opts });
    return n;
  },
  spend(n) {
    if (data.stardust < n) return false;
    data.stardust -= n; persist();
    emit('stardust', { total: data.stardust, delta: -n });
    return true;
  },

  /* ---- passport stamps ---- */
  stamp(id) {
    if (data.stamps[id]) return false;
    data.stamps[id] = Date.now(); persist();
    emit('stamp', { id, count: this.stampCount() });
    return true;
  },
  hasStamp(id) { return !!data.stamps[id]; },
  stampDate(id) { return data.stamps[id] || null; },
  stampCount() { return Object.keys(data.stamps).length; },

  /* ---- high scores ---- */
  best(game, score, lowerIsBetter = false) {
    const old = data.best[game];
    const isNew = old == null || (lowerIsBetter ? score < old : score > old);
    if (isNew) { data.best[game] = score; persist(); }
    return { best: isNew ? score : old, prev: old ?? null, isNew: isNew && old != null, first: old == null };
  },
  getBest(game) { return data.best[game] ?? null; },

  /* ---- running stats, used by the finale's end credits ---- */
  stat(key, delta = 1) { data.stats[key] = (data.stats[key] || 0) + delta; persist(); return data.stats[key]; },
  statMax(key, v) { if (!(data.stats[key] >= v)) { data.stats[key] = v; persist(); } return data.stats[key]; },
  stats() { return { ...data.stats }; },

  /* ---- first-visit flags ---- */
  seen(id) { const was = !!data.seen[id]; if (!was) { data.seen[id] = Date.now(); persist(); } return was; },
  wasSeen(id) { return !!data.seen[id]; },

  /* ---- hidden friends ---- */
  findHidden(id) {
    if (data.hidden[id]) return false;
    data.hidden[id] = Date.now(); persist(); emit('hidden', { id, count: Object.keys(data.hidden).length });
    return true;
  },
  hiddenCount() { return Object.keys(data.hidden).length; },
  hiddenFound(id) { return !!data.hidden[id]; },

  // sound settings are app-wide, not per universe
  settings() { try { return { sfx: true, ...JSON.parse(localStorage.getItem('lv-settings') || '{}') }; } catch { return { sfx: true }; } },
  setSetting(k, v) { try { const s = this.settings(); s[k] = v; localStorage.setItem('lv-settings', JSON.stringify(s)); emit('settings', s); } catch {} },

  raw() { return data; },
  reset() {
    const keepSettings = data.settings, keepHat = data.hat;
    data = normalize({ settings: keepSettings, hat: keepHat });
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
    emit('reset', null); emit('stardust', { total: 0, delta: 0 });
  },
  flush() { clearTimeout(saveT); try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} },
};
addEventListener('pagehide', () => store.flush());
