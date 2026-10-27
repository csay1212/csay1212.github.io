// Star Registry: draw your own constellation, name it, and take home an
// official (not remotely official) certificate. Registered constellations
// glow in the sky behind the universe's map.
import { h, clamp, downloadCanvas, shareOrCopy } from '../core/dom.js';
import { poss } from './almanac-data.js';

const MAX_STARS = 16, MAX_SAVED = 8, CERT_W = 1600, CERT_H = 1131;
const GREEK = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π'];
const LATIN = { cat: 'Felis', bunny: 'Lepus', bear: 'Ursa', dog: 'Canis', fox: 'Vulpes', mouse: 'Mus', frog: 'Rana' };
const SPECIES_LABEL = { cat: 'cat', bunny: 'bunny', bear: 'bear', dog: 'pup', fox: 'fox', mouse: 'mouse', frog: 'frog' };

// Set per universe when the world mounts (the module is shared between universes).
let REG = { code: 'SR-0000', mmdd: '0000', studio: 'Star Registry', verse: 'universe', defaultName: 'The Little Lantern', them: '', me: '', gentle: false, gold: '#f5cc4a', goldRGB: '245,204,74', night: '#0c0b24', night2: '#120f33', dusk: '#2a1d55', lilac: '181,156,255', sky: '159,211,255', rose: '239,127,176' };
const mixHex = (a, b, t) => { const p = x => { const m = /^#?([0-9a-f]{6})$/i.exec(x || ''); const n = m ? parseInt(m[1], 16) : 0; return [n >> 16, (n >> 8) & 255, n & 255]; }; const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const rgb = hex => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '255,255,255'; const n = parseInt(m[1], 16); return `${n >> 16},${(n >> 8) & 255},${n & 255}`; };
const initials = s => (s || '').split(/\s+/).filter(w => w && !/^(the|a|an|of|and|&)$/i.test(w)).map(w => w[0]).join('').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'X';
// the short form of a name for constellation names: "The Thursday Club" -> "Thursday", "Grandpa Walt" -> "Walt"
function shortName(n) {
  const w = (n || '').trim().split(/\s+/).filter(x => !/^(the|a|an)$/i.test(x));
  if (w.length > 1 && /^(grandpa|grandma|granny|nana|papa|mama|mom|dad|mum|aunt|auntie|uncle|cousin|mr\.?|mrs\.?|ms\.?|dr\.?|professor|coach|miss|sir|saint|st\.?)$/i.test(w[0])) return w[1];
  return w[0] || n || 'Star';
}

// Trace guides. The Big Dipper uses real sky positions (east on the left, like a star chart).
// The character guide is the recipient's own propeller-hat friend, with the right ears.
function makeGuides(species) {
  const sp = SPECIES_LABEL[species] ? species : 'cat';
  const ear = sp === 'bunny' ? [[-.36, -.68], [.36, -.68]] : ['bear', 'mouse', 'dog'].includes(sp) ? [[-.52, -.24], [.52, -.24]] : [[-.44, -.34], [.44, -.34]];
  return {
    dipper: {
      label: 'Big Dipper', fit: [.86, .6],
      pts: [[11.5, -6.25], [11.77, -.88], [4.33, 1.81], [1.23, -1.53], [-4.3, -.46], [-8.59, .57], [-11.97, 6.19]],
      edges: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]],
      labels: { 0: 'Dubhe', 6: 'Alkaid' }, mark: 0,
      done: 'The Big Dipper, traced. Sailors steered by that one.',
    },
    pal: {
      label: 'Propeller ' + SPECIES_LABEL[sp], fit: [.66, .8],
      pts: [[-.40, .02], ear[0], [-.18, -.14], [.18, -.14], ear[1], [.40, .02], [.30, .30], [0, .38], [-.30, .30],
        [0, -.34], [0, -.48], [-.28, -.53], [.28, -.53], [-.15, .06], [.15, .06], [0, .18]],
      edges: [[0, 1], [1, 2], [2, 9], [9, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0], [2, 3], [9, 10], [10, 11], [10, 12]],
      labels: {}, mark: -1,
      done: `A ${SPECIES_LABEL[sp]} in a propeller hat, in the actual sky. Lovely.`,
    },
  };
}

/* ---------------- small utilities ---------------- */
function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function fnv(str) { let x = 2166136261; for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
const pad = n => String(n).padStart(2, '0');
const r4 = v => Math.round(v * 10000) / 10000;
const slug = s => (s || '').toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'constellation';
const fmtDate = d => new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
const gauss = rnd => (rnd() + rnd() + rnd() - 1.5) / 1.5;

// pixel points -> normalized 0..1 inside the bounding box, aspect preserved, centered
function normalize(px) {
  const xs = px.map(p => p[0]), ys = px.map(p => p[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const w = maxx - minx, hh = maxy - miny, size = Math.max(w, hh) || 1;
  return px.map(([x, y]) => [r4((x - minx + (size - w) / 2) / size), r4((y - miny + (size - hh) / 2) / size)]);
}

// Everything on the certificate comes from a hash of the drawing.
function details(pts, edges) {
  const key = pts.map(p => p[0].toFixed(3) + ',' + p[1].toFixed(3)).join(';') + '|' + edges.map(e => e[0] + '-' + e[1]).join(',');
  const a = fnv(key), b = fnv('ra:' + key), c = fnv('dec:' + key), d = fnv('mag:' + key);
  const sign = c & 1 ? '+' : '−';
  const mag = (d % 46) / 10 - 1.5;
  // which star is the brightest, and a magnitude ranking for the Greek letters
  const order = pts.map((_, i) => i).sort((i, j) => fnv(key + i) - fnv(key + j));
  return {
    cat: REG.code + '-' + String(a % 1000).padStart(3, '0'),
    ra: `RA ${pad(b % 24)}h ${pad((b >>> 5) % 60)}m ${pad((b >>> 11) % 60)}s`,
    dec: `Dec ${sign}${pad((c >>> 1) % 90)}° ${pad((c >>> 8) % 60)}′`,
    mag: 'magnitude ' + (mag < 0 ? '−' : '+') + Math.abs(mag).toFixed(1),
    order,
    seed: a,
  };
}

/* ---------------- sprites ---------------- */
function starSprite(size, core = '#fffdf3', glow = '255,226,140') {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), m = size / 2;
  const rg = g.createRadialGradient(m, m, 0, m, m, m);
  rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(.08, core); rg.addColorStop(.22, `rgba(${glow},.55)`);
  rg.addColorStop(.5, `rgba(${glow},.12)`); rg.addColorStop(1, `rgba(${glow},0)`);
  g.fillStyle = rg; g.fillRect(0, 0, size, size);
  // four soft diffraction spikes
  g.globalCompositeOperation = 'lighter';
  for (const [dx, dy] of [[1, 0], [0, 1]]) {
    const lg = g.createLinearGradient(m - dx * m, m - dy * m, m + dx * m, m + dy * m);
    lg.addColorStop(0, 'rgba(255,240,200,0)'); lg.addColorStop(.5, 'rgba(255,245,215,.85)'); lg.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = lg;
    if (dx) g.fillRect(0, m - size * .012, size, size * .024); else g.fillRect(m - size * .012, 0, size * .024, size);
  }
  return c;
}
function dotSprite(size, rgb) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), m = size / 2;
  const rg = g.createRadialGradient(m, m, 0, m, m, m);
  rg.addColorStop(0, `rgba(${rgb},1)`); rg.addColorStop(.25, `rgba(${rgb},.6)`); rg.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = rg; g.fillRect(0, 0, size, size);
  return c;
}

/* ---------------- shared drawing: a sky disc with a constellation in it ---------------- */
function drawSkyDisc(g, cx, cy, r, pts, edges, opts = {}) {
  const det = opts.det || details(pts, edges);
  const rnd = mulberry32(det.seed || 7);
  g.save();
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  const bg = g.createRadialGradient(cx - r * .25, cy - r * .3, r * .05, cx, cy, r * 1.05);
  bg.addColorStop(0, REG.dusk); bg.addColorStop(.55, REG.night2); bg.addColorStop(1, REG.night);
  g.fillStyle = bg; g.fillRect(cx - r, cy - r, r * 2, r * 2);
  // a soft milky band
  g.save(); g.translate(cx, cy); g.rotate(-.6);
  for (let i = 0; i < 26; i++) {
    const x = (rnd() - .5) * r * 2.4, y = gauss(rnd) * r * .16, rr = r * (.18 + rnd() * .26);
    const mg = g.createRadialGradient(x, y, 0, x, y, rr);
    const col = rnd() < .5 ? REG.lilac : REG.sky;
    mg.addColorStop(0, `rgba(${col},.10)`); mg.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = mg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  g.restore();
  // faint chart grid
  if (opts.grid !== false) {
    g.strokeStyle = `rgba(${REG.sky},.10)`; g.lineWidth = Math.max(.6, r / 260);
    for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(cx, cy, r * k / 3.2, 0, Math.PI * 2); g.stroke(); }
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 6; g.beginPath(); g.moveTo(cx - Math.cos(a) * r, cy - Math.sin(a) * r); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.stroke(); }
  }
  // background stars
  const n = Math.round(r * r / 260);
  for (let i = 0; i < n; i++) {
    const x = cx + (rnd() * 2 - 1) * r, y = cy + (rnd() * 2 - 1) * r, s = rnd();
    g.fillStyle = `rgba(246,238,227,${(.18 + s * .6).toFixed(2)})`;
    const z = Math.max(.6, r / 300) * (s < .9 ? .8 : 1.6);
    g.fillRect(x, y, z, z);
  }
  // the constellation
  const size = r * 1.22;
  const P = pts.map(([x, y]) => [cx + (x - .5) * size, cy + (y - .5) * size]);
  const lw = Math.max(1, r / 110);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const strokeAll = () => { g.beginPath(); for (const [i, j] of edges) { if (!P[i] || !P[j]) continue; g.moveTo(P[i][0], P[i][1]); g.lineTo(P[j][0], P[j][1]); } g.stroke(); };
  g.strokeStyle = `rgba(${REG.goldRGB},.22)`; g.lineWidth = lw * 4; strokeAll();
  g.strokeStyle = `rgba(${REG.goldRGB},.85)`; g.lineWidth = lw * 1.3;
  if (opts.blur) { g.shadowColor = `rgba(${REG.goldRGB},.9)`; g.shadowBlur = lw * 6; }
  strokeAll();
  g.shadowBlur = 0;
  const spr = opts.sprite || starSprite(128);
  const rank = new Array(P.length); (det.order || []).forEach((idx, k) => { rank[idx] = k; });
  P.forEach(([x, y], i) => {
    const k = rank[i] ?? i;
    const s = r * (k === 0 ? .2 : k < 3 ? .15 : .115);
    g.drawImage(spr, x - s / 2, y - s / 2, s, s);
    if (opts.greek && k < GREEK.length) {
      g.font = `italic ${Math.round(r * .07)}px "Cormorant Garamond", Georgia, serif`;
      g.fillStyle = 'rgba(255,230,160,.85)'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText(GREEK[k], x + r * .035, y - r * .03);
    }
  });
  g.restore();
}

/* ---------------- the certificate ---------------- */
let noiseTile = null;
function paperNoise() {
  if (noiseTile) return noiseTile;
  const c = document.createElement('canvas'); c.width = c.height = 220;
  const g = c.getContext('2d'), id = g.createImageData(220, 220), rnd = mulberry32(1208);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = rnd();
    const dark = v < .5;
    id.data[i] = dark ? 110 : 255; id.data[i + 1] = dark ? 84 : 250; id.data[i + 2] = dark ? 40 : 235;
    id.data[i + 3] = Math.round(Math.abs(v - .5) * 34);
  }
  g.putImageData(id, 0, 0);
  noiseTile = c;
  return c;
}
async function fontsReady() {
  if (!document.fonts) return;
  const want = ['400 90px Italiana', '700 80px Caveat', 'italic 400 30px "Cormorant Garamond"', '600 30px "Cormorant Garamond"', '400 16px "JetBrains Mono"', '600 16px "JetBrains Mono"'];
  const all = Promise.all(want.map(f => document.fonts.load(f).catch(() => null))).then(() => document.fonts.ready);
  await Promise.race([all, new Promise(r => setTimeout(r, 3500))]);
}
function spaced(g, text, x, y, sp, align = 'center') {
  const chars = [...text];
  const widths = chars.map(ch => g.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const prev = g.textAlign; g.textAlign = 'left';
  chars.forEach((ch, i) => { g.fillText(ch, cx, y); cx += widths[i] + sp; });
  g.textAlign = prev;
  return total;
}
function fitFont(g, text, family, max, min, width) {
  let s = max;
  for (; s > min; s -= 2) { g.font = family(s); if (g.measureText(text).width <= width) break; }
  g.font = family(s); return s;
}
function goldGrad(g, x0, y0, x1, y1) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, '#9a6f1f'); gr.addColorStop(.22, '#e9c66a'); gr.addColorStop(.42, '#b8862b');
  gr.addColorStop(.62, '#f3da8a'); gr.addColorStop(.82, '#a87a22'); gr.addColorStop(1, '#d9b154');
  return gr;
}
function star4(g, x, y, r, fill) {
  g.beginPath();
  for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, rr = i % 2 ? r * .32 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fillStyle = fill; g.fill();
}
function star5(g, x, y, r, fill) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .42 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fillStyle = fill; g.fill();
}
// One corner ornament in local coordinates (corner at 0,0, pointing into the page).
function flourishHalf(g, gold) {
  g.strokeStyle = gold; g.lineCap = 'round';
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(22, 12); g.bezierCurveTo(70, 6, 122, 14, 162, 38); g.bezierCurveTo(190, 55, 182, 88, 156, 84);
  g.bezierCurveTo(136, 81, 138, 58, 156, 60); g.bezierCurveTo(166, 61, 168, 72, 160, 75); g.stroke();
  g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(30, 24); g.bezierCurveTo(64, 22, 96, 30, 118, 46); g.bezierCurveTo(132, 56, 126, 72, 112, 68); g.stroke();
  g.beginPath(); g.moveTo(178, 22); g.bezierCurveTo(196, 14, 214, 16, 226, 22); g.stroke();
  g.fillStyle = gold;
  for (const [x, y, rr] of [[232, 24, 3], [200, 46, 2.2], [96, 52, 2.2]]) { g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill(); }
  // a leaf on the scroll
  g.beginPath(); g.moveTo(78, 22); g.quadraticCurveTo(96, 4, 116, 12); g.quadraticCurveTo(98, 26, 78, 22); g.fill();
}
function cornerOrnament(g, gold) {
  flourishHalf(g, gold);
  g.save(); g.transform(0, 1, 1, 0, 0, 0); flourishHalf(g, gold); g.restore();
  // the corner star and a leaf on the diagonal
  star4(g, 28, 28, 20, gold);
  g.fillStyle = gold;
  g.beginPath(); g.moveTo(44, 44); g.quadraticCurveTo(70, 50, 84, 84); g.quadraticCurveTo(50, 70, 44, 44); g.fill();
  g.beginPath(); g.arc(96, 96, 3, 0, Math.PI * 2); g.fill();
}
function drawSeal(g, cx, cy, r) {
  // ribbon tails
  g.save();
  for (const s of [-1, 1]) {
    g.save(); g.translate(cx, cy); g.rotate(s * .38);
    const rg = g.createLinearGradient(-20, 0, 20, 0); rg.addColorStop(0, '#9c1f3a'); rg.addColorStop(.5, '#d8445e'); rg.addColorStop(1, '#9c1f3a');
    g.fillStyle = rg;
    g.beginPath(); g.moveTo(-20, r * .2); g.lineTo(20, r * .2); g.lineTo(20, r * 1.18); g.lineTo(0, r * 1.02); g.lineTo(-20, r * 1.18); g.closePath(); g.fill();
    g.restore();
  }
  // serrated starburst
  const n = 36;
  g.beginPath();
  for (let i = 0; i <= n * 2; i++) { const a = i * Math.PI / n, rr = i % 2 ? r * .9 : r; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  g.closePath();
  const sg = g.createRadialGradient(cx - r * .3, cy - r * .35, r * .1, cx, cy, r);
  sg.addColorStop(0, '#fff1bf'); sg.addColorStop(.45, '#e8c160'); sg.addColorStop(.85, '#b98a2c'); sg.addColorStop(1, '#94681b');
  g.fillStyle = sg; g.shadowColor = 'rgba(90,60,10,.35)'; g.shadowBlur = 14; g.shadowOffsetY = 4; g.fill();
  g.shadowBlur = 0; g.shadowOffsetY = 0;
  g.strokeStyle = 'rgba(110,74,18,.55)'; g.lineWidth = 1.2; g.stroke();
  g.strokeStyle = '#7a5514'; g.lineWidth = 2.4; g.beginPath(); g.arc(cx, cy, r * .8, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, r * .75, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 1.6; g.beginPath(); g.arc(cx, cy, r * .5, 0, Math.PI * 2); g.stroke();
  // ring text: the studio's name around the rim, sized so it always fits
  const txt = `${REG.studio.toUpperCase().slice(0, 34)} ✦ STAR REGISTRY ✦ `;
  const chars = [...txt];
  const fs = Math.max(7, Math.min(r * .135, (Math.PI * 2 * r * .625 / chars.length) / .64));
  g.font = `600 ${fs.toFixed(1)}px "JetBrains Mono", monospace`; g.fillStyle = '#5e400c'; g.textAlign = 'center'; g.textBaseline = 'middle';
  chars.forEach((ch, i) => {
    const a = -Math.PI / 2 + i / chars.length * Math.PI * 2;
    g.save(); g.translate(cx + Math.cos(a) * r * .625, cy + Math.sin(a) * r * .625); g.rotate(a + Math.PI / 2); g.fillText(ch, 0, 0); g.restore();
  });
  // center
  star5(g, cx, cy - r * .1, r * .26, '#7a5514');
  star5(g, cx, cy - r * .1, r * .18, '#f7dc8c');
  g.fillStyle = '#5e400c'; g.font = `600 ${Math.round(r * .12)}px "JetBrains Mono", monospace`;
  spaced(g, 'NO. ' + REG.mmdd, cx, cy + r * .28, 1.5);
  g.restore();
}

function spacedWidth(g, text, sp) { const ch = [...text]; return ch.reduce((a, c) => a + g.measureText(c).width, 0) + sp * (ch.length - 1); }
async function renderCertificate(cv, entry) {
  await fontsReady();
  cv.width = CERT_W; cv.height = CERT_H;
  const g = cv.getContext('2d');
  const W = CERT_W, H = CERT_H;
  const det = details(entry.pts, entry.edges);
  const INK = '#1d1a48', SOFT = '#4c4166', BROWN = '#8a6422';
  g.textBaseline = 'alphabetic';

  // paper
  const pg = g.createLinearGradient(0, 0, W, H);
  pg.addColorStop(0, '#fbf5e6'); pg.addColorStop(.5, '#f6ecd5'); pg.addColorStop(1, '#efe0bf');
  g.fillStyle = pg; g.fillRect(0, 0, W, H);
  const rnd = mulberry32(det.seed ^ 0x5eed);
  for (let i = 0; i < 14; i++) {
    const x = rnd() * W, y = rnd() * H, rr = 120 + rnd() * 260;
    const mg = g.createRadialGradient(x, y, 0, x, y, rr);
    mg.addColorStop(0, `rgba(196,160,96,${(.04 + rnd() * .05).toFixed(3)})`); mg.addColorStop(1, 'rgba(196,160,96,0)');
    g.fillStyle = mg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  g.fillStyle = g.createPattern(paperNoise(), 'repeat'); g.fillRect(0, 0, W, H);
  // fibers
  g.strokeStyle = 'rgba(150,120,70,.08)'; g.lineWidth = 1;
  for (let i = 0; i < 110; i++) {
    const x = rnd() * W, y = rnd() * H, l = 10 + rnd() * 28, a = rnd() * Math.PI;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * .5 + 4, y + Math.sin(a) * l * .5 - 3, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const vg = g.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, W * .72);
  vg.addColorStop(0, 'rgba(120,86,30,0)'); vg.addColorStop(1, 'rgba(120,86,30,.2)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);

  // watermark: a big faint compass star behind the text
  g.save(); g.globalAlpha = .05;
  star4(g, 1120, 600, 330, '#8a6422');
  g.globalAlpha = .035; g.translate(1120, 600); g.rotate(Math.PI / 4); star4(g, 0, 0, 230, '#8a6422');
  g.restore();

  // border: thick + thin gold lines with a row of tiny diamonds between, then an inner frame with notched corners
  const gold = goldGrad(g, 0, 0, W, H);
  g.strokeStyle = gold; g.lineWidth = 9; g.strokeRect(30, 30, W - 60, H - 60);
  g.lineWidth = 2.2; g.strokeRect(52, 52, W - 104, H - 104);
  g.fillStyle = gold;
  const dia = (x, y) => { g.beginPath(); g.moveTo(x, y - 3.4); g.lineTo(x + 3.4, y); g.lineTo(x, y + 3.4); g.lineTo(x - 3.4, y); g.closePath(); g.fill(); };
  for (let x = 58; x <= W - 58; x += 17) { dia(x, 42); dia(x, H - 42); }
  for (let y = 59; y <= H - 59; y += 17) { dia(42, y); dia(W - 42, y); }
  const I = 72, nr = 26;
  g.lineWidth = 1.4; g.beginPath();
  g.moveTo(I + nr, I); g.lineTo(W - I - nr, I); g.arc(W - I, I, nr, Math.PI, Math.PI / 2, true);
  g.lineTo(W - I, H - I - nr); g.arc(W - I, H - I, nr, -Math.PI / 2, Math.PI, true);
  g.lineTo(I + nr, H - I); g.arc(I, H - I, nr, 0, -Math.PI / 2, true);
  g.lineTo(I, I + nr); g.arc(I, I, nr, Math.PI / 2, 0, true);
  g.closePath(); g.stroke();
  // corner flourishes
  const corners = [[I + 8, I + 8, 1, 1], [W - I - 8, I + 8, -1, 1], [I + 8, H - I - 8, 1, -1], [W - I - 8, H - I - 8, -1, -1]];
  for (const [x, y, sx, sy] of corners) { g.save(); g.translate(x, y); g.scale(sx, sy); cornerOrnament(g, gold); g.restore(); }

  // header
  g.textAlign = 'center';
  g.fillStyle = BROWN;
  const head = `${REG.studio} Star Registry`.toUpperCase();
  let hs = 19, hsp = 7;
  g.font = `600 ${hs}px "JetBrains Mono", monospace`;
  while (spacedWidth(g, head, hsp) > 1040 && hs > 12) { hs -= 1; hsp = Math.max(2, hsp - .6); g.font = `600 ${hs}px "JetBrains Mono", monospace`; }
  const hw = spaced(g, head, W / 2, 146, hsp);
  star4(g, W / 2 - hw / 2 - 34, 139, 9, gold); star4(g, W / 2 + hw / 2 + 34, 139, 9, gold);
  g.fillStyle = INK;
  fitFont(g, 'Certificate of Star Registration', s => `400 ${s}px Italiana, Didot, Georgia, serif`, 92, 50, 1220);
  g.fillText('Certificate of Star Registration', W / 2, 238);
  // divider
  g.strokeStyle = gold; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(W / 2 - 260, 278); g.lineTo(W / 2 - 26, 278); g.moveTo(W / 2 + 26, 278); g.lineTo(W / 2 + 260, 278); g.stroke();
  star4(g, W / 2, 278, 14, gold);
  g.fillStyle = gold; for (const s of [-1, 1]) { g.beginPath(); g.arc(W / 2 + s * 272, 278, 3.4, 0, Math.PI * 2); g.fill(); }

  // the medallion: a sky disc inside an astrolabe ring
  const mx = 430, my = 552, mr = 196;
  g.save(); g.shadowColor = 'rgba(40,30,80,.35)'; g.shadowBlur = 30; g.shadowOffsetY = 10;
  g.fillStyle = '#efe2c4'; g.beginPath(); g.arc(mx, my, mr + 30, 0, Math.PI * 2); g.fill(); g.restore();
  g.fillStyle = 'rgba(138,100,34,.08)'; g.beginPath(); g.arc(mx, my, mr + 30, 0, Math.PI * 2); g.fill();
  drawSkyDisc(g, mx, my, mr, entry.pts, entry.edges, { det, blur: true, greek: true, sprite: starSprite(160) });
  g.strokeStyle = gold; g.lineWidth = 4; g.beginPath(); g.arc(mx, my, mr + 1, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 3; g.beginPath(); g.arc(mx, my, mr + 30, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 1; g.beginPath(); g.arc(mx, my, mr + 35, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = BROWN;
  for (let i = 0; i < 120; i++) {
    const a = i / 120 * Math.PI * 2, long = i % 5 === 0;
    const r0 = mr + 4, r1 = mr + (long ? 13 : 8);
    g.lineWidth = long ? 1.6 : 1;
    g.beginPath(); g.moveTo(mx + Math.cos(a) * r0, my + Math.sin(a) * r0); g.lineTo(mx + Math.cos(a) * r1, my + Math.sin(a) * r1); g.stroke();
  }
  g.fillStyle = BROWN; g.font = '600 11px "JetBrains Mono", monospace'; g.textBaseline = 'middle';
  for (let k = 0; k < 24; k += 2) {
    const a = -Math.PI / 2 + k / 24 * Math.PI * 2;
    g.save(); g.translate(mx + Math.cos(a) * (mr + 21), my + Math.sin(a) * (mr + 21)); g.rotate(a + Math.PI / 2);
    g.fillText(k + 'h', 0, 0); g.restore();
  }
  g.textBaseline = 'alphabetic';
  g.fillStyle = BROWN; g.font = '600 13px "JetBrains Mono", monospace';
  spaced(g, 'FIG. 1 · AS DRAWN BY THE REGISTRANT', mx, my + mr + 68, 3);

  // right column
  const cx = 1120;
  g.fillStyle = SOFT; g.font = 'italic 400 33px "Cormorant Garamond", Georgia, serif';
  g.fillText('This certifies that the constellation known as', cx, 372);
  // the name: one big line, or two lines when a long name would get too small
  const name = (entry.name || REG.defaultName).trim();
  const fam = s => `400 ${s}px Italiana, Didot, Georgia, serif`, NW = 700;
  g.font = fam(100);
  let lines = [name], size = Math.min(104, Math.floor(100 * NW / Math.max(1, g.measureText(name).width)));
  if (size < 64 && name.includes(' ')) {
    const mid = name.length / 2, at = [...name.matchAll(/ /g)].map(m => m.index).reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a));
    const two = [name.slice(0, at).trim(), name.slice(at + 1).trim()];
    const s2 = Math.min(62, Math.floor(100 * NW / Math.max(1, ...two.map(t => g.measureText(t).width))));
    if (s2 > size) { lines = two; size = s2; }
  }
  g.font = fam(size); g.fillStyle = INK;
  const ys = lines.length === 1 ? [466] : [438, 438 + size * .95];
  lines.forEach((t, i) => g.fillText(t, cx, ys[i]));
  const nw = Math.min(NW, Math.max(...lines.map(t => g.measureText(t).width)));
  const fy = lines.length === 1 ? 496 : ys[1] + 24;
  g.strokeStyle = gold; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(cx - nw / 2 - 20, fy); g.lineTo(cx - 16, fy); g.moveTo(cx + 16, fy); g.lineTo(cx + nw / 2 + 20, fy); g.stroke();
  star4(g, cx, fy, 10, gold);
  g.fillStyle = SOFT;
  const line2 = REG.gentle ? `has been placed among the stars over the ${REG.verse}, in loving memory.` : `has been duly drawn, named, and entered into the sky over the ${REG.verse}.`;
  fitFont(g, line2, s => `italic 400 ${s}px "Cormorant Garamond", Georgia, serif`, 29, 21, 740);
  g.fillText(line2, cx, fy + 52);

  const rows = [
    ['CATALOG NO.', entry.cat || det.cat],
    ['COORDINATES', `${entry.ra || det.ra} · ${entry.dec || det.dec}`],
    ['BRIGHTEST STAR', det.mag],
    ['BEST VIEWED', 'any night you look up'],
    REG.gentle ? ['IN MEMORY OF', REG.them] : ['REGISTERED FOR', REG.them],
    ['REGISTERED BY', REG.me],
    ['DATE OF REGISTRY', fmtDate(entry.date || Date.now())],
  ];
  const L = 790, R = 1450;
  rows.forEach(([k, v], i) => {
    const y = 606 + i * 38;
    g.fillStyle = BROWN; g.font = '600 14px "JetBrains Mono", monospace';
    const kw = spaced(g, k, L, y, 2.6, 'left');
    g.fillStyle = INK; g.textAlign = 'right';
    // long names shrink, then get trimmed, so they never run into the label
    const room = R - L - kw - 34;
    let vs = 27; g.font = `600 ${vs}px "Cormorant Garamond", Georgia, serif`;
    while (g.measureText(v).width > room && vs > 19) { vs -= 1; g.font = `600 ${vs}px "Cormorant Garamond", Georgia, serif`; }
    if (g.measureText(v).width > room) { while (v.length > 2 && g.measureText(v + '…').width > room) v = v.slice(0, -1); v = v.trimEnd() + '…'; }
    const vw = g.measureText(v).width;
    g.fillText(v, R, y + 1);
    g.textAlign = 'center';
    g.fillStyle = 'rgba(138,100,34,.45)';
    for (let x = L + kw + 14; x < R - vw - 12; x += 9) { g.beginPath(); g.arc(x, y - 4, 1.2, 0, Math.PI * 2); g.fill(); }
  });

  // signature: the sender signs as registrar
  g.save(); g.translate(1130, 922); g.rotate(-.06);
  g.fillStyle = '#26357a';
  fitFont(g, REG.me, s => `700 ${s}px Caveat, "Segoe Print", cursive`, 86, 44, 330);
  g.fillText(REG.me, 0, 0);
  const sw = Math.min(330, g.measureText(REG.me).width);
  g.strokeStyle = '#26357a'; g.lineWidth = 2.4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-sw / 2 - 14, 12); g.bezierCurveTo(-sw / 6, 26, sw / 4, 4, sw / 2 + 20, 16); g.stroke();
  g.restore();
  g.strokeStyle = BROWN; g.lineWidth = 1.2; g.beginPath(); g.moveTo(980, 952); g.lineTo(1280, 952); g.stroke();
  g.fillStyle = BROWN; g.font = '600 13px "JetBrains Mono", monospace';
  spaced(g, REG.gentle ? 'REGISTRAR' : 'CHIEF REGISTRAR', 1130, 976, 3);

  // seal under the medallion
  drawSeal(g, mx, 914, 80);

  // fine print
  g.fillStyle = SOFT; g.font = 'italic 400 21px "Cormorant Garamond", Georgia, serif';
  g.fillText('This registry is not recognized by the International Astronomical Union.', 820, 1024);
  const fine = REG.gentle ? `It is recognized by everyone who loves ${REG.them}, which is what counts.` : `It is recognized by ${REG.me}, which is what counts.`;
  fitFont(g, fine, s => `italic 400 ${s}px "Cormorant Garamond", Georgia, serif`, 21, 15, 900);
  g.fillText(fine, 820, 1050);
  return cv;
}

/* =====================================================================
   The view
   ===================================================================== */
export default {
  css: 'stars',
  async mount(ctx) {
    const { store, audio, fx, U } = ctx;
    const T = U.theme, them = U.them.name, me = U.me.name, gentle = U.gentle;
    const species = (ctx.cat.PRESETS.them && ctx.cat.PRESETS.them.species) || 'cat';
    const short = shortName(them);
    const mmdd = String(U.date.m).padStart(2, '0') + String(U.date.d).padStart(2, '0');
    REG = {
      code: initials(U.studio) + 'SR-' + mmdd, mmdd, studio: U.studio, verse: U.verse, them, me, gentle, defaultName: `${short} Major`.slice(0, 28),
      gold: T.gold, goldRGB: rgb(T.gold), night: T.night, night2: T.night2, dusk: T.dusk, lilac: rgb(T.lilac), sky: rgb(T.sky), rose: rgb(T.rose),
    };
    const GUIDES = makeGuides(species);
    // theme colors for the drawing stage, as "r,g,b" for rgba()
    const C = { gold: REG.goldRGB, lilac: REG.lilac, lilacHi: rgb(mixHex(T.lilac, '#ffffff', .45)), sky: REG.sky, rose: REG.rose, hud: rgb(T.hud) };
    const latin = LATIN[species] || 'Felis';
    const occNames = { birthday: ['The Birthday Candle'], belated: ['The Birthday Candle'], anniversary: ['The Two of Us'], newyear: ['The Midnight Toast'], reunion: ['The Next Hello'], farewell: ['The Long Way Home'], congrats: ['The Victory Lap'], thanks: ['The Thank-You Note'] }[U.occ] || ['The Paper Crane'];
    const NAMES = (gentle
      ? [REG.defaultName, `${poss(short)} Light`, 'The Lamp Left On', 'Still Shining', 'The Long Way Home', 'Two Friends on a Hill', 'The Little Streetlamp', 'The Garden Gate', `${latin} Propellera`, 'The Kite']
      : [REG.defaultName, `${latin} Propellera`, 'The Lollipop', ...occNames, `${short} Minor`, 'Two Friends on a Hill', 'The Swirl', `The ${U.verse} Lantern`, 'The Little Streetlamp', 'Ursa Minor-ish', 'The Kite'])
      .filter((n, i, a) => n.length <= 28 && a.indexOf(n) === i);
    const reduce = ctx.reduce;
    const sfxOn = () => store.settings().sfx !== false;
    const ping = (midi, vol = .05) => { if (sfxOn()) audio.tone(midi, undefined, .9, vol, 'sine'); };
    const SCALE = [86, 84, 81, 79, 76, 74, 72, 69, 67];

    /* ---------- state ---------- */
    const draft = store.get('stars.draft', null);
    let stars = [], edges = [], sel = -1, guideId = 'none', name = REG.defaultName;
    if (draft && Array.isArray(draft.pts)) {
      stars = draft.pts.filter(p => Array.isArray(p) && p.length === 2).slice(0, MAX_STARS).map(([x, y]) => ({ x: clamp(+x || .5, .02, .98), y: clamp(+y || .5, .02, .98), ph: Math.random() * 6.28, born: -1e4 }));
      edges = (draft.edges || []).filter(e => Array.isArray(e) && stars[e[0]] && stars[e[1]] && e[0] !== e[1]);
      sel = Number.isInteger(draft.sel) && stars[draft.sel] ? draft.sel : -1;
      if (GUIDES[draft.guide]) guideId = draft.guide;
      if (typeof draft.name === 'string' && draft.name.trim()) name = draft.name.slice(0, 28);
    }
    const hist = [];
    let step = 1, current = null; // current = the registered entry shown on step 3
    const saveDraft = () => store.set('stars.draft', { pts: stars.map(s => [r4(s.x), r4(s.y)]), edges: edges.map(e => [...e]), sel, guide: guideId, name });
    const snap = () => ({ stars: stars.map(s => ({ ...s })), edges: edges.map(e => [...e]), sel });
    const pushHist = () => { hist.push(snap()); if (hist.length > 80) hist.shift(); };

    /* ---------- DOM ---------- */
    const H = ctx.h;
    const intro = H('div', { class: 'wintro sr-intro' },
      H('p', { class: 'kicker gold', text: `${U.studio} Star Registry` }),
      H('h2', { text: gentle ? `A constellation for ${them}` : 'Name a constellation' }),
      H('p', { class: 'lede', text: gentle ? `Connect a few stars, give them a name, and place them in the sky for ${them}. They’ll be there any night you look up.` : 'Connect a few stars, give them a name, and get the paperwork. The registry is extremely official. (It is not.)' }));

    const stepEls = [1, 2, 3].map(n => H('li', { class: 'sr-step', 'data-n': n }, H('b', { text: n }), H('span', { text: ['Draw', 'Name', 'Certificate'][n - 1] })));
    const stepper = H('ol', { class: 'sr-steps', 'aria-label': 'Steps' }, stepEls);

    // step 1: draw
    const cv = H('canvas', { class: 'sr-canvas', role: 'img', 'aria-label': 'Night sky. Tap to place stars, drag to move them.' });
    const stage = H('div', { class: 'stage-wrap sr-stage' }, cv);
    const btnLift = H('button', { class: 'btn ghost small', type: 'button', 'aria-label': 'Lift pen: the next star starts unconnected' }, 'Lift pen');
    const btnUndo = H('button', { class: 'btn ghost small', type: 'button' }, 'Undo');
    const btnClear = H('button', { class: 'btn ghost small', type: 'button' }, 'Clear');
    const btnSurprise = H('button', { class: 'btn ghost small', type: 'button', 'aria-label': 'Draw a random constellation for me' }, '✦ Surprise me');
    const segBtns = [['none', 'None'], ['dipper', GUIDES.dipper.label], ['pal', GUIDES.pal.label]].map(([id, label]) =>
      H('button', { type: 'button', 'data-g': id, 'aria-pressed': String(guideId === id) }, label));
    const seg = H('div', { class: 'seg sr-seg', role: 'group', 'aria-label': 'Trace a guide' }, segBtns);
    const count = H('span', { class: 'sr-count' });
    const status = H('p', { class: 'sr-status hint', 'aria-live': 'polite' });
    const btnNext = H('button', { class: 'btn solid', type: 'button' }, 'Name it →');
    const side = H('div', { class: 'sr-side' },
      H('div', { class: 'sr-tools' }, btnLift, btnUndo, btnClear, btnSurprise),
      H('div', { class: 'sr-guide' }, H('span', { class: 'kicker muted', text: 'Trace a guide' }), seg),
      H('div', { class: 'sr-meta' }, count, status),
      H('div', { class: 'sr-go' }, btnNext),
      H('p', { class: 'keys sr-keys' }, H('kbd', { text: 'Ctrl Z' }), 'undo', H('kbd', { text: 'Esc' }), 'lift pen'));
    const secDraw = H('section', { class: 'sr-draw', 'aria-label': 'Step 1: draw' }, H('div', { class: 'sr-drawgrid' }, stage, side));

    // step 2: name
    const prev = H('canvas', { class: 'sr-prev', 'aria-hidden': 'true' });
    const input = H('input', { class: 'sr-input', type: 'text', maxlength: '28', value: name, autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Constellation name' });
    const btnSuggest = H('button', { class: 'btn ghost small', type: 'button' }, '✦ Suggest a name');
    const dl = H('dl', { class: 'sr-dl' });
    const fullNote = H('p', { class: 'fine sr-full', hidden: true });
    const btnBack = H('button', { class: 'btn ghost', type: 'button' }, '← Back to drawing');
    const btnReg = H('button', { class: 'btn solid', type: 'button' }, 'Make it official ✦');
    const secName = H('section', { class: 'sr-name', 'aria-label': 'Step 2: name', hidden: true },
      H('div', { class: 'card glow sr-namecard' },
        H('div', { class: 'sr-prevwrap' }, prev),
        H('div', { class: 'sr-form' },
          H('label', { class: 'kicker gold', for: 'srName', text: 'Name your constellation' }),
          H('div', { class: 'sr-inrow' }, input, btnSuggest),
          dl, fullNote,
          H('div', { class: 'row sr-actions' }, btnBack, btnReg))));
    input.id = 'srName';

    // step 3: certificate
    const cert = H('canvas', { class: 'sr-cert', role: 'img', 'aria-label': 'Your star registration certificate' });
    const certFrame = H('div', { class: 'sr-certframe' }, cert, H('div', { class: 'sr-certload', text: 'Printing on fancy paper…' }));
    const certMsg = H('p', { class: 'lede sr-certmsg' });
    const btnDl = H('button', { class: 'btn solid', type: 'button' }, ctx.icon('download'), 'Download PNG');
    const btnShare = H('button', { class: 'btn rose', type: 'button' }, ctx.icon('share'), 'Share');
    const btnAgain = H('button', { class: 'btn ghost', type: 'button' }, 'Draw another');
    const secCert = H('section', { class: 'sr-certsec', 'aria-label': 'Step 3: certificate', hidden: true },
      certMsg, certFrame, H('div', { class: 'row sr-certbtns' }, btnDl, btnShare, btnAgain),
      H('p', { class: 'hint sr-maphint' }, 'It glows in the sky behind ', H('a', { href: '#/map', text: 'the map' }), ' now. Look up there sometime.'));

    // the registry (gallery)
    const gallery = H('div', { class: 'sr-gallery' });
    const regCard = H('section', { class: 'card sr-registry', 'aria-label': 'Registered constellations' },
      H('div', { class: 'sr-reghead' }, H('h3', { text: 'The Registry' }), H('span', { class: 'kicker muted sr-regn' })),
      gallery);

    const wrap = H('div', { class: 'sr-wrap' }, intro, stepper, secDraw, secName, secCert, regCard);
    ctx.root.append(wrap);
    ctx.peek(regCard, 'stars-hide', { right: '18px', top: '-15px', rotate: 12, size: 28 });

    /* ---------- the drawing stage ---------- */
    const g = cv.getContext('2d');
    let W = 300, Hh = 300, dpr = 1, bg = null, twinkles = [], guidePx = [], hover = null, drag = null, ripples = [];
    const spr = starSprite(128), dot = dotSprite(32, '255,248,230');
    let guideDone = false;

    function buildBg() {
      const c = document.createElement('canvas'); c.width = Math.round(W * dpr); c.height = Math.round(Hh * dpr);
      const b = c.getContext('2d'); b.scale(dpr, dpr);
      const sky = b.createLinearGradient(0, 0, 0, Hh);
      sky.addColorStop(0, mixHex(T.night, '#000000', .45)); sky.addColorStop(.55, T.night2); sky.addColorStop(1, T.dusk);
      b.fillStyle = sky; b.fillRect(0, 0, W, Hh);
      const hz = b.createRadialGradient(W * .5, Hh * 1.2, 0, W * .5, Hh * 1.2, Math.max(W, Hh) * .8);
      hz.addColorStop(0, `rgba(${C.rose},.26)`); hz.addColorStop(.5, `rgba(${C.lilac},.08)`); hz.addColorStop(1, `rgba(${C.lilac},0)`);
      b.fillStyle = hz; b.fillRect(0, 0, W, Hh);
      const rnd = mulberry32(812);
      // the Milky Way: a soft band from lower left to upper right
      const ax = -.1 * W, ay = .95 * Hh, bx = 1.1 * W, by = .02 * Hh;
      const len = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / len, ny = (bx - ax) / len, band = Math.min(W, Hh) * .2;
      for (let i = 0; i < 80; i++) {
        const t = rnd(), off = gauss(rnd) * band * .55;
        const x = ax + (bx - ax) * t + nx * off, y = ay + (by - ay) * t + ny * off, rr = band * (.35 + rnd() * .7);
        const col = rnd() < .45 ? C.lilac : rnd() < .5 ? C.sky : C.rose;
        const mg = b.createRadialGradient(x, y, 0, x, y, rr);
        mg.addColorStop(0, `rgba(${col},${(.05 + rnd() * .05).toFixed(3)})`); mg.addColorStop(1, `rgba(${col},0)`);
        b.fillStyle = mg; b.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      }
      // a darker dust lane down the middle of the band
      b.save(); b.globalCompositeOperation = 'multiply';
      for (let i = 0; i < 30; i++) {
        const t = rnd(), off = gauss(rnd) * band * .12;
        const x = ax + (bx - ax) * t + nx * off, y = ay + (by - ay) * t + ny * off, rr = band * (.15 + rnd() * .25);
        const mg = b.createRadialGradient(x, y, 0, x, y, rr);
        mg.addColorStop(0, 'rgba(40,30,80,.35)'); mg.addColorStop(1, 'rgba(40,30,80,0)');
        b.fillStyle = mg; b.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      }
      b.restore();
      // faint chart grid
      b.strokeStyle = `rgba(${C.hud},.05)`; b.lineWidth = 1;
      const step = Math.max(60, Math.round(Math.min(W, Hh) / 4));
      for (let x = step / 2; x < W; x += step) { b.beginPath(); b.moveTo(x, 0); b.lineTo(x, Hh); b.stroke(); }
      for (let y = step / 2; y < Hh; y += step) { b.beginPath(); b.moveTo(0, y); b.lineTo(W, y); b.stroke(); }
      // static faint stars, concentrated along the band
      const n = Math.round(W * Hh / 230);
      for (let i = 0; i < n; i++) {
        let x, y;
        if (rnd() < .55) { const t = rnd(), off = gauss(rnd) * band * .7; x = ax + (bx - ax) * t + nx * off; y = ay + (by - ay) * t + ny * off; }
        else { x = rnd() * W; y = rnd() * Hh; }
        const s = rnd(), z = s < .85 ? .9 : 1.5;
        b.fillStyle = s < .08 ? `rgba(255,214,150,${(.3 + s * 4).toFixed(2)})` : `rgba(246,238,227,${(.15 + s * .45).toFixed(2)})`;
        b.fillRect(x, y, z, z);
      }
      bg = c;
      twinkles = Array.from({ length: Math.round(W * Hh / 5500) + 14 }, () => ({ x: rnd() * W, y: rnd() * Hh, r: 3 + rnd() * 4, ph: rnd() * 6.28, sp: .0008 + rnd() * .0018 }));
    }
    function fitGuide() {
      const gd = GUIDES[guideId];
      if (!gd) { guidePx = []; return; }
      const xs = gd.pts.map(p => p[0]), ys = gd.pts.map(p => p[1]);
      const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
      const s = Math.min(W * gd.fit[0] / (maxx - minx), Hh * gd.fit[1] / (maxy - miny));
      const ox = W / 2 - (minx + maxx) / 2 * s, oy = Hh / 2 - (miny + maxy) / 2 * s;
      guidePx = gd.pts.map(([x, y]) => [ox + x * s, oy + y * s]);
    }
    function layout() {
      const box = stage.getBoundingClientRect();
      const w = Math.max(200, Math.floor(box.width - 2));
      const portrait = innerHeight > innerWidth;
      const side = innerWidth >= 900 || (!portrait && innerHeight <= 540);
      const avail = innerHeight - 58 - (side ? 44 : 120);
      const want = w * (portrait ? 1 : .64);
      const hgt = Math.round(clamp(want, 210, Math.max(210, avail)));
      const nd = Math.min(devicePixelRatio || 1, 2);
      if (w === W && hgt === Hh && nd === dpr && bg) return;
      W = w; Hh = hgt; dpr = nd;
      cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr);
      cv.style.height = Hh + 'px';
      stage.style.height = Hh + 2 + 'px';
      buildBg(); fitGuide();
    }

    const P = i => [stars[i].x * W, stars[i].y * Hh];
    function hitTest(x, y, touch) {
      const rr = touch ? 26 : 19;
      let best = -1, bd = rr * rr;
      stars.forEach((s, i) => { const dx = s.x * W - x, dy = s.y * Hh - y, d = dx * dx + dy * dy; if (d <= bd) { bd = d; best = i; } });
      return best;
    }
    function snapToGuide(x, y, rad = 24) {
      let best = null, bd = rad * rad;
      guidePx.forEach(([gx, gy]) => {
        const d = (gx - x) ** 2 + (gy - y) ** 2;
        if (d < bd && !stars.some(s => (s.x * W - gx) ** 2 + (s.y * Hh - gy) ** 2 < 36)) { bd = d; best = [gx, gy]; }
      });
      return best || [x, y];
    }
    const hasEdge = (a, b) => edges.some(([i, j]) => (i === a && j === b) || (i === b && j === a));
    function noteFor(y) { return SCALE[clamp(Math.floor(y / Hh * SCALE.length), 0, SCALE.length - 1)]; }

    function addStar(x, y) {
      x = clamp(x, W * .03, W * .97); y = clamp(y, Hh * .03, Hh * .97);
      stars.push({ x: x / W, y: y / Hh, ph: Math.random() * 6.28, born: performance.now() });
      const i = stars.length - 1;
      if (sel >= 0 && sel !== i) edges.push([sel, i]);
      sel = i;
      ripples.push({ x, y, t: performance.now() });
      ping(noteFor(y));
      checkGuide();
      return i;
    }
    function tapStar(i) {
      if (sel === i) { sel = -1; audio.sfx('click'); }
      else if (sel >= 0) {
        if (!hasEdge(sel, i)) { pushHist(); edges.push([sel, i]); ping(noteFor(P(i)[1]) + 12, .04); } else audio.sfx('click');
        sel = i;
      } else { sel = i; audio.sfx('click'); }
      const [x, y] = P(i); ripples.push({ x, y, t: performance.now(), small: true });
      changed();
    }
    function checkGuide() {
      if (guideDone || !guidePx.length) return;
      const all = guidePx.every(([gx, gy]) => stars.some(s => (s.x * W - gx) ** 2 + (s.y * Hh - gy) ** 2 < 49));
      if (all) {
        guideDone = true;
        ctx.toast(GUIDES[guideId].done);
        const r = cv.getBoundingClientRect();
        fx.burst(r.left + r.width / 2, r.top + r.height / 2, 30);
        audio.sfx('sparkle');
      }
    }
    function changed() { paintUI(); saveDraft(); }

    // pointer input: tap empty sky to place (and keep dragging to adjust), tap a star to select/connect, drag a star to move it
    ctx.on(cv, 'pointerdown', e => {
      if (e.button > 0 || step !== 1) return;
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch {}
      audio.ac();
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const touch = e.pointerType !== 'mouse';
      const hit = hitTest(x, y, touch);
      if (hit >= 0) { drag = { id: e.pointerId, i: hit, sx: x, sy: y, moved: false, placed: false, pushed: false, ox: stars[hit].x * W - x, oy: stars[hit].y * Hh - y }; return; }
      // a finger on empty sky only becomes a star if it lifts without wandering (a swipe is not a tap)
      if (touch) { pending = { id: e.pointerId, x, y }; return; }
      placeAt(x, y, e.pointerId);
    });
    let pending = null;
    function placeAt(x, y, pointerId) {
      if (stars.length >= MAX_STARS) {
        ctx.toast('Sixteen stars is the registry limit. Constellations have standards.');
        audio.sfx('error');
        stage.classList.remove('sr-shake'); void stage.offsetWidth; if (!reduce) stage.classList.add('sr-shake');
        return;
      }
      pushHist();
      const [sx, sy] = snapToGuide(x, y);
      const i = addStar(sx, sy);
      // mouse: keep holding to fine-tune where the new star sits
      if (pointerId != null) drag = { id: pointerId, i, sx: x, sy: y, moved: false, placed: true, pushed: true, ox: stars[i].x * W - x, oy: stars[i].y * Hh - y };
      changed();
    }
    ctx.on(cv, 'pointermove', e => {
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (pending && pending.id === e.pointerId) { if (Math.hypot(x - pending.x, y - pending.y) > 8) pending = null; return; }
      if (!drag || drag.id !== e.pointerId) { hover = e.pointerType === 'mouse' ? { x, y } : null; return; }
      e.preventDefault();
      if (!drag.moved && Math.hypot(x - drag.sx, y - drag.sy) > 7) {
        drag.moved = true;
        if (!drag.pushed) { pushHist(); drag.pushed = true; }
      }
      if (drag.moved) {
        const s = stars[drag.i];
        s.x = clamp((x + drag.ox) / W, .03, .97); s.y = clamp((y + drag.oy) / Hh, .03, .97);
      }
      hover = null;
    });
    const endDrag = e => {
      if (pending && pending.id === e.pointerId) { const p = pending; pending = null; placeAt(p.x, p.y, null); return; }
      if (!drag || drag.id !== e.pointerId) return;
      const d = drag; drag = null;
      if (!d.moved && !d.placed) { tapStar(d.i); return; }
      if (d.moved && stars[d.i]) {
        const s = stars[d.i];
        // let a dragged star settle onto a nearby guide dot
        const [gx, gy] = snapToGuide(s.x * W, s.y * Hh, 16);
        s.x = gx / W; s.y = gy / Hh;
        checkGuide();
      }
      changed();
    };
    ctx.on(cv, 'pointerup', endDrag);
    ctx.on(cv, 'pointercancel', e => { pending = null; if (drag && drag.id === e.pointerId) { drag = null; changed(); } });
    ctx.on(cv, 'pointerleave', () => { hover = null; });

    function undo() {
      if (!hist.length) { audio.sfx('error'); return; }
      const s = hist.pop(); stars = s.stars; edges = s.edges; sel = s.sel; drag = null;
      audio.sfx('click'); changed();
    }
    function lift() { if (sel >= 0) { sel = -1; audio.sfx('click'); changed(); } }
    function clearAll() {
      if (!stars.length) return;
      pushHist(); stars = []; edges = []; sel = -1; guideDone = false;
      audio.sfx('whoosh'); changed();
      ctx.toast('Sky cleared. Undo brings it back.');
    }
    function surprise() {
      pushHist();
      stars = []; edges = []; sel = -1;
      const n = 5 + Math.floor(Math.random() * 4);
      let x = W * (.25 + Math.random() * .2), y = Hh * (.3 + Math.random() * .4), a = Math.random() * 6.28;
      for (let i = 0; i < n; i++) {
        stars.push({ x: clamp(x / W, .08, .92), y: clamp(y / Hh, .1, .9), ph: Math.random() * 6.28, born: performance.now() + i * 70 });
        if (i) edges.push([i - 1, i]);
        a += (Math.random() - .5) * 2.2;
        const st = Math.min(W, Hh) * (.13 + Math.random() * .1);
        x += Math.cos(a) * st; y += Math.sin(a) * st;
        if (x < W * .1 || x > W * .9) { a = Math.PI - a; x = clamp(x, W * .1, W * .9); }
        if (y < Hh * .12 || y > Hh * .88) { a = -a; y = clamp(y, Hh * .12, Hh * .88); }
      }
      if (n > 5 && Math.random() < .7) edges.push([Math.floor(n / 2) - 1, n - 1]);
      sel = stars.length - 1;
      if (sfxOn()) stars.forEach((s, i) => ctx.timeout(() => ping(noteFor(s.y * Hh), .035), i * 70));
      changed();
    }
    btnUndo.onclick = undo; btnLift.onclick = lift; btnClear.onclick = clearAll; btnSurprise.onclick = surprise;
    segBtns.forEach(b => {
      b.onclick = () => {
        guideId = b.dataset.g; guideDone = false;
        segBtns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        fitGuide(); audio.sfx('click'); changed();
        if (guideId !== 'none' && !stars.length) ctx.toast('Tap the faint dots to trace. Close is close enough.');
      };
    });
    ctx.on(window, 'keydown', e => {
      if (step !== 1) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); undo(); }
      else if (e.key === 'Escape' && sel >= 0 && !document.querySelector('.modal-wrap')) lift();
    });

    function paintUI() {
      count.textContent = `${stars.length} / ${MAX_STARS} stars`;
      status.textContent = !stars.length ? (guideId === 'none' ? 'Tap the sky to place your first star.' : 'Tap the faint dots to trace the guide, or go freestyle.')
        : sel >= 0 ? 'The next star connects from the glowing one. Tap two stars to link them.'
          : 'Pen lifted. Your next star starts a fresh line.';
      btnLift.disabled = sel < 0;
      btnUndo.disabled = !hist.length;
      btnClear.disabled = !stars.length;
      btnNext.disabled = stars.length < 3;
      btnNext.title = stars.length < 3 ? 'Place at least 3 stars' : '';
      btnNext.textContent = stars.length < 3 ? `Place ${3 - stars.length} more star${3 - stars.length === 1 ? '' : 's'}` : 'Name it →';
    }

    function render(t) {
      if (step !== 1 || !bg) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.drawImage(bg, 0, 0, W, Hh);
      for (const s of twinkles) {
        const a = reduce ? .5 : .15 + .85 * Math.abs(Math.sin(s.ph + t * s.sp));
        g.globalAlpha = a; g.drawImage(dot, s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      }
      g.globalAlpha = 1;
      // guide
      if (guidePx.length) {
        const gd = GUIDES[guideId];
        g.setLineDash([3, 7]); g.lineWidth = 1.2; g.strokeStyle = `rgba(${C.lilac},.28)`;
        g.beginPath(); for (const [i, j] of gd.edges) { g.moveTo(...guidePx[i]); g.lineTo(...guidePx[j]); } g.stroke();
        g.setLineDash([]);
        guidePx.forEach(([x, y], i) => {
          const pulse = reduce ? 1 : .75 + .25 * Math.sin(t * .003 + i);
          g.fillStyle = `rgba(${C.lilac},${(.16 * pulse).toFixed(3)})`; g.beginPath(); g.arc(x, y, 10, 0, 6.283); g.fill();
          g.strokeStyle = `rgba(${C.lilacHi},${(.5 * pulse).toFixed(3)})`; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, 5.5, 0, 6.283); g.stroke();
          if (gd.labels[i]) {
            g.font = '600 10px "JetBrains Mono", monospace'; g.fillStyle = i === gd.mark ? `rgba(${C.gold},.85)` : `rgba(${C.lilacHi},.6)`;
            g.textAlign = 'center'; g.fillText((i === gd.mark ? '★ ' : '') + gd.labels[i].toUpperCase(), x, y + 24);
            if (i === gd.mark) { g.strokeStyle = `rgba(${C.gold},.6)`; g.beginPath(); g.arc(x, y, 14, 0, 6.283); g.stroke(); }
          }
        });
      }
      // lines
      if (edges.length) {
        g.lineCap = 'round';
        const path = () => { g.beginPath(); for (const [i, j] of edges) { if (!stars[i] || !stars[j]) continue; g.moveTo(...P(i)); g.lineTo(...P(j)); } };
        path(); g.strokeStyle = `rgba(${C.gold},.13)`; g.lineWidth = 9; g.stroke();
        g.strokeStyle = `rgba(${C.gold},.32)`; g.lineWidth = 4; g.stroke();
        g.strokeStyle = 'rgba(255,232,160,.95)'; g.lineWidth = 1.6; g.stroke();
      }
      // preview line to the cursor
      if (hover && sel >= 0 && stars[sel] && !drag) {
        const [x0, y0] = P(sel);
        g.setLineDash([4, 6]); g.strokeStyle = `rgba(${C.gold},.45)`; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(hover.x, hover.y); g.stroke(); g.setLineDash([]);
      }
      // ripples
      const now = performance.now();
      ripples = ripples.filter(r => now - r.t < 700);
      for (const r of ripples) {
        const k = (now - r.t) / 700;
        g.strokeStyle = `rgba(255,232,160,${(1 - k) * .7})`; g.lineWidth = 1.5;
        g.beginPath(); g.arc(r.x, r.y, (r.small ? 8 : 10) + k * (r.small ? 18 : 34), 0, 6.283); g.stroke();
      }
      // stars
      stars.forEach((s, i) => {
        const [x, y] = P(i);
        const age = now - s.born;
        let k = age < 0 ? 0 : age < 420 ? 1 - Math.pow(1 - age / 420, 3) * Math.cos(age / 420 * 7) * .9 : 1;
        if (reduce) k = age < 0 ? 0 : 1;
        const tw = reduce ? 1 : 1 + .14 * Math.sin(t * .0031 + s.ph) + .06 * Math.sin(t * .011 + s.ph * 2);
        const size = 40 * k * tw;
        if (size > 0) g.drawImage(spr, x - size / 2, y - size / 2, size, size);
        if (i === sel) {
          g.save(); g.translate(x, y); if (!reduce) g.rotate(t * .0012);
          g.strokeStyle = `rgba(${C.gold},.95)`; g.lineWidth = 1.6; g.setLineDash([5, 4]);
          g.beginPath(); g.arc(0, 0, 15, 0, 6.283); g.stroke(); g.setLineDash([]); g.restore();
        }
        if (drag && drag.i === i && drag.moved) { g.strokeStyle = `rgba(${C.hud},.8)`; g.lineWidth = 1.4; g.beginPath(); g.arc(x, y, 19, 0, 6.283); g.stroke(); }
      });
      if (!stars.length) {
        g.textAlign = 'center'; g.fillStyle = `rgba(246,238,227,${reduce ? .7 : .45 + .25 * Math.sin(t * .002)})`;
        g.font = `italic ${W < 420 ? 19 : 23}px "Cormorant Garamond", Georgia, serif`;
        g.fillText(guidePx.length ? 'Tap the dots to trace' : 'Tap anywhere to place a star', W / 2, guidePx.length ? Hh - 22 : Hh / 2);
      }
    }

    /* ---------- step 2: name ---------- */
    let suggestI = 0;
    function drawingPx() { return stars.map((_, i) => P(i)); }
    function currentShape() {
      const pts = normalize(drawingPx());
      return { pts, edges: edges.map(e => [...e]) };
    }
    function paintPreview() {
      const { pts, edges: es } = currentShape();
      const det = details(pts, es);
      const size = Math.round(prev.getBoundingClientRect().width) || 240, d = Math.min(devicePixelRatio || 1, 2);
      prev.width = size * d; prev.height = size * d;
      const pg = prev.getContext('2d'); pg.setTransform(d, 0, 0, d, 0, 0); pg.clearRect(0, 0, size, size);
      const r = size / 2 - 10;
      drawSkyDisc(pg, size / 2, size / 2, r, pts, es, { det, greek: size > 200 });
      pg.strokeStyle = T.gold; pg.lineWidth = 2; pg.beginPath(); pg.arc(size / 2, size / 2, r + 1, 0, 6.283); pg.stroke();
      pg.strokeStyle = `rgba(${C.gold},.4)`; pg.lineWidth = 1; pg.beginPath(); pg.arc(size / 2, size / 2, r + 6, 0, 6.283); pg.stroke();
      dl.replaceChildren(
        ...[['Catalog no.', det.cat], ['Coordinates', `${det.ra} · ${det.dec}`], ['Brightest star', det.mag], ['Best viewed', 'any night you look up'], gentle ? ['In memory of', them] : ['Registered for', them], ['Registered by', me]]
          .map(([k, v]) => H('div', {}, H('dt', { text: k }), H('dd', { text: v }))));
      const list = store.get('stars.list', []) || [];
      fullNote.hidden = list.length < MAX_SAVED;
      if (list.length >= MAX_SAVED) fullNote.textContent = `The registry holds ${MAX_SAVED}. Registering this one retires the oldest, “${list[0].name}”.`;
    }
    btnSuggest.onclick = () => {
      const cur = input.value.trim();
      let n; do { n = NAMES[suggestI++ % NAMES.length]; } while (n === cur && NAMES.length > 1);
      input.value = n; name = n; saveDraft(); audio.sfx('click');
    };
    ctx.on(input, 'input', () => { name = input.value.slice(0, 28); saveDraft(); });
    ctx.on(input, 'keydown', e => { if (e.key === 'Enter') { e.preventDefault(); register(); } });
    btnBack.onclick = () => go(1);
    btnNext.onclick = () => { if (stars.length >= 3) go(2); };
    btnReg.onclick = () => register();

    /* ---------- register + certificate ---------- */
    function placeInSky(list) {
      let best = null, bestD = -1;
      for (let k = 0; k < 24; k++) {
        const c = { x: r4(.12 + Math.random() * .76), y: r4(.10 + Math.random() * .5) };
        const d = list.length ? Math.min(...list.map(o => Math.hypot((o.x - c.x) * 1.6, o.y - c.y))) : 1;
        if (d > bestD) { bestD = d; best = c; }
      }
      return best;
    }
    async function register() {
      if (stars.length < 3) return;
      const nm = (input.value || '').trim().slice(0, 28) || REG.defaultName;
      name = nm; input.value = nm;
      const { pts, edges: es } = currentShape();
      const det = details(pts, es);
      let list = (store.get('stars.list', []) || []).filter(c => c && Array.isArray(c.pts));
      const same = list.find(c => c.cat === det.cat && JSON.stringify(c.pts) === JSON.stringify(pts));
      let entry, fresh = false;
      if (same) {
        if (same.name !== nm) { same.name = nm; store.set('stars.list', list); }
        entry = same;
      } else {
        const spot = placeInSky(list);
        entry = {
          id: 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36),
          name: nm, pts, edges: es, x: spot.x, y: spot.y, s: Math.round(90 + Math.random() * 50),
          cat: det.cat, ra: det.ra, dec: det.dec, date: Date.now(),
        };
        list.push(entry);
        while (list.length > MAX_SAVED) list.shift();
        store.set('stars.list', list);
        store.stat('constellations');
        fresh = true;
      }
      current = entry;
      const shown = go(3);   // shows the certificate section now, finishes when the paperwork is printed
      if (fresh) {
        const first = !store.seen('stars-first-registration');
        const r = certFrame.getBoundingClientRect();
        const pt = { x: r.left + r.width / 2, y: clamp(r.top + r.height * .4, 90, innerHeight - 90) };
        audio.sfx('win');
        fx.confetti(90, { stars: true, colors: [T.gold, '#fff1bf', T.rose, T.lilac] });
        ctx.award(first ? 15 : 5, pt);
        if (first) ctx.timeout(() => ctx.stamp(), 1700);
        certMsg.textContent = gentle ? (first ? `“${nm}” is in the sky now, in memory of ${them}.` : `“${nm}” is registered. There’s room up there for as many as you like.`)
          : first ? `Congratulations. “${nm}” is officially in the sky. Well, officially-ish.` : `“${nm}” is registered. The sky is getting crowded, in a good way.`;
        // the drawing is now part of the sky: start the next one fresh
        hist.length = 0; stars = []; edges = []; sel = -1; guideDone = false; name = REG.defaultName; saveDraft();
      } else {
        certMsg.textContent = 'That one is already in the registry. Here is a fresh copy of its paperwork.';
        audio.sfx('paper');
      }
      paintGallery();
      await shown;
    }
    let certJob = 0;
    async function showCert(entry) {
      const job = ++certJob;
      certFrame.classList.add('loading');
      const off = document.createElement('canvas');
      await renderCertificate(off, entry);
      if (!ctx.alive() || job !== certJob) return;
      cert.width = CERT_W; cert.height = CERT_H;
      cert.getContext('2d').drawImage(off, 0, 0);
      certFrame.classList.remove('loading');
    }
    const certFile = entry => 'constellation-' + slug(entry.name) + '.png';
    btnDl.onclick = async () => {
      if (!current) return;
      audio.sfx('paper');
      const ok = await downloadCanvas(cert, certFile(current));
      ctx.toast(ok ? (gentle ? 'Certificate saved.' : 'Certificate saved. Frame it. (Optional. Strongly encouraged.)') : 'Download didn’t work here. Try a long-press on the certificate.');
    };
    btnShare.onclick = async () => {
      if (!current) return;
      const blob = await new Promise(res => { try { cert.toBlob(res, 'image/png'); } catch { res(null); } });
      let file = null;
      try { if (blob && typeof File === 'function') file = new File([blob], certFile(current), { type: 'image/png' }); } catch { file = null; }
      const text = gentle ? `A constellation in memory of ${them}: “${current.name}” (${current.cat}).` : `I registered a constellation: “${current.name}” (${current.cat}). Recognized by ${me}, which is what counts.`;
      const res = await shareOrCopy({ title: 'Certificate of Star Registration', text, file });
      if (res === 'copied') ctx.toast('Copied the details. For the picture itself, use Download.');
      else if (res === 'failed') ctx.toast('Sharing isn\'t available here. Download works, though!');
    };
    btnAgain.onclick = () => {
      current = null;
      if (stars.length) { pushHist(); stars = []; edges = []; sel = -1; guideDone = false; saveDraft(); }
      go(1);
    };

    /* ---------- the registry gallery ---------- */
    function paintGallery() {
      const list = (store.get('stars.list', []) || []).filter(c => c && Array.isArray(c.pts));
      regCard.querySelector('.sr-regn').textContent = `${list.length} / ${MAX_SAVED}`;
      gallery.replaceChildren();
      if (!list.length) {
        gallery.append(H('p', { class: 'hint sr-empty', text: 'Nothing registered yet. The sky is holding a spot for you.' }));
        return;
      }
      const d = Math.min(devicePixelRatio || 1, 2);
      for (const c of [...list].reverse()) {
        const mini = H('canvas', { class: 'sr-mini', width: 120 * d, height: 120 * d, 'aria-hidden': 'true' });
        const mg = mini.getContext('2d'); mg.scale(d, d);
        drawSkyDisc(mg, 60, 60, 56, c.pts, c.edges || [], { grid: false });
        mg.strokeStyle = `rgba(${C.gold},.7)`; mg.lineWidth = 1.5; mg.beginPath(); mg.arc(60, 60, 57, 0, 6.283); mg.stroke();
        const bCert = H('button', { class: 'btn small', type: 'button', 'aria-label': `Download the certificate for ${c.name}` }, ctx.icon('download'), 'Certificate');
        const bDel = H('button', { class: 'btn ghost small sr-del', type: 'button', 'aria-label': `Delete ${c.name}` }, 'Delete');
        bCert.onclick = async () => {
          bCert.disabled = true;
          const off = document.createElement('canvas');
          await renderCertificate(off, c);
          if (!ctx.alive()) return;
          const ok = await downloadCanvas(off, certFile(c));
          bCert.disabled = false;
          ctx.toast(ok ? `Certificate for “${c.name}” saved.` : 'Download didn\'t work here, sorry.');
        };
        let armed = 0;
        bDel.onclick = () => {
          if (!armed) {
            armed = ctx.timeout(() => { armed = 0; bDel.textContent = 'Delete'; bDel.classList.remove('armed'); }, 3500);
            bDel.textContent = 'Tap again'; bDel.classList.add('armed'); audio.sfx('click');
            return;
          }
          clearTimeout(armed); armed = 0;
          const next = (store.get('stars.list', []) || []).filter(o => o && o.id !== c.id);
          store.set('stars.list', next);
          if (current && current.id === c.id) current = null;
          audio.sfx('whoosh');
          ctx.toast(`“${c.name}” is unregistered. The stars are free agents again.`);
          paintGallery();
        };
        gallery.append(H('article', { class: 'sr-entry' }, mini,
          H('div', { class: 'sr-einfo' },
            H('b', { text: c.name }),
            H('span', { class: 'sr-ecat', text: c.cat || '' }),
            H('span', { class: 'sr-edate', text: c.date ? fmtDate(c.date) : '' }),
            H('div', { class: 'sr-ebtns' }, bCert, bDel))));
      }
    }

    /* ---------- steps ---------- */
    async function go(n) {
      step = n;
      secDraw.hidden = n !== 1; secName.hidden = n !== 2; secCert.hidden = n !== 3;
      stepEls.forEach((el, i) => { el.classList.toggle('on', i + 1 === n); el.classList.toggle('done', i + 1 < n); });
      if (n === 1) { layout(); paintUI(); }
      if (n === 2) { input.value = name; paintPreview(); ctx.timeout(() => { if (matchMedia('(pointer:fine)').matches) input.focus({ preventScroll: true }); }, 60); }
      const anchor = n === 3 ? secCert : stepper;
      const top = anchor.getBoundingClientRect().top;
      if (n === 3 || top < 58 || top > innerHeight * .5) scrollTo({ top: Math.max(0, scrollY + top - 70), behavior: reduce ? 'auto' : 'smooth' });
      if (n === 3 && current) await showCert(current);
    }

    let rt = 0;
    const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { if (!ctx.alive()) return; if (step === 1) layout(); if (step === 2) paintPreview(); }, 120); };
    ctx.on(window, 'resize', onResize);
    ctx.cleanup(() => clearTimeout(rt));
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(() => { if (step === 1) layout(); });
      ro.observe(stage); ctx.cleanup(() => ro.disconnect());
    }

    // a stamp that was earned but never seen (left mid-celebration) is handed over here, or on the way out
    const owedStamp = () => store.wasSeen('stars-first-registration') && !store.hasStamp('stars');
    if (owedStamp()) ctx.timeout(() => ctx.stamp(), 700);
    ctx.cleanup(() => { if (owedStamp()) store.stamp('stars'); });

    paintGallery();
    await go(1);
    ctx.raf(t => render(t));
    // the canvas uses the page fonts for labels: repaint once they arrive
    if (document.fonts && document.fonts.load) document.fonts.load('italic 20px "Cormorant Garamond"').catch(() => {});
  },
};
