// The universe that's currently playing. Every world reads its people, words,
// dates and colors from here, so nothing in the experience is hard-coded.
import { info, lightKm, AU } from './lib/dates.js';
import { themeOf, relById, occById, WORLD_DEFS, SECTORS as SECTOR_DEFS, mapOrder } from './lib/catalog.js';
import { verseName, wordGameName, worldTitle, worldShort } from './lib/templates.js';
import { mediaURL } from './lib/db.js';
import { setPresets, catSVG } from './core/cat.js';
import { CONTENT } from './content.js';
import { WORLDS, SECTORS, ALL_STAMPS, EXTRA_STAMPS, setCounts } from './worlds.js';
import { statusBar } from './shell/native.js';

// U is a live object; fields are reassigned in place on activate() so modules
// that imported it always see the current universe.
export const U = {
  id: null, raw: null, rel: 'partner', occ: 'birthday', theme: null, gentle: false, group: false,
  them: { name: '', photo: null, avatar: null }, me: { name: '', photo: null, avatar: null },
  date: null, studio: '', scope: '', verse: '', copy: {}, hidden: true, preview: false,
  // fill live tokens like {daysUntil} in a string
  fill: s => s,
  // a URL for a stored photo or song (bundled asset path or blob)
  url: ref => mediaURL(ref),
};

const fmtBig = n => {
  if (n >= 1e12) return (n / 1e12).toFixed(n >= 1e13 ? 1 : 2) + ' trillion';
  if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 1 : 2) + ' billion';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' million';
  return Math.round(n).toLocaleString('en-US');
};
const plural = (n, w) => `${n.toLocaleString('en-US')} ${w}${n === 1 ? '' : 's'}`;

export function liveValues() {
  const d = U.date;
  const since = Math.max(0, d.daysSince);
  const late = d.daysSinceLast;
  return {
    them: U.them.name, me: U.me.name, studio: U.studio, scope: U.scope, verse: U.verse,
    date: d.long, dateShort: d.short, dateFull: d.full, month: d.month, weekday: d.weekday,
    daysUntil: plural(d.daysUntil, 'day'), daysUntilN: d.daysUntil,
    hoursUntil: (d.daysUntil * 24).toLocaleString('en-US'),
    daysLate: plural(late, 'day'), daysLateN: late,
    daysSince: plural(since, 'day'), days: since.toLocaleString('en-US'),
    years: d.yearsSince ?? '', moons: Math.floor(since / 29.53).toLocaleString('en-US'),
    lightyears: (since / 365.25).toFixed(since / 365.25 >= 10 ? 0 : 1) + ' light-years',
    km: fmtBig(lightKm(since)), au: Math.round(lightKm(since) / AU).toLocaleString('en-US') + ' AU',
    kmLate: fmtBig(lightKm(late)), auLate: Math.round(lightKm(late) / AU).toLocaleString('en-US') + ' AU',
    pluto: Math.max(1, Math.round(lightKm(Math.max(since, 1)) / AU / 39.5)).toLocaleString('en-US'),
    plutoLate: Math.max(1, Math.round(lightKm(Math.max(late, 1)) / AU / 39.5)).toLocaleString('en-US'),
  };
}
export function fill(s) {
  if (typeof s !== 'string') return s;
  const v = liveValues();
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m));
}

// Apply the theme's colors to the page
export function applyTheme(t) {
  const r = document.documentElement.style;
  const map = { night: '--night', night2: '--night-2', dusk: '--dusk', horizon: '--horizon', rose: '--rose', gold: '--gold', hud: '--hud', lilac: '--lilac', peach: '--peach', sky: '--sky', paper: '--paper', muted: '--muted' };
  for (const [k, v] of Object.entries(map)) if (t[k]) r.setProperty(v, t[k]);
  r.setProperty('--mint', t.hud);
  // the big titles' lettering (the film, the map, the ident, the credits)
  if (t.font && t.font.id !== 'marquee') { r.setProperty('--f-marquee', t.font.family); r.setProperty('--f-marquee-w', String(t.font.weight || 400)); }
  else { r.removeProperty('--f-marquee'); r.removeProperty('--f-marquee-w'); }
  // the director's commentary
  if (t.note) for (const [k, v] of noteVars(t.note)) r.setProperty(k, v);
  statusBar('night', t.night);
}
const NOTE_VARS = ['--f-note', '--f-note-st', '--f-note-w', '--f-note-z', '--f-note-lh'];
export const noteVars = f => [['--f-note', f.family], ['--f-note-st', f.style || 'normal'], ['--f-note-w', String(f.weight || 400)], ['--f-note-z', f.size + 'px'], ['--f-note-lh', String(f.lh || 1.3)]];
// The big titles' lettering as a font shorthand, for document.fonts.load() before measuring.
export const titleFont = (px = 100) => `${px}px ${getComputedStyle(document.documentElement).getPropertyValue('--f-marquee').trim() || 'Italiana'}`;
export function clearTheme() {
  const r = document.documentElement.style;
  ['--night', '--night-2', '--dusk', '--horizon', '--rose', '--gold', '--hud', '--mint', '--lilac', '--peach', '--sky', '--paper', '--muted', '--f-marquee', '--f-marquee-w', ...NOTE_VARS].forEach(k => r.removeProperty(k));
  statusBar('day');
}

export async function activate(u, { preview = false } = {}) {
  const t = themeOf(u);
  const rel = relById(u.rel), occ = occById(u.occ);
  Object.assign(U, {
    id: u.id, raw: u, rel: u.rel, occ: u.occ, theme: t, preview,
    gentle: u.rel === 'memorial' || u.occ === 'remembrance', group: !!rel.group, relDef: rel, occDef: occ,
    them: { ...u.them }, me: { ...u.me },
    date: info(u.date, u.yearKnown !== false),
    studio: u.studio || `${u.me.name} Pictures`, scope: u.scope || `${u.them.name}Scope`,
    verse: (u.copy && u.copy.map && u.copy.map.title) || verseName(u.them.name),
    copy: u.copy || {}, hidden: u.hidden !== false, worlds: u.worlds || {},
  });
  U.fill = fill;
  // photos → URLs
  U.them.photoURL = await mediaURL(u.them.photo);
  U.me.photoURL = await mediaURL(u.me.photo);
  // characters
  setPresets({ ...(u.them.avatar || {}), name: u.them.name }, { ...(u.me.avatar || {}), name: u.me.name });
  U.meSticker = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(catSVG({ ...(u.me.avatar || {}), name: u.me.name }, { prop: true }));
  U.themSticker = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(catSVG({ ...(u.them.avatar || {}), name: u.them.name }, { prop: true }));

  // legacy CONTENT shape used by the worlds
  const c = u.copy || {};
  for (const k of Object.keys(CONTENT)) delete CONTENT[k];
  Object.assign(CONTENT, {
    her: u.them.name, them: u.them.name, me: u.me.name,
    birthday: { month: U.date.m, day: U.date.d },
    mixtape: c.mixtape || { title: '', tracks: [] },
    commentary: c.commentary || {},
    letters: (c.letters && c.letters.items) || [],
    coupons: (c.coupons && c.coupons.items) || [],
    words: c.words || [],
    trailer: (c.trailer && c.trailer.lines) || [],
    finale: c.finale || { lines: [], sign: '' },
    forecast: c.forecast || [],
  });

  // worlds: names that depend on the universe, then only the enabled ones
  const enabled = u.worlds || {};
  const n = c.words ? c.words.length : 0;
  const names = {
    wordle: { blurb: `${n} five-letter word${n === 1 ? '' : 's'}, chosen just for you. Six guesses each.`, goal: `Solve ${Math.max(1, Math.min(3, n))} word${Math.min(3, n) === 1 ? '' : 's'}` },
    coupons: c.coupons?.mode === 'promise' ? { blurb: 'Things we’ll keep doing. Scratch each card to reveal one.', goal: 'Reveal every promise', emoji: 'heart_with_ribbon', icon: '🤍' } : {},
    almanac: { blurb: `What the universe does on ${U.date.long}. Planets, stars, a forecast.` },
    trailer: { blurb: `The sequel. ${c.trailer?.rating || ''}`.trim() },
    mail: U.gentle ? { blurb: 'Things we wanted to say, for the moments we miss you most.' } : {},
    puzzle: { blurb: U.them.photoURL ? 'Your favorite pictures, scattered into pieces. Put them back together.' : 'Two characters, scattered into pieces. Put them back together.' },
    bakery: U.occ === 'birthday' || U.occ === 'belated' ? {} : { blurb: 'Drop each layer at the right moment. Stack the tallest cake in the galaxy. Any occasion is a cake occasion.' },
  };
  // ...in the maker's order, with any names and descriptions they wrote themselves
  const ord = mapOrder(u), own = u.worldText || {}, ownSec = u.sectorText || {};
  const blurbOf = id => String(own[id]?.blurb || '').trim();
  const list = WORLD_DEFS.filter(w => enabled[w.id] !== false).map(w => ({ ...w, ...(names[w.id] || {}), ...(blurbOf(w.id) ? { blurb: fill(blurbOf(w.id)) } : {}), name: fill(worldTitle(u, w.id, w.name)), short: fill(worldShort(u, w.id, w.name, w.short)) }))
    .sort((a, b) => ord.worlds.indexOf(a.id) - ord.worlds.indexOf(b.id));
  WORLDS.length = 0; WORLDS.push(...list.map(w => ({ ...w, load: LOADERS[w.id] })));
  SECTORS.length = 0; SECTORS.push(...SECTOR_DEFS.filter(s => WORLDS.some(w => w.sector === s.id)).sort((a, b) => ord.sectors.indexOf(a.id) - ord.sectors.indexOf(b.id)).map(s => ({
    ...s, name: fill(String(ownSec[s.id]?.name || '').trim() || s.name),
    sub: fill(String(ownSec[s.id]?.sub || '').trim() || s.sub.replace('{me}', u.me.name.replace(/^The\s/, 'the '))),
  })));
  setCounts(U);
  return U;
}

const LOADERS = {
  flight: () => import('./views/flight.js'), bakery: () => import('./views/bakery.js'), probe: () => import('./views/probe.js'),
  tapdance: () => import('./views/tapdance.js'), chords: () => import('./views/chords.js'), puzzle: () => import('./views/puzzle.js'),
  wordle: () => import('./views/wordle.js'), hats: () => import('./views/hats.js'), stars: () => import('./views/stars.js'),
  gacha: () => import('./views/gacha.js'), mail: () => import('./views/mail.js'), coupons: () => import('./views/coupons.js'),
  almanac: () => import('./views/almanac.js'), mixtape: () => import('./views/mixtape.js'), trailer: () => import('./views/trailer.js'),
  finale: () => import('./views/finale.js'), reasons: () => import('./views/reasons.js'), memories: () => import('./views/memories.js'),
};
