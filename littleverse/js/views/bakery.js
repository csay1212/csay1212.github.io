// The Cake Tower: drop each layer at the right moment and stack the tallest
// cake in the galaxy. Overhangs get sliced off; perfect drops stay whole.
import { h, icon, clamp, lerp, rand, pick } from '../core/dom.js';

const LH = 30;              // layer height (units)
const BASE_W = 200;         // starting layer width
const STAND_H = 44;         // top of the cake-stand plate
const AMP = 215;            // how far the new layer slides from the tower's center
const GROW = 10;            // regrowth per perfect after three in a row
const LAMP_X = -212;
const INK = '#16121f';
const FLAVORS = [
  { body: '#f6a6c1', dark: '#d97898', frost: '#fff3f7', spr: ['#ef5fa7', '#f5cc4a', '#86e6d8', '#b59cff'] }, // strawberry
  { body: '#c9aef7', dark: '#9a7ed6', frost: '#fbf7ff', spr: ['#f5cc4a', '#ef7fb0', '#86e6d8'] },            // lilac
  { body: '#f5e4be', dark: '#d6ba88', frost: '#f48fbe', spr: ['#ffffff', '#f5cc4a', '#9fd3ff'] },            // vanilla cream
  { body: '#f8d567', dark: '#d7a62e', frost: '#fffaf0', spr: ['#ef7fb0', '#b59cff', '#86e6d8'] },            // lemon
  { body: '#a6e8d4', dark: '#66c1a6', frost: '#5d3b2e', spr: ['#f6eee3', '#ef7fb0', '#f5cc4a'] },            // mint, chocolate drip
];
const BIRTHDAYISH = new Set(['birthday', 'belated']);
// milestone lines up the side of the sky; `col` picks the theme color they glow in
function milesFor(U) {
  const m = [
    { n: 5, short: 'Streetlamp', text: 'Taller than the streetlamp' },
    { n: 10, short: 'Clouds', text: 'Cloud level' },
    { n: 12, short: BIRTHDAYISH.has(U.occ) ? 'Birthday-grade' : 'Party-sized', text: BIRTHDAYISH.has(U.occ) ? 'Officially birthday-grade' : 'Officially party-sized', col: 'gold' },
    { n: 20, short: 'Low orbit', text: 'Low orbit' },
    { n: 30, short: 'Deep space', text: `The edge of the ${U.verse || 'universe'}` },
  ];
  // one layer for the day that matters, when the date is what's being celebrated
  const d = U.date && U.date.d;
  if ((BIRTHDAYISH.has(U.occ) || U.occ === 'anniversary') && d >= 6 && d <= 29 && !m.some(x => x.n === d)) {
    m.push({ n: d, short: U.date.short, text: `${d} — one for ${U.date.long}`, col: 'rose' });
  }
  return m.sort((a, b) => a.n - b.n);
}
// what the cake-stand plate says: the recipient's name, trimmed to fit
function plateName(name) {
  let s = String(name || '').trim().replace(/\s+/g, ' ').toUpperCase();
  if (s.length > 16) s = s.replace(/^THE /, '');
  if (s.length > 16) {
    const w = s.split(' '); let out = '';
    for (const x of w) { if ((out ? out.length + 1 : 0) + x.length > 16) break; out = out ? out + ' ' + x : x; }
    out = out.replace(/ (AND|&|OF|THE)$/, '');
    s = out || w[0].slice(0, 15) + '.';
  }
  return s;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// theme helpers: the universe's palette, mixed for scenery
const hexRgb = hex => { const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim()); if (!m) return [128, 128, 128]; const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const mix = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const rgbOf = hex => hexRgb(hex).join(',');
const TWILIGHT = { night: '#0c0b24', night2: '#120f33', dusk: '#2a1d55', horizon: '#4a2c6e', rose: '#ef7fb0', gold: '#f5cc4a', hud: '#86e6d8', lilac: '#b59cff', peach: '#ff9a7a', sky: '#9fd3ff', paper: '#f6eee3', muted: '#b8b0d6' };
const STAR_X = 150;                                  // a bright star, way up past 30 layers
const lineY = n => STAND_H + (n + 1) * LH;          // top of layer n (the base layer is 0)
// sky color by altitude (world units, up), from the theme
function skyFor(T) {
  return [[-60, mix(T.peach, T.paper, .2)], [70, mix(T.rose, T.peach, .3)], [250, mix(T.horizon, T.rose, .45)], [520, T.horizon], [820, T.dusk],
    [1150, T.night2], [1600, mix(T.night, '#000000', .3)], [2300, mix(T.night, '#000000', .65)]].map(([y, c]) => [y, hexRgb(c)]);
}
let SKY = skyFor(TWILIGHT);
function skyAt(y) {
  if (y <= SKY[0][0]) return SKY[0][1];
  for (let i = 1; i < SKY.length; i++) {
    if (y <= SKY[i][0]) {
      const [y0, c0] = SKY[i - 1], [y1, c1] = SKY[i], t = (y - y0) / (y1 - y0);
      return [0, 1, 2].map(j => Math.round(c0[j] + (c1[j] - c0[j]) * t));
    }
  }
  return SKY[SKY.length - 1][1];
}
// the device's safe-area insets (home indicator, landscape notch), in px
function insets() {
  const p = document.createElement('div');
  p.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:0 var(--safe-r) var(--safe-b) var(--safe-l)';
  document.body.append(p);
  const cs = getComputedStyle(p), v = { l: parseFloat(cs.paddingLeft) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0 };
  p.remove();
  return v;
}
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function rr(c, x, y, w, hh, r) {
  r = Math.max(0, Math.min(r, w / 2, hh / 2));
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + hh, r); c.arcTo(x + w, y + hh, x, y + hh, r);
  c.arcTo(x, y + hh, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function glow(c, x, y, r, rgb, a) {
  const gr = c.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2);
}
const smooth = t => t * t * (3 - 2 * t);

function cakeSVG(name, T) {
  const drip = (x0, x1, y, col) => {
    let d = `M${x0} ${y - 4} H${x1} V${y + 3}`;
    for (let x = x1; x > x0 + 4; x -= 9) d += ` L${x - 2} ${y + 3} Q${x - 4} ${y + 10 + (x % 3) * 2} ${x - 6} ${y + 3}`;
    return `<path d="${d} L${x0} ${y + 3}Z" fill="${col}"/>`;
  };
  const layer = (x, y, w, fl) => `<rect x="${x}" y="${y}" width="${w}" height="22" rx="3" fill="${fl.body}"/><rect x="${x}" y="${y + 15}" width="${w}" height="7" rx="3" fill="${fl.dark}" opacity=".6"/>${drip(x, x + w, y + 4, fl.frost)}`;
  return `<svg viewBox="0 0 170 150" aria-hidden="true">
    <ellipse cx="85" cy="146" rx="52" ry="3" fill="rgba(0,0,0,.35)"/>
    <path d="M60 146 H110 L102 137 H68Z" fill="#efe3d3"/><path d="M76 137 H94 L91 121 H79Z" fill="#e3d4c1"/>
    <rect x="12" y="108" width="146" height="15" rx="5" fill="#f6eee3"/><rect x="12" y="108" width="146" height="2.5" rx="1" fill="${T.gold}"/>
    ${plateSVGText(name, mix(T.rose, '#5a1a3a', .42))}
    ${layer(30, 86, 110, FLAVORS[0])}${layer(36, 64, 98, FLAVORS[1])}${layer(42, 42, 86, FLAVORS[3])}
    <rect x="83" y="22" width="4" height="18" rx="1.5" fill="#fff3f7"/><rect x="83" y="26" width="4" height="3" fill="#ef7fb0"/><rect x="83" y="33" width="4" height="3" fill="#ef7fb0"/>
    <path d="M85 8 Q90 16 85 21 Q80 16 85 8Z" fill="#ffd36b"/><circle cx="85" cy="16" r="9" fill="rgba(255,211,107,.25)"/>
  </svg>`;
}
// the plate's name in the start-card cake: spaced capitals, smaller for longer names
function plateSVGText(name, fill) {
  const s = plateName(name), n = Math.max(1, [...s].length);
  const ls = n <= 6 ? 5 : n <= 10 ? 3 : 1.4;
  const est = f => n * .7 * f;               // Italiana capitals run about .7em wide
  let fs = 10;
  while (fs > 5.5 && est(fs) + (n - 1) * ls > 110) fs -= .5;
  const tw = Math.min(112, est(fs) + (n - 1) * ls);
  return `<text x="85" y="${(115.6 + fs * .36).toFixed(2)}" text-anchor="middle" font-family="Italiana, Georgia, serif" font-size="${fs}" textLength="${tw.toFixed(1)}" lengthAdjust="spacing" fill="${fill}">${esc(s)}</text>`;
}

export default {
  css: 'bakery',
  mount(ctx) {
    const { store, audio, cat, U } = ctx;
    const reduce = ctx.reduce;
    const sfxOn = () => audio.sfxOn();
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    ctx.root.classList.add('full');
    ctx.pauseSky();
    const MILES = milesFor(U);
    // the scenery's palette, from the playing universe's theme
    const T = { ...TWILIGHT, ...(U.theme || {}) };
    SKY = skyFor(T);
    const PAL = {
      rose: rgbOf(T.rose), gold: rgbOf(T.gold), paper: rgbOf(T.paper), night: rgbOf(T.night), hud: rgbOf(T.hud),
      starGold: rgbOf(mix(T.gold, T.paper, .4)), plate: mix(T.rose, '#5a1a3a', .42), iron: mix(T.night2, T.dusk, .1),
      hill: T.horizon, plain0: mix(T.dusk, T.horizon, .2), plain1: mix(T.night2, T.dusk, .6),
      ground0: mix(T.night2, T.dusk, .45), ground1: T.night,
      cloud0: rgbOf(mix(T.paper, T.lilac, .25)), cloud1: rgbOf(mix(T.rose, T.paper, .3)), flash: rgbOf(mix(T.gold, T.paper, .5)),
    };
    const milesCol = m => m.col === 'gold' ? T.gold : m.col === 'rose' ? T.rose : null;
    const design = cat.getDesign();
    const ASP = cat.catAspect(design);
    let catImg = null; // rasterized pilot; arrives a moment after mount

    /* ================= DOM ================= */
    const canvas = h('canvas', { class: 'bk-canvas', tabindex: '-1', role: 'img', 'aria-label': 'The Cake Tower. Tap, click or press Space to drop the layer.' });
    const g = canvas.getContext('2d');
    const hudN = h('b', { text: '0' }), hudCombo = h('b', { text: '–' });
    const hudBest = h('b', { text: String(store.getBest('bakery') ?? 0) });
    const pauseBtn = h('button', { class: 'icon-btn bk-pause', type: 'button', 'aria-label': 'Pause', hidden: true }, icon('pause'));
    const hud = h('div', { class: 'ghud bk-hud' },
      h('div', { class: 'bk-hg' },
        h('div', { class: 'bk-st' }, h('span', { text: 'Layers' }), hudN),
        h('div', { class: 'bk-st' }, h('span', { text: 'Perfect' }), hudCombo)),
      h('div', { class: 'bk-hg' },
        h('div', { class: 'bk-st r' }, h('span', { text: 'Best' }), hudBest),
        pauseBtn));

    const heroCat = h('div', { class: 'bk-hero-cat', html: cat.catSVG(design, { spin: true }) });
    const hero = h('div', { class: 'bk-hero' }, h('div', { class: 'bk-hero-cake', html: cakeSVG(U.them.name, T) }), heroCat);
    const metaLine = h('div', { class: 'bk-meta' });
    const startBtn = h('button', { class: 'btn rose solid big bk-go', type: 'button', text: 'Start baking' });
    const startOv = h('div', { class: 'overlay bk-ov' },
      h('div', { class: 'ocard bk-card bk-start' },
        h('p', { class: 'kicker rose bk-k', text: 'Open late tonight' }),
        h('h3', { class: 'bk-t', text: 'The Cake Tower' }),
        hero,
        h('div', { class: 'bk-how', text: 'Drop each layer onto the cake. Whatever hangs over the edge gets sliced off. Line it up perfectly and it stays whole. Three perfects in a row and it grows back a little.' }),
        finePointer
          ? h('div', { class: 'keys bk-keys' }, h('span', { text: 'Click or' }), h('kbd', { text: 'Space' }), h('span', { text: 'to drop ·' }), h('kbd', { text: 'Esc' }), h('span', { text: 'pause' }))
          : null,
        metaLine,
        startBtn));

    const rTitle = h('h3', { class: 'bk-t' }), rScore = h('div', { class: 'big-score' }), rUnit = h('div', { class: 'bk-unit' });
    const rBadge = h('span', { class: 'newbest', text: 'New best' }), rLine = h('div', { class: 'bk-line' }), rEarn = h('div', { class: 'bk-earn' });
    const againBtn = h('button', { class: 'btn rose solid', type: 'button', text: 'Bake again' });
    const resultOv = h('div', { class: 'overlay bk-ov bk-res-ov', hidden: true },
      h('div', { class: 'ocard bk-card bk-res' },
        h('p', { class: 'kicker rose bk-k', text: 'Out of the oven' }),
        rTitle,
        h('div', { class: 'bk-score' }, rScore, rUnit),
        h('div', { class: 'bk-rtxt' }, rBadge, rLine, rEarn),
        h('div', { class: 'row bk-btns' }, againBtn, h('a', { class: 'btn ghost', href: '#/map', text: 'Back to map' }))));

    const resumeBtn = h('button', { class: 'btn rose solid', type: 'button', text: 'Resume' });
    const pauseOv = h('div', { class: 'overlay bk-ov', hidden: true },
      h('div', { class: 'ocard bk-card' },
        h('p', { class: 'kicker rose bk-k', text: 'Oven on low' }),
        h('h3', { class: 'bk-t', text: 'Paused' }),
        h('div', { class: 'bk-txt', text: 'The cake will wait. Cakes are patient like that.' }),
        h('div', { class: 'row bk-btns' }, resumeBtn, h('a', { class: 'btn ghost', href: '#/map', text: 'Back to map' }))));

    const stage = h('div', { class: 'stage-wrap bk-stage' }, canvas, hud, startOv, resultOv, pauseOv);
    const wrap = h('div', { class: 'bk-wrap' }, stage);
    ctx.root.append(wrap);
    ctx.peek(hero, 'bakery-hide', { left: '6%', bottom: '18%', rotate: -18, size: 26 });

    const paintMeta = () => {
      const best = store.getBest('bakery');
      const goal = store.hasStamp('bakery') ? '✓ Stamp collected' : 'Stamp goal: 12 layers';
      metaLine.textContent = `${goal} · ${best == null ? 'No cakes yet' : 'Tallest: ' + best + (best === 1 ? ' layer' : ' layers')}`;
    };
    paintMeta();

    /* ================= sizing + sprites ================= */
    let cw = 300, ch = 500, dpr = 1, S = 1, clock = 0;   // S = CSS px per unit at zoom 1
    let spr = {};
    function mk(w, hh) {
      const c = document.createElement('canvas');
      const k = S * dpr;
      c.width = Math.max(1, Math.ceil(w * k)); c.height = Math.max(1, Math.ceil(hh * k));
      const x = c.getContext('2d'); x.scale(c.width / w, c.height / hh);
      return [c, x];
    }
    function layerSprite(w, fl, seed) {
      const R = rng(seed), pad = 2;
      const [c, x] = mk(w + pad * 2, LH + pad * 2);
      x.translate(pad, pad);
      const bg = x.createLinearGradient(0, 0, 0, LH);
      bg.addColorStop(0, fl.body); bg.addColorStop(.75, fl.body); bg.addColorStop(1, fl.dark);
      x.fillStyle = bg; x.beginPath(); rr(x, 0, 0, w, LH, 3.5); x.fill();
      if (w > 8) {
        const sg = x.createLinearGradient(0, 0, w, 0);
        const e = Math.min(.45, 7 / w), e2 = Math.min(.48, 16 / w);
        sg.addColorStop(0, 'rgba(60,24,70,.24)'); sg.addColorStop(e, 'rgba(255,255,255,.12)'); sg.addColorStop(e2, 'rgba(255,255,255,0)');
        sg.addColorStop(1 - e2, 'rgba(60,24,70,0)'); sg.addColorStop(1, 'rgba(60,24,70,.3)');
        x.fillStyle = sg; x.beginPath(); rr(x, 0, 0, w, LH, 3.5); x.fill();
      }
      x.fillStyle = 'rgba(90,40,70,.13)';
      for (let i = 0; i < w / 9; i++) x.fillRect(R() * (w - 2) + 1, 14 + R() * (LH - 17), 1.3, 1.3);
      // frosting + drips
      x.fillStyle = fl.frost; x.beginPath(); rr(x, 0, 0, w, 7.5, 3);
      let dx = 1 + R() * 5;
      while (dx < w - 4) {
        const dw = Math.min(4 + R() * 4, w - dx - 1), len = 6 + R() * 10;
        if (dw > 2.5) rr(x, dx, 4, dw, len, dw / 2);
        dx += dw + 2 + R() * 9;
      }
      x.fill();
      x.fillStyle = 'rgba(255,255,255,.5)'; if (w > 6) x.fillRect(2.5, 1.3, w - 5, 1.2);
      for (let i = 0, n = Math.floor(w / 24); i < n; i++) {
        x.save(); x.translate(3 + R() * (w - 6), 2.4 + R() * 3); x.rotate(R() * 3.14);
        x.fillStyle = pick(fl.spr); x.fillRect(-2.2, -.75, 4.4, 1.5); x.restore();
      }
      x.fillStyle = 'rgba(20,10,30,.2)'; x.fillRect(1, LH - 1.4, w - 2, 1.4);
      return c;
    }
    function buildCat() {
      const [c, x] = mk(70, 70 * ASP);
      if (catImg) x.drawImage(catImg, 0, 0, 70, 70 * ASP);
      spr.cat = c;
    }
    function buildStatic() {
      spr = {};
      // ---- cake stand with the recipient's name on the plate (anchor: bottom center = (160, 60)) ----
      {
        const [c, x] = mk(320, 60); const B = 60;
        const por = x.createLinearGradient(0, B - STAND_H, 0, B);
        por.addColorStop(0, '#fbf6ee'); por.addColorStop(1, '#ddcdb8');
        x.fillStyle = 'rgba(0,0,0,.28)'; x.beginPath(); x.ellipse(160, B - 1, 70, 3, 0, 0, 6.283); x.fill();
        x.fillStyle = por;
        x.beginPath(); x.moveTo(112, B); x.lineTo(208, B); x.lineTo(196, B - 8); x.lineTo(124, B - 8); x.closePath(); x.fill();
        x.beginPath(); x.moveTo(147, B - 8); x.lineTo(173, B - 8); x.lineTo(168, B - 26); x.lineTo(152, B - 26); x.closePath(); x.fill();
        x.fillStyle = '#e7d8c5'; x.fillRect(146, B - 28, 28, 3);
        const pl = x.createLinearGradient(0, B - STAND_H, 0, B - 26);
        pl.addColorStop(0, '#fffaf2'); pl.addColorStop(1, '#e8d9c6');
        x.fillStyle = pl; x.beginPath(); rr(x, 6, B - STAND_H, 308, 18, 7); x.fill();
        x.fillStyle = T.gold; x.fillRect(12, B - STAND_H, 296, 2.2); x.fillRect(16, B - 27.5, 288, 1.2);
        // little doily scallops
        x.fillStyle = 'rgba(255,255,255,.9)';
        for (let i = 0; i < 26; i++) { x.beginPath(); x.arc(30 + i * 10.4, B - STAND_H + 2, 2.6, 0, Math.PI); x.fill(); }
        // the name in spaced capitals, shrunk to fit; little diamonds either side when there's room
        const word = [...plateName(U.them.name)], n = word.length;
        const sp = n <= 6 ? 6.5 : n <= 10 ? 4 : 2.2;
        let fs = 13, ws = [], tw = 0;
        for (; fs >= 8; fs -= .5) {
          x.font = `400 ${fs}px Italiana, Georgia, serif`;
          ws = word.map(ch => x.measureText(ch).width); tw = ws.reduce((a, b) => a + b, 0) + sp * (n - 1);
          if (tw <= 248) break;
        }
        x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillStyle = PAL.plate;
        let px = 160 - tw / 2;
        word.forEach((ch, i) => { x.fillText(ch, px, B - 34.5); px += ws[i] + sp; });
        const dx = Math.max(44, tw / 2 + 13);
        if (160 + dx < 300) {
          x.fillStyle = mix(PAL.plate, '#f6eee3', .4);
          for (const sx of [160 - dx, 160 + dx]) { x.beginPath(); x.moveTo(sx, B - 38); x.lineTo(sx + 2.2, B - 34.5); x.lineTo(sx, B - 31); x.lineTo(sx - 2.2, B - 34.5); x.closePath(); x.fill(); }
        }
        spr.stand = c;
      }
      // ---- the streetlamp (anchor: bottom center (90, 250)); finial at y = 250 - 226 ----
      {
        const [c, x] = mk(180, 250); const cx = 90, B = 250, t = B - 226, D = PAL.iron;
        glow(x, cx, t + 44, 86, '255,214,150', .5);
        x.fillStyle = D; x.strokeStyle = D;
        x.beginPath(); x.moveTo(cx, t); x.lineTo(cx + 2, t + 7); x.lineTo(cx - 2, t + 7); x.fill();
        x.beginPath(); x.arc(cx, t + 9, 3.2, 0, 6.283); x.fill();
        x.beginPath(); x.moveTo(cx - 21, t + 27); x.quadraticCurveTo(cx - 15, t + 12, cx, t + 11); x.quadraticCurveTo(cx + 15, t + 12, cx + 21, t + 27); x.closePath(); x.fill();
        x.fillRect(cx - 23, t + 25, 46, 4);
        const gl = x.createLinearGradient(cx - 17, 0, cx + 17, 0);
        gl.addColorStop(0, '#ee9c48'); gl.addColorStop(.5, '#fff6d2'); gl.addColorStop(1, '#ee9c48');
        x.fillStyle = gl; x.beginPath(); x.moveTo(cx - 17, t + 29); x.lineTo(cx + 17, t + 29); x.lineTo(cx + 11, t + 60); x.lineTo(cx - 11, t + 60); x.closePath(); x.fill();
        x.lineWidth = 2; x.beginPath(); x.moveTo(cx, t + 29); x.lineTo(cx, t + 60); x.stroke();
        x.lineWidth = 2.6; x.beginPath(); x.moveTo(cx - 17, t + 29); x.lineTo(cx - 11, t + 60); x.lineTo(cx + 11, t + 60); x.lineTo(cx + 17, t + 29); x.stroke();
        x.fillStyle = D;
        x.beginPath(); x.moveTo(cx - 13, t + 59); x.lineTo(cx + 13, t + 59); x.lineTo(cx + 6, t + 67); x.lineTo(cx - 6, t + 67); x.fill();
        x.fillRect(cx - 4, t + 66, 8, 8); x.fillRect(cx - 9, t + 72, 18, 4);
        x.fillRect(cx - 6, t + 76, 12, B - 40 - (t + 76));
        for (let ry = B - 80; ry > t + 96; ry -= 52) x.fillRect(cx - 8.5, ry, 17, 5);
        x.beginPath(); x.moveTo(cx - 9, B - 40); x.lineTo(cx + 9, B - 40); x.lineTo(cx + 13, B - 16); x.lineTo(cx + 18, B - 9); x.lineTo(cx + 18, B); x.lineTo(cx - 18, B); x.lineTo(cx - 18, B - 9); x.lineTo(cx - 13, B - 16); x.closePath(); x.fill();
        x.fillStyle = 'rgba(255,214,150,.4)'; x.fillRect(cx - 23, t + 25, 46, 1.2);
        x.fillStyle = 'rgba(255,200,130,.18)'; x.fillRect(cx - 6, t + 76, 1.6, B - 40 - (t + 76));
        spr.lamp = c;
      }
      // ---- horizon: hazy hills + city lights (tile 1200 wide, bottom at the ground) ----
      {
        const TW = 1200, HH = 120; const [c, x] = mk(TW, HH); const R = rng(5);
        const hill = xx => 52 + 16 * Math.sin(xx / TW * 6.283 * 3 + 1) + 9 * Math.sin(xx / TW * 6.283 * 7) + 5 * Math.sin(xx / TW * 6.283 * 13 + 2);
        x.beginPath(); x.moveTo(0, HH);
        for (let xx = 0; xx <= TW; xx += 10) x.lineTo(xx, hill(xx));
        x.lineTo(TW, HH); x.closePath(); x.fillStyle = PAL.hill; x.fill();
        const pg = x.createLinearGradient(0, 84, 0, HH); pg.addColorStop(0, PAL.plain0); pg.addColorStop(1, PAL.plain1);
        x.fillStyle = pg; x.fillRect(0, 86, TW, HH - 86);
        const warm = ['255,214,122', '255,180,107', '255,243,209', '255,138,168'];
        for (let i = 0; i < 260; i++) {
          const xx = R() * TW, yy = 88 + R() * 30, sz = .9 + R() * 1, col = pick(warm), a = .35 + R() * .55;
          x.fillStyle = `rgba(${col},${a})`; for (const o of [0, -TW, TW]) x.fillRect(xx + o, yy, sz, sz);
        }
        spr.horizon = c; spr.horW = TW; spr.horH = HH;
      }
      // ---- clouds for cloud level ----
      spr.clouds = [0, 1].map(v => {
        const [c, x] = mk(220, 90); const R = rng(21 + v * 7);
        const p = new Path2D(); const n = 6 + v * 2;
        for (let i = 0; i < n; i++) {
          const px = 30 + i * (160 / (n - 1)), py = 52 - Math.sin(i / (n - 1) * Math.PI) * (16 + R() * 10), pr = 16 + Math.sin(i / (n - 1) * Math.PI) * 14 + R() * 6;
          p.moveTo(px + pr, py); p.arc(px, py, pr, 0, 6.283);
        }
        p.rect(30, 52, 160, 18);
        const cg = x.createLinearGradient(0, 20, 0, 72); cg.addColorStop(0, `rgba(${PAL.cloud0},.55)`); cg.addColorStop(1, `rgba(${PAL.cloud1},.55)`);
        x.fillStyle = cg; x.fill(p);
        return c;
      });
      // ---- sparkle ----
      spr.sparks = [PAL.gold, PAL.rose, PAL.hud, '255,255,255'].map(col => {
        const [c, x] = mk(14, 14);
        glow(x, 7, 7, 7, col, .5);
        x.beginPath();
        for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, r = i % 2 ? 1.4 : 6; x.lineTo(7 + Math.cos(a) * r, 7 + Math.sin(a) * r); }
        x.closePath(); x.fillStyle = `rgb(${col})`; x.fill();
        return c;
      });
      buildCat();
    }

    // Measure the space below the header. The stage is collapsed first: a stage
    // sized for the previous orientation would otherwise widen the mobile layout
    // viewport and make innerHeight come back far too tall.
    function layout() {
      stage.style.width = '0px'; stage.style.height = '0px';
      const de = document.documentElement;
      const bar = ctx.frame && ctx.frame.el.querySelector('.wbar');
      const barH = bar ? bar.getBoundingClientRect().height : 58;
      const vw = de.clientWidth || innerWidth;
      const vh = Math.min(innerHeight, de.clientHeight || innerHeight);
      const m = vw < 600 || vh < 520 ? 8 : 14;
      const sa = insets();
      cw = Math.floor(clamp(vw - 2 * m - sa.l - sa.r, 260, 1800));
      ch = Math.floor(Math.max(220, vh - barH - 2 * m - sa.b));
      wrap.style.padding = `${m}px ${m + sa.r}px ${m + sa.b}px ${m + sa.l}px`;
      stage.style.width = cw + 'px'; stage.style.height = ch + 'px';
      stage.classList.toggle('short', ch < 470);
      stage.classList.toggle('compact', ch >= 470 && ch < 660);
      stage.classList.toggle('narrow', cw < 420);
      dpr = Math.min(2, devicePixelRatio || 1, Math.sqrt(4.2e6 / (cw * ch)));
      stage.classList.toggle('side', (cw >= 860 && ch >= 470) || (ch < 470 && cw >= 700));
      canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
      S = Math.min(cw / 500, ch / 600);
      buildStatic();
      for (const l of L) l.spr = layerSprite(l.w, FLAVORS[l.i % FLAVORS.length], l.seed);
      if (cur) cur.spr = layerSprite(cur.w, FLAVORS[cur.i % FLAVORS.length], cur.seed);
      for (const d of debris) d.spr = layerSprite(d.w, FLAVORS[d.i % FLAVORS.length], d.seed);
      if (E) { Object.assign(E, endTargets()); if (state === 'over') { cam.z = E.zT; cam.y = E.yT; cam.x = E.xT; frameForCard(true); } }
      else { const t = camTarget(); cam.y = t.y; cam.x = t.x; }
      render();
    }

    /* ================= game state ================= */
    let state = 'title', prevState = 'play', lockUntil = 0, lastDrop = 0;
    let L = [], cur = null, debris = [], parts = [], pops = [], banner = null;
    let n = 0, combo = 0, bestCombo = 0, perfects = 0, holdT = 0, stamped = false, seedN = 1, flash = null;
    let cam = { x: 0, y: 300, z: 1 }, E = null;
    const passed = new Set();

    const top = () => L[L.length - 1];
    const topY = () => STAND_H + L.length * LH;
    function camTarget() {
      const vh = ch / S;
      const t = top();
      return { y: Math.max(.38 * vh, topY() + .1 * vh), x: t ? t.x * .6 : 0 };
    }
    function speedFor(k) { return Math.min(430, 185 + 7 * k); }
    function tolFor(sp) { return 5 + sp * .008; }

    function newLayer(i, x, w) { const l = { i, x, w, seed: seedN++, t: 0 }; l.spr = layerSprite(w, FLAVORS[i % FLAVORS.length], l.seed); return l; }
    function reset() {
      L = [newLayer(0, 0, BASE_W)]; debris = []; parts = []; pops = []; banner = null; flash = null;
      n = 0; combo = 0; bestCombo = 0; perfects = 0; holdT = 0; stamped = false; E = null; passed.clear();
      cam = { x: 0, y: 0, z: 1 }; const t = camTarget(); cam.y = t.y;
      spawn();
    }
    function spawn() {
      const t = top(), i = L.length;
      const fromLeft = i % 2 === 1;
      cur = { i, w: t.w, off: fromLeft ? -AMP : AMP, dir: fromLeft ? 1 : -1, x: 0, seed: seedN++ };
      cur.x = t.x + cur.off;
      cur.spr = layerSprite(cur.w, FLAVORS[i % FLAVORS.length], cur.seed);
    }
    reset();

    function startRun() {
      reset(); state = 'play';
      startOv.hidden = true; resultOv.hidden = true; pauseOv.hidden = true; pauseBtn.hidden = false;
      hudCombo.textContent = '–';
      audio.ac(); audio.sfx('open');
      canvas.focus({ preventScroll: true });
      lastDrop = performance.now();
    }
    function pause() {
      if (state !== 'play') return;
      prevState = state; state = 'paused'; pauseOv.hidden = false; pauseBtn.hidden = true;
      resumeBtn.focus({ preventScroll: true });
    }
    function resume() {
      if (state !== 'paused') return;
      state = prevState; pauseOv.hidden = true; pauseBtn.hidden = false;
      lastDrop = performance.now();
      canvas.focus({ preventScroll: true });
    }

    function chime(c) {
      if (!sfxOn()) return;
      const steps = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96, 98];
      const note = steps[Math.min(c - 1, steps.length - 1)], t = audio.now();
      audio.tone(note, t, .7, .08, 'sine'); audio.tone(note + 7, t + .06, .6, .05, 'sine'); audio.tone(note + 12, t + .12, .5, .035, 'sine');
    }
    function burst(x, y, k, cols) {
      const cnt = reduce ? Math.ceil(k / 3) : k;
      for (let i = 0; i < cnt && parts.length < 90; i++) {
        const a = Math.random() * 6.283, v = rand(40, 140);
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + 40, life: .7, max: .7, sp: cols ? pick(cols) : Math.floor(Math.random() * 4), s: rand(.6, 1.2) });
      }
    }

    function drop() {
      if (state !== 'play' || holdT > 0 || !cur) return;
      const now = performance.now();
      if (now - lastDrop < 110) return;
      lastDrop = now;
      const t = top(), sp = speedFor(n), tol = tolFor(sp);
      const dx = cur.x - t.x;
      const y = topY();
      pops.length = 0;
      if (Math.abs(dx) <= tol) {
        combo++; perfects++; bestCombo = Math.max(bestCombo, combo);
        const grow = combo >= 3 && t.w < BASE_W;
        const w = combo >= 3 ? Math.min(BASE_W, t.w + GROW) : t.w;
        L.push(newLayer(cur.i, t.x, w));
        chime(combo);
        flash = { x: t.x, y, w, t: 0 };
        pops.push({ x: t.x, y: y + LH + 22, text: combo >= 2 ? `Perfect! ×${combo}` : 'Perfect!', life: 1, gold: true });
        if (grow) { pops.push({ x: t.x, y: y + LH + 22, dy: 30, text: 'Growing back', life: 1.1, gold: false }); audio.sfx('sparkle'); }
        burst(t.x - w / 2, y + LH / 2, 8); burst(t.x + w / 2, y + LH / 2, 8);
      } else {
        const l0 = Math.max(cur.x - cur.w / 2, t.x - t.w / 2), r0 = Math.min(cur.x + cur.w / 2, t.x + t.w / 2);
        const ow = r0 - l0;
        combo = 0;
        if (ow < 2.5) { // missed completely
          debris.push({ i: cur.i, x: cur.x, y, w: cur.w, vx: cur.dir * 60, vy: 40, rot: 0, vr: cur.dir * -1.8, a: 1, seed: cur.seed, spr: cur.spr });
          cur = null;
          if (sfxOn()) audio.blip({ f0: 300, f1: 90, dur: .35, vol: .14, type: 'triangle' });
          gameOver();
          return;
        }
        L.push(newLayer(cur.i, (l0 + r0) / 2, ow));
        // the slice that hangs over tumbles away
        const right = dx > 0;
        const sw = cur.w - ow, sx = right ? r0 + sw / 2 : l0 - sw / 2;
        const sd = { i: cur.i, x: sx, y, w: sw, vx: (right ? 1 : -1) * rand(40, 90), vy: rand(20, 70), rot: 0, vr: (right ? -1 : 1) * rand(1.4, 3), a: 1, seed: seedN++ };
        sd.spr = layerSprite(sw, FLAVORS[cur.i % FLAVORS.length], sd.seed);
        debris.push(sd); if (debris.length > 14) debris.shift();
        if (sfxOn()) { audio.hiss({ dur: .12, freq: 2600, q: 1.2, vol: .3 }); audio.blip({ f0: 240, f1: 130, dur: .12, vol: .12, type: 'sine' }); }
        const fl = FLAVORS[cur.i % FLAVORS.length];
        for (let i = 0; i < (reduce ? 3 : 8) && parts.length < 90; i++) parts.push({ x: right ? r0 : l0, y: y + rand(4, LH - 4), vx: (right ? 1 : -1) * rand(20, 90), vy: rand(-20, 60), life: .8, max: .8, crumb: fl.body, s: rand(1.5, 3) });
      }
      n = L.length - 1;
      top().t = 0;
      // milestones and the stamp
      for (const m of MILES) if (n === m.n && !passed.has(m.n)) {
        passed.add(m.n);
        banner = { text: m.text, col: milesCol(m), t: 0 };
        if (m.n !== 12) audio.sfx('sparkle');
      }
      if (n >= 12 && !stamped) { stamped = true; if (ctx.stamp()) holdT = 2.4; }
      spawn();
    }

    function gameOver() {
      state = 'ending'; pauseBtn.hidden = true;
      const t = top(), tt = topY();
      const nC = Math.max(1, Math.floor(n / 5));
      const room = Math.max(1, Math.floor(t.w / 11));
      const k = Math.min(nC, room, 12);
      const fr = endTargets();
      // candles go either side of where the cat will sit (or anywhere, if the top is too narrow)
      const half = Math.max(64, 46 / (S * fr.zT)) * .45, edge = t.w / 2 - 5;
      const xs = [];
      if (edge - half > 6) {
        const nl = Math.ceil(k / 2), nr = k - nl;
        for (let i = 0; i < nl; i++) xs.push(t.x - half - (edge - half) * (i + .5) / nl);
        for (let i = 0; i < nr; i++) xs.push(t.x + half + (edge - half) * (i + .5) / nr);
      } else for (let i = 0; i < k; i++) xs.push(t.x - t.w / 2 + t.w * (i + 1) / (k + 1));
      xs.sort((a, b) => a - b);
      E = {
        t: 0, z0: cam.z, y0: cam.y, x0: cam.x, ...fr,
        candles: xs.map((x, i) => ({ x, at: 1.65 + i * .15, on: false })),
        topY: tt, topX: t.x, landed: false, shown: false,
      };
      E.catAt = 1.65 + k * .15 + .2;
      E.endAt = E.catAt + .8 + .65;
    }
    // the zoomed-out "beauty shot" framing for the finished cake
    function endTargets() {
      const tt = topY(), t = top();
      const span = tt + 150 + 60;
      const zT = Math.min(1, (ch / S) * .9 / span);
      const vh = ch / (S * zT);
      return { zT, yT: Math.max(.38 * vh, (tt + 150 - 60) / 2), xT: t.x * .4 };
    }
    // after the results card appears, slide the camera so the cake (and the cat
    // on top) sits in the space the card leaves free
    function frameForCard(instant) {
      if (!E || resultOv.hidden) return;
      const card = resultOv.firstElementChild.getBoundingClientRect(), st = stage.getBoundingClientRect();
      const cl = card.left - st.left, cr = card.right - st.left, ct = card.top - st.top;
      const k = S * cam.z;
      let x1 = cam.x, y1 = cam.y;
      const tsx = cw / 2 + (E.topX - cam.x) * k;
      if (stage.classList.contains('side') && cl > cw * .4) {
        x1 = E.topX - (cl / 2 - cw / 2) / k;               // tower centered in the free space on the left
      } else if (ct > ch * .3 && tsx > cl - 40 && tsx < cr + 40) {
        const want = Math.min(ch * .45, ct * .55);
        y1 = E.topY + 30 - (ch / 2 - want) / k;          // top of the cake above the card
      }
      if (instant) { cam.x = x1; cam.y = y1; E.settle = null; render(); }
      else E.settle = { x0: cam.x, y0: cam.y, x1, y1, t: 0 };
    }
    function finish() {
      if (state === 'over') return;
      state = 'over';
      const res = store.best('bakery', n);
      store.stat('layers', n); store.statMax('bestCake', n); store.stat('perfects', perfects);
      if (n >= 12) ctx.stamp();
      const earned = Math.min(60, n + perfects);
      const titles = [[30, 'Interstellar cake!'], [20, 'Cake in orbit!'], [12, BIRTHDAYISH.has(U.occ) ? 'A birthday-grade cake!' : `A cake fit for ${U.them.name}!`], [10, 'Above the clouds!'], [5, 'Taller than the streetlamp!'], [1, 'A respectable cake.'], [0, 'A very short cake.']];
      rTitle.textContent = titles.find(([m]) => n >= m)[1];
      rScore.textContent = n;
      rUnit.textContent = n === 1 ? 'layer' : 'layers';
      rBadge.hidden = !(res.isNew || (res.first && n > 0));
      rBadge.textContent = res.first ? 'First cake on record' : 'New best';
      const pp = `${perfects} perfect drop${perfects === 1 ? '' : 's'}${bestCombo >= 2 ? ` · best streak ×${bestCombo}` : ''}.`;
      rLine.textContent = n === 0 ? 'The layer slid right off. It happens to the best bakers.' : pp + (rBadge.hidden && res.best != null && res.best > n ? ` Tallest: ${res.best}.` : '');
      rEarn.replaceChildren(...(earned <= 0 ? [h('span', { text: 'No stardust this time. The oven is still warm.' })]
        : [h('b', { text: `+${earned} ✦ stardust` }), h('span', { text: n + perfects > 60 ? 'The most one cake can earn' : `${n} for layers · ${perfects} for perfects` })]));
      hudBest.textContent = String(res.best ?? n);
      paintMeta();
      resultOv.hidden = false;
      frameForCard(false);
      lockUntil = performance.now() + 650;
      if (earned > 0) ctx.timeout(() => ctx.award(earned, rEarn), 300);
      audio.sfx(n >= 12 || res.isNew ? 'win' : 'lose');
      ctx.timeout(() => againBtn.focus({ preventScroll: true }), 660);
    }
    function skipEnding() {
      if (!E) return;
      if (E.t < E.catAt + .8) {
        E.t = E.catAt + .8;
        for (const c of E.candles) c.on = true;
        E.landed = true;
      } else finish();
    }

    /* ================= update ================= */
    function update(dt) {
      clock += dt;
      for (const l of L) l.t += dt;
      if (flash) { flash.t += dt; if (flash.t > .45) flash = null; }
      if (banner) { banner.t += dt; if (banner.t > 2.6) banner = null; }
      for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i]; d.vy -= 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt; d.a -= dt * .55;
        if (d.a <= 0) debris.splice(i, 1);
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= (p.crumb ? 500 : 120) * dt;
      }
      for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i]; p.life -= dt; p.y += 40 * dt; if (p.life <= 0) pops.splice(i, 1); }

      if (state === 'play') {
        if (holdT > 0) holdT -= dt;
        else if (cur) {
          const sp = speedFor(n), t = top();
          cur.off += cur.dir * sp * dt;
          if (cur.off > AMP) { cur.off = AMP - (cur.off - AMP); cur.dir = -1; }
          else if (cur.off < -AMP) { cur.off = -AMP + (-AMP - cur.off); cur.dir = 1; }
          cur.x = t.x + cur.off;
        }
        const tg = camTarget(), k = 1 - Math.exp(-dt * 4);
        cam.y += (tg.y - cam.y) * k; cam.x += (tg.x - cam.x) * k;
      } else if (state === 'ending' && E) {
        E.t += dt;
        const p = smooth(clamp((E.t - .45) / 1.15, 0, 1));
        cam.z = lerp(E.z0, E.zT, p); cam.y = lerp(E.y0, E.yT, p); cam.x = lerp(E.x0, E.xT, p);
        E.candles.forEach((c, i) => {
          if (!c.on && E.t >= c.at) {
            c.on = true;
            if (sfxOn()) audio.blip({ f0: 500 + i * 60, f1: 1100 + i * 90, dur: .1, vol: .1, type: 'sine' });
            burst(c.x, E.topY + 26, 4, [0, 3]);
          }
        });
        if (!E.landed && E.t >= E.catAt + .8) {
          E.landed = true; audio.sfx('pop'); chime(5);
          burst(E.topX, E.topY + 10, 14);
        }
        if (E.t >= E.endAt && !E.shown) { E.shown = true; finish(); }
      }
    }

    /* ================= drawing ================= */
    function render() {
      const Z = S * cam.z * dpr;
      const W = canvas.width, Hh = canvas.height;
      const vh = ch / (S * cam.z), vw = cw / (S * cam.z);
      const yTop = cam.y + vh / 2, yBot = cam.y - vh / 2;
      // sky by altitude
      g.setTransform(1, 0, 0, 1, 0, 0);
      const sg = g.createLinearGradient(0, 0, 0, Hh);
      const stops = [yTop, ...SKY.map(s => s[0]).filter(y => y < yTop && y > yBot), yBot];
      for (const y of stops) { const c = skyAt(y); sg.addColorStop(clamp((yTop - y) / vh, 0, 1), `rgb(${c[0]},${c[1]},${c[2]})`); }
      g.fillStyle = sg; g.fillRect(0, 0, W, Hh);
      // stars (more of them the higher you go), drifting at half speed
      const P = .5, yb0 = Math.floor((cam.y * P - vh / 2) / 120) - 1, yb1 = Math.ceil((cam.y * P + vh / 2) / 120) + 1;
      for (let b = Math.max(0, yb0); b <= yb1; b++) {
        const R = rng(b * 977 + 13), cnt = Math.min(22, 2 + Math.floor(b * .9));
        for (let i = 0; i < cnt; i++) {
          const fx = R(), py = (b + R()) * 120, r = .5 + R() * 1.3, ph = R() * 6.28, sp = .6 + R() * 1.6, gold = R() < .14;
          const wy = py / P; // the altitude it reads as
          const fade = clamp((wy - 160) / 500, 0, 1);
          if (fade <= 0) continue;
          const sy = (Hh / 2) - (py - cam.y * P) * Z;
          if (sy < -4 || sy > Hh + 4) continue;
          const sx = fx * (W + 20) - 10;
          const a = fade * (reduce ? .75 : .35 + .65 * Math.abs(Math.sin(ph + clock * sp)));
          g.fillStyle = `rgba(${gold ? PAL.starGold : PAL.paper},${a})`;
          const rp = r * dpr * Math.max(.7, Math.min(1.2, cam.z * 1.1));
          g.fillRect(sx - rp / 2, sy - rp / 2, rp, rp);
          if (r > 1.45) { g.fillRect(sx - rp * 1.6, sy - .3 * dpr, rp * 3.2, .6 * dpr); g.fillRect(sx - .3 * dpr, sy - rp * 1.6, .6 * dpr, rp * 3.2); }
        }
      }
      // world space from here: (x, -y)
      g.setTransform(Z, 0, 0, Z, W / 2 - cam.x * Z, Hh / 2 + cam.y * Z);
      const xL = cam.x - vw / 2 - 40, xR = cam.x + vw / 2 + 40;
      // a bright star, a satellite, and cloud level
      if (yTop > lineY(30) - 200) {
        const ty = lineY(30) + 70;
        glow(g, STAR_X, -ty, 26, PAL.starGold, .5);
        g.fillStyle = mix(T.gold, '#ffffff', .8); g.beginPath(); g.arc(STAR_X, -ty, 3.2, 0, 6.283); g.fill();
        g.fillRect(STAR_X - 9, -ty - .5, 18, 1); g.fillRect(STAR_X - .5, -ty - 9, 1, 18);
      }
      if (yTop > lineY(20) - 150 && yBot < lineY(20) + 150) {
        const sx = ((clock * 22) % 900) - 450, sy = lineY(20) + 46;
        g.save(); g.translate(sx, -sy); g.rotate(-.2);
        g.fillStyle = '#4f7fd8'; g.fillRect(-22, -4, 14, 8); g.fillRect(8, -4, 14, 8);
        g.fillStyle = '#c9c3d9'; g.fillRect(-8, -5, 16, 10); g.fillRect(-1, -9, 2, 4);
        g.fillStyle = (Math.floor(clock * 2) % 2) ? '#ff5a4e' : 'rgba(255,90,78,.25)'; g.fillRect(-1.5, -11, 3, 3);
        g.restore();
      }
      if (yTop > lineY(10) - 120 && yBot < lineY(10) + 160) {
        const cy = lineY(10);
        const cl = [[-330, cy + 12, 0, 1.1, 6], [180, cy + 40, 1, .9, -5], [-120, cy - 30, 1, .7, 4], [360, cy - 10, 0, .8, 3]];
        for (const [x0, y0, v, sc, dr] of cl) {
          const x = x0 + Math.sin(clock * .05 * dr) * 40;
          g.drawImage(spr.clouds[v], x - 110 * sc, -y0 - 60 * sc, 220 * sc, 90 * sc);
        }
      }
      // horizon, ground, lamp
      if (yBot < 140) {
        const TW = spr.horW;
        for (let x = Math.floor(xL / TW) * TW; x < xR; x += TW) g.drawImage(spr.horizon, x, -spr.horH, TW, spr.horH);
        const gg = g.createLinearGradient(0, 0, 0, 200); gg.addColorStop(0, PAL.ground0); gg.addColorStop(1, PAL.ground1);
        g.fillStyle = gg; g.fillRect(xL, 0, xR - xL, Math.max(200, -yBot + 10));
        g.fillStyle = `rgba(${PAL.rose},.22)`; g.fillRect(xL, 0, xR - xL, 1.2);
        g.save(); g.translate(LAMP_X, 4); g.scale(1, .14);
        const pg = g.createRadialGradient(0, 0, 0, 0, 0, 90); pg.addColorStop(0, 'rgba(255,214,150,.4)'); pg.addColorStop(1, 'rgba(255,214,150,0)');
        g.fillStyle = pg; g.beginPath(); g.arc(0, 0, 90, 0, 6.283); g.fill(); g.restore();
        g.drawImage(spr.lamp, LAMP_X - 90, -250, 180, 250);
      }
      // milestone lines
      const lw = 1.2 / (S * cam.z);
      for (const m of MILES) {
        const y = lineY(m.n); if (y < yBot - 10 || y > yTop + 10) continue;
        if (ch / 2 - (y - cam.y) * S * cam.z < 56) continue;   // not through the HUD
        const done = passed.has(m.n) || n >= m.n;
        const mc = milesCol(m);
        g.fillStyle = mc ? `rgba(${rgbOf(mc)},${done ? .9 : .55})` : `rgba(${PAL.paper},${done ? .55 : .28})`;
        const dash = 7 / (S * cam.z) * 1.5;
        for (let x = Math.floor(xL / (dash * 2)) * dash * 2; x < xR; x += dash * 2) g.fillRect(x, -y - lw / 2, dash, lw);
      }
      // the stand and the cake
      g.drawImage(spr.stand, -160, -60, 320, 60);
      const pad = 2;
      for (let i = 0; i < L.length; i++) {
        const l = L[i], y = STAND_H + i * LH;
        if (y > yTop + 10 || y + LH < yBot - 10) continue;
        let sq = 1;
        if (i === L.length - 1 && i > 0 && l.t < .18 && !reduce) sq = 1 - .1 * Math.sin(l.t / .18 * Math.PI);
        const hh = (LH + pad * 2) * sq;
        g.drawImage(l.spr, l.x - l.w / 2 - pad, -y - hh + pad * sq, l.w + pad * 2, hh);
      }
      if (flash) {
        const p = flash.t / .45, e = 4 + p * 12;
        g.strokeStyle = `rgba(${PAL.flash},${(1 - p) * .9})`; g.lineWidth = (2.5 * (1 - p) + .5) / (S * cam.z) * 1.4;
        g.beginPath(); rr(g, flash.x - flash.w / 2 - e, -(flash.y + LH) - e * .6, flash.w + e * 2, LH + e * 1.2, 6); g.stroke();
      }
      if (cur && state !== 'ending' && state !== 'over') {
        const y = topY();
        g.drawImage(cur.spr, cur.x - cur.w / 2 - pad, -(y + LH) - pad, cur.w + pad * 2, LH + pad * 2);
        if (state === 'play' && holdT <= 0) { // a faint guide shadow on the tower
          g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(cur.x - cur.w / 2, -y, cur.w, 1.5 / (S * cam.z));
        }
      }
      for (const d of debris) {
        g.save(); g.globalAlpha = clamp(d.a, 0, 1); g.translate(d.x, -(d.y + LH / 2)); g.rotate(-d.rot);
        g.drawImage(d.spr, -d.w / 2 - pad, -LH / 2 - pad, d.w + pad * 2, LH + pad * 2); g.restore();
      }
      g.globalAlpha = 1;
      // ending: candles + the cat hopping on top
      if (E) {
        const mz = Math.max(1, 13 / (22 * S * cam.z));
        for (const c of E.candles) {
          if (!c.on) continue;
          const age = E.t - c.at, sc = mz * (age < .2 ? smooth(clamp(age / .2, 0, 1)) * 1.15 : 1);
          const by = E.topY - 2, chh = 20 * sc, cwd = 4.6 * sc;
          g.fillStyle = '#fff3f7'; g.fillRect(c.x - cwd / 2, -(by + chh), cwd, chh);
          g.fillStyle = T.rose; for (let s = 2; s < chh - 2; s += 5 * sc) g.fillRect(c.x - cwd / 2, -(by + s + 2 * sc), cwd, 2 * sc);
          const fy = by + chh + 6 * sc, fl = reduce ? 1 : 1 + Math.sin(clock * 18 + c.x) * .12;
          glow(g, c.x, -fy, 13 * sc, '255,214,120', .55);
          g.fillStyle = '#ffd36b'; g.beginPath();
          g.moveTo(c.x, -fy - 6 * sc * fl); g.quadraticCurveTo(c.x + 3.4 * sc, -fy + 1 * sc, c.x, -fy + 3 * sc); g.quadraticCurveTo(c.x - 3.4 * sc, -fy + 1 * sc, c.x, -fy - 6 * sc * fl); g.fill();
          g.fillStyle = '#fff6dc'; g.beginPath(); g.arc(c.x, -fy + .6 * sc, 1.3 * sc, 0, 6.283); g.fill();
        }
        if (E.t >= E.catAt) {
          const u = clamp((E.t - E.catAt) / .8, 0, 1);
          const cwU = Math.max(64, 46 / (S * cam.z)), chU = cwU * ASP;
          const feet = cwU * .98;              // head bottom sits on the cake
          const x0 = cam.x + vw / 2 + cwU, y0 = E.topY + vh * .25;
          const x = lerp(x0, E.topX, smooth(u)), base = lerp(y0, E.topY, u) + Math.sin(u * Math.PI) * Math.max(80, vh * .12);
          let sx = 1, sy = 1;
          if (u >= 1) { const a = E.t - E.catAt - .8; if (a < .25 && !reduce) { const q = Math.sin(a / .25 * Math.PI) * .12; sx = 1 + q; sy = 1 - q; } }
          g.save(); g.translate(x, -base); g.scale(sx, sy); g.rotate(u < 1 ? (1 - u) * -.5 : 0);
          g.drawImage(spr.cat, -cwU / 2, -feet, cwU, chU);
          cat.drawProp(g, -cwU / 2, -feet, cwU, clock * (u < 1 ? 40 : 10), design);
          g.restore();
        }
      }
      // particles
      for (const p of parts) {
        g.globalAlpha = clamp(p.life / p.max, 0, 1);
        if (p.crumb) { g.fillStyle = p.crumb; g.fillRect(p.x - p.s / 2, -p.y - p.s / 2, p.s, p.s); }
        else { const s = 13 * p.s; g.drawImage(spr.sparks[p.sp], p.x - s / 2, -p.y - s / 2, s, s); }
      }
      g.globalAlpha = 1;

      // ---- screen space: labels, pops, banner ----
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const toSX = x => cw / 2 + (x - cam.x) * S * cam.z, toSY = y => ch / 2 - (y - cam.y) * S * cam.z;
      g.textBaseline = 'alphabetic'; g.textAlign = 'left';
      g.font = '600 10.5px "JetBrains Mono", ui-monospace, monospace';
      const t0 = top(), towerL = toSX((t0 ? t0.x : 0) - BASE_W / 2) - 14;
      for (const m of MILES) {
        const y = toSY(lineY(m.n)); if (y < 66 || y > ch + 10) continue; // stay clear of the HUD
        const done = passed.has(m.n) || n >= m.n;
        const lead = /^\d/.test(m.text) ? '' : `${m.n} · `;
        let txt = lead + m.text.toUpperCase();
        if (12 + g.measureText(txt).width > Math.max(towerL, cw * .42)) txt = `${m.n} · ${m.short.toUpperCase()}`;
        if (done) txt = '✓ ' + txt;
        g.fillStyle = `rgba(${PAL.night},.45)`; g.fillText(txt, 13, y - 6);
        g.fillStyle = milesCol(m) || `rgba(${PAL.paper},${done ? .95 : .6})`; g.fillText(txt, 12, y - 7);
      }
      if (pops.length) {
        g.textAlign = 'center';
        for (const p of pops) {
          g.globalAlpha = clamp(p.life * 2.2, 0, 1);
          g.font = p.gold ? '400 26px Italiana, Georgia, serif' : '600 11px "JetBrains Mono", ui-monospace, monospace';
          const x = toSX(p.x), y = toSY(p.y) - (p.dy || 0);
          const txt = p.gold ? p.text : p.text.toUpperCase();
          g.fillStyle = `rgba(${PAL.night},.6)`; g.fillText(txt, x + 1, y + 1.5);
          g.fillStyle = p.gold ? T.gold : T.hud; g.fillText(txt, x, y);
        }
        g.globalAlpha = 1;
      }
      if (banner) {
        const a = Math.min(1, banner.t * 3, (2.6 - banner.t) * 2);
        const size = clamp(Math.min(cw / 16, ch / 12), 20, 40);
        g.globalAlpha = Math.max(0, a); g.textAlign = 'center';
        g.font = `400 ${size}px Italiana, Georgia, serif`;
        const bw = Math.min(cw - 24, g.measureText(banner.text).width + 40), by = ch * .2;
        g.fillStyle = `rgba(${PAL.night},.55)`; g.beginPath(); rr(g, cw / 2 - bw / 2, by - size * 1.05, bw, size * 1.6, size * .8); g.fill();
        g.fillStyle = banner.col || T.paper;
        let txt = banner.text;
        if (g.measureText(txt).width > cw - 44) { g.font = `400 ${size * .72}px Italiana, Georgia, serif`; }
        g.fillText(txt, cw / 2, by);
        g.globalAlpha = 1;
      }
      if (state === 'play' && n === 0 && L.length === 1 && clock % 1.2 < .9 && holdT <= 0) {
        g.textAlign = 'center'; g.font = '600 10.5px "JetBrains Mono", ui-monospace, monospace';
        g.fillStyle = `rgba(${PAL.paper},.8)`;
        g.fillText('TAP WHEN THE LAYER LINES UP', cw / 2, toSY(topY() + LH) - 16);
      }
    }

    /* ================= loop ================= */
    let shownN = -1, shownC = -1, bestShown = store.getBest('bakery') ?? 0;
    ctx.raf((t, dtMs) => {
      if (state === 'over' && E && ((E.settle && E.settle.t < 1) || debris.length || parts.length)) {
        if (E.settle && E.settle.t < 1) {
          E.settle.t = Math.min(1, E.settle.t + dtMs / 600);
          cam.y = lerp(E.settle.y0, E.settle.y1, smooth(E.settle.t)); cam.x = lerp(E.settle.x0, E.settle.x1, smooth(E.settle.t));
        }
        update(dtMs / 1000); render(); return; // let the last crumbs finish falling, then rest
      }
      if (state === 'paused' || state === 'over' || state === 'title') return;
      if (state === 'play' && document.body.classList.contains('lock-scroll')) { pause(); return; }
      update(dtMs / 1000);
      render();
      if (n !== shownN) { shownN = n; hudN.textContent = n; }
      if (n > bestShown) { bestShown = n; hudBest.textContent = n; }
      if (combo !== shownC) { shownC = combo; hudCombo.textContent = combo ? '×' + combo : '–'; }
    });

    /* ================= input ================= */
    function primary() {
      if (state === 'play') drop();
      else if (state === 'ending') skipEnding();
    }
    ctx.on(canvas, 'pointerdown', e => {
      if (e.button != null && e.button > 0) return;
      e.preventDefault(); primary();
    }, { passive: false });
    ctx.on(canvas, 'contextmenu', e => e.preventDefault());
    const isCtl = el => el && el !== canvas && el.closest && el.closest('button, a, input, textarea, select');
    ctx.on(window, 'keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.body.classList.contains('lock-scroll')) return;
      const key = e.key;
      const prim = key === ' ' || key === 'Spacebar' || key === 'Enter' || key === 'ArrowDown' || key === 's' || key === 'S';
      if (state === 'play' || state === 'ending') {
        if (prim) { e.preventDefault(); if (!e.repeat) primary(); }
        else if (state === 'play' && (key === 'Escape' || key === 'p' || key === 'P')) { e.preventDefault(); pause(); }
        else if (key === 'ArrowUp') e.preventDefault();
        return;
      }
      if (state === 'paused') {
        if (key === 'Escape' || key === 'p' || key === 'P') { e.preventDefault(); resume(); }
        else if (prim && !isCtl(e.target)) { e.preventDefault(); resume(); }
        return;
      }
      if ((state === 'title' || state === 'over') && prim && !isCtl(e.target) && !e.repeat) {
        if (state === 'over' && performance.now() < lockUntil) return;
        e.preventDefault(); startRun();
      }
    });
    startBtn.onclick = startRun;
    againBtn.onclick = () => { if (performance.now() < lockUntil) return; startRun(); };
    resumeBtn.onclick = resume;
    pauseBtn.onclick = pause;
    ctx.on(document, 'visibilitychange', () => { if (document.hidden) pause(); });
    ctx.on(window, 'blur', pause);
    let rt = 0;
    let rt2 = 0;
    const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { if (ctx.alive()) layout(); }, 120); };
    ctx.on(window, 'resize', onResize);
    ctx.on(window, 'orientationchange', () => { onResize(); clearTimeout(rt2); rt2 = setTimeout(() => { if (ctx.alive()) layout(); }, 350); });
    ctx.cleanup(() => { clearTimeout(rt); clearTimeout(rt2); });

    layout();
    cat.catImage(design, 256).then(img => { if (!ctx.alive() || !img) return; catImg = img; buildCat(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (ctx.alive()) layout(); });

    // tiny read-only hook for automated tests
    const hook = {
      get s() {
        const t = top();
        return { state, n, combo, perfects, hold: holdT, slider: cur ? { x: cur.x, w: cur.w } : null, top: t ? { x: t.x, w: t.w } : null, tol: tolFor(speedFor(n)), end: E ? { t: E.t, at: E.endAt } : null };
      },
    };
    window.__bakery = hook;
    ctx.cleanup(() => { if (window.__bakery === hook) delete window.__bakery; });
  },
};
