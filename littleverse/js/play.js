// The experience runtime: the film, the map, every world, the passport.
// It plays one universe at a time inside #play. Routes look like
//   #/p/<universe id>            the film
//   #/p/<universe id>/map        the map
//   #/p/<universe id>/w/<world>  a world
// Links inside worlds can keep using "#/", "#/map" and "#/w/<id>": they are
// rewritten to the playing universe automatically.
import { $, h, icon } from './core/dom.js';
import { store } from './core/store.js';
import * as audio from './core/audio.js';
import { music } from './core/music.js';
import { sky } from './core/sky.js';
import { fx } from './core/fx.js';
import { toast, modal, peek, stampHTML, closeAllModals } from './core/ui.js';
import * as cat from './core/cat.js';
import { WORLDS, SECTORS, ALL_STAMPS, FINALE_NEEDS, HIDDEN_TOTAL, HIDDEN_ON, worldById } from './worlds.js';
import { CONTENT } from './content.js';
import { U, activate, applyTheme, clearTheme } from './active.js';
import { mediaURL } from './lib/db.js';
import { MUSIC_VOLUME, GATE_WORDS } from './lib/templates.js';
import { haptic } from './shell/native.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let booted = false, active = false, playingId = null, exitTo = '#/';
let playEl, viewEl, iris, loading, musicBtn, skipBtn, verseBtn, homeBtn;

function boot() {
  if (booted) return;
  booted = true;
  playEl = $('#play');
  playEl.append(
    h('canvas', { id: 'sky', 'aria-hidden': 'true' }),
    h('canvas', { id: 'confetti', 'aria-hidden': 'true' }),
    viewEl = h('div', { id: 'view' }),
    h('div', { class: 'dock' },
      homeBtn = h('button', { class: 'round', id: 'homeBtn', type: 'button', 'aria-label': 'Leave this universe' }, icon('close')),
      verseBtn = h('button', { class: 'round verse', id: 'verseBtn', type: 'button' }),
      musicBtn = h('button', { class: 'music', id: 'musicBtn', type: 'button', 'aria-pressed': 'false' }, h('span', { class: 'eq', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')), h('span', { id: 'musicLabel', text: 'Play music' })),
      skipBtn = h('button', { class: 'round', id: 'skipBtn', type: 'button', 'aria-label': 'Skip to next song', title: 'Next song', html: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2.5v11l8-5.5z"/><rect x="11" y="2.5" width="2.5" height="11" rx=".5"/></svg>' })),
    iris = h('div', { id: 'iris', 'aria-hidden': 'true' }),
    loading = h('div', { class: 'loading', id: 'loading', 'aria-hidden': 'true' }, h('div', { class: 'reel' })));
  sky.init($('#sky'));
  fx.init($('#confetti'));
  music.on(s => {
    musicBtn.classList.toggle('on', s.playing);
    musicBtn.setAttribute('aria-pressed', s.playing);
    musicBtn.hidden = skipBtn.hidden = !!s.empty;
    $('#musicLabel').textContent = music.label();
    document.querySelectorAll('.mus-btn').forEach(b => { b.setAttribute('aria-pressed', s.playing); b.hidden = !!s.empty; });
    document.querySelectorAll('[data-music-label]').forEach(el => { el.textContent = s.playing ? '♪ Pause the soundtrack' : '♪ Play the soundtrack'; el.hidden = !!s.empty; });
  });
  musicBtn.onclick = () => music.toggle();
  skipBtn.onclick = () => music.next();
  homeBtn.onclick = () => exit();
  // links inside worlds use short paths; point them at the playing universe
  document.addEventListener('click', e => {
    if (!active) return;
    const a = e.target.closest && e.target.closest('a[href^="#/"]');
    if (!a || !playEl.contains(a) && !a.closest('.modal-wrap')) return;
    const href = a.getAttribute('href');
    if (/^#\/p\//.test(href)) return;
    e.preventDefault();
    go(href);
  }, true);
  // the dock tucks away while reading down the page, and comes back on scroll up
  let lastY = 0;
  addEventListener('scroll', () => {
    if (!active) return;
    const y = scrollY, atEnd = innerHeight + y >= document.documentElement.scrollHeight - 40;
    if (y > lastY + 6 && y > 140 && !atEnd) document.body.classList.add('dock-tuck');
    else if (y < lastY - 6 || atEnd || y < 140) document.body.classList.remove('dock-tuck');
    lastY = y;
  }, { passive: true });
  addEventListener('keydown', secretKeys);
  addEventListener('pointerdown', e => { lastPointer = { x: e.clientX, y: e.clientY }; }, { capture: true, passive: true });
}

// "#/", "#/map", "#/w/x", "map", "w/x", "film" → full route for the playing universe
export function full(path) {
  let p = String(path || '').replace(/^#?\/?/, '');
  if (p.startsWith('p/')) return '#/' + p;
  if (p === '' || p === 'film') p = '';
  return `#/p/${playingId}${p ? '/' + p : ''}`;
}
export function go(path) {
  const target = full(path);
  if (location.hash === target) { route(); return; }
  location.hash = target;
}

/* ================= per-view stylesheets ================= */
const cssCache = {};
function loadCSS(name) {
  if (cssCache[name]) return cssCache[name];
  cssCache[name] = new Promise(res => {
    const l = h('link', { rel: 'stylesheet', href: `css/views/${name}.css` });
    l.onload = res; l.onerror = res;
    document.head.append(l);
    setTimeout(res, 4000);
  });
  return cssCache[name];
}

// While the phone is idle, load the view people usually open next (the film and
// the map lead to each other), so switching doesn't wait on parsing it.
const idle = fn => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 800));
const VIEWS = { film: () => import('./views/film.js'), map: () => import('./views/map.js') };
const NEXT = { film: 'map', map: 'film' };
function preload(kind) {
  idle(() => VIEWS[kind]().then(m => m.default && m.default.css && loadCSS(m.default.css)).catch(() => {}));
}
// The app screens call this so "Play" opens straight onto the film.
export const warm = () => preload('film');

/* ================= router ================= */
let current = null;          // { key, cleanup }
let navToken = 0;
const scrollMem = {};
let lastPointer = { x: innerWidth / 2, y: innerHeight / 2 };

function parse(hash) {
  const m = /^#\/p\/([\w-]+)(?:\/(\w+)(?:\/([\w-]+))?)?/.exec(hash || '');
  if (!m) return null;
  const id = m[1];
  if (m[2] === 'map') return { id, key: 'map', kind: 'map' };
  if (m[2] === 'w' && m[3] && worldById(m[3])) return { id, key: 'w/' + m[3], kind: 'world', world: m[3] };
  return { id, key: 'film', kind: 'film' };
}

// Called by the app router for any #/p/... hash.
export async function enter(universe, { preview = true, from } = {}) {
  boot();
  if (from) exitTo = from;
  if (!active || playingId !== universe.id) {
    if (current) { try { current.cleanup(); } catch (e) { console.error(e); } current = null; }
    playingId = universe.id;
    store.use(universe.id);
    await activate(universe, { preview });
    applyTheme(U.theme);
    sky.setPalette(U.theme);
    const tracks = await Promise.all(((universe.copy.mixtape && universe.copy.mixtape.tracks) || []).map(async t => ({ ...t, url: t.media ? await mediaURL(t.media) : t.src })));
    music.setTracks(tracks, { artist: U.studio, album: (universe.copy.mixtape && universe.copy.mixtape.title) || '', art: 'assets/icon-512.png' });
    music.setVolume(universe.copy.mixtape?.volume ?? MUSIC_VOLUME);
    for (const k of Object.keys(scrollMem)) delete scrollMem[k];
  }
  if (!active) {
    active = true;
    // the page itself goes night too: iPhones show it past either end of a scroll,
    // and since iOS 26 they tint the status bar from it
    document.documentElement.classList.add('playing');
    document.body.classList.add('playing');
    playEl.hidden = false;
    sky.resume();
  }
  const r = parse(location.hash);
  if (r && r.id === playingId) await route();
  if (!sessionStorage.getItem('lv-gate-' + playingId) && (!r || r.kind === 'film')) gate();
}

export function leave() {
  if (!active) return;
  active = false;
  if (current) { try { current.cleanup(); } catch (e) { console.error(e); } current = null; }
  closeAllModals();
  music.stop();
  sky.pause();
  viewEl.replaceChildren();
  document.documentElement.classList.remove('playing');
  document.body.classList.remove('playing', 'in-world', 'in-film', 'in-map', 'lock-scroll');
  playEl.hidden = true;
  clearTheme();
  document.querySelector('.gate')?.remove();
}
function exit() {
  haptic('light');
  location.hash = exitTo || '#/';
}
export const isActive = () => active;

export async function route() {
  const r = parse(location.hash);
  if (!r || r.id !== playingId) return;
  if (current && current.key === r.key) return;
  const token = ++navToken;
  const first = !current;
  closeAllModals();

  // the iris closes while the next view loads (both at once), then opens on it
  let closed = null;
  if (!first && !reduce) {
    iris.style.setProperty('--ix', lastPointer.x + 'px'); iris.style.setProperty('--iy', lastPointer.y + 'px');
    iris.className = 'closing';
    closed = new Promise(res => setTimeout(res, 200));
  }
  const loadT = setTimeout(() => loading.classList.add('on'), 600);
  let mod;
  try {
    mod = r.kind === 'film' ? await import('./views/film.js') : r.kind === 'map' ? await import('./views/map.js') : await worldById(r.world).load();
  } catch (e) {
    console.error(e);
    clearTimeout(loadT); loading.classList.remove('on'); iris.className = '';
    toast('That world didn’t load. Try again.');
    if (current) history.replaceState(null, '', full(current.key === 'film' ? '' : current.key));
    return;
  }
  const cssP = mod.default && mod.default.css ? loadCSS(mod.default.css) : null;
  await Promise.all([closed, cssP]);
  clearTimeout(loadT); loading.classList.remove('on');
  if (token !== navToken || !active) return;

  if (current) {
    scrollMem[current.key] = scrollY;
    try { current.cleanup(); } catch (e) { console.error(e); }
  }
  viewEl.replaceChildren();
  document.body.classList.toggle('in-world', r.kind === 'world');
  document.body.classList.toggle('in-film', r.kind === 'film');
  document.body.classList.toggle('in-map', r.kind === 'map');
  document.body.classList.remove('lock-scroll');
  paintDock(r.kind);

  const world = r.kind === 'world' ? worldById(r.world) : null;
  const ctx = makeCtx(r, world);
  current = { key: r.key, cleanup: ctx._cleanupAll };
  try {
    const view = mod.default;
    document.title = world ? `${world.name} · ${U.verse}` : r.kind === 'map' ? U.verse : `${U.copy.hero?.title || 'For'} ${U.them.name}`;
    const ret = await view.mount(ctx);
    if (typeof ret === 'function') ctx.cleanup(ret);
  } catch (e) {
    console.error(e);
    ctx.root.append(h('div', { class: 'card', style: { margin: '40px auto', maxWidth: '520px', textAlign: 'center' } },
      h('p', { text: 'This world hit a problem and couldn’t open.' }),
      h('p', { class: 'fine', text: String(e && e.message || e) }),
      h('div', { class: 'row center', style: { marginTop: '16px' } }, h('a', { class: 'btn', href: '#/map', text: 'Back to the map' }))));
  }
  if (token !== navToken) return;

  document.documentElement.classList.add('no-smooth');
  scrollTo(0, (r.kind !== 'world' && scrollMem[r.key]) || 0);
  requestAnimationFrame(() => document.documentElement.classList.remove('no-smooth'));

  if (!first && !reduce) { iris.className = 'opening'; setTimeout(() => { if (token === navToken) iris.className = ''; }, 400); }
  else iris.className = '';
  if (NEXT[r.kind]) preload(NEXT[r.kind]);
}

function makeCtx(r, world) {
  const cleanups = [];
  let alive = true, skyPaused = false, musicHeld = false;
  let root = viewEl, frame = null;
  if (world && world.chrome !== false) { frame = worldFrame(world); viewEl.append(frame.el); root = frame.body; }
  else { const el = h('div', { class: 'scene' }); viewEl.append(el); root = el; }
  const ctx = {
    root, frame, world, route: r, alive: () => alive,
    go, href: p => full(p), store, music, sky, fx, toast, modal, peek, h, icon, cat, audio, CONTENT, U, WORLDS, reduce, haptic,
    cleanup(fn) { if (!alive) { try { fn(); } catch (e) { console.error(e); } return; } cleanups.push(fn); },
    on(target, type, fn, opts) { if (!alive) return; target.addEventListener(type, fn, opts); cleanups.push(() => target.removeEventListener(type, fn, opts)); },
    timeout(fn, ms) { if (!alive) return 0; const id = setTimeout(() => { if (alive) fn(); }, ms); cleanups.push(() => clearTimeout(id)); return id; },
    interval(fn, ms) { if (!alive) return 0; const id = setInterval(() => { if (alive) fn(); }, ms); cleanups.push(() => clearInterval(id)); return id; },
    raf(fn) {
      if (!alive) return () => {};
      let id = 0, last = performance.now(), stopped = false;
      const tick = t => { if (stopped || !alive) return; const dt = Math.min(50, t - last); last = t; fn(t, dt); id = requestAnimationFrame(tick); };
      id = requestAnimationFrame(tick);
      const stop = () => { stopped = true; cancelAnimationFrame(id); };
      cleanups.push(stop); return stop;
    },
    pauseSky() { if (!alive || skyPaused) return; skyPaused = true; sky.pause(); cleanups.push(() => sky.resume()); },
    holdMusic() { if (!alive) return; music.hold(r.key); if (!musicHeld) { musicHeld = true; cleanups.push(() => music.release(r.key)); } },
    releaseMusic() { music.release(r.key); },
    award(n, at) {
      let x, y;
      if (at && at.getBoundingClientRect) { const b = at.getBoundingClientRect(); x = b.left + b.width / 2; y = b.top + b.height / 2; }
      else if (at) { x = at.x; y = at.y; }
      return store.award(n, { x, y });
    },
    stamp(id) { const ok = store.stamp(id || world?.id); if (ok) haptic('success'); return ok; },
    openPassport,
    _cleanupAll() { alive = false; while (cleanups.length) { try { cleanups.pop()(); } catch (e) { console.error(e); } } },
  };
  if (frame) { const off = store.on('stamp', () => frame.paint()); cleanups.push(off, frame.cleanup); }
  return ctx;
}

/* ================= world frame ================= */
// A native-style nav bar: back · title over its stamp goal · soundtrack · stardust.
const STAMP_IC = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="4.3" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="1.6 1.4"/></svg>';
const DONE_IC = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M4.8 8.3l2.1 2.1 4.3-4.6" fill="none" stroke="var(--night)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function worldFrame(w) {
  const goalIc = h('span', { class: 'wg-ic' }), goalTx = h('span', { class: 'wg-tx' });
  const goal = h('small', { class: 'wgoal' }, goalIc, goalTx);
  const title = h('b', { text: w.name });
  const dust = h('button', { class: 'dust', type: 'button', 'data-dust': '', title: 'Stardust · open your passport', 'aria-label': 'Stardust. Open your passport', onclick: openPassport },
    h('span', { class: 'gem', text: '✦' }), h('span', { class: 'n', text: store.stardust().toLocaleString('en-US') }));
  const mus = h('button', { class: 'icon-btn mus-btn', type: 'button', 'aria-label': 'Soundtrack on or off', 'aria-pressed': music.isPlaying(), onclick: () => music.toggle(), hidden: music.state().empty }, icon('music'));
  const body = h('div', { class: 'wbody' });
  const head = h('div', { class: 'wtitle' }, title, goal);
  const el = h('div', { class: 'world', 'data-world': w.id, style: { '--wc': w.color } },
    h('header', { class: 'wbar' },
      h('a', { class: 'back', href: '#/map', 'aria-label': `Back to the ${U.verse} map` }, icon('back'), h('span', { text: 'Map' })),
      head, mus, dust),
    body);
  const paint = () => {
    const got = store.hasStamp(w.id);
    goal.classList.toggle('done', got);
    goalIc.innerHTML = got ? DONE_IC : STAMP_IC;
    goalTx.textContent = got ? 'Passport stamp collected' : String(w.goal || '').replace(/^\w/, c => c.toUpperCase());
    goal.setAttribute('aria-label', got ? 'Passport stamp collected' : 'Stamp goal: ' + w.goal);
  };
  paint();
  // long names shrink a little to stay on one line before they ever truncate
  const fit = () => {
    if (!el.isConnected) return;
    title.style.fontSize = '';
    const max = parseFloat(getComputedStyle(title).fontSize) || 22;
    let fs = max;
    while (fs > 15 && title.scrollWidth > title.clientWidth) { fs -= .5; title.style.fontSize = fs + 'px'; }
  };
  requestAnimationFrame(fit);
  document.fonts?.ready?.then(() => requestAnimationFrame(fit));
  const onR = () => requestAnimationFrame(fit);
  addEventListener('resize', onR);
  return { el, body, paint, cleanup: () => removeEventListener('resize', onR) };
}
let dustOff = null;
function wireDust() {
  if (dustOff) return;
  dustOff = store.on('stardust', e => {
    setTimeout(() => document.querySelectorAll('[data-dust] .n').forEach(n => { n.textContent = e.total.toLocaleString('en-US'); }), e.delta > 0 ? 850 : 0);
  });
}
wireDust();

/* ================= dock ================= */
function paintDock(kind) {
  verseBtn.replaceChildren();
  homeBtn.hidden = kind === 'world';
  if (kind === 'map') {
    verseBtn.append(icon('film'), h('span', { text: 'The film' }));
    verseBtn.setAttribute('aria-label', 'Back to the film'); verseBtn.onclick = () => go('#/');
    verseBtn.classList.remove('pulse');
  } else {
    verseBtn.append(icon('planet'), h('span', { text: U.verse }));
    verseBtn.setAttribute('aria-label', `Open the ${U.verse} map`); verseBtn.onclick = () => go('#/map');
    verseBtn.classList.toggle('pulse', !store.wasSeen('map'));
  }
}

/* ================= passport ================= */
// A little booklet in a bottom sheet: the cover (universe, holder, number),
// the counts, the finale, every stamp, and two quiet settings at the back.
const plural = name => /s$/i.test(name) ? name : name + 's';
const mrz = s => String(s || '').toUpperCase().normalize('NFD').replace(/[^A-Z0-9]+/g, '<').replace(/^<|<$/g, '');
export function openPassport() {
  const n = store.stampCount();
  const finaleOn = WORLDS.some(w => w.id === 'finale');
  const finaleOpen = n >= FINALE_NEEDS;
  const them = U.them.name, me = U.me.name;
  const no = String(U.date.m).padStart(2, '0') + String(U.date.d).padStart(2, '0');
  const em = (s, cls) => s.emoji ? h('img', { class: cls, src: `assets/emoji/${s.emoji}.webp`, alt: '', loading: 'lazy', decoding: 'async' }) : h('span', { class: cls + ' ch', text: s.icon || '★' });

  /* the cover */
  const line1 = ('P<' + mrz(U.verse) + '<<' + mrz(them) + '<'.repeat(44)).slice(0, 44);
  const line2 = (no + '<' + String(n).padStart(2, '0') + '<<' + mrz(me) + '<'.repeat(44)).slice(0, 44);
  const cover = h('section', { class: 'pp-cover' },
    h('div', { class: 'pp-cv-top' }, h('span', { text: 'Passport' }), h('span', { class: 'pp-no', text: `No. ${no}` })),
    h('div', { class: 'pp-cv-main' },
      h('div', { class: 'pp-crest', 'aria-hidden': 'true', html: cat.catSVG(cat.getDesign(), { spin: false }) }),
      h('div', { class: 'pp-cv-id' },
        h('p', { class: 'pp-verse', text: U.verse }),
        h('p', { class: 'pp-holder' }, h('span', { text: U.gentle ? 'In honor of ' : 'Issued to ' }), h('b', { text: them })))),
    h('div', { class: 'pp-mrz', 'aria-hidden': 'true' }, h('span', { text: line1 }), h('span', { text: line2 })));

  /* the counts */
  const stat = (num, label) => h('div', { class: 'pp-stat' }, h('b', { text: num }), h('span', { text: label }));
  const stats = h('div', { class: 'pp-stats' },
    stat('✦ ' + store.stardust().toLocaleString('en-US'), 'Stardust'),
    stat(`${n}/${ALL_STAMPS.length}`, 'Stamps'),
    HIDDEN_ON ? stat(`${store.hiddenCount()}/${HIDDEN_TOTAL}`, 'Hide & seek') : null);

  /* the finale */
  const left = Math.max(0, FINALE_NEEDS - n);
  const finale = finaleOn ? h('div', { class: 'pp-finale' + (finaleOpen ? ' open' : '') },
    h('img', { class: 'pp-fin-ic', src: 'assets/emoji/fireworks.webp', alt: '' }),
    h('div', { class: 'pp-fin-tx' },
      h('b', { text: 'The Grand Finale' }),
      h('span', { text: finaleOpen ? 'Unlocked. It’s waiting for you.' : `${left} more stamp${left === 1 ? '' : 's'} to unlock it` })),
    finaleOpen ? h('a', { class: 'btn solid small', href: '#/w/finale', onclick: () => setTimeout(closeAllModals, 0), text: 'Open' })
      : h('span', { class: 'pp-fin-n', text: `${Math.min(n, FINALE_NEEDS)}/${FINALE_NEEDS}` }),
    h('div', { class: 'pp-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(FINALE_NEEDS), 'aria-valuenow': String(Math.min(n, FINALE_NEEDS)), 'aria-label': 'Stamps toward the finale' },
      h('i', { style: { width: Math.min(100, n / FINALE_NEEDS * 100) + '%' } }))) : null;

  /* the stamps */
  const grid = h('div', { class: 'pp-grid' });
  ALL_STAMPS.forEach((s, i) => {
    const got = store.stampDate(s.id);
    const href = s.id === 'film' ? '#/' : s.id === 'hidden' ? null : '#/w/' + s.id;
    const goal = s.id === 'hidden' ? `Find all ${HIDDEN_TOTAL} hidden ${plural(me)}` : s.goal;
    const when = got ? new Date(got).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    const mark = got
      ? h('span', { class: 'pp-stamp', style: { '--sc': s.color || 'var(--rose)', '--rot': (((i * 47) % 19) - 9) + 'deg' } }, em(s, 'pp-ic'), h('span', { class: 'pp-dt', text: when.replace(/,.*$/, '') }))
      : h('span', { class: 'pp-hole' }, em(s, 'pp-ic'));
    grid.append(h(href ? 'a' : 'div', { class: 'pp-slot' + (got ? ' got' : ''), href, onclick: href ? () => setTimeout(closeAllModals, 0) : null,
      'aria-label': `${s.name}: ${got ? 'stamped ' + when : goal}` },
      mark, h('b', { class: 'pp-nm', text: s.name }), h('small', { class: 'pp-sub', text: got ? 'Stamped ' + when.replace(/, \d{4}$/, '') : goal })));
  });

  /* settings, kept quiet at the back of the booklet */
  let armed = false, armT = 0;
  const resetBtn = h('button', { class: 'pp-link', type: 'button', text: 'Reset progress' });
  resetBtn.onclick = () => {
    if (!armed) {
      armed = true; resetBtn.textContent = 'Tap again to erase everything'; resetBtn.classList.add('armed');
      clearTimeout(armT); armT = setTimeout(() => { armed = false; resetBtn.textContent = 'Reset progress'; resetBtn.classList.remove('armed'); }, 3500);
      return;
    }
    clearTimeout(armT);
    store.reset(); close(); toast('Fresh passport. The universe is new again.');
    if (/\/map$/.test(location.hash)) { if (current) current.key = '_'; route(); } else go('#/map');
  };
  const sfxState = h('b');
  const sfxBtn = h('button', { class: 'pp-link', type: 'button' }, 'Sound effects ', sfxState);
  const paintSfx = () => { const on = store.settings().sfx !== false; sfxState.textContent = on ? 'on' : 'off'; sfxBtn.setAttribute('aria-pressed', String(on)); };
  sfxBtn.onclick = () => { store.setSetting('sfx', store.settings().sfx === false); paintSfx(); audio.sfx('click'); };
  paintSfx();

  const body = h('div', { class: 'pp' },
    cover, stats, finale,
    h('div', { class: 'pp-sec' }, h('span', { text: 'Stamps' }), h('span', { text: `${n} of ${ALL_STAMPS.length} collected` })),
    grid,
    h('footer', { class: 'pp-foot' }, sfxBtn, h('span', { class: 'pp-sep', 'aria-hidden': 'true' }), resetBtn));
  const close = modal({ body, onClose: () => clearTimeout(armT) });
  const box = body.closest('.modal');
  if (box) { box.classList.add('pp-modal'); box.setAttribute('aria-label', `${U.verse} passport`); }
}

/* ================= intro: a title card, then the "<Studio> presents" ident ================= */
// The ident's small words: the maker's own (copy.gate), or the defaults.
function gateWords() {
  const g = U.copy.gate || {}, d = GATE_WORDS(U.gentle);
  const pick = k => U.fill(String(g[k] ?? '').trim() ? g[k] : d[k]).trim();
  return { presents: pick('presents') || 'presents', forLine: pick('forLine'), fromLine: pick('fromLine') };
}
// At rest the gate is the film's title card (who it's for, who made it, the
// occasion). Tapping Enter turns it into the studio ident: letterbox bars slide
// in, a projector glow comes up behind the two characters, their propellers
// spin and the studio's name appears.
function gate() {
  document.querySelector('.gate')?.remove();
  return new Promise(done => {
    const them = U.them.name, me = U.me.name, quiet = music.state().empty;
    const title = U.fill(U.copy.hero?.title || U.occDef?.title || '');
    const tagline = U.fill(U.copy.gate?.tagline || 'A feature presentation, plus an entire universe.');
    const { presents, forLine, fromLine } = gateWords();
    const castEl = h('div', { class: 'g-cast', 'aria-hidden': 'true' },
      h('div', { class: 'g-ch them', html: cat.catSVG(cat.getDesign(), { cls: 'g-c' }) }),
      h('div', { class: 'g-ch me', html: cat.catSVG(cat.PRESETS.me, { cls: 'g-c' }) }));
    const mid = h('div', { class: 'g-mid' },
      h('div', { class: 'g-stage' }, h('div', { class: 'g-beam', 'aria-hidden': 'true' }), h('div', { class: 'g-glow', 'aria-hidden': 'true' }), castEl),
      h('div', { class: 'g-swap' },
        h('div', { class: 'g-card' },
          title ? h('h1', { class: 'g-occ', text: title }) : null,
          h('p', { class: 'g-for' },
            forLine ? h('span', { text: forLine }) : null,
            fromLine ? h('span', { text: fromLine }) : null),
          tagline ? h('p', { class: 'g-tag', text: tagline }) : null),
        h('div', { class: 'g-word', 'aria-hidden': 'true' }, h('b', { text: U.studio }), h('i'), h('span', { text: presents }))));
    const el = h('div', { class: 'gate', role: 'dialog', 'aria-label': [title, forLine, fromLine].filter(Boolean).join(', ') || `A film for ${them}` },
      h('div', { class: 'g-grain', 'aria-hidden': 'true' }),
      h('div', { class: 'g-stars', 'aria-hidden': 'true' }),
      h('div', { class: 'g-lb g-lbt', 'aria-hidden': 'true' }), h('div', { class: 'g-lb g-lbb', 'aria-hidden': 'true' }),
      h('div', { class: 'g-inner' },
        h('header', { class: 'g-top' }, h('p', { class: 'g-studio' }, h('span', { text: U.studio })), h('p', { class: 'g-pres', text: presents })),
        mid,
        h('div', { class: 'g-acts' },
          quiet ? null : h('button', { class: 'btn solid big', type: 'button', id: 'gateSound' }, '♪ Enter with sound'),
          h('button', { class: quiet ? 'btn solid big' : 'btn ghost big g-quiet', type: 'button', id: 'gateQuiet' }, quiet ? 'Enter' : 'Enter quietly'))),
      h('button', { class: 'btn ghost small g-skip', type: 'button', text: 'Skip' }));
    playEl.append(el);
    const skip = el.querySelector('.g-skip');
    const finish = withSound => {
      if (el.classList.contains('gone')) return;
      sessionStorage.setItem('lv-gate-' + playingId, '1');
      el.classList.add('gone');
      setTimeout(() => el.remove(), 1000);
      if (withSound) music.play();
      done();
    };
    const roll = withSound => {
      if (el.classList.contains('rolling')) return;
      if (withSound) { audio.ac(); music.unlock?.(); audio.fanfare(); }
      haptic('medium');
      // centre the ident (characters + studio name) in the letterboxed frame
      const st = mid.querySelector('.g-stage').getBoundingClientRect(), wd = mid.querySelector('.g-word').getBoundingClientRect();
      el.style.setProperty('--dy', Math.round(innerHeight / 2 - (st.top + wd.bottom) / 2) + 'px');
      el.classList.add('rolling');
      document.activeElement?.blur?.();
      const t = setTimeout(() => finish(withSound), reduce ? 300 : 3300);
      skip.onclick = () => { clearTimeout(t); finish(withSound); };
    };
    el.querySelector('#gateSound')?.addEventListener('click', () => roll(true));
    el.querySelector('#gateQuiet').onclick = () => roll(false);
    skip.onclick = () => finish(false);
  });
}

/* ================= secrets ================= */
let keys = '';
const KONAMI = 'ArrowUpArrowUpArrowDownArrowDownArrowLeftArrowRightArrowLeftArrowRightba';
function secretKeys(e) {
  if (!active) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  keys = (keys + e.key).slice(-80);
  if (keys.endsWith(KONAMI)) {
    keys = ''; sky.hyperspace(); audio.sfx('whoosh');
    toast('Hyperspace engaged. Impressive that you know that code.');
    if (!store.seen('egg-konami')) setTimeout(() => store.award(12), 900);
  } else if (keys.toLowerCase().endsWith('wish')) {
    keys = ''; fx.confetti(120, { stars: true }); audio.chime();
    toast('Wish granted. Probably. ✨');
    if (!store.seen('egg-wish')) store.award(5);
  }
}

window.littleverse = { store, go, music };
