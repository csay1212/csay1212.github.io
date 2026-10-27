// Propeller Flight Academy: one button, one propeller hat. Fly through the
// lamp-post gates on a twilight hill, collect stardust, try not to bonk.
import { h, icon, clamp, lerp, rand, pick } from '../core/dom.js';

const H = 640;              // logical world height (units). Width follows the screen.
const GROUND = 580;         // top of the sidewalk
const STEP = 1 / 120;       // fixed physics step (seconds)
const G = 1500, FLAP = -470, VMAX = 640;
const CAT = 56;             // pilot drawn width (units)
const HIT_R = 16.5;         // pilot hitbox radius (a little forgiving)
const HEAD = 0.67;          // hitbox center, as a fraction of CAT below the image top
const NUM = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
  'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty', 'Twenty-one', 'Twenty-two', 'Twenty-three', 'Twenty-four', 'Twenty-five', 'Twenty-six',
  'Twenty-seven', 'Twenty-eight', 'Twenty-nine', 'Thirty', 'Thirty-one'];
// milestone toasts, filled with the playing universe's people and date
function toastsFor(U) {
  const me = U.me.name;
  const t = {
    5: U.gentle ? 'Five gates! The propeller works.' : `Five gates! The propeller works. ${me} will be thrilled.`,
    12: 'Twelve gates. That’s a certified pilot.',
    20: 'Twenty gates. Writing this down for the end credits.',
    30: 'Thirty! The lamp posts are starting a fan club.',
    50: U.gentle ? 'Fifty. Remarkable flying.' : `Fifty?! Somebody tell ${me}.`,
  };
  // a gate for the day that matters, when the date is part of the occasion
  const d = U.date && U.date.d, dated = ['birthday', 'belated', 'anniversary', 'reunion'].includes(U.occ);
  if (dated && d >= 6 && d <= 31 && !t[d]) t[d] = `${NUM[d]}! One for ${U.date.long}.`;
  return t;
}
// theme helpers: the universe's palette, mixed for scenery
const hexRgb = hex => { const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim()); if (!m) return [128, 128, 128]; const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const mix = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const rgbOf = hex => hexRgb(hex).join(',');
const TWILIGHT = { night: '#0c0b24', night2: '#120f33', dusk: '#2a1d55', horizon: '#4a2c6e', rose: '#ef7fb0', gold: '#f5cc4a', hud: '#86e6d8', lilac: '#b59cff', peach: '#ff9a7a', sky: '#9fd3ff', paper: '#f6eee3', muted: '#b8b0d6' };
// what hangs from the sky: hitbox half-width and how far above the anchor the hitbox ends
const TOPS = {
  lights: { w: 120, ax: 60, hw: 40, inset: 2 },
  moon: { w: 170, ax: 85, hw: 30, inset: 2 },
  cloud: { w: 170, ax: 85, hw: 54, inset: 9 },
};
const TOP_KEYS = Object.keys(TOPS);
const ANCHOR = 630;         // y of a top sprite's bottom edge (sprite is 640 tall)

const CAUSE = {
  lamp: ['Bonk!', 'Lamp post: 1. Pilot: 0.'],
  lights: ['Tangled!', 'Caught in the fairy lights. Festive, though.'],
  moon: ['Moonstruck!', 'The moon was closer than it looked.'],
  cloud: ['Fogged!', 'That cloud was not as fluffy as advertised.'],
  ground: ['Touchdown!', 'Unscheduled. The sidewalk came out of nowhere.'],
};

// the device's safe-area insets (home indicator, landscape notch), in px
function insets() {
  const p = document.createElement('div');
  p.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:0 var(--safe-r) var(--safe-b) var(--safe-l)';
  document.body.append(p);
  const cs = getComputedStyle(p), v = { l: parseFloat(cs.paddingLeft) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0 };
  p.remove();
  return v;
}
function circRect(cx, cy, r, x0, y0, x1, y1) {
  const nx = clamp(cx, x0, x1), ny = clamp(cy, y0, y1);
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}
function star4(c, x, y, r, ri) {
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 4, rr = i % 2 ? ri : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
}
function star5(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
}
function glow(c, x, y, r, rgb, a) {
  const gr = c.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2);
}
// seeded random so the scenery tiles look the same every time
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

export default {
  css: 'flight',
  mount(ctx) {
    const { store, audio, cat, U } = ctx;
    const reduce = ctx.reduce;
    const sfxOn = () => audio.sfxOn();
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    ctx.root.classList.add('full');
    ctx.pauseSky();
    const TOASTS = toastsFor(U);

    const design = cat.getDesign();
    const ASP = cat.catAspect(design);
    const pilotName = design.name || U.them.name;
    const canChangePilot = (ctx.WORLDS || []).some(w => w.id === 'hats');
    let catImg = null; // rasterized pilot; arrives a moment after mount

    // the scenery's palette, from the playing universe's theme
    const T = { ...TWILIGHT, ...(U.theme || {}) };
    const D = mix(T.night2, T.dusk, .1);    // lamp-post iron
    const PAL = {
      sky: [[0, mix(T.night2, T.dusk, .35)], [.32, mix(T.dusk, T.horizon, .35)], [.56, mix(T.horizon, T.rose, .25)],
        [.72, mix(T.horizon, T.rose, .66)], [.84, mix(T.rose, T.peach, .45)], [1, mix(mix(T.peach, T.gold, .2), T.paper, .15)]],
      far: T.horizon, plain0: mix(T.dusk, T.horizon, .2), plain1: mix(T.night2, T.dusk, .5),
      mid: mix(T.night2, T.dusk, .45), tree: mix(T.night2, T.dusk, .15),
      walk: [mix(T.horizon, T.lilac, .15), T.dusk, mix(T.night2, T.dusk, .35), mix(T.dusk, T.horizon, .5), T.night2],
      cloud: [mix(T.horizon, T.lilac, .05), mix(T.horizon, mix(T.rose, T.lilac, .5), .45), mix(T.rose, T.paper, .3)],
      rose: rgbOf(T.rose), gold: rgbOf(T.gold), paper: rgbOf(T.paper), night: rgbOf(T.night), hud: rgbOf(T.hud), lilac: rgbOf(T.lilac),
      starGold: rgbOf(mix(T.gold, T.paper, .4)), cream: rgbOf(mix(T.paper, T.gold, .25)), wire: rgbOf(D),
    };

    /* ================= DOM ================= */
    const canvas = h('canvas', { class: 'fl-canvas', tabindex: '-1', role: 'img', 'aria-label': 'Flight Academy. Tap, click or press Space to flap.' });
    const g = canvas.getContext('2d');
    const hudGates = h('b', { text: '0' }), hudDust = h('b', { text: '0' });
    const hudBest = h('b', { text: String(store.getBest('flight') ?? 0) });
    const pauseBtn = h('button', { class: 'icon-btn fl-pause', type: 'button', 'aria-label': 'Pause', hidden: true }, icon('pause'));
    const hud = h('div', { class: 'ghud fl-hud' },
      h('div', { class: 'fl-hg' },
        h('div', { class: 'fl-st' }, h('span', { text: 'Gates' }), hudGates),
        h('div', { class: 'fl-st' }, h('span', { text: '✦ Stardust' }), hudDust)),
      h('div', { class: 'fl-hg' },
        h('div', { class: 'fl-st r' }, h('span', { text: 'Best' }), hudBest),
        pauseBtn));

    // start card
    const pilotBox = h('div', { class: 'fl-pilot-cat', html: cat.catSVG(design, { spin: true }) });
    const metaLine = h('div', { class: 'fl-meta' });
    const startBtn = h('button', { class: 'btn solid big fl-go', type: 'button', text: 'Take off' });
    const startOv = h('div', { class: 'overlay fl-ov' },
      h('div', { class: 'ocard fl-card fl-start' },
        h('p', { class: 'kicker fl-k', text: 'Flight school · lesson one' }),
        h('h3', { class: 'fl-t', text: ctx.world.name || 'Propeller Flight Academy' }),
        h('div', { class: 'fl-pilot' }, pilotBox,
          h('div', { class: 'fl-pilot-txt' },
            h('span', { class: 'kicker muted', text: 'Your pilot' }),
            h('b', { class: pilotName.length > 11 ? 'long' : null, text: pilotName }),
            canChangePilot ? h('a', { href: '#/w/hats', text: 'Change pilot →' }) : null)),
        h('div', { class: 'fl-how', text: 'Tap to give the propeller a boost. Fly through the gap between each lamp post and whatever is dangling above it. Grab the stardust on the way.' }),
        finePointer
          ? h('div', { class: 'keys fl-keys' }, h('span', { text: 'Click or' }), h('kbd', { text: 'Space' }), h('kbd', { text: '↑' }), h('span', { text: 'to flap ·' }), h('kbd', { text: 'Esc' }), h('span', { text: 'pause' }))
          : null,
        metaLine,
        startBtn));

    // results card
    const rTitle = h('h3', { class: 'fl-t' }), rScore = h('div', { class: 'big-score' }), rUnit = h('div', { class: 'fl-unit' });
    const rBadge = h('span', { class: 'newbest', text: 'New best' }), rLine = h('div', { class: 'fl-line' }), rEarn = h('div', { class: 'fl-earn' });
    const againBtn = h('button', { class: 'btn solid', type: 'button', text: 'Fly again' });
    const resultOv = h('div', { class: 'overlay fl-ov', hidden: true },
      h('div', { class: 'ocard fl-card fl-res' },
        h('p', { class: 'kicker rose fl-k', text: 'Flight log' }),
        rTitle,
        h('div', { class: 'fl-score' }, rScore, rUnit),
        h('div', { class: 'fl-rtxt' }, rBadge, rLine, rEarn),
        h('div', { class: 'row fl-btns' }, againBtn, h('a', { class: 'btn ghost', href: '#/map', text: 'Back to map' }))));

    // pause card
    const resumeBtn = h('button', { class: 'btn solid', type: 'button', text: 'Resume' });
    const pauseOv = h('div', { class: 'overlay fl-ov', hidden: true },
      h('div', { class: 'ocard fl-card' },
        h('p', { class: 'kicker fl-k', text: 'Holding pattern' }),
        h('h3', { class: 'fl-t', text: 'Paused' }),
        h('div', { class: 'fl-txt', text: 'The propeller is idling. Take your time.' }),
        h('div', { class: 'row fl-btns' }, resumeBtn, h('a', { class: 'btn ghost', href: '#/map', text: 'Back to map' }))));

    const stage = h('div', { class: 'stage-wrap fl-stage' }, canvas, hud, startOv, resultOv, pauseOv);
    const wrap = h('div', { class: 'fl-wrap' }, stage);
    ctx.root.append(wrap);
    ctx.peek(pilotBox, 'flight-hide', { left: '-15px', top: '18%', rotate: -16, size: 26 });

    const paintMeta = () => {
      const best = store.getBest('flight');
      const goal = store.hasStamp('flight') ? '✓ Stamp collected' : 'Stamp goal: 12 gates';
      metaLine.textContent = `${goal} · ${best == null ? 'No flights logged yet' : 'Best: ' + best + (best === 1 ? ' gate' : ' gates')}`;
    };
    paintMeta();

    /* ================= sizing + sprites ================= */
    let W = 400, k = 1, catX = 100, clock = 0;
    let spr = {}, skyGrad = null, stars = [], clouds = [];

    function mk(w, hh) {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.ceil(w * k)); c.height = Math.max(1, Math.ceil(hh * k));
      const x = c.getContext('2d'); x.scale(k, k);
      return [c, x];
    }

    function buildCat() {
      const [c, x] = mk(CAT, CAT * ASP);
      if (catImg) x.drawImage(catImg, 0, 0, CAT, CAT * ASP);
      spr.cat = c;
    }
    function buildSprites() {
      spr = {};
      buildCat();
      // ---- lamp head (anchor: finial tip at (90, 56)) ----
      {
        const [c, x] = mk(180, 200); const cx = 90, t = 56;
        const gr = x.createRadialGradient(cx, t + 44, 3, cx, t + 44, 88);
        gr.addColorStop(0, 'rgba(255,228,160,.6)'); gr.addColorStop(.3, 'rgba(255,196,120,.22)'); gr.addColorStop(1, 'rgba(255,170,110,0)');
        x.fillStyle = gr; x.fillRect(0, 0, 180, 200);
        x.fillStyle = D; x.strokeStyle = D;
        x.beginPath(); x.moveTo(cx, t); x.lineTo(cx + 2, t + 7); x.lineTo(cx - 2, t + 7); x.fill();
        x.beginPath(); x.arc(cx, t + 9, 3.2, 0, 6.283); x.fill();
        x.beginPath(); x.moveTo(cx - 21, t + 27); x.quadraticCurveTo(cx - 15, t + 12, cx, t + 11); x.quadraticCurveTo(cx + 15, t + 12, cx + 21, t + 27); x.closePath(); x.fill();
        x.fillRect(cx - 23, t + 25, 46, 4);
        const gl = x.createLinearGradient(cx - 17, 0, cx + 17, 0);
        gl.addColorStop(0, '#ee9c48'); gl.addColorStop(.5, '#fff6d2'); gl.addColorStop(1, '#ee9c48');
        x.fillStyle = gl;
        x.beginPath(); x.moveTo(cx - 17, t + 29); x.lineTo(cx + 17, t + 29); x.lineTo(cx + 11, t + 60); x.lineTo(cx - 11, t + 60); x.closePath(); x.fill();
        x.lineWidth = 2; x.beginPath(); x.moveTo(cx, t + 29); x.lineTo(cx, t + 60); x.stroke();
        x.lineWidth = 2.6; x.beginPath(); x.moveTo(cx - 17, t + 29); x.lineTo(cx - 11, t + 60); x.lineTo(cx + 11, t + 60); x.lineTo(cx + 17, t + 29); x.stroke();
        x.fillStyle = D;
        x.beginPath(); x.moveTo(cx - 13, t + 59); x.lineTo(cx + 13, t + 59); x.lineTo(cx + 6, t + 67); x.lineTo(cx - 6, t + 67); x.fill();
        x.fillRect(cx - 4, t + 66, 8, 7); x.fillRect(cx - 9, t + 72, 18, 4); x.fillRect(cx - 6, t + 76, 12, 5);
        // little iron curls under the lantern
        x.lineWidth = 2.2; x.lineCap = 'round';
        for (const s of [-1, 1]) {
          x.beginPath(); x.moveTo(cx + s * 4, t + 74); x.quadraticCurveTo(cx + s * 20, t + 74, cx + s * 18, t + 62);
          x.arc(cx + s * 15, t + 62, 3, 0, s > 0 ? Math.PI : -Math.PI, s < 0); x.stroke();
        }
        // warm rim light on the iron
        x.fillStyle = 'rgba(255,214,150,.45)'; x.fillRect(cx - 23, t + 25, 46, 1.2);
        spr.head = c;
      }
      // ---- lamp base + pool of light (anchor: (80, 46) on the ground line) ----
      {
        const [c, x] = mk(160, 60); const cx = 80, gy = 46;
        x.save(); x.translate(cx, gy + 7); x.scale(1, .16);
        const pg = x.createRadialGradient(0, 0, 0, 0, 0, 76);
        pg.addColorStop(0, 'rgba(255,214,150,.38)'); pg.addColorStop(1, 'rgba(255,214,150,0)');
        x.fillStyle = pg; x.beginPath(); x.arc(0, 0, 76, 0, 6.283); x.fill(); x.restore();
        x.fillStyle = D;
        x.beginPath(); x.moveTo(cx - 9, gy - 34); x.lineTo(cx + 9, gy - 34); x.lineTo(cx + 13, gy - 13); x.lineTo(cx + 18, gy - 7);
        x.lineTo(cx + 18, gy + 3); x.lineTo(cx - 18, gy + 3); x.lineTo(cx - 18, gy - 7); x.lineTo(cx - 13, gy - 13); x.closePath(); x.fill();
        x.fillRect(cx - 11, gy - 38, 22, 5);
        x.fillStyle = 'rgba(255,200,140,.22)'; x.fillRect(cx - 18, gy - 7, 2, 10); x.fillRect(cx - 11, gy - 38, 22, 1);
        spr.base = c;
      }
      // ---- fairy-light curtain ----
      {
        const [c, x] = mk(120, 640);
        const xs = [24, 42, 60, 78, 96], ends = [612, 622, 630, 622, 612];
        const cols = [PAL.cream, PAL.gold, PAL.rose, rgbOf(T.peach), PAL.lilac];
        xs.forEach((sx, i) => {
          x.strokeStyle = `rgba(${PAL.wire},.95)`; x.lineWidth = 1.3; x.beginPath();
          for (let y = 0; y <= ends[i]; y += 6) { const wx = sx + Math.sin(y * .05 + i * 1.7) * 2.2; y ? x.lineTo(wx, y) : x.moveTo(wx, y); }
          x.stroke();
          for (let y = ends[i] - (i === 2 ? 14 : 3), j = 0; y > 0; y -= 22, j++) {
            const wx = sx + Math.sin(y * .05 + i * 1.7) * 2.2, col = cols[(i + j) % cols.length];
            glow(x, wx, y, 11, col, .5);
            x.fillStyle = D; x.fillRect(wx - 1.6, y - 6, 3.2, 3);
            x.fillStyle = `rgb(${col})`; x.beginPath(); x.ellipse(wx, y, 3.2, 4.2, 0, 0, 6.283); x.fill();
            x.fillStyle = 'rgba(255,255,255,.75)'; x.beginPath(); x.arc(wx - 1, y - 1.4, 1.1, 0, 6.283); x.fill();
          }
        });
        glow(x, 60, 622, 16, PAL.gold, .6);
        star5(x, 60, 622, 8); x.fillStyle = T.gold; x.fill(); x.strokeStyle = D; x.lineWidth = 1.2; x.stroke();
        spr.lights = c;
      }
      // ---- dangling crescent moon on a mobile of stars ----
      {
        const [c, x] = mk(170, 640); const cx = 85, my = 596, r = 33;
        x.strokeStyle = `rgba(${PAL.paper},.32)`; x.lineWidth = 1;
        for (const sx of [44, 126]) { x.beginPath(); x.moveTo(sx, 0); x.lineTo(sx, 600); x.stroke(); }
        x.beginPath(); x.moveTo(cx - 4, 0); x.lineTo(cx - 4, my - r + 6); x.stroke();
        for (const [sx, off] of [[44, 0], [126, 60], [cx - 4, 30]]) {
          for (let y = (sx === cx - 4 ? 520 : 590) - off; y > 0; y -= 120) {
            glow(x, sx, y, 13, PAL.starGold, .45);
            star5(x, sx, y, sx === cx - 4 ? 6 : 8); x.fillStyle = mix(T.gold, T.paper, .35); x.fill(); x.strokeStyle = D; x.lineWidth = 1.2; x.stroke();
          }
        }
        glow(x, cx, my, 76, PAL.starGold, .32);
        const [mc, mx] = mk(80, 80);
        mx.fillStyle = mix(T.gold, T.paper, .6); mx.beginPath(); mx.arc(40, 40, r, 0, 6.283); mx.fill();
        mx.globalCompositeOperation = 'source-atop';
        const mg = mx.createLinearGradient(10, 70, 70, 10); mg.addColorStop(0, T.gold); mg.addColorStop(1, mix(T.gold, '#ffffff', .8));
        mx.fillStyle = mg; mx.fillRect(0, 0, 80, 80);
        mx.globalCompositeOperation = 'destination-out';
        mx.beginPath(); mx.arc(53, 30, 28, 0, 6.283); mx.fill();
        mx.globalCompositeOperation = 'source-over';
        // a sleepy face
        mx.strokeStyle = '#6b4a2a'; mx.lineWidth = 1.6; mx.lineCap = 'round';
        mx.beginPath(); mx.arc(22, 46, 3.4, .2, Math.PI - .2); mx.stroke();
        mx.fillStyle = `rgba(${PAL.rose},.55)`; mx.beginPath(); mx.ellipse(22, 55, 3.6, 2, 0, 0, 6.283); mx.fill();
        x.drawImage(mc, cx - 40, my - 40, 80, 80);
        spr.moon = c;
      }
      // ---- cloud bank ----
      {
        const [c, x] = mk(170, 640); const R = rng(7);
        const p = new Path2D();
        const puffs = [[85, 604, 26], [56, 597, 25], [114, 597, 25], [36, 574, 22], [134, 574, 22], [70, 572, 30], [102, 567, 30]];
        for (let y = 540; y > -40; y -= 38) for (const px of [40, 85, 130]) puffs.push([px + (R() - .5) * 14, y + (R() - .5) * 14, 30 + R() * 8]);
        for (const [px, py, pr] of puffs) { p.moveTo(px + pr, py); p.arc(px, py, pr, 0, 6.283); }
        const cg = x.createLinearGradient(0, 300, 0, 632);
        cg.addColorStop(0, PAL.cloud[0]); cg.addColorStop(.75, PAL.cloud[1]); cg.addColorStop(1, PAL.cloud[2]);
        x.fillStyle = cg; x.fill(p);
        x.save(); x.clip(p);
        const lg = x.createLinearGradient(0, 590, 0, 632), lit = rgbOf(mix(T.rose, T.paper, .5)); lg.addColorStop(0, `rgba(${lit},0)`); lg.addColorStop(1, `rgba(${lit},.75)`);
        x.fillStyle = lg; x.fillRect(0, 590, 170, 50);
        x.restore();
        spr.cloud = c;
      }
      // ---- background clouds ----
      spr.bgClouds = [0, 1].map(v => {
        const [c, x] = mk(220, 90); const R = rng(11 + v * 5);
        const p = new Path2D();
        const n = 6 + v * 2;
        for (let i = 0; i < n; i++) {
          const px = 30 + i * (160 / (n - 1)), py = 52 - Math.sin(i / (n - 1) * Math.PI) * (16 + R() * 10), pr = 16 + Math.sin(i / (n - 1) * Math.PI) * 14 + R() * 6;
          p.moveTo(px + pr, py); p.arc(px, py, pr, 0, 6.283);
        }
        p.rect(30, 52, 160, 18);
        const cg = x.createLinearGradient(0, 20, 0, 72); cg.addColorStop(0, `rgba(${rgbOf(mix(T.horizon, T.lilac, .3))},.4)`); cg.addColorStop(1, `rgba(${rgbOf(mix(T.rose, T.paper, .2))},.5)`);
        x.fillStyle = cg; x.fill(p);
        return c;
      });
      // ---- far layer: hazy mountains + city lights ----
      {
        const TW = 1200, top = 420; const [c, x] = mk(TW, 160); const R = rng(3);
        x.translate(0, -top);
        const hill = xx => 452 + 14 * Math.sin(xx / TW * 6.283 * 3 + 1) + 8 * Math.sin(xx / TW * 6.283 * 7) + 5 * Math.sin(xx / TW * 6.283 * 13 + 2);
        x.beginPath(); x.moveTo(0, 580);
        for (let xx = 0; xx <= TW; xx += 10) x.lineTo(xx, hill(xx));
        x.lineTo(TW, 580); x.closePath(); x.fillStyle = PAL.far; x.fill();
        const pg = x.createLinearGradient(0, 486, 0, 580); pg.addColorStop(0, PAL.plain0); pg.addColorStop(1, PAL.plain1);
        x.fillStyle = pg; x.fillRect(0, 488, TW, 92);
        x.fillStyle = `rgba(${PAL.rose},.18)`; x.fillRect(0, 488, TW, 1);
        const warm = ['255,214,122', '255,180,107', '255,243,209', '255,138,168', '255,214,122'];
        const dot = (xx, yy, s, col, a) => { x.fillStyle = `rgba(${col},${a})`; for (const o of [0, -TW, TW]) x.fillRect(xx + o, yy, s, s); };
        for (let row = 0; row < 5; row++) {
          const y0 = 494 + row * 16;
          for (let xx = R() * 6; xx < TW; xx += 4 + R() * 7) if (R() < .7) dot(xx, y0 + (R() - .5) * 5 + xx * .004 % 3, 1 + R() * .9, pick(warm), .45 + R() * .5);
        }
        for (let i = 0; i < 160; i++) dot(R() * TW, 490 + R() * 88, .9 + R() * .9, pick(warm), .3 + R() * .5);
        spr.far = c; spr.farW = TW; spr.farTop = top;
      }
      // ---- mid layer: the hill, palm trees, the bench and its lamp ----
      {
        const TM = 1400, top = 400; const [c, x] = mk(TM, 180);
        x.translate(0, -top);
        const hy = xx => 528 + 20 * Math.sin(xx / TM * 6.283 * 2 + .5) + 10 * Math.sin(xx / TM * 6.283 * 5 + 1.3);
        x.beginPath(); x.moveTo(0, 580);
        for (let xx = 0; xx <= TM; xx += 8) x.lineTo(xx, hy(xx));
        x.lineTo(TM, 580); x.closePath(); x.fillStyle = PAL.mid; x.fill();
        x.strokeStyle = `rgba(${PAL.rose},.28)`; x.lineWidth = 1.2; x.beginPath();
        for (let xx = 0; xx <= TM; xx += 8) xx ? x.lineTo(xx, hy(xx)) : x.moveTo(xx, hy(xx));
        x.stroke();
        x.fillStyle = PAL.tree; x.strokeStyle = PAL.tree;
        const palm = (px, ht, lean) => {
          const by = hy(px) + 2, tx = px + lean, ty = by - ht;
          x.lineWidth = 3; x.lineCap = 'round';
          x.beginPath(); x.moveTo(px, by); x.quadraticCurveTo(px + lean * .2, by - ht * .5, tx, ty); x.stroke();
          x.lineWidth = 2.2;
          for (let i = 0; i < 7; i++) {
            const a = -Math.PI / 2 + (i - 3) * .48, L = 22 + (i % 2) * 6;
            x.beginPath(); x.moveTo(tx, ty);
            x.quadraticCurveTo(tx + Math.cos(a) * L * .6, ty + Math.sin(a) * L * .6 - 6, tx + Math.cos(a) * L, ty + Math.sin(a) * L + 8); x.stroke();
          }
        };
        palm(120, 72, 10); palm(150, 58, -8); palm(980, 80, 12); palm(1240, 64, -10);
        const tree = (px, r) => { const by = hy(px); x.beginPath(); x.arc(px, by - r * .8, r, 0, 6.283); x.arc(px + r * .7, by - r * .5, r * .75, 0, 6.283); x.arc(px - r * .7, by - r * .45, r * .7, 0, 6.283); x.fill(); };
        tree(420, 14); tree(560, 11); tree(1110, 13);
        // a bench under its own little lamp
        const bx = 740, by = hy(bx);
        glow(x, bx + 40, by - 50, 34, '255,214,150', .5);
        x.fillRect(bx - 14, by - 10, 28, 2.5); x.fillRect(bx - 14, by - 17, 28, 2); x.fillRect(bx - 12, by - 10, 2, 10); x.fillRect(bx + 10, by - 10, 2, 10);
        x.fillRect(bx + 39, by - 48, 2.2, 48); x.fillRect(bx + 36, by - 54, 8, 6);
        x.fillStyle = '#ffe2a0'; x.fillRect(bx + 37, by - 53, 6, 4);
        spr.mid = c; spr.midW = TM; spr.midTop = top;
      }
      // ---- sidewalk tile ----
      {
        const [c, x] = mk(64, 60);
        x.fillStyle = PAL.walk[0]; x.fillRect(0, 0, 64, 4);
        x.fillStyle = PAL.walk[1]; x.fillRect(0, 4, 64, 26);
        x.fillStyle = PAL.walk[2]; x.fillRect(0, 4, 1.5, 26);
        x.fillStyle = 'rgba(255,255,255,.04)'; x.fillRect(1.5, 4, 62, 2);
        x.fillStyle = PAL.walk[3]; x.fillRect(0, 30, 64, 6);
        x.fillStyle = PAL.walk[4]; x.fillRect(0, 36, 64, 24);
        x.fillStyle = `rgba(${PAL.gold},.18)`; x.fillRect(8, 48, 24, 2);
        spr.ground = c;
      }
      // ---- stardust mote ----
      {
        const [c, x] = mk(32, 32);
        glow(x, 16, 16, 16, PAL.gold, .55);
        star4(x, 16, 16, 10, 2.8);
        const sg = x.createRadialGradient(16, 16, 0, 16, 16, 10); sg.addColorStop(0, '#ffffff'); sg.addColorStop(.5, mix(T.gold, '#ffffff', .6)); sg.addColorStop(1, T.gold);
        x.fillStyle = sg; x.fill();
        spr.mote = c;
      }
      // ---- trail sparkles ----
      spr.sparks = [PAL.gold, PAL.rose, PAL.hud, PAL.cream].map(col => {
        const [c, x] = mk(14, 14);
        glow(x, 7, 7, 7, col, .45); star4(x, 7, 7, 6, 1.4); x.fillStyle = `rgb(${col})`; x.fill();
        return c;
      });
      // ---- lollipop power-up ----
      {
        const [c, x] = mk(64, 84); const cx = 32, cy = 30;
        glow(x, cx, cy, 30, PAL.rose, .45);
        x.fillStyle = '#f6eee3'; x.strokeStyle = '#16121f'; x.lineWidth = 2;
        x.fillRect(cx - 2, cy + 12, 4, 30); x.strokeRect(cx - 2, cy + 12, 4, 30);
        x.beginPath(); x.arc(cx, cy, 15, 0, 6.283); x.fillStyle = '#ef5fa7'; x.fill();
        x.save(); x.clip();
        for (const [col, w, rot] of [['#a46cf0', 4.5, 0], ['#ffffff', 3, 2.1]]) {
          x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.beginPath();
          for (let i = 0; i <= 80; i++) { const tt = i / 80, a = tt * 2.2 * 6.283 + rot, rr = 15 * tt; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
          x.stroke();
        }
        x.restore();
        x.strokeStyle = '#16121f'; x.lineWidth = 2.4; x.beginPath(); x.arc(cx, cy, 15, 0, 6.283); x.stroke();
        x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.ellipse(cx - 6, cy - 7, 4, 2.2, -.6, 0, 6.283); x.fill();
        spr.lolli = c;
      }
      // ---- shield bubble ----
      {
        const [c, x] = mk(100, 100);
        const bg = x.createRadialGradient(50, 50, 10, 50, 50, 46);
        bg.addColorStop(0, 'rgba(255,255,255,0)'); bg.addColorStop(.72, `rgba(${PAL.lilac},.08)`); bg.addColorStop(.94, `rgba(${PAL.hud},.4)`); bg.addColorStop(1, 'rgba(255,255,255,.65)');
        x.fillStyle = bg; x.beginPath(); x.arc(50, 50, 46, 0, 6.283); x.fill();
        x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 3; x.lineCap = 'round';
        x.beginPath(); x.arc(50, 50, 38, Math.PI * 1.1, Math.PI * 1.38); x.stroke();
        x.beginPath(); x.arc(50, 50, 38, Math.PI * 1.46, Math.PI * 1.52); x.stroke();
        spr.bubble = c;
      }
      // ---- sky ----
      skyGrad = g.createLinearGradient(0, 0, 0, GROUND);
      for (const [o, col] of PAL.sky) skyGrad.addColorStop(o, col);
    }

    function makeScenery() {
      const R = rng(42);
      stars = Array.from({ length: Math.round(40 + W / 14) }, () => ({ x: R(), y: Math.pow(R(), 1.5) * 330 + 6, r: .5 + R() * 1.1, p: R() * 6.28, s: .6 + R() * 1.6, gold: R() < .15 }));
      clouds = Array.from({ length: 5 }, (_, i) => ({ x: R() * (W + 400), y: 70 + i * 62 + R() * 30, sp: .12 + R() * .1, dr: 3 + R() * 6, v: i % 2, s: .6 + R() * .6 }));
    }

    // Measure the space below the header. The stage is collapsed first: a stage
    // sized for the previous orientation would otherwise widen the mobile layout
    // viewport and make innerHeight come back far too tall.
    function measure() {
      stage.style.width = '0px'; stage.style.height = '0px';
      const de = document.documentElement;
      const bar = ctx.frame && ctx.frame.el.querySelector('.wbar');
      const barH = bar ? bar.getBoundingClientRect().height : 58;
      const vw = de.clientWidth || innerWidth;
      const vh = Math.min(innerHeight, de.clientHeight || innerHeight);
      const m = vw < 600 || vh < 520 ? 8 : 14;
      const sa = insets();
      return { m, sa, cw: Math.floor(clamp(vw - 2 * m - sa.l - sa.r, 260, 1800)), ch: Math.floor(Math.max(220, vh - barH - 2 * m - sa.b)) };
    }
    let cwNow = 0, chNow = 0;
    function layout(d = measure()) {
      const { m, sa, cw, ch } = d;
      cwNow = cw; chNow = ch;
      wrap.style.padding = `${m}px ${m + sa.r}px ${m + sa.b}px ${m + sa.l}px`;
      stage.style.width = cw + 'px'; stage.style.height = ch + 'px';
      stage.classList.toggle('short', ch < 470);
      stage.classList.toggle('compact', ch >= 470 && ch < 660);
      stage.classList.toggle('narrow', cw < 420);
      const dpr = Math.min(2, devicePixelRatio || 1, Math.sqrt(4.2e6 / (cw * ch)));
      canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
      k = canvas.height / H; W = canvas.width / k;
      if (state !== 'play' || !catX) catX = clamp(W * .28, 92, 340); // keep the pilot put mid-flight
      buildSprites(); makeScenery();
      render(1);
    }

    /* ================= game state ================= */
    let state = 'title', prevState = 'play', acc = 0, ts = 1, lockUntil = 0;
    let S = null;
    function newRun() {
      S = {
        camX: 0, pcamX: 0, y: 300, py: 300, vy: 0, rot: 0, prot: 0, passed: 0, dust: 0,
        gates: [], motes: [], lollis: [], parts: [], pops: [],
        nextX: 0, prevGateX: 0, gi: 0, lastY: 300, lastTop: '', shield: false, invul: 0, lolliGates: 0,
        prop: 0, propV: 16, t: 0, shake: 0, flash: 0, slowT: 0, dustStep: 0, deadT: 0, landed: false,
        emitT: 0, bumpT: 0, stamped: false, cause: 'lamp', countdown: 0,
      };
    }
    newRun();

    function spawnGate() {
      const n = S.gi++;
      const easy = n < 3;
      const gap = easy ? 250 - n * 6 : 158 + 64 * Math.exp(-(n - 3) / 16);
      const spacing = easy ? 400 : 292 + 96 * Math.exp(-(n - 3) / 18);
      const md = easy ? 55 : 85 + 75 * Math.min(1, (n - 3) / 14);
      const lo = 72 + gap / 2, hi = GROUND - 108 - gap / 2;
      const prevY = S.lastY;
      let gy = n === 0 ? rand(285, 335) : clamp(prevY + rand(-md, md), lo, hi);
      if (n > 3 && Math.abs(gy - prevY) < 25) gy = clamp(gy + (Math.random() < .5 ? -1 : 1) * 45, lo, hi);
      let top = pick(TOP_KEYS); if (top === S.lastTop) top = pick(TOP_KEYS.filter(t => t !== S.lastTop));
      const x = S.nextX;
      const gate = { x, y: gy, gap, top, passed: false, n };
      S.gates.push(gate);
      // stardust + the occasional lollipop
      const midX = (S.prevGateX + x) / 2, midY = (prevY + gy) / 2;
      S.lolliGates++;
      if (n >= 4 && !S.shield && !S.lollis.length && (Math.random() < .12 || S.lolliGates > 16)) {
        S.lollis.push({ x: midX, y: midY + rand(-20, 20), t: rand(0, 6) }); S.lolliGates = 0;
        S.motes.push({ x, y: gy, t: rand(0, 6) });
      } else {
        const r = Math.random();
        if (r < .5) S.motes.push({ x, y: gy, t: rand(0, 6) });
        else if (r < .68) for (let i = 0; i < 3; i++) S.motes.push({ x: x - 120 + i * 60, y: lerp(prevY, gy, .4 + i * .3), t: i });
        else if (r < .8) S.motes.push({ x: midX, y: midY + rand(-30, 30), t: rand(0, 6) });
      }
      S.prevGateX = x; S.lastY = gy; S.lastTop = top; S.nextX += spacing;
    }

    function startRun() {
      newRun(); state = 'ready'; acc = 0;
      startOv.hidden = true; resultOv.hidden = true; pauseOv.hidden = true; pauseBtn.hidden = false;
      audio.ac(); audio.sfx('whoosh');
      canvas.focus({ preventScroll: true });
    }
    function begin() {
      state = 'play';
      S.nextX = S.camX + catX + 520; S.prevGateX = S.nextX - 400; S.lastY = S.y;
    }
    function flap() {
      if (S.countdown > 0) return;
      S.vy = FLAP; S.propV = 52;
      audio.sfx('flap');
      if (!reduce) for (let i = 0; i < 3; i++) S.parts.push({ x: S.camX + catX + rand(-8, 8), y: S.y - CAT * .5, vx: rand(-40, 40), vy: rand(-30, 10), life: .45, max: .45, sp: 3, s: .7 });
    }
    function primary() {
      if (state === 'ready') { begin(); flap(); }
      else if (state === 'play') flap();
    }
    function pause() {
      if (state !== 'play' && state !== 'ready') return;
      prevState = state; state = 'paused';
      pauseOv.hidden = false; pauseBtn.hidden = true;
      resumeBtn.focus({ preventScroll: true });
    }
    function resume() {
      if (state !== 'paused') return;
      state = prevState; acc = 0;
      pauseOv.hidden = true; pauseBtn.hidden = false;
      if (state === 'play') S.countdown = 1.2;
      canvas.focus({ preventScroll: true });
    }
    function popShield() {
      S.shield = false; S.invul = 1.15;
      audio.sfx('pop');
      for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; S.parts.push({ x: S.camX + catX + Math.cos(a) * 30, y: S.y - 6 + Math.sin(a) * 30, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: .5, max: .5, sp: 2, s: .9 }); }
      S.pops.push({ x: S.camX + catX, y: S.y - 50, text: 'Saved!', life: .9, gold: false });
    }
    function crash(cause) {
      state = 'dying'; S.cause = cause; S.deadT = 0; S.landed = false;
      S.vy = cause === 'ground' ? -300 : -230;
      if (!reduce) { S.shake = 1; S.flash = 1; }
      audio.sfx('thud');
      if (sfxOn()) audio.blip({ f0: 520, f1: 150, dur: .24, vol: .14, type: 'square' });
      pauseBtn.hidden = true;
    }
    function onPass() {
      const n = S.passed;
      if (sfxOn()) audio.blip({ f0: 880, f1: 1320, dur: .08, vol: .05, type: 'sine' });
      if (n >= 12 && !S.stamped) { S.stamped = true; if (ctx.stamp()) S.slowT = 2.6; }
      if (TOASTS[n]) { ctx.toast(TOASTS[n], 2600); if (n !== 12) audio.sfx('sparkle'); }
    }

    function finish() {
      state = 'over';
      const gates = S.passed, dust = S.dust;
      const res = store.best('flight', gates);
      store.stat('gates', gates); store.statMax('bestFlight', gates);
      if (gates >= 12) ctx.stamp();
      const earned = dust + Math.floor(gates / 3);
      const [t, line] = CAUSE[S.cause] || CAUSE.lamp;
      rTitle.textContent = gates >= 12 ? 'Certified pilot!' : t;
      rScore.textContent = gates;
      rUnit.textContent = gates === 1 ? 'gate' : 'gates';
      rBadge.hidden = !(res.isNew || (res.first && gates > 0));
      rBadge.textContent = res.first ? 'First flight logged' : 'New best';
      const tail = rBadge.hidden && res.best != null && res.best > gates ? ` Best: ${res.best}.` : '';
      rLine.textContent = (gates >= 12 ? line.replace(/^Unscheduled\. /, '') : line) + tail;
      rEarn.replaceChildren(...(earned > 0
        ? [h('b', { text: `+${earned} ✦ stardust` }), h('span', { text: `${dust} caught · ${Math.floor(gates / 3)} for gates` })]
        : [h('span', { text: 'No stardust this time. The next flight is free.' })]));
      hudBest.textContent = String(res.best ?? gates);
      paintMeta();
      ctx.timeout(() => {
        resultOv.hidden = false;
        lockUntil = performance.now() + 650;
        if (earned > 0) ctx.timeout(() => ctx.award(earned, rEarn), 250);
        if (gates >= 12 || res.isNew) audio.sfx('win'); else audio.sfx('lose');
        ctx.timeout(() => againBtn.focus({ preventScroll: true }), 660);
      }, 380);
    }

    /* ================= physics (fixed step) ================= */
    function step(dt) {
      S.pcamX = S.camX; S.py = S.y; S.prot = S.rot;
      S.t += dt;
      S.propV += (16 - S.propV) * Math.min(1, dt * 3); S.prop += S.propV * dt;
      if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 2.8);
      if (S.flash > 0) S.flash = Math.max(0, S.flash - dt * 4);
      for (let i = S.parts.length - 1; i >= 0; i--) { const p = S.parts[i]; p.life -= dt; if (p.life <= 0) { S.parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 30 * dt; }
      for (let i = S.pops.length - 1; i >= 0; i--) { const p = S.pops[i]; p.life -= dt; p.y -= 46 * dt; if (p.life <= 0) S.pops.splice(i, 1); }

      if (state === 'title' || state === 'ready') {
        S.camX += (state === 'title' ? 70 : 150) * dt;
        S.y = 300 + Math.sin(S.t * 3) * 9; S.vy = 0;
        S.rot += (Math.sin(S.t * 3 + 1) * .06 - S.rot) * Math.min(1, dt * 6);
        return;
      }
      if (state === 'dying') {
        S.vy = Math.min(VMAX * 1.3, S.vy + G * dt); S.y += S.vy * dt;
        if (!S.landed) S.rot += 7 * dt;
        if (S.y + HIT_R >= GROUND) {
          S.y = GROUND - HIT_R;
          if (!S.landed) { S.landed = true; if (S.deadT > .08) audio.sfx('thud'); }
          S.vy = 0;
        }
        S.deadT += dt;
        if ((S.landed && S.deadT > .9) || S.deadT > 1.8) finish();
        return;
      }
      if (state !== 'play') return;
      if (S.countdown > 0) { S.countdown -= dt; return; }

      const speed = Math.min(250, 165 + S.passed * 2.2);
      S.camX += speed * dt;
      S.vy = Math.min(VMAX, S.vy + G * dt); S.y += S.vy * dt;
      const target = clamp(S.vy / 900, -.42, .75);
      S.rot += (target - S.rot) * Math.min(1, dt * 10);
      if (S.invul > 0) S.invul -= dt;
      S.bumpT -= dt;

      // the top of the sky just bumps
      const hatTop = S.y - .6 * CAT;
      if (hatTop < 2) {
        S.y = 2 + .6 * CAT;
        if (S.vy < 0) { S.vy = 70; if (S.bumpT <= 0 && sfxOn()) { audio.blip({ f0: 320, f1: 210, dur: .07, vol: .07, type: 'triangle' }); S.bumpT = .3; } }
      }
      // the ground does not
      if (S.y + HIT_R >= GROUND) {
        if (S.shield || S.invul > 0) {
          S.y = GROUND - HIT_R; S.vy = FLAP * 1.05;
          if (S.shield) popShield(); else audio.sfx('pop');
        } else { S.y = GROUND - HIT_R; crash('ground'); return; }
      }

      while (S.nextX < S.camX + W + 200) spawnGate();
      const cx = S.camX + catX, cy = S.y;

      for (const gt of S.gates) {
        if (Math.abs(gt.x - cx) < 90 && S.invul <= 0) {
          const tp = TOPS[gt.top], gTop = gt.y - gt.gap / 2, gBot = gt.y + gt.gap / 2;
          let hit = null;
          if (circRect(cx, cy, HIT_R, gt.x - tp.hw, -3000, gt.x + tp.hw, gTop - tp.inset)) hit = gt.top;
          else if (circRect(cx, cy, HIT_R, gt.x - 17, gBot + 6, gt.x + 17, gBot + 76)
            || circRect(cx, cy, HIT_R, gt.x - 7, gBot + 76, gt.x + 7, GROUND)
            || circRect(cx, cy, HIT_R, gt.x - 15, GROUND - 36, gt.x + 15, GROUND)) hit = 'lamp';
          if (hit) {
            if (S.shield) popShield();
            else { crash(hit); return; }
          }
        }
        if (!gt.passed && gt.x + 18 < cx - HIT_R) { gt.passed = true; S.passed++; onPass(); }
      }
      // stardust
      const cr = (HIT_R + 15) * (HIT_R + 15);
      for (let i = S.motes.length - 1; i >= 0; i--) {
        const m = S.motes[i], dx = m.x - cx, dy = m.y - cy;
        if (dx * dx + dy * dy < cr) {
          S.motes.splice(i, 1); S.dust++;
          audio.sfx('dust', { step: S.dustStep++ });
          S.pops.push({ x: m.x, y: m.y - 14, text: '+1', life: .8, gold: true });
          const n = reduce ? 3 : 7;
          for (let j = 0; j < n; j++) { const a = Math.random() * 6.283, v = rand(40, 110); S.parts.push({ x: m.x, y: m.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .5, max: .5, sp: j % 4, s: .8 }); }
        } else if (m.x < cx - 60) { if (!m.missed) { m.missed = true; S.dustStep = 0; } if (m.x < S.camX - 60) S.motes.splice(i, 1); }
      }
      for (let i = S.lollis.length - 1; i >= 0; i--) {
        const l = S.lollis[i], dx = l.x - cx, dy = l.y - cy;
        if (dx * dx + dy * dy < (HIT_R + 22) * (HIT_R + 22)) {
          S.lollis.splice(i, 1); S.shield = true;
          audio.sfx('sparkle'); audio.sfx('pop');
          S.pops.push({ x: l.x, y: l.y - 30, text: 'Bubble shield!', life: 1.1, gold: false });
        } else if (l.x < S.camX - 80) S.lollis.splice(i, 1);
      }
      while (S.gates.length && S.gates[0].x < S.camX - 140) S.gates.shift();
      // a sparkly contrail
      S.emitT += dt;
      const rate = reduce ? .14 : .036;
      while (S.emitT > rate && S.parts.length < 90) {
        S.emitT -= rate;
        S.parts.push({ x: cx - CAT * .32, y: cy + rand(-8, 10), vx: rand(-30, 10), vy: rand(-18, 18), life: .7, max: .7, sp: Math.floor(Math.random() * 4), s: rand(.5, 1) });
      }
      if (S.emitT > rate) S.emitT = 0;
    }

    /* ================= drawing ================= */
    function tileX(scroll, w) { return -(((scroll % w) + w) % w); }
    function drawTop(gt, gx, gTop) {
      const tp = TOPS[gt.top], s = spr[gt.top];
      const dy = gTop - ANCHOR, y0 = Math.max(0, -dy - 4);
      const sh = 640 - y0;
      if (sh <= 0) return;
      g.drawImage(s, 0, y0 * k, s.width, Math.min(s.height, sh * k), gx - tp.ax, dy + y0, tp.w, Math.min(s.height / k, sh));
    }
    function render(alpha) {
      if (!S) return;
      const camX = lerp(S.pcamX, S.camX, alpha), cy = lerp(S.py, S.y, alpha), rot = lerp(S.prot, S.rot, alpha);
      g.setTransform(k, 0, 0, k, 0, 0);
      if (S.shake > 0) { const a = S.shake * S.shake * 9; g.translate(rand(-a, a), rand(-a, a)); }

      // sky + stars
      g.fillStyle = skyGrad; g.fillRect(-20, -20, W + 40, GROUND + 40);
      const SW = W + 20;
      for (const s of stars) {
        const x = ((s.x * SW - camX * .02) % SW + SW) % SW - 10;
        const a = (reduce ? .7 : .3 + .7 * Math.abs(Math.sin(s.p + clock * s.s))) * (1 - s.y / 420);
        g.fillStyle = `rgba(${s.gold ? PAL.starGold : PAL.paper},${a})`;
        g.fillRect(x - s.r / 2, s.y - s.r / 2, s.r, s.r);
        if (s.r > 1.3) { g.fillRect(x - s.r * 1.5, s.y - .25, s.r * 3, .5); g.fillRect(x - .25, s.y - s.r * 1.5, .5, s.r * 3); }
      }
      // clouds
      const CW = W + 440;
      for (const c of clouds) {
        const x = ((c.x - camX * c.sp - clock * c.dr) % CW + CW) % CW - 220;
        g.drawImage(spr.bgClouds[c.v], x, c.y, 220 * c.s, 90 * c.s);
      }
      // far city + mid hill + sidewalk
      for (let x = tileX(camX * .08, spr.farW); x < W; x += spr.farW) g.drawImage(spr.far, x, spr.farTop, spr.farW, 160);
      for (let x = tileX(camX * .3, spr.midW); x < W; x += spr.midW) g.drawImage(spr.mid, x, spr.midTop, spr.midW, 180);
      for (let x = tileX(camX, 64); x < W + 20; x += 64) g.drawImage(spr.ground, x, GROUND, 64, 60);

      // gates
      for (const gt of S.gates) {
        const gx = gt.x - camX;
        if (gx < -110 || gx > W + 110) continue;
        const gTop = gt.y - gt.gap / 2, gBot = gt.y + gt.gap / 2;
        g.drawImage(spr.base, gx - 80, GROUND - 46, 160, 60);
        const colTop = gBot + 80, colBot = GROUND - 37;
        if (colBot > colTop) {
          g.fillStyle = D; g.fillRect(gx - 6, colTop, 12, colBot - colTop);
          g.fillStyle = 'rgba(255,200,130,.2)'; g.fillRect(gx - 6, colTop, 1.6, colBot - colTop);
          g.fillStyle = D;
          for (let ry = GROUND - 92; ry > colTop + 14; ry -= 104) g.fillRect(gx - 8.5, ry, 17, 5);
        }
        g.drawImage(spr.head, gx - 90, gBot - 56, 180, 200);
        drawTop(gt, gx, gTop);
      }
      // stardust + lollipops
      for (const m of S.motes) {
        const x = m.x - camX; if (x < -30 || x > W + 30) continue;
        const s = 1 + Math.sin(clock * 5 + m.t) * .12, y = m.y + Math.sin(clock * 2.6 + m.t) * 4;
        g.drawImage(spr.mote, x - 16 * s, y - 16 * s, 32 * s, 32 * s);
      }
      for (const l of S.lollis) {
        const x = l.x - camX, y = l.y + Math.sin(clock * 2.2 + l.t) * 6;
        g.save(); g.translate(x, y); g.rotate(Math.sin(clock * 1.8 + l.t) * .25);
        g.drawImage(spr.lolli, -32, -30, 64, 84); g.restore();
      }
      // contrail
      for (const p of S.parts) {
        const x = p.x - camX; g.globalAlpha = Math.max(0, p.life / p.max);
        const s = 14 * p.s; g.drawImage(spr.sparks[p.sp], x - s / 2, p.y - s / 2, s, s);
      }
      g.globalAlpha = 1;

      // the pilot
      g.save(); g.translate(catX, cy); g.rotate(rot);
      if (S.invul > 0 && state === 'play') g.globalAlpha = (Math.floor(clock * 14) % 2) ? .45 : 1;
      const ox = -CAT / 2, oy = -CAT * HEAD;
      g.drawImage(spr.cat, ox, oy, CAT, CAT * ASP);
      cat.drawProp(g, ox, oy, CAT, S.prop, design);
      g.globalAlpha = 1;
      if (S.shield) {
        const wob = 1 + Math.sin(clock * 6) * .035;
        g.drawImage(spr.bubble, -38 * wob, -CAT * .12 - 38 / wob, 76 * wob, 76 / wob);
      }
      g.restore();

      // +1 pops
      if (S.pops.length) {
        g.textAlign = 'center'; g.textBaseline = 'middle';
        for (const p of S.pops) {
          g.globalAlpha = Math.min(1, p.life * 2.5);
          g.font = p.gold ? '700 15px "JetBrains Mono", ui-monospace, monospace' : '700 14px "JetBrains Mono", ui-monospace, monospace';
          g.fillStyle = `rgba(${PAL.night},.55)`; g.fillText(p.text, p.x - camX + 1, p.y + 1.2);
          g.fillStyle = p.gold ? T.gold : T.hud; g.fillText(p.text, p.x - camX, p.y);
        }
        g.globalAlpha = 1;
      }
      if (S.flash > 0) { g.fillStyle = `rgba(${PAL.paper},${S.flash * .4})`; g.fillRect(-20, -20, W + 40, H + 40); }

      // prompts
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (state === 'ready') {
        const a = .82 + .18 * Math.sin(clock * 5);
        g.fillStyle = `rgba(${PAL.night},.42)`;
        g.beginPath(); g.ellipse(W / 2, 162, 118, 44, 0, 0, 6.283); g.fill();
        g.font = '400 34px Italiana, Georgia, serif';
        g.fillStyle = `rgba(${PAL.paper},${a})`; g.fillText('Tap to flap', W / 2, 152);
        g.font = '600 10px "JetBrains Mono", ui-monospace, monospace'; g.fillStyle = `rgba(${PAL.gold},${a})`;
        g.fillText(finePointer ? 'CLICK  ·  SPACE  ·  ↑' : 'TAP ANYWHERE, AGAIN AND AGAIN', W / 2, 184);
      } else if (state === 'play' && S.countdown > 0) {
        const n = Math.ceil(S.countdown / .4);
        g.font = '400 64px Italiana, Georgia, serif'; g.fillStyle = `rgba(${PAL.paper},.9)`;
        g.fillText(String(n), W / 2, 200);
      }
    }

    /* ================= loop ================= */
    let shownP = -1, shownD = -1, bestShown = store.getBest('flight') ?? 0;
    ctx.raf((t, dtMs) => {
      const dt = dtMs / 1000;
      if (state === 'paused' || state === 'over' || state === 'title') return; // static behind the cards
      if (state === 'play' && document.body.classList.contains('lock-scroll')) { pause(); return; } // a modal opened
      clock += dt;
      // a slow-motion beat while the passport stamp lands
      let target = 1;
      if (S.slowT > 0) { S.slowT -= dt; target = S.slowT > .5 ? .55 : 1; }
      ts += (target - ts) * Math.min(1, dt * 5);
      acc += dt * ts;
      let n = 0;
      while (acc >= STEP && n < 12) { step(STEP); acc -= STEP; n++; if (state === 'over') break; }
      if (n >= 12) acc = 0;
      render(Math.min(1, acc / STEP));
      if (S.passed !== shownP) { shownP = S.passed; hudGates.textContent = shownP; }
      if (S.dust !== shownD) { shownD = S.dust; hudDust.textContent = shownD; }
      if (S.passed > bestShown) { bestShown = S.passed; hudBest.textContent = bestShown; }
    });

    /* ================= input ================= */
    ctx.on(canvas, 'pointerdown', e => {
      if (e.button != null && e.button > 0) return;
      e.preventDefault();
      primary();
    }, { passive: false });
    ctx.on(canvas, 'contextmenu', e => e.preventDefault());
    const isCtl = el => el && el !== canvas && el.closest && el.closest('button, a, input, textarea, select');
    ctx.on(window, 'keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.body.classList.contains('lock-scroll')) return;
      const key = e.key;
      const prim = key === ' ' || key === 'Spacebar' || key === 'Enter' || key === 'ArrowUp' || key === 'w' || key === 'W';
      if (state === 'ready' || state === 'play') {
        if (prim) { e.preventDefault(); if (!e.repeat) primary(); }
        else if (key === 'Escape' || key === 'p' || key === 'P') { e.preventDefault(); pause(); }
        return;
      }
      if (state === 'paused') {
        if (key === 'Escape' || key === 'p' || key === 'P') { e.preventDefault(); resume(); }
        else if (prim && !isCtl(e.target)) { e.preventDefault(); resume(); }
        return;
      }
      if ((state === 'title' || state === 'over') && prim && !isCtl(e.target) && !e.repeat) {
        if (state === 'over' && (resultOv.hidden || performance.now() < lockUntil)) return;
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
    const relayout = () => {
      if (!ctx.alive()) return;
      const d = measure();
      // a real rotation pauses the run; the URL bar sliding in and out does not
      if (state === 'play' && (d.cw !== cwNow || Math.abs(d.ch - chNow) > 120)) pause();
      layout(d);
    };
    const onResize = () => { clearTimeout(rt); rt = setTimeout(relayout, 120); };
    ctx.on(window, 'resize', onResize);
    ctx.on(window, 'orientationchange', () => { onResize(); clearTimeout(rt2); rt2 = setTimeout(relayout, 350); });
    ctx.cleanup(() => { clearTimeout(rt); clearTimeout(rt2); });

    layout();
    cat.catImage(design, 256).then(img => { if (!ctx.alive() || !img) return; catImg = img; buildCat(); render(1); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (ctx.alive()) render(1); });
    // tiny read-only hook for automated tests
    const hook = {
      get s() {
        return { state, y: S.y, vy: S.vy, catX: S.camX + catX, passed: S.passed, dust: S.dust, shield: S.shield, W,
          gates: S.gates.filter(g2 => !g2.passed).slice(0, 3).map(g2 => ({ x: g2.x, y: g2.y, gap: g2.gap })) };
      },
    };
    window.__flight = hook;
    ctx.cleanup(() => { if (window.__flight === hook) delete window.__flight; });
  },
};
