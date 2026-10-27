// Streetlamp Swing: a two-lane tap-dance rhythm game on the twilight hill.
// The song, the band and the step charts live in tapdance-song.js. Timing is
// all done on the audio clock: notes are placed by "heard" time, inputs are
// converted from event timestamps to that same clock before judging.
import { h, icon, clamp, fmt } from '../core/dom.js';
import { SPB, buildSong, buildChart, createBand, beatTime, FINAL_BEAT, END_BEAT } from './tapdance-song.js';

const PERFECT = .045, GOOD = .1, MISS_GRACE = .03;
const LOOKAHEAD = .3;
// theme helpers: the universe's palette, mixed for the stage
const hexRgb = hex => { const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim()); if (!m) return [128, 128, 128]; const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const mix = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const TWILIGHT = { night: '#0c0b24', night2: '#120f33', dusk: '#2a1d55', horizon: '#4a2c6e', rose: '#ef7fb0', gold: '#f5cc4a', hud: '#86e6d8', lilac: '#b59cff', peach: '#ff9a7a', sky: '#9fd3ff', paper: '#f6eee3', muted: '#b8b0d6' };
const DIFFS = {
  stroll: { name: 'Stroll', desc: 'About one step a beat. One foot at a time.', speed: 270 },
  show: { name: 'Showstopper', desc: 'Every note of the tune, swung eighths, a few two-foot stomps.', speed: 360 },
};
const RANKS = [
  { r: 'S', min: 95, n: 5, line: 'Standing ovation. The streetlamp is crying.' },
  { r: 'A', min: 88, n: 4, line: 'Bravo! Somebody call {studio}.' },
  { r: 'B', min: 75, n: 3, line: 'A lovely night, honestly.' },
  { r: 'C', min: 60, n: 2, line: 'A few stepped toes. Still {sweet}.' },
  { r: 'D', min: 0, n: 1, line: 'The dancers tripped. Charmingly.' },
];
const rankFor = acc => RANKS.find(x => acc >= x.min);
const RANK_BY_N = n => RANKS.find(x => x.n === n);
const LEFT_KEYS = new Set(['f', 'd', 'arrowleft', 's', 'a']);
const RIGHT_KEYS = new Set(['j', 'k', 'arrowright', 'l', ';']);
const COUNT_CUES = [[0, 'tap'], [2, 'tap'], [4, '5'], [5, '6'], [6, '7'], [7, '8']].map(([b, text]) => ({ t: beatTime(b), text }));
const END_T = beatTime(END_BEAT) + 1.0;

const SONG = buildSong();
const CHARTS = { stroll: buildChart('stroll'), show: buildChart('show') };

const LAMP_SVG = iron => `<svg viewBox="0 0 40 200" preserveAspectRatio="none" aria-hidden="true">
  <g fill="${iron}"><rect x="18" y="48" width="4" height="148"/><rect x="12" y="190" width="16" height="10" rx="2"/>
  <rect x="9" y="46" width="22" height="3" rx="1"/><path d="M8 46 L32 46 L28 22 L12 22Z"/><path d="M12 22 L28 22 L20 12Z"/><circle cx="20" cy="10" r="2.4"/></g>
  <rect x="13" y="25" width="14" height="18" fill="#ffe7a0" opacity=".95"/><rect x="19.4" y="25" width="1.2" height="18" fill="${iron}" opacity=".6"/>
  <rect x="21.4" y="52" width=".9" height="138" fill="#ffcf80" opacity=".35"/></svg>`;
const BENCH_SVG = iron => `<svg viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true"><g fill="${iron}">
  <rect x="4" y="3" width="92" height="6" rx="2"/><rect x="4" y="13" width="92" height="5" rx="2"/>
  <rect x="11" y="3" width="4" height="25"/><rect x="85" y="3" width="4" height="25"/>
  <rect x="0" y="25" width="100" height="7" rx="2"/><rect x="8" y="31" width="4" height="19"/><rect x="88" y="31" width="4" height="19"/></g>
  <path d="M6 3.6 H94 M2 25.6 H98" stroke="#ffcf80" stroke-width=".8" opacity=".4"/></svg>`;

// the device's safe-area insets (home indicator, landscape notch), in px
function insets() {
  const p = document.createElement('div');
  p.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:0 var(--safe-r) var(--safe-b) var(--safe-l)';
  document.body.append(p);
  const cs = getComputedStyle(p), v = { l: parseFloat(cs.paddingLeft) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0 };
  p.remove();
  return v;
}
export default {
  css: 'tapdance',
  mount(ctx) {
    const { audio, store, cat, U } = ctx;
    const reduce = ctx.reduce;
    const T = { ...TWILIGHT, ...(U.theme || {}) };
    const LANE_COL = [T.rose, T.gold];
    const LANE_DARK = [mix(T.rose, T.night, .4), mix(T.gold, T.night, .4)];
    const IRON = mix(T.night, '#000000', .1);
    const CREAM = mix(T.gold, '#ffffff', .75);
    const PAPER = hexRgb(T.paper).join(','), NIGHT = hexRgb(mix(T.night, T.night2, .5)).join(',');
    const rankLine = rk => rk.line.replace('{studio}', U.studio || 'a film studio').replace('{sweet}', U.rel === 'partner' ? 'romantic' : 'charming');
    ctx.root.classList.add('full');
    ctx.pauseSky();   // the stage has its own sky; the site's star canvas can rest
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* ================= DOM ================= */
    const bg = h('canvas', { class: 'td-bg', 'aria-hidden': 'true' });
    const fg = h('canvas', { class: 'td-fg', 'aria-hidden': 'true' });
    const fgc = fg.getContext('2d');
    const them = U.them.name, me = U.me.name;
    // Each dancer is a rasterized image plus a separate propeller layer, so dancing
    // and the spinning propeller are pure compositor work (no SVG repaints).
    const mkCat = (design, side, name) => {
      const d = { ...cat.PRESETS.them, ...design };
      const aspect = cat.catAspect(d), vbh = aspect > 1.05 ? 230 : 200;
      const img = h('img', { class: 'td-body', alt: '', draggable: 'false', src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(cat.catSVG(d, { prop: false })) });
      const ink = '#16121f';
      const blades = h('div', { class: 'td-blades', html: `<svg viewBox="38 8 124 20" aria-hidden="true"><ellipse cx="71" cy="18" rx="31" ry="7.5" fill="${d.prop}" stroke="${ink}" stroke-width="4"/><ellipse cx="129" cy="18" rx="31" ry="7.5" fill="${d.prop}" stroke="${ink}" stroke-width="4"/><ellipse cx="62" cy="15.5" rx="12" ry="2.4" fill="#fff" opacity=".55"/><ellipse cx="120" cy="15.5" rx="12" ry="2.4" fill="#fff" opacity=".55"/></svg>` });
      const hub = h('div', { class: 'td-hub', html: `<svg viewBox="38 8 124 20" aria-hidden="true"><circle cx="100" cy="18" r="6.5" fill="${d.hub}" stroke="${ink}" stroke-width="3.5"/></svg>` });
      const prop = h('div', { class: 'td-prop', style: { top: (8 / vbh * 100) + '%', height: (20 / vbh * 100) + '%' } }, blades, hub);
      const move = h('div', { class: 'td-move' }, img, prop);
      const bob = h('div', { class: 'td-bob' }, move);
      const el = h('div', { class: 'td-cat ' + side, role: 'img', 'aria-label': `${name}, dancing in a propeller hat` }, h('div', { class: 'td-shadow' }), bob, h('span', { class: 'td-name', text: name }));
      return { el, bob, move, anim: null, aspect, busy: '' };
    };
    const cats = [mkCat(cat.getDesign(), 'l', them), mkCat(cat.PRESETS.me, 'r', me)];
    const glow = h('div', { class: 'td-glow' });
    const pool = h('div', { class: 'td-pool' });
    const lamp = h('div', { class: 'td-lamp', html: LAMP_SVG(IRON) });
    const bench = h('div', { class: 'td-bench', html: BENCH_SVG(IRON) });
    const twinkles = h('div', { class: 'td-twinkles' });
    const scene = h('div', { class: 'td-scene' }, twinkles, pool, glow, lamp, bench, cats[0].el, cats[1].el);
    const feet = [0, 1].map(i => h('div', { class: 'td-foot ' + (i ? 'r' : 'l') },
      h('b', { text: i ? 'Right foot' : 'Left foot' }),
      finePointer ? h('span', { class: 'keys' }, h('kbd', { text: i ? 'J' : 'F' })) : null));
    const judgeEl = h('div', { class: 'td-judge', 'aria-hidden': 'true' }, h('b'), h('small'));
    const comboEl = h('div', { class: 'td-combo', 'aria-hidden': 'true' }, h('b'), h('span'));
    const countEl = h('div', { class: 'td-count', 'aria-hidden': 'true' });
    const scoreB = h('b', { text: '0' }), accEl = h('span', { class: 'td-acc' });
    const pauseBtn = h('button', { class: 'icon-btn td-pausebtn', type: 'button', 'aria-label': 'Pause the dance', onclick: () => pause('button') }, icon('pause'));
    const hud = h('div', { class: 'ghud td-hud' }, h('div', { class: 'td-score' }, h('span', { text: 'Score' }), scoreB, accEl), pauseBtn);
    const progI = h('i');
    const prog = h('div', { class: 'td-prog', 'aria-hidden': 'true' }, progI);
    const sr = h('div', { class: 'sr', 'aria-live': 'polite' });
    const stage = h('div', { class: 'stage-wrap td-stage', role: 'application', 'aria-label': 'Tap-dance stage. The left half is the left foot, the right half is the right foot.' },
      bg, scene, comboEl, judgeEl, countEl, fg, ...feet, hud, prog, sr);
    const wrap = h('div', { class: 'td' }, stage);
    ctx.root.append(wrap);

    // twinkling stars (a handful of DOM stars on top of the painted ones)
    for (let i = 0; i < 9; i++) {
      twinkles.append(h('i', { style: { left: (5 + Math.random() * 90) + '%', top: (4 + Math.random() * 40) + '%', animationDelay: (-Math.random() * 4).toFixed(2) + 's', animationDuration: (2.6 + Math.random() * 2.4).toFixed(2) + 's' } }));
    }
    // a tiny sender, sitting on the bench nobody sits on
    ctx.peek(bench, 'tapdance-hide', { left: '56%', top: 'calc(52% - 25px)', size: 25, rotate: -4 });

    /* ================= state ================= */
    let phase = 'idle';        // idle | play | paused | results
    let diff = DIFFS[store.get('game.tapdance.diff', 'stroll')] ? store.get('game.tapdance.diff', 'stroll') : 'stroll';
    let offset = clamp(Math.round(+store.get('game.tapdance.offset', 0) || 0), -150, 150);
    let A = null, band = null, startAt = 0, evIdx = 0;
    let chart = [], firstIdx = 0, cues = COUNT_CUES, cueIdx = 0;
    let score = 0, combo = 0, maxCombo = 0, P = 0, G = 0, M = 0, devSum = 0, devN = 0;
    let lead = 1.5, pausedAt = 0, autoplay = false, autoDev = 0, bowed = false, musicBack = false, hudDirty = true, lastDev = null;
    const flash = [0, 0];
    const parts = [], rings = [];
    let L = null, dpr = 1, sprites = null;

    /* ================= clock ================= */
    // The song clock runs on performance.now() (smooth, never steps backwards)
    // and is gently pulled toward the audio clock as it reaches the player's ears, so it
    // can't drift away from the music either.
    const latency = () => clamp((A.baseLatency || 0) + (A.outputLatency || 0), 0, .3);
    function rawHeard() {
      if (A.getOutputTimestamp) {
        try {
          const ts = A.getOutputTimestamp();
          if (ts && ts.performanceTime > 0 && ts.contextTime > 0) {
            const est = ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
            if (est <= A.currentTime + .02 && est >= A.currentTime - .4) return est;
          }
        } catch {}
      }
      return A.currentTime - latency();
    }
    let clkBase = 0, clkPerf = 0;
    function syncClock(hard) {
      if (!A) return;
      const p = performance.now(), raw = rawHeard(), pred = clkBase + (p - clkPerf) / 1000;
      if (hard || Math.abs(raw - pred) > .08) { clkBase = raw; clkPerf = p; return; }
      clkBase = pred + (raw - pred) * .04; clkPerf = p;
    }
    const heardNow = () => (A ? clkBase + (performance.now() - clkPerf) / 1000 : 0);
    const songTime = () => heardNow() - startAt - offset / 1000;
    // when an input event actually happened, on the same clock
    function eventHeard(e) {
      let lag = (performance.now() - (e.timeStamp || 0)) / 1000;
      if (!(lag >= 0 && lag < .25)) lag = 0;
      return heardNow() - lag;
    }

    /* ================= layout ================= */
    function layout() {
      const barEl = ctx.frame && ctx.frame.el.querySelector('.wbar');
      const barH = barEl ? barEl.getBoundingClientRect().height : 58;
      const vh = window.visualViewport ? window.visualViewport.height : innerHeight;
      const pad = innerWidth < 600 ? 8 : 16;
      const sa = insets();
      wrap.style.padding = `${pad}px ${pad + sa.r}px ${pad + sa.b}px ${pad + sa.l}px`;
      stage.style.height = Math.max(240, Math.floor(vh - barH - pad * 2 - sa.b)) + 'px';
      const W = stage.clientWidth, H = stage.clientHeight;
      const tall = H / W >= .95;
      stage.classList.toggle('tall', tall); stage.classList.toggle('wide', !tall);
      stage.classList.toggle('compact', H < 620);
      let sceneH, groundY, drop, laneTop, hitY, laneW, lx, rx, catW;
      if (tall) {
        sceneH = Math.round(H * (H / W > 1.6 ? .40 : .44));
        groundY = sceneH * .80; drop = sceneH * .08;
        catW = Math.min(sceneH * .36, W * .24, 170);
        laneTop = groundY + drop * .5 + 16;
        hitY = H - clamp(H * .12, 72, 120);
        laneW = Math.min(W * .4, 210); lx = W * .25; rx = W * .75;
      } else {
        sceneH = H; groundY = H * .70; drop = H * .07;
        catW = Math.min(H * .28, W * .15, 180);
        laneTop = 46;
        hitY = H - clamp(H * .16, 62, 130);
        laneW = Math.min(W * .17, 170);
        const m = Math.max(laneW / 2 + 12, W * .12);
        lx = m; rx = W - m;
      }
      const hill = x => groundY + drop * Math.pow((x - W / 2) / (W / 2), 2);
      const R = clamp(laneW * .2, 15, 27);
      L = { W, H, tall, sceneH, groundY, drop, hill, laneTop, hitY, travel: hitY - laneTop, R, catW,
        lanes: [{ x: lx, w: laneW }, { x: rx, w: laneW }] };
      dpr = Math.min(devicePixelRatio || 1, 2);
      for (const c of [bg, fg]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
      fgc.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawBackground();
      placeScene();
      sprites = makeSprites();
      stage.style.setProperty('--ovTop', Math.round(sceneH * .52) + 'px');
      render(phase === 'play' ? songTime() : -9, 0);
    }

    function placeScene() {
      const { W, tall, sceneH, groundY, hill, catW } = L;
      // cats
      const gap = catW * .62;
      cats.forEach((c, i) => {
        const cx = W / 2 + (i ? gap : -gap), feetY = hill(cx) + catW * .03;
        const hgt = catW * c.aspect, body = 196 / (c.aspect > 1.05 ? 230 : 200);
        Object.assign(c.el.style, { width: catW + 'px', height: hgt + 'px', left: (cx - catW / 2) + 'px', top: (feetY - hgt * body) + 'px' });
        c.el.style.setProperty('--feet', (hgt * (1 - body)) + 'px');
      });
      // lamp
      const lampX = tall ? W * .88 : W * .74;
      const lampH = tall ? sceneH * .6 : Math.min(catW * 1.9, groundY - 30), lampW = lampH * .2;
      const lampBase = hill(lampX) + 4;
      Object.assign(lamp.style, { left: (lampX - lampW / 2) + 'px', top: (lampBase - lampH) + 'px', width: lampW + 'px', height: lampH + 'px' });
      const headY = lampBase - lampH + lampH * .17, gs = lampH * 1.05;
      Object.assign(glow.style, { left: lampX + 'px', top: headY + 'px', width: gs + 'px', height: gs + 'px' });
      Object.assign(pool.style, { left: lampX + 'px', top: lampBase + 'px', width: lampH * 1.1 + 'px', height: lampH * .22 + 'px' });
      // bench
      const benchX = tall ? W * .12 : W * .28, bw = catW * (tall ? .8 : .85), bh = bw * .5;
      Object.assign(bench.style, { left: (benchX - bw / 2) + 'px', top: (hill(benchX) + 3 - bh) + 'px', width: bw + 'px', height: bh + 'px' });
      // labels and texts
      L.lanes.forEach((ln, i) => Object.assign(feet[i].style, { left: ln.x + 'px', top: (L.hitY + L.R + 10) + 'px' }));
      const catTop = groundY - catW * 1.02;
      if (tall) {
        const comboY = L.laneTop + L.travel * .3;
        comboEl.style.top = comboY + 'px';
        judgeEl.style.top = (comboY + 64) + 'px';
        countEl.style.top = (L.laneTop + L.travel * .45) + 'px';
      } else {
        comboEl.style.top = '40px';
        const jy = Math.max(92, catTop - 34);
        judgeEl.style.top = jy + 'px';
        countEl.style.top = Math.max(92, catTop - 56) + 'px';
      }
      stage.style.setProperty('--catw', catW + 'px');
    }

    // the painted sky, hills and ground (redrawn only on resize)
    function drawBackground() {
      const { W, H, sceneH, groundY, hill } = L;
      const c = bg.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sky = c.createLinearGradient(0, 0, 0, groundY);
      [[0, mix(T.night2, T.dusk, .2)], [.42, mix(T.dusk, T.horizon, .55)], [.7, mix(T.horizon, T.rose, .6)], [.87, mix(T.rose, T.peach, .6)], [1, mix(T.peach, T.gold, .6)]].forEach(([o, col]) => sky.addColorStop(o, col));
      c.fillStyle = sky; c.fillRect(0, 0, W, groundY + 2);
      // stars (seeded so they don't jump around on resize)
      let s = 42;
      const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      const n = Math.min(170, Math.round(W * groundY / 2600));
      for (let i = 0; i < n; i++) {
        const x = rnd() * W, y = Math.pow(rnd(), 1.4) * groundY * .62, r = rnd() * 1.2 + .3;
        c.globalAlpha = (.35 + rnd() * .65) * (1 - y / (groundY * .7));
        c.fillStyle = rnd() < .15 ? mix(T.gold, T.paper, .6) : '#ffffff';
        c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill();
      }
      c.globalAlpha = 1;
      // far hills
      const wave = (base, amp, f1, f2, ph) => x => base - amp * (.55 * Math.sin(x / W * f1 + ph) + .45 * Math.sin(x / W * f2 + ph * 2.3));
      const far = wave(groundY - sceneH * .05, sceneH * .05, 5.5, 13, .7), mid = wave(groundY - sceneH * .005, sceneH * .035, 7, 17, 2.1);
      const fillCurve = (fn, col) => { c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W + 8; x += 8) c.lineTo(x, fn(x)); c.lineTo(W, H); c.closePath(); c.fillStyle = col; c.fill(); };
      fillCurve(far, mix(T.dusk, T.night2, .1));
      fillCurve(mid, mix(T.night2, T.dusk, .12));
      // city lights on the middle hills
      const lights = Math.min(150, Math.round(W / 6));
      for (let i = 0; i < lights; i++) {
        const x = rnd() * W, y = mid(x) + 2 + rnd() * sceneH * .05;
        c.globalAlpha = .45 + rnd() * .55; c.fillStyle = rnd() < .2 ? '#ffb7a0' : '#ffd98a';
        c.beginPath(); c.arc(x, y, rnd() * .9 + .45, 0, 6.283); c.fill();
      }
      c.globalAlpha = 1;
      // the near hill, where the two of them dance, and the ground below it
      const g = c.createLinearGradient(0, groundY, 0, H);
      g.addColorStop(0, mix(T.night, T.night2, .6)); g.addColorStop(Math.min(1, sceneH * .3 / (H - groundY + 1)), mix(T.night, '#000000', .08)); g.addColorStop(1, mix(T.night, '#000000', .3));
      c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W + 8; x += 8) c.lineTo(x, hill(x)); c.lineTo(W, H); c.closePath(); c.fillStyle = g; c.fill();
      // a soft rim of lamp light along the crest
      c.strokeStyle = 'rgba(255,207,128,.16)'; c.lineWidth = 1.2;
      c.beginPath(); for (let x = 0; x <= W + 8; x += 8) x ? c.lineTo(x, hill(x) + .6) : c.moveTo(x, hill(x) + .6); c.stroke();
    }

    function makeSprites() {
      const { R } = L;
      const mk = (col, dark, ring, gray) => {
        const m = R + 12, s = Math.ceil(m * 2 * dpr);
        const cv = document.createElement('canvas'); cv.width = cv.height = s;
        const c = cv.getContext('2d'); c.scale(dpr, dpr);
        if (!gray) {
          const g = c.createRadialGradient(m, m, R * .5, m, m, m);
          g.addColorStop(0, col + '99'); g.addColorStop(1, col + '00');
          c.fillStyle = g; c.fillRect(0, 0, m * 2, m * 2);
        }
        const b = c.createRadialGradient(m - R * .32, m - R * .38, R * .08, m, m, R);
        b.addColorStop(0, gray ? '#9b95b5' : '#fffaf0'); b.addColorStop(.38, gray ? '#6d6787' : col); b.addColorStop(1, gray ? '#3d3856' : dark);
        c.beginPath(); c.arc(m, m, R, 0, 6.283); c.fillStyle = b; c.fill();
        c.lineWidth = 2; c.strokeStyle = gray ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.9)'; c.stroke();
        // a little four-point sparkle
        c.fillStyle = gray ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.95)';
        const k = R * .46; c.beginPath();
        c.moveTo(m, m - k); c.quadraticCurveTo(m, m, m + k, m); c.quadraticCurveTo(m, m, m, m + k); c.quadraticCurveTo(m, m, m - k, m); c.quadraticCurveTo(m, m, m, m - k); c.fill();
        if (ring) { c.beginPath(); c.arc(m, m, R + 5, 0, 6.283); c.lineWidth = 2.5; c.strokeStyle = '#fff'; c.stroke(); }
        return { cv, m };
      };
      return {
        n: [mk(LANE_COL[0], LANE_DARK[0]), mk(LANE_COL[1], LANE_DARK[1])],
        d: [mk(LANE_COL[0], LANE_DARK[0], true), mk(LANE_COL[1], LANE_DARK[1], true)],
        g: mk('#6d6787', '#3d3856', false, true),
      };
    }

    /* ================= drawing ================= */
    const yAt = dt => L.hitY - dt / lead * L.travel;
    function render(t, dt) {
      const c = fgc, { W, H, lanes, laneTop, hitY, R, tall } = L;
      c.clearRect(0, 0, W, H);
      // lanes
      for (let i = 0; i < 2; i++) {
        const ln = lanes[i], x0 = ln.x - ln.w / 2;
        const g = c.createLinearGradient(0, laneTop, 0, hitY + R + 30);
        g.addColorStop(0, `rgba(${PAPER},0)`); g.addColorStop(.55, `rgba(${PAPER},.045)`); g.addColorStop(1, LANE_COL[i] + '24');
        c.fillStyle = g; roundRect(c, x0, laneTop, ln.w, hitY + R + 30 - laneTop, 14); c.fill();
        if (flash[i] > 0) {
          const f = c.createLinearGradient(0, hitY - L.travel * .45, 0, hitY + R);
          f.addColorStop(0, LANE_COL[i] + '00'); f.addColorStop(1, LANE_COL[i] + Math.round(flash[i] * 70).toString(16).padStart(2, '0'));
          c.fillStyle = f; c.fillRect(x0, hitY - L.travel * .45, ln.w, L.travel * .45 + R);
        }
      }
      if (tall) { // a soft seam between the two feet
        c.fillStyle = `rgba(${PAPER},.06)`; c.fillRect(W / 2 - .5, laneTop + 20, 1, H - laneTop - 30);
      }
      // beat lines
      if (t > -8) {
        const b0 = Math.max(8, Math.ceil((t - .2) / SPB)), b1 = Math.min(FINAL_BEAT, Math.floor((t + lead) / SPB));
        for (let b = b0; b <= b1; b++) {
          const y = yAt(b * SPB - t);
          if (y < laneTop + 4 || y > hitY + R) continue;
          c.fillStyle = b % 4 === 0 ? `rgba(${PAPER},.14)` : `rgba(${PAPER},.06)`;
          for (const ln of lanes) c.fillRect(ln.x - ln.w / 2 + 10, y, ln.w - 20, 1);
        }
      }
      // receptors
      for (let i = 0; i < 2; i++) {
        const x = lanes[i].x;
        c.beginPath(); c.arc(x, hitY, R + 4, 0, 6.283);
        c.fillStyle = flash[i] > 0 ? LANE_COL[i] + Math.round(30 + flash[i] * 90).toString(16).padStart(2, '0') : `rgba(${NIGHT},.55)`; c.fill();
        c.lineWidth = 2.5; c.strokeStyle = LANE_COL[i] + 'b0'; c.stroke();
        c.beginPath(); c.arc(x, hitY, R * .45, 0, 6.283); c.lineWidth = 1.5; c.strokeStyle = LANE_COL[i] + '55'; c.stroke();
      }
      // notes
      if (phase === 'play' || phase === 'paused') {
        for (let i = firstIdx; i < chart.length; i++) {
          const n = chart[i], d = n.t - t;
          if (d > lead + .05) break;
          if (n.hit) continue;
          const y = yAt(d);
          if (y > H + R * 2) continue;
          const fade = clamp((y - laneTop) / 40, 0, 1) * (n.missed ? clamp(1 - (hitY - y) / -90, 0, .8) : 1);
          if (fade <= 0) continue;
          c.globalAlpha = fade;
          if (tall && n.dbl && n.lane === 0 && !n.missed) {
            c.fillStyle = `rgba(${PAPER},.45)`;
            c.fillRect(lanes[0].x + R, y - 1.5, lanes[1].x - lanes[0].x - R * 2, 3);
          }
          const sp = n.missed ? sprites.g : (n.dbl ? sprites.d : sprites.n)[n.lane];
          c.drawImage(sp.cv, lanes[n.lane].x - sp.m, y - sp.m, sp.m * 2, sp.m * 2);
        }
        c.globalAlpha = 1;
      }
      // hit rings and sparks
      const s = dt / 1000;
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i]; r.life -= s * 2.6;
        if (r.life <= 0) { rings.splice(i, 1); continue; }
        c.globalAlpha = r.life; c.lineWidth = 3; c.strokeStyle = r.col;
        c.beginPath(); c.arc(r.x, r.y, R + 4 + (1 - r.life) * 26, 0, 6.283); c.stroke();
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.life -= s * 1.8;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        p.vy += 520 * s; p.x += p.vx * s; p.y += p.vy * s;
        c.globalAlpha = p.life; c.fillStyle = p.col;
        c.fillRect(p.x - 2, p.y - 2, 4, 4);
      }
      c.globalAlpha = 1;
      for (let i = 0; i < 2; i++) flash[i] = Math.max(0, flash[i] - s * 5);
    }
    function roundRect(c, x, y, w, hh, r) {
      c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
      c.lineTo(x + w, y + hh - r); c.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh); c.lineTo(x + r, y + hh);
      c.quadraticCurveTo(x, y + hh, x, y + hh - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
    }
    function sparks(lane, perfect) {
      rings.push({ x: L.lanes[lane].x, y: L.hitY, life: 1, col: perfect ? CREAM : LANE_COL[lane] });
      if (reduce) return;
      const n = perfect ? 12 : 7;
      for (let k = 0; k < n; k++) parts.push({ x: L.lanes[lane].x, y: L.hitY, vx: (Math.random() - .5) * 340, vy: -80 - Math.random() * 260, life: 1, col: k % 3 ? LANE_COL[lane] : CREAM });
      if (parts.length > 90) parts.splice(0, parts.length - 90);
    }

    /* ================= the cats ================= */
    const stepDir = [1, -1];
    function animCat(c, frames, opts, busy) {
      if (c.anim) c.anim.cancel();
      c.busy = busy || '';
      c.anim = c.move.animate(frames, opts);
      c.anim.onfinish = () => { if (!opts.fill) c.busy = ''; };
    }
    function step(lane) {
      const c = cats[lane];
      if (c.busy) return;
      stepDir[lane] *= -1;
      const r = stepDir[lane] * (reduce ? 2 : 8), up = reduce ? 3 : 11;
      animCat(c, [{ transform: 'translateY(0) rotate(0deg)' }, { transform: `translateY(-${up}%) rotate(${r}deg)`, offset: .35 }, { transform: 'translateY(0) rotate(0deg)' }],
        { duration: 250, easing: 'cubic-bezier(.3,.7,.4,1)' });
    }
    function spin() {
      cats.forEach((c, i) => {
        if (c.busy === 'bow') return;
        if (reduce) { animCat(c, [{ transform: 'none' }, { transform: 'translateY(-8%)' }, { transform: 'none' }], { duration: 400 }, 'spin'); return; }
        const dir = i ? -1 : 1;
        animCat(c, [{ transform: 'translateY(0) rotate(0deg)' }, { transform: `translateY(-26%) rotate(${180 * dir}deg)`, offset: .5 }, { transform: `translateY(0) rotate(${360 * dir}deg)` }],
          { duration: 640, easing: 'cubic-bezier(.45,0,.35,1)' }, 'spin');
      });
    }
    function droop(lane) {
      const c = cats[lane];
      if (c.busy === 'spin' || c.busy === 'droop' || c.busy === 'bow') return;
      const r = lane ? 9 : -9;
      animCat(c, [{ transform: 'none', opacity: 1 }, { transform: `translateY(6%) rotate(${r}deg) scale(1.05,.88)`, opacity: .72, offset: .25 },
        { transform: `translateY(6%) rotate(${r}deg) scale(1.05,.88)`, opacity: .72, offset: .7 }, { transform: 'none', opacity: 1 }],
        { duration: 720, easing: 'ease-out' }, 'droop');
    }
    function bow() {
      cats.forEach((c, i) => animCat(c, [{ transform: 'none' }, { transform: `translateY(9%) rotate(${i ? 16 : -16}deg) scale(1.03,.88)` }],
        { duration: 750, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' }, 'bow'));
    }
    function resetCats() { cats.forEach(c => { if (c.anim) c.anim.cancel(); c.anim = null; c.busy = ''; c.bob.style.transform = ''; }); }
    function setPlaying(on) {
      stage.classList.toggle('playing', on);
      stage.classList.toggle('props', on && !reduce);
    }

    /* ================= judging ================= */
    function judgeText(word, cls, sub) {
      const [b, small] = judgeEl.children;
      b.textContent = word; small.textContent = sub || '';
      judgeEl.className = 'td-judge ' + cls;
      judgeEl.getAnimations().forEach(a => a.cancel());
      judgeEl.animate(reduce ? [{ opacity: 1 }, { opacity: 1, offset: .7 }, { opacity: 0 }]
        : [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.7)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1.08)', offset: .15 },
          { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: .7 }, { opacity: 0, transform: 'translate(-50%,-62%) scale(1)' }], { duration: 650, fill: 'forwards' });
    }
    function hitNote(n, d, t) {
      n.done = true; n.hit = true;
      const perfect = Math.abs(d) <= PERFECT;
      if (perfect) P++; else G++;
      combo++; if (combo > maxCombo) maxCombo = combo;
      const mult = Math.min(4, 1 + Math.floor(combo / 10));
      score += (perfect ? 50 : 20) * mult;
      devSum += d; devN++; lastDev = d;
      flash[n.lane] = 1;
      sparks(n.lane, perfect);
      judgeText(perfect ? 'Perfect' : 'Good', perfect ? 'p' : 'g', perfect ? '' : (d < 0 ? 'early' : 'late'));
      if (combo % 10 === 0) spin(); else step(n.lane);
      hudDirty = true;
      void t;
    }
    function missNote(n) {
      n.done = true; n.missed = true; M++;
      const broke = combo >= 5;
      combo = 0;
      judgeText('Miss', 'm', broke ? 'combo dropped' : '');
      droop(n.lane);
      hudDirty = true;
    }
    function press(lane, heard) {
      flash[lane] = 1;
      if (band && audio.sfxOn()) band.play({ k: 'tap', vol: .05, hi: lane === 1 }, A.currentTime);
      if (phase !== 'play') { step(lane); return; }
      const t = heard - startAt - offset / 1000;
      let best = null, bd = 1;
      for (let i = firstIdx; i < chart.length; i++) {
        const n = chart[i];
        if (n.t - t > GOOD) break;
        if (n.done || n.lane !== lane) continue;
        const d = Math.abs(t - n.t);
        if (d <= GOOD && d < bd) { best = n; bd = d; }
      }
      if (best) hitNote(best, t - best.t, t);
      else step(lane);
    }

    /* ================= the song loop ================= */
    function pump() {
      if (phase !== 'play' || !band || !A) return;
      const now = A.currentTime, horizon = now + LOOKAHEAD;
      const evs = SONG.events;
      while (evIdx < evs.length) {
        const e = evs[evIdx], at = startAt + e.t;
        if (at > horizon) break;
        if (at > now - .05) band.play(e, Math.max(at, now));
        evIdx++;
      }
    }
    function update(t) {
      if (autoplay) for (let i = firstIdx; i < chart.length; i++) { const n = chart[i]; if (n.t + autoDev > t) break; if (!n.done) { flash[n.lane] = 1; hitNote(n, autoDev, t); } }
      for (let i = firstIdx; i < chart.length; i++) { const n = chart[i]; if (n.t > t - GOOD - MISS_GRACE) break; if (!n.done) missNote(n); }
      while (firstIdx < chart.length && chart[firstIdx].done && chart[firstIdx].t < t - .8) firstIdx++;
      while (cueIdx < cues.length && cues[cueIdx].t <= t) { countText(cues[cueIdx].text); cueIdx++; }
      if (!bowed && t >= beatTime(FINAL_BEAT + 3)) { bowed = true; bow(); }
      progI.style.width = clamp(t / beatTime(END_BEAT) * 100, 0, 100) + '%';
      if (hudDirty) paintHud();
      // cats bob and the lamp breathes on the beat
      const ph = ((t / SPB) % 1 + 1) % 1, kick = Math.exp(-ph * 5);
      if (t > beatTime(8) && t < beatTime(FINAL_BEAT) && !reduce) {
        const bobPx = Math.sin(ph * Math.PI) * L.catW * .025;
        cats.forEach(c => { c.bob.style.transform = `translateY(${-bobPx.toFixed(2)}px)`; });
      }
      glow.style.opacity = (.5 + .5 * (reduce ? .6 : kick)).toFixed(3);
      glow.style.transform = `translate(-50%,-50%) scale(${(1 + (reduce ? 0 : .1 * kick)).toFixed(3)})`;
      if (t >= END_T) finish();
    }
    function countText(text) {
      countEl.textContent = text;
      countEl.getAnimations().forEach(a => a.cancel());
      countEl.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(.6)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: .2 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.25)' }],
        { duration: Math.round(SPB * 1000 * .95), fill: 'forwards' });
    }
    function paintHud() {
      hudDirty = false;
      scoreB.textContent = fmt(score);
      const judged = P + G + M;
      accEl.textContent = judged ? `${((P + G * .65) / judged * 100).toFixed(1)}%` : '';
      const [b, span] = comboEl.children;
      if (combo >= 4) {
        const mult = Math.min(4, 1 + Math.floor(combo / 10));
        b.textContent = combo; span.textContent = mult > 1 ? `combo · ×${mult}` : 'combo';
        comboEl.classList.add('on');
      } else comboEl.classList.remove('on');
    }

    ctx.raf((now, dt) => {
      if (!L) return;
      if (phase === 'play') {
        pump();
        syncClock(false);
        const t = songTime();
        update(t);
        render(t, dt);
      } else {
        if (parts.length || rings.length || flash[0] > 0 || flash[1] > 0) render(phase === 'paused' ? pausedAt : -9, dt);
        if (phase !== 'results' || !bowed) {
          const k = reduce ? .75 : .72 + .12 * Math.sin(now / 900);
          glow.style.opacity = k.toFixed(3); glow.style.transform = 'translate(-50%,-50%)';
        }
      }
    });
    ctx.interval(pump, 50);

    /* ================= start, pause, finish ================= */
    async function ensureAudio() {
      const ac = audio.ac();
      if (!ac) { ctx.toast('This browser has no Web Audio, so the band can’t play. Sorry about that.'); return null; }
      A = ac;
      if (ac.state !== 'running') { try { await Promise.race([ac.resume(), new Promise(r => setTimeout(r, 500))]); } catch {} }
      return ctx.alive() ? ac : null;
    }
    // the site soundtrack steps aside only while the band is actually playing
    function holdSoundtrack() { musicBack = false; ctx.holdMusic(); }
    function giveSoundtrackBack() {
      if (document.hidden) { musicBack = true; return; }   // not into a background tab; on return
      musicBack = false;
      if (ctx.releaseMusic) ctx.releaseMusic();
    }
    function newBand() {
      if (band) band.stopAll();
      band = createBand(A, audio.out(), audio.dryOut());
      return band;
    }
    async function start(d) {
      if (d && DIFFS[d]) diff = d;
      store.set('game.tapdance.diff', diff);
      hideOverlay();
      const ac = await ensureAudio();
      if (!ac) { showStart(); return; }
      holdSoundtrack();
      newBand();
      chart = CHARTS[diff].map(n => ({ ...n }));
      score = combo = maxCombo = P = G = M = 0; devSum = devN = 0;
      firstIdx = 0; evIdx = 0; cues = COUNT_CUES; cueIdx = 0; bowed = false;
      parts.length = 0; rings.length = 0;
      lead = clamp(L.travel / DIFFS[diff].speed, 1, 2.2);
      resetCats();
      judgeEl.getAnimations().forEach(a => a.cancel()); judgeEl.style.opacity = 0;
      startAt = ac.currentTime + .25;
      syncClock(true);
      phase = 'play'; hudDirty = true; paintHud();
      setPlaying(true);
      pump();
    }
    function pause(reason) {
      if (phase !== 'play') return;
      pausedAt = songTime();
      if (band) { band.stopAll(); band = null; }
      phase = 'paused';
      setPlaying(false);
      cats.forEach(c => { c.bob.style.transform = ''; });
      showPause(reason);
      giveSoundtrackBack();
    }
    async function resume() {
      if (phase !== 'paused') return;
      hideOverlay();
      const ac = await ensureAudio();
      if (!ac) { showPause(); return; }
      holdSoundtrack();
      newBand();
      const from = Math.max(0, pausedAt - 2 * SPB);
      startAt = ac.currentTime + .2 + 4 * SPB - from;
      evIdx = SONG.events.findIndex(e => e.t >= from); if (evIdx < 0) evIdx = SONG.events.length;
      cues = [5, 6, 7, 8].map((n, i) => ({ t: from - (4 - i) * SPB, text: String(n) })); cueIdx = 0;
      for (let k = 0; k < 4; k++) band.play({ k: 'count', vol: .13, hi: k > 1 }, startAt + from - (4 - k) * SPB);
      syncClock(true);
      phase = 'play'; setPlaying(true);
      if (bowed) bow();
      pump();
    }
    function finish() {
      if (phase !== 'play') return;
      phase = 'results';
      if (band) { band.stopAll(); band = null; }
      setPlaying(false);
      giveSoundtrackBack();
      paintHud();
      render(-9, 0);
      const total = chart.length;
      const acc = total ? Math.round((P + G * .65) / total * 1000) / 10 : 0;
      const rk = rankFor(acc);
      const res = store.best('tapdance', score);
      const dust = Math.min(40, Math.floor(score / 500));
      store.statMax('bestDanceRank', rk.n);
      store.stat('dances');
      store.update('game.tapdance.bests', o => {
        const cur = (o && o[diff]) || {};
        return { ...(o || {}), [diff]: { score: Math.max(cur.score || 0, score), rank: Math.max(cur.rank || 0, rk.n) } };
      }, {});
      const avgDev = devN ? devSum / devN * 1000 : 0;
      showResults({ acc, rk, res, dust, avgDev });
      sr.textContent = `Dance finished. Rank ${rk.r}, ${fmt(score)} points, ${acc}% accuracy.`;
      ctx.timeout(() => {
        if (rk.n >= 3) ctx.stamp();
        if (rk.n >= 4) ctx.fx.confetti(rk.n === 5 ? 180 : 110, { stars: true });
        if (rk.n >= 3) audio.sfx('win');
      }, 350);
    }

    /* ================= overlays ================= */
    let overlay = null, primary = null;
    function showOverlay(card, onPrimary, cls = '') {
      hideOverlay();
      overlay = h('div', { class: 'overlay td-ov ' + cls }, card);
      primary = onPrimary || null;
      stage.append(overlay);
      const btn = card.querySelector('[data-primary]');
      if (btn && finePointer) setTimeout(() => btn.focus({ preventScroll: true }), 60);
    }
    function hideOverlay() { if (overlay) overlay.remove(); overlay = null; primary = null; }
    const bestLine = () => {
      const b = store.getBest('tapdance');
      const per = store.get('game.tapdance.bests', {}) || {};
      const parts2 = Object.entries(DIFFS).map(([k, d]) => `${d.name} ${per[k] && per[k].rank ? RANK_BY_N(per[k].rank).r : '–'}`);
      return b != null ? `Best ${fmt(b)} pts · ${parts2.join(' · ')}` : 'No dances yet. The hill is waiting.';
    };
    const goalLine = () => store.hasStamp('tapdance') ? '✓ Passport stamp collected' : 'Stamp goal: a B or better';

    function timingPanel() {
      const val = h('output', { class: 'td-offv' });
      const range = h('input', { type: 'range', min: -150, max: 150, step: 5, value: offset, 'aria-label': 'Timing offset in milliseconds' });
      const paint = () => { val.textContent = (offset > 0 ? '+' : '') + offset + ' ms'; range.value = offset; };
      range.addEventListener('input', () => { offset = clamp(+range.value || 0, -150, 150); store.set('game.tapdance.offset', offset); paint(); });
      const reset = h('button', { class: 'btn ghost small', type: 'button', text: 'Reset', onclick: () => { offset = 0; store.set('game.tapdance.offset', 0); paint(); } });
      paint();
      return h('div', { class: 'td-pop', hidden: true },
        h('div', { class: 'row' }, h('span', { class: 'kicker muted', text: 'Timing offset' }), h('span', { class: 'grow' }), val),
        range,
        h('p', { class: 'fine', text: 'Keep getting “late”? Slide right. “Early”? Slide left. Bluetooth headphones usually want +100 or more.' }),
        h('div', { class: 'row' }, reset));
    }

    function showStart() {
      phase = 'idle';
      setPlaying(false);
      if (L) render(-9, 0);
      const segBtns = [];
      const desc = h('p', { class: 'fine td-desc' });
      const paintSeg = () => { segBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.k === diff)); desc.textContent = DIFFS[diff].desc; };
      for (const [k, d] of Object.entries(DIFFS)) {
        const b = h('button', { type: 'button', text: d.name, 'data-k': k, onclick: () => { diff = k; store.set('game.tapdance.diff', k); paintSeg(); audio.sfx('click'); } });
        segBtns.push(b);
      }
      paintSeg();
      const pop = timingPanel();
      const timingBtn = h('button', { class: 'btn ghost small', type: 'button', 'aria-expanded': 'false', onclick: () => {
        pop.hidden = !pop.hidden; timingBtn.setAttribute('aria-expanded', !pop.hidden);
        card.classList.toggle('timing-open', !pop.hidden);
        if (!pop.hidden) requestAnimationFrame(() => { card.scrollTop = card.scrollHeight; });
      } }, '⚙ Timing');
      const card = h('div', { class: 'ocard td-card' },
        h('p', { class: 'kicker gold', text: 'Twilight hill · one swing tune' }),
        h('h3', { text: ctx.world.name || "Streetlamp Swing" }),
        h('p', { text: `Step when the notes reach the line. Left foot is ${them}, right foot is ${me}. Ten in a row and they spin.${U.gentle ? '' : ` (${me} rehearsed. Not enough.)`}` }),
        h('div', { class: 'seg', role: 'group', 'aria-label': 'Difficulty' }, segBtns),
        desc,
        finePointer
          ? h('div', { class: 'keys' }, h('kbd', { text: 'F' }), h('kbd', { text: 'J' }), ' or ', h('kbd', { text: 'D' }), h('kbd', { text: 'K' }), ' or ', h('kbd', { text: '←' }), h('kbd', { text: '→' }), ' · tap or click the lanes too')
          : h('p', { class: 'fine', text: 'Two thumbs: tap the left or right half.' }),
        h('p', { class: 'fine td-goal', text: goalLine() }),
        h('p', { class: 'fine td-best', text: bestLine() }),
        h('div', { class: 'row' },
          h('button', { class: 'btn solid big', type: 'button', 'data-primary': '', onclick: () => start() }, '▶ Dance'),
          timingBtn),
        pop);
      showOverlay(card, () => start());
    }

    function showPause(reason) {
      const card = h('div', { class: 'ocard td-card' },
        h('p', { class: 'kicker gold', text: reason === 'hidden' ? 'You stepped away' : 'Intermission' }),
        h('h3', { text: 'Paused' }),
        h('p', { text: 'The band is waiting under the streetlamp. Pick it back up with a count-in, or start the dance over.' }),
        h('div', { class: 'row' },
          h('button', { class: 'btn solid', type: 'button', 'data-primary': '', onclick: () => resume() }, '▶ Resume'),
          h('button', { class: 'btn', type: 'button', onclick: () => { phase = 'idle'; start(); } }, '↺ Restart'),
          h('button', { class: 'btn ghost', type: 'button', onclick: () => { resetCats(); showStart(); } }, 'Quit')));
      showOverlay(card, () => resume());
    }

    function showResults({ acc, rk, res, dust, avgDev }) {
      const total = chart.length;
      const dustEl = h('p', { class: 'td-dust', text: dust > 0 ? `+${dust} ✦ stardust` : 'No stardust this time. The dancers still had fun.' });
      const stampLine = rk.n >= 3
        ? (store.hasStamp('tapdance') ? '✓ Passport stamp: yours.' : 'Passport stamp earned!')
        : (store.hasStamp('tapdance') ? '✓ Passport stamp already collected.' : 'Finish with a B or better for the passport stamp.');
      let tip = null;
      if (devN >= 12 && Math.abs(avgDev) >= 18) {
        const nudge = clamp(offset + Math.round(avgDev / 5) * 5, -150, 150);
        if (nudge !== offset) {
          const b = h('button', { class: 'btn ghost small', type: 'button', text: `Nudge timing to ${nudge > 0 ? '+' : ''}${nudge} ms` });
          b.onclick = () => { offset = nudge; store.set('game.tapdance.offset', offset); b.textContent = 'Timing nudged ✓'; b.disabled = true; };
          tip = h('div', { class: 'td-tip' }, h('p', { class: 'fine', text: `On average you stepped ${Math.abs(Math.round(avgDev))} ms ${avgDev > 0 ? 'late' : 'early'}. Probably the speakers, not you.` }), b);
        }
      }
      const card = h('div', { class: 'ocard td-card td-results' },
        h('p', { class: 'kicker gold', text: `Curtain call · ${DIFFS[diff].name}` }),
        h('div', { class: 'td-rank r' + rk.r, text: rk.r, 'aria-label': 'Rank ' + rk.r }),
        h('p', { class: 'td-rankline', text: rankLine(rk) }),
        h('div', { class: 'row' }, h('span', { class: 'big-score', text: fmt(score) }), (res.isNew || (res.first && score > 0)) ? h('span', { class: 'newbest', text: 'New best' }) : null),
        h('div', { class: 'td-stats' },
          stat('Accuracy', acc.toFixed(1) + '%'), stat('Max combo', maxCombo),
          stat('Perfect', P), stat('Good', G), stat('Miss', M)),
        dustEl,
        h('p', { class: 'fine', text: stampLine }),
        tip,
        h('div', { class: 'row td-btns' },
          h('button', { class: 'btn solid', type: 'button', 'data-primary': '', onclick: () => start() }, '↺ Dance again'),
          h('button', { class: 'btn', type: 'button', onclick: () => { resetCats(); showStart(); } }, 'Change steps'),
          h('a', { class: 'btn ghost', href: '#/map' }, 'Back to map')));
      showOverlay(card, () => start(), 'td-ov-res');
      if (dust > 0) ctx.award(dust, dustEl);
    }
    const stat = (k, v) => h('div', {}, h('b', { text: String(v) }), h('span', { text: k }));

    /* ================= input ================= */
    ctx.on(stage, 'pointerdown', e => {
      if (e.target.closest && e.target.closest('button, a, input, output, .peek, .ocard')) return;
      if (phase !== 'play') return;
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      press(e.clientX - r.left < r.width / 2 ? 0 : 1, eventHeard(e));
    });
    ctx.on(stage, 'contextmenu', e => e.preventDefault());
    ctx.on(window, 'keydown', e => {
      const tg = e.target;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
      if (document.querySelector('.modal-wrap')) return;
      const k = (e.key || '').toLowerCase();
      if (phase === 'play') {
        const lane = LEFT_KEYS.has(k) ? 0 : RIGHT_KEYS.has(k) ? 1 : -1;
        if (lane >= 0) { e.preventDefault(); if (!e.repeat) press(lane, eventHeard(e)); return; }
        if (k === 'escape' || k === 'p') { e.preventDefault(); pause('key'); return; }
        if (k === ' ' || k === 'arrowup' || k === 'arrowdown') e.preventDefault();
        return;
      }
      const onControl = tg && tg.closest && tg.closest('button, a, input');
      if ((k === 'enter' || k === ' ') && primary && !onControl) { e.preventDefault(); primary(); return; }
      if (k === 'escape' && phase === 'paused') { e.preventDefault(); resume(); return; }
      if (phase === 'idle' && (LEFT_KEYS.has(k) || RIGHT_KEYS.has(k)) && !e.repeat && !onControl) step(LEFT_KEYS.has(k) ? 0 : 1);
    });
    ctx.on(document, 'visibilitychange', () => {
      if (document.hidden) pause('hidden');
      else if (musicBack && phase !== 'play') giveSoundtrackBack();
    });
    // leaving: the router keeps this view up during the iris wipe, so go quiet right away
    ctx.on(window, 'hashchange', () => { if (!/\/w\/tapdance\b/.test(location.hash)) pause('leaving'); });
    const onState = () => { if (A && A.state !== 'running' && phase === 'play') pause('hidden'); };
    let acWatch = null;
    ctx.interval(() => { if (A && acWatch !== A) { acWatch = A; A.addEventListener('statechange', onState); } }, 500);
    ctx.cleanup(() => { if (acWatch) acWatch.removeEventListener('statechange', onState); });

    let rT = 0;
    const onResize = () => { cancelAnimationFrame(rT); rT = requestAnimationFrame(() => { if (ctx.alive()) layout(); }); };
    ctx.on(window, 'resize', onResize);
    if (window.visualViewport) ctx.on(window.visualViewport, 'resize', onResize);
    ctx.on(window, 'orientationchange', () => ctx.timeout(layout, 250));
    ctx.cleanup(() => cancelAnimationFrame(rT));

    // leaving mid-song: silence everything right now
    ctx.cleanup(() => { phase = 'gone'; if (band) { band.stopAll(); band = null; } });

    /* ================= debug hook for automated tests ================= */
    const hook = {
      state: () => ({ phase, diff, score, combo, maxCombo, P, G, M, lastDev, total: chart.length, offset, lead, live: band ? band.live() : 0, evIdx, events: SONG.events.length, t: phase === 'play' ? songTime() : null, layout: L && { tall: L.tall, W: L.W, H: L.H, hitY: L.hitY, laneTop: L.laneTop, lanes: L.lanes } }),
      chart: d => CHARTS[d || diff].map(n => ({ t: n.t, b: n.b, lane: n.lane, dbl: !!n.dbl })),
      start: d => start(d), autoplay: (on = true, devMs = 0) => { autoplay = !!on; autoDev = clamp(devMs, -90, 90) / 1000; }, pause: () => pause('debug'), resume: () => resume(),
      songTime: () => songTime(),
      finishNow(perfect = true, devMs = 0) { if (phase !== 'play') return false; for (const n of chart) if (!n.done) { if (perfect) hitNote(n, clamp(devMs, -90, 90) / 1000, n.t); else missNote(n); } finish(); return true; },
    };
    window.__tapdance = hook;
    ctx.cleanup(() => { if (window.__tapdance === hook) delete window.__tapdance; });

    layout();
    ctx.timeout(layout, 400);   // fonts and the header settle
    showStart();
  },
};
