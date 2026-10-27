// Littleverse: app entry. A small hash router for the shell screens, plus the
// experience runtime for playing a universe.
//   #/                 Home (your universes, examples, coming up)
//   #/new[/<rel>]      Create a universe (wizard)
//   #/inbox            Gifts you've received
//   #/you              Settings
//   #/u/<id>           A universe: preview, share, customize
//   #/u/<id>/e/<sec>   Edit one part of a universe
//   #/p/<id>/...       Play a universe (film, map, worlds)
import { h } from './core/dom.js';
import { db, settings } from './lib/db.js';
// The experience runtime and the example universes load on demand, so Home
// opens without parsing the film, the worlds' engine or the starter text.
let playMod = null;
const loadPlay = () => playMod ? Promise.resolve(playMod) : import('./play.js').then(m => (playMod = m));
const playing = () => !!(playMod && playMod.isActive());
// ...but once a universe is a tap away, get the runtime and the film ready while idle.
let warmed = false;
function warmPlay() {
  if (warmed) return;
  warmed = true;
  const go = () => loadPlay().then(p => p.warm()).catch(() => { warmed = false; });
  if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 3000 }); else setTimeout(go, 1200);
}
import { ic, closeSheets, hasSheet, haptic } from './shell/kit.js';
import { initNative, setHaptics, statusBar, isAndroidApp } from './shell/native.js';
import { themeOf } from './lib/catalog.js';
import { initTheme } from './shell/theme.js';

const app = document.getElementById('app');
const bg = h('div', { class: 'lv-bg', 'aria-hidden': 'true' });
const host = h('div', { id: 'screen' });
// Making something is an action, not a place: "New" lives on Home, not in the tab bar.
const tabs = [
  { id: 'home', label: 'Home', icon: 'house', href: '#/' },
  { id: 'inbox', label: 'Inbox', icon: 'inbox', href: '#/inbox' },
  { id: 'you', label: 'You', icon: 'user-round', href: '#/you' },
];
const tabbar = h('nav', { class: 'tabbar', 'aria-label': 'Main' }, ...tabs.map(t =>
  h('a', { class: 'tab', href: t.href, 'data-tab': t.id, onclick: () => haptic('select') }, ic(t.icon), h('span', { text: t.label }))));
app.append(bg, host, tabbar);

/* ---------- lights down / lights up ----------
   The workshop is daylight; a universe plays at night. Going in, the page dims
   to that universe's night before the title card; coming back, the lights
   come up again. */
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let ld = null, ldColor = '#0c0b24';
function lightsLayer(color) {
  if (!ld) { ld = h('div', { class: 'lights-down', 'aria-hidden': 'true' }); document.body.append(ld); }
  ldColor = color || ldColor;
  ld.style.setProperty('--ld', ldColor);
  return ld;
}
async function lightsDown(color) {
  const el = lightsLayer(color);
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  await new Promise(r => setTimeout(r, reduceMotion() ? 60 : 200));
}
function lightsOff() { if (ld) ld.classList.remove('on'); }
function lightsOnNow() { const el = lightsLayer(); el.style.transition = 'none'; el.classList.add('on'); void el.offsetWidth; el.style.transition = ''; }

/* ---------- first run: install the examples, then the tour ---------- */
// The tour shows once, on a fresh install (or after Erase everything), and again from
// You → How Littleverse works. 'pending' survives closing the app halfway through it.
async function seed() {
  const s = settings.get();
  if (s.seeded) return;
  if (!s.tour) settings.set({ tour: 'pending' });
  const have = new Set((await db.all()).map(u => u.id));
  const { demoUniverses } = await import('./lib/demo.js');
  for (const d of demoUniverses()) if (!have.has(d.id)) await db.put(d, { touch: false });
  settings.set({ seeded: 1 });
}
// Universes saved before the song library still point at the old house-band songs.
async function upgradeSongs() {
  if (settings.get().songs >= 2) return;
  const { upgradeTracks } = await import('./lib/templates.js');
  for (const u of await db.all()) if (upgradeTracks(u.copy?.mixtape?.tracks)) await db.put(u, { touch: false });
  settings.set({ songs: 2 });
}

/* ---------- inbox badge ---------- */
export async function paintBadge() {
  const unseen = (await db.all()).filter(u => u.kind === 'received' && !u.opened).length;
  const t = tabbar.querySelector('[data-tab=inbox]');
  t.querySelector('.dot')?.remove();
  if (unseen) t.append(h('span', { class: 'dot', text: String(unseen) }));
}

/* ---------- router ---------- */
const ROUTES = [
  [/^#\/?$/, 'home', 0, () => import('./shell/home.js')],
  [/^#\/inbox\/?$/, 'inbox', 0, () => import('./shell/inbox.js')],
  [/^#\/you\/?$/, 'you', 0, () => import('./shell/settings.js')],
  [/^#\/new(?:\/([\w-]+))?\/?$/, 'new', 1, () => import('./shell/create.js')],
  [/^#\/u\/([\w-]+)\/e\/([\w-]+)(?:\/([\w-]+))?\/?$/, 'edit', 2, () => import('./shell/edit.js')],
  [/^#\/u\/([\w-]+)\/?$/, 'universe', 1, () => import('./shell/universe.js')],
];
let cur = null, depth = 0, token = 0, curName = 'home';
// Ads and the Remove ads purchase: the Android app only (js/monetize/index.js).
let monetize = null;

async function route() {
  const hash = location.hash || '#/';
  const my = ++token;
  if (hasSheet()) closeSheets();

  // play a universe
  const pm = /^#\/p\/([\w-]+)/.exec(hash);
  if (pm) {
    const u = await db.get(pm[1]);
    if (my !== token) return;
    if (!u) { location.replace('#/'); return; }
    const night = themeOf(u).night;
    const fromShell = !playing() && cur != null;
    const [play] = await Promise.all([loadPlay(), fromShell ? lightsDown(night) : null]);
    if (my !== token) { lightsOff(); return; }
    teardown();
    curName = 'play';
    monetize?.onScreen('play');
    const from = u.kind === 'received' ? '#/inbox' : `#/u/${u.id}`;
    if (u.kind === 'received' && !u.opened) { u.opened = Date.now(); db.put(u, { touch: false }).then(paintBadge); }
    statusBar('night', night);
    await play.enter(u, { preview: u.kind !== 'received', from });
    lightsOff();
    return;
  }
  let lightsUp = false;
  if (playing()) { lightsOnNow(); playMod.leave(); lightsUp = true; statusBar('day'); }

  let match = null;
  for (const [re, name, d, load] of ROUTES) { const m = re.exec(hash); if (m) { match = { name, d, load, params: m.slice(1) }; break; } }
  if (!match) { location.replace('#/'); return; }
  const mod = await match.load();
  if (my !== token) return;
  const anim = cur == null ? 'fade' : match.d > depth ? (match.name === 'new' ? 'up' : 'push') : match.d < depth ? 'pop' : 'fade';
  teardown();
  depth = match.d;
  const showTabs = match.d === 0;
  tabbar.hidden = !showTabs;
  tabbar.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-current', t.dataset.tab === match.name ? 'page' : 'false'));
  const ctx = { params: match.params, anim, tabs: showTabs, go: p => { location.hash = p; }, replace: p => location.replace(p), refresh: () => { depth = match.d; route(); }, refreshBadge: paintBadge };
  let out;
  try { out = await mod.render(ctx); }
  catch (e) {
    console.error(e);
    out = { el: h('main', { class: 'scr' }, h('div', { class: 'empty' }, h('h3', { text: 'This screen couldn’t open' }), h('p', { text: String(e && e.message || e) }), h('a', { class: 'b primary', href: '#/', text: 'Go home' }))) };
  }
  if (my !== token) { out && out.cleanup && out.cleanup(); if (lightsUp) lightsOff(); return; }
  cur = out;
  host.replaceChildren(out.el);
  window.scrollTo({ top: out.scroll || 0, behavior: 'instant' });
  document.title = out.title ? `${out.title} · Littleverse` : 'Littleverse';
  curName = match.name;
  monetize?.onScreen(match.name);
  if (lightsUp) monetize?.naturalBreak('play-exit');
  if (lightsUp) requestAnimationFrame(lightsOff);
  if (match.name === 'home' || match.name === 'universe' || match.name === 'inbox') warmPlay();
}
function teardown() {
  if (!cur) return;
  try { cur.cleanup && cur.cleanup(); } catch (e) { console.error(e); }
  host.querySelectorAll('.navbar').forEach(n => n._off && n._off());
  cur = null;
}

async function firstTour() {
  if (settings.get().tour !== 'pending') return;
  try { await (await import('./shell/tour.js')).openTour(); }
  catch (e) { console.error(e); }
  settings.set({ tour: 'done' });
}

// Once the first screen is up, fetch the other screens while the phone is idle, so the
// first tap on Inbox, You, New or a universe opens it at once.
function prefetchScreens() {
  const go = () => { for (const r of ROUTES) r[3]().catch(() => {}); };
  if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 4000 }); else setTimeout(go, 1500);
}

/* ---------- boot ---------- */
initTheme();
setHaptics(settings.get().haptics !== false);
// Android's back button closes the tour (it's loaded by then), then a sheet, then goes back.
const onBack = () => {
  if (document.querySelector('.lv-tour:not(.closing)')) { import('./shell/tour.js').then(m => m.dismiss()); return true; }
  if (hasSheet()) { closeSheets(); return true; }
  return false;
};
initNative({ onBack });
addEventListener('hashchange', route);
db.onChange(() => paintBadge());
// Ads (and Google's consent form) wait for the tour, so the first thing a new person sees is
// the app, not a dialog.
seed().then(upgradeSongs).catch(e => console.error(e)).then(() => { route(); paintBadge(); prefetchScreens(); return firstTour(); }).then(startMonetize);
// After the first screen is up: the web and iPhone versions never load any of it.
function startMonetize() {
  if (!isAndroidApp()) return;
  import('./monetize/index.js').then(m => { monetize = m; m.onScreen(curName); return m.boot(); }).catch(e => console.error(e));
}
// Offline support is for the web version; the installed app already has every file on the phone.
const nativeApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
if ('serviceWorker' in navigator && location.protocol === 'https:' && !nativeApp) navigator.serviceWorker.register('sw.js').catch(() => {});
