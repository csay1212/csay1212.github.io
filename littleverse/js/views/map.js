// The universe map: a vertical voyage past every enabled world. The
// recipient's pilot flies along the route as you scroll; stamps, stardust and
// hidden friends are tallied at the top.
//
// Layout: every stop is a row of [planet lane | card] (or mirrored), and the
// rows alternate sides. The route runs down the planet lanes and only crosses
// over in the open gaps between rows, so the pilot never flies across text.
// Sector headings sit in the card column of the stop below them, which keeps
// the lane beside them clear for the route too.
import { h, icon } from '../core/dom.js';
import { WORLDS, SECTORS, ALL_STAMPS, FINALE_NEEDS, HIDDEN_TOTAL, HIDDEN_ON } from '../worlds.js';
import { planetSVG } from './planets.js';
import { titleFont } from '../active.js';

const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
// how many hidden friends have been found (prefers a store.hiddenCount() alias when the store has one)
const foundCount = store => store.hiddenCount();
const pad2 = n => String(n).padStart(2, '0');

// Tighter goal lines for the map cards, so each fits on one line at phone width.
// (The passport keeps the full wording.)
const MAP_GOAL = {
  tapdance: 'Dance to a B or better',
  memories: 'Walk the whole lane',
  chords: 'Echo an 8-chord message',
  mixtape: 'Play a song on the tape',
};

function statusFor(w, store, U) {
  const best = store.getBest(w.id);
  switch (w.id) {
    case 'flight': return best > 0 ? `Best: ${plural(best, 'gate')}` : '';
    case 'bakery': return best > 0 ? `Tallest: ${plural(best, 'layer')}` : '';
    case 'probe': { const n = Object.keys(store.get('game.probe.stars', {}) || {}).length; return n ? `${n} deliver${n === 1 ? 'y' : 'ies'}` : ''; }
    case 'tapdance': return best > 0 ? `Best: ${best.toLocaleString('en-US')} pts` : '';
    case 'chords': return best > 0 ? `Longest: ${plural(best, 'chord')}` : '';
    case 'puzzle': { const n = store.stats().puzzles; return n ? `${n} solved` : ''; }
    case 'wordle': { const n = (store.get('game.wordle.solved', []) || []).length; return n ? `${n} / ${(U.copy.words || []).length || 12} words` : ''; }
    case 'gacha': { const n = Object.keys(store.get('stickers', {}) || {}).length; return n ? `${n} / 24 stickers` : ''; }
    case 'mail': { const n = Object.keys(store.get('letters', {}) || {}).length; return n ? `${n} opened` : ''; }
    case 'coupons': { const n = Object.keys(store.get('coupons', {}) || {}).length; return n ? `${n} scratched` : ''; }
    case 'stars': { const n = (store.get('stars.list', []) || []).length; return n ? `${n} registered` : ''; }
    default: return '';
  }
}

// Size the big title so its longest word fits the column.
let mctx = null;
function fitTitle(el, box, max) {
  mctx = mctx || document.createElement('canvas').getContext('2d');
  mctx.font = `100px ${getComputedStyle(el).fontFamily || 'Italiana, serif'}`;
  const words = (el.textContent || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return;
  const widest = Math.max(...words.map(w => mctx.measureText(w).width + 2 * w.length));
  el.style.fontSize = Math.max(40, Math.min(max, box.clientWidth * .9 / widest * 100)).toFixed(1) + 'px';
}

// a short word made from the recipient's name for the word-game planet tiles
function tileWord(name) {
  const w = String(name || '').split(/\s+/).map(x => x.replace(/[^A-Za-z]/g, '')).filter(x => !/^(the|a|an|my|our)$/i.test(x));
  return w.find(x => x.length >= 3 && x.length <= 5) || 'WORD';
}

export default {
  css: 'map',
  mount(ctx) {
    const { store, cat, sky, audio, U } = ctx;
    const firstVisit = !store.seen('map');
    const stamps = store.stampCount();
    const finale = WORLDS.find(w => w.id === 'finale');
    const finaleOpen = stamps >= FINALE_NEEDS;
    const nextUp = WORLDS.find(w => w.id !== 'finale' && !store.hasStamp(w.id));
    const hatsOn = WORLDS.some(w => w.id === 'hats');
    const gachaOn = WORLDS.some(w => w.id === 'gacha');
    const starsOn = WORLDS.some(w => w.id === 'stars');
    const me = U.me.name, gentle = U.gentle;
    const haptic = k => { try { ctx.haptic(k); } catch {} };
    const design = cat.getDesign();
    const pilotName = design.name || U.them.name;

    /* ---------- title card ---------- */
    const verse = String(U.verse || 'Littleverse').trim();
    const m = /^the\s+(.+)$/i.exec(verse);
    const small = m ? 'The' : /\s/.test(verse) ? null : 'The';
    const big = m ? m[1] : verse;
    const bigEl = h('span', { class: 'mv-big', text: big });
    const titleEl = h('h1', { class: 'mv-title' }, small ? h('span', { class: 'mv-the', text: small }) : null, bigEl);

    const pilot = h('button', { class: 'pilot spin-hover', type: 'button', 'aria-label': hatsOn ? `${pilotName}, your pilot. Open the Hat Workshop to change the hat` : `${pilotName}, your pilot`, html: cat.catSVG(design, { spin: true }) });
    pilot.onclick = () => {
      haptic('light');
      if (hatsOn) { ctx.go('#/w/hats'); return; }
      pilot.classList.remove('loop'); void pilot.offsetWidth; pilot.classList.add('loop'); audio.sfx('whoosh');
    };
    const stat = (cls, val, label) => h('button', { class: 'mh ' + cls, type: 'button', onclick: () => { haptic('select'); ctx.openPassport(); } },
      h('b', {}, val), h('span', { text: label }));
    const hiddenWho = me.replace(/^the\s+/i, '');
    const need = Math.max(0, FINALE_NEEDS - stamps);
    // one card: the pilot, the tallies, the way to the finale, and the passport
    const hud = h('div', { class: 'map-hud' + (HIDDEN_ON ? '' : ' two') },
      h('div', { class: 'mh-pilot' }, pilot,
        h('div', { class: 'mh-who' }, h('b', { text: pilotName }), h('small', { text: 'your pilot' })),
        hatsOn ? h('a', { class: 'mh-hat', href: '#/w/hats' }, 'Change hat') : null),
      h('div', { class: 'mh-row' },
        stat('dust-big', [h('span', { class: 'n', text: store.stardust().toLocaleString('en-US') })], 'stardust'),
        stat('', [h('span', { text: String(stamps) }), h('span', { class: 'of', text: ` of ${ALL_STAMPS.length}` })], 'stamps'),
        HIDDEN_ON ? stat('', [h('span', { text: String(foundCount(store)) }), h('span', { class: 'of', text: ` of ${HIDDEN_TOTAL}` })], 'hide and seek') : null),
      finale ? h('div', { class: 'mh-finale' + (finaleOpen ? ' open' : '') },
        h('div', { class: 'mf-row' },
          h('span', { text: finaleOpen ? 'The finale is open' : `${plural(need, 'more stamp')} to open the finale` }),
          h('b', { text: finaleOpen ? '' : `${stamps}/${FINALE_NEEDS}` })),
        h('i', {}, h('em', { style: { transform: `scaleX(${Math.min(1, stamps / FINALE_NEEDS)})` } }))) : null,
      h('button', { class: 'btn passport-btn', type: 'button', onclick: () => { haptic('medium'); ctx.openPassport(); } }, icon('passport'), 'Open your passport'));
    // the stardust counter is found by [data-dust] for the flying "+n" animation
    hud.querySelector('.dust-big').setAttribute('data-dust', '');

    let intro = null;
    if (firstVisit) {
      const bits = [gentle ? 'Welcome. Every world here holds something worth remembering. Wander anywhere, in any order, and take your time.' : 'Welcome aboard. Every world here was made for you. Play anything, in any order.'];
      bits.push(gachaOn ? 'Stardust comes from games and secrets; spend it at the Lollipop Machine.' : 'Stardust gathers as you go, from games and secrets.');
      if (HIDDEN_ON) bits.push(gentle ? `${HIDDEN_TOTAL} tiny ${hiddenWho}${/s$/i.test(hiddenWho) ? '' : 's'} are tucked away around the universe, too.` : `There are also ${HIDDEN_TOTAL} tiny ${hiddenWho}${/s$/i.test(hiddenWho) ? '' : 's'} hiding around the universe. You’ll know one when you see one.`);
      intro = h('p', { class: 'mv-note', text: bits.join(' ') });
    }

    const hero = h('header', { class: 'map-hero' },
      h('p', { class: 'mv-pres', text: `${U.studio} ${U.fill(String(U.copy.gate?.presents || '').trim() || 'presents')}` }),
      titleEl,
      U.copy.map && U.copy.map.lede ? h('p', { class: 'lede', text: U.fill(U.copy.map.lede) }) : null,
      intro, hud);
    intro = null;

    /* ---------- the voyage ---------- */
    const voyage = h('div', { class: 'voyage' });
    const route = h('div', { class: 'route', 'aria-hidden': 'true' });
    const ship = h('div', { class: 'ship', 'aria-hidden': 'true', html: cat.catSVG(design, { spin: true }) });
    voyage.append(route, ship);

    let side = 0;
    const stops = [];
    const letters = tileWord(U.them.name);
        const sideCls = () => side % 2 ? 'r' : 'l';
    // a sector heading, placed in the card column of the stop below it
    const sector = (k, name, sub) => h('div', { class: 'sector ' + sideCls() },
      h('div', { class: 'sec-txt' },
        h('h2', { text: name }),
        sub ? h('p', { text: sub }) : null));
    for (const sec of SECTORS) {
      const list = WORLDS.filter(x => x.sector === sec.id);
      if (!list.length) continue;
      voyage.append(sector('', sec.name, sec.sub));
      for (const w of list) {
        const locked = !!(w.needs && stamps < w.needs);
        const got = store.hasStamp(w.id);
        const isNext = nextUp === w && !locked;
        const status = statusFor(w, store, U);
        const planet = h('div', { class: 'planet' + (locked ? ' locked' : ''), html: planetSVG(w.id, { letters }) });
        if (locked) planet.append(h('span', { class: 'lockbadge' }, icon('lock')));
        const label = got ? 'Stamped' : locked ? `Opens after ${plural(w.needs - stamps, 'more stamp')}` : w.needs ? 'Open now' : (MAP_GOAL[w.id] || w.goal);
        const stop = h('a', {
          class: `stop ${sideCls()}${got ? ' got' : ''}${locked ? ' is-locked' : ''}${isNext ? ' next' : ''}`,
          href: locked ? null : '#/w/' + w.id, 'aria-disabled': locked ? 'true' : null, tabindex: locked ? '0' : null, role: locked ? 'button' : null,
          style: { '--pc': w.color },
          onclick: locked ? (() => { audio.sfx('error'); haptic('light'); ctx.toast(`Locked. ${plural(w.needs - stamps, 'more stamp')} to open the finale.`); }) : () => haptic('light'),
        },
          planet,
          h('div', { class: 'stop-info' },
            isNext ? h('span', { class: 'next-tag', text: 'Next stop' }) : null,
            h('h3', { text: w.name }),
            w.blurb ? h('p', { text: w.blurb }) : null,
            h('span', { class: 'stop-k' }, h('span', { text: label }), status ? h('span', { class: 'stop-s', text: status }) : null),
            got ? h('span', { class: 'mini-stamp', 'aria-label': 'Stamped' }, icon('check')) : null));
        if (locked) stop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stop.click(); } });
        voyage.append(stop); stops.push(stop); side++;
      }
    }

    // the observatory, at the edge of the map: look up and the sky answers
    voyage.append(sector('', 'Beyond the map', 'Where the route runs out of planets'));
    const obsSide = sideCls();
    const obs = h('div', { class: `stop ${obsSide} obs`, role: 'button', tabindex: '0', 'aria-label': 'The Observatory. Tap to look up.', style: { '--pc': 'var(--gold)' } },
      h('div', { class: 'planet', html: planetSVG('observatory') }),
      h('div', { class: 'stop-info' },
        h('h3', { text: 'The Observatory' }),
        h('p', { text: gentle ? 'A quiet place to look at the sky for a while.' + (starsOn ? ' Constellations from the Star Registry shine here.' : '') : 'Point the telescope and hold on to your hat.' + (starsOn ? ' Constellations from the Star Registry shine here.' : '') }),
        h('span', { class: 'stop-k' }, h('span', { text: 'Tap to look up' }))));
    obs.onclick = e => {
      if (e && e.target.closest && e.target.closest('.peek')) return;
      haptic('medium');
      if (gentle) {
        [0, 900, 1900].forEach(t => ctx.timeout(() => sky.shootingStar(), t));
        audio.chime(); ctx.toast('A shooting star. Make a wish.');
      } else {
        sky.hyperspace(); audio.sfx('whoosh'); ctx.toast('Telescope engaged. Hold on to your hat.');
      }
      if (!store.seen('map-obs-look')) ctx.timeout(() => ctx.award(5, obs.querySelector('.planet')), 700);
    };
    obs.addEventListener('keydown', e => { if (e.target === obs && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); obs.onclick(); } });
    voyage.append(obs);
    stops.push(obs);

    const foot = h('footer', { class: 'map-foot' },
      h('p', { class: 'mf-end', text: 'That’s the whole map. For now.' }),
      h('p', { class: 'fine', text: 'Progress is saved on this device.' }));

    const wrap = h('div', { class: 'map' + (gentle ? ' gentle' : '') }, hero, intro, voyage, foot);
    ctx.root.append(wrap);
    // planets out of view stop spinning, so a long map stays light on the battery
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('idle', !e.isIntersecting)), { rootMargin: '160px 0px' });
      stops.forEach(s => io.observe(s));
      ctx.cleanup(() => io.disconnect());
    }

    const fit = () => fitTitle(bigEl, hero, Math.min(128, innerWidth * .25));
    fit();
    if (document.fonts && document.fonts.load) document.fonts.load(titleFont()).then(() => { if (ctx.alive()) { fit(); buildPath(); } }).catch(() => {});
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (ctx.alive()) buildPath(); }).catch(() => {});

    if (finale && finaleOpen && !store.seen('finale-open-toast')) ctx.timeout(() => ctx.toast(`${FINALE_NEEDS} stamps. The grand finale is open, at the bottom of the map.`, 5000), 900);

    /* ---------- the route: down the planet lanes, across in the gaps ---------- */
    // samples[i] = [x, y] every STEP px of path length; keys map the scroll line to path length
    const STEP = 3;
    let samples = [], keys = [], vTop = 0, lastS = 0, L = 0;
    function buildPath() {
      if (!ctx.alive()) return;
      const vr = voyage.getBoundingClientRect();
      if (!vr.width) return;
      vTop = vr.top + scrollY;
      const box = el => { const r = el.getBoundingClientRect(); return { top: r.top - vr.top, bottom: r.bottom - vr.top, left: r.left - vr.left, right: r.right - vr.left }; };
      const centre = s => { const p = s.querySelector('.planet').getBoundingClientRect(); return [p.left + p.width / 2 - vr.left, p.top + p.height / 2 - vr.top, p.width]; };
      if (stops.length < 1) return;
      const sw = ship.offsetWidth || 44;
      // The route is plain geometry (lines, and curves for the turns), measured here in
      // one pass: asking the browser for points along a long SVG path every few pixels
      // froze the map for seconds on a phone.
      const r1 = v => Math.round(v * 10) / 10;
      const segs = [];               // from the previous end: lines { x, y }, curves { c: [x1, y1, x2, y2], x, y }
      const at = [];                 // segs.length when planet k is reached
      const line = (x, y) => segs.push({ x: r1(x), y: r1(y) });
      const curve = (x1, y1, x2, y2, x, y) => segs.push({ c: [x1, y1, x2, y2].map(r1), x: r1(x), y: r1(y) });
      const [x0, y0] = centre(stops[0]);
      const start = [r1(x0), 0];
      line(x0, y0);
      at.push(segs.length);
      for (let k = 0; k < stops.length - 1; k++) {
        const a = stops[k], b = stops[k + 1];
        const [xa, ya, pw] = centre(a), [xb, yb] = centre(b);
        // the gap right below row k (whatever comes next: a heading or the next row)
        const below = box(a).bottom, next = box(a.nextElementSibling || b).top;
        const yc = (below + next) / 2;
        const dir = xb > xa ? 1 : -1;
        const dx = Math.abs(xb - xa);
        // corners: as wide as the lane allows (clear of the card beside it), and
        // taller than wide so the turn reads as a swoop rather than a pipe bend
        const colGap = parseFloat(getComputedStyle(a).columnGap) || 14;
        const rx = Math.max(8, Math.min(44, pw / 2 + colGap - sw / 2 - 3, dx / 2));
        const ry = Math.max(rx, Math.min(rx * 1.9, yc - ya - pw * .3, yb - yc - pw * .3));
        if (dx < 2) { line(xb, yb); at.push(segs.length); continue; }
        const K = .5523;
        line(xa, yc - ry);
        curve(xa, yc - ry + K * ry, xa + dir * rx * (1 - K), yc, xa + dir * rx, yc);
        line(xb - dir * rx, yc);
        curve(xb - dir * rx * (1 - K), yc, xb, yc + ry - K * ry, xb, yc + ry);
        line(xb, yb);
        at.push(segs.length);
      }
      // the whole route as a polyline (each curve in 24 steps) with its running length
      const pts = [start], len = [0], ends = [];
      let [px, py] = start;
      const step = (x, y) => { const [lx, ly] = pts[pts.length - 1]; pts.push([x, y]); len.push(len[len.length - 1] + Math.hypot(x - lx, y - ly)); };
      for (const s of segs) {
        if (s.c) {
          const [ax, ay, bx, by] = s.c;
          for (let i = 1; i <= 24; i++) {
            const t = i / 24, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, e = t * t * t;
            step(a * px + b * ax + c * bx + e * s.x, a * py + b * ay + c * by + e * s.y);
          }
        } else step(s.x, s.y);
        px = s.x; py = s.y;
        ends.push(len.length - 1);
      }
      const d = `M${start[0]} ${start[1]} ` + segs.map(s => s.c ? `C${s.c.join(' ')} ${s.x} ${s.y}` : `L${s.x} ${s.y}`).join(' ');
      const W = vr.width, H = vr.height;
      route.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="mapFade" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="90"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient><mask id="mapMask" maskUnits="userSpaceOnUse" x="-40" y="-40" width="${W + 80}" height="${H + 80}"><rect x="-40" y="90" width="${W + 80}" height="${H}" fill="#fff"/><rect x="-40" y="-40" width="${W + 80}" height="130" fill="url(#mapFade)"/></mask></defs><g mask="url(#mapMask)"><path class="r-glow" d="${d}"/><path class="r-dash" d="${d}"/><path class="r-done" d="${d}"/></g></svg>`;
      L = len[len.length - 1];
      // path length at each planet
      const sAt = at.map(n => len[ends[n - 1]]);
      samples = [];
      for (let s = 0, j = 1; s <= L; s += STEP) {
        while (j < len.length - 1 && len[j] < s) j++;
        const a = pts[j - 1], b = pts[j], span = len[j] - len[j - 1], t = span > 0 ? (s - len[j - 1]) / span : 0;
        samples.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
      // keys: when the scroll line is level with planet k, the pilot is at planet k.
      // Near the bottom the line cannot reach the last planets, so squeeze those keys up.
      const maxRef = document.documentElement.scrollHeight - innerHeight * .5 - vTop - 6;
      // the pilot comes to rest on the top rim of each planet, not over its art
      keys = [[0, 0], ...stops.map((s, k) => { const [, cy, w] = centre(s); return [cy, Math.max(0, sAt[k] - w * .44)]; })];
      for (let i = keys.length - 1, cap = maxRef; i > 0; i--, cap -= 60) if (keys[i][0] > cap) keys[i][0] = Math.max(keys[i - 1][0] + 1, cap);
      const done = route.querySelector('.r-done');
      done.style.strokeDasharray = `${L} ${L}`;
      route._done = done;
      onScroll();
    }
    function onScroll() {
      if (!samples.length) return;
      const y = scrollY + innerHeight * .5 - vTop;
      let s = 0;
      if (y >= keys[keys.length - 1][0]) s = keys[keys.length - 1][1];
      else if (y > 0) {
        let i = 1; while (i < keys.length && keys[i][0] < y) i++;
        const [y0, s0] = keys[i - 1], [y1, s1] = keys[i];
        s = s0 + (s1 - s0) * ((y - y0) / Math.max(1, y1 - y0));
      }
      const i = Math.max(0, Math.min(samples.length - 1, Math.round(s / STEP)));
      const p = samples[i], q = samples[Math.min(samples.length - 1, i + 3)], o = samples[Math.max(0, i - 3)];
      const ang = Math.atan2(q[1] - o[1], q[0] - o[0]) * 180 / Math.PI;
      const tilt = Math.max(-22, Math.min(22, (ang - 90) * -.3));
      ship.style.transform = `translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px) translate(-50%,-50%) rotate(${tilt.toFixed(1)}deg)`;
      if (Math.abs(s - lastS) > .5) ship.classList.toggle('flip', s < lastS);
      lastS = s;
      if (route._done) route._done.style.strokeDashoffset = String(L - s);
    }
    ctx.on(window, 'scroll', onScroll, { passive: true });
    let rt; const rebuild = () => { clearTimeout(rt); rt = setTimeout(() => { if (ctx.alive()) { fit(); buildPath(); } }, 120); };
    ctx.on(window, 'resize', rebuild);
    // card heights settle as fonts and emoji arrive: rebuild the route when the voyage changes size
    if (typeof ResizeObserver === 'function') {
      let lastH = 0;
      const ro = new ResizeObserver(() => { const hh = voyage.offsetHeight; if (Math.abs(hh - lastH) > 1) { lastH = hh; rebuild(); } });
      ro.observe(voyage);
      ctx.cleanup(() => ro.disconnect());
    }
    ctx.cleanup(() => clearTimeout(rt));
    ctx.timeout(buildPath, 30);
    ctx.timeout(buildPath, 600);

    /* ---------- registered constellations glow in the sky here ---------- */
    sky.setConstellations(store.get('stars.list', []) || []);
    ctx.cleanup(() => sky.setConstellations([]));

    /* ---------- daily stardust delivery ---------- */
    const tk = todayKey();
    if (store.get('daily') !== tk) {
      store.set('daily', tk);
      const dust = hud.querySelector('.dust-big');
      if (!firstVisit) ctx.timeout(() => { ctx.toast('Your daily stardust arrived: 10 more'); ctx.award(10, dust); }, 700);
      else ctx.timeout(() => ctx.award(10, dust), 900);
    }

    /* ---------- a hidden friend at the observatory ---------- */
    // tucked beside the dome on the card side, out of the pilot's lane
    ctx.peek(obs.querySelector('.planet'), 'map-obs', obsSide === 'l' ? { left: '74%', top: '58%', rotate: 16, size: 26 } : { left: '-2%', top: '58%', rotate: -16, size: 26 });
  },
};
