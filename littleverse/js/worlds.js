// The map of the active universe: its worlds, sectors and passport stamps.
// These arrays are filled in place by active.js when a universe starts playing,
// so every module that imports them sees the current universe.
import { worldDef } from './lib/catalog.js';

export const SECTORS = [];
export const WORLDS = [];
export const ALL_STAMPS = [];
export const EXTRA_STAMPS = [
  { id: 'film', name: 'The Premiere', icon: '🎬', emoji: 'clapper_board', color: 'var(--gold)', goal: 'Watch the film to the credits' },
  { id: 'hidden', name: 'Hide and Seek', icon: '🔎', emoji: 'crystal_ball', color: 'var(--gold)', goal: 'Find every hidden friend' },
];

// Where the little hidden characters are tucked away (film and map always count).
export const HIDE_SPOTS = {
  'film-letter': 'film', 'map-obs': 'map',
  'mail-hide': 'mail', 'reasons-hide': 'reasons', 'memories-hide': 'memories', 'bakery-hide': 'bakery', 'flight-hide': 'flight',
  'wordle-hide': 'wordle', 'stars-hide': 'stars', 'puzzle-hide': 'puzzle', 'chords-hide': 'chords', 'tapdance-hide': 'tapdance',
  'gacha-hide': 'gacha', 'probe-hide': 'probe', 'coupons-hide': 'coupons', 'mixtape-hide': 'mixtape',
};

export let HIDDEN_TOTAL = 12;  // how many hidden friends exist in this universe
export let FINALE_NEEDS = 12;  // stamps needed to unlock the finale
export let HIDDEN_ON = true;

export function setCounts(U) {
  HIDDEN_ON = U.hidden !== false;
  const on = new Set(WORLDS.map(w => w.id));
  const spots = Object.entries(HIDE_SPOTS).filter(([, w]) => w === 'film' || w === 'map' || on.has(w)).map(([id]) => id);
  HIDDEN_TOTAL = Math.min(12, spots.length);
  ACTIVE_SPOTS.length = 0; ACTIVE_SPOTS.push(...spots.slice(0, HIDDEN_TOTAL));
  const hide = { ...EXTRA_STAMPS[1], name: `Where’s ${U.me.name}?`, short: 'Hide and Seek', goal: `Find all ${HIDDEN_TOTAL} hidden ${U.me.name}s` };
  ALL_STAMPS.length = 0;
  ALL_STAMPS.push(EXTRA_STAMPS[0], ...WORLDS.filter(w => w.id !== 'finale'), ...(HIDDEN_ON ? [hide] : []));
  FINALE_NEEDS = Math.min(12, Math.max(3, Math.round(ALL_STAMPS.length * 0.7)));
  const fin = WORLDS.find(w => w.id === 'finale');
  if (fin) { fin.needs = FINALE_NEEDS; fin.goal = `Collect ${FINALE_NEEDS} stamps to unlock`; }
}
export const ACTIVE_SPOTS = [];

export const worldById = id => WORLDS.find(w => w.id === id);
export { worldDef };
