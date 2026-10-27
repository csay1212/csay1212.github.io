// Facts about any calendar date: zodiac sign, birthstone, birth flower, season,
// moon phase, meteor showers and the international days that share it.
// Used by the Almanac, the Star Registry and the Lollipop Machine.

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON = MONTH_NAMES.map(m => m.slice(0, 3));
const DAY = 864e5;
export const SYNODIC = 29.530588853;
const NEW_MOON_EPOCH = Date.UTC(2000, 0, 6, 18, 14);

// day of year in a non-leap reference year (Jan 1 = 1)
export const doy = (m, d) => Math.round((Date.UTC(2001, m - 1, d) - Date.UTC(2001, 0, 1)) / DAY) + 1;
export const fmtMD = (m, d) => `${MONTH_NAMES[m - 1]} ${d}`;
export const fmtMDShort = (m, d) => `${MON[m - 1]} ${d}`;
// signed distance in days from a to b around the year (-182..182)
const circ = (a, b) => { let x = b - a; if (x > 182) x -= 365; if (x < -182) x += 365; return x; };

/* ---------------- zodiac ---------------- */
// [name, glyph, from [m,d], to [m,d], symbol, element, a warm, not-too-serious description]
export const ZODIAC = [
  { name: 'Capricorn', g: '♑', from: [12, 22], to: [1, 19], sym: 'the sea-goat', el: 'earth', trait: 'determined, dependable, and secretly the funniest one in the room' },
  { name: 'Aquarius', g: '♒', from: [1, 20], to: [2, 18], sym: 'the water-bearer', el: 'air', trait: 'original, kind, and usually a little ahead of their time' },
  { name: 'Pisces', g: '♓', from: [2, 19], to: [3, 20], sym: 'the fish', el: 'water', trait: 'dreamy, gentle, and an artist even when nobody is watching' },
  { name: 'Aries', g: '♈', from: [3, 21], to: [4, 19], sym: 'the ram', el: 'fire', trait: 'brave, quick, and first through every door' },
  { name: 'Taurus', g: '♉', from: [4, 20], to: [5, 20], sym: 'the bull', el: 'earth', trait: 'steady, loyal, and in possession of excellent taste in snacks' },
  { name: 'Gemini', g: '♊', from: [5, 21], to: [6, 20], sym: 'the twins', el: 'air', trait: 'curious, funny, and capable of two great conversations at once' },
  { name: 'Cancer', g: '♋', from: [6, 21], to: [7, 22], sym: 'the crab', el: 'water', trait: 'tender, protective, and the keeper of every card ever received' },
  { name: 'Leo', g: '♌', from: [7, 23], to: [8, 22], sym: 'the lion', el: 'fire', trait: 'warm, generous, and glowing in a way that makes rooms brighter' },
  { name: 'Virgo', g: '♍', from: [8, 23], to: [9, 22], sym: 'the maiden', el: 'earth', trait: 'thoughtful, helpful, and the first to notice the small things' },
  { name: 'Libra', g: '♎', from: [9, 23], to: [10, 22], sym: 'the scales', el: 'air', trait: 'charming, fair, and willing to spend twenty minutes on the perfect playlist' },
  { name: 'Scorpio', g: '♏', from: [10, 23], to: [11, 21], sym: 'the scorpion', el: 'water', trait: 'deep, loyal, a little mysterious, and fiercely on your side' },
  { name: 'Sagittarius', g: '♐', from: [11, 22], to: [12, 21], sym: 'the archer', el: 'fire', trait: 'adventurous, optimistic, and already planning the next trip' },
];
export function zodiacFor(m, d) {
  const t = doy(m, d);
  const i = ZODIAC.findIndex(z => {
    const a = doy(...z.from), b = doy(...z.to);
    return a <= b ? t >= a && t <= b : t >= a || t <= b;
  });
  const z = ZODIAC[i < 0 ? 0 : i];
  const idx = ZODIAC.indexOf(z);
  const toStart = circ(doy(...z.from), t), toEnd = circ(t, doy(...z.to));
  const cusp = toStart <= 1 ? ZODIAC[(idx + 11) % 12] : toEnd <= 1 ? ZODIAC[(idx + 1) % 12] : null;
  return { ...z, idx, range: `${fmtMDShort(...z.from)} – ${fmtMDShort(...z.to)}`, cusp };
}
// text presentation, so phones draw the glyph instead of an emoji tile
export const glyph = g => g + '︎';

/* ---------------- birthstones and flowers ---------------- */
export const STONES = [
  { name: 'Garnet', c: ['#ff8a8a', '#c0182f', '#5c0715'], note: 'a deep, glowing red, once carried by travelers for a safe journey home' },
  { name: 'Amethyst', c: ['#ecd0ff', '#9b4fd8', '#4b1f7a'], note: 'violet all the way through, and long believed to keep a clear head' },
  { name: 'Aquamarine', c: ['#e6fdff', '#6fd3e8', '#2a8aa6'], note: 'the color of shallow sea water. Sailors carried it for calm seas' },
  { name: 'Diamond', c: ['#ffffff', '#d6ecff', '#8fb4d6'], note: 'the hardest natural thing on Earth: carbon, pressure, and a very long time' },
  { name: 'Emerald', c: ['#c4ffe0', '#1fbf73', '#0b5e38'], note: 'the green of new leaves, and one of the four precious stones' },
  { name: 'Pearl', c: ['#ffffff', '#f2e6f0', '#c9b6c8'], note: 'the only gem made by a living thing. Moonstone and alexandrite share the month' },
  { name: 'Ruby', c: ['#ffb0bb', '#e0115f', '#6d0730'], note: 'red as a cherry, and called the king of gems in old Sanskrit' },
  { name: 'Peridot', c: ['#eeffb0', '#9ccf2b', '#4f7d0e'], note: 'a glowing olive green. Some of it has even been found inside meteorites' },
  { name: 'Sapphire', c: ['#bcd4ff', '#2a5bd7', '#0f2a6b'], note: 'deep blue, and in old stories, the color of the heavens' },
  { name: 'Opal', c: ['#fdf2ff', '#a8e4ff', '#f6a6d8'], opal: true, note: 'it flashes every color at once, depending on how you hold it. Tourmaline shares the month' },
  { name: 'Topaz', c: ['#ffe6b0', '#f2a33a', '#a2560d'], note: 'a warm golden orange, like late afternoon. Citrine is its sunny cousin' },
  { name: 'Turquoise', c: ['#d4fff7', '#3cc6c0', '#167a7b'], note: 'sky-blue-green, and one of the oldest gems people have ever worn' },
];
export const FLOWERS = [
  { name: 'Carnation & snowdrop', emoji: 'white_flower', note: 'The carnation is the classic. The snowdrop is the brave one, blooming through the snow before anything else dares.' },
  { name: 'Violet & primrose', emoji: 'bouquet', note: 'Small, sweet and early. Violets were said to mean faithfulness; primroses, the first days of something new.' },
  { name: 'Daffodil', emoji: 'sunflower', note: 'The trumpet of spring. Daffodils mean new beginnings, and they mean it every single March.' },
  { name: 'Daisy & sweet pea', emoji: 'white_flower', note: 'The daisy opens at sunrise and closes at dusk, which is why it was first called the “day’s eye”.' },
  { name: 'Lily of the valley', emoji: 'tulip', note: 'Tiny white bells that smell like the best part of spring. Said to mean happiness returning.' },
  { name: 'Rose & honeysuckle', emoji: 'rose', note: 'The rose needs no introduction. Honeysuckle is the one that smells like summer evenings.' },
  { name: 'Larkspur & water lily', emoji: 'hibiscus', note: 'Tall spires of blue and violet, and lilies that open on still water every morning.' },
  { name: 'Gladiolus & poppy', emoji: 'bouquet', note: 'The gladiolus stands up straight and is said to mean strength of character. The poppy brings the color.' },
  { name: 'Aster & morning glory', emoji: 'cherry_blossom', note: 'Aster is the Greek word for star. Morning glories open with the sun and close by lunch.' },
  { name: 'Marigold & cosmos', emoji: 'sunflower', note: 'Marigolds glow like autumn itself, and cosmos is named after the order of the universe. On theme.' },
  { name: 'Chrysanthemum', emoji: 'bouquet', note: 'Autumn’s last big bloom, in more colors than seems fair. In many places it means joy and a long life.' },
  { name: 'Narcissus & holly', emoji: 'white_flower', note: 'Paperwhites bloom indoors in the darkest weeks, and holly stays green all winter long.' },
];

/* ---------------- seasons ---------------- */
const MARKERS = [
  { m: 3, d: 20, name: 'March equinox', north: 'spring', south: 'autumn' },
  { m: 6, d: 21, name: 'June solstice', north: 'summer', south: 'winter' },
  { m: 9, d: 22, name: 'September equinox', north: 'autumn', south: 'spring' },
  { m: 12, d: 21, name: 'December solstice', north: 'winter', south: 'summer' },
];
export function seasonFor(m, d) {
  const t = doy(m, d);
  let prev = MARKERS[3], next = MARKERS[0];
  for (let i = 0; i < 4; i++) {
    const a = MARKERS[i], b = MARKERS[(i + 1) % 4];
    const da = circ(doy(a.m, a.d), t), db = circ(t, doy(b.m, b.d));
    if (da >= 0 && db > 0) { prev = a; next = b; break; }
  }
  const since = circ(doy(prev.m, prev.d), t), until = circ(t, doy(next.m, next.d));
  const longer = prev.name === 'December solstice' || prev.name === 'March equinox'; // north gets longer days until June
  let rel;
  if (since === 0) rel = `the day of the ${prev.name}`;
  else if (since <= until) rel = `${since} day${since === 1 ? '' : 's'} after the ${prev.name}`;
  else rel = `${until} day${until === 1 ? '' : 's'} before the ${next.name}`;
  return { north: prev.north, south: prev.south, rel, northLonger: longer, marker: since === 0 ? prev : null };
}
export const SEASON_EMOJI = { spring: '🌷', summer: '☀️', autumn: '🍂', winter: '❄️' };

/* ---------------- the Moon ---------------- */
const PHASES = [
  [1.84566, 'New Moon'], [5.53699, 'Waxing Crescent'], [9.22831, 'First Quarter'], [12.91963, 'Waxing Gibbous'],
  [16.61096, 'Full Moon'], [20.30228, 'Waning Gibbous'], [23.99361, 'Last Quarter'], [27.68493, 'Waning Crescent'], [99, 'New Moon'],
];
const FULL_NAMES = ['Wolf Moon', 'Snow Moon', 'Worm Moon', 'Pink Moon', 'Flower Moon', 'Strawberry Moon', 'Buck Moon', 'Sturgeon Moon', 'Harvest Moon', 'Hunter’s Moon', 'Beaver Moon', 'Cold Moon'];
export function moonPhase(date) {
  const days = (date.getTime() - NEW_MOON_EPOCH) / DAY;
  const age = ((days % SYNODIC) + SYNODIC) % SYNODIC;
  const illum = (1 - Math.cos(2 * Math.PI * age / SYNODIC)) / 2;
  const name = PHASES.find(([lim]) => age < lim)[1];
  const waxing = age < SYNODIC / 2;
  const full = name === 'Full Moon' ? FULL_NAMES[date.getMonth()] : null;
  return { age, illum, name, waxing, full };
}
// An SVG of the Moon at a given phase (northern-hemisphere view: waxing is lit on the right)
export function moonSVG(ph, { size = 120, lit = '#f6eee3', dark = '#2a2440', id = 'mn' } = {}) {
  const r = 50, cx = 60, cy = 60;
  const rx = Math.abs(1 - 2 * ph.illum) * r;
  const first = ph.waxing ? 1 : 0;
  const back = ph.waxing ? (ph.illum < .5 ? 0 : 1) : (ph.illum < .5 ? 1 : 0);
  const path = ph.illum < .01 ? '' : ph.illum > .99 ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}l)"/>` :
    `<path d="M${cx} ${cy - r} A${r} ${r} 0 0 ${first} ${cx} ${cy + r} A${rx.toFixed(2)} ${r} 0 0 ${back} ${cx} ${cy - r}Z" fill="url(#${id}l)"/>`;
  const craters = [[44, 46, 9], [70, 38, 6], [66, 70, 11], [40, 76, 5], [82, 60, 4]].map(([x, y, cr]) => `<circle cx="${x}" cy="${y}" r="${cr}" fill="#000" opacity=".07"/>`).join('');
  return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" aria-hidden="true">
    <defs><radialGradient id="${id}l" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="${lit}"/><stop offset="1" stop-color="${lit}" stop-opacity=".82"/></radialGradient>
    <filter id="${id}g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter></defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${dark}"/>
    ${ph.illum > .02 ? `<g filter="url(#${id}g)" opacity="${(.25 + ph.illum * .45).toFixed(2)}">${path}</g>` : ''}
    ${path}<g>${craters}</g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${lit}" stroke-opacity=".22" stroke-width="1"/></svg>`;
}

/* ---------------- meteor showers ---------------- */
// Active ranges, peaks and rates from the International Meteor Organization's calendar (rounded).
export const SHOWERS = [
  { id: 'qua', name: 'Quadrantids', from: [12, 28], to: [1, 12], peak: [1, 3], zhr: 110, kms: 41, radiant: 'Boötes', parent: 'the asteroid 2003 EH1', note: 'The peak only lasts a few hours, but while it does, this is one of the strongest showers of the year.' },
  { id: 'lyr', name: 'Lyrids', from: [4, 14], to: [4, 30], peak: [4, 22], zhr: 18, kms: 49, radiant: 'Lyra', parent: 'Comet Thatcher', note: 'One of the oldest showers on record: sky-watchers in China wrote it down about 2,700 years ago.' },
  { id: 'eta', name: 'Eta Aquariids', from: [4, 19], to: [5, 28], peak: [5, 6], zhr: 50, kms: 66, radiant: 'Aquarius', parent: 'Halley’s Comet', note: 'Every one of these is a crumb of Halley’s Comet. Best just before dawn.' },
  { id: 'sda', name: 'Delta Aquariids', from: [7, 12], to: [8, 23], peak: [7, 30], zhr: 25, kms: 41, radiant: 'Aquarius', parent: 'Comet 96P/Machholz', note: 'A steady midsummer trickle, best after midnight on a warm night.' },
  { id: 'aug', name: 'Perseids', from: [7, 17], to: [8, 24], peak: [8, 12], zhr: 100, kms: 59, radiant: 'Perseus', parent: 'Comet Swift–Tuttle', note: 'The great summer shower. Long, warm nights and up to a hundred meteors an hour.' },
  { id: 'dra', name: 'Draconids', from: [10, 6], to: [10, 10], peak: [10, 8], zhr: 10, kms: 20, radiant: 'Draco', parent: 'Comet Giacobini–Zinner', note: 'Slow, lazy meteors, and unusually polite: they show up in the evening, not at 3 a.m.' },
  { id: 'ori', name: 'Orionids', from: [10, 2], to: [11, 7], peak: [10, 21], zhr: 20, kms: 66, radiant: 'Orion', parent: 'Halley’s Comet', note: 'Halley’s Comet’s second shower of the year: fast, bright, and known for glowing trails.' },
  { id: 'tau', name: 'Taurids', from: [9, 10], to: [12, 10], peak: [11, 5], zhr: 5, kms: 27, radiant: 'Taurus', parent: 'Comet Encke', note: 'Not many of them, but famous for slow, bright fireballs. Quality over quantity.' },
  { id: 'leo', name: 'Leonids', from: [11, 6], to: [11, 30], peak: [11, 17], zhr: 15, kms: 71, radiant: 'Leo', parent: 'Comet Tempel–Tuttle', note: 'The fastest of them all. Every 33 years or so it turns into a storm of thousands an hour.' },
  { id: 'gem', name: 'Geminids', from: [12, 4], to: [12, 20], peak: [12, 14], zhr: 150, kms: 35, radiant: 'Gemini', parent: 'the asteroid 3200 Phaethon', note: 'The strongest shower of the year, and one of the few that comes from an asteroid instead of a comet.' },
  { id: 'urs', name: 'Ursids', from: [12, 17], to: [12, 26], peak: [12, 22], zhr: 10, kms: 33, radiant: 'Ursa Minor', parent: 'Comet Tuttle', note: 'A quiet little shower around the winter solstice, flying out from near the Little Dipper.' },
];
const inRange = (t, a, b) => (a <= b ? t >= a && t <= b : t >= a || t <= b);
export function showersFor(m, d) {
  const t = doy(m, d);
  const active = SHOWERS.filter(s => inRange(t, doy(...s.from), doy(...s.to)))
    .map(s => ({ ...s, delta: circ(doy(...s.peak), t), peakLong: fmtMD(...s.peak) }))
    .sort((a, b) => Math.abs(a.delta) / (1 + Math.log10(a.zhr)) - Math.abs(b.delta) / (1 + Math.log10(b.zhr)));
  const upcoming = SHOWERS.map(s => ({ ...s, ahead: ((doy(...s.peak) - t) + 365) % 365, peakLong: fmtMD(...s.peak) }))
    .filter(s => s.ahead > 0).sort((a, b) => a.ahead - b.ahead);
  return { main: active[0] || null, others: active.slice(1), next: upcoming[0] };
}

/* ---------------- international days ---------------- */
// Light, well-known observances. [MM-DD]: [emoji, name, note]
const DAYS = {
  '01-01': [['🎆', 'New Year’s Day', 'The whole planet starts over, one time zone at a time. The fireworks follow midnight west.'], ['🏡', 'Global Family Day', 'A day for being together, whatever shape your family comes in.']],
  '01-04': [['📖', 'World Braille Day', 'For Louis Braille, born on this day in 1809, who put reading at people’s fingertips.']],
  '01-24': [['🎓', 'International Day of Education', 'For learning, and for the teachers who make it stick.']],
  '02-02': [['🐸', 'World Wetlands Day', 'For marshes, bogs, and the frogs who love them.']],
  '02-13': [['📻', 'World Radio Day', 'For voices that travel through the air to whoever happens to be listening.']],
  '02-14': [['💌', 'Valentine’s Day', 'Love letters, chocolate, and saying it out loud.']],
  '02-21': [['🗣️', 'International Mother Language Day', 'For every first language, and the lullabies sung in it.']],
  '02-27': [['🐻‍❄️', 'International Polar Bear Day', 'For the biggest bears on Earth, and the ice they live on.']],
  '03-01': [['💐', 'World Compliment Day', 'Say something nice. It’s practically the law today.']],
  '03-03': [['🦒', 'World Wildlife Day', 'For every wild thing, large and small.']],
  '03-14': [['🥧', 'Pi Day', '3.14. Mathematicians celebrate with pie, which is round, which is the point.'], ['📐', 'International Day of Mathematics', 'UNESCO made it official: today belongs to all of mathematics.'], ['🧠', 'Albert Einstein’s birthday', 'Born on this day in 1879. Excellent company to share a date with.']],
  '03-20': [['😊', 'International Day of Happiness', 'The world’s official reminder to be happy. Consider yourself reminded.']],
  '03-21': [['✒️', 'World Poetry Day', 'For poems, and for reading them out loud.'], ['🌳', 'International Day of Forests', 'For trees, which have been quietly holding everything up for ages.']],
  '03-22': [['💧', 'World Water Day', 'For every river, rain cloud and glass of water.']],
  '03-23': [['🌦️', 'World Meteorological Day', 'For weather forecasters, who are right more often than we admit.']],
  '03-27': [['🎭', 'World Theatre Day', 'Curtain up, everywhere at once.']],
  '04-02': [['📚', 'International Children’s Book Day', 'On Hans Christian Andersen’s birthday, a day for stories.']],
  '04-12': [['🚀', 'International Day of Human Space Flight', 'On this day in 1961, Yuri Gagarin became the first person to orbit the Earth.']],
  '04-22': [['🌍', 'Earth Day', 'For the planet. Still the only one with birthday cake, as far as anyone knows.']],
  '04-23': [['📚', 'World Book Day', 'For books, and the people who lend them out.']],
  '04-29': [['💃', 'International Dance Day', 'Dance like nobody’s watching. Or like everybody is.']],
  '04-30': [['🎷', 'International Jazz Day', 'For improvising, on stage and off.']],
  '05-15': [['🏡', 'International Day of Families', 'For every kind of family.']],
  '05-20': [['🐝', 'World Bee Day', 'For the bees, who make flowers and breakfast possible.']],
  '05-22': [['🦋', 'International Day for Biological Diversity', 'For the wonderful, ridiculous variety of life on Earth.']],
  '06-01': [['🧸', 'Global Day of Parents', 'For the people who stay up late worrying and get up early making breakfast.']],
  '06-03': [['🚲', 'World Bicycle Day', 'Two wheels, no engine, maximum joy.']],
  '06-05': [['🌱', 'World Environment Day', 'For the air, the water, and all the green things.']],
  '06-08': [['🌊', 'World Oceans Day', 'For the seven seas and everything in them.']],
  '06-18': [['🧺', 'International Picnic Day', 'A blanket, a basket, and nowhere to be.']],
  '06-21': [['🎶', 'World Music Day', 'Free music in the streets, in cities all over the world.']],
  '06-30': [['☄️', 'Asteroid Day', 'For the space rocks, and the astronomers who keep a friendly eye on them.']],
  '07-07': [['🍫', 'World Chocolate Day', 'No notes. Just chocolate.']],
  '07-17': [['😀', 'World Emoji Day', 'Chosen because it’s the date on the calendar emoji. 📅']],
  '07-20': [['🌕', 'International Moon Day', 'On this day in 1969, people walked on the Moon for the very first time.']],
  '07-29': [['🐯', 'International Tiger Day', 'For the stripes.']],
  '07-30': [['🤝', 'International Day of Friendship', 'A day for the people who make everything lighter.']],
  '08-08': [['🐈', 'International Cat Day', 'The cats were going to celebrate anyway.']],
  '08-13': [['✍️', 'International Left-Handers Day', 'For everyone with ink on the side of their hand.']],
  '08-19': [['📷', 'World Photography Day', 'For every picture worth keeping.']],
  '08-26': [['🐕', 'International Dog Day', 'Every dog is a good dog today. (Every day, really.)']],
  '09-08': [['📖', 'International Literacy Day', 'For reading, and for everyone learning to.']],
  '09-19': [['🦜', 'Talk Like a Pirate Day', 'Arr. That’s the whole day.']],
  '09-21': [['🕊️', 'International Day of Peace', 'A quiet day for kindness and putting things down.']],
  '09-27': [['🧳', 'World Tourism Day', 'For travelers, and for postcards.']],
  '10-01': [['☕', 'International Coffee Day', 'The bean that runs the world gets a day off. (It won’t take it.)']],
  '10-04': [['🐾', 'World Animal Day', 'For every animal, and the people who love them.'], ['🛰️', 'World Space Week begins', 'On this day in 1957, Sputnik 1 became the first satellite to orbit the Earth.']],
  '10-05': [['🍎', 'World Teachers’ Day', 'For the people who believed in us first.']],
  '10-16': [['🍲', 'World Food Day', 'For farmers, cooks, and second helpings.']],
  '10-31': [['🎃', 'Halloween', 'Costumes, candy, and a little bit of spooky.']],
  '11-13': [['💛', 'World Kindness Day', 'Be kind. Extra credit for being kind to strangers.']],
  '11-21': [['👋', 'World Hello Day', 'Say hello to ten people. That’s the whole rule.']],
  '12-05': [['🙌', 'International Volunteer Day', 'For everyone who helps without being asked.']],
  '12-11': [['🏔️', 'International Mountain Day', 'For peaks, valleys, and the view from the top.']],
  '12-18': [['🖋️', 'Arabic Language Day', 'For one of the world’s most spoken languages, and one of its most beautiful scripts.']],
  '12-31': [['🎉', 'New Year’s Eve', 'The last night of the year. Stay up for it.']],
};
export function daysFor(m, d) {
  const k = String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  return (DAYS[k] || []).map(([e, name, note]) => ({ e, name, note }));
}

/* ---------------- little text helpers ---------------- */
// "Mira" -> "Mira’s", "The Bennetts" -> "The Bennetts’"
export const poss = n => /s$/i.test(n || '') ? `${n}’` : `${n}’s`;
// is a display name a plural group ("The Bennetts")?
export const pluralName = n => /^the\s.+s$/i.test((n || '').trim());
