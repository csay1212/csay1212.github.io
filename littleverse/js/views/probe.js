// Probe Delivery. The sender packed a message (a birthday wish, a thank-you…)
// into a little probe, and the recipient flies it home: drag back from the
// probe, let go, and let gravity slingshot it to their own planet. Ten
// missions, three ✦ each. Physics + levels live in probe-sim.js (shared with
// the solver script).
import { h, icon, clamp } from '../core/dom.js';
import { LEVELS, W, H, HZ, MAX_STEPS, PROBE_R, STAR_R, MIN_POWER, simulate, bodyPos } from './probe-sim.js';

const KEY = 'game.probe.stars';
const N = LEVELS.length;
const TAU = Math.PI * 2, RAD = Math.PI / 180;
const INK = '#16121f';
const PAL = {
  lilac: ['#f1e9ff', '#b59cff', '#3f2f86'],
  mint: ['#dcfff7', '#86e6d8', '#1f6a66'],
  peach: ['#ffe6da', '#ff9a7a', '#8f3a2a'],
  sky: ['#e3f4ff', '#9fd3ff', '#2b5a96'],
  gold: ['#fff4cc', '#f5cc4a', '#8a610a'],
  dusk: ['#e2d6ff', '#8a6ad8', '#24184f'],
  moon: ['#f6f4fa', '#c3bdd2', '#4f4963'],
};
// what the probe carries, by occasion (the last word doubles as the short name)
const CARGO = {
  birthday: 'birthday wish', belated: 'birthday wish', anniversary: 'anniversary note', newyear: 'New Year’s wish',
  congrats: 'note of congratulations', thanks: 'thank-you note', farewell: 'bon voyage note', reunion: 'see-you-soon note',
  getwell: 'get-well note', sorry: 'apology', justbecause: 'message', remembrance: 'message',
};
const an = w => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;
const poss = n => n + (/s$/i.test(n) ? '’' : '’s');
function failLines(U, cargo) {
  const short = cargo === 'note of congratulations' ? 'note' : cargo.split(' ').pop();
  return {
    planet: ['Bonk. That was a planet.', 'Planets: still solid. Noted.', 'The probe hugged a planet. A bit too hard.'],
    moon: ['The moon got in the way. Rude, honestly.', 'Moon 1, probe 0.', 'Timing! The moon was just passing through.'],
    rock: ['Asteroid. Who put that there? (Mission control did.)', 'Rock 1, probe 0.', 'That rock had it coming. Unfortunately so did the probe.'],
    sun: [`Too warm. The ${short} is slightly toasted.`, U.rel === 'partner' ? 'Flew into the sun. Romantic, but no.' : 'Flew into the sun. Bold, but no.', 'Sunburn. Should have packed sunscreen.'],
    hole: ['Swallowed by the black hole. It does that.', 'Spaghettified. Try a wider berth.', 'Gone. The black hole says thanks.'],
    home: ['Boomeranged into mission control. Classic.', 'It came home. Sweet, but wrong planet.'],
    lost: [`Lost signal. The ${short} is touring the galaxy.`, 'Off the map. Mission control waves goodbye.', 'Wrong way. Space is big like that.'],
    timeout: ['Battery flat. It’s just floating there, thinking about you.', 'Twelve seconds of flight and nowhere to land.'],
  };
}
const STAR_LINES = [
  'Zero stars, full delivery. Efficient!',
  'One star. A classic.',
  'Two stars. The third one is shy.',
  'All three stars. Show-off. (Mission control is impressed.)',
];
// theme helpers: the universe's palette, mixed for the art
const hexRgb = hex => { const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim()); if (!m) return [128, 128, 128]; const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const mix = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const rgbOf = hex => hexRgb(hex).join(',');
const TWILIGHT = { night: '#0c0b24', night2: '#120f33', dusk: '#2a1d55', horizon: '#4a2c6e', rose: '#ef7fb0', gold: '#f5cc4a', hud: '#86e6d8', lilac: '#b59cff', peach: '#ff9a7a', sky: '#9fd3ff', paper: '#f6eee3', muted: '#b8b0d6' };

const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
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
function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function mkCanvas(w, hh, draw) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.ceil(w)); c.height = Math.max(2, Math.ceil(hh));
  draw(c.getContext('2d'), c.width, c.height);
  return c;
}
const normA = a => { a = ((a + 180) % 360 + 360) % 360 - 180; return a === -180 ? 180 : a; };
const fmtA = a => normA(a).toFixed(1) + '°';
const fmtP = p => { const v = Math.round(p * 10000) / 100; return String(v) + '%'; };

/* ===================== sprites (drawn once per level / size) ===================== */
function ringPart(g, R, ring, front) {
  g.save(); g.rotate((ring.tilt || 0) * RAD);
  g.beginPath(); if (front) g.rect(-R * 4, 0, R * 8, R * 4); else g.rect(-R * 4, -R * 4, R * 8, R * 4); g.clip();
  const rx = R * ring.k, ry = rx * .27;
  g.lineWidth = R * .16; g.strokeStyle = hexA(ring.c, .78); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.stroke();
  g.lineWidth = Math.max(1, R * .035); g.strokeStyle = 'rgba(255,255,255,.45)';
  if (ring.dots) g.setLineDash([R * .06, R * .16]);
  g.beginPath(); g.ellipse(0, 0, rx * .93, ry * .93, 0, 0, TAU); g.stroke();
  g.setLineDash([]);
  g.lineWidth = Math.max(1, R * .025); g.strokeStyle = hexA(ring.c, .35);
  g.beginPath(); g.ellipse(0, 0, rx * 1.1, ry * 1.1, 0, 0, TAU); g.stroke();
  g.restore();
}
function ballShade(g, R) {
  const sh = g.createRadialGradient(-R * .5, -R * .55, R * .25, -R * .1, -R * .1, R * 1.3);
  sh.addColorStop(0, 'rgba(8,5,26,0)'); sh.addColorStop(.6, 'rgba(8,5,26,.12)'); sh.addColorStop(1, 'rgba(8,5,26,.62)');
  g.fillStyle = sh; g.fillRect(-R, -R, R * 2, R * 2);
}
function planetSprite(R, look, ring, seed, glowCol) {
  const pal = PAL[look] || PAL.lilac;
  const ext = Math.max(R * 1.55, ring ? R * ring.k * 1.18 : 0);
  const S = Math.ceil(ext * 2 + 4);
  const rnd = rng(seed);
  return mkCanvas(S, S, g => {
    g.translate(S / 2, S / 2);
    const gl = g.createRadialGradient(0, 0, R * .85, 0, 0, R * 1.55);
    gl.addColorStop(0, hexA(glowCol || pal[1], .3)); gl.addColorStop(1, hexA(glowCol || pal[1], 0));
    g.fillStyle = gl; g.beginPath(); g.arc(0, 0, R * 1.55, 0, TAU); g.fill();
    if (ring) ringPart(g, R, ring, false);
    const bg = g.createRadialGradient(-R * .35, -R * .4, R * .08, 0, 0, R);
    bg.addColorStop(0, pal[0]); bg.addColorStop(.55, pal[1]); bg.addColorStop(1, pal[2]);
    g.fillStyle = bg; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
    if (look === 'moon' || look === 'mint' && !ring) {
      for (let i = 0; i < 7; i++) {
        const a = rnd() * TAU, d = rnd() * R * .75, cr = R * (.08 + rnd() * .16);
        g.fillStyle = 'rgba(30,20,60,.18)'; g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, cr, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = Math.max(1, cr * .18); g.beginPath(); g.arc(Math.cos(a) * d - cr * .1, Math.sin(a) * d - cr * .1, cr, Math.PI * .9, Math.PI * 1.6); g.stroke();
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const y = -R + (i + .5) * (R * 2 / 6) + (rnd() - .5) * R * .12, th = R * (.08 + rnd() * .14), amp = R * (.02 + rnd() * .04), ph = rnd() * TAU;
        g.fillStyle = hexA(i % 2 ? pal[0] : pal[2], .16);
        g.beginPath(); g.moveTo(-R, y);
        for (let x = -R; x <= R; x += R / 10) g.lineTo(x, y + Math.sin(x / R * 5 + ph) * amp);
        for (let x = R; x >= -R; x -= R / 10) g.lineTo(x, y + th + Math.sin(x / R * 5 + ph + 1) * amp);
        g.closePath(); g.fill();
      }
    }
    ballShade(g, R);
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = Math.max(1, R * .03); g.beginPath(); g.arc(0, 0, R - .5, 0, TAU); g.stroke();
    if (ring) ringPart(g, R, ring, true);
  });
}
function homeSprite(R, seed) {
  const S = Math.ceil(R * 3.3);
  const rnd = rng(seed);
  return mkCanvas(S, S, g => {
    g.translate(S / 2, S / 2);
    const gl = g.createRadialGradient(0, 0, R * .9, 0, 0, R * 1.6);
    gl.addColorStop(0, 'rgba(159,211,255,.4)'); gl.addColorStop(1, 'rgba(159,211,255,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(0, 0, R * 1.6, 0, TAU); g.fill();
    const bg = g.createRadialGradient(-R * .35, -R * .4, R * .1, 0, 0, R);
    bg.addColorStop(0, '#cfeaff'); bg.addColorStop(.45, '#4a8fe0'); bg.addColorStop(1, '#173a7c');
    g.fillStyle = bg; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
    for (let k = 0; k < 3; k++) {
      const cx = (rnd() - .5) * R * 1.2, cy = (rnd() - .5) * R * 1.2, n = 9, base = R * (.28 + rnd() * .22);
      g.fillStyle = k === 1 ? '#5fbf74' : '#79d38a';
      g.beginPath();
      for (let i = 0; i <= n; i++) { const a = i / n * TAU, rr = base * (.7 + rnd() * .5); i ? g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .8) : g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .8); }
      g.closePath(); g.fill();
    }
    g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineCap = 'round';
    for (let k = 0; k < 4; k++) { const y = (rnd() - .5) * R * 1.4, x = (rnd() - .5) * R; g.lineWidth = R * (.06 + rnd() * .05); g.beginPath(); g.moveTo(x - R * .4, y); g.quadraticCurveTo(x, y - R * .08, x + R * .45, y + R * .02); g.stroke(); }
    ballShade(g, R);
    g.restore();
    g.strokeStyle = 'rgba(200,235,255,.6)'; g.lineWidth = Math.max(1, R * .05); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
  });
}
// The recipient's planet: rose-colored, ringed, a sleepy-happy face, and their
// own propeller cap on top (hat colors from their pilot design). The cap reuses
// the character hat's shapes (viewBox units) scaled onto the planet.
function capTransform(g, R) { const k = R * 1.02 / 132; g.translate(0, -R * .8); g.scale(k, k); g.translate(-100, -99); }
function targetSprite(R, T, hat) {
  const ring = { tilt: -16, k: 1.72, c: T.gold, dots: true };
  const S = Math.ceil(R * 2 * 2.05 + 6);
  return mkCanvas(S, S, g => {
    g.translate(S / 2, S / 2);
    const gl = g.createRadialGradient(0, 0, R * .8, 0, 0, R * 1.75);
    gl.addColorStop(0, hexA(T.rose, .45)); gl.addColorStop(1, hexA(T.rose, 0));
    g.fillStyle = gl; g.beginPath(); g.arc(0, 0, R * 1.75, 0, TAU); g.fill();
    ringPart(g, R, ring, false);
    const bg = g.createRadialGradient(-R * .35, -R * .4, R * .08, 0, 0, R);
    bg.addColorStop(0, mix(T.rose, '#ffffff', .78)); bg.addColorStop(.55, T.rose); bg.addColorStop(1, mix(T.rose, '#2a0820', .55));
    g.fillStyle = bg; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
    g.fillStyle = 'rgba(255,255,255,.14)';
    for (const [x, y, r] of [[-.45, .45, .16], [.5, .3, .1], [.1, .62, .08]]) { g.beginPath(); g.arc(x * R, y * R, r * R, 0, TAU); g.fill(); }
    ballShade(g, R);
    g.restore();
    // face
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = INK; g.lineWidth = Math.max(1.4, R * .07);
    for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * R * .32, R * .02, R * .11, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    g.fillStyle = 'rgba(255,150,190,.75)';
    for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * R * .52, R * .2, R * .13, R * .07, 0, 0, TAU); g.fill(); }
    g.lineWidth = Math.max(1.2, R * .055);
    g.beginPath(); g.moveTo(-R * .11, R * .2); g.quadraticCurveTo(-R * .055, R * .29, 0, R * .21); g.quadraticCurveTo(R * .055, R * .29, R * .11, R * .2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = Math.max(1, R * .03); g.beginPath(); g.arc(0, 0, R - .5, 0, TAU); g.stroke();
    ringPart(g, R, ring, true);
    // the cap (same panels as the recipient's hat)
    g.save(); capTransform(g, R);
    g.lineJoin = 'round';
    g.fillStyle = hat.hub; g.strokeStyle = INK; g.lineWidth = 3;
    g.beginPath(); g.rect(96.5, 20, 7, 16); g.fill(); g.stroke();
    const P = d => new Path2D(d);
    g.fillStyle = hat.side; g.fill(P('M34 99 C34 52 66 34 100 34 Q74 48 62 99Z'));
    g.fillStyle = hat.fl; g.fill(P('M62 99 Q74 48 100 34 L100 99Z'));
    g.fillStyle = hat.fr; g.fill(P('M100 99 L100 34 Q126 48 138 99Z'));
    g.fillStyle = hat.side; g.fill(P('M138 99 Q126 48 100 34 C134 34 166 52 166 99Z'));
    g.strokeStyle = INK; g.lineWidth = 3.5; g.stroke(P('M62 99 Q74 48 100 34 M100 34 V99 M138 99 Q126 48 100 34'));
    g.lineWidth = 5.5; g.stroke(P('M34 99 C34 52 66 34 100 34 C134 34 166 52 166 99'));
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 5; g.lineCap = 'round'; g.stroke(P('M70 52 Q82 40 96 38'));
    g.fillStyle = hat.brim; g.strokeStyle = INK; g.lineWidth = 5.5;
    const brim = P('M26 98 Q100 84 174 98 Q182 110 168 114 Q100 102 32 114 Q18 110 26 98Z'); g.fill(brim); g.stroke(brim);
    g.restore();
  });
}
function rockSprite(R, seed) {
  const S = Math.ceil(R * 2.6 + 4), rnd = rng(seed);
  return mkCanvas(S, S, g => {
    g.translate(S / 2, S / 2);
    const n = 10, pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU + (rnd() - .5) * .3, rr = R * (.86 + rnd() * .2); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    const path = new Path2D();
    pts.forEach(([x, y], i) => { const [nx, ny] = pts[(i + 1) % n]; const mx = (x + nx) / 2, my = (y + ny) / 2; i ? path.quadraticCurveTo(x, y, mx, my) : (path.moveTo((pts[n - 1][0] + x) / 2, (pts[n - 1][1] + y) / 2), path.quadraticCurveTo(x, y, mx, my)); });
    path.closePath();
    const bg = g.createRadialGradient(-R * .35, -R * .4, R * .1, 0, 0, R * 1.1);
    bg.addColorStop(0, '#c9b8a6'); bg.addColorStop(.5, '#8b7866'); bg.addColorStop(1, '#3f3229');
    g.fillStyle = bg; g.fill(path);
    g.save(); g.clip(path);
    for (let i = 0; i < 4; i++) { const a = rnd() * TAU, d = rnd() * R * .6, cr = R * (.1 + rnd() * .14); g.fillStyle = 'rgba(40,28,22,.35)'; g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, cr, 0, TAU); g.fill(); }
    ballShade(g, R);
    g.restore();
    g.strokeStyle = 'rgba(20,14,30,.75)'; g.lineWidth = Math.max(1, R * .07); g.stroke(path);
  });
}
function sunSprites(R) {
  const glow = mkCanvas(R * 7, R * 7, (g, s) => {
    g.translate(s / 2, s / 2);
    const gl = g.createRadialGradient(0, 0, R * .9, 0, 0, R * 3.4);
    gl.addColorStop(0, 'rgba(255,190,90,.55)'); gl.addColorStop(.35, 'rgba(255,120,70,.18)'); gl.addColorStop(1, 'rgba(255,90,78,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(0, 0, R * 3.4, 0, TAU); g.fill();
  });
  const rays = mkCanvas(R * 4.4, R * 4.4, (g, s) => {
    g.translate(s / 2, s / 2);
    for (let i = 0; i < 14; i++) {
      g.rotate(TAU / 14);
      const len = R * (1.55 + (i % 3) * .22);
      const gr = g.createLinearGradient(0, R * .8, 0, len);
      gr.addColorStop(0, 'rgba(255,214,120,.5)'); gr.addColorStop(1, 'rgba(255,150,80,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(-R * .16, R * .8); g.lineTo(0, len); g.lineTo(R * .16, R * .8); g.closePath(); g.fill();
    }
  });
  const body = mkCanvas(R * 2.2 + 4, R * 2.2 + 4, (g, s) => {
    g.translate(s / 2, s / 2);
    const bg = g.createRadialGradient(-R * .25, -R * .3, R * .05, 0, 0, R);
    bg.addColorStop(0, '#fffbe8'); bg.addColorStop(.35, '#ffe08a'); bg.addColorStop(.75, '#ff9a4a'); bg.addColorStop(1, '#e8502c');
    g.fillStyle = bg; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
    const rnd = rng(Math.round(R * 7));
    g.save(); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
    for (let i = 0; i < 26; i++) { const a = rnd() * TAU, d = rnd() * R, cr = R * (.05 + rnd() * .08); g.fillStyle = `rgba(255,${200 + rnd() * 55 | 0},150,.22)`; g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, cr, 0, TAU); g.fill(); }
    g.restore();
    g.strokeStyle = 'rgba(255,240,200,.7)'; g.lineWidth = Math.max(1, R * .04); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
  });
  return { glow, rays, body };
}
function holeSprites(R) {
  const D = R * 4.4;
  const disk = mkCanvas(D * 2, D * 2, (g, s) => {
    g.translate(s / 2, s / 2);
    const gr = g.createRadialGradient(0, 0, R * 1.05, 0, 0, D);
    gr.addColorStop(0, 'rgba(255,240,210,.95)'); gr.addColorStop(.12, 'rgba(255,190,120,.8)'); gr.addColorStop(.32, 'rgba(239,127,176,.55)');
    gr.addColorStop(.6, 'rgba(181,156,255,.25)'); gr.addColorStop(1, 'rgba(120,90,220,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, D, 0, TAU); g.fill();
    const rnd = rng(Math.round(R * 13));
    g.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const r0 = R * 1.3 + rnd() * (D - R * 1.5), a0 = rnd() * TAU, len = .6 + rnd() * 1.4;
      g.strokeStyle = rnd() < .5 ? `rgba(255,220,170,${.18 + rnd() * .3})` : `rgba(255,150,200,${.12 + rnd() * .25})`;
      g.lineWidth = Math.max(1, R * (.05 + rnd() * .1));
      g.beginPath();
      for (let k = 0; k <= 12; k++) { const tt = k / 12, a = a0 + tt * len, rr = r0 * (1 - tt * .18); k ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      g.stroke();
    }
  });
  const core = mkCanvas(R * 3.2, R * 3.2, (g, s) => {
    g.translate(s / 2, s / 2);
    const gl = g.createRadialGradient(0, 0, R * .95, 0, 0, R * 1.55);
    gl.addColorStop(0, 'rgba(255,230,200,.9)'); gl.addColorStop(.3, 'rgba(245,204,74,.35)'); gl.addColorStop(1, 'rgba(245,204,74,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(0, 0, R * 1.55, 0, TAU); g.fill();
    g.fillStyle = '#020108'; g.beginPath(); g.arc(0, 0, R * 1.02, 0, TAU); g.fill();
  });
  return { disk, core, D };
}
function starSprite(R, T) {
  return mkCanvas(R * 4.4, R * 4.4, (g, s) => {
    g.translate(s / 2, s / 2);
    const gl = g.createRadialGradient(0, 0, 0, 0, 0, R * 2.1);
    gl.addColorStop(0, hexA(mix(T.gold, T.paper, .3), .6)); gl.addColorStop(1, hexA(mix(T.gold, T.paper, .3), 0));
    g.fillStyle = gl; g.beginPath(); g.arc(0, 0, R * 2.1, 0, TAU); g.fill();
    g.fillStyle = mix(T.gold, '#ffffff', .45); g.strokeStyle = T.gold; g.lineWidth = Math.max(1, R * .12);
    g.beginPath();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU - Math.PI / 2, rr = i % 2 ? R * .32 : R; i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    g.closePath(); g.fill(); g.stroke();
  });
}

/* ===================== the view ===================== */
export default {
  css: 'probe',
  mount(ctx) {
    const { store, audio, fx, U, cat } = ctx;
    const reduce = ctx.reduce;
    ctx.root.classList.add('full');
    ctx.pauseSky();
    const them = U.them.name, me = U.me.name;
    const cargo = CARGO[U.occ] || 'message';
    const FAIL = failLines(U, cargo);
    const lineFor = Lv => (U.occ === 'belated' && Lv.belated) || Lv.line;
    const planetName = (them.length <= 12 ? poss(them) + ' planet' : 'Your planet').toUpperCase();
    const pilot = cat.getDesign();
    // theme colors for the art
    const T = { ...TWILIGHT, ...(U.theme || {}) };
    const C = {
      gold: rgbOf(T.gold), rose: rgbOf(T.rose), hud: rgbOf(T.hud), lilac: rgbOf(T.lilac), paper: rgbOf(T.paper), sky: rgbOf(T.sky),
      cream: rgbOf(mix(T.gold, T.paper, .45)), peach: rgbOf(T.peach),
    };

    // the select card's story: who sent what, and (only for belated birthdays) the late launch
    function storyLine() {
      if (U.occ === 'belated') return `${poss(me)} ${cargo} missed its launch window, so you’re flying it in yourself.`;
      if (U.gentle) return `${me} packed ${an(cargo)} into a little probe. Fly it home to your planet, the one in the propeller hat.`;
      return `${me} packed ${an(cargo)} into a little probe, and you’re the pilot. Fly it home to your planet, the one in the propeller hat.`;
    }

    /* ---------- persistence ---------- */
    const getStars = () => { const o = store.get(KEY, {}); return o && typeof o === 'object' ? { ...o } : {}; };
    const isDone = (i, o = getStars()) => o[String(i)] != null;
    const isOpen = (i, o = getStars()) => i === 0 || isDone(i - 1, o);
    const nextLevel = () => { const o = getStars(); for (let i = 0; i < N; i++) if (isOpen(i, o) && !isDone(i, o)) return i; let last = 0; for (let i = 0; i < N; i++) if (isOpen(i, o)) last = i; return last; };

    /* ---------- DOM ---------- */
    const bgCv = h('canvas', { class: 'pr-bg', 'aria-hidden': 'true' });
    const cv = h('canvas', { role: 'img', 'aria-label': 'Space, planets and the probe' });
    const levelsBtn = h('button', { class: 'icon-btn pr-lvbtn', type: 'button', 'aria-label': 'Mission select' });
    levelsBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg>';
    const kTitle = h('span', { class: 'kicker' }), nTitle = h('b');
    const starSlots = [0, 1, 2].map(() => h('i', { text: '✦' }));
    const bestEl = h('small');
    const attEl = h('span', { class: 'pr-att' });
    const info = h('div', { class: 'pr-info' }, levelsBtn,
      h('div', { class: 'pr-title' }, kTitle, nTitle),
      h('div', { class: 'pr-meta' }, h('span', { class: 'pr-stars', 'aria-label': 'Stars this flight' }, starSlots), bestEl, attEl));
    const lineEl = h('p', { class: 'pr-line' });
    const angOut = h('output', { class: 'pr-read' }), powOut = h('output', { class: 'pr-read' });
    const mkBtn = (label, svgPath, extra) => { const b = h('button', { class: 'icon-btn pr-nudge', type: 'button', 'aria-label': label }); b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${svgPath}"/></svg>`; if (extra) b.classList.add(extra); return b; };
    const ccwBtn = mkBtn('Rotate aim counterclockwise', 'M2.5 4.5v5h5M4.1 14a8 8 0 1 0 1.9-8.3L2.5 9.5');
    const cwBtn = mkBtn('Rotate aim clockwise', 'M21.5 4.5v5h-5M19.9 14a8 8 0 1 1-1.9-8.3l3.5 3.8');
    const minusBtn = mkBtn('Less power', 'M5 12h14');
    const plusBtn = mkBtn('More power', 'M12 5v14M5 12h14');
    const launchBtn = h('button', { class: 'btn hud solid pr-go', type: 'button' }, 'Launch');
    const retryBtn = h('button', { class: 'btn rose big pr-retry', type: 'button', hidden: true, 'aria-label': 'Retry this mission' }, icon('replay'), 'Retry');
    const ctrl = h('div', { class: 'pr-ctrl' },
      h('div', { class: 'pr-grp' }, h('span', { class: 'pr-lbl', text: 'Aim' }), h('div', { class: 'pr-row' }, ccwBtn, angOut, cwBtn)),
      h('div', { class: 'pr-grp' }, h('span', { class: 'pr-lbl', text: 'Power' }), h('div', { class: 'pr-row' }, minusBtn, powOut, plusBtn)),
      launchBtn, retryBtn);
    const top = h('div', { class: 'pr-top' }, info);
    const bot = h('div', { class: 'pr-bot' }, lineEl, ctrl);
    const msg = h('div', { class: 'pr-msg', role: 'status', 'aria-live': 'polite' });
    const card = h('div', { class: 'pr-card', 'aria-hidden': 'true' });
    const tip = h('div', { class: 'pr-tip', 'aria-hidden': 'true', hidden: true }, 'Hold to fast-forward');
    const rot = h('p', { class: 'pr-rot', hidden: true }, h('span', { 'aria-hidden': 'true', text: '⟳' }), ' Psst: turn your phone sideways for a bigger universe.');
    const stage = h('div', { class: 'stage-wrap pr-stage' }, bgCv, cv, rot, top, bot, msg, card, tip);
    const wrap = h('div', { class: 'pr' }, stage);
    ctx.root.append(wrap);
    const g = cv.getContext('2d');

    /* ---------- state ---------- */
    let li = 0, L = LEVELS[0];
    let mode = 'select';          // select | aim | flight | ended | done
    let aim = { a: 0, p: .5 };
    let preview = null, flight = null, attempts = 0, paused = false;
    let worldStep = 0, rewindFrom = 0, rewindT = 0;
    let drag = null, ff = false, ffPointer = null;
    let t = 0, shake = 0, landT = -1, flash = 0;
    let parts = [];
    let overlay = null;
    let shownStars = new Set();
    let endFx = null;              // {cause, t0, x, y, ...}
    let seenHint = store.get('game.probe.hinted', false);
    let lastTick = 0;

    /* ---------- layout ---------- */
    let dpr = 1, sw = 800, sh = 450, S = .5, wx = 0, wy = 0, ww = 800, wh = 450, lmode = 'tb';
    const X = x => wx + x * S, Y = y => wy + y * S;
    let spr = null, dust = [];

    function layout() {
      const bar = ctx.frame && ctx.frame.el.querySelector('.wbar');
      const barH = bar ? bar.offsetHeight : 58;
      const m = innerWidth < 600 ? 6 : 12;
      const sa = insets();
      wrap.style.padding = `${m}px ${m + sa.r}px ${m + sa.b}px ${m + sa.l}px`;
      sh = Math.max(250, Math.floor(innerHeight - barH - m * 2 - sa.b));
      stage.style.height = sh + 'px';
      sw = stage.clientWidth || (innerWidth - m * 2 - sa.l - sa.r);
      // option A: bars above/below the world
      wrap.dataset.mode = 'tb'; bot.prepend(lineEl);
      for (const el of [top, bot]) el.removeAttribute('style');
      const T = top.offsetHeight, B = bot.offsetHeight;
      const sTB = Math.min(sw / W, (sh - T - B) / H);
      // option B: columns left/right (phones in landscape)
      const C = clamp(Math.round(sw * .17), 128, 176);
      const sSide = Math.min((sw - C * 2) / W, sh / H);
      if (sSide > sTB * 1.12) {
        lmode = 'side'; S = sSide; ww = W * S; wh = H * S;
        wx = C + ((sw - C * 2) - ww) / 2; wy = (sh - wh) / 2;
        wrap.dataset.mode = 'side'; top.append(lineEl);
        top.style.width = Math.floor(wx) + 'px';
        bot.style.width = Math.floor(sw - wx - ww) + 'px';
      } else {
        lmode = 'tb'; S = sTB; ww = W * S; wh = H * S;
        wx = (sw - ww) / 2;
        const spare = sh - (T + wh + B);
        if (sw < 600 && spare > 140) {
          // tall phones: title up top, controls docked at the bottom by the thumbs,
          // and the world floating in the space between
          const hint = sh > sw * 1.3 ? 50 : 6, y0 = hint + T, y1 = sh - B - 4;
          wy = y0 + Math.max(0, (y1 - y0 - wh) / 2);
          top.style.top = Math.floor(hint) + 'px';
          bot.style.top = Math.floor(y1) + 'px';
        } else {
          const oy = Math.max(0, spare / 2);
          wy = oy + T;
          top.style.top = Math.floor(oy) + 'px';
          bot.style.top = Math.floor(wy + wh) + 'px';
        }
      }
      rot.hidden = !(lmode === 'tb' && sw < 600 && sh > sw * 1.3 && (sh - (wh + top.offsetHeight + bot.offsetHeight)) / 2 > 70);
      stage.style.setProperty('--wx', wx + 'px'); stage.style.setProperty('--wy', wy + 'px');
      stage.style.setProperty('--ww', ww + 'px'); stage.style.setProperty('--wh', wh + 'px');
      dpr = Math.min(devicePixelRatio || 1, 2);
      for (const c of [cv, bgCv]) { c.width = Math.round(sw * dpr); c.height = Math.round(sh * dpr); c.style.width = sw + 'px'; c.style.height = sh + 'px'; }
      buildArt();
    }

    /* ---------- art for the current level at the current size ---------- */
    function buildArt() {
      const k = S * dpr;
      const seed0 = li * 97 + 11;
      spr = {
        bodies: L.bodies.map((b, i) => {
          if (b.k === 'rock') return { img: rockSprite(b.r * k, seed0 + i * 7), rot: (rng(seed0 + i)() - .5) * .6 };
          if (b.k === 'sun') return sunSprites(b.r * k);
          if (b.k === 'hole') return holeSprites(b.r * k);
          return { img: planetSprite(b.r * k, b.look || (b.k === 'moon' ? 'moon' : 'lilac'), b.ring, seed0 + i * 13) };
        }),
        home: homeSprite(L.home.r * k, seed0 + 3),
        target: targetSprite(L.target.r * k, T, pilot),
        star: starSprite(Math.max(7 * dpr, STAR_R * k * .95), T),
      };
      // static background: deep space, nebula, gravity-well rings, world frame
      const rnd = rng(li * 31 + 5);
      {
        const c = bgCv.getContext('2d');
        c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, sw, sh);
        const base = c.createLinearGradient(0, 0, 0, sh);
        base.addColorStop(0, mix(T.night, '#000000', .45)); base.addColorStop(.6, mix(T.night, T.night2, .5)); base.addColorStop(1, mix(T.night2, T.dusk, .35));
        c.fillStyle = base; c.fillRect(0, 0, sw, sh);
        const neb = [[C.rose, .13], [C.lilac, .14], [C.hud, .07], [C.gold, .05], [C.sky, .07]];
        for (let i = 0; i < 6; i++) {
          const [col, a] = neb[i % neb.length];
          const x = rnd() * sw, y = rnd() * sh, r = (.25 + rnd() * .4) * Math.max(sw, sh);
          const gr = c.createRadialGradient(x, y, 0, x, y, r);
          gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(.5, `rgba(${col},${a * .4})`); gr.addColorStop(1, `rgba(${col},0)`);
          c.fillStyle = gr; c.fillRect(0, 0, sw, sh);
        }
        // a faint dust lane
        c.save(); c.translate(sw / 2, sh / 2); c.rotate(-.35 + rnd() * .7);
        const lane = c.createLinearGradient(0, -sh * .2, 0, sh * .2);
        lane.addColorStop(0, 'rgba(255,255,255,0)'); lane.addColorStop(.5, 'rgba(230,210,255,.035)'); lane.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = lane; c.fillRect(-sw, -sh * .2, sw * 2, sh * .4); c.restore();
        // tiny far galaxies
        for (let i = 0; i < 3; i++) {
          const x = rnd() * sw, y = rnd() * sh, r = 6 + rnd() * 10;
          c.save(); c.translate(x, y); c.rotate(rnd() * 3); c.scale(1, .35);
          const gg = c.createRadialGradient(0, 0, 0, 0, 0, r); gg.addColorStop(0, 'rgba(255,240,220,.35)'); gg.addColorStop(1, 'rgba(255,240,220,0)');
          c.fillStyle = gg; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.restore();
        }
        // gravity wells: faint concentric rings
        c.setLineDash([2, 6]);
        for (const b of L.bodies) {
          if (!b.mu || b.orbit) continue;
          const R = Math.min(Math.sqrt(b.mu / 40), b.r * 4.6);
          for (let k2 = 1; k2 <= 3; k2++) {
            const rr = b.r + (R - b.r) * k2 / 3;
            c.strokeStyle = b.k === 'hole' ? `rgba(181,156,255,${.12 - k2 * .025})` : b.k === 'sun' ? `rgba(255,190,110,${.11 - k2 * .025})` : `rgba(${C.paper},${.09 - k2 * .02})`;
            c.lineWidth = 1; c.beginPath(); c.arc(X(b.x), Y(b.y), rr * S, 0, TAU); c.stroke();
          }
        }
        for (const b of L.bodies) if (b.orbit) {
          const ocx = X(b.orbit.cx), ocy = Y(b.orbit.cy), oR = b.orbit.R * S, dir = Math.sign(b.orbit.period);
          c.strokeStyle = 'rgba(210,205,235,.32)'; c.setLineDash([3, 7]); c.lineWidth = 1.2;
          c.beginPath(); c.arc(ocx, ocy, oR, 0, TAU); c.stroke(); c.setLineDash([]);
          // little chevrons showing which way the moon will go
          c.strokeStyle = 'rgba(210,205,235,.55)'; c.lineWidth = 1.4;
          for (let q = 0; q < 6; q++) {
            const a = (q / 6) * TAU + .3, x = ocx + Math.cos(a) * oR, y = ocy - Math.sin(a) * oR;
            const tx = -Math.sin(a) * dir, ty = -Math.cos(a) * dir, nx = Math.cos(a), ny = -Math.sin(a), k3 = 4;
            c.beginPath(); c.moveTo(x - tx * k3 + nx * k3, y - ty * k3 + ny * k3); c.lineTo(x + tx * k3 * .6, y + ty * k3 * .6); c.lineTo(x - tx * k3 - nx * k3, y - ty * k3 - ny * k3); c.stroke();
          }
        }
        c.setLineDash([]);
        // mission-control corner brackets around the world
        c.strokeStyle = `rgba(${C.gold},.38)`; c.lineWidth = 1.2;
        const bl = Math.min(22, ww * .04);
        for (const [x, y, sx, sy] of [[wx, wy, 1, 1], [wx + ww, wy, -1, 1], [wx, wy + wh, 1, -1], [wx + ww, wy + wh, -1, -1]]) {
          c.beginPath(); c.moveTo(x, y + sy * bl); c.lineTo(x, y); c.lineTo(x + sx * bl, y); c.stroke();
        }
        // far star dust (static)
        const r2 = rng(li * 7 + 1), n = Math.round(sw * sh / 2600);
        for (let i = 0; i < n; i++) {
          const x = r2() * sw, y = r2() * sh, rr = .3 + r2() * .7;
          const tint = r2(); const col = tint < .1 ? C.gold : tint < .2 ? C.rose : tint < .27 ? C.hud : C.paper;
          c.fillStyle = `rgba(${col},${.25 + r2() * .4})`; c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill();
        }
      }
      // near star dust: drifts with a little parallax, drawn as dots each frame
      const r3 = rng(li * 7 + 102), n3 = Math.round(sw * sh / 9000);
      dust = [];
      for (let i = 0; i < n3; i++) {
        const tint = r3(); const col = tint < .1 ? C.gold : tint < .2 ? C.rose : tint < .27 ? C.hud : C.paper;
        dust.push({ x: r3() * sw, y: r3() * sh, s: 1 + r3() * 1.6, c: `rgba(${col},${.45 + r3() * .45})` });
      }
    }

    /* ---------- HUD ---------- */
    function paintHUD() {
      kTitle.textContent = `Mission ${String(li + 1).padStart(2, '0')} / ${N}`;
      nTitle.textContent = L.name;
      lineEl.textContent = '“' + lineFor(L) + '”';
      lineEl.append(h('span', { text: ' — ' + me }));
      const best = getStars()[String(li)];
      bestEl.textContent = best != null ? `Best ${best}/3` : 'Not delivered yet';
      paintStars(); paintAim(); paintAtt(); paintButtons();
    }
    function paintStars() {
      const got = flight ? flight.r.stars.filter((s, i) => shownStars.has(s)).length : 0;
      starSlots.forEach((el, i) => el.classList.toggle('on', i < got));
    }
    function paintAim() { angOut.textContent = fmtA(aim.a); powOut.textContent = fmtP(aim.p); }
    function paintAtt() { attEl.textContent = attempts ? `Launch ${attempts}` : 'Ready'; }
    function paintButtons() {
      const aiming = mode === 'aim';
      launchBtn.hidden = !aiming; retryBtn.hidden = aiming || mode === 'select' || mode === 'landed';
      retryBtn.classList.toggle('solid', mode === 'ended' && flight && !flight.r.ok);
      retryBtn.classList.toggle('pulse', mode === 'ended' && flight && !flight.r.ok);
      for (const b of [ccwBtn, cwBtn, minusBtn, plusBtn]) b.disabled = mode === 'select' || mode === 'done';
    }
    function say(text, cls) {
      msg.textContent = text; msg.className = 'pr-msg on' + (cls ? ' ' + cls : '');
    }
    const hush = () => { msg.className = 'pr-msg'; };
    function titleCard() {
      card.replaceChildren(h('span', { class: 'kicker gold', text: `Mission ${String(li + 1).padStart(2, '0')}` }), h('b', { text: L.name }));
      card.classList.remove('on'); void card.offsetWidth; card.classList.add('on');
    }

    /* ---------- aiming ---------- */
    function setAim(a, p, quiet) {
      if (mode === 'ended') retry(true);
      if (mode !== 'aim') return;
      aim.a = Math.round(normA(a) * 10) / 10;
      aim.p = Math.round(clamp(p, MIN_POWER, 1) * 2000) / 2000;
      paintAim(); computePreview();
      if (!quiet && audio.sfxOn()) { const now = performance.now(); if (now - lastTick > 70) { lastTick = now; audio.blip({ f0: 900 + aim.p * 900, f1: 900 + aim.p * 900, dur: .025, vol: .025, type: 'triangle' }); } }
    }
    function computePreview() {
      if (mode !== 'aim' && !(drag)) { preview = null; return; }
      preview = simulate(L, aim.a, aim.p, { maxSteps: L.preview, record: true });
    }

    /* ---------- level flow ---------- */
    function startLevel(i) {
      li = clamp(i, 0, N - 1); L = LEVELS[li];
      attempts = 0; flight = null; endFx = null; parts = []; shownStars = new Set(); landT = -1;
      aim = { a: L.aim[0], p: L.aim[1] };
      worldStep = 0; rewindT = 0; mode = 'aim'; paused = false;
      closeOverlay(); hush(); tip.hidden = true;
      paintHUD(); layout(); computePreview(); titleCard();
      cv.setAttribute('aria-label', `Mission ${li + 1}: ${L.name}. The probe waits next to Mission Control. ${poss(them)} planet, the one wearing a propeller hat, is the target.`);
      audio.sfx('open');
    }
    function launch() {
      if (mode !== 'aim' || overlay) return null;
      const r = simulate(L, aim.a, aim.p, { record: true });
      flight = { r, step: 0, startT: t };
      shownStars = new Set(); endFx = null; landT = -1;
      attempts++; mode = 'flight'; worldStep = 0; rewindT = 0; preview = null;
      store.stat('launches');
      if (!seenHint) { seenHint = true; store.set('game.probe.hinted', true); }
      audio.sfx('launch');
      const a = aim.a * RAD;
      for (let i = 0; i < (reduce ? 4 : 12); i++) {
        const sp = 30 + Math.random() * 70, aa = a + Math.PI + (Math.random() - .5) * 1.4;
        parts.push({ x: L.start.x, y: L.start.y, vx: Math.cos(aa) * sp, vy: -Math.sin(aa) * sp, life: .7, max: .7, c: `rgba(${C.paper},`, s: 6 + Math.random() * 6, k: 'smoke' });
      }
      hush(); paintHUD();
      ctx.timeout(() => { if (mode === 'flight' && flight && flight.r.steps > 240) tip.hidden = false; }, 1600);
      return r;
    }
    function retry(silent) {
      if (mode === 'select' || mode === 'done' || mode === 'landed') return;
      if (mode === 'flight' || mode === 'ended') { rewindFrom = worldStep; rewindT = rewindFrom > 0 ? .45 : 0; }
      flight = null; endFx = null; landT = -1; mode = 'aim'; ff = false; tip.hidden = true;
      shownStars = new Set(); hush(); paintHUD(); computePreview();
      if (!silent) audio.sfx('click');
    }
    function primary() {
      if (mode === 'aim') launch();
      else if (mode === 'ended') retry();
    }

    /* ---------- flight end ---------- */
    function endFlight() {
      const r = flight.r;
      mode = r.ok ? 'landed' : 'ended'; tip.hidden = true; ff = false;
      const [ex, ey] = [r.path[r.steps * 2], r.path[r.steps * 2 + 1]];
      endFx = { cause: r.cause, t0: t, x: ex, y: ey, at: r.at };
      if (r.ok) { delivered(r); return; }
      const lines = FAIL[r.cause] || FAIL.lost;
      say(lines[(attempts + li) % lines.length], 'bad');
      if (r.cause === 'sun') { burst(ex, ey, reduce ? 10 : 34, ['255,214,120', '255,150,80', '255,90,78'], 220); flash = .6; audio.sfx('boom'); shakeIt(10); }
      else if (r.cause === 'hole') { if (audio.sfxOn()) { audio.blip({ f0: 520, f1: 50, dur: .9, vol: .16, type: 'sawtooth' }); audio.hiss({ dur: .9, freq: 600, q: .6, vol: .25, sweepTo: 90 }); } }
      else if (r.cause === 'lost' || r.cause === 'timeout') { audio.sfx('lose'); }
      else { burst(ex, ey, reduce ? 10 : 30, [C.paper, '255,190,110', C.rose], 200); smoke(ex, ey, reduce ? 3 : 8); audio.sfx('crash'); shakeIt(8); }
      paintHUD();
    }
    function shakeIt(n) { if (!reduce) shake = Math.max(shake, n); }
    function burst(x, y, n, cols, sp) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = sp * (.3 + Math.random() * .9);
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .5 + Math.random() * .6, max: 1.1, c: `rgba(${cols[i % cols.length]},`, s: 2 + Math.random() * 3, k: 'spark' });
      }
      if (parts.length > 260) parts.splice(0, parts.length - 260);
    }
    function smoke(x, y, n) { for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * 40, vy: (Math.random() - .5) * 40, life: 1, max: 1, c: 'rgba(200,190,230,', s: 10 + Math.random() * 12, k: 'smoke' }); }
    function collectFx(si) {
      const [sx, sy] = L.stars[si];
      burst(sx, sy, reduce ? 6 : 18, [C.cream, C.gold, '255,255,255'], 160);
      parts.push({ x: sx, y: sy, vx: 0, vy: 0, life: .5, max: .5, c: `rgba(${C.cream},`, s: STAR_R, k: 'ring' });
      audio.sfx('sparkle');
      paintStars();
    }

    /* ---------- delivered ---------- */
    function delivered(r) {
      const got = r.stars.length;
      landT = t;
      const sx = stage.getBoundingClientRect();
      const px = sx.left + X(L.target.x), py = sx.top + Y(L.target.y);
      burst(endFx.x, endFx.y, reduce ? 8 : 26, [C.rose, C.cream, C.lilac, C.paper], 180);
      audio.sfx('win'); ctx.timeout(() => audio.chime(), 380);
      fx.confetti(reduce ? 0 : 90, { x: px, y: py, spread: Math.min(260, ww * .4), stars: true });
      store.stat('deliveries');
      // stars + stardust
      const all = getStars(), k = String(li), prev = all[k];
      let earn = 0, improved = false, first = prev == null;
      if (first) { earn = 5 + 3 * got; all[k] = got; }
      else if (got > prev) { earn = 3 * (got - prev); all[k] = got; improved = true; }
      if (first || improved) store.set(KEY, all);
      bestEl.textContent = `Best ${all[k]}/3`;
      const count = Object.keys(all).length;
      let finale = false;
      if (count >= N && !store.get('game.probe.bonus', false)) { store.set('game.probe.bonus', Date.now()); finale = true; }
      // stardust right away (flies off the target planet), so leaving early never loses it
      const total = earn + (finale ? 30 : 0);
      if (total) ctx.award(total, { x: px, y: py - 10 });
      ctx.timeout(() => showDelivered({ got, earn, improved, first, count, finale }), 1100);
    }
    function showDelivered({ got, earn, improved, first, count, finale }) {
      if (!ctx.alive() || mode !== 'landed') return;
      mode = 'done'; paintButtons();
      const bigStars = h('div', { class: 'pr-bigstars', 'aria-label': `${got} of 3 stars` },
        [0, 1, 2].map(i => h('span', { class: i < got ? 'on' : '', style: { animationDelay: (.15 + i * .18) + 's' }, text: '✦' })));
      const earnEl = h('p', { class: 'pr-earn', text: earn ? `+${earn} ✦ stardust` : (first ? '' : 'No new stars this time, no new stardust. Still a delivery!') });
      const isLast = li === N - 1;
      const nextBtn = h('button', { class: 'btn solid', type: 'button', text: isLast ? 'All missions' : 'Next mission →' });
      nextBtn.onclick = () => { audio.sfx('click'); isLast ? openSelect() : startLevel(li + 1); };
      const replayBtn = h('button', { class: 'btn', type: 'button', text: 'Replay' });
      replayBtn.onclick = () => { audio.sfx('click'); startLevel(li); };
      const lvBtn = h('button', { class: 'btn ghost', type: 'button', text: 'Missions' });
      lvBtn.onclick = () => { audio.sfx('click'); openSelect(); };
      const body = h('div', { class: 'ocard pr-done' },
        h('p', { class: 'kicker', text: `Mission ${String(li + 1).padStart(2, '0')} · ${L.name}` }),
        h('h3', { text: 'Delivered!' }),
        bigStars,
        improved ? h('span', { class: 'newbest', text: 'New best' }) : null,
        h('p', { text: `${STAR_LINES[got]} ${attempts === 1 ? 'First launch, too.' : `Delivered on launch ${attempts}.`}` }),
        earnEl,
        finale ? h('div', { class: 'pr-finale' },
          h('b', { text: 'All ten missions delivered.' }),
          h('p', { text: U.gentle ? `Every single one landed. Bonus: +30 ✦` : `Every single one landed. Mission control (${me}) is a little emotional. Bonus: +30 ✦` })) : null,
        h('div', { class: 'row' }, nextBtn, replayBtn, lvBtn),
        h('a', { class: 'pr-maplink', href: '#/map', text: 'Back to the map' }));
      showOverlay(body);
      nextBtn.focus({ preventScroll: true });
      if (finale) ctx.timeout(() => { fx.confetti(reduce ? 0 : 200, { stars: true }); audio.sfx('perfect'); }, 900);
      if (count >= 6) ctx.timeout(() => ctx.stamp(), finale ? 2600 : 1500);
    }

    /* ---------- overlays ---------- */
    function showOverlay(cardEl) {
      closeOverlay();
      overlay = h('div', { class: 'overlay pr-ov' }, cardEl);
      stage.append(overlay);
    }
    function closeOverlay() { if (overlay) { overlay.remove(); overlay = null; } }
    function openSelect() {
      mode = 'select'; paused = false; flight = null; endFx = null; preview = null; hush(); tip.hidden = true;
      const o = getStars();
      const nxt = nextLevel();
      li = nxt; L = LEVELS[li];
      paintHUD(); layout();
      const nDone = Object.keys(o).length, nStars = Object.values(o).reduce((a, b) => a + (+b || 0), 0);
      const grid = h('div', { class: 'pr-grid', role: 'list' });
      LEVELS.forEach((Lv, i) => {
        const done = isDone(i, o), open = isOpen(i, o), st = done ? o[String(i)] : 0;
        const b = h('button', {
          class: `pr-lv${done ? ' done' : ''}${open ? '' : ' locked'}${i === nxt && open ? ' next' : ''}`, type: 'button', role: 'listitem',
          disabled: open ? null : true,
          'aria-label': `Mission ${i + 1}, ${Lv.name}. ${open ? (done ? `Delivered, ${st} of 3 stars.` : 'Not delivered yet.') : 'Locked: deliver the previous mission first.'}`,
        },
          h('span', { class: 'n', text: String(i + 1).padStart(2, '0') }),
          h('span', { class: 'nm', text: Lv.name }),
          open ? h('span', { class: 'st', 'aria-hidden': 'true' }, [0, 1, 2].map(k => h('i', { class: k < st ? 'on' : '', text: '✦' }))) : h('span', { class: 'lk' }, icon('lock')));
        if (open) b.onclick = () => { audio.sfx('click'); startLevel(i); };
        grid.append(b);
      });
      const art = h('div', { class: 'pr-art' });
      art.innerHTML = cat.catSVG(pilot, { spin: false });
      const playBtn = h('button', { class: 'btn solid big', type: 'button', text: nDone ? (nDone >= N ? 'Fly again' : `Continue: mission ${nxt + 1}`) : 'Launch mission 1' });
      playBtn.onclick = () => { audio.sfx('click'); startLevel(nDone >= N ? 0 : nxt); };
      const stamped = store.hasStamp('probe');
      const body = h('div', { class: 'ocard pr-sel' },
        h('div', { class: 'pr-selhead' }, art,
          h('div', {},
            h('p', { class: 'kicker rose', text: `Deep-space mail · from ${me}` }),
            h('h3', { text: ctx.world.name || 'Probe Delivery' }))),
        h('p', { class: 'pr-how', text: storyLine() + ' Pull back like a slingshot (start the drag anywhere) and let go. Gravity does the rest. Grab the ✦ on the way if you’re feeling fancy.' }),
        h('div', { class: 'keys', 'aria-label': 'Keyboard controls' },
          h('kbd', { text: '← →' }), 'aim', h('kbd', { text: '↑ ↓' }), 'power', h('kbd', { text: 'Space' }), 'launch', h('kbd', { text: 'R' }), 'retry', h('kbd', { text: 'Esc' }), 'pause'),
        h('p', { class: 'pr-prog' },
          h('span', { text: `${nDone}/${N} delivered` }), h('span', { text: `${nStars}/${N * 3} ✦` }),
          h('span', { class: stamped ? 'ok' : '', text: stamped ? '✓ Stamp collected' : `Stamp goal: 6 deliveries` })),
        grid,
        h('div', { class: 'pr-foot' }, playBtn, h('a', { class: 'pr-maplink', href: '#/map', text: 'Back to the map' })));
      showOverlay(body);
      ctx.peek(art, 'probe-hide', { right: '-12px', bottom: '-2px', rotate: 16, size: 26 });
      playBtn.focus({ preventScroll: true });
    }
    function pause() {
      if (paused || mode === 'select' || mode === 'done' || mode === 'landed') return;
      paused = true; drag = null; ff = false; stage.classList.remove('grabbing');
      const resume = h('button', { class: 'btn solid', type: 'button', text: 'Resume' });
      resume.onclick = () => unpause();
      const rt = h('button', { class: 'btn', type: 'button', text: 'Retry' });
      rt.onclick = () => { unpause(); retry(); };
      const lv = h('button', { class: 'btn ghost', type: 'button', text: 'Missions' });
      lv.onclick = () => { paused = false; openSelect(); };
      showOverlay(h('div', { class: 'ocard' }, h('h3', { text: 'Paused' }), h('p', { text: 'The probe is holding position. Mission control is getting a snack.' }),
        h('div', { class: 'row' }, resume, rt, lv), h('a', { class: 'pr-maplink', href: '#/map', text: 'Back to the map' })));
      resume.focus({ preventScroll: true });
    }
    function unpause() { paused = false; closeOverlay(); }

    /* ---------- input: drag the slingshot ---------- */
    const maxDrag = () => clamp(Math.min(sw * .42, sh * .32, 200), 90, 200);
    const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const nearStart = (x, y) => Math.hypot(x - X(L.start.x), y - Y(L.start.y)) <= Math.max(60, probeU() * 2 + 30);
    // Relative slingshot: the pull is measured from where the finger went down,
    // so a drag can start anywhere (near the probe or not) and always has room.
    function dragAim(x, y) {
      const dx = drag.sx - x, dy = drag.sy - y, len = Math.hypot(dx, dy);
      drag.len = len; drag.x = X(L.start.x) - dx; drag.y = Y(L.start.y) - dy;
      if (len < 14) { drag.cancel = true; preview = null; return; }
      drag.cancel = false;
      setAim(Math.atan2(-dy, dx) / RAD, len / maxDrag());
    }
    ctx.on(stage, 'pointerdown', e => {
      if (overlay || paused || e.button > 0) return;
      if (e.target.closest('button, a, output')) return;
      const [x, y] = local(e);
      if (mode === 'aim' || mode === 'ended' || (mode === 'flight' && nearStart(x, y))) {
        if (mode !== 'aim') retry(true);
        drag = { id: e.pointerId, prev: { ...aim }, len: 0, sx: x, sy: y, x: X(L.start.x), y: Y(L.start.y), cancel: true };
        try { stage.setPointerCapture(e.pointerId); } catch {}
        e.preventDefault();
        stage.classList.add('grabbing');
        audio.ac();
        return;
      }
      if (mode === 'flight') { ff = true; ffPointer = e.pointerId; tip.hidden = true; }
    });
    ctx.on(stage, 'pointermove', e => {
      const [x, y] = local(e);
      if (drag && e.pointerId === drag.id) { dragAim(x, y); return; }
      if (e.pointerType === 'mouse') stage.classList.toggle('grab', !overlay && (mode === 'aim' || mode === 'ended') && !e.target.closest('button, a'));
    });
    const endDrag = (e, cancel) => {
      if (ff && e.pointerId === ffPointer) { ff = false; ffPointer = null; }
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag; drag = null; stage.classList.remove('grabbing');
      try { stage.releasePointerCapture(e.pointerId); } catch {}
      if (cancel || d.cancel || mode !== 'aim') {
        aim = d.prev; paintAim(); computePreview();
        return;
      }
      launch();
    };
    ctx.on(stage, 'pointerup', e => endDrag(e, false));
    ctx.on(stage, 'pointercancel', e => endDrag(e, true));
    ctx.on(stage, 'contextmenu', e => e.preventDefault());

    // buttons: tap = one nudge, hold = keep nudging
    function nudger(btn, fn) {
      let tId = 0, iId = 0;
      const stop = () => { clearTimeout(tId); clearInterval(iId); tId = iId = 0; };
      btn.addEventListener('pointerdown', e => { if (e.button > 0) return; e.preventDefault(); fn(); stop(); tId = setTimeout(() => { iId = setInterval(fn, 55); }, 360); });
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(ev, stop);
      btn.addEventListener('click', e => { if (e.detail === 0) fn(); });
      ctx.cleanup(stop);
    }
    nudger(ccwBtn, () => setAim(aim.a + .5, aim.p));
    nudger(cwBtn, () => setAim(aim.a - .5, aim.p));
    nudger(plusBtn, () => setAim(aim.a, aim.p + .01));
    nudger(minusBtn, () => setAim(aim.a, aim.p - .01));
    launchBtn.onclick = () => { audio.ac(); launch(); };
    retryBtn.onclick = () => retry();
    levelsBtn.onclick = () => { audio.sfx('click'); openSelect(); };

    ctx.on(window, 'keydown', e => {
      const tg = e.target;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
      if (document.querySelector('.modal-wrap')) return;
      if (overlay) {
        if (e.key === 'Escape' && paused) { e.preventDefault(); unpause(); }
        return;
      }
      const onBtn = tg && (tg.tagName === 'BUTTON' || tg.tagName === 'A');
      const fine = e.shiftKey;
      switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); if (mode === 'aim' || mode === 'ended') setAim(aim.a + (fine ? .1 : .5), aim.p); break;
        case 'ArrowRight': e.preventDefault(); if (mode === 'aim' || mode === 'ended') setAim(aim.a - (fine ? .1 : .5), aim.p); break;
        case 'ArrowUp': e.preventDefault(); if (mode === 'aim' || mode === 'ended') setAim(aim.a, aim.p + (fine ? .0025 : .01)); break;
        case 'ArrowDown': e.preventDefault(); if (mode === 'aim' || mode === 'ended') setAim(aim.a, aim.p - (fine ? .0025 : .01)); break;
        case ' ': case 'Enter': if (onBtn) return; e.preventDefault(); audio.ac(); primary(); break;
        case 'r': case 'R': if (e.metaKey || e.ctrlKey) return; retry(); break;
        case 'f': case 'F': if (mode === 'flight') { ff = !ff; tip.hidden = true; } break;
        case 'Escape': e.preventDefault(); pause(); break;
        default: break;
      }
    });
    ctx.on(document, 'visibilitychange', () => { if (document.hidden && mode === 'flight' && !overlay) pause(); });

    /* ---------- update ---------- */
    function update(dt) {
      const s = dt / 1000;
      if (rewindT > 0) { rewindT = Math.max(0, rewindT - s); worldStep = rewindFrom * (rewindT / .45) ** 2; }
      if (mode === 'flight' && flight) {
        const r = flight.r;
        flight.step = Math.min(r.steps, flight.step + s * HZ * (ff ? 3.2 : 1));
        worldStep = flight.step;
        r.starSteps.forEach((st, k) => { const si = r.stars[k]; if (st <= flight.step && !shownStars.has(si)) { shownStars.add(si); collectFx(si); } });
        if (flight.step < 40 && !reduce) {
          const i = Math.floor(flight.step), x = r.path[i * 2], y = r.path[i * 2 + 1];
          const j = Math.min(r.steps, i + 1), vx = r.path[j * 2] - x, vy = r.path[j * 2 + 1] - y, vl = Math.hypot(vx, vy) || 1;
          parts.push({ x: x - vx / vl * 10, y: y - vy / vl * 10, vx: -vx / vl * 60 + (Math.random() - .5) * 30, vy: -vy / vl * 60 + (Math.random() - .5) * 30, life: .35, max: .35, c: 'rgba(255,214,120,', s: 2.5, k: 'spark' });
        }
        if (flight.step >= r.steps) endFlight();
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.life -= s;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        p.x += p.vx * s; p.y += p.vy * s; p.vx *= .97; p.vy *= .97;
      }
      if (shake > 0) shake = Math.max(0, shake - s * 30);
      if (flash > 0) flash = Math.max(0, flash - s * 1.6);
    }

    /* ---------- render ---------- */
    const probeU = () => Math.max(7.5, PROBE_R * S * 1.5);
    const TR = hexRgb(T.rose), TG = hexRgb(T.gold);   // the flight trail fades rose → gold
    function drawProbe(x, y, ang, u, alpha = 1, scale = 1) {
      g.save(); g.globalAlpha = alpha; g.translate(x, y); g.rotate(-ang); g.scale(scale, scale);
      if (Math.cos(ang) < 0) g.scale(1, -1);
      g.lineJoin = 'round'; g.lineCap = 'round';
      const lw = Math.max(1, u * .14);
      // fins
      g.fillStyle = T.lilac; g.strokeStyle = INK; g.lineWidth = lw;
      for (const sy of [-1, 1]) { g.beginPath(); g.moveTo(-u * .5, sy * u * .45); g.lineTo(-u * 1.15, sy * u * .95); g.lineTo(-u * 1.0, sy * u * .3); g.closePath(); g.fill(); g.stroke(); }
      // body capsule
      const body = new Path2D();
      body.moveTo(-u * 1.0, -u * .56); body.lineTo(u * .35, -u * .56); body.quadraticCurveTo(u * 1.18, -u * .56, u * 1.18, 0);
      body.quadraticCurveTo(u * 1.18, u * .56, u * .35, u * .56); body.lineTo(-u * 1.0, u * .56); body.quadraticCurveTo(-u * 1.22, 0, -u * 1.0, -u * .56); body.closePath();
      const bgr = g.createLinearGradient(0, -u * .56, 0, u * .56); bgr.addColorStop(0, '#fffaf0'); bgr.addColorStop(1, '#ddcdb9');
      g.fillStyle = bgr; g.fill(body);
      g.save(); g.clip(body); g.fillStyle = T.rose; g.fillRect(-u * .62, -u, u * .2, u * 2); g.restore();
      g.strokeStyle = INK; g.lineWidth = lw; g.stroke(body);
      // porthole
      g.fillStyle = T.hud; g.beginPath(); g.arc(u * .42, 0, u * .27, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.arc(u * .36, -u * .08, u * .08, 0, TAU); g.fill();
      // antenna + blinking light
      g.strokeStyle = INK; g.lineWidth = lw * .8; g.beginPath(); g.moveTo(0, -u * .56); g.lineTo(u * .05, -u * .92); g.stroke();
      const on = Math.sin(t * 7) > .2;
      if (on) { g.fillStyle = 'rgba(255,90,78,.35)'; g.beginPath(); g.arc(u * .05, -u * .98, u * .34, 0, TAU); g.fill(); }
      g.fillStyle = on ? '#ff5a4e' : '#6a2d34'; g.beginPath(); g.arc(u * .05, -u * .98, u * .15, 0, TAU); g.fill();
      // ribbon bow (it carries a message)
      g.fillStyle = mix(T.rose, '#d0206a', .35); g.strokeStyle = INK; g.lineWidth = lw * .75;
      g.beginPath(); g.moveTo(-u * .52, -u * .6); g.lineTo(-u * .9, -u * .98); g.lineTo(-u * .76, -u * .86); g.lineTo(-u * .7, -u * 1.02); g.lineTo(-u * .5, -u * .6); g.fill(); g.stroke();
      for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(-u * .45 + sx * u * .22, -u * .72, u * .22, u * .13, sx * .5, 0, TAU); g.fill(); g.stroke(); }
      g.fillStyle = mix(T.rose, '#ffffff', .3); g.beginPath(); g.arc(-u * .45, -u * .68, u * .09, 0, TAU); g.fill(); g.stroke();
      g.restore();
    }
    function drawFlame(x, y, ang, u, k) {
      g.save(); g.translate(x, y); g.rotate(-ang);
      const len = u * (1.1 + Math.random() * .6) * k;
      const gr = g.createLinearGradient(-u, 0, -u - len, 0); gr.addColorStop(0, 'rgba(255,240,180,.95)'); gr.addColorStop(1, 'rgba(255,120,80,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(-u * .95, -u * .28); g.lineTo(-u - len, 0); g.lineTo(-u * .95, u * .28); g.closePath(); g.fill();
      g.restore();
    }
    function drawImgC(img, x, y, rot, sc = 1) {
      const w = img.width / dpr * sc, hh = img.height / dpr * sc;
      if (!rot) { g.drawImage(img, x - w / 2, y - hh / 2, w, hh); return; }
      g.save(); g.translate(x, y); g.rotate(rot); g.drawImage(img, -w / 2, -hh / 2, w, hh); g.restore();
    }
    function label(text, x, y, col) {
      const fs = clamp(11 * S + 3, 7.5, 11);
      g.font = `600 ${fs}px "JetBrains Mono", ui-monospace, monospace`;
      g.textAlign = 'center'; g.textBaseline = 'top';
      const hw = g.measureText(text).width / 2 + 3;   // keep long names inside the world
      g.fillStyle = col; g.fillText(text, clamp(x, wx + hw, Math.max(wx + hw, wx + ww - hw)), y);
    }

    function render() {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const shx = shake ? (Math.random() - .5) * shake : 0, shy = shake ? (Math.random() - .5) * shake : 0;
      g.clearRect(0, 0, sw, sh);
      // parallax star dust
      const probePos = currentProbe();
      const pxo = X(probePos.x) - sw / 2, pyo = Y(probePos.y) - sh / 2;
      const ox = reduce ? 0 : -t * 6 - pxo * .03, oy = reduce ? 0 : -pyo * .03;
      for (const d of dust) {
        const x = ((d.x + ox) % sw + sw) % sw, y = ((d.y + oy) % sh + sh) % sh;
        g.fillStyle = d.c; g.fillRect(x, y, d.s, d.s);
      }
      g.save(); g.translate(shx, shy);

      // gravity ripples flowing inward
      if (!reduce) {
        g.lineWidth = 1;
        for (const b of L.bodies) {
          if (!b.mu || b.mu < 2e6) continue;
          const [bx, by] = bodyPos(b, worldStep);
          const Rin = Math.min(Math.sqrt(b.mu / 40), b.r * 4.6);
          for (let k = 0; k < 2; k++) {
            const f = (t * .22 + k * .5 + (b.x || 0) * .001) % 1;
            const rr = b.r + (Rin - b.r) * (1 - f);
            const a = .16 * Math.pow(f, 1.6) * (1 - f) * 3;
            g.strokeStyle = b.k === 'hole' ? `rgba(181,156,255,${a})` : b.k === 'sun' ? `rgba(255,190,110,${a})` : `rgba(${C.paper},${a * .7})`;
            g.beginPath(); g.arc(X(bx), Y(by), rr * S, 0, TAU); g.stroke();
          }
        }
      }

      // home: Mission Control + docking arm
      drawImgC(spr.home, X(L.home.x), Y(L.home.y));
      {
        const hx = X(L.home.x), hy = Y(L.home.y), sx = X(L.start.x), sy = Y(L.start.y);
        const dx = sx - hx, dy = sy - hy, d = Math.hypot(dx, dy) || 1, R = L.home.r * S;
        g.strokeStyle = `rgba(${C.paper},.55)`; g.lineWidth = Math.max(1, S * 2.2);
        g.beginPath(); g.moveTo(hx + dx / d * R * .95, hy + dy / d * R * .95); g.lineTo(sx - dx / d * probeU() * .9, sy - dy / d * probeU() * .9); g.stroke();
        label('MISSION CONTROL', hx, hy + R + 6, `rgba(${C.sky},.85)`);
      }
      // bodies
      L.bodies.forEach((b, i) => {
        const sp = spr.bodies[i];
        const [bx, by] = bodyPos(b, worldStep);
        const x = X(bx), y = Y(by);
        if (b.k === 'rock') drawImgC(sp.img, x, y, t * sp.rot * (reduce ? 0 : 1));
        else if (b.k === 'sun') {
          const pulse = reduce ? 1 : 1 + Math.sin(t * 2.2 + i) * .05;
          g.globalAlpha = .9; drawImgC(sp.glow, x, y, 0, pulse); g.globalAlpha = 1;
          drawImgC(sp.rays, x, y, reduce ? 0 : t * .12);
          drawImgC(sp.body, x, y);
        } else if (b.k === 'hole') {
          g.globalAlpha = .55; drawImgC(sp.disk, x, y, reduce ? 0 : -t * .35, 1.08); g.globalAlpha = 1;
          drawImgC(sp.disk, x, y, reduce ? 0 : t * .9, .8);
          drawImgC(sp.core, x, y);
          // a few bits spiralling in
          if (!reduce) for (let k = 0; k < 7; k++) {
            const f = (t * .25 + k / 7) % 1, rr = b.r * S * (1.1 + 3.2 * (1 - f)), a = k * 2.4 + f * 9;
            g.fillStyle = `rgba(255,220,180,${.7 * f})`; g.beginPath(); g.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, Math.max(.8, 1.4 * S * 2), 0, TAU); g.fill();
          }
        } else drawImgC(sp.img, x, y);
      });
      // the recipient's planet (+ landing wobble) and its spinning propeller
      {
        const x = X(L.target.x), y = Y(L.target.y), R = L.target.r * S;
        const wob = landT >= 0 && !reduce ? 1 + Math.sin(Math.min(1, (t - landT) / .7) * Math.PI * 3) * .07 * (1 - Math.min(1, (t - landT) / .7)) : 1;
        drawImgC(spr.target, x, y, 0, wob);
        g.save(); g.translate(x, y); g.scale(wob, wob); capTransform(g, R);
        const ph = t * (landT >= 0 ? 26 : 9), sxp = reduce ? 1 : Math.abs(Math.cos(ph)) * .9 + .1;
        g.translate(100, 18); g.scale(sxp, 1);
        g.fillStyle = pilot.prop; g.strokeStyle = INK; g.lineWidth = 4;
        for (const dx of [-29, 29]) { g.beginPath(); g.ellipse(dx, 0, 31, 7.5, 0, 0, TAU); g.fill(); g.stroke(); }
        g.scale(1 / sxp, 1);
        g.fillStyle = pilot.hub; g.lineWidth = 3.5; g.beginPath(); g.arc(0, 0, 6.5, 0, TAU); g.fill(); g.stroke();
        g.restore();
        label(planetName, x, y + R * 1.05 + 6, `rgba(${rgbOf(mix(T.rose, T.paper, .35))},.92)`);
      }
      // ✦ stars
      const prevStars = preview ? new Set(preview.stars) : null;
      L.stars.forEach(([sx0, sy0], si) => {
        if (shownStars.has(si)) return;
        const x = X(sx0), y = Y(sy0);
        const tw = reduce ? 1 : 1 + Math.sin(t * 3 + si * 2) * .1;
        drawImgC(spr.star, x, y, reduce ? 0 : Math.sin(t * .8 + si) * .25, tw);
        if (prevStars && prevStars.has(si)) {
          g.strokeStyle = `rgba(${C.hud},.9)`; g.lineWidth = 1.5;
          g.beginPath(); g.arc(x, y, Math.max(9, (STAR_R + 6) * S) + Math.sin(t * 6) * 1.5, 0, TAU); g.stroke();
        }
      });

      // predicted path: dotted, fading
      if (preview && mode === 'aim') {
        const r = preview, n = r.steps, gap = 7.5;
        let lx = X(r.path[0]), ly = Y(r.path[1]);
        for (let i = 1; i <= n; i++) {
          const x = X(r.path[i * 2]), y = Y(r.path[i * 2 + 1]);
          if ((x - lx) * (x - lx) + (y - ly) * (y - ly) < gap * gap && i < n) continue;
          lx = x; ly = y;
          const f = i / n, a = .85 * Math.pow(1 - f, .7) + .08;
          g.fillStyle = `rgba(${C.hud},${a})`;
          g.beginPath(); g.arc(x, y, Math.max(1.1, 2.6 * (1 - f * .6) * Math.min(1.4, S * 2)), 0, TAU); g.fill();
        }
        if (r.cause !== 'preview' && r.cause !== 'target') {
          const ex = X(r.end[0]), ey = Y(r.end[1]), q = 5;
          g.strokeStyle = 'rgba(255,90,78,.95)'; g.lineWidth = 2;
          g.beginPath(); g.moveTo(ex - q, ey - q); g.lineTo(ex + q, ey + q); g.moveTo(ex + q, ey - q); g.lineTo(ex - q, ey + q); g.stroke();
        } else if (r.cause === 'target') {
          g.strokeStyle = `rgba(${C.hud},.95)`; g.lineWidth = 2;
          g.beginPath(); g.arc(X(r.end[0]), Y(r.end[1]), 7 + Math.sin(t * 6) * 1.5, 0, TAU); g.stroke();
        }
      }

      // trail
      if (flight) {
        const r = flight.r, cur = Math.floor(flight.step), from = Math.max(0, cur - 130);
        g.lineCap = 'round';
        for (let i = from + 2; i <= cur; i += 2) {
          const f = (i - from) / (cur - from + 1);
          g.strokeStyle = `rgba(${Math.round(TR[0] + (TG[0] - TR[0]) * f)},${Math.round(TR[1] + (TG[1] - TR[1]) * f)},${Math.round(TR[2] + (TG[2] - TR[2]) * f)},${f * .75})`;
          g.lineWidth = Math.max(1, probeU() * .55 * f);
          g.beginPath(); g.moveTo(X(r.path[(i - 2) * 2]), Y(r.path[(i - 2) * 2 + 1])); g.lineTo(X(r.path[i * 2]), Y(r.path[i * 2 + 1])); g.stroke();
        }
      }

      // slingshot band
      const u = probeU();
      const px = X(L.start.x), py = Y(L.start.y);
      if (drag && mode === 'aim' && !drag.cancel) {
        const md = maxDrag(), len = Math.min(drag.len, md), dx = drag.x - px, dy = drag.y - py, dl = Math.hypot(dx, dy) || 1;
        const ex = px + dx / dl * len, ey = py + dy / dl * len;
        const nx = -dy / dl, ny = dx / dl, pw = len / md;
        const col = pw < .5 ? C.hud : pw < .85 ? C.gold : C.rose;
        g.strokeStyle = `rgba(${col},.9)`; g.lineCap = 'round';
        g.lineWidth = Math.max(1.5, 4.5 - pw * 3);
        g.beginPath(); g.moveTo(px + nx * u * 1.5, py + ny * u * 1.5); g.quadraticCurveTo((px + ex) / 2 + nx * u * .4, (py + ey) / 2 + ny * u * .4, ex, ey);
        g.moveTo(px - nx * u * 1.5, py - ny * u * 1.5); g.quadraticCurveTo((px + ex) / 2 - nx * u * .4, (py + ey) / 2 - ny * u * .4, ex, ey); g.stroke();
        g.fillStyle = `rgba(${col},1)`; g.beginPath(); g.arc(ex, ey, Math.max(4, u * .55), 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; g.beginPath(); g.arc(px, py, md, -Math.PI / 2, -Math.PI / 2 + TAU * pw); g.stroke();
      }

      // the probe
      if (mode === 'aim' || mode === 'select') {
        const bob = reduce ? 0 : Math.sin(t * 2.4) * u * .12;
        if (mode === 'aim' && !drag && !seenHint && li < 2) {
          const pr = (t * 1.1) % 1;
          g.strokeStyle = `rgba(${C.gold},${.8 * (1 - pr)})`; g.lineWidth = 2;
          g.beginPath(); g.arc(px, py, u * 1.6 + pr * 26, 0, TAU); g.stroke();
          g.font = '600 11px "JetBrains Mono", ui-monospace, monospace'; g.textAlign = 'center'; g.textBaseline = 'bottom';
          const tw2 = g.measureText('DRAG BACK, LET GO').width / 2 + 6;
          g.fillStyle = `rgba(${C.gold},.95)`; g.fillText('DRAG BACK, LET GO', clamp(px, tw2, sw - tw2), py - u * 1.6 - 30);
        }
        drawProbe(px, py + bob, aim.a * RAD, u);
      } else if (flight) {
        const r = flight.r, i = Math.min(r.steps, Math.floor(flight.step)), j = Math.max(0, i - 2);
        const x = r.path[i * 2], y = r.path[i * 2 + 1];
        const vx = x - r.path[j * 2], vy = y - r.path[j * 2 + 1];
        const ang = Math.atan2(-vy, vx);
        if (mode === 'flight') {
          if (flight.step < 30) drawFlame(X(x), Y(y), ang, u, 1 - flight.step / 30);
          drawProbe(X(x), Y(y), ang, u);
          // off-screen indicator
          const ox = X(x), oy = Y(y);
          if (ox < 0 || oy < 0 || ox > sw || oy > sh) {
            const cx = clamp(ox, 10, sw - 10), cy = clamp(oy, 10, sh - 10), a2 = Math.atan2(oy - cy, ox - cx);
            g.fillStyle = `rgba(${C.gold},.9)`; g.save(); g.translate(cx, cy); g.rotate(a2);
            g.beginPath(); g.moveTo(8, 0); g.lineTo(-4, -6); g.lineTo(-4, 6); g.closePath(); g.fill(); g.restore();
          }
        } else if (endFx) {
          const age = t - endFx.t0;
          if (endFx.cause === 'target') {
            // parked on the surface, nose in
            const a3 = Math.atan2(-(L.target.y - endFx.y), L.target.x - endFx.x);
            drawProbe(X(endFx.x), Y(endFx.y), a3, u);
          } else if (endFx.cause === 'hole' && age < 1.1) {
            const b = L.bodies[endFx.at], f = Math.min(1, age / 1.05);
            const d0x = endFx.x - b.x, d0y = endFx.y - b.y, a0 = Math.atan2(d0y, d0x) + f * f * 7, rr = Math.hypot(d0x, d0y) * (1 - f);
            drawProbe(X(b.x + Math.cos(a0) * rr), Y(b.y + Math.sin(a0) * rr), -a0 * 3, u, 1 - f * .6, 1 - f * .85);
          } else if (endFx.cause === 'timeout') {
            drawProbe(X(x), Y(y), ang, u, .55 + Math.sin(t * 2) * .2);
          } else if (endFx.cause === 'lost' && age < .6) {
            drawProbe(X(x), Y(y), ang, u, 1 - age / .6);
          }
        }
      }

      // particles
      for (const p of parts) {
        const a = Math.max(0, p.life / p.max);
        if (p.k === 'ring') {
          g.strokeStyle = p.c + (a * .9) + ')'; g.lineWidth = 2;
          g.beginPath(); g.arc(X(p.x), Y(p.y), (p.s + (1 - a) * 40) * S + 4, 0, TAU); g.stroke();
        } else if (p.k === 'smoke') {
          g.fillStyle = p.c + (a * .22) + ')'; g.beginPath(); g.arc(X(p.x), Y(p.y), (p.s + (1 - a) * 14) * Math.max(S, .35), 0, TAU); g.fill();
        } else {
          g.fillStyle = p.c + a + ')'; g.beginPath(); g.arc(X(p.x), Y(p.y), Math.max(.8, p.s * Math.max(S, .4) * (.4 + a * .6)), 0, TAU); g.fill();
        }
      }
      g.restore();

      // mission clock
      if (flight) {
        g.font = '600 10px "JetBrains Mono", ui-monospace, monospace'; g.textAlign = 'right'; g.textBaseline = 'bottom';
        g.fillStyle = `rgba(${C.paper},.55)`;
        g.fillText(`T+${(flight.step / HZ).toFixed(2)}s${ff ? '  ▶▶' : ''}`, wx + ww - 8, wy + wh - 6);
      }
      if (flash > 0) { g.fillStyle = `rgba(255,220,160,${flash * .45})`; g.fillRect(0, 0, sw, sh); }
    }
    function currentProbe() {
      if (flight) { const i = Math.min(flight.r.steps, Math.floor(flight.step)); return { x: flight.r.path[i * 2], y: flight.r.path[i * 2 + 1] }; }
      return { x: L.start.x, y: L.start.y };
    }

    /* ---------- go ---------- */
    let rt = 0;
    const relayout = () => { clearTimeout(rt); rt = setTimeout(() => { if (ctx.alive()) layout(); }, 90); };
    ctx.on(window, 'resize', relayout);
    ctx.on(window, 'orientationchange', relayout);
    ctx.cleanup(() => clearTimeout(rt));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (ctx.alive()) layout(); });
    openSelect();
    if (Object.keys(getStars()).length >= 6) ctx.stamp();
    // While a card is open the scene behind it holds still (it sits under a
    // blur, and redrawing it every frame there is wasted battery).
    let rms = 0, frozen = 0;
    ctx.raf((now, dt) => {
      t += dt / 1000;
      if (!paused) update(dt);
      if (overlay) { if (frozen++ > 1) return; } else frozen = 0;
      const t0 = performance.now();
      render();
      rms = rms * .9 + (performance.now() - t0) * .1;
    });

    // test hook (used by the automated checks; harmless otherwise)
    const api = {
      levels: N,
      renderMs: () => rms,
      state: () => ({ li, mode, aim: { ...aim }, attempts, paused, stars: getStars(), step: flight ? flight.step : null, cause: flight ? flight.r.cause : null, layout: { lmode, S, wx, wy, ww, wh, sw, sh } }),
      start: i => { startLevel(i); return api.state(); },
      launch: (a, p) => { if (mode === 'ended') retry(true); if (mode !== 'aim') return null; aim = { a: +a, p: +p }; paintAim(); const r = launch(); return r && { ok: r.ok, cause: r.cause, stars: r.stars.length, steps: r.steps }; },
      skip: () => { if (mode === 'flight' && flight) { flight.step = flight.r.steps - .001; } return true; },
      select: () => openSelect(),
      sim: (i, a, p) => { const r = simulate(LEVELS[i], a, p); return { ok: r.ok, cause: r.cause, stars: r.stars.length, steps: r.steps }; },
      probeScreen: () => { const b = stage.getBoundingClientRect(); return { x: b.left + X(L.start.x), y: b.top + Y(L.start.y), maxDrag: maxDrag() }; },
    };
    window.__probe = api;
    ctx.cleanup(() => { if (window.__probe === api) delete window.__probe; });
  },
};
