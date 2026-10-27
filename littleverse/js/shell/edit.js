// The editor: every word, photo, song and world in a universe, one screen per part.
//   #/u/<id>/e/<section>[/<sub>]
//   film (+ opening, chapters, log, stats, hill, chords, catch, cake, epilogue, credits), letter,
//   mail (+ <letterId>), coupons (+ <couponId>), reasons, memories, wordle, mixtape, trailer,
//   finale, worlds, characters, theme, photos, details, occasion
// Typing autosaves (debounced) with a quiet "Saved" in the navbar; discrete actions
// (add, delete, reorder, photos, songs) save at once and confirm with a toast.
import { worldTitle as __wt } from '../lib/templates.js';
import { h, ic, emo, screen, navbar, groupHead, groupFoot, group, row, toggle, seg, sheet, confirmSheet, toast, pickFile, haptic, plural } from './kit.js';
import { avatarBuilder, themePicker, dateField } from './pickers.js';
import { poster, posterVars, whenLine } from './poster.js';
import { db, mediaURL, mediaIds, compressImage, isAsset } from '../lib/db.js';
import { RELATIONSHIPS, OCCASION_FOR, WORLD_DEFS, SECTORS, recommendedWorlds, relById, occById, themeOf, COLOR_ROLES, FONTS, STARS, fontById, starsById, mapOrder } from '../lib/catalog.js';
import { generate, renameEverywhere, verseName, wordGameName, SONGS, songTrack, MUSIC_VOLUME, GATE_WORDS, TITLED_WORLDS, MONTHS } from '../lib/templates.js';
import { info } from '../lib/dates.js';
import { catSVG } from '../core/cat.js';

/* ---------- constants ---------- */
const ENVELOPE = { gold: ['#f5cc4a', '#fff4d6', 'Gold'], lilac: ['#b59cff', '#eee8ff', 'Lilac'], rose: ['#ef7fb0', '#ffe6f0', 'Rose'], mint: ['#86e6d8', '#e2fbf6', 'Mint'] };
const COUPON_EMOJI = ['🎁', '☕', '🍿', '🥞', '🍝', '🧁', '🍦', '🧋', '🍻', '💃', '🎧', '🎲', '📞', '📸', '🗺️', '✈️', '🌇', '🌙', '🛋️', '🧸', '💌', '🌷', '🤍', '✨'];
const SOUNDS = [['boom', 'Boom'], ['hit', 'Hit'], ['alarm', 'Alarm'], ['rise', 'Rise'], ['braam', 'Braam']];
const CAKE = {
  blow: { kicker: 'Scene 4 · the part with cake', big: 'Make a wish, then blow them out.', small: 'Tap each flame. Or turn on the microphone and actually blow. Your call.' },
  light: { kicker: 'Scene 4 · five candles', big: 'Light a candle for each thing you want to say.', small: 'Tap each wick to light it. They’ll stay lit.' },
};
const STAT_KIND = { years: 'Years', days: 'Days', moons: 'Full moons', lightyears: 'Light-years', daysLate: 'Days late', kmLate: 'Distance in km', auLate: 'Distance in AU',
  daysUntil: 'Days to go', hoursUntil: 'Hours to go', km: 'Distance in km', au: 'Distance in AU', fixed: 'Your own number' };
const NAME_HINT = 'Hmm. Who could this be?';

/* ---------- small helpers ---------- */
const uid = p => p + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 6);
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
const words = s => (String(s || '').trim() ? String(s).trim().split(/\s+/).length : 0);
const firstText = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean)[0] || '';
const grow = t => { if (!t.isConnected) return; const y = scrollY; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; if (scrollY !== y) scrollTo(0, y); };
// Re-measure a textarea whenever its width changes (edit mode, rotation, fonts loading).
const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(es => { for (const e of es) { const w = Math.round(e.contentRect.width); if (e.target._w !== w) { e.target._w = w; grow(e.target); } } }) : null;
const growSoon = root => requestAnimationFrame(() => root.querySelectorAll('textarea.ed-grow').forEach(t => { grow(t); if (ro) ro.observe(t); }));
function fmtISO(iso, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  const p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return p ? new Date(+p[1], +p[2] - 1, +p[3]).toLocaleDateString('en-US', opts) : '';
}
const isoOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayISO = () => isoOf(new Date());
const totalStamps = u => 1 + WORLD_DEFS.filter(w => w.id !== 'finale' && u.worlds[w.id] !== false).length + (u.hidden !== false ? 1 : 0);
const finaleNeeds = u => Math.min(12, Math.max(3, Math.round(totalStamps(u) * 0.7)));
const studioFor = me => `${String(me).trim().split(/\s+/)[0]} Pictures`;
const scopeFor = them => `${String(them).trim().split(/\s+/).filter(x => !/^(the|a|an)$/i.test(x))[0] || them}Scope`;

// Fill live tokens for previews (the experience does this for real when it plays).
function previewFill(u, s) {
  const d = info(u.date, u.yearKnown !== false);
  const pl = (n, w) => `${Number(n).toLocaleString('en-US')} ${w}${n === 1 ? '' : 's'}`;
  const since = Math.max(0, d.daysSince);
  const v = { them: u.them.name, me: u.me.name, studio: u.studio, scope: u.scope, verse: u.copy.map?.title || verseName(u.them.name),
    date: d.long, dateShort: d.short, dateFull: d.full, month: d.month, weekday: d.weekday, season: d.season,
    daysUntil: pl(d.daysUntil, 'day'), daysLate: pl(d.daysSinceLast, 'day'), daysSince: pl(since, 'day'), days: since.toLocaleString('en-US'),
    years: d.yearsSince ?? '', hoursUntil: (d.daysUntil * 24).toLocaleString('en-US'), moons: Math.floor(since / 29.53).toLocaleString('en-US'),
    lightyears: (since / 365.25).toFixed(since / 365.25 >= 10 ? 0 : 1) + ' light-years' };
  return String(s ?? '').replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m));
}
function statNow(u, k) {
  const d = info(u.date, u.yearKnown !== false), since = Math.max(0, d.daysSince);
  const map = { years: d.yearsSince, days: since.toLocaleString('en-US'), moons: Math.floor(since / 29.53).toLocaleString('en-US'), lightyears: (since / 365.25).toFixed(1),
    daysUntil: d.daysUntil, hoursUntil: (d.daysUntil * 24).toLocaleString('en-US'), daysLate: d.daysSinceLast };
  return map[k] ?? null;
}

// Media can be shared with a duplicated universe; only drop it when nothing else uses it.
async function dropSafe(ref) {
  if (!ref || isAsset(ref)) return;
  try { const all = await db.all(); if (all.some(x => mediaIds(x).includes(ref))) return; await db.dropMedia(ref); } catch (e) { console.warn(e); }
}

// Make sure every list exists and every item has a unique, route-safe id.
function normalize(u) {
  const c = u.copy || (u.copy = {});
  c.hero ||= { title: occById(u.occ).title, line: '' }; c.gate ||= { tagline: '' };
  c.film ||= {}; const F = c.film;
  for (const k of ['ch1', 'ch2', 'epi']) F[k] ||= { title: '', sub: '' };
  F.log ||= { kicker: 'Mission log', title: '', lede: '', rows: [] }; F.log.rows ||= [];
  F.stats ||= { on: true, list: [], lede: '' }; F.stats.list ||= [];
  for (const k of ['hill', 'chords', 'catch', 'cake']) F[k] ||= { on: true, kicker: '', title: '', lede: '' };
  F.catch.wishes ||= []; F.cake.mode ||= 'blow';
  F.letter ||= { on: true, kicker: '', body: '', sig: '' };
  F.timelines ||= { on: true, a: { title: '', rows: [] }, b: { title: '', rows: [] }, closing: '', redeem: '' };
  F.timelines.a.rows ||= []; F.timelines.b.rows ||= [];
  F.credits ||= []; F.post ||= { title: '', lede: '' };
  c.map ||= { title: verseName(u.them.name), lede: '' };
  c.letters ||= { title: 'Letters for later', lede: '', items: [] }; c.letters.items ||= [];
  c.coupons ||= { mode: 'coupon', title: 'The Coupon Book', lede: '', items: [] }; c.coupons.items ||= [];
  c.words ||= []; c.reasons ||= { title: 'Reasons', items: [] }; c.reasons.items ||= [];
  c.memories ||= { title: 'Memory Lane', items: [] }; c.memories.items ||= [];
  c.trailer ||= { title: '', sub: '', rating: '', lines: [] }; c.trailer.lines ||= [];
  c.finale ||= { lines: [], burst: [], sign: '' };
  c.mixtape ||= { title: '', note: '', tracks: [] }; c.mixtape.tracks ||= [];
  c.commentary ||= {}; c.forecast ||= [];
  u.worlds ||= recommendedWorlds(u.rel, u.occ);
  // the maker's own names and descriptions for worlds and map sections (kept when the starter text is rewritten)
  u.worldText ||= {}; u.sectorText ||= {};
  const ids = (arr, p) => { const seen = new Set(); arr.forEach(x => { if (!x || typeof x !== 'object') return; if (!x.id || !/^[\w-]+$/.test(x.id) || seen.has(x.id)) x.id = uid(p); seen.add(x.id); }); };
  ids(c.letters.items, 'l'); ids(c.coupons.items, 'c'); ids(c.memories.items, 'm'); ids(c.mixtape.tracks, 't');
}

/* ---------- module state ---------- */
let lastLeft = null;          // { from: route, to: hash }, so moving between editor screens can push or pop
const scrollMem = new Map();  // where you were in a list, for coming back from a detail page
let player = null, playing = null; // one shared <audio> for song previews

/* =====================================================================
   Router entry
   ===================================================================== */
export async function render(ctx) {
  const [id, section, sub] = ctx.params;
  const u = await db.get(id);
  if (!u) { ctx.replace('#/'); return { el: h('div') }; }
  normalize(u);
  let anim = ctx.anim, from = null;
  if (lastLeft && lastLeft.to === location.hash && lastLeft.from.id === id) {
    from = lastLeft.from;
    if (from.section === section && !from.sub && sub) anim = 'push';
    else if (from.section === section && from.sub && !sub) anim = 'pop';
    else if (from.section === 'film' && !from.sub && section === 'letter') anim = 'push';
    else if (from.section === 'letter' && section === 'film' && !sub) anim = 'pop';
  }
  lastLeft = null;
  const ed = makeEditor(u, ctx, { id, section, sub: sub || '', anim, from, key: `${id}/${section}/${sub || ''}` });
  if (u.kind === 'received') return ed.message({ emoji: 'wrapped_gift', title: 'Gifts stay as they were made', text: `This universe was made for you by ${u.from || u.me.name}, so it can’t be edited. You can make one back from its page.` });
  const fn = SECTIONS[section];
  if (!fn) return ed.message({ emoji: 'crystal_ball', title: 'Nothing to edit here', text: 'This part of the universe doesn’t exist, or it moved. Head back and pick something to change.' });
  return fn(ed, sub || '');
}

/* =====================================================================
   The editor kit: autosave, pages, fields, editable lists, item sheets
   ===================================================================== */
function makeEditor(u, ctx, route) {
  const E = s => `#/u/${u.id}/e/${s}`;
  const home = `#/u/${u.id}`;
  const leave = [], offs = [];
  let timer = 0, pending = false, fadeT = 0;

  /* ---- saving ---- */
  const saved = h('span', { class: 'ed-saved', role: 'status', 'aria-live': 'polite' });
  function showSaved() {
    clearTimeout(fadeT);
    saved.replaceChildren(ic('check', 's'), h('span', { text: 'Saved' }));
    saved.classList.add('on');
    fadeT = setTimeout(() => saved.classList.remove('on'), 2200);
  }
  async function write() {
    pending = false; clearTimeout(timer);
    try { await db.put(u); showSaved(); }
    catch (e) { console.error(e); toast('Couldn’t save that. Try again.', { icon: 'info' }); }
  }
  const save = () => { pending = true; saved.classList.remove('on'); clearTimeout(timer); timer = setTimeout(write, 400); };
  const flush = () => { if (pending) write(); };
  async function commit(msg, opts) { await write(); if (msg) toast(msg, opts); }
  const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
  document.addEventListener('visibilitychange', onHide);
  addEventListener('pagehide', flush);
  const onResize = () => document.querySelectorAll('#screen textarea.ed-grow').forEach(grow);
  addEventListener('resize', onResize);
  offs.push(() => { document.removeEventListener('visibilitychange', onHide); removeEventListener('pagehide', flush); removeEventListener('resize', onResize); });

  function cleanup() {
    for (const f of leave) { try { f(); } catch (e) { console.error(e); } }
    flush();
    offs.forEach(f => f());
    if (ro) ro.disconnect();
    clearTimeout(fadeT);
    if (player) { player.pause(); playing = null; }
    scrollMem.set(route.key, scrollY);
    lastLeft = { from: route, to: location.hash };
  }

  /* ---- pages ---- */
  // page({ title, intro, blocks, parent: [href, label], large, cls })
  function page({ title, intro, blocks = [], parent, large = true, cls = '', backHref, backLabel }) {
    const back = backHref || (parent ? parent[0] : home);
    const label = backLabel || (parent ? parent[1] : u.them.name);
    const bar = navbar({ title, back, backLabel: label, right: [saved], always: !large });
    const el = screen({ tabs: false, anim: route.anim, cls: 'ed-scr ' + cls }, bar,
      large ? h('h1', { class: 'large-title', text: title }) : null,
      large && intro ? h('p', { class: 'subtitle ed-intro', text: intro }) : null,
      ...blocks, h('div', { class: 'ed-end' }));
    growSoon(el);
    document.fonts?.ready.then(() => growSoon(el));
    const scroll = route.anim === 'pop' ? scrollMem.get(route.key) || 0 : 0;
    // The page's CSS scrolls smoothly; a screen change must jump, not glide from the old position.
    // Coming back to a list, re-apply the scroll once textareas have grown to full height.
    const rootStyle = document.documentElement.style;
    rootStyle.scrollBehavior = 'auto';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (scroll && el.isConnected && Math.abs(scrollY - scroll) > 2) scrollTo(0, scroll);
      rootStyle.scrollBehavior = '';
    }));
    return { el, cleanup, title: `${title} · ${u.them.name}`, scroll };
  }
  function message({ emoji, title, text, parent }) {
    const back = parent ? parent[0] : home;
    return page({ title: '', large: false, parent, blocks: [h('div', { class: 'empty ed-empty' }, h('h3', { text: title }), h('p', { text }),
      h('a', { class: 'b primary', href: back, onclick: () => haptic('light') }, ic('chevron-left', 's'), parent ? `Back to ${parent[1]}` : `Back to ${u.them.name}`))] });
  }

  /* ---- fields ---- */
  const tokHint = (v) => {
    const toks = [...new Set([...String(v || '').matchAll(/\{(\w+)\}/g)].map(m => m[1]))];
    if (!toks.length) return null;
    return [...toks.flatMap((t, i) => [i ? (i === toks.length - 1 ? ' and ' : ', ') : '', h('span', { class: 'ed-tok', text: `{${t}}` })]), toks.length === 1 ? ' fills in by itself when it plays.' : ' fill in by themselves when it plays.'];
  };
  // text(label, obj, key, { area, max, ph, hint, cap, upper, mono, onInput, required, tokens })
  function text(label, obj, key, o = {}) {
    const id = 'f' + Math.random().toString(36).slice(2, 8);
    const inp = o.area
      ? h('textarea', { class: 'ed-in ed-grow' + (o.mono ? ' ed-mono' : ''), id, rows: 1, maxlength: o.max || 400, placeholder: o.ph || '', autocapitalize: o.cap || 'sentences', enterkeyhint: o.multiline ? null : 'done' })
      : h('input', { class: 'ed-in' + (o.mono ? ' ed-mono' : ''), id, type: 'text', maxlength: o.max || 80, placeholder: o.ph || '', autocomplete: 'off', autocapitalize: o.upper ? 'characters' : (o.cap || 'sentences'), enterkeyhint: 'done', spellcheck: o.mono ? 'false' : null });
    inp.value = obj[key] ?? '';
    const hintBase = o.hint || null;
    const hintEl = h('p', { class: 'ed-fh' });
    const paintHint = () => {
      const t = o.tokens === false ? null : tokHint(inp.value);
      hintEl.replaceChildren(...[hintBase, hintBase && t ? ' ' : null, ...(t || [])].filter(Boolean));
      hintEl.hidden = !hintEl.childNodes.length;
    };
    inp.addEventListener('input', () => {
      if (o.upper) { const p = inp.selectionStart; const up = o.upper(inp.value); if (up !== inp.value) { inp.value = up; try { inp.setSelectionRange(p, p); } catch {} } }
      obj[key] = inp.value;
      if (o.area) grow(inp);
      paintHint(); o.onInput && o.onInput(inp.value); if (!o.nosave) save();
    });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !o.multiline && !e.shiftKey) { e.preventDefault(); inp.blur(); } });
    if (o.required) {
      const fix = () => { if (!String(obj[key] ?? '').trim()) { obj[key] = typeof o.required === 'function' ? o.required() : o.required; inp.value = obj[key]; if (o.area) grow(inp); o.onInput && o.onInput(inp.value); save(); } };
      inp.addEventListener('blur', fix); leave.push(fix);
    }
    paintHint();
    const el = h('div', { class: 'ed-f' }, h('label', { for: id, text: label }), inp, hintEl);
    el.input = inp;
    el.set = v => { inp.value = v ?? ''; obj[key] = inp.value; if (o.area) grow(inp); paintHint(); };
    return el;
  }
  // An input or textarea for use inside a list row.
  function inline(obj, key, o = {}) {
    const inp = o.area
      ? h('textarea', { class: 'ed-in ed-grow ' + (o.cls || ''), rows: 1, maxlength: o.max || 300, placeholder: o.ph || '', 'aria-label': o.label || o.ph, autocapitalize: o.cap || 'sentences', enterkeyhint: 'done' })
      : h('input', { class: 'ed-in ' + (o.cls || ''), type: 'text', maxlength: o.max || 80, placeholder: o.ph || '', 'aria-label': o.label || o.ph, autocomplete: 'off', autocapitalize: o.cap || 'sentences', enterkeyhint: 'done' });
    inp.value = obj[key] ?? '';
    inp.addEventListener('input', () => { obj[key] = inp.value; if (o.area) grow(inp); o.onInput && o.onInput(inp.value); save(); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
    return inp;
  }
  const form = (...kids) => h('div', { class: 'group ed-form' }, ...kids);
  function segField(label, options, value, onchange) {
    return h('div', { class: 'ed-f ed-segf' }, h('span', { class: 'ed-lab', text: label }), seg(options, value, v => { onchange(v); save(); }));
  }
  // A row with a switch; tapping anywhere on the row flips it.
  function switchRow({ title, sub, emoji, icon, tint, get, set, label, nosave }) {
    const t = toggle(get(), v => { set(v); if (!nosave) save(); }, label || title);
    const r = row({ title, sub, emoji, icon, tint, right: t });
    r.classList.add('ed-sw');
    r.addEventListener('click', e => { if (!e.target.closest('.tgl')) t.click(); });
    r.toggle = t;
    return r;
  }
  const head = (title, ...right) => h('div', { class: 'ed-gh' }, h('h3', { text: title }), ...right);

  /* ---- editable lists ----
     list({ items, noun, title, addLabel, min, max, fixed, item(i) → { main, lead, href, open, top }, make, onAdd, del: { confirm(it), after(it) }, foot, onChange }) */
  function list(o) {
    const { items, noun } = o;
    const min = o.min ?? 0, max = o.max ?? 60;
    let editing = !!o.reorder;   // a reorder-only list (o.reorder) always shows its handles
    const grp = h('div', { class: 'group ed-list' + (o.fixed ? ' fixed' : '') + (o.reorder ? ' reorder' : ''), role: 'list', 'aria-label': o.title });
    const cnt = h('span', { class: 'ed-cnt' });
    const editBtn = h('button', { class: 'link ed-editbtn', type: 'button', text: 'Edit', 'aria-pressed': 'false', onclick: () => setEditing(!editing) });
    const headEl = h('div', { class: 'ed-gh' }, h('h3', {}, o.title, cnt), editBtn);
    const footEl = o.foot ? h('p', { class: 'group-f', text: o.foot }) : null;
    grp.addEventListener('click', e => { if (!e.target.closest('.ed-minus, .ed-delbtn')) grp.querySelectorAll('.ed-li.armed').forEach(x => x.classList.remove('armed')); });

    function setEditing(v) {
      editing = v;
      grp.classList.toggle('editing', v);
      editBtn.textContent = v ? 'Done' : 'Edit';
      editBtn.setAttribute('aria-pressed', String(v));
      editBtn.classList.toggle('strong', v);
      grp.querySelectorAll('.ed-li.armed').forEach(x => x.classList.remove('armed'));
      grp.querySelectorAll('.ed-li-main input, .ed-li-main textarea').forEach(x => { x.readOnly = v; x.tabIndex = v ? -1 : 0; });
      if (v && grp.contains(document.activeElement)) document.activeElement.blur();
      haptic('select');
    }
    async function add() {
      if (items.length >= max) return;
      haptic('light');
      if (o.onAdd) return o.onAdd();
      items.push(o.make());
      save(); draw(items.length - 1); o.onChange && o.onChange();
    }
    async function removeAt(i) {
      const it = items[i];
      if (o.del?.confirm) { const c = o.del.confirm(it); if (c && !(await confirmSheet(c))) return; }
      const at = items.indexOf(it);
      if (at < 0) return;
      items.splice(at, 1);
      haptic('medium');
      draw(); o.onChange && o.onChange();
      await commit(`${cap1(typeof noun === 'function' ? noun() : noun)} deleted`, { icon: 'trash-2' });
      if (o.del?.after) o.del.after(it);
    }
    function move(from, to, refocus) {
      if (to < 0 || to >= items.length || to === from) return;
      const [it] = items.splice(from, 1); items.splice(to, 0, it);
      save(); draw(); o.onChange && o.onChange();
      haptic('select');
      if (refocus) grp.children[to]?.querySelector('.ed-grip')?.focus();
    }
    function li(i) {
      const n = typeof noun === 'function' ? noun() : noun;
      const r = o.item(i);
      const el = h('div', { class: 'ed-li' + (r.top ? ' top' : '') + (r.cls ? ' ' + r.cls : ''), role: 'listitem' });
      const minus = h('button', { class: 'ed-minus', type: 'button', 'aria-label': `Delete ${n} ${i + 1}`, disabled: items.length <= min,
        onclick: e => { e.stopPropagation(); grp.querySelectorAll('.ed-li.armed').forEach(x => x !== el && x.classList.remove('armed')); el.classList.toggle('armed'); haptic('select'); } }, h('i'));
      const del = h('button', { class: 'ed-delbtn', type: 'button', text: 'Delete', onclick: e => { e.stopPropagation(); removeAt(i); } });
      const grip = h('button', { class: 'ed-grip', type: 'button', 'aria-label': `Move ${n} ${i + 1}. Use the arrow keys.` }, ic('grip-vertical', 's'));
      grip.addEventListener('keydown', e => { if (e.key === 'ArrowUp') { e.preventDefault(); move(i, i - 1, true); } if (e.key === 'ArrowDown') { e.preventDefault(); move(i, i + 1, true); } });
      grip.addEventListener('pointerdown', e => drag(e, el, grip, i));
      const main = r.href ? h('a', { class: 'ed-li-main ed-tap', href: r.href, onclick: () => haptic('light') }, r.main, r.side || null, ic('chevron-right', 's chev'))
        : r.open ? h('button', { class: 'ed-li-main ed-tap', type: 'button', onclick: () => { haptic('light'); r.open(); } }, r.main, r.side || null, ic('chevron-right', 's chev'))
          : h('div', { class: 'ed-li-main' }, r.main);
      if (editing) main.querySelectorAll('input, textarea').forEach(x => { x.readOnly = true; x.tabIndex = -1; });
      el.append(minus, r.lead || '', main, del, grip);
      return el;
    }
    // Drag a row by its handle; the others slide out of the way. Scrolls near the edges.
    function drag(e, el, grip, from) {
      if (!editing || e.button > 0) return;
      e.preventDefault();
      const rows = [...grp.querySelectorAll(':scope > .ed-li')];
      const tops = rows.map(r => r.offsetTop), hs = rows.map(r => r.offsetHeight);
      const y0 = e.clientY + scrollY;
      let lastY = e.clientY, to = from, raf = 0;
      el.classList.add('dragging'); grp.classList.add('dragging');
      try { grip.setPointerCapture(e.pointerId); } catch {}
      const update = () => {
        const dy = lastY + scrollY - y0;
        el.style.transform = `translateY(${dy}px)`;
        const mid = tops[from] + hs[from] / 2 + dy;
        to = from;
        for (let j = 0; j < from; j++) if (mid < tops[j] + hs[j] / 2) { to = j; break; }
        if (to === from) for (let j = rows.length - 1; j > from; j--) if (mid > tops[j] + hs[j] / 2) { to = j; break; }
        rows.forEach((r, j) => {
          if (j === from) return;
          const s = from < to && j > from && j <= to ? -hs[from] : from > to && j >= to && j < from ? hs[from] : 0;
          r.style.transform = s ? `translateY(${s}px)` : '';
        });
      };
      const tick = () => {
        const top = 110, bottom = innerHeight - 90;
        const v = lastY < top ? -Math.ceil((top - lastY) / 6) : lastY > bottom ? Math.ceil((lastY - bottom) / 6) : 0;
        if (v) { scrollBy(0, v); update(); }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      const mv = ev => { lastY = ev.clientY; update(); };
      const up = () => {
        cancelAnimationFrame(raf);
        grip.removeEventListener('pointermove', mv); grip.removeEventListener('pointerup', up); grip.removeEventListener('pointercancel', up);
        rows.forEach(r => { r.style.transform = ''; });
        el.classList.remove('dragging'); grp.classList.remove('dragging');
        if (to !== from) move(from, to);
      };
      grip.addEventListener('pointermove', mv); grip.addEventListener('pointerup', up); grip.addEventListener('pointercancel', up);
    }
    function draw(focus) {
      grp.replaceChildren(...items.map((_, i) => li(i)));
      if (!o.fixed && o.addLabel && items.length < max) grp.append(h('button', { class: 'ed-add', type: 'button', onclick: add }, ic('circle-plus', 's'), h('span', { text: typeof o.addLabel === 'function' ? o.addLabel() : o.addLabel })));
      if (!items.length && o.empty) grp.prepend(h('p', { class: 'ed-none', text: o.empty }));
      cnt.textContent = o.count === false ? '' : ` ${items.length}`;
      const canEdit = items.length > 1 || (!o.fixed && items.length > min);
      editBtn.hidden = !canEdit || !!o.reorder;
      if (!canEdit && editing) setEditing(false);
      grp.classList.toggle('editing', editing);
      growSoon(grp);
      if (focus != null) requestAnimationFrame(() => {
        const n = grp.children[focus]; if (!n) return;
        n.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        n.querySelector('.ed-li-main textarea, .ed-li-main input')?.focus({ preventScroll: true });
      });
    }
    draw();
    return { el: h('div', { class: 'ed-lw' }, headEl, grp, footEl), draw, setEditing, add, head: headEl };
  }

  /* ---- item sheets: edit one row of a list in a bottom sheet ---- */
  function editSheet({ title, fields, done = 'Done', onDone, onDelete, deleteLabel = 'Delete', onClose, focus, intro }) {
    let viaDone = false;
    const body = h('div', { class: 'ed-sh' }, intro || null, h('div', { class: 'group ed-form' }, ...fields),
      onDelete ? h('div', { class: 'group ed-sh-del' }, row({ icon: 'trash-2', title: deleteLabel, danger: true, chevron: false, onclick: () => { close(); onDelete(); } })) : null);
    const close = sheet({ title, body, onClose: () => onClose && onClose(viaDone), done: { label: done, fn: c => { if (onDone && onDone() === false) return; viaDone = true; c(); } } });
    growSoon(body);
    if (focus) setTimeout(() => body.querySelector('input:not([type=checkbox]), textarea')?.focus(), 380);
    return close;
  }

  return { u, ctx, route, E, home, save, commit, flush, write, page, message, text, inline, form, segField, switchRow, head, list, editSheet, onLeave: f => leave.push(f), offs, saved };
}

/* =====================================================================
   Shared previews
   ===================================================================== */
function titleCard(u, href) {
  const kick = h('p', { class: 'ed-tc-k' }), ttl = h('p', { class: 'ed-tc-t' }), nm = h('p', { class: 'ed-tc-n' }), ln = h('p', { class: 'ed-tc-l' });
  const el = h(href ? 'a' : 'div', { class: 'ed-tc', href: href || null, style: posterVars(u), 'aria-label': href ? 'Edit the title and opening' : null, onclick: href ? () => haptic('light') : null },
    h('span', { class: 'ed-tc-sky', 'aria-hidden': 'true' }), kick, ttl, nm, ln,
    href ? h('span', { class: 'ed-tc-edit' }, ic('pencil', 's'), 'Edit') : null);
  el.update = () => {
    kick.replaceChildren(...previewFill(u, u.copy.hero.scope || '{studio} presents · in {scope}').split(' · ').map(x => h('span', { text: x })));
    ttl.textContent = u.copy.hero.title || occById(u.occ).title;
    nm.textContent = u.them.name;
    nm.className = 'ed-tc-n' + (u.them.name.length > 13 ? ' xlong' : u.them.name.length > 8 ? ' long' : '');
    ln.textContent = previewFill(u, u.copy.hero.line);
  };
  el.update();
  return el;
}

function numBadge(i) { return h('span', { class: 'ed-num', text: String(i + 1) }); }
function rowText(title, sub, tag) {
  return h('span', { class: 'ed-rowt' }, tag ? h('span', { class: 'ed-rowt-h' }, h('b', { text: title }), tag) : h('b', { text: title }), sub ? h('small', { text: sub }) : null);
}

/* =====================================================================
   Film
   ===================================================================== */
async function secFilm(ed, sub) {
  if (sub) {
    const f = FILM[sub];
    if (!f) return ed.message({ emoji: 'clapper_board', title: 'That scene isn’t here', text: 'Pick a part of the film to change from the list.', parent: [ed.E('film'), 'Film'] });
    return f(ed);
  }
  const { u, E } = ed, F = u.copy.film, tl = F.timelines;
  const off = x => (x && x.on === false ? 'Off' : null);
  return ed.page({ title: 'Opening film', intro: `The film ${u.them.name} watches first, scene by scene. Tap any part to change its words.`, blocks: [
    titleCard(u, E('film/opening')),
    groupHead('Opening'),
    group(
      row({ emoji: 'clapper_board', title: 'Title and opening', sub: `“${u.copy.hero.title}”, from ${u.studio}`, href: E('film/opening') }),
      row({ emoji: 'open_book', title: 'Chapter titles', sub: [F.ch1.title, F.ch2.title, F.epi.title].map(x => previewFill(u, x)).join(', '), href: E('film/chapters') })),
    groupHead('Scenes'),
    group(
      row({ emoji: 'rocket', title: 'Mission log', sub: F.log.title, href: E('film/log') }),
      row({ emoji: 'milky_way', title: 'The numbers', sub: `${plural(F.stats.list.length, 'number')}, worked out from the date`, value: off(F.stats), href: E('film/stats') }),
      row({ emoji: 'night_with_stars', title: 'The hill', sub: F.hill.title, value: off(F.hill), href: E('film/hill') }),
      row({ emoji: 'musical_notes', title: 'Say it in chords', sub: F.chords.message ? `“${previewFill(u, F.chords.message)}”` : F.chords.title, value: off(F.chords), href: E('film/chords') }),
      row({ emoji: 'shooting_star', title: 'Catch the stars', sub: `${plural(F.catch.wishes.length, 'wish', 'wishes')} to catch`, value: off(F.catch), href: E('film/catch') }),
      row({ emoji: F.cake.mode === 'light' ? 'candle' : 'birthday_cake', title: F.cake.mode === 'light' ? 'The candles' : 'The cake', sub: F.cake.big, value: off(F.cake), href: E('film/cake') })),
    groupHead('Ending'),
    group(
      row({ emoji: 'memo', title: 'The letter', sub: firstText(F.letter.body.split('\n').slice(1).join('\n')) || 'Write something only you could say', value: off(F.letter), href: E('letter') }),
      row({ emoji: 'hourglass_not_done', title: 'Epilogue', sub: `${previewFill(u, tl.a.title)} and ${previewFill(u, tl.b.title)}`, value: off(tl), href: E('film/epilogue') }),
      row({ emoji: 'movie_camera', title: 'Credits', sub: `${plural(F.credits.length, 'name')} and the scene after`, href: E('film/credits') })),
    groupHead('Extras'),
    group(row({ title: 'Director’s commentary', sub: `${plural(Object.values(u.copy.commentary).filter(x => String(x || '').trim()).length, 'note')} beside the scenes`, href: E('film/commentary') })),
    groupFoot('Switch scenes off to make the film shorter. Everything saves as you type.'),
  ] });
}

const FILM = {
  opening(ed) {
    const { u, text, form } = ed, c = u.copy;
    const tc = titleCard(u); const up = () => tc.update();
    const GW = GATE_WORDS(u.rel === 'memorial' || u.occ === 'remembrance');
    return ed.page({ title: 'Title and opening', parent: [ed.E('film'), 'Film'], blocks: [
      tc,
      groupHead('Title card'),
      form(
        text('Title', c.hero, 'title', { max: 40, cap: 'words', onInput: up, required: () => occById(u.occ).title }),
        text('Line under the name', c.hero, 'line', { area: true, max: 220, onInput: up })),
      groupHead('Ticket'),
      form(text('Tagline', c.gate, 'tagline', { area: true, max: 140, hint: 'Printed on the ticket before the film starts.' })),
      groupHead('Studio'),
      form(
        text('Studio name', u, 'studio', { max: 36, cap: 'words', onInput: up, required: () => studioFor(u.me.name) }),
        text('World name', u, 'scope', { max: 28, cap: 'words', onInput: up, required: () => scopeFor(u.them.name), hint: 'The film opens with “Studio presents · in World”.' })),
      groupHead('Cast'),
      form(
        text(`${u.them.name}, as…`, c.hero, 'themCap', { max: 50, ph: 'the birthday star' }),
        text(`${u.me.name}, as…`, c.hero, 'meCap', { max: 50, ph: 'the one who made this' })),
      groupFoot('The captions under each character when the cast is introduced.'),
      groupHead('The small words'),
      form(
        text('After the studio’s name', c.gate, 'presents', { max: 24, cap: 'none', ph: GW.presents, hint: `As in “${u.studio} ${GW.presents}”, on the ident, the poster and the map.` }),
        text('Who it’s for', c.gate, 'forLine', { max: 60, cap: 'none', ph: GW.forLine }),
        text('Who it’s from', c.gate, 'fromLine', { max: 60, cap: 'none', ph: GW.fromLine }),
        text('Title card line', c.hero, 'scope', { max: 80, cap: 'none', ph: '{studio} presents · in {scope}', onInput: up, hint: 'A “·” splits it in two.' })),
      groupFoot('Leave one empty to use the words shown in grey.'),
    ] });
  },

  commentary(ed) {
    const { u, text, form } = ed, C = u.copy.commentary;
    const parts = [['hero', 'The title card'], ['ch1', 'Chapter one'], ['log', 'Mission log'], ['stats', 'The numbers'], ['hill', 'The hill'], ['chords', 'Say it in chords'],
      ['catch', 'Catch the stars'], ['cake', u.copy.film.cake.mode === 'light' ? 'The candles' : 'The cake'], ['letter', 'The letter'], ['epilogue', 'Epilogue'], ['credits', 'Credits']];
    return ed.page({ title: 'Director’s commentary', intro: `Little notes from you, the director. ${u.them.name} sees them beside each scene after switching commentary on in the film.`, parent: [ed.E('film'), 'Film'], blocks: [
      groupHead('Notes, scene by scene'),
      form(...parts.map(([k, l]) => text(l, C, k, { area: true, max: 300, ph: 'No note here' }))),
      groupFoot('Leave a scene empty and it simply has no note.'),
    ] });
  },

  chapters(ed) {
    const { u, text, form } = ed, F = u.copy.film;
    const ch = (label, o, ph) => [groupHead(label), form(text('Title', o, 'title', { max: 40, cap: 'words', ph }), text('Subtitle', o, 'sub', { area: true, max: 100 }))];
    return ed.page({ title: 'Chapter titles', intro: 'Title cards between the scenes, like an old film.', parent: [ed.E('film'), 'Film'], blocks: [
      ...ch('Chapter one', F.ch1, 'Once upon a time'), ...ch('Chapter two', F.ch2, 'Lately'), ...ch('Epilogue', F.epi, 'Epilogue'),
    ] });
  },

  log(ed) {
    const { u, text, form } = ed, L = u.copy.film.log;
    const status = [['', 'None'], ['warn', 'Amber'], ['ok', 'Green']];
    const preview = r => h('span', { class: 'ed-log' }, h('span', { class: 'ed-log-d', text: previewFill(u, r.d) || '—' }),
      h('span', { class: 'ed-log-t' + (r.t ? '' : ' empty'), text: previewFill(u, r.t) || 'Empty entry' }), r.c ? h('i', { class: 'ed-dot ' + r.c, 'aria-label': r.c === 'ok' ? 'Green light' : 'Amber light' }) : null);
    const L1 = ed.list({ items: L.rows, noun: 'entry', title: 'Entries', addLabel: 'Add an entry', min: 1, max: 8,
      item: i => ({ main: preview(L.rows[i]), open: () => editRow(L.rows[i]) }),
      onAdd: () => { const r = { d: '', t: '', c: '' }; L.rows.push(r); ed.save(); L1.draw(); editRow(r, true); },
      foot: 'A short time label, what happened, and an optional status light.' });
    function editRow(r, isNew) {
      ed.editSheet({ title: isNew ? 'New entry' : 'Entry', focus: isNew, fields: [
        text('Time label', r, 'd', { max: 24, mono: true, cap: 'characters', ph: 'NOW', hint: 'Short and in capitals works best.', required: 'NOW' }),
        text('What happened', r, 't', { area: true, max: 160, ph: 'Crew decides one wish isn’t enough.' }),
        ed.segField('Status light', status, r.c || '', v => { r.c = v; }),
      ], onDelete: L.rows.length > 1 ? () => { const i = L.rows.indexOf(r); if (i >= 0) { L.rows.splice(i, 1); L1.draw(); ed.commit('Entry deleted', { icon: 'trash-2' }); } } : null, deleteLabel: 'Delete entry',
      onClose: () => { const i = L.rows.indexOf(r); if (i >= 0 && !r.t.trim() && L.rows.length > 1) { L.rows.splice(i, 1); ed.save(); } else if (i >= 0 && !r.d.trim()) { r.d = 'NOW'; ed.save(); } L1.draw(); } });
    }
    return ed.page({ title: 'Mission log', intro: 'A flight record of how this universe came to be.', parent: [ed.E('film'), 'Film'], blocks: [
      groupHead('Heading'),
      form(text('Small heading', L, 'kicker', { max: 30 }), text('Title', L, 'title', { max: 70 }), text('Intro', L, 'lede', { area: true, max: 320 })),
      L1.el,
    ] });
  },

  stats(ed) {
    const { u, text, form } = ed, S = u.copy.film.stats;
    const dim = h('div', { class: 'ed-dimmable' + (S.on === false ? ' off' : '') });
    const fields = S.list.map(st => {
      if (st.k === 'fixed') return [text('Your own number', st, 'v', { max: 14, ph: '1' }), text('What it counts', st, 'l', { area: true, max: 80 })];
      const now = statNow(u, st.k);
      return text(`${STAT_KIND[st.k] || 'Number'} (${now != null ? `${now} right now` : 'worked out from the date'})`, st, 'l', { area: true, max: 80 });
    }).flat();
    dim.append(groupHead('Text with the numbers'), form(text('Intro', S, 'lede', { area: true, max: 320 })), groupHead('Labels'), form(...fields),
      groupFoot('The numbers are calculated from the date every time it plays, so they’re always right. You choose the words under them.'));
    return ed.page({ title: 'The numbers', parent: [ed.E('film'), 'Film'], blocks: [
      group(ed.switchRow({ title: 'Show the numbers', emoji: 'milky_way', get: () => S.on !== false, set: v => { S.on = v; dim.classList.toggle('off', !v); } })),
      dim,
    ] });
  },

  hill: ed => scene(ed, 'hill', 'The hill', 'night_with_stars', 'A purple sky, one streetlamp and two friends in propeller hats.'),
  chords: ed => scene(ed, 'chords', 'Say it in chords', 'musical_notes', 'A message, translated into chords.', (F, text) => [
    groupHead('Message'),
    ed.form(text('Message to translate', F.chords, 'message', { max: 60, cap: 'none', hint: 'It’s typed in when the scene opens. They can change it.' })),
  ]),
  catch: ed => scene(ed, 'catch', 'Catch the stars', 'shooting_star', 'Falling stars, each carrying a wish.', F => {
    const W = F.catch.wishes;
    const L = ed.list({ items: W, noun: 'wish', title: 'Wishes', fixed: W.length >= 12, addLabel: W.length < 12 ? 'Add a wish' : null, max: 12, make: () => '',
      item: i => ({ top: true, lead: numBadge(i), main: inlineStr(ed, W, i, { ph: 'A wish', max: 140, label: `Wish ${i + 1}` }) }),
      foot: 'One wish rides on each of the twelve falling stars. Drag to change the order.' });
    return [L.el];
  }),
  cake(ed) {
    const { u, text } = ed, K = u.copy.film.cake;
    const refs = {};
    return scene(ed, 'cake', K.mode === 'light' ? 'The candles' : 'The cake', K.mode === 'light' ? 'candle' : 'birthday_cake', 'Five candles, and a moment to pause.', () => {
      const f = {
        kicker: refs.kicker = text('Small heading', K, 'kicker', { max: 50 }),
        big: refs.big = text('Instruction', K, 'big', { area: true, max: 120 }),
        small: refs.small = text('Hint', K, 'small', { area: true, max: 160 }),
      };
      return [
        groupHead('What they do'),
        ed.form(ed.segField('Candles', [['blow', 'Blow them out'], ['light', 'Light them']], K.mode, v => {
          const prev = K.mode; K.mode = v;
          for (const k of ['kicker', 'big', 'small']) if (!K[k] || K[k] === CAKE[prev]?.[k]) refs[k].set(CAKE[v][k]);
        })),
        groupHead('Words'),
        ed.form(f.kicker, f.big, f.small, text('When it’s done', K, 'done', { max: 80 })),
      ];
    }, { ownWords: true });
  },

  epilogue(ed) {
    const { u, text, form } = ed, T = u.copy.film.timelines;
    const dim = h('div', { class: 'ed-dimmable' + (T.on === false ? ' off' : '') });
    const column = (label, col) => {
      const L = ed.list({ items: col.rows, noun: 'moment', title: 'Moments', addLabel: 'Add a moment', min: 1, max: 6, make: () => ({ t: '', x: '' }),
        item: i => ({ top: true, main: h('div', { class: 'ed-tlr' },
          inline(col.rows[i], 't', { ph: 'When', max: 30, cls: 'ed-tlr-t', label: `Time ${i + 1}`, cap: 'words' }),
          inline(col.rows[i], 'x', { area: true, ph: 'What happens', max: 140, label: `Moment ${i + 1}` })) }) });
      ed.onLeave(() => { for (let i = col.rows.length - 1; i >= 0 && col.rows.length > 1; i--) if (!col.rows[i].t.trim() && !col.rows[i].x.trim()) { col.rows.splice(i, 1); ed.save(); } });
      return [groupHead(label), form(text('Column title', col, 'title', { max: 40, cap: 'words' })), L.el];
    };
    const inline = (o, k, opt) => ed.inline(o, k, opt);
    dim.append(...column('First column', T.a), ...column('Second column', T.b),
      groupHead('After the timelines'),
      form(text('Closing line', T, 'closing', { area: true, max: 200 }), text('Extra line', T, 'redeem', { area: true, max: 200, ph: 'Optional' })));
    return ed.page({ title: 'Epilogue', intro: 'Two timelines side by side: how it went, and how it could go.', parent: [ed.E('film'), 'Film'], blocks: [
      group(ed.switchRow({ title: 'Show the epilogue', emoji: 'hourglass_not_done', get: () => T.on !== false, set: v => { T.on = v; dim.classList.toggle('off', !v); } })),
      dim,
    ] });
  },

  credits(ed) {
    const { u, text, form } = ed, F = u.copy.film, C = F.credits;
    const preview = c => h('span', { class: 'ed-cr' }, h('small', { text: previewFill(u, c.role) || 'Role' }), h('b', { text: previewFill(u, c.name) || 'Name' }), c.note ? h('em', { text: previewFill(u, c.note) }) : null);
    const L = ed.list({ items: C, noun: 'credit', title: 'Names', addLabel: 'Add a credit', min: 1, max: 14,
      item: i => ({ main: preview(C[i]), open: () => edit(C[i]) }),
      onAdd: () => { const c = { role: '', name: '', note: '' }; C.push(c); ed.save(); L.draw(); edit(c, true); } });
    function edit(c, isNew) {
      ed.editSheet({ title: isNew ? 'New credit' : 'Credit', focus: isNew, fields: [
        text('Role', c, 'role', { max: 40, ph: 'Special thanks' }), text('Name', c, 'name', { max: 80, cap: 'words', ph: 'Everyone at the Thursday table' }), text('Note', c, 'note', { max: 80, ph: 'Optional' })],
      onDelete: C.length > 1 ? () => { const i = C.indexOf(c); if (i >= 0) { C.splice(i, 1); L.draw(); ed.commit('Credit deleted', { icon: 'trash-2' }); } } : null, deleteLabel: 'Delete credit',
      onClose: () => { const i = C.indexOf(c); if (i >= 0 && !c.role.trim() && !c.name.trim() && C.length > 1) { C.splice(i, 1); ed.save(); } L.draw(); } });
    }
    return ed.page({ title: 'Credits', intro: 'Who did what, in order of appearance.', parent: [ed.E('film'), 'Film'], blocks: [
      L.el,
      groupHead('Small print'),
      form(text('Disclaimer', F, 'disclaimer', { area: true, max: 200 })),
      groupHead('After the credits'),
      form(text('Title', F.post, 'title', { max: 60 }), text('Text', F.post, 'lede', { area: true, max: 320 })),
      groupFoot('The scene after the credits leads into the rest of the universe.'),
    ] });
  },
};

// A film scene: a switch to show it, its words, and anything extra.
function scene(ed, key, title, emoji, intro, extra, { ownWords = false } = {}) {
  const { u, text, form } = ed, S = u.copy.film[key];
  const dim = h('div', { class: 'ed-dimmable' + (S.on === false ? ' off' : '') });
  if (!ownWords) dim.append(groupHead('Words'), form(text('Small heading', S, 'kicker', { max: 50 }), text('Title', S, 'title', { area: true, max: 90 }), text('Description', S, 'lede', { area: true, max: 360 })));
  if (extra) dim.append(...extra(u.copy.film, text));
  return ed.page({ title, intro, parent: [ed.E('film'), 'Film'], blocks: [
    group(ed.switchRow({ title: 'Show this scene', emoji, get: () => S.on !== false, set: v => { S.on = v; dim.classList.toggle('off', !v); } })),
    dim,
  ] });
}

// A textarea bound to a string inside an array (reasons, wishes, finale lines).
function inlineStr(ed, arr, i, { ph, max = 200, label, upper }) {
  const t = h('textarea', { class: 'ed-in ed-grow', rows: 1, maxlength: max, placeholder: ph, 'aria-label': label, autocapitalize: 'sentences', enterkeyhint: 'done' });
  t.value = arr[i] ?? '';
  t.addEventListener('input', () => { if (upper) t.value = t.value.toUpperCase(); arr[i] = t.value; grow(t); ed.save(); });
  t.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); t.blur(); } });
  return t;
}
function dropEmptyStrings(ed, arr, min = 1) {
  ed.onLeave(() => { for (let i = arr.length - 1; i >= 0 && arr.length > min; i--) if (!String(arr[i] || '').trim()) { arr.splice(i, 1); ed.save(); } });
}

/* =====================================================================
   The letter
   ===================================================================== */
function paperEditor(ed, obj, key, { sigObj, sigKey, label, ph, onInput } = {}) {
  const ta = h('textarea', { class: 'inp letter ed-grow ed-paper-ta', maxlength: 8000, 'aria-label': label, placeholder: ph, autocapitalize: 'sentences' });
  ta.value = obj[key] ?? '';
  ta.addEventListener('input', () => { obj[key] = ta.value; grow(ta); onInput && onInput(ta.value); ed.save(); });
  let sig = null;
  if (sigObj) {
    sig = h('input', { class: 'ed-sig', type: 'text', maxlength: 60, 'aria-label': 'Signature', placeholder: '— Your name', autocapitalize: 'sentences', autocomplete: 'off', enterkeyhint: 'done' });
    sig.value = sigObj[sigKey] ?? '';
    sig.addEventListener('input', () => { sigObj[sigKey] = sig.value; ed.save(); });
    sig.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sig.blur(); } });
  }
  return h('div', { class: 'ed-paper' }, ta, sig);
}

function secLetter(ed) {
  const { u, E, text, form } = ed, L = u.copy.film.letter;
  const gentle = u.rel === 'memorial' || u.occ === 'remembrance';
  const wc = h('span');
  const count = () => { const n = words(L.body); wc.textContent = n ? `${plural(n, 'word')}, about ${Math.round(n / 200) <= 1 ? 'a minute' : plural(Math.round(n / 200), 'minute')} to read` : 'An empty page. Start with their name.'; };
  count();
  const fromFilm = ed.route.from && ed.route.from.section === 'film' && !ed.route.from.sub;
  const tip = gentle
    ? 'Specific is better than perfect. A saying, a habit, the smell of a kitchen: small things carry the most.'
    : `Name one real moment. A place, a joke only the two of you get, something ${u.them.name} said once. Specific beats poetic.`;
  return ed.page({ title: 'The letter', intro: `The letter in the film, from ${u.me.name} to ${u.them.name}.`, backHref: fromFilm ? E('film') : null, backLabel: fromFilm ? 'Film' : null, blocks: [
    paperEditor(ed, L, 'body', { sigObj: L, sigKey: 'sig', label: `Letter to ${u.them.name}`, ph: `${u.them.name},\n\n`, onInput: count }),
    h('p', { class: 'ed-wc' }, ic('pencil', 's'), wc),
    h('div', { class: 'ed-tip' }, h('p', {}, h('b', { text: 'A tip: ' }), tip)),
    groupHead('In the film'),
    form(text('Heading above the letter', L, 'kicker', { max: 60, ph: 'A letter, delivered by probe' })),
    h('div', { style: { height: '14px' } }),
    group(ed.switchRow({ title: 'Show the letter in the film', emoji: 'memo', get: () => L.on !== false, set: v => { L.on = v; } })),
  ] });
}

/* =====================================================================
   Open When… letters
   ===================================================================== */
function lockLine(l) {
  if (l.lock?.date) return `Sealed until ${fmtISO(l.lock.date)}`;
  if (l.lock?.stamps) return `Opens at ${plural(l.lock.stamps, 'stamp')}`;
  if (l.breathe) return 'With a breathing exercise';
  return firstText(l.body) || 'Nothing written yet';
}
function miniEnv(l) {
  const [ink, pap] = ENVELOPE[l.color] || ENVELOPE.gold;
  return h('span', { class: 'ed-menv', style: { '--ink': ink, '--pap': pap }, 'aria-hidden': 'true' }, l.lock ? ic('lock', 's') : null);
}

function secMail(ed, sub) {
  if (sub) return mailLetter(ed, sub);
  const { u, E, text, form } = ed, Ls = u.copy.letters, items = Ls.items;
  const L = ed.list({ items, noun: 'letter', title: 'Letters', addLabel: 'Write a new letter', min: 1, max: 16,
    item: i => { const l = items[i]; return { lead: miniEnv(l), main: rowText(`Open when ${l.when || '…'}`, lockLine(l)), href: E(`mail/${l.id}`) }; },
    onAdd: async () => {
      const used = items.map(x => x.color);
      const color = ['gold', 'lilac', 'rose', 'mint'].sort((a, b) => used.filter(x => x === a).length - used.filter(x => x === b).length)[0];
      const l = { id: uid('l'), when: '', color, body: '' };
      items.push(l); await ed.write(); ed.ctx.go(E(`mail/${l.id}`));
    },
    del: { confirm: l => ({ title: 'Delete this letter?', message: `“Open when ${l.when || '…'}” will be removed from ${u.them.name}’s universe. This can’t be undone.`, confirm: 'Delete letter', danger: true }) },
    foot: 'Sealed letters stay closed until their date, or until enough passport stamps are collected.' });
  return ed.page({ title: __wt(u, 'mail'), intro: `Letters for specific moments. ${u.them.name} opens each one when the moment comes.`, blocks: [
    groupHead('Heading'),
    form(text('Title', Ls, 'title', { max: 40, cap: 'words', required: 'Letters for later' }), text('Intro', Ls, 'lede', { area: true, max: 300 })),
    L.el,
  ] });
}

function envelopePreview(u, l) {
  const lab = h('span', { class: 'ed-env-l' }), seal = h('span', { class: 'ed-env-seal' }), state = h('span', { class: 'ed-env-s' });
  const el = h('div', { class: 'ed-env', role: 'img' }, h('span', { class: 'ed-env-back' }), h('span', { class: 'ed-env-flap' }), h('span', { class: 'ed-env-to', text: `For ${u.them.name}` }), seal, lab, state);
  el.update = () => {
    const [ink, pap] = ENVELOPE[l.color] || ENVELOPE.gold;
    el.style.setProperty('--ink', ink); el.style.setProperty('--pap', pap);
    lab.textContent = `Open when ${l.when || '…'}`;
    seal.replaceChildren(l.lock ? ic('lock', 's') : ic('heart', 's'));
    state.textContent = l.lock ? lockLine(l) : '';
    state.hidden = !l.lock;
    el.setAttribute('aria-label', `Envelope: open when ${l.when || '…'}${l.lock ? '. ' + lockLine(l) : ''}`);
  };
  el.update();
  return el;
}

function mailLetter(ed, id) {
  const { u, E, text, form } = ed, items = u.copy.letters.items;
  const l = items.find(x => x.id === id);
  if (!l) return ed.message({ emoji: 'love_letter', title: 'This letter is gone', text: 'It may have been deleted. Your other letters are still there.', parent: [E('mail'), 'Letters'] });
  const env = envelopePreview(u, l);
  const isNew = !l.when && !l.body;

  // color swatches
  const sw = h('div', { class: 'ed-sw4', role: 'radiogroup', 'aria-label': 'Envelope color' });
  const paintSw = () => sw.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.c === (l.color || 'gold'))));
  for (const [k, [ink, , name]] of Object.entries(ENVELOPE)) sw.append(h('button', { type: 'button', role: 'radio', 'data-c': k, 'aria-label': name, onclick: () => { l.color = k; paintSw(); env.update(); haptic('select'); ed.save(); } }, h('i', { style: { background: ink } }), h('span', { text: name })));
  paintSw();

  // seal
  const total = totalStamps(u);
  const detail = h('div', { class: 'ed-lockd' });
  const mode = () => (l.lock?.date ? 'date' : l.lock?.stamps ? 'stamps' : 'none');
  function paintLock() {
    const m = mode();
    if (m === 'none') { detail.replaceChildren(h('p', { class: 'ed-fh', text: 'Ready to open any time.' })); return; }
    if (m === 'date') {
      const di = h('input', { class: 'inp ed-date', type: 'date', value: l.lock.date, 'aria-label': 'Sealed until' });
      di.addEventListener('change', () => { if (di.value) { l.lock = { date: di.value }; env.update(); ed.save(); note.textContent = dateNote(); } });
      const dateNote = () => l.lock.date <= todayISO() ? 'That date has passed, so it opens right away.' : `Stays sealed until ${fmtISO(l.lock.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.`;
      const note = h('p', { class: 'ed-fh', text: dateNote() });
      detail.replaceChildren(di, note);
      return;
    }
    const n = h('b', { text: plural(l.lock.stamps, 'stamp') });
    const note = h('p', { class: 'ed-fh' });
    const paintN = () => { n.textContent = plural(l.lock.stamps, 'stamp'); minus.disabled = l.lock.stamps <= 1; plus.disabled = l.lock.stamps >= 30; note.textContent = l.lock.stamps > total ? `There are only ${total} stamps in this universe right now, so this would never open.` : `There are ${total} stamps to collect in this universe.`; note.classList.toggle('warn', l.lock.stamps > total); };
    const step = d => { l.lock = { stamps: Math.min(30, Math.max(1, l.lock.stamps + d)) }; paintN(); env.update(); haptic('select'); ed.save(); };
    const minus = h('button', { class: 'icon-b', type: 'button', 'aria-label': 'One fewer stamp', onclick: () => step(-1) }, ic('minus', 's'));
    const plus = h('button', { class: 'icon-b', type: 'button', 'aria-label': 'One more stamp', onclick: () => step(1) }, ic('plus', 's'));
    paintN();
    detail.replaceChildren(h('div', { class: 'ed-step' }, minus, h('span', { class: 'ed-step-v', role: 'status' }, n), plus), note);
  }
  const lockSeg = seg([['none', 'No seal'], ['date', 'Until a date'], ['stamps', 'After stamps']], mode(), v => {
    if (v === 'none') delete l.lock;
    if (v === 'date') { const d = info(u.date, true).next; l.lock = { date: isoOf(d) <= todayISO() ? isoOf(new Date(Date.now() + 30 * 864e5)) : isoOf(d) }; }
    if (v === 'stamps') l.lock = { stamps: Math.min(12, Math.max(3, total - 2)) };
    paintLock(); env.update(); ed.save();
  });
  paintLock();

  ed.onLeave(() => { const i = items.indexOf(l); if (i >= 0 && !l.when.trim() && !l.body.trim() && items.length > 1) { items.splice(i, 1); ed.save(); } });
  const whenF = text('Open when…', l, 'when', { max: 60, cap: 'none', ph: 'you can’t sleep', onInput: () => env.update(), tokens: false });
  if (isNew) setTimeout(() => whenF.input.focus(), 420);

  const out = ed.page({ title: 'Letter', large: false, parent: [E('mail'), 'Letters'], blocks: [
    h('div', { class: 'ed-env-wrap' }, env),
    form(whenF, h('div', { class: 'ed-f' }, h('span', { class: 'ed-lab', text: 'Envelope' }), sw)),
    groupHead('Letter'),
    paperEditor(ed, l, 'body', { label: `Open when ${l.when}`, ph: `Dear ${u.them.name},\n\n` }),
    groupHead('Seal'),
    h('div', { class: 'group ed-form' }, h('div', { class: 'ed-f' }, lockSeg, detail)),
    h('div', { style: { height: '14px' } }),
    group(ed.switchRow({ title: 'Breathing exercise', sub: 'A star to breathe along with', emoji: 'crescent_moon', get: () => !!l.breathe, set: v => { if (v) l.breathe = true; else delete l.breathe; } })),
    groupFoot('Good for letters about sleepless nights or hard days.'),
    h('div', { style: { height: '10px' } }),
    group(row({ icon: 'trash-2', title: 'Delete letter', danger: true, chevron: false, onclick: async () => {
      if (items.length <= 1) { toast('Keep at least one letter', { icon: 'info' }); return; }
      if (!(await confirmSheet({ title: 'Delete this letter?', message: `“Open when ${l.when || '…'}” will be removed. This can’t be undone.`, confirm: 'Delete letter', danger: true }))) return;
      const i = items.indexOf(l); if (i >= 0) items.splice(i, 1);
      await ed.commit('Letter deleted', { icon: 'trash-2' });
      ed.ctx.replace(E('mail'));
    } })),
  ] });
  return out;
}

/* =====================================================================
   Coupons (or promises)
   ===================================================================== */
function ticket(u, c) {
  const C = u.copy.coupons;
  const ico = h('span', { class: 'ed-tkt-ico' }), k = h('p', { class: 'ed-tkt-k' }), t = h('p', { class: 'ed-tkt-t' }), f = h('p', { class: 'ed-tkt-f' }), v = h('span', { class: 'ed-tkt-void', text: 'VOID', 'aria-hidden': 'true' });
  const el = h('div', { class: 'ed-tkt', role: 'img' }, h('span', { class: 'ed-tkt-stub' }, ico), h('span', { class: 'ed-tkt-body' }, k, t, f), v);
  el.update = () => {
    const promise = C.mode === 'promise';
    ico.textContent = c.icon || '🎁';
    k.textContent = promise ? 'We promise' : c.void ? 'Cancelled by the issuer' : 'Good for';
    t.textContent = c.title || (promise ? 'A promise' : 'Something lovely');
    f.textContent = c.fine || '';
    el.classList.toggle('void', !!c.void && !promise);
    el.classList.toggle('promise', promise);
    el.setAttribute('aria-label', `${k.textContent}: ${t.textContent}`);
  };
  el.update();
  return el;
}

function secCoupons(ed, sub) {
  if (sub) return couponPage(ed, sub);
  const { u, E, text, form } = ed, C = u.copy.coupons, items = C.items;
  const noun = () => (C.mode === 'promise' ? 'promise' : 'coupon');
  const L = ed.list({ items, noun, title: 'Items', addLabel: () => `Add a ${noun()}`, min: 1, max: 16,
    item: i => { const c = items[i]; return { lead: h('span', { class: 'ed-cpi', 'aria-hidden': 'true', text: c.icon || '🎁' }), main: rowText(c.title || 'Untitled', c.fine, c.void && C.mode !== 'promise' ? h('span', { class: 'pill ed-voidp', text: 'Void' }) : null), href: E(`coupons/${c.id}`) }; },
    onAdd: async () => { const c = { id: uid('c'), title: '', fine: '', icon: '🎁' }; items.push(c); await ed.write(); ed.ctx.go(E(`coupons/${c.id}`)); } });
  const titleF = text('Title', C, 'title', { max: 40, cap: 'words', required: () => (C.mode === 'promise' ? 'Promises we’re keeping' : 'The Coupon Book') });
  const foot = h('p', { class: 'group-f' });
  const paintFoot = () => { foot.textContent = C.mode === 'promise' ? 'Promises are revealed one at a time and kept for good.' : 'Coupons are scratched to reveal, then redeemed for real.'; };
  paintFoot();
  return ed.page({ title: __wt(u, 'coupons'), intro: C.mode === 'promise' ? 'Things you’ll keep doing, revealed one at a time.' : 'Small, real things to scratch off and redeem.', blocks: [
    groupHead('Kind'),
    form(h('div', { class: 'ed-f ed-segf' }, seg([['coupon', 'Coupons'], ['promise', 'Promises']], C.mode === 'promise' ? 'promise' : 'coupon', v => { C.mode = v; L.draw(); paintFoot(); ed.save(); }))),
    foot,
    groupHead('Heading'),
    form(titleF, text('Intro', C, 'lede', { area: true, max: 320 })),
    L.el,
  ] });
}

function couponPage(ed, id) {
  const { u, E, text, form } = ed, C = u.copy.coupons, items = C.items;
  const c = items.find(x => x.id === id);
  const kind = C.mode === 'promise' ? 'promise' : 'coupon';
  if (!c) return ed.message({ emoji: 'admission_tickets', title: `This ${kind} is gone`, text: 'It may have been deleted.', parent: [E('coupons'), cap1(kind) + 's'] });
  const tk = ticket(u, c);
  const up = () => tk.update();
  const grid = h('div', { class: 'ed-emoji', role: 'radiogroup', 'aria-label': 'Icon' });
  const set = [...new Set([c.icon, ...COUPON_EMOJI].filter(Boolean))].slice(0, 24);
  const paint = () => grid.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.e === c.icon)));
  for (const e of set) grid.append(h('button', { type: 'button', role: 'radio', 'data-e': e, 'aria-label': e, text: e, onclick: () => { c.icon = e; paint(); up(); haptic('select'); ed.save(); } }));
  paint();
  const titleF = text(kind === 'promise' ? 'The promise' : 'Good for', c, 'title', { area: true, max: 90, onInput: up, ph: kind === 'promise' ? 'We’ll keep the garden going' : 'One movie night. You pick.' });
  if (!c.title) setTimeout(() => titleF.input.focus(), 420);
  ed.onLeave(() => { const i = items.indexOf(c); if (i >= 0 && !c.title.trim() && !c.fine.trim() && items.length > 1) { items.splice(i, 1); ed.save(); } });
  return ed.page({ title: cap1(kind), large: false, parent: [E('coupons'), kind === 'promise' ? 'Promises' : 'Coupons'], blocks: [
    h('div', { class: 'ed-tkt-wrap' }, tk),
    form(titleF, text(kind === 'promise' ? 'A little more' : 'Fine print', c, 'fine', { area: true, max: 140, onInput: up, ph: 'Optional' })),
    groupHead('Icon'),
    h('div', { class: 'group ed-emoji-g' }, grid),
    kind === 'coupon' ? h('div', { style: { height: '14px' } }) : null,
    kind === 'coupon' ? group(ed.switchRow({ title: 'Make it void', sub: 'A joke coupon, stamped VOID', emoji: 'locked', get: () => !!c.void, set: v => { if (v) c.void = true; else delete c.void; up(); } })) : null,
    kind === 'coupon' ? groupFoot('Scratching a void coupon gets a laugh, not a prize.') : null,
    h('div', { style: { height: '10px' } }),
    group(row({ icon: 'trash-2', title: `Delete ${kind}`, danger: true, chevron: false, onclick: async () => {
      if (items.length <= 1) { toast(`Keep at least one ${kind}`, { icon: 'info' }); return; }
      if (!(await confirmSheet({ title: `Delete this ${kind}?`, message: `“${c.title || 'Untitled'}” will be removed.`, confirm: `Delete ${kind}`, danger: true }))) return;
      const i = items.indexOf(c); if (i >= 0) items.splice(i, 1);
      await ed.commit(`${cap1(kind)} deleted`, { icon: 'trash-2' });
      ed.ctx.replace(E('coupons'));
    } })),
  ] });
}

/* =====================================================================
   Reasons
   ===================================================================== */
function secReasons(ed) {
  const { u, text, form } = ed, R = u.copy.reasons, items = R.items;
  const L = ed.list({ items, noun: 'reason', title: 'Cards', addLabel: 'Add a reason', min: 1, max: 40, make: () => '',
    item: i => ({ top: true, lead: numBadge(i), main: inlineStr(ed, items, i, { ph: 'Something true', max: 160, label: `Reason ${i + 1}` }) }),
    onChange: () => {}, foot: 'Each reason is one card in the deck. Short and specific works best.' });
  dropEmptyStrings(ed, items);
  return ed.page({ title: __wt(u, 'reasons'), intro: `A deck of cards for ${u.them.name}. Each one says something true.`, blocks: [
    groupHead('Heading'),
    form(text('Title', R, 'title', { max: 40, cap: 'words', required: 'Reasons' })),
    L.el,
  ] });
}

/* =====================================================================
   Memory Lane
   ===================================================================== */
async function choosePhoto() {
  const file = await pickFile('image/*');
  if (!file) return null;
  if (!/^image\//.test(file.type || 'image/')) { toast('That file isn’t a photo', { icon: 'info' }); return null; }
  const blob = await compressImage(file);
  return db.putMedia(blob, { name: file.name || 'photo.jpg' });
}
async function paintThumb(el, ref, empty) {
  const url = ref ? await mediaURL(ref) : null;
  if (url) {
    const img = h('img', { src: url, alt: '', decoding: 'async' });
    img.addEventListener('error', () => el.replaceChildren(...empty()), { once: true });
    el.replaceChildren(img);
  } else el.replaceChildren(...empty());
  el.classList.toggle('has', !!url);
}
function photoActions(title, { onReplace, onRemove }) {
  const close = sheet({ title, body: h('div', { class: 'ed-sh' },
    group(row({ icon: 'image', title: 'Replace photo', onclick: () => { close(); onReplace(); } }),
      row({ icon: 'trash-2', title: 'Remove photo', danger: true, chevron: false, onclick: () => { close(); onRemove(); } }))) });
}

function secMemories(ed) {
  const { u, text, form } = ed, M = u.copy.memories, items = M.items;
  const card = m => {
    const ph = h('button', { class: 'ed-ph', type: 'button' });
    const empty = () => [ic('camera'), h('span', { text: 'Add photo' })];
    const paint = () => { ph.setAttribute('aria-label', m.photo ? 'Change photo' : 'Add photo'); paintThumb(ph, m.photo, empty); };
    const pick = async () => { const ref = await choosePhoto(); if (!ref) return; const old = m.photo; m.photo = ref; paint(); await ed.commit(old ? 'Photo replaced' : 'Photo added'); dropSafe(old); };
    ph.addEventListener('click', () => {
      if (ph.closest('.ed-list.editing')) return;
      haptic('light');
      if (!m.photo) return pick();
      photoActions('Photo', { onReplace: pick, onRemove: async () => { const old = m.photo; m.photo = null; paint(); await ed.commit('Photo removed', { icon: 'trash-2' }); dropSafe(old); } });
    });
    paint();
    return h('div', { class: 'ed-mem' }, ph, h('div', { class: 'ed-mem-f' },
      ed.inline(m, 'caption', { area: true, ph: 'What happened?', max: 160, label: 'Caption' }),
      ed.inline(m, 'when', { ph: 'When was this?', max: 40, cls: 'ed-mem-when', label: 'When', cap: 'words' })));
  };
  const L = ed.list({ items, noun: 'moment', title: 'Moments', addLabel: 'Add a moment', min: 1, max: 30, make: () => ({ id: uid('m'), caption: '', when: '', photo: null }),
    item: i => ({ main: card(items[i]), cls: 'ed-memli' }),
    del: { confirm: m => (m.photo ? { title: 'Delete this moment?', message: 'Its photo will be removed too.', confirm: 'Delete moment', danger: true } : null), after: m => dropSafe(m.photo) },
    foot: 'Moments appear along the lane in this order. Photos stay on this phone and travel inside the gift.' });
  ed.onLeave(() => { for (let i = items.length - 1; i >= 0 && items.length > 1; i--) { const m = items[i]; if (!m.photo && !String(m.caption || '').trim() && !String(m.when || '').trim()) { items.splice(i, 1); ed.save(); } } });
  return ed.page({ title: __wt(u, 'memories'), intro: 'A scrapbook of moments, in the order they happened.', blocks: [
    groupHead('Heading'),
    form(text('Title', M, 'title', { max: 40, cap: 'words', required: 'Memory Lane' })),
    L.el,
  ] });
}

/* =====================================================================
   Word game
   ===================================================================== */
function tilesOf(w, cls = '') {
  return h('span', { class: 'ed-wt ' + cls, 'aria-label': w }, ...Array.from({ length: 5 }, (_, i) => h('i', { text: w[i] || '' })));
}
function tileInput(value, onInput) {
  const inp = h('input', { class: 'ed-tiles-in', type: 'text', maxlength: 5, autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', autocorrect: 'off', 'aria-label': 'Five-letter word', enterkeyhint: 'done' });
  inp.value = value || '';
  const tiles = Array.from({ length: 5 }, () => h('span', { class: 'ed-tile', 'aria-hidden': 'true' }));
  const el = h('label', { class: 'ed-tiles' }, ...tiles, inp);
  const paint = () => {
    const v = inp.value, f = document.activeElement === inp;
    tiles.forEach((t, i) => { const ch = v[i] || ''; t.textContent = ch; t.classList.toggle('on', !!ch); t.classList.toggle('bad', !!ch && !/[A-Z]/.test(ch)); t.classList.toggle('cur', f && i === Math.min(v.length, 4) && v.length < 5); });
  };
  inp.addEventListener('input', () => { const p = inp.selectionStart; const up = inp.value.toUpperCase(); if (up !== inp.value) { inp.value = up; try { inp.setSelectionRange(p, p); } catch {} } paint(); onInput(inp.value); });
  inp.addEventListener('focus', paint); inp.addEventListener('blur', paint);
  inp.addEventListener('keyup', paint); inp.addEventListener('click', paint);
  paint();
  el.input = inp;
  return el;
}

function secWordle(ed) {
  const { u } = ed, W = u.copy.words;
  const L = ed.list({ items: W, noun: 'word', title: 'Words', addLabel: 'Add a word', min: 3, max: 30,
    item: i => ({ lead: tilesOf(W[i].w), main: rowText(W[i].hint || 'No hint yet'), open: () => wordSheet(W[i]), cls: 'ed-wli' }),
    onAdd: () => wordSheet(null),
    foot: 'Six guesses per word, in any order. The game needs at least 3 words.' });
  function wordSheet(item) {
    const isNew = !item;
    const draft = { w: item ? item.w : '', hint: item ? item.hint || '' : '' };
    let touched = !isNew;
    const err = h('p', { class: 'ed-err', role: 'alert' });
    const check = (final) => {
      const v = draft.w.toUpperCase();
      let m = '';
      if (/[^A-Z]/.test(v)) m = 'Use the letters A to Z only. No spaces, numbers or accents.';
      else if (final || touched) {
        if (!v) m = 'Type a five-letter word.';
        else if (v.length < 5) m = `Five letters needed. That’s ${v.length}.`;
        else if (W.some(x => x !== item && x.w === v)) m = `${v} is already in the game.`;
      }
      err.textContent = m; err.hidden = !m;
      tiles.classList.toggle('invalid', !!m);
      return !m;
    };
    const tiles = tileInput(draft.w, v => { draft.w = v; if (v.length >= 5) touched = true; check(); });
    // edits in this sheet apply when you tap Save, so a half-typed word never reaches the game
    const scratch = ed.text('Hint', draft, 'hint', { area: true, max: 90, ph: 'Shown after a few guesses', nosave: true, tokens: false });
    const ff = h('div', { class: 'ed-f ed-wf' }, h('span', { class: 'ed-lab', text: 'Word' }), tiles, err);
    check();
    ed.editSheet({ title: isNew ? 'New word' : 'Edit word', done: isNew ? 'Add' : 'Save', focus: true, fields: [ff, scratch],
      onDone: () => {
        touched = true;
        if (!check(true)) { haptic('heavy'); tiles.input.focus(); return false; }
        const w = draft.w.toUpperCase(), hint = draft.hint.trim();
        if (isNew) W.push({ w, hint }); else { item.w = w; item.hint = hint; }
        L.draw();
        ed.commit(isNew ? `${w} added` : `${w} saved`);
        haptic('success');
      },
      onDelete: !isNew && W.length > 3 ? () => { const i = W.indexOf(item); if (i >= 0) { W.splice(i, 1); L.draw(); ed.commit('Word deleted', { icon: 'trash-2' }); } } : null, deleteLabel: 'Delete word' });
  }
  return ed.page({ title: __wt(u, 'wordle'), intro: `Five-letter words chosen for ${u.them.name}, with a hint for each.`, blocks: [L.el] });
}

/* =====================================================================
   Mixtape
   ===================================================================== */
function paintPlayButtons() {
  document.querySelectorAll('.ed-play').forEach(b => {
    const on = playing && b.dataset.id === playing && player && !player.paused;
    b.replaceChildren(ic(on ? 'pause' : 'play', 's'));
    b.setAttribute('aria-label', `${on ? 'Pause' : 'Play'} ${b.dataset.title}`);
    b.classList.toggle('on', !!on);
  });
}
async function togglePlay(t, volume = 1) {
  if (!player) {
    player = new Audio();
    player.preload = 'none';
    player.addEventListener('ended', () => { playing = null; paintPlayButtons(); });
    player.addEventListener('pause', paintPlayButtons);
    player.addEventListener('playing', paintPlayButtons);
  }
  player.volume = volume;
  if (playing === t.id && !player.paused) { player.pause(); return; }
  const url = t.media ? await mediaURL(t.media) : t.src;
  if (!url) { toast('This song couldn’t be found', { icon: 'info' }); return; }
  if (playing !== t.id) { player.src = url; playing = t.id; }
  try { await player.play(); } catch (e) { playing = null; paintPlayButtons(); if (e && e.name !== 'AbortError') toast('This song couldn’t play here', { icon: 'info' }); }
  paintPlayButtons();
}
const titleFromFile = name => (String(name || 'My song').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim() || 'My song').slice(0, 80);

function secMixtape(ed) {
  const { u, text, form } = ed, X = u.copy.mixtape, T = X.tracks;
  const vol = () => X.volume ?? MUSIC_VOLUME;
  const library = h('div');
  const L = ed.list({ items: T, noun: 'song', title: 'Songs', addLabel: 'Add your own song', max: 24,
    item: i => {
      const t = T[i];
      return {
        lead: h('button', { class: 'ed-play', type: 'button', 'data-id': t.id, 'data-title': t.title, onclick: e => { e.stopPropagation(); haptic('light'); togglePlay(t, vol()); } }, ic('play', 's')),
        main: rowText(t.title || 'Untitled', [t.artist, `side ${t.side || 'A'}`].filter(Boolean).join(', ').replace(/^side/, 'Side'), t.src ? h('span', { class: 'pill ed-expl', text: 'Library' }) : null),
        open: () => trackSheet(t),
      };
    },
    onAdd: addSong,
    del: { after: t => dropSafe(t.media) },
    onChange: () => { paintLibrary(); requestAnimationFrame(paintPlayButtons); },
    empty: 'No songs yet. Pick some from the library, or add one from your phone.',
    foot: 'Your own songs stay on this phone and travel inside the gift file.' });
  async function addSong() {
    const file = await pickFile('audio/*');
    if (!file) return;
    if (file.type && !/^audio\//.test(file.type)) { toast('That file isn’t a song', { icon: 'info' }); return; }
    if (file.size > 60e6) { toast('That song is too big. Try one under 60 MB.', { icon: 'info' }); return; }
    const media = await db.putMedia(file, { name: file.name });
    const a = T.filter(t => (t.side || 'A') === 'A').length;
    const t = { id: uid('t'), media, title: titleFromFile(file.name), artist: '', side: a <= T.length - a ? 'A' : 'B', note: '' };
    T.push(t);
    L.draw(); paintRestore();
    await ed.commit('Song added');
    haptic('success');
  }
  function trackSheet(t) {
    ed.editSheet({ title: 'Song', fields: [
      ed.text('Title', t, 'title', { max: 80, cap: 'words', required: 'Untitled', tokens: false }),
      ed.text('Artist', t, 'artist', { max: 80, cap: 'words', ph: 'Optional', tokens: false }),
      ed.segField('Side', [['A', 'Side A'], ['B', 'Side B']], t.side || 'A', v => { t.side = v; }),
      ed.text('Liner note', t, 'note', { area: true, max: 240, ph: 'Why this one?' })],
    onDelete: () => { const i = T.indexOf(t); if (i < 0) return; if (playing === t.id) player.pause(); T.splice(i, 1); L.draw(); paintLibrary(); ed.commit('Song removed', { icon: 'trash-2' }).then(() => dropSafe(t.media)); },
    deleteLabel: t.src ? 'Take it off the tape' : 'Remove song',
    onClose: () => L.draw() });
  }
  // The built-in library: switch any of its songs on or off the tape.
  const onTape = s => T.some(t => t.src === s.src);
  function paintLibrary() {
    library.replaceChildren(h('div', { style: { height: '14px' } }), group(row({ title: 'Song library', sub: `${SONGS.filter(onTape).length} of ${SONGS.length} on the tape. Calm lofi and piano, free to share.`, onclick: librarySheet })));
  }
  function librarySheet() {
    const rows = SONGS.map(s => h('div', { class: 'row-i ed-lib' },
      h('button', { class: 'ed-play', type: 'button', 'data-id': s.id, 'data-title': s.title, onclick: () => { haptic('light'); togglePlay(s, vol()); } }, ic('play', 's')),
      h('span', { class: 'ri-main' }, h('b', { text: s.title }), h('small', { text: `${s.kind} · ${s.artist}` })),
      toggle(onTape(s), async on => {
        if (on && !onTape(s)) T.push({ ...songTrack(s), id: T.some(t => t.id === s.id) ? uid('t') : s.id });
        if (!on) { const i = T.findIndex(t => t.src === s.src); if (i >= 0) T.splice(i, 1); }
        L.draw(); paintLibrary(); await ed.commit(on ? `“${s.title}” added` : `“${s.title}” taken off`);
      }, `${s.title} on the tape`)));
    sheet({ title: 'Song library', onClose: () => { if (player) player.pause(); }, body: h('div', { class: 'ed-sh' },
      h('p', { class: 'ed-rw-p', text: 'Public-domain recordings that come with Littleverse: lofi by HoliznaCC0, and Bach’s Goldberg Variations played by Kimiko Ishizaka.' }),
      h('div', { class: 'group' }, ...rows)) });
    requestAnimationFrame(paintPlayButtons);
  }
  paintLibrary();
  // how loud the soundtrack plays behind the film and the worlds
  const pct = h('span', { class: 'ed-rng-v' });
  const range = h('input', { class: 'ed-rng', type: 'range', min: 0, max: 100, step: 5, 'aria-label': 'Soundtrack volume' });
  range.value = String(Math.round(vol() * 100));
  const paintPct = () => { pct.textContent = range.value === '0' ? 'Off' : `${range.value}%`; };
  range.addEventListener('input', () => { X.volume = +range.value / 100; paintPct(); if (player) player.volume = X.volume; ed.save(); });
  paintPct();
  return ed.page({ title: 'The Mixtape', intro: 'The soundtrack: it plays behind the film and every world, and comes on a cassette with liner notes.', blocks: [
    groupHead('Cassette'),
    form(text('Tape title', X, 'title', { max: 60 }), text('Note', X, 'note', { area: true, max: 300 })),
    groupHead('Volume'),
    form(h('div', { class: 'ed-f ed-rngf' }, h('label', { class: 'ed-lab', text: 'Soundtrack volume' }), h('div', { class: 'ed-rngw' }, ic('volume-2', 's'), range, pct))),
    groupFoot('Tap a song’s play button to hear it at this volume.'),
    L.el, library,
  ] });
}

/* =====================================================================
   Sequel trailer
   ===================================================================== */
function secTrailer(ed) {
  const { u, text, form } = ed, T = u.copy.trailer, lines = T.lines;
  const pv = { t: h('p', { class: 'ed-trl-t' }), s: h('p', { class: 'ed-trl-s' }), r: h('span', { class: 'ed-trl-r' }) };
  const card = h('div', { class: 'ed-trl', style: posterVars(u), role: 'img' }, h('p', { class: 'ed-trl-k', text: 'Coming soon' }), pv.t, pv.s, pv.r);
  const up = () => { pv.t.textContent = previewFill(u, T.title) || 'The sequel'; pv.s.textContent = previewFill(u, T.sub); pv.r.textContent = previewFill(u, T.rating) || 'Rated G'; card.setAttribute('aria-label', `Trailer: ${pv.t.textContent}`); };
  up();
  const sname = s => (SOUNDS.find(x => x[0] === s) || SOUNDS[0])[1];
  const L = ed.list({ items: lines, noun: 'line', title: 'Lines', addLabel: 'Add a line', min: 1, max: 24,
    item: i => { const l = lines[i]; return { lead: numBadge(i), main: h('span', { class: 'ed-trln' + (l.big ? ' big' : '') }, h('b', { text: previewFill(u, l.t) || 'Empty line' }), l.small ? h('small', { text: previewFill(u, l.small) }) : null), side: h('span', { class: 'ed-snd', text: sname(l.s) }), open: () => edit(l), cls: 'ed-trli' }; },
    onAdd: () => { const l = { t: '', s: 'hit' }; lines.push(l); ed.save(); L.draw(); edit(l, true); },
    foot: 'Each line flashes up with its sound. Big lines work best for a single emoji.' });
  function edit(l, isNew) {
    ed.editSheet({ title: isNew ? 'New line' : 'Line', focus: isNew, fields: [
      ed.text('Line', l, 't', { area: true, max: 120, ph: 'In a world…' }),
      ed.text('Caption underneath', l, 'small', { area: true, max: 120, ph: 'Optional, like a critic’s quote' }),
      ed.segField('Sound', SOUNDS, l.s || 'hit', v => { l.s = v; }),
      (() => { const r = ed.switchRow({ title: 'Show it big', sub: 'For a single emoji or one huge word', get: () => !!l.big, set: v => { if (v) l.big = true; else delete l.big; } }); r.classList.add('ed-f-sw'); return r; })()],
    onDelete: lines.length > 1 ? () => { const i = lines.indexOf(l); if (i >= 0) { lines.splice(i, 1); L.draw(); ed.commit('Line deleted', { icon: 'trash-2' }); } } : null, deleteLabel: 'Delete line',
    onClose: () => { if (l.small === '') delete l.small; const i = lines.indexOf(l); if (i >= 0 && !l.t.trim() && lines.length > 1) { lines.splice(i, 1); ed.save(); } L.draw(); } });
  }
  return ed.page({ title: __wt(u, 'trailer'), intro: 'The trailer for the sequel, line by line, with sound.', blocks: [
    h('div', { class: 'ed-trl-wrap' }, card),
    groupHead('Poster'),
    form(text('Title', T, 'title', { max: 50, cap: 'words', onInput: up }), text('Tagline', T, 'sub', { max: 60, onInput: up }), text('Rating', T, 'rating', { max: 70, onInput: up })),
    L.el,
  ] });
}

/* =====================================================================
   Grand finale
   ===================================================================== */
function secFinale(ed) {
  const { u, text, form } = ed, F = u.copy.finale;
  const lines = F.lines, burst = F.burst;
  const pv = { b: h('p', { class: 'ed-fin-b' }), l: h('div', { class: 'ed-fin-l' }), s: h('p', { class: 'ed-fin-s' }) };
  const card = h('div', { class: 'ed-fin', style: posterVars(u), role: 'img', 'aria-label': 'Finale preview' }, h('span', { class: 'ed-fin-sky', 'aria-hidden': 'true' }), pv.b, pv.l, pv.s);
  const up = () => {
    pv.b.replaceChildren(...burst.filter(Boolean).map(w => h('span', { text: w })));
    pv.l.replaceChildren(...lines.filter(x => String(x).trim()).map(x => h('p', { text: previewFill(u, x) })));
    pv.s.textContent = previewFill(u, F.sign);
  };
  up();
  const L = ed.list({ items: lines, noun: 'line', title: 'Last message', addLabel: 'Add a line', min: 1, max: 5, make: () => '',
    item: i => { const t = inlineStr(ed, lines, i, { ph: 'One last thing', max: 90, label: `Line ${i + 1}` }); t.addEventListener('input', up); return { top: true, lead: numBadge(i), main: t }; },
    onChange: up, foot: 'Up to five lines, shown one at a time after the fireworks.' });
  dropEmptyStrings(ed, lines);
  const bw = { a: burst[0] || '', b: burst[1] || '' };
  const clean = v => v.toUpperCase().replace(/[^\p{L}\p{N} ’'!?&.-]/gu, '').replace(/^\s+/, '').replace(/\s{2,}/g, ' ');
  const err = h('p', { class: 'ed-err', role: 'alert', hidden: true });
  const setBurst = () => {
    const next = [bw.a.trim(), bw.b.trim()].filter(Boolean);
    err.hidden = !!next.length; err.textContent = next.length ? '' : 'Add at least one word for the fireworks.';
    if (next.length) { burst.splice(0, burst.length, ...next); up(); }
  };
  return ed.page({ title: 'The Grand Finale', intro: 'Fireworks, end credits, and the last thing they read.', blocks: [
    h('div', { class: 'ed-fin-wrap' }, card),
    L.el,
    groupHead('Sign-off'),
    form(text('Signed', F, 'sign', { max: 60, onInput: up, ph: `— ${u.me.name}` })),
    groupHead('Fireworks words'),
    form(text('First word', bw, 'a', { max: 12, upper: clean, onInput: setBurst, mono: false, ph: 'HAPPY', tokens: false }),
      text('Second word', bw, 'b', { max: 12, upper: clean, onInput: setBurst, ph: 'Optional', tokens: false })),
    err,
    groupFoot('Spelled out in the sky by the fireworks. One or two short words.'),
  ] });
}

/* =====================================================================
   Worlds
   ===================================================================== */
function worldName(u, w) {
  const c = u.copy;
  const names = {
    wordle: wordGameName(u.them.name), coupons: c.coupons.title, reasons: c.reasons.title, memories: c.memories.title,
    almanac: `The ${info(u.date, true).long} Almanac`, trailer: `Coming Soon: ${previewFill(u, c.trailer.title) || 'the sequel'}`,
    mail: u.rel === 'memorial' || u.occ === 'remembrance' ? c.letters.title : 'Open When…',
  };
  return names[w.id] || w.name;
}
function secWorlds(ed) {
  const { u } = ed;
  const on = id => u.worlds[id] !== false;
  const count = () => WORLD_DEFS.filter(w => on(w.id)).length;
  const sum = { n: h('b'), s: h('span') };
  const paintSum = () => {
    sum.n.textContent = `${count()} of ${WORLD_DEFS.length} worlds on`;
    sum.s.textContent = on('finale') ? `The finale unlocks after ${plural(finaleNeeds(u), 'stamp')}.` : 'The finale is off, so there’s no unlock to chase.';
  };
  paintSum();
  const toggles = new Map();
  const blocks = [h('div', { class: 'ed-wsum' }, h('div', {}, sum.n, sum.s))];
  for (const s of SECTORS) {
    const ws = WORLD_DEFS.filter(w => w.sector === s.id);
    blocks.push(h('div', { class: 'ed-gh ed-sect' }, h('h3', {}, s.name, h('small', { text: s.sub.replace('{me}', u.me.name) }))));
    blocks.push(h('div', { class: 'group' }, ...ws.map(w => {
      const t = toggle(on(w.id), v => {
        if (!v && count() <= 3) { t.setAttribute('aria-checked', 'true'); haptic('heavy'); toast('Keep at least 3 worlds switched on', { icon: 'info' }); return; }
        u.worlds[w.id] = v; paintSum(); ed.save();
      }, worldName(u, w));
      toggles.set(w.id, t);
      const r = h('div', { class: 'row-i ed-world' },
        h('span', { class: 'ri-main' }, h('b', { text: worldName(u, w) }), h('small', { class: 'ed-blurb', text: w.line || w.blurb })), t);
      r.addEventListener('click', e => { if (!e.target.closest('.tgl')) t.click(); });
      return r;
    })));
  }
  const rec = recommendedWorlds(u.rel, u.occ);
  blocks.push(h('div', { style: { height: '22px' } }), group(row({ title: 'Use the suggested worlds', sub: 'The set picked for this person and occasion', chevron: false, onclick: async () => {
    if (WORLD_DEFS.every(w => !!rec[w.id] === on(w.id))) { toast('Already using the suggested worlds'); return; }
    u.worlds = { ...rec };
    toggles.forEach((t, id) => t.setAttribute('aria-checked', String(on(id))));
    paintSum(); await ed.commit('Suggested worlds on');
  } })));
  blocks.push(groupFoot('Every world switched on earns a passport stamp. At least 3 stay on.'));
  blocks.push(groupHead('On the map'), group(
    row({ title: 'Arrange the map', sub: 'Your own order for the sections and worlds', href: ed.E('map/order') }),
    row({ title: 'Names and descriptions', sub: 'Rename any world, or the map itself', href: ed.E('map') })));
  return ed.page({ title: 'Worlds', intro: `Choose what’s inside ${u.them.name}’s universe.`, blocks });
}

/* =====================================================================
   Characters
   ===================================================================== */
function secCharacters(ed) {
  const { u } = ed;
  let who = 'them';
  const holder = h('div', { class: 'ed-ab' });
  const paint = () => {
    const p = u[who];
    const b = avatarBuilder(p.avatar, d => { const next = { ...d }; delete next.name; p.avatar = next; ed.save(); }, { name: p.name, bg: (p.avatar && p.avatar.bg) || themeOf(u).dusk });
    holder.replaceChildren(b);
  };
  paint();
  const who2 = seg([['them', u.them.name], ['me', u.me.name]], who, v => { who = v; paint(); });
  who2.classList.add('ed-who');
  return ed.page({ title: 'Characters', intro: 'The two propeller-hat characters who star in the film and fly through the games.', blocks: [
    h('div', { class: 'ed-whow' }, who2),
    holder,
    groupHead('Hidden friends'),
    group(ed.switchRow({ title: `Hide ${u.me.name} in the worlds`, sub: 'Tiny copies to find, for a stamp', emoji: 'crystal_ball', get: () => u.hidden !== false, set: v => { u.hidden = v; } })),
    groupFoot(`Little ${u.me.name}s peek out from corners all over the universe. Finding every one earns a stamp.`),
  ] });
}

/* =====================================================================
   Theme
   ===================================================================== */
function secTheme(ed) {
  const { u } = ed;
  const look = () => (u.look ||= {});
  // rendered at the universe page's size and scaled, so the billing never re-wraps
  const art = h('div', { class: 'ed-th-art' }, h('div', { class: 'ed-th-scale' }, poster(u, { width: 212 })));
  const name = h('p', { class: 'ed-thname' });
  const dots = h('span', { class: 'ed-thdots', 'aria-hidden': 'true' });
  const hero = h('div', { class: 'ed-thero', style: posterVars(u) }, h('div', { class: 'u-hero-bg' }), art,
    h('div', { class: 'ed-th-txt' }, h('span', { class: 'ed-th-k', text: 'Theme' }), name, dots, h('p', { class: 'ed-thsub', text: 'The colors of the sky, the film and every world.' })));
  let raf = 0;
  const paint = () => {
    cancelAnimationFrame(raf); raf = 0;
    const t = themeOf(u);
    for (const [k, v] of Object.entries(posterVars(u))) hero.style.setProperty(k, v);
    name.textContent = t.custom ? `${t.label}, your colors` : t.label;
    dots.replaceChildren(...[t.rose, t.gold, t.hud, t.lilac].map(c => h('i', { style: { background: c } })));
    art.firstChild.replaceChildren(poster(u, { width: 212 }));
    reset.hidden = !t.custom;
    fonts.querySelectorAll('.ed-font').forEach(b => { b.style.setProperty('--fc', t.gold); b.style.setProperty('--fb', `linear-gradient(${t.night}, ${t.dusk})`); });
  };
  const soon = () => { if (!raf) raf = requestAnimationFrame(paint); };

  /* fine-tune: any of the theme's colors, each with the phone's own color picker */
  const swatches = h('div', { class: 'ed-swg' });
  const paintSwatches = () => {
    const t = themeOf(u), own = look().colors || {};
    swatches.replaceChildren(...COLOR_ROLES.map(([k, label]) => {
      const chip = h('span', { class: 'ed-swg-c', style: { background: t[k] } });
      const inp = h('input', { class: 'ed-swg-in', type: 'color', value: t[k], 'aria-label': `${label} color` });
      const cell = h('label', { class: 'ed-swg-i' + (own[k] ? ' own' : '') }, chip, h('span', { class: 'ed-swg-l', text: label }), inp);
      inp.addEventListener('input', () => { (look().colors ||= {})[k] = inp.value; chip.style.background = inp.value; cell.classList.add('own'); soon(); ed.save(); });
      return cell;
    }));
  };
  const reset = h('button', { class: 'b quiet small ed-swg-reset', type: 'button', onclick: async () => {
    delete look().colors; paintSwatches(); paint(); haptic('medium'); await ed.commit(`Back to ${themeOf(u).label}’s own colors`);
  } }, ic('rotate-ccw', 's'), 'Use the theme’s colors');

  /* lettering for the big titles, shown with their name */
  const fonts = h('div', { class: 'ed-fonts', role: 'radiogroup', 'aria-label': 'Title lettering' });
  const paintFonts = () => {
    const cur = themeOf(u).font.id;
    fonts.replaceChildren(...FONTS.map(f => h('button', { class: 'ed-font', type: 'button', role: 'radio', 'aria-checked': String(f.id === cur), onclick: () => {
      look().font = f.id; haptic('select'); paintFonts(); paint(); ed.save();
    } }, h('b', { text: u.them.name, style: { fontFamily: f.family, fontWeight: String(f.weight || 400), fontSize: `${Math.round(30 * (f.scale || 1))}px` } }), h('small', { text: f.label }))));
  };

  /* how starry the sky is behind the film and the worlds */
  const stars = seg(STARS.map(s => [s.id, s.label]), starsById(look().stars).id, v => { look().stars = v; paint(); ed.save(); });

  paintSwatches(); paintFonts(); paint();
  const picker = themePicker(u.theme, id => {
    const had = themeOf(u).custom;
    u.theme = id;
    if (u.look && u.look.colors) delete u.look.colors;
    ed.save(); paintSwatches(); paint();
    if (had) toast('New palette, so your own colors were cleared');
  });
  return ed.page({ title: 'Theme', intro: 'One palette for everything: the poster, the film, every world and the last firework. Start from a theme, then make it yours.', cls: 'ed-themescr', blocks: [
    hero, picker,
    groupHead('Your colors'),
    h('div', { class: 'group ed-swgw' }, swatches, h('div', { class: 'ed-swg-f' }, reset)),
    groupFoot('Tap a color to change it. The sky, the film and every world follow.'),
    groupHead('Title lettering'),
    fonts,
    groupFoot('For the big names: the poster, the film’s title, the map and the credits.'),
    groupHead('Stars in the sky'),
    h('div', { class: 'group ed-form' }, h('div', { class: 'ed-f ed-segf' }, stars)),
  ] });
}

/* =====================================================================
   Photos
   ===================================================================== */
function secPhotos(ed) {
  const { u } = ed;
  const card = who => {
    const p = u[who];
    const circle = h('button', { class: 'ed-pt-c', type: 'button', style: { '--abg': (p.avatar && p.avatar.bg) || themeOf(u).dusk } });
    const actions = h('div', { class: 'ed-pt-a' });
    const empty = () => [h('span', { class: 'ed-pt-av', html: catSVG({ ...(p.avatar || {}), name: p.name }, { prop: true }) })];
    const badge = h('span', { class: 'ed-pt-plus', 'aria-hidden': 'true' }, ic('camera', 's'));
    const add = async () => {
      const ref = await choosePhoto(); if (!ref) return;
      const old = p.photo; p.photo = ref; await paint();
      await ed.commit(old ? `New photo of ${p.name}` : `Photo of ${p.name} added`); dropSafe(old); haptic('success');
    };
    const remove = async () => { const old = p.photo; p.photo = null; await paint(); await ed.commit('Photo removed', { icon: 'trash-2' }); dropSafe(old); };
    async function paint() {
      await paintThumb(circle, p.photo, empty);
      const has = !!p.photo;
      badge.replaceChildren(ic(has ? 'pencil' : 'camera', 's'));
      circle.setAttribute('aria-label', has ? `Change the photo of ${p.name}` : `Add a photo of ${p.name}`);
      actions.replaceChildren(...(has
        ? [h('button', { class: 'b sm quiet', type: 'button', onclick: () => { haptic('light'); add(); } }, 'Replace'), h('button', { class: 'icon-b ed-rm', type: 'button', 'aria-label': `Remove the photo of ${p.name}`, onclick: () => { haptic('light'); remove(); } }, ic('trash-2', 's'))]
        : [h('button', { class: 'b sm primary', type: 'button', onclick: () => { haptic('medium'); add(); } }, ic('image', 's'), 'Add photo')]));
    }
    circle.addEventListener('click', () => { haptic('light'); if (p.photo) photoActions(p.name, { onReplace: add, onRemove: remove }); else add(); });
    paint();
    return h('div', { class: 'ed-pt' }, h('div', { class: 'ed-pt-cw' }, circle, badge), h('b', { class: 'ed-pt-n', text: p.name }), h('small', { text: who === 'them' ? 'Who it’s for' : 'From' }), actions);
  };
  return ed.page({ title: 'Photos', intro: `A portrait of ${u.them.name}, and one of ${u.me.name}.`, blocks: [
    h('div', { class: 'ed-pts' }, card('them'), card('me')),
    groupHead('Where they appear'),
    group(
      row({ emoji: 'clapper_board', title: 'On the poster and in the film', sub: 'In place of the characters', chevron: false }),
      row({ emoji: 'puzzle_piece', title: 'In the Portrait Puzzle', sub: 'Scattered into pieces to put back together', chevron: false }),
      row({ emoji: 'locked', title: 'Private to this phone', sub: 'Until you send the gift, which carries them', chevron: false })),
  ] });
}

/* =====================================================================
   Names and date
   ===================================================================== */
function countMentions(obj, name) {
  if (!name) return 0;
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^\\p{L}])${esc}(?=$|[^\\p{L}])`, 'gu');
  let n = 0;
  const walk = (o, k) => { if (k === 'photo' || k === 'src' || k === 'id' || k === 'media') return; if (Array.isArray(o)) o.forEach(x => walk(x)); else if (o && typeof o === 'object') Object.entries(o).forEach(([kk, x]) => walk(x, kk)); else if (typeof o === 'string') n += (o.match(re) || []).length; };
  walk(obj);
  return n;
}
function renameAll(u, who, from, to) {
  const n = countMentions(u.copy, from);
  u.copy = renameEverywhere(u.copy, from, to);
  u[who].name = to;
  if (who === 'me') { if (u.studio === studioFor(from)) u.studio = studioFor(to); }
  else {
    if (u.scope === scopeFor(from)) u.scope = scopeFor(to);
    if (u.copy.map && u.copy.map.title === verseName(from)) u.copy.map.title = verseName(to);
    const W = u.copy.words, oldW = from.toUpperCase().replace(/[^A-Z]/g, ''), newW = to.toUpperCase().replace(/[^A-Z]/g, '');
    const wi = W.findIndex(x => x.w === oldW);
    if (oldW.length === 5 && wi >= 0) {
      if (/^[A-Z]{5}$/.test(newW) && !W.some(x => x.w === newW)) W[wi].w = newW;
      else if (W[wi].hint === NAME_HINT && W.length > 3) W.splice(wi, 1);
    }
  }
  const s = renameEverywhere({ studio: u.studio, scope: u.scope }, from, to);
  u.studio = s.studio; u.scope = s.scope;
  // the maker's own world and section names can mention them too
  if (u.worldText) u.worldText = renameEverywhere(u.worldText, from, to);
  if (u.sectorText) u.sectorText = renameEverywhere(u.sectorText, from, to);
  return n;
}
function secDetails(ed) {
  const { u } = ed;
  const field = (label, who, hint) => {
    const p = u[who];
    const id = 'n' + who;
    const inp = h('input', { class: 'ed-in', id, type: 'text', maxlength: 40, autocapitalize: 'words', autocomplete: 'off', enterkeyhint: 'done', placeholder: who === 'them' ? 'Their name' : 'Your name' });
    inp.value = p.name;
    const msg = h('p', { class: 'ed-fh', text: hint });
    let committed = p.name;
    const apply = () => {
      const next = inp.value.trim().replace(/\s+/g, ' ');
      if (!next) { inp.value = committed; msg.textContent = `A name is needed, so it’s back to ${committed}.`; return; }
      msg.textContent = hint;
      if (next === committed) return;
      const n = renameAll(u, who, committed, next);
      committed = next; inp.value = next;
      ed.commit(n ? `Changed to ${next} in ${plural(n, 'place')}` : `Changed to ${next}`);
      haptic('success');
      if (who === 'them') document.querySelectorAll('.ed-scr .nb-l .nb-btn span').forEach(s => { s.textContent = next; });
      paintPv();
    };
    inp.addEventListener('change', apply);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
    ed.onLeave(apply);
    return h('div', { class: 'ed-f' }, h('label', { for: id, text: label }), inp, msg);
  };
  const occ = occById(u.occ);
  const when = h('p', { class: 'ed-fh ed-when' });
  const paintPv = () => { when.textContent = cap1(whenLine(u)); };
  paintPv();
  const df = dateField({ value: u.date, yearKnown: u.yearKnown !== false, label: occ.dateLabel, onChange: ({ date, yearKnown }) => {
    if (!date) return;
    u.date = date; u.yearKnown = yearKnown; paintPv(); ed.save();
  } });
  return ed.page({ title: 'Names and date', intro: 'Who it’s for, who it’s from, and the day that matters.', blocks: [
    groupHead('Names'),
    ed.form(field('Who it’s for', 'them', 'A name, a nickname, or a group like “The Thursday Club”.'), field('From', 'me', 'You, or a few of you, like “The Bennetts”.')),
    h('div', { class: 'ed-note' }, ic('sparkles', 's'), h('p', { text: 'Change a name and it changes everywhere: every letter, the credits, the poster and the film.' })),
    groupHead(occ.dateLabel),
    h('div', { class: 'group ed-datec' }, df, when),
    groupFoot('Countdowns and numbers in the film update by themselves. Words you wrote stay as they are.'),
  ] });
}

/* =====================================================================
   Who it's for and why
   ===================================================================== */
function secOccasion(ed) {
  const { u } = ed;
  let rel = u.rel, occ = u.occ;
  const relGrid = h('div', { class: 'ed-tiles3' }), occGrid = h('div', { class: 'ed-tiles3' });
  const cta = h('div', { class: 'sticky-cta ed-cta', hidden: true }, h('button', { class: 'b primary lg block', type: 'button', onclick: () => { haptic('medium'); apply(); } }, 'Apply changes'));
  const occHead = h('h3', { class: 'group-h' });
  const SHORT = { congrats: 'Congrats' }; // compact tiles are three across
  const tile = (x, sel, on) => h('button', { class: 'tile ed-t3', type: 'button', 'aria-pressed': String(sel), 'aria-label': x.label, onclick: () => { haptic('select'); on(); } }, h('b', { text: SHORT[x.id] || x.label }));
  function paint() {
    relGrid.replaceChildren(...RELATIONSHIPS.map(r => tile(r, rel === r.id, () => { rel = r.id; if (!(OCCASION_FOR[rel] || []).includes(occ)) occ = (OCCASION_FOR[rel] || ['birthday'])[0]; paint(); })));
    occGrid.replaceChildren(...(OCCASION_FOR[rel] || []).map(id => occById(id)).map(o => tile(o, occ === o.id, () => { occ = o.id; paint(); })));
    occHead.textContent = `The occasion, for ${relById(rel).label.toLowerCase()}`;
    const changed = rel !== u.rel || occ !== u.occ;
    cta.hidden = !changed;
    spacer.style.height = changed ? '96px' : '0';
  }
  const spacer = h('div');
  const norm = s => String(s || '').replace(/\s+/g, ' ').trim();
  function apply() {
    const R = relById(rel), O = occById(occ);
    const args = { them: u.them.name, me: u.me.name, date: u.date, yearKnown: u.yearKnown !== false };
    const fresh = generate({ rel, occ, ...args });
    const before = generate({ rel: u.rel, occ: u.occ, ...args });
    const letterCustom = norm(u.copy.film.letter.body) !== norm(before.film.letter.body);
    const memCustom = u.copy.memories.items.some((m, i) => m.photo || norm(m.when) || norm(m.caption) !== norm(before.memories.items[i]?.caption));
    const rec = recommendedWorlds(rel, occ);
    const turnOn = WORLD_DEFS.filter(w => rec[w.id] && u.worlds[w.id] === false), turnOff = WORLD_DEFS.filter(w => !rec[w.id] && u.worlds[w.id] !== false);
    let keepLetter = letterCustom, useRec = false;
    const and = list => list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list.at(-1)}` : list[0];
    const replaced = h('p'), kept = h('p');
    const paintLists = () => {
      replaced.textContent = cap1(and(['the film’s words', keepLetter ? null : 'the letter in the film', 'the Open When letters', fresh.coupons.mode === 'promise' ? 'the promises' : 'the coupons', 'reasons', 'the word game', 'the trailer and finale'].filter(Boolean))) + '.';
      kept.textContent = cap1(and(['names, date, theme and characters', memCustom ? 'your Memory Lane photos and captions' : null, 'your songs', keepLetter ? `your letter to ${u.them.name}` : null,
        u.order || Object.values(u.worldText || {}).some(x => x && (String(x.name || '').trim() || String(x.blurb || '').trim())) ? 'your map’s order and world names' : null].filter(Boolean))) + '.';
    };
    paintLists();
    const opts = [];
    if (letterCustom) opts.push(ed.switchRow({ title: 'Keep my letter', sub: `The one you wrote to ${u.them.name}`, emoji: 'memo', get: () => keepLetter, set: v => { keepLetter = v; paintLists(); }, nosave: true }));
    if (turnOn.length || turnOff.length) {
      const bits = [turnOn.length ? `turns on ${turnOn.length === 1 ? turnOn[0].short : plural(turnOn.length, 'world')}` : null, turnOff.length ? `turns off ${turnOff.length === 1 ? turnOff[0].short : plural(turnOff.length, 'world')}` : null].filter(Boolean).join(', ');
      opts.push(ed.switchRow({ title: 'Recommended worlds', sub: cap1(bits), emoji: 'ringed_planet', get: () => useRec, set: v => { useRec = v; }, nosave: true }));
    }
    const done = async (rewrite) => {
      if (rewrite) {
        const keep = { memories: u.copy.memories, mixtape: u.copy.mixtape, letter: u.copy.film.letter, mapTitle: u.copy.map?.title };
        u.copy = fresh;
        if (memCustom) u.copy.memories = keep.memories;
        u.copy.mixtape = keep.mixtape;
        if (keepLetter) Object.assign(u.copy.film.letter, { body: keep.letter.body, sig: keep.letter.sig });
        if (keep.mapTitle) u.copy.map.title = keep.mapTitle;
      }
      u.rel = rel; u.occ = occ;
      if (useRec) u.worlds = { ...rec };
      close();
      await ed.commit(rewrite ? 'Starter text rewritten' : `Changed to ${R.label.toLowerCase()}, ${O.label.toLowerCase()}`);
      haptic('success');
      paint(); intro.textContent = introText();
    };
    const close = sheet({ title: `${R.label}, ${O.label.toLowerCase()}`, body: h('div', { class: 'ed-sh ed-rw' },
      h('p', { class: 'ed-rw-p', text: 'Littleverse can write new starter text to fit, or keep every word as it is now.' }),
      h('div', { class: 'ed-rw-l' }, h('div', { class: 'ed-rw-i' }, h('span', { class: 'ed-rw-ic' }, ic('rotate-ccw', 's')), h('div', {}, h('h4', { text: 'If you rewrite' }), replaced)),
        h('div', { class: 'ed-rw-i keep' }, h('span', { class: 'ed-rw-ic' }, ic('check', 's')), h('div', {}, h('h4', { text: 'Kept' }), kept))),
      opts.length ? h('div', { class: 'group' }, ...opts) : null,
      h('div', { class: 'pad stack ed-rw-b' },
        h('button', { class: 'b primary lg block', type: 'button', onclick: () => { haptic('medium'); done(true); } }, 'Rewrite the starter text'),
        h('button', { class: 'b quiet block', type: 'button', onclick: () => { haptic('light'); done(false); } }, 'Keep my text'))) });
  }
  const introText = () => `Right now it’s ${relById(u.rel).label.toLowerCase()}, ${occById(u.occ).label.toLowerCase()}. Pick something new, then apply it.`;
  const intro = h('p', { class: 'subtitle ed-intro', text: introText() });
  paint();
  const out = ed.page({ title: 'Who it’s for', blocks: [intro, h('h3', { class: 'group-h', text: 'Who it’s for' }), relGrid, occHead, occGrid, spacer, cta] });
  return out;
}

/* =====================================================================
   The map: the universe's name, the sections' and worlds' own names, and their order
   ===================================================================== */
const sectorDef = id => SECTORS.find(s => s.id === id);
const sectorName = (u, id) => String(u.sectorText?.[id]?.name || '').trim() || sectorDef(id).name;
const sectorSub = (u, id) => String(u.sectorText?.[id]?.sub || '').trim() || sectorDef(id).sub.replace('{me}', u.me.name);
// a world's name without the maker's own: what an empty field falls back to
function builtInName(u, w) {
  const t = TITLED_WORLDS[w.id];
  const bare = t ? { ...u, copy: { ...u.copy, [t[0]]: { ...u.copy[t[0]], [t[1]]: '' } } } : { ...u, worldText: {} };
  return __wt(bare, w.id, w.name);
}
function secMap(ed, sub) {
  if (sub === 'order') return secMapOrder(ed);
  if (sub) return ed.message({ emoji: 'ringed_planet', title: 'Nothing here', text: 'Pick something to change from the map’s page.', parent: [ed.E('map'), 'The map'] });
  const { u, text, form, E } = ed, M = u.copy.map;
  const ord = mapOrder(u);
  const secRows = h('div', { class: 'group' }), worldRows = h('div', { class: 'group' });
  const paintSecs = () => secRows.replaceChildren(...ord.sectors.map(id => row({ title: previewFill(u, sectorName(u, id)), sub: previewFill(u, sectorSub(u, id)), onclick: () => editSector(id) })));
  const paintWorlds = () => worldRows.replaceChildren(...ord.worlds.filter(id => u.worlds[id] !== false).map(id => {
    const w = WORLD_DEFS.find(x => x.id === id);
    return row({ title: previewFill(u, __wt(u, id, w.name)), sub: previewFill(u, String(u.worldText[id]?.blurb || '').trim() || w.blurb), onclick: () => editWorld(w) });
  }));
  function editSector(id) {
    const st = (u.sectorText[id] ||= { name: '', sub: '' }), def = sectorDef(id);
    ed.editSheet({ title: 'Map section', fields: [
      text('Name', st, 'name', { max: 40, cap: 'words', ph: def.name }),
      text('Description', st, 'sub', { area: true, max: 120, ph: def.sub.replace('{me}', u.me.name) })],
    onClose: paintSecs });
  }
  function editWorld(w) {
    const wt = (u.worldText[w.id] ||= { name: '', blurb: '' }), t = TITLED_WORLDS[w.id];
    const name = t
      ? text('Name', u.copy[t[0]], t[1], { max: 50, cap: 'words', required: () => builtInName(u, w), hint: 'It’s also the title inside this world.' })
      : text('Name', wt, 'name', { max: 50, cap: 'words', ph: builtInName(u, w) });
    ed.editSheet({ title: 'World', fields: [name, text('Description', wt, 'blurb', { area: true, max: 160, ph: w.blurb, hint: 'Under its name, on the map.' })], onClose: paintWorlds });
  }
  paintSecs(); paintWorlds();
  return ed.page({ title: 'The map', intro: `The map of ${u.them.name}’s universe: its name, a welcome, and every world on the way.`, blocks: [
    groupHead('The universe'),
    form(
      text('Name', M, 'title', { max: 40, cap: 'words', required: () => verseName(u.them.name), hint: 'On the map, the passport and the button that opens the map.' }),
      text('Welcome', M, 'lede', { area: true, max: 280, ph: 'A line under the name' })),
    h('div', { style: { height: '14px' } }),
    group(row({ title: 'Arrange the map', sub: 'Put the sections and the worlds in your own order', href: E('map/order') })),
    groupHead('Sections'),
    secRows,
    groupHead('Worlds'),
    worldRows,
    groupFoot('Tap one to rename it or write its description. Leave a field empty for the original.'),
  ] });
}
function secMapOrder(ed) {
  const { u } = ed;
  const ord = mapOrder(u);
  const secs = ord.sectors.filter(id => id !== 'soon');            // Coming Attractions stays last
  const inSec = sid => ord.worlds.filter(id => WORLD_DEFS.find(w => w.id === id).sector === sid && id !== 'finale');
  const shown = Object.fromEntries(secs.map(sid => [sid, inSec(sid).filter(id => u.worlds[id] !== false)]));
  const keep = () => {
    const worlds = [...secs, 'soon'].flatMap(sid => { const s = shown[sid] || []; return [...s, ...inSec(sid).filter(id => !s.includes(id))]; });
    u.order = { sectors: [...secs, 'soon'], worlds };
  };
  const worldLists = h('div');
  const paintWorldLists = () => worldLists.replaceChildren(...secs.filter(sid => shown[sid].length).map(sid => ed.list({
    items: shown[sid], noun: 'world', title: previewFill(u, sectorName(u, sid)), fixed: true, reorder: true, count: false,
    item: i => { const w = WORLD_DEFS.find(x => x.id === shown[sid][i]); return { main: rowText(previewFill(u, __wt(u, w.id, w.name)), w.line) }; },
    onChange: keep }).el));
  const secList = ed.list({ items: secs, noun: 'section', title: 'Sections', fixed: true, reorder: true, count: false,
    item: i => ({ main: rowText(previewFill(u, sectorName(u, secs[i])), shown[secs[i]].length ? plural(shown[secs[i]].length, 'world') : 'No worlds on') }),
    onChange: () => { keep(); paintWorldLists(); } });
  paintWorldLists();
  return ed.page({ title: 'Arrange the map', intro: 'Drag the handles to change the order. The map, the passport and “Next stop” all follow it.', parent: [ed.E('map'), 'The map'], blocks: [
    secList.el,
    worldLists,
    groupFoot('Coming Attractions and the Grand Finale always close the map.'),
    h('div', { style: { height: '8px' } }),
    group(row({ title: 'Back to the original order', chevron: false, onclick: async () => { if (!u.order) { toast('Already in the original order'); return; } delete u.order; await ed.commit('Original order back'); ed.ctx.refresh(); } })),
  ] });
}

/* =====================================================================
   The Almanac: the forecast for the year ahead
   ===================================================================== */
function secAlmanac(ed) {
  const { u, text, form } = ed, F = u.copy.forecast;
  // the starter text begins each line with its month; the cards show the month already
  for (let i = 0; i < 12; i++) F[i] = String(F[i] ?? '').replace(new RegExp(`^${MONTHS[i]}\\s*[:—–-]\\s*`, 'i'), '');
  return ed.page({ title: __wt(u, 'almanac', 'The Almanac'), intro: `What the sky did on ${info(u.date, true).long}, and a forecast for the year ahead: one card per month, turned over to read.`, blocks: [
    groupHead('The year ahead'),
    form(...MONTHS.map((m, i) => text(m, F, i, { area: true, max: 160, ph: 'Something good. Details to follow.' }))),
    groupFoot('The cards start from the month they open the Almanac in.'),
  ] });
}

const SECTIONS = { film: secFilm, letter: secLetter, mail: secMail, coupons: secCoupons, reasons: secReasons, memories: secMemories, wordle: secWordle, mixtape: secMixtape,
  trailer: secTrailer, finale: secFinale, worlds: secWorlds, characters: secCharacters, theme: secTheme, photos: secPhotos, details: secDetails, occasion: secOccasion,
  map: secMap, almanac: secAlmanac };
