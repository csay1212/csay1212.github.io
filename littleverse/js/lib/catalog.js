// What a universe can be: who it's for, the occasion, the look, and which worlds.
// Everything here is general-purpose. Nothing is about one specific person.

export const RELATIONSHIPS = [
  { id: 'partner', label: 'Partner', emoji: 'revolving_hearts', blurb: 'Boyfriend, girlfriend, spouse, person.', tone: 'tender', themCap: 'my favorite person', meCap: 'the one who made this' },
  { id: 'bestie', label: 'Best friend', emoji: 'people_hugging', blurb: 'The one who already knows.', tone: 'playful', themCap: 'best friend, certified', meCap: 'the other half of the duo' },
  { id: 'friends', label: 'Friend group', emoji: 'partying_face', blurb: 'The group chat, the crew, the table.', tone: 'playful', group: true, themCap: 'the whole crew', meCap: 'the one who organized this' },
  { id: 'family', label: 'Family', emoji: 'house_with_garden', blurb: 'Parents, grandparents, siblings.', tone: 'tender', themCap: 'the heart of the family', meCap: 'with love, always' },
  { id: 'distance', label: 'Long distance', emoji: 'airplane_departure', blurb: 'Different time zones, same sky.', tone: 'tender', themCap: 'far away, close anyway', meCap: 'on the other side of the map' },
  { id: 'memorial', label: 'In memory', emoji: 'candle', blurb: 'For someone you miss.', tone: 'gentle', themCap: 'loved, always', meCap: 'the ones who remember' },
  { id: 'kid', label: 'A little one', emoji: 'teddy_bear', blurb: 'Kids, nieces, nephews, godchildren.', tone: 'playful', themCap: 'the star of the show', meCap: 'their biggest fan' },
  { id: 'mentor', label: 'Teacher or mentor', emoji: 'graduation_cap', blurb: 'Someone who taught you something.', tone: 'warm', themCap: 'the one who believed first', meCap: 'a grateful student' },
  { id: 'colleague', label: 'Colleague', emoji: 'briefcase', blurb: 'Teammates, work friends, farewells.', tone: 'warm', themCap: 'MVP of the office', meCap: 'from the team' },
  { id: 'pet', label: 'A pet', emoji: 'dog_face', blurb: 'Yes, really. They deserve it.', tone: 'playful', themCap: 'a very good friend', meCap: 'their human' },
  { id: 'self', label: 'Future me', emoji: 'seedling', blurb: 'A time capsule for yourself.', tone: 'warm', themCap: 'you, a little later', meCap: 'you, right now' },
];

export const OCCASIONS = [
  { id: 'birthday', label: 'Birthday', emoji: 'birthday_cake', blurb: 'Another trip around the sun.', dateLabel: 'Their birthday', title: 'Happy Birthday', yearly: true },
  { id: 'belated', label: 'Belated birthday', emoji: 'alarm_clock', blurb: 'You missed it. Make up for it.', dateLabel: 'The birthday you missed', title: 'Happy Birthday', yearly: true },
  { id: 'anniversary', label: 'Anniversary', emoji: 'ring', blurb: 'The day it all started.', dateLabel: 'The day it started', title: 'Happy Anniversary', yearly: true },
  { id: 'justbecause', label: 'Just because', emoji: 'love_letter', blurb: 'No reason needed.', dateLabel: 'A date that means something', title: 'For You' },
  { id: 'sorry', label: 'Apology', emoji: 'bouquet', blurb: 'When a text isn’t enough.', dateLabel: 'Today’s date is fine', title: 'I’m Sorry' },
  { id: 'congrats', label: 'Congratulations', emoji: 'trophy', blurb: 'Graduations, new jobs, big wins.', dateLabel: 'The big day', title: 'You Did It' },
  { id: 'farewell', label: 'Farewell', emoji: 'luggage', blurb: 'Moving away, new chapters.', dateLabel: 'Departure day', title: 'Bon Voyage' },
  { id: 'getwell', label: 'Get well', emoji: 'tulip', blurb: 'Rest, recover, feel loved.', dateLabel: 'Today’s date is fine', title: 'Get Well Soon' },
  { id: 'reunion', label: 'Countdown', emoji: 'hourglass_not_done', blurb: 'Until you’re together again.', dateLabel: 'The day you’ll meet', title: 'See You Soon', future: true },
  { id: 'thanks', label: 'Thank you', emoji: 'sunflower', blurb: 'For everything, specifically.', dateLabel: 'A date that means something', title: 'Thank You' },
  { id: 'remembrance', label: 'Remembrance', emoji: 'dove', blurb: 'Celebrate a life.', dateLabel: 'Their birthday', title: 'In Loving Memory', yearly: true },
  { id: 'newyear', label: 'New year', emoji: 'fireworks', blurb: 'A fresh start, together.', dateLabel: 'New Year’s Day', title: 'Happy New Year', yearly: true },
];

// Which occasions to offer for each relationship, best fits first.
export const OCCASION_FOR = {
  partner: ['birthday', 'anniversary', 'belated', 'justbecause', 'sorry', 'reunion', 'congrats', 'getwell', 'newyear'],
  bestie: ['birthday', 'belated', 'justbecause', 'farewell', 'congrats', 'thanks', 'sorry', 'getwell', 'newyear'],
  friends: ['birthday', 'farewell', 'newyear', 'justbecause', 'congrats', 'reunion', 'thanks'],
  family: ['birthday', 'thanks', 'justbecause', 'belated', 'anniversary', 'getwell', 'congrats', 'farewell', 'newyear'],
  distance: ['reunion', 'birthday', 'anniversary', 'justbecause', 'belated', 'farewell'],
  memorial: ['remembrance', 'birthday', 'thanks'],
  kid: ['birthday', 'congrats', 'justbecause', 'getwell', 'newyear'],
  mentor: ['thanks', 'farewell', 'congrats', 'birthday'],
  colleague: ['farewell', 'birthday', 'congrats', 'thanks', 'getwell'],
  pet: ['birthday', 'justbecause', 'getwell', 'thanks'],
  self: ['newyear', 'birthday', 'congrats', 'justbecause'],
};

// Colors for the whole experience. `rose`, `gold`, etc. are roles, not literal hues.
export const THEMES = [
  { id: 'twilight', label: 'Twilight', night: '#0d0c22', night2: '#13122e', dusk: '#29224f', horizon: '#4a3568', rose: '#e89ab9', gold: '#f0cf7e', hud: '#9fd8cf', lilac: '#b8a6f0', peach: '#f2a98d', sky: '#a9d0f0', paper: '#f5efe6', muted: '#b4aed0' },
  { id: 'golden', label: 'Golden hour', night: '#1a0f14', night2: '#24141b', dusk: '#4a2533', horizon: '#84423f', rose: '#f39aa9', gold: '#f6c77c', hud: '#f5d6ae', lilac: '#ddb0cf', peach: '#f4a47a', sky: '#f5d3ac', paper: '#fbf1e6', muted: '#d3bab4' },
  { id: 'seaglass', label: 'Sea glass', night: '#071620', night2: '#0b202d', dusk: '#143a4c', horizon: '#215c69', rose: '#f1a7b6', gold: '#f3d27e', hud: '#8fd8c8', lilac: '#a7c6f2', peach: '#f4b694', sky: '#ade0f5', paper: '#eef7f5', muted: '#a5c2ca' },
  { id: 'meadow', label: 'Meadow', night: '#0c1812', night2: '#112219', dusk: '#213d2c', horizon: '#3b6143', rose: '#eeaabb', gold: '#ecd27a', hud: '#addcb9', lilac: '#c7baf2', peach: '#f2b691', sky: '#c0e2cb', paper: '#f6f2e7', muted: '#b3c4b5' },
  { id: 'candle', label: 'Candlelight', night: '#14100c', night2: '#1d1611', dusk: '#3b2b1d', horizon: '#64432a', rose: '#eba99b', gold: '#f3c27a', hud: '#ead9b5', lilac: '#cbb5da', peach: '#f0a77a', sky: '#f5dcae', paper: '#f8efe2', muted: '#c6b6a2' },
  { id: 'bubblegum', label: 'Bubblegum', night: '#1b0b24', night2: '#25102f', dusk: '#461d58', horizon: '#763284', rose: '#f39ad0', gold: '#f6d67a', hud: '#9fe3d5', lilac: '#c9aaf6', peach: '#f3a593', sky: '#ade0f8', paper: '#fdf2fa', muted: '#d4bcdd' },
  { id: 'moonlight', label: 'Moonlight', night: '#0a0b14', night2: '#10121f', dusk: '#1f2336', horizon: '#3b4060', rose: '#f2b8c6', gold: '#ece4cf', hud: '#b8d8e8', lilac: '#c5c0ff', peach: '#f0c2a8', sky: '#c9dcf2', paper: '#f4f3ef', muted: '#a9acc0' },
  { id: 'aurora', label: 'Aurora', night: '#06101a', night2: '#0a1a27', dusk: '#112f46', horizon: '#165a58', rose: '#f29cc8', gold: '#f3d07c', hud: '#86e3c3', lilac: '#ab95f0', peach: '#f3a587', sky: '#8fd2f2', paper: '#eef5fc', muted: '#a5b8ca' },
];
export const themeById = id => THEMES.find(t => t.id === id) || THEMES[0];

// A universe's own look (u.look) on top of its theme: any of these colors, the
// lettering of the big titles, and how many stars are in the sky.
export const COLOR_ROLES = [
  ['night', 'Night sky'], ['dusk', 'Twilight'], ['horizon', 'Horizon glow'], ['paper', 'Text'],
  ['gold', 'Gold'], ['rose', 'Rose'], ['hud', 'Mint'], ['lilac', 'Lilac'], ['peach', 'Peach'], ['sky', 'Sky blue'],
];
export const FONTS = [
  { id: 'marquee', label: 'Marquee', family: '"Italiana","Didot","Bodoni 72",Georgia,serif' },
  { id: 'storybook', label: 'Storybook', family: '"Cormorant Garamond","Garamond","Times New Roman",serif', weight: 600, scale: .92 },
  { id: 'hand', label: 'Handwritten', family: '"Caveat","Segoe Print","Bradley Hand",cursive', weight: 700, scale: 1.08 },
  { id: 'modern', label: 'Modern', family: '"Figtree",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif', weight: 700, scale: .8 },
];
export const STARS = [{ id: 'few', label: 'A few', n: .4 }, { id: 'some', label: 'Some', n: 1 }, { id: 'lots', label: 'Lots', n: 1.8 }, { id: 'galaxy', label: 'A galaxy', n: 2.8 }];
export const fontById = id => FONTS.find(f => f.id === id) || FONTS[0];
export const starsById = id => STARS.find(s => s.id === id) || STARS[1];

const HEX = /^#[0-9a-f]{6}$/i;
export function mixHex(a, b, t) {
  const p = x => { const n = parseInt(String(x).slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
// The theme a universe actually plays in: its preset, its own colors, its lettering and stars.
export function themeOf(u) {
  const base = themeById(u && u.theme), look = (u && u.look) || {}, own = look.colors || {};
  const t = { ...base };
  for (const [k] of COLOR_ROLES) if (HEX.test(own[k] || '')) t[k] = own[k].toLowerCase();
  // the in-between shades follow the colors they sit between
  if (t.night !== base.night || t.dusk !== base.dusk) t.night2 = mixHex(t.night, t.dusk, .18);
  if (t.paper !== base.paper || t.horizon !== base.horizon) t.muted = mixHex(t.paper, t.horizon, .4);
  t.custom = COLOR_ROLES.some(([k]) => t[k] !== base[k]);
  t.font = fontById(look.font);
  t.stars = starsById(look.stars).n;
  return t;
}

export const DEFAULT_THEME = { partner: 'twilight', bestie: 'bubblegum', friends: 'golden', family: 'golden', distance: 'seaglass', memorial: 'candle', kid: 'bubblegum', mentor: 'meadow', colleague: 'seaglass', pet: 'meadow', self: 'aurora' };

// Avatar species for the propeller-hat characters.
export const SPECIES = [
  { id: 'cat', label: 'Cat' }, { id: 'bunny', label: 'Bunny' }, { id: 'bear', label: 'Bear' }, { id: 'dog', label: 'Pup' }, { id: 'fox', label: 'Fox' }, { id: 'mouse', label: 'Mouse' },
];
export const FURS = ['#ffffff', '#f3e3cf', '#d9a066', '#8a5a3c', '#b9b6c2', '#5b5566', '#2d2a35', '#ffc9d9', '#c9f0d0', '#ff9b52'];

// Hat palettes for quick picks (side, front-left, front-right, brim, prop)
export const HATS = [
  { id: 'sunset', side: '#f07ab0', fl: '#f7a6c4', fr: '#9b5ff0', brim: '#e3a6f5', prop: '#f490c4' },
  { id: 'primary', side: '#e8322d', fl: '#fdb515', fr: '#1c4fd0', brim: '#14a06d', prop: '#2a8fe8' },
  { id: 'ocean', side: '#1c7fd0', fl: '#7fd3ff', fr: '#1d3fa0', brim: '#7fe3d0', prop: '#48c1ff' },
  { id: 'mint', side: '#24b07c', fl: '#a8e6b8', fr: '#f5cc4a', brim: '#fff4c2', prop: '#5fd39b' },
  { id: 'berry', side: '#9b2d6f', fl: '#ff8ccf', fr: '#5a2a9b', brim: '#ffc0e2', prop: '#ff6fb5' },
  { id: 'sun', side: '#f59e0b', fl: '#fde68a', fr: '#ef4444', brim: '#fff1c2', prop: '#fbbf24' },
  { id: 'mono', side: '#2d2a35', fl: '#6b6578', fr: '#b9b6c2', brim: '#f6eee3', prop: '#6b6578' },
  { id: 'lilac', side: '#8b5cf6', fl: '#c4b5fd', fr: '#f0abfc', brim: '#ede9fe', prop: '#a78bfa' },
];

// Sectors of the map
export const SECTORS = [
  { id: 'arcade', name: 'The Arcade', sub: 'Games, mostly about defying physics' },
  { id: 'studio', name: 'The Studio', sub: 'Make something. Keep it.' },
  { id: 'post', name: 'The Post Office', sub: 'Things {me} wrote down for you' },
  { id: 'soon', name: 'Coming Attractions', sub: 'What happens next' },
];

// Every world. Names that depend on the universe are filled in by templates.js.
// `edit` lists the content keys the editor exposes for this world.
export const WORLD_DEFS = [
  { id: 'flight', sector: 'arcade', line: 'Fly through lamp posts with one button', emoji: 'small_airplane', icon: '🛩️', color: 'var(--sky)', name: 'Propeller Flight Academy', short: 'Flight Academy', blurb: 'One button. One propeller hat. Fly through the lamp posts and collect stardust.', goal: 'Fly through 12 gates' },
  { id: 'bakery', sector: 'arcade', line: 'Stack the tallest cake in the galaxy', emoji: 'birthday_cake', icon: '🎂', color: 'var(--rose)', name: 'The Cake Tower', short: 'Cake Tower', blurb: 'Drop each layer at the right moment. Stack the tallest cake in the galaxy.', goal: 'Stack 12 layers' },
  { id: 'probe', sector: 'arcade', line: 'Slingshot a message past the planets', emoji: 'satellite', icon: '🛰️', color: 'var(--hud)', name: 'Probe Delivery', short: 'Probe Delivery', blurb: 'A message is on its way. Slingshot it past planets and black holes to deliver it.', goal: 'Complete 6 deliveries' },
  { id: 'tapdance', sector: 'arcade', line: 'A rhythm game for two, under a streetlamp', emoji: 'mans_shoe', icon: '👞', color: 'var(--gold)', name: 'Streetlamp Swing', short: 'Tap Dance', blurb: 'A hill, a streetlamp, a swing tune. Tap in time and the two of you dance.', goal: 'Finish a dance with a B or better' },
  { id: 'chords', sector: 'arcade', line: 'Echo the chords a far-off star sings', emoji: 'musical_notes', icon: '🎶', color: 'var(--lilac)', name: 'Call & Response', short: 'Call & Response', blurb: 'A friend from another star speaks in chords. Listen, then answer back.', goal: 'Repeat an 8-chord message' },
  { id: 'puzzle', sector: 'arcade', line: 'Your favorite pictures, as a jigsaw', emoji: 'puzzle_piece', icon: '🧩', color: 'var(--peach)', name: 'Portrait Puzzle', short: 'Jigsaw', blurb: 'Your favorite pictures, scattered into pieces. Put them back together.', goal: 'Finish any puzzle' },
  { id: 'wordle', sector: 'arcade', line: 'Five-letter words chosen just for them', emoji: 'input_latin_uppercase', icon: '🔤', color: 'var(--hud)', name: 'The Word Game', short: 'Word Game', blurb: 'Twelve five-letter words, chosen just for you. Six guesses each.', goal: 'Solve 3 words' },
  { id: 'hats', sector: 'studio', line: 'Design a propeller-hat character', emoji: 'billed_cap', icon: '🧢', color: 'var(--rose)', name: 'The Hat Workshop', short: 'Hat Workshop', blurb: 'Design your own propeller-hat pilot. It flies with you everywhere.', goal: 'Design and save a pilot' },
  { id: 'stars', sector: 'studio', line: 'Draw a constellation and name it', emoji: 'sparkles', icon: '✨', color: 'var(--gold)', name: 'Star Registry', short: 'Star Registry', blurb: 'Draw your own constellation, name it, and get the official certificate.', goal: 'Register a constellation' },
  { id: 'gacha', sector: 'studio', line: 'Spend stardust on collectible stickers', emoji: 'lollipop', icon: '🍭', color: 'var(--rose)', name: 'The Lollipop Machine', short: 'Lollipop Machine', blurb: 'Spend stardust, turn the crank, collect all 24 stickers.', goal: 'Collect 8 stickers' },
  { id: 'mail', sector: 'post', line: 'Letters to open at the right moment', emoji: 'love_letter', icon: '💌', color: 'var(--rose)', name: 'Open When…', short: 'Open When…', blurb: 'A stack of letters for specific moments. Some are sealed until the right day.', goal: 'Open 5 letters' },
  { id: 'reasons', sector: 'post', line: 'A deck of cards that each say something true', emoji: 'flower_playing_cards', icon: '🎴', color: 'var(--lilac)', name: 'Reasons', short: 'Reasons', blurb: 'A deck of cards. Each one says something true.', goal: 'Turn over every card' },
  { id: 'memories', sector: 'post', line: 'A scrapbook of moments, in order', emoji: 'camera_with_flash', icon: '📸', color: 'var(--peach)', name: 'Memory Lane', short: 'Memory Lane', blurb: 'A scrapbook of moments, in the order they happened.', goal: 'Walk to the end of the lane' },
  { id: 'coupons', sector: 'post', line: 'Scratch-off coupons for real things', emoji: 'admission_tickets', icon: '🎟️', color: 'var(--gold)', name: 'The Coupon Book', short: 'Coupon Book', blurb: 'Scratch-off coupons, redeemable for real things.', goal: 'Scratch every coupon' },
  { id: 'almanac', sector: 'post', line: 'What the sky did on the date that matters', emoji: 'comet', icon: '☄️', color: 'var(--sky)', name: 'The Almanac', short: 'Almanac', blurb: 'What the sky was doing on the day that matters.', goal: 'Read to the last page' },
  { id: 'mixtape', sector: 'post', line: 'The soundtrack, with liner notes', emoji: 'videocassette', icon: '📼', color: 'var(--lilac)', name: 'The Mixtape', short: 'Mixtape', blurb: 'The soundtrack, on a cassette, with liner notes.', goal: 'Play a song from the tape' },
  { id: 'trailer', sector: 'soon', line: 'A movie trailer for what comes next', emoji: 'film_frames', icon: '🎞️', color: 'var(--signal)', chrome: false, name: 'Coming Soon', short: 'Trailer', blurb: 'The sequel. In theaters soon.', goal: 'Watch the whole trailer' },
  { id: 'finale', sector: 'soon', line: 'Fireworks and credits at the very end', emoji: 'fireworks', icon: '🎆', color: 'var(--gold)', chrome: false, needs: 12, name: 'The Grand Finale', short: 'Finale', blurb: 'Fireworks, end credits starring you, and one last message.', goal: 'Collect stamps to unlock' },
];
export const worldDef = id => WORLD_DEFS.find(w => w.id === id);

// The map's order for a universe: its sections, and the worlds inside each, as the
// maker arranged them (u.order). Coming Attractions stays last, the finale last of all.
export function mapOrder(u) {
  const o = (u && u.order) || {};
  const rank = (list, id, fallback) => { const i = Array.isArray(list) ? list.indexOf(id) : -1; return i < 0 ? 1000 + fallback : i; };
  const sectors = SECTORS.map((s, i) => [s.id, s.id === 'soon' ? 1e6 : rank(o.sectors, s.id, i)]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
  const worlds = WORLD_DEFS.map((w, i) => ({ id: w.id, s: sectors.indexOf(w.sector), r: w.id === 'finale' ? 1e6 : rank(o.worlds, w.id, i) }))
    .sort((a, b) => a.s - b.s || a.r - b.r).map(w => w.id);
  return { sectors, worlds };
}

// Worlds that make sense by default, per relationship and occasion: a curated
// handful (about 10–13), not everything. People can switch any of them on later.
const REC = {
  partner: ['mail', 'reasons', 'memories', 'coupons', 'mixtape', 'puzzle', 'wordle', 'tapdance', 'stars', 'flight', 'gacha', 'finale'],
  bestie: ['mail', 'reasons', 'memories', 'coupons', 'wordle', 'flight', 'bakery', 'gacha', 'hats', 'puzzle', 'mixtape', 'finale'],
  friends: ['memories', 'reasons', 'coupons', 'wordle', 'flight', 'bakery', 'gacha', 'hats', 'puzzle', 'mixtape', 'trailer', 'finale'],
  family: ['mail', 'reasons', 'memories', 'coupons', 'puzzle', 'wordle', 'stars', 'almanac', 'mixtape', 'finale'],
  distance: ['mail', 'reasons', 'memories', 'coupons', 'stars', 'chords', 'wordle', 'mixtape', 'almanac', 'puzzle', 'finale'],
  memorial: ['mail', 'reasons', 'memories', 'coupons', 'stars', 'puzzle', 'almanac', 'mixtape', 'wordle', 'finale'],
  kid: ['flight', 'bakery', 'puzzle', 'hats', 'gacha', 'stars', 'wordle', 'reasons', 'mail', 'coupons', 'finale'],
  mentor: ['mail', 'reasons', 'memories', 'stars', 'puzzle', 'wordle', 'coupons', 'mixtape', 'finale'],
  colleague: ['reasons', 'memories', 'coupons', 'wordle', 'flight', 'puzzle', 'probe', 'mail', 'finale'],
  pet: ['reasons', 'memories', 'coupons', 'puzzle', 'flight', 'bakery', 'hats', 'gacha', 'finale'],
  self: ['mail', 'reasons', 'memories', 'stars', 'almanac', 'wordle', 'mixtape', 'chords', 'finale'],
};
const REC_OCC = {
  birthday: { add: ['bakery', 'trailer'] }, belated: { add: ['bakery', 'trailer'] }, anniversary: { add: ['tapdance', 'trailer'] },
  newyear: { add: ['trailer', 'almanac'] }, reunion: { add: ['almanac', 'chords'] }, farewell: { add: ['probe'] },
  congrats: { add: ['bakery', 'trailer'] }, sorry: { remove: ['bakery', 'trailer', 'gacha'] }, getwell: { remove: ['bakery', 'trailer'] },
  remembrance: { remove: ['bakery', 'trailer', 'flight', 'gacha', 'hats', 'tapdance', 'probe', 'chords'] },
};
export function recommendedWorlds(rel, occ) {
  const set = new Set(REC[rel] || REC.partner);
  const o = REC_OCC[occ] || {};
  if (rel !== 'memorial') (o.add || []).forEach(x => set.add(x));
  (o.remove || []).forEach(x => set.delete(x));
  const on = {};
  WORLD_DEFS.forEach(w => { on[w.id] = set.has(w.id); });
  return on;
}
export const allWorldsOn = () => Object.fromEntries(WORLD_DEFS.map(w => [w.id, true]));

export const relById = id => RELATIONSHIPS.find(r => r.id === id) || RELATIONSHIPS[0];
export const occById = id => OCCASIONS.find(o => o.id === id) || OCCASIONS[0];
export const emojiURL = name => `assets/emoji/${name}.webp`;
