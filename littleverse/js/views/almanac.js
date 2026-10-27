// The Almanac: everything the universe does on the date that matters,
// worked out from that date (any date): the weekday, the Moon, the season,
// meteor showers, the zodiac, birthstone and flower, the days the world
// celebrates, a forecast for the year ahead, how far that day's light has
// traveled, and a countdown.
import { h, icon } from '../core/dom.js';
import { emojiURL } from '../lib/catalog.js';
import {
  zodiacFor, ZODIAC, glyph, STONES, FLOWERS, seasonFor, SEASON_EMOJI, moonPhase, moonSVG,
  showersFor, daysFor, poss, doy,
} from './almanac-data.js';

const DAY = 864e5;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const KM_PER_LY = 9.4607e12, KM_PER_DAY = 86400 * 299792.458, AU = 149597870.7;

// distances in light-years (rounded, from standard catalogs)
const STARS = [
  { n: 'Alpha Centauri', ly: 4.37, note: 'the closest star system to the Sun' },
  { n: 'Barnard’s Star', ly: 5.96, note: 'the fastest-moving star in our sky' },
  { n: 'Sirius', ly: 8.6, note: 'the brightest star in the night sky' },
  { n: 'Epsilon Eridani', ly: 10.5, note: 'a young star wrapped in a ring of dust' },
  { n: 'Procyon', ly: 11.5, note: 'the little dog’s star' },
  { n: 'Altair', ly: 16.7, note: 'one corner of the Summer Triangle' },
  { n: 'Vega', ly: 25, note: 'the brightest corner of the Summer Triangle' },
  { n: 'Pollux', ly: 33.8, note: 'the brighter twin in Gemini' },
  { n: 'Arcturus', ly: 36.7, note: 'the orange giant of spring' },
  { n: 'Capella', ly: 42.9, note: 'the goat star' },
  { n: 'Castor', ly: 51, note: 'the other twin, which is secretly six stars' },
  { n: 'Aldebaran', ly: 65, note: 'the bull’s red eye' },
  { n: 'Algol', ly: 90, note: 'the winking star, which dims every three days' },
  { n: 'Alkaid', ly: 104, note: 'the tip of the Big Dipper’s handle' },
  { n: 'Spica', ly: 250, note: 'the blue-white star of spring' },
  { n: 'Polaris', ly: 433, note: 'the North Star' },
];
// light-travel times for the "days" scale (seconds)
const NEAR = [
  { n: 'the Moon', s: 1.28 }, { n: 'the Sun', s: 499 }, { n: 'Neptune', s: 4.2 * 3600 },
  { n: 'Voyager 1', s: 86400 }, { n: 'Oort Cloud', s: 11.6 * 86400 }, { n: 'Alpha Centauri', s: 4.37 * 365.25 * 86400 },
];

const fmtBig = n => {
  if (n >= 1e12) return (n / 1e12).toFixed(n >= 1e13 ? 0 : 1) + ' trillion';
  if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + ' billion';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' million';
  return Math.round(n).toLocaleString('en-US');
};
const num = n => Math.round(n).toLocaleString('en-US');
const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n, w) => `${num(n)} ${w}${n === 1 ? '' : 's'}`;
// text with emphasized bits: rich('plain ', ['em', 'gold'], ' more')
const rich = (...parts) => parts.map(p => (Array.isArray(p) ? h(p[0], { text: p[1] }) : p));

export default {
  css: 'almanac',
  mount(ctx) {
    const { audio, U } = ctx;
    const D = U.date, them = U.them.name, me = U.me.name;
    const gentle = U.gentle, group = U.group;
    const birthdayish = U.occ === 'birthday' || U.occ === 'belated';
    const personal = birthdayish || U.occ === 'remembrance';
    const yearly = !!(U.occDef && U.occDef.yearly) || !D.yearKnown;
    const you = personal && !gentle && !group; // the reader is the one whose day it is
    const now = new Date();
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const date0 = new Date(D.y, D.m - 1, D.d);
    const nextOcc = () => { const t = new Date(); const t0 = new Date(t.getFullYear(), t.getMonth(), t.getDate()); let n = new Date(t.getFullYear(), D.m - 1, D.d); if (n < t0) n = new Date(t.getFullYear() + 1, D.m - 1, D.d); return n; };
    const isTodayLive = () => { const t = new Date(); return t.getMonth() + 1 === D.m && t.getDate() === D.d; };
    const wd = d => d.toLocaleDateString('en-US', { weekday: 'long' });
    const diff = D.yearKnown ? Math.round((today0 - date0) / DAY) : null; // >0 past, <0 future
    const future = diff != null && diff < 0, past = diff != null && diff > 0;
    const sign = zodiacFor(D.m, D.d);
    const season = seasonFor(D.m, D.d);
    const sh = showersFor(D.m, D.d);
    const moonDate = D.yearKnown ? new Date(D.y, D.m - 1, D.d, 22) : new Date(nextOcc().getTime() + 22 * 36e5);
    const moon = moonPhase(moonDate);
    const stone = STONES[D.m - 1], flower = FLOWERS[D.m - 1];
    const shared = daysFor(D.m, D.d);
    let secN = 0;
    const sec = (title, kicker, ...kids) => h('section', { class: 'al-sec' },
      h('header', {}, h('span', { class: 'al-n', 'aria-hidden': 'true', text: '§ ' + ++secN }), h('p', { class: 'kicker gold', text: kicker }), h('h3', { text: title })), ...kids);

    /* ---------- hero ---------- */
    const pageLine = D.yearKnown ? `${D.weekday} · ${D.y}` : `Next: ${wd(nextOcc())}`;
    const lede = gentle ? `Everything the sky does on ${D.long}, ${poss(them)} day: the stars, the Moon, the season, and a few small wonders. Gathered with love by ${me}.`
      : birthdayish ? `What the universe gets up to on ${poss(them)} birthday: the stars, the Moon, the meteors, and a forecast. Compiled with great seriousness by ${U.studio}.`
        : `Everything the universe gets up to on ${D.long}: the stars, the Moon, the meteors, and a forecast. Compiled with great seriousness by ${U.studio}.`;
    const hero = h('header', { class: 'al-hero' },
      h('div', { class: 'al-page', 'aria-hidden': 'true' }, h('span', { class: 'al-page-m', text: D.month }), h('span', { class: 'al-page-d', text: String(D.d) }), h('span', { class: 'al-page-w', text: pageLine })),
      h('div', { class: 'al-hero-t' },
        h('p', { class: 'kicker', text: 'The Post Office · Almanac' }),
        h('h2', { text: ctx.world.name }),
        h('p', { class: 'lede', text: lede })));

    /* ---------- § the day itself ---------- */
    const yearDays = D.yearKnown ? ((D.y % 4 === 0 && D.y % 100 !== 0) || D.y % 400 === 0 ? 366 : 365) : 365;
    const dayNo = D.yearKnown ? Math.round((date0 - new Date(D.y, 0, 1)) / DAY) + 1 : doy(D.m, D.d);
    const tile = (cls, label, value, note, art) => h('div', { class: 'al-tile ' + cls }, art || null,
      h('div', { class: 'al-tile-t' }, h('span', { class: 'al-tile-k', text: label }), h('b', { text: value }), note ? h('span', { class: 'al-tile-n', text: note }) : null));
    const moonArt = h('div', { class: 'al-moon', html: moonSVG(moon, { size: 88, lit: U.theme.paper, dark: mixHex(U.theme.night2, U.theme.muted, .22), id: 'alMoon' }) });
    const moonNote = `${Math.round(moon.illum * 100)}% lit` + (moon.full ? ` · the ${moon.full}` : moon.name === 'New Moon' ? ' · a dark sky' : '');
    const seasonArt = h('div', { class: 'al-season-ico', 'aria-hidden': 'true', text: SEASON_EMOJI[season.north] });
    const daySec = sec(D.yearKnown ? (future ? 'The day, ahead of time' : 'The day itself') : 'The day itself', 'The calendar',
      h('div', { class: 'al-tiles' },
        tile('wd', D.yearKnown ? 'Weekday' : `Weekday, ${nextOcc().getFullYear()}`, D.yearKnown ? D.weekday : wd(nextOcc()), D.yearKnown ? D.full : `the next ${D.long}`),
        tile('dn', 'Day of the year', ordinal(dayNo), `of ${yearDays} · ${yearDays - dayNo} to go`),
        tile('mn wide', D.yearKnown ? 'The Moon that night' : `The Moon, next ${D.long}`, moon.name, moonNote, moonArt),
        tile('ss wide', 'The season', `${cap(season.north)} in the north`, `${cap(season.south)} in the south · ${season.rel}`, seasonArt)));

    /* ---------- § the sky (meteor shower) ---------- */
    const S = sh.main;
    const cv = h('canvas', { class: 'al-sky-c', 'aria-hidden': 'true' });
    const meteorCount = h('b', { text: '0' });
    const sky = h('div', { class: 'al-sky' + (S ? '' : ' quiet'), role: 'img', 'aria-label': S ? `Meteors streaming out of ${S.radiant}` : 'A calm night sky with the occasional shooting star' }, cv,
      S ? h('div', { class: 'al-radiant' }) : null, S ? h('span', { class: 'al-radiant-l', text: `${S.radiant} · radiant` }) : null,
      h('div', { class: 'al-count' }, S ? 'Meteors so far ' : 'Shooting stars ', meteorCount),
      h('div', { class: 'al-watchers', html: watchersSVG(ctx.cat.PRESETS.them, ctx.cat.PRESETS.me) }));
    let skyText;
    if (S) {
      const d = S.delta, ad = Math.abs(d);
      const when = d === 0 ? `It peaks on ${D.long} itself.`
        : ad <= 3 ? `It peaks ${plural(ad, 'day')} ${d > 0 ? 'before' : 'after'} ${D.long}, which is close enough to count.`
          : d > 0 ? `On ${D.long} it’s still going; the peak comes a little earlier, around ${S.peakLong}.`
            : `On ${D.long} it’s already underway; the peak comes around ${S.peakLong}.`;
      const moonLine = moon.illum < .25 ? `${D.yearKnown ? (future ? 'That night the Moon will be' : 'That night the Moon was') : 'This year the Moon is'} only ${Math.round(moon.illum * 100)}% lit, so the sky ${D.yearKnown && !future ? 'was' : 'will be'} nice and dark. Perfect conditions.`
        : moon.illum > .75 ? `${D.yearKnown ? (future ? 'That night the Moon will be' : 'That night the Moon was') : 'This year the Moon is'} nearly full, so only the brightest ones ${D.yearKnown && !future ? 'got' : 'get'} through. Still worth it.` : '';
      const also = sh.others.length ? `Also active: ${sh.others.map(o => `the ${o.name}`).join(' and ')}.` : '';
      skyText = h('div', { class: 'al-cols' },
        h('p', { class: 'lede' }, ...rich(`Every year around ${S.peakLong}, Earth plows through the trail of dust left by ${S.parent}. The specks hit the atmosphere at about ${S.kms} km per second and burn up as the `, ['em', S.name], `. ${when} Under a dark sky, at its best: about ${S.zhr} an hour.`)),
        h('p', { class: 'lede' }, ...rich(`They all seem to fly out of one spot in ${S.radiant}, which astronomers call the shower’s `, ['em', 'radiant'], `. ${S.note} ${moonLine} ${also}`.replace(/\s+/g, ' ').trimEnd()),
          gentle ? null : h('span', {}, ' The official position of the Almanac: ', h('em', { text: `on ${D.long}, the sky does fireworks${personal ? ` for ${them}` : ''}.` }))));
    } else {
      const n = sh.next;
      skyText = h('div', { class: 'al-cols' },
        h('p', { class: 'lede' }, ...rich(`No major meteor shower is running on ${D.long}. But the sky is never completely still: on any dark night, a handful of `, ['em', 'sporadic meteors'], ' cross it every hour, specks of old comet dust arriving from no direction in particular. Each one counts as a wish.')),
        h('p', { class: 'lede' }, ...rich('The next big show is the ', ['em', n.name], `, peaking around ${n.peakLong}, ${plural(n.ahead, 'day')} later. ${n.note}`)));
    }
    const skySec = sec(S ? (gentle ? `The ${S.name}` : 'The sky throws a party') : 'A quiet sky, and a few wishes', S ? 'Astronomy · meteor shower' : 'Astronomy', sky, skyText);

    /* ---------- § also on this day ---------- */
    const sharedSec = shared.length ? sec(`Also on ${D.long}`, personal && !gentle ? 'Shared birthdays' : 'Shared dates',
      h('div', { class: 'al-also' + (shared.length === 1 ? ' one' : '') }, shared.map(x =>
        h('div', { class: 'card al-day' }, h('span', { class: 'al-emo', 'aria-hidden': 'true', text: x.e }), h('div', {}, h('h4', { text: x.name }), h('p', { text: x.note })))))) : null;

    /* ---------- § the zodiac ---------- */
    const zText = gentle ? `The Sun is in ${sign.name} from ${sign.range}, which made ${them} a ${sign.name}: ${sign.trait}.`
      : you ? `The Sun is in ${sign.name} from ${sign.range}, which makes ${them} a ${sign.name}: ${sign.trait}. The Almanac has no notes.`
        : birthdayish ? `The Sun is in ${sign.name} from ${sign.range}, so this is a ${sign.name} birthday: ${sign.trait}.`
          : `The Sun is in ${sign.name} from ${sign.range}, so anything that begins on ${D.long} is, technically, a ${sign.name}: ${sign.trait}.`;
    const zText2 = `Its symbol is ${sign.sym}, and it’s one of the three ${sign.el} signs.` + (sign.cusp ? ` ${D.long} sits right on the edge of ${sign.cusp.name}, so a little of that sneaks in too.` : '') + (gentle ? '' : ' Accuracy not guaranteed; charm guaranteed.');
    const zodiacSec = sec(`The Sun in ${sign.name}`, 'The zodiac, for fun',
      h('div', { class: 'al-zod' },
        h('div', { class: 'al-wheel', html: wheelSVG(sign, D), role: 'img', 'aria-label': `Zodiac wheel with the Sun in ${sign.name}` }),
        h('div', { class: 'al-zod-t' }, h('p', { class: 'lede', text: zText }), h('p', { class: 'lede muted', text: zText2 }))));

    /* ---------- § birthstone & flower ---------- */
    const gem = h('span', { class: 'al-gem' + (stone.opal ? ' opal' : ''), 'aria-hidden': 'true', style: { '--g1': stone.c[0], '--g2': stone.c[1], '--g3': stone.c[2] } });
    const treasureSec = sec(personal ? 'Birthstone and birth flower' : `${poss(D.month)} stone and flower`, `${poss(D.month)} treasures`,
      h('div', { class: 'al-also two' },
        h('div', { class: 'card al-treasure' }, gem, h('h4', { text: stone.name }), h('p', { text: `${poss(D.month)} birthstone: ${stone.note}.` })),
        h('div', { class: 'card al-treasure' }, h('img', { class: 'al-flower', src: emojiURL(flower.emoji), alt: '', width: 64, height: 64 }), h('h4', { text: flower.name }), h('p', { text: flower.note }))));

    /* ---------- § the year ahead ---------- */
    const fc = h('div', { class: 'al-fc' });
    const lines = (U.copy.forecast || []).slice(0, 12);
    const m0 = now.getMonth(), y0 = now.getFullYear();
    for (let k = 0; k < 12; k++) {
      const mi = (m0 + k) % 12, yr = y0 + Math.floor((m0 + k) / 12);
      const raw = String(U.fill(lines[mi] || '') || '').trim();
      const txt = raw.replace(new RegExp(`^(${MONTHS.join('|')})\\s*[:—–-]\\s*`, 'i'), '') || 'Something good. Details to follow.';
      const card = h('button', { type: 'button', class: 'al-card', 'aria-label': `${MONTHS[mi]} ${yr} forecast`, 'aria-pressed': 'false' },
        h('span', { class: 'al-card-in' },
          h('span', { class: 'al-front' }, h('small', { text: String(k + 1).padStart(2, '0') }), h('b', { text: MONTHS[mi] }), h('i', { text: String(yr) })),
          h('span', { class: 'al-back' + (txt.length > 88 ? ' long' : '') }, h('small', { text: MONTHS[mi] }), h('span', { text: txt }))));
      card.onclick = () => { const on = card.classList.toggle('flip'); card.setAttribute('aria-pressed', String(on)); audio.sfx('paper'); };
      fc.append(card);
    }
    const fcSec = sec(gentle ? 'The year ahead, for all of us' : 'The year ahead, forecast', gentle ? 'A gentle forecast' : `${U.studio} Astrology Dept. (unlicensed)`,
      h('p', { class: 'hint', text: gentle ? 'Tap a month to turn it over. Small, hopeful things, one month at a time.' : 'Tap a month to read its forecast. Accuracy not guaranteed. Optimism guaranteed.' }), fc);

    /* ---------- § how far the light has gone ---------- */
    const lightSec = buildLight();
    function buildLight() {
      const stat = (b, s) => h('div', { class: 'al-stat' }, h('b', { text: b }), h('span', { text: s }));
      const yearsMode = D.yearKnown && diff >= 365;
      if (yearsMode) {
        const days = diff, years = days / 365.25;
        const passed = STARS.filter(s => s.ly <= years), next = STARS.find(s => s.ly > years);
        const stats = you ? [
          [num(days), 'days on Earth so far'], [plural(Math.floor(years), 'trip'), 'all the way around the Sun'],
          [fmtBig(years * 9.4e8) + ' km', 'traveled through space, riding Earth'], [num(days / 29.53), 'full moons you’ve been around for'],
          ['~' + fmtBig(days * 24 * 60 * 80), 'heartbeats, give or take a few'], [years.toFixed(1) + ' ly', 'how far your first day’s light has gone'],
        ] : [
          [num(days), `days since ${D.full}`], [plural(Math.floor(years), 'trip'), 'around the Sun since then'],
          [fmtBig(years * 9.4e8) + ' km', 'traveled through space since, riding Earth'], [num(days / 29.53), 'full moons since then'],
          [num(days * 24), 'hours, give or take'], [years.toFixed(1) + ' ly', 'how far that day’s light has gone'],
        ];
        const max = Math.max(12, (next ? next.ly : years) * 1.1, years * 1.08);
        const show = STARS.filter(s => s.ly <= max);
        const labelled = new Set([...passed.slice(-3), next].filter(Boolean).map(s => s.n));
        const ray = rayEl(show.map(s => ({ n: s.n, at: s.ly / max, lit: s.ly <= years, label: labelled.has(s.n) })), years / max, you ? 'you are here' : 'the light is here');
        const intro = you ? 'Light moves one light-year every year. So the light from the day you were born is still out there, traveling, passing real stars. Here is where it has got to.'
          : gentle ? `Light moves one light-year every year. The light from the day ${them} was born is still out there, still traveling, passing real stars on its way.`
            : `Light moves one light-year every year. So the light from ${D.full} is still out there, traveling, passing real stars. Here is where it has got to.`;
        const when = next ? (you ? `It reaches ${next.n} (${next.note}) when you turn ${Math.ceil(next.ly)}.` : `Next stop: ${next.n} (${next.note}), in about ${plural(Math.ceil(next.ly - years), 'year')}.`) : 'It has outrun every star on this list.';
        return sec('How far the light has gone', you ? 'Personal astronomy' : 'Astronomy, again',
          h('p', { class: 'lede', text: intro }),
          h('div', { class: 'al-stats' }, stats.map(([a, b]) => stat(a, b))),
          ray,
          h('p', { class: 'lede al-light-txt' }, passed.length ? `The light that left Earth on ${D.full} has already swept past ${plural(passed.length, 'star')} on this list, ${passed.slice(-3).map(s => s.n).join(', ')} among them. ` : `The light from ${D.full} is still on its way to the nearest stars. `, h('em', { text: when })));
      }
      // light-days: the date is ahead, recent, or its year is a secret
      const mode = !D.yearKnown ? 'last' : future ? 'until' : 'since';
      const n = mode === 'last' ? D.daysSinceLast : Math.abs(diff);
      if (n === 0) {
        return sec('How far the light has gone', 'Astronomy, again',
          h('p', { class: 'lede', text: 'The light from today is only just leaving. It passes the Moon in about a second and a quarter, the Sun’s orbit in eight minutes, and by this time tomorrow it will be out past Voyager 1, the farthest spacecraft we’ve ever sent. Check back.' }));
      }
      const km = n * KM_PER_DAY, pct = n / (4.37 * 365.25) * 100;
      const pctTxt = pct < 1 ? pct.toFixed(2) : pct < 10 ? pct.toFixed(1) : Math.round(pct);
      const where = n < 1.5 ? 'right about where Voyager 1 is, the farthest spacecraft ever sent' : n < 11.6 ? 'past every planet and past Voyager 1, the farthest spacecraft ever sent' : 'past every planet, past Voyager 1, and out among the icy comets of the Oort Cloud';
      const txt = mode === 'until' ? `Shine a flashlight at the sky today. By ${D.long}, its light will be ${fmtBig(km)} km away: ${where}. That’s ${pctTxt}% of the way to Alpha Centauri, the nearest star.`
        : mode === 'since' ? `The light that left Earth on ${D.full} is ${fmtBig(km)} km away by now: ${where}. That’s ${pctTxt}% of the way to Alpha Centauri, the nearest star.`
          : `The year is a secret, so start from the most recent ${D.long}. The light that left Earth that day is ${fmtBig(km)} km away by now: ${where}. That’s ${pctTxt}% of the way to Alpha Centauri.`;
      const L = s => Math.log10(Math.max(1, s));
      const top = L(NEAR.at(-1).s) * 1.04, at = L(n * 86400) / top;
      const ray = rayEl(NEAR.map(p => ({ n: p.n, at: L(p.s) / top, lit: p.s <= n * 86400, label: true })), at, mode === 'until' ? `by ${D.mon} ${D.d}` : 'the light is here', true);
      return sec(mode === 'until' ? 'How far the light will go' : 'How far the light has gone', 'Astronomy, again',
        h('div', { class: 'al-stats' },
          stat(plural(n, 'day'), mode === 'until' ? `until ${D.long}` : mode === 'since' ? `since ${D.full}` : `since the last ${D.long}`),
          stat(fmtBig(km) + ' km', 'of light, traveling the whole time'),
          stat(num(km / AU) + ' AU', 'Earth–Sun distances, laid end to end'),
          stat(pctTxt + '%', 'of the way to the nearest star')),
        ray,
        h('p', { class: 'lede al-light-txt', text: txt }),
        h('p', { class: 'fine', text: 'The scale stretches as it goes. Space is very large and phones are not.' }));
    }
    function rayEl(points, youAt, youLabel, log) {
      const pct = v => Math.max(0, Math.min(100, v * 100)) + '%';
      const ray = h('div', { class: 'al-ray' + (log ? ' log' : ''), 'aria-hidden': 'true' },
        h('div', { class: 'al-ray-beam', style: { width: pct(youAt) } }),
        h('span', { class: 'al-ray-earth', text: '🌍' }));
      // keep every labelled point; drop unlabelled dots that would sit on top of another one
      const kept = points.filter(p => p.label);
      points.forEach(p => { if (!p.label && !kept.some(k => Math.abs(k.at - p.at) < .055)) kept.push(p); });
      let row = 0;
      points.filter(p => kept.includes(p)).forEach(p => {
        const el = h('span', { class: 'al-ray-star' + (p.lit ? ' lit' : '') + (p.at < .1 ? ' l' : p.at > .86 ? ' r' : ''), style: { left: pct(p.at), '--row': p.label ? row++ % 2 : 0 } }, h('i'));
        if (p.label) el.append(h('small', { text: p.n }));
        ray.append(el);
      });
      const yel = h('span', { class: 'al-ray-you', style: { left: pct(youAt) } }, h('small', { text: youLabel }));
      if (youAt > .78) yel.classList.add('end'); else if (youAt < .2) yel.classList.add('start');
      ray.append(yel);
      return ray;
    }

    /* ---------- § countdown (or count-up) ---------- */
    const cd = h('div', { class: 'al-cd', role: 'timer', 'aria-live': 'off' });
    const cdLede = h('p', { class: 'lede' });
    const countUp = !yearly && past;
    const target = () => (yearly ? nextOcc() : date0);
    function paintCd() {
      if (yearly ? isTodayLive() : diff === 0 && isTodayLive()) {
        const msg = birthdayish ? `It’s today. Happy birthday, ${them}!` : gentle ? `It’s today. Thinking of ${them}.` : `It’s today. ${(U.occDef && U.occDef.title) || 'Happy day'}!`;
        cd.replaceChildren(h('b', { class: 'al-today', text: msg }));
        return;
      }
      const ms = Math.max(0, countUp ? Date.now() - date0 : target() - Date.now());
      const d = Math.floor(ms / DAY), hh = Math.floor(ms / 36e5) % 24, mm = Math.floor(ms / 6e4) % 60, ss = Math.floor(ms / 1e3) % 60;
      cd.replaceChildren(...[[d, d === 1 ? 'day' : 'days'], [hh, 'hours'], [mm, 'minutes'], [ss, 'seconds']].map(([v, l]) =>
        h('div', {}, h('b', { text: v >= 1000 ? num(v) : String(v).padStart(2, '0') }), h('span', { text: l }))));
    }
    const nx = nextOcc();
    cdLede.textContent = yearly
      ? (isTodayLive() ? `${D.long} is today, a ${wd(new Date())}.` : you && birthdayish ? `Your next birthday falls on a ${wd(nx)}. The countdown is running.`
        : gentle ? `The next ${D.long} falls on a ${wd(nx)}. We’ll be looking up.` : `The next ${D.long} falls on a ${wd(nx)}. The clock counts down to its very first minute.`)
      : countUp ? `${D.full} was a ${D.weekday}. Here is exactly how long ago that was, to the second.`
        : `${D.full} falls on a ${D.weekday}. The clock counts down to its very first minute.`;
    paintCd(); ctx.interval(paintCd, 1000);
    const trailer = ctx.WORLDS.find(w => w.id === 'trailer');
    const todayNow = yearly ? isTodayLive() : diff === 0;
    const cdSec = sec(todayNow ? `Today is ${D.long}` : yearly ? `The next ${D.long}` : countUp ? 'Since then' : `Until ${D.long}`, todayNow ? 'Right now' : countUp ? 'The clock' : 'Countdown',
      cdLede, cd,
      trailer ? h('div', { class: 'row' }, h('a', { class: 'btn rose', href: '#/w/trailer' }, icon('film'), yearly && !gentle ? 'Watch next year’s trailer' : 'Watch the trailer')) : null);

    const end = h('p', { class: 'al-end', text: yearly ? '— End of almanac. Same time next year. —' : '— End of almanac. —' });
    const wrap = h('div', { class: 'al' }, hero, daySec, skySec, sharedSec, zodiacSec, treasureSec, fcSec, lightSec, cdSec, end);
    ctx.root.append(wrap);

    /* ---------- meteors ---------- */
    const T = U.theme;
    const paperRGB = hexRGB(T.paper || '#f6eee3');
    const c2 = cv.getContext('2d');
    const rate = S ? Math.max(.5, Math.min(1.3, Math.log10(S.zhr) / 1.6)) : .32;
    const speed = S ? S.kms / 59 : .8;
    let W = 0, H = 0, dpr = 1, meteors = [], count = 0, bg = [], acc = 0, visible = true, gap = 900;
    function size() {
      const r = cv.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height;
      cv.width = W * dpr; cv.height = H * dpr; c2.setTransform(dpr, 0, 0, dpr, 0, 0);
      bg = Array.from({ length: Math.round(W * H / 1400) }, () => ({ x: Math.random() * W, y: Math.random() * H * .85, r: Math.random() * 1.1 + .2, p: Math.random() * 6 }));
    }
    size(); ctx.on(window, 'resize', size);
    const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; }); io.observe(cv); ctx.cleanup(() => io.disconnect());
    const radiant = () => ({ x: W * .2, y: H * .16 });
    function spawn() {
      let x, y, a;
      if (S) { const R = radiant(), d0 = 30 + Math.random() * Math.min(W, H) * .5; a = .15 + Math.random() * 1.25; x = R.x + Math.cos(a) * d0; y = R.y + Math.sin(a) * d0; }
      else { a = (Math.random() < .5 ? .35 : Math.PI - .35) + (Math.random() - .5) * .5; x = Math.random() * W; y = Math.random() * H * .45; }
      meteors.push({ x, y, vx: Math.cos(a), vy: Math.sin(a), sp: (5 + Math.random() * 6) * speed, len: (40 + Math.random() * 90) * Math.min(1.2, .6 + speed * .5), life: 1, w: .8 + Math.random() * 1.4 });
      count++; meteorCount.textContent = count;
    }
    ctx.raf((t, dt) => {
      if (!visible) return;
      c2.clearRect(0, 0, W, H);
      for (const s of bg) { c2.fillStyle = `rgba(${paperRGB},${.3 + .5 * Math.abs(Math.sin(s.p + t * .0012))})`; c2.beginPath(); c2.arc(s.x, s.y, s.r, 0, 6.283); c2.fill(); }
      acc += dt;
      if (!ctx.reduce && acc > gap) { acc = 0; gap = (380 + Math.random() * 900) / rate; spawn(); if (S && Math.random() < .25 * rate) spawn(); }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx * m.sp * dt / 16; m.y += m.vy * m.sp * dt / 16; m.life -= .012 * dt / 16;
        if (m.life <= 0) { meteors.splice(i, 1); continue; }
        const g = c2.createLinearGradient(m.x, m.y, m.x - m.vx * m.len, m.y - m.vy * m.len);
        g.addColorStop(0, `rgba(255,248,220,${m.life})`); g.addColorStop(1, 'rgba(255,248,220,0)');
        c2.strokeStyle = g; c2.lineWidth = m.w; c2.lineCap = 'round';
        c2.beginPath(); c2.moveTo(m.x, m.y); c2.lineTo(m.x - m.vx * m.len, m.y - m.vy * m.len); c2.stroke();
      }
    });
    if (ctx.reduce) for (let i = 0; i < (S ? 6 : 2); i++) spawn();
    else ctx.timeout(spawn, 500);

    /* ---------- reaching the end earns the stamp ---------- */
    const endIO = new IntersectionObserver(es => {
      if (es[0].isIntersecting) { endIO.disconnect(); if (ctx.stamp()) ctx.award(10, end); }
    }, { threshold: 1 });
    endIO.observe(end); ctx.cleanup(() => endIO.disconnect());
  },
};

function mixHex(a, b, t) {
  const p = x => { const m = /^#?([0-9a-f]{6})$/i.exec(x || ''); const n = m ? parseInt(m[1], 16) : 0x222233; return [n >> 16, (n >> 8) & 255, n & 255]; };
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function hexRGB(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '246,238,227';
  const n = parseInt(m[1], 16); return `${n >> 16},${(n >> 8) & 255},${n & 255}`;
}

// A zodiac wheel: twelve signs, the active one lit, and the Sun where the date falls in it.
function wheelSVG(sign, D) {
  const C = 150, R1 = 142, R0 = 98, RG = 120;
  const pol = (r, deg) => { const a = deg * Math.PI / 180; return [(C + Math.cos(a) * r).toFixed(1), (C + Math.sin(a) * r).toFixed(1)]; };
  const ARIES = ZODIAC.findIndex(z => z.name === 'Aries');
  const wi = (sign.idx - ARIES + 12) % 12;
  let segs = '', glyphs = '', ticks = '';
  for (let k = 0; k < 12; k++) {
    const z = ZODIAC[(ARIES + k) % 12];
    const a0 = -90 + k * 30, a1 = a0 + 30, on = k === wi;
    const [x0, y0] = pol(R1, a0), [x1, y1] = pol(R1, a1), [x2, y2] = pol(R0, a1), [x3, y3] = pol(R0, a0);
    segs += `<path class="seg${on ? ' on' : ''}" d="M${x0} ${y0} A${R1} ${R1} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${R0} ${R0} 0 0 0 ${x3} ${y3}Z"/>`;
    const [gx, gy] = pol(RG, a0 + 15);
    glyphs += `<text class="gl${on ? ' on' : ''}" x="${gx}" y="${gy}" text-anchor="middle" dominant-baseline="central">${glyph(z.g)}</text>`;
    const [t0x, t0y] = pol(R0, a0), [t1x, t1y] = pol(R1, a0);
    ticks += `<line x1="${t0x}" y1="${t0y}" x2="${t1x}" y2="${t1y}"/>`;
  }
  // where the Sun sits inside its sign
  const len = ((doy(...sign.to) - doy(...sign.from) + 365) % 365) + 1;
  const into = ((doy(D.m, D.d) - doy(...sign.from) + 365) % 365) + .5;
  const sa = -90 + (wi + into / len) * 30;
  const [sx, sy] = pol(R1 + 1, sa), [lx, ly] = pol(R0 - 10, sa);
  const rays = Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<line x1="${(Math.cos(a) * 9).toFixed(1)}" y1="${(Math.sin(a) * 9).toFixed(1)}" x2="${(Math.cos(a) * 13).toFixed(1)}" y2="${(Math.sin(a) * 13).toFixed(1)}"/>`; }).join('');
  return `<svg viewBox="0 0 300 300" aria-hidden="true">
    <circle class="rim" cx="${C}" cy="${C}" r="${R1}"/><circle class="rim" cx="${C}" cy="${C}" r="${R0}"/>
    <g class="segs">${segs}</g><g class="ticks">${ticks}</g><g>${glyphs}</g>
    <line class="sunl" x1="${lx}" y1="${ly}" x2="${sx}" y2="${sy}"/>
    <g class="sun" transform="translate(${sx} ${sy})"><g class="sunr">${rays}</g><circle r="7"/></g>
    <text class="big" x="${C}" y="${C - 6}" text-anchor="middle" dominant-baseline="central">${glyph(sign.g)}</text>
    <text class="nm" x="${C}" y="${C + 34}" text-anchor="middle">${sign.name.toUpperCase()}</text>
  </svg>`;
}

// A hill and the two characters, seen from behind in their propeller hats, watching the sky.
function watchersSVG(a, b) {
  const esc = c => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '#888');
  const ears = sp => {
    if (sp === 'bunny') return '<ellipse cx="-10" cy="-38" rx="3.6" ry="11" transform="rotate(-22 -10 -38)"/><ellipse cx="10" cy="-38" rx="3.6" ry="11" transform="rotate(22 10 -38)"/>';
    if (sp === 'bear') return '<circle cx="-12" cy="-27" r="5"/><circle cx="12" cy="-27" r="5"/>';
    if (sp === 'mouse') return '<circle cx="-13" cy="-28" r="7.5"/><circle cx="13" cy="-28" r="7.5"/>';
    if (sp === 'dog') return '<ellipse cx="-14" cy="-19" rx="4" ry="8" transform="rotate(14 -14 -19)"/><ellipse cx="14" cy="-19" rx="4" ry="8" transform="rotate(-14 14 -19)"/>';
    return '<path d="M-12 -24 L-15 -36 L-5 -29Z M12 -24 L15 -36 L5 -29Z"/>';
  };
  const pal = (x, d) => `<g transform="translate(${x} 0)">
    <g class="hl"><path d="M-14 0 C-16 -18 -10 -30 0 -30 C10 -30 16 -18 14 0Z"/>${ears(d.species)}</g>
    <path d="M-11 -27 C-11 -38 -6 -42 0 -42 C6 -42 11 -38 11 -27Z" fill="${esc(d.side)}"/><path d="M-4 -27 C-4 -36 -2 -41 0 -42 C2 -41 4 -36 4 -27Z" fill="${esc(d.fr)}"/>
    <path d="M-13 -27 Q0 -30 13 -27" stroke="${esc(d.brim)}" stroke-width="2.5" fill="none"/>
    <rect x="-.8" y="-47" width="1.6" height="5" fill="${esc(d.hub)}"/><ellipse cx="0" cy="-47" rx="9" ry="1.6" fill="${esc(d.prop)}"/></g>`;
  return `<svg class="al-hill" viewBox="0 0 400 80" preserveAspectRatio="none"><path class="hl" d="M0 80 L0 50 C80 36 160 30 230 38 C300 46 350 34 400 40 L400 80Z"/><path class="ridge" d="M0 50 C80 36 160 30 230 38 C300 46 350 34 400 40" vector-effect="non-scaling-stroke"/></svg>
    <svg class="al-cats" viewBox="-20 -56 74 58"><g>${pal(0, a || {})}${pal(34, b || {})}</g></svg>`;
}
