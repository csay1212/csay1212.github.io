// Portrait Puzzle: a real jigsaw. Pick a picture and a size, then drag the
// pieces home. The pictures come from the playing universe (both people's
// photos, the memory photos, the two characters, the Hat Workshop pilot).
// Pieces are cut with classic tabs and blanks (bezier edges shared by both
// neighbours), pre-rendered once to offscreen canvases, and composited on a
// single canvas so dragging stays smooth on phones.
import { h, svg, clamp, lerp, rand } from '../core/dom.js';

const DIFFS = [
  { id: 'easy', name: 'Easy', sq: [3, 3], wide: [4, 2], award: 10 },
  { id: 'medium', name: 'Medium', sq: [4, 4], wide: [6, 3], award: 20 },
  { id: 'hard', name: 'Hard', sq: [6, 6], wide: [8, 4], award: 35 },
];
const DONE_TITLES = ['Put back together.', 'Every piece home.', 'Seamless.', 'Picture perfect.'];
const DONE_TITLES_GENTLE = ['Every piece home.', 'Complete.', 'Just right.', 'All together.'];
const MAX_MEMORIES = 8;
const LOAD_WAIT = 4000;   // give up on a picture that takes longer than this

const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const fmtTime = s => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const gridOf = (pic, df) => (pic.aspect === 2 ? df.wide : df.sq);
function mkCanvas(w, hh) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(hh)); return c; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function loadImg(src, wait = 0) {
  return new Promise(res => {
    const im = new Image(); im.decoding = 'async';
    let t = 0;
    im.onload = () => { clearTimeout(t); res(im.naturalWidth > 8 && im.naturalHeight > 8 ? im : null); };
    im.onerror = () => { clearTimeout(t); res(null); };
    if (wait) t = setTimeout(() => { im.onload = im.onerror = null; res(null); }, wait);
    im.src = src;
  });
}
// "#f5cc4a" → "rgba(245,204,74,a)"
function rgba(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  const n = m ? parseInt(m[1], 16) : 0xf5cc4a;
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
// A square crop of a photo: centered, nudged up on tall pictures (that's where faces are).
function squareOf(im) {
  const w = im.naturalWidth, hh = im.naturalHeight, s = Math.min(w, hh), S = Math.min(s, 1400);
  const sx = (w - s) / 2, sy = hh > w ? (hh - s) * .3 : (hh - s) / 2;
  const c = mkCanvas(S, S), x = c.getContext('2d');
  x.imageSmoothingQuality = 'high';
  x.drawImage(im, sx, sy, s, s, 0, 0, S, S);
  return c;
}
const svgImg = (str, w, hh) => loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str.replace(/aria-label="[^"]*"/, '').replace('<svg ', `<svg width="${Math.round(w)}" height="${Math.round(hh)}" `)));
const possessive = n => /s$/i.test(n) ? `${n}’` : `${n}’s`;
const trimEnd = t => String(t || '').trim().replace(/[.!?…,;:\s]+$/, '');
// Downscale in halving steps so small boards don't alias.
function scaledCopy(src, w, hh) {
  let cur = src, sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
  while (sw / 2 >= w && sh / 2 >= hh && sw > 2) {
    const n = mkCanvas(sw / 2, sh / 2); const x = n.getContext('2d');
    x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, n.width, n.height);
    cur = n; sw = n.width; sh = n.height;
  }
  const out = mkCanvas(w, hh); const x = out.getContext('2d');
  x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, out.width, out.height);
  return out;
}
const ICONS = {
  eye: 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  shuffle: 'M4 7h3c5 0 5 10 10 10h3M17 4l3 3-3 3M4 17h3c1.5 0 2.5-1 3.3-2.2M17 14l3 3-3 3M13.7 9.2C14.5 8 15.5 7 17 7h3',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  star: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z',
};
// focus the board after a keyboard start, or on mouse/trackpad devices (no focus ring on phones)
const wantFocus = e => (e && e.detail === 0) || matchMedia('(pointer: fine)').matches;
const ico = name => svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, svg('path', { d: ICONS[name] }));

/* ---------- jigsaw geometry ---------- */
// One edge: ten points (start, 3 cubic segments) in (along, out) units, after
// the classic generator shape. `s` flips the knob to one side or the other.
function makeTab() {
  const j = () => rand(-.042, .042);
  const t = rand(.088, .104), a = j(), b = j() * .8, c = j() * .6, d = j() * .6, e = j();
  return {
    s: Math.random() < .5 ? 1 : -1,
    pts: [[0, 0], [.2, a], [.5 + b + d, -t + c], [.5 - t + b, t + c], [.5 - 2 * t + b - d, 3 * t + c],
      [.5 + 2 * t + b - d, 3 * t + c], [.5 + t + b, t + c], [.5 + b + d, -t + c], [.8, e], [1, 0]],
  };
}
// Edges are stored in board units (one cell = 1) so both neighbours share them exactly.
function makeEdges(cols, rows) {
  const H = [], V = [];
  for (let r = 0; r <= rows; r++) {
    H[r] = [];
    for (let c = 0; c < cols; c++) {
      if (r === 0 || r === rows) { H[r][c] = null; continue; }
      const e = makeTab(); e.abs = e.pts.map(([u, n]) => [c + u, r + n * e.s]); H[r][c] = e;
    }
  }
  for (let c = 0; c <= cols; c++) {
    V[c] = [];
    for (let r = 0; r < rows; r++) {
      if (c === 0 || c === cols) { V[c][r] = null; continue; }
      const e = makeTab(); e.abs = e.pts.map(([u, n]) => [c + n * e.s, r + u]); V[c][r] = e;
    }
  }
  return { H, V };
}
function piecePath(edges, c, r, cell, pad) {
  const P = new Path2D();
  const X = v => (v - c) * cell + pad, Y = v => (v - r) * cell + pad;
  const add = (e, rev, ex, ey) => {
    if (!e) { P.lineTo(X(ex), Y(ey)); return; }
    const p = rev ? [...e.abs].reverse() : e.abs;
    for (let i = 1; i < 10; i += 3) P.bezierCurveTo(X(p[i][0]), Y(p[i][1]), X(p[i + 1][0]), Y(p[i + 1][1]), X(p[i + 2][0]), Y(p[i + 2][1]));
  };
  P.moveTo(X(c), Y(r));
  add(edges.H[r][c], false, c + 1, r);
  add(edges.V[c + 1][r], false, c + 1, r + 1);
  add(edges.H[r + 1][c], true, c, r + 1);
  add(edges.V[c][r], true, c, r);
  P.closePath();
  return P;
}

/* ---------- layout: board + scatter slots ---------- */
function tryLayout(W, H, cols, rows, cell, m, portrait, pf) {
  const bw = cell * cols, bh = cell * rows;
  const bx = Math.round((W - bw) / 2);
  const by = Math.round(portrait ? m + 2 : (H - bh) / 2);
  const gap = cell * .3, p = cell * pf, mo = m + cell * .24; // mo: keep the knobs inside the canvas
  const regions = [
    [mo, mo, bx - gap, H - mo],
    [bx + bw + gap, mo, W - mo, H - mo],
    [Math.max(mo, bx - gap), mo, Math.min(W - mo, bx + bw + gap), by - gap],
    [Math.max(mo, bx - gap), by + bh + gap, Math.min(W - mo, bx + bw + gap), H - mo],
  ];
  const slots = [];
  for (const [x0, y0, x1, y1] of regions) {
    const w = x1 - x0, hh = y1 - y0;
    const nx = Math.floor(w / p), ny = Math.floor(hh / p);
    if (nx < 1 || ny < 1) continue;
    const sx = w / nx, sy = hh / ny;
    const jx = clamp((sx - cell) / 2, 0, cell * .14), jy = clamp((sy - cell) / 2, 0, cell * .14);
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) slots.push({ x: x0 + sx * (i + .5), y: y0 + sy * (j + .5), jx, jy });
  }
  return { W, H, cell, bw, bh, bx, by, slots, mode: portrait ? 'top' : 'center' };
}
function computeLayout(W, H, cols, rows, n) {
  const portrait = H > W * 1.08;
  const m = clamp(Math.min(W, H) * .025, 6, 18);
  const maxCell = Math.max(10, Math.min((W - 2 * m) / cols, (H - 2 * m) / rows));
  const floor = Math.min(maxCell, 34);
  let L = null;
  for (let cell = maxCell; cell > floor; cell *= .97) {
    L = tryLayout(W, H, cols, rows, cell, m, portrait, 1);
    if (L.slots.length >= n) return L;
  }
  for (let pf = .95; pf >= .45; pf -= .05) {
    L = tryLayout(W, H, cols, rows, floor, m, portrait, pf);
    if (L.slots.length >= n) return L;
  }
  return L || tryLayout(W, H, cols, rows, floor, m, portrait, .45);
}

export default {
  css: 'puzzle',
  async mount(ctx) {
    const { store, audio, fx, U, cat } = ctx;
    const T = U.theme;
    const reduce = ctx.reduce;
    ctx.root.classList.add('full');
    const wrap = h('div', { class: 'pz' });
    ctx.root.append(wrap);

    let diff = DIFFS.some(d => d.id === store.get('game.puzzle.diff')) ? store.get('game.puzzle.diff') : 'easy';
    let game = null;
    const them = U.them.name, me = U.me.name;
    const hatsOn = ctx.WORLDS.some(w => w.id === 'hats');

    /* ---------- pictures, from the universe ---------- */
    // Every candidate photo is loaded first; any that are missing or broken are
    // simply left out. The two generated pictures are always there.
    async function buildPics() {
      const photo = async (id, name, ref, line, sub) => {
        const url = typeof ref === 'string' && /^(blob:|data:|https?:|assets\/)/.test(ref) ? ref : await Promise.resolve().then(() => U.url(ref)).catch(() => null);
        if (!url) return null;
        const img = await loadImg(url, LOAD_WAIT);
        return img ? { id, name, sub, src: url, img, aspect: 1, line } : null;
      };
      const mems = ((U.copy.memories && U.copy.memories.items) || []).filter(m => m && m.photo).slice(0, MAX_MEMORIES);
      const found = await Promise.all([
        photo('them', them, U.them.photoURL, U.gentle ? `There you are, ${them}.` : U.group ? `${them}, all back together. As it should be.` : `${them}, back in one piece. As it should be.`, 'Photo'),
        photo('me', me, U.me.photoURL, U.gentle ? `${me}, all in one frame.` : `${me}, reassembled. Suspiciously pleased about it.`, 'Photo'),
        ...mems.map((m, i) => {
          const cap = trimEnd(U.fill(m.caption || '')) || `Memory ${i + 1}`;
          return photo('mem-' + String(m.id || i).replace(/[^\w-]/g, ''), cap, m.photo,
            U.gentle ? `“${cap}.” Kept safe, piece by piece.` : `“${cap}.” Every piece back where it belongs.`, U.fill(m.when || ''));
        }),
      ]);
      const list = [{ id: 'both', name: `${them} & ${me}`, sub: 'The two of you', aspect: 2, gen: true,
        line: U.gentle ? `${them} and ${me}, side by side.` : `${them} and ${me}, back together. Nobody lost a propeller.` }];
      list.push(...found.filter(Boolean));
      list.push(hatsOn
        ? { id: 'pilot', name: 'Your pilot', sub: 'From the Hat Workshop', aspect: 1, gen: true, line: 'Your pilot is flight-ready again.' }
        : { id: 'pilot', name: them, sub: 'In a propeller hat', aspect: 1, gen: true, line: U.gentle ? `${them}, propeller and all.` : `${them}, flight-ready again.` });
      return list;
    }
    const PICS = await Promise.race([buildPics(), new Promise(r => setTimeout(() => r(null), LOAD_WAIT + 1500))])
      || [{ id: 'both', name: `${them} & ${me}`, aspect: 2, gen: true, line: `${them} and ${me}, side by side.` }];
    if (!ctx.alive()) return;

    const srcCache = {};
    function fallback(aspect) {
      const c = mkCanvas(512 * aspect, 512), x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, c.width, c.height); g.addColorStop(0, T.rose); g.addColorStop(1, T.dusk);
      x.fillStyle = g; x.fillRect(0, 0, c.width, c.height); return c;
    }
    // The poster: both characters under a night sky in the universe's colors.
    async function makeBoth() {
      const S = 1024, W = S * 2;
      const c = mkCanvas(W, S), x = c.getContext('2d');
      x.imageSmoothingQuality = 'high';
      const sky = x.createLinearGradient(0, 0, 0, S);
      sky.addColorStop(0, T.night); sky.addColorStop(.55, T.dusk); sky.addColorStop(1, T.horizon);
      x.fillStyle = sky; x.fillRect(0, 0, W, S);
      const glow = x.createRadialGradient(W / 2, S * 1.02, 10, W / 2, S * 1.02, S * .95);
      glow.addColorStop(0, rgba(T.gold, .42)); glow.addColorStop(1, rgba(T.gold, 0));
      x.fillStyle = glow; x.fillRect(0, 0, W, S);
      // stars
      let sd = 11; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      for (let i = 0; i < 220; i++) {
        const sx = rnd() * W, sy = rnd() * S * .7, r = rnd() * 2.6 + .8;
        x.globalAlpha = .25 + rnd() * .7; x.fillStyle = rnd() < .14 ? T.gold : rnd() < .12 ? T.rose : T.paper;
        x.beginPath(); x.arc(sx, sy, r, 0, 6.283); x.fill();
      }
      x.globalAlpha = 1;
      for (const [sx, sy, r] of [[W * .12, S * .16, 16], [W * .9, S * .22, 12], [W * .5, S * .09, 10]]) {
        x.fillStyle = T.gold; x.beginPath();
        x.moveTo(sx, sy - r * 2.2); x.quadraticCurveTo(sx, sy, sx + r * 2.2, sy); x.quadraticCurveTo(sx, sy, sx, sy + r * 2.2);
        x.quadraticCurveTo(sx, sy, sx - r * 2.2, sy); x.quadraticCurveTo(sx, sy, sx, sy - r * 2.2); x.fill();
      }
      // a soft hill for them to stand on
      x.fillStyle = rgba(T.night, .78);
      x.beginPath(); x.moveTo(0, S); x.lineTo(0, S * .84); x.quadraticCurveTo(W / 2, S * .66, W, S * .84); x.lineTo(W, S); x.fill();
      // the two characters
      const H = S * .66;
      const draw = async (design, cx) => {
        const str = cat.catSVG(design, { prop: true });
        const ar = (design.acc || cat.PRESETS.them.acc) === 'lollipop' ? 230 / 200 : 1;
        const w = H / ar, im = await svgImg(str, w * 2, H * 2);
        if (!im) return;
        x.save(); x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 40; x.shadowOffsetY = 18;
        x.drawImage(im, cx - w / 2, S * .79 - H, w, H); x.restore();
      };
      await draw(cat.PRESETS.them, W * .29);
      await draw(cat.PRESETS.me, W * .71);
      // names + the ampersand medallion
      try { await Promise.race([document.fonts.load('120px Italiana'), new Promise(r => setTimeout(r, 1200))]); } catch {}
      x.textAlign = 'center'; x.textBaseline = 'middle';
      const label = (t, cx) => {
        let fs = 74; x.font = `${fs}px Italiana, Didot, Georgia, serif`;
        while (x.measureText(t).width > W * .4 && fs > 34) { fs -= 4; x.font = `${fs}px Italiana, Didot, Georgia, serif`; }
        x.fillStyle = T.paper; x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 14;
        x.fillText(t, cx, S * .9); x.shadowBlur = 0;
      };
      label(them, W * .29); label(me, W * .71);
      const r = S * .07, cy = S * .52;
      x.save(); x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 18;
      x.beginPath(); x.arc(W / 2, cy, r, 0, 6.283); x.fillStyle = T.night; x.fill(); x.restore();
      x.lineWidth = 6; x.strokeStyle = T.gold; x.beginPath(); x.arc(W / 2, cy, r, 0, 6.283); x.stroke();
      x.fillStyle = T.gold; x.font = `${Math.round(r * 1.25)}px Italiana, Didot, Georgia, serif`;
      x.fillText('&', W / 2, cy + r * .06);
      // vignette
      const v = x.createRadialGradient(W / 2, S / 2, S * .45, W / 2, S / 2, W * .62);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.32)');
      x.fillStyle = v; x.fillRect(0, 0, W, S);
      return c;
    }
    async function makePilot() {
      const S = 1024, d = hatsOn ? cat.getDesign() : cat.PRESETS.them;
      const w = Math.round(S * 220 / 240);
      const im = await svgImg(cat.catSVG(d, { bg: true }), w, S);
      const c = mkCanvas(S, S), x = c.getContext('2d');
      x.fillStyle = d.bg || T.dusk; x.fillRect(0, 0, S, S);
      if (im) x.drawImage(im, (S - w) / 2, 0, w, S);
      const v = x.createRadialGradient(S / 2, S * .45, S * .3, S / 2, S / 2, S * .78);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.28)');
      x.fillStyle = v; x.fillRect(0, 0, S, S);
      return c;
    }
    function source(pic) {
      if (!srcCache[pic.id]) {
        if (pic.id === 'both') srcCache[pic.id] = makeBoth().catch(() => fallback(2));
        else if (pic.id === 'pilot') srcCache[pic.id] = makePilot().catch(() => fallback(1));
        else srcCache[pic.id] = Promise.resolve(pic.img ? squareOf(pic.img) : fallback(1));
      }
      return srcCache[pic.id];
    }

    /* ---------- shared loop + global listeners (dispatch to the current game) ---------- */
    ctx.raf(t => { if (game) game.frame(t); });
    let rzT = 0;
    ctx.on(window, 'resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { if (game && ctx.alive()) game.resize(); }, 120); });
    ctx.cleanup(() => clearTimeout(rzT));
    ctx.on(document, 'visibilitychange', () => { if (game) game.visibility(document.hidden); });
    ctx.on(window, 'keydown', e => {
      if (!game || e.key !== 'Escape' || document.querySelector('.modal-wrap')) return;
      game.escape();
    });

    /* ================= picture picker ================= */
    function showPicker() {
      if (game) { game.destroy(); game = null; }
      const best = (p, d) => store.get(`game.puzzle.best.${p.id}-${d.id}`, null);
      const segBtns = DIFFS.map(d => h('button', { type: 'button', 'aria-pressed': String(d.id === diff), onclick: () => { diff = d.id; store.set('game.puzzle.diff', diff); audio.sfx('click'); paint(); } }, d.name));
      const cards = PICS.map(p => {
        const thumb = h('div', { class: 'pz-thumb' });
        if (p.src) thumb.append(h('img', { src: p.src, alt: '', draggable: 'false', decoding: 'async' }));
        else if (p.id === 'pilot') { const d = hatsOn ? cat.getDesign() : cat.PRESETS.them; thumb.style.background = d.bg || T.dusk; thumb.innerHTML = cat.catSVG(d, { bg: true }); }
        else {
          const c = mkCanvas(800, 400); thumb.append(c);
          source(p).then(src => { if (ctx.alive() && c.isConnected) c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); });
        }
        const info = h('small', { class: 'pz-best' });
        const tick = h('span', { class: 'pz-tick', 'aria-hidden': 'true', text: '✓' });
        const btn = h('button', { class: 'pz-card' + (p.aspect === 2 ? ' wide' : ''), type: 'button', onclick: e => { audio.sfx('open'); startGame(p.id, diff, { focus: wantFocus(e) }); } },
          thumb, h('span', { class: 'pz-cap' }, h('b', { text: p.name }), info), tick);
        return { p, btn, info, tick };
      });
      const paint = () => {
        segBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(DIFFS[i].id === diff)));
        const df = DIFFS.find(d => d.id === diff);
        for (const c of cards) {
          const [cc, rr] = gridOf(c.p, df), b = best(c.p, df);
          c.info.textContent = `${cc * rr} pieces · ${b != null ? 'best ' + fmtTime(b) : 'unsolved'}`;
          c.tick.hidden = b == null;
          c.btn.setAttribute('aria-label', `Start the ${c.p.name} puzzle, ${df.name}, ${cc * rr} pieces${b != null ? ', best time ' + fmtTime(b) : ''}`);
        }
      };
      const done = store.stats().puzzles || 0;
      const photos = PICS.filter(p => !p.gen).length;
      const fine = matchMedia('(pointer: fine)').matches;
      const lede = photos
        ? `${photos === 1 ? 'A favorite picture' : 'Favorite pictures'}, scattered into pieces. Pick one and a size, then drag every piece home. Get it close and it clicks into place.`
        : `${them} and ${me}, scattered into pieces. Pick a picture and a size, then drag every piece home. Get it close and it clicks into place.`;
      const intro = h('div', { class: 'wintro pz-intro' },
        h('p', { class: 'kicker', text: 'The Arcade · jigsaw' }),
        h('h2', { text: ctx.world.name || 'Portrait Puzzle' }),
        h('p', { class: 'lede', text: lede }),
        fine ? h('div', { class: 'keys' }, h('span', { text: 'Drag with the mouse ·' }), h('kbd', { text: '←→' }), h('span', { text: 'pick' }), h('kbd', { text: 'Enter' }), h('span', { text: 'grab/drop ·' }), h('kbd', { text: 'Esc' }), h('span', { text: 'pause' })) : null);
      const opts = h('div', { class: 'pz-opts' },
        h('div', { class: 'seg pz-seg', role: 'group', 'aria-label': 'Difficulty' }, segBtns),
        h('span', { class: 'pz-goal', text: store.hasStamp('puzzle') ? `✓ Stamp collected${done ? ` · ${done} finished` : ''}` : 'Stamp goal: finish any puzzle' }));
      // an odd square left over on a two-column phone grid becomes a full-width row
      const squares = cards.filter(c => c.p.aspect !== 2);
      if (squares.length % 2) squares.at(-1).btn.classList.add('solo');
      const grid = h('div', { class: 'pz-grid' }, cards.map(c => c.btn));
      const foot = hatsOn
        ? 'Best times are kept per picture and size. Your pilot comes from the Hat Workshop, so redesign it and it’s a brand new puzzle.'
        : 'Best times are kept per picture and size.';
      const page = h('div', { class: 'pz-pick' }, intro, opts, grid, h('p', { class: 'fine pz-foot', text: foot }));
      wrap.replaceChildren(page);
      paint();
      ctx.peek(grid, 'puzzle-hide', { right: '22px', top: '-19px', rotate: -10, size: 30 });
      scrollTo(0, 0);
    }

    /* ================= a game ================= */
    async function startGame(picId, diffId, opts = {}) {
      if (game) { game.destroy(); game = null; }
      const pic = PICS.find(p => p.id === picId) || PICS[0], df = DIFFS.find(d => d.id === diffId) || DIFFS[0];
      const [cols, rows] = gridOf(pic, df), N = cols * rows;

      const cv = h('canvas', { class: 'pz-cv', tabindex: '0', 'aria-label': `${pic.name} jigsaw, ${N} pieces. Drag pieces onto the board. Keyboard: arrow keys choose a piece, Enter picks it up, arrows move it, Enter drops it.` });
      const cntEl = h('b', { text: `0/${N}` }), timeEl = h('b', { text: '0:00' });
      const live = h('p', { class: 'sr', 'aria-live': 'polite' });
      const tool = (name, label, onclick, extra = {}) => h('button', { class: 'pz-tool', type: 'button', 'aria-label': label, title: label, onclick, ...extra }, ico(name), h('span', { text: label }));
      const peekBtn = tool('eye', 'Peek', () => setPeek(!g.peek), { 'aria-pressed': 'false' });
      const scatBtn = tool('shuffle', 'Scatter', () => scatter(true));
      const resBtn = tool('star', 'Results', () => showResults(), { hidden: true });
      let armT = 0;
      const newBtn = tool('grid', 'New', () => {
        if (g.placed > 0 && !g.done && !newBtn.classList.contains('armed')) {
          newBtn.classList.add('armed'); newBtn.querySelector('span').textContent = 'Sure?';
          clearTimeout(armT); armT = setTimeout(() => { newBtn.classList.remove('armed'); newBtn.querySelector('span').textContent = 'New'; }, 2600);
          ctx.toast('Tap New again to leave this puzzle.');
          return;
        }
        audio.sfx('click'); showPicker();
      });
      const bar = h('div', { class: 'pz-bar' },
        h('div', { class: 'pz-stat' }, h('span', { text: 'Placed' }), cntEl),
        h('div', { class: 'pz-stat' }, h('span', { text: 'Time' }), timeEl),
        h('span', { class: 'grow' }), peekBtn, scatBtn, resBtn, newBtn);
      const area = h('div', { class: 'pz-area' }, cv);
      const stage = h('div', { class: 'stage-wrap pz-stage' }, bar, area, live);
      const play = h('div', { class: 'pz-play' }, stage);
      wrap.replaceChildren(play);
      scrollTo(0, 0);

      const c2 = cv.getContext('2d');
      const hitCtx = mkCanvas(1, 1).getContext('2d');
      const g = {
        pic, df, cols, rows, N, src: null, edges: makeEdges(cols, rows),
        W: 0, H: 0, D: 1, cell: 0, pad: 0, S: 0, bx: 0, by: 0, bw: 0, bh: 0, mode: '', slots: [],
        pieces: [], order: [], drag: null, kbHold: false, sel: -1, focus: false,
        placed: 0, started: false, acc: 0, runFrom: 0, running: false, paused: false, hiddenPaused: false,
        intro: true, done: false, doneAt: 0, secs: 0, result: null,
        peek: !!store.get('game.puzzle.peek', false), sparks: [], flashes: [], dirty: true, lastSec: -1, alive: true,
        picCv: null, timers: [],
      };
      const later = (fn, ms) => { const id = ctx.timeout(() => { if (g.alive) fn(); }, ms); g.timers.push(id); return id; };
      peekBtn.setAttribute('aria-pressed', String(g.peek));

      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) g.pieces.push({ id: g.pieces.length, c, r, x: 0, y: 0, locked: false, anim: null, spr: null, sh: null, path: null });

      game = {
        frame, resize: () => relayout(false), visibility, escape,
        destroy() { g.alive = false; g.drag = null; clearTimeout(armT); g.timers.forEach(clearTimeout); g.pieces.forEach(p => { p.spr = p.sh = null; }); g.picCv = null; cv.width = cv.height = 0; },
        _g: g,
      };
      const me = game;

      g.src = await source(pic);
      if (game !== me || !ctx.alive()) return;
      relayout(true);
      if (opts.focus) later(() => cv.focus({ preventScroll: true }), 0); // after the listeners below are attached
      // start assembled, then burst apart
      g.pieces.forEach(p => { p.x = tx(p); p.y = ty(p); });
      g.order = shuffle(g.pieces.map(p => p.id));
      g.dirty = true;
      if (reduce) { assignSlots(false); g.intro = false; }
      else later(() => { assignSlots(true, 650, 260); later(() => { g.intro = false; }, 950); audio.sfx('whoosh'); }, 750);

      /* ---------- geometry helpers ---------- */
      function tx(p) { return g.bx + p.c * g.cell; }
      function ty(p) { return g.by + p.r * g.cell; }
      function clampPos(p) {
        p.x = clamp(p.x, 2 - g.cell * .1, g.W - g.cell * .9 - 2);
        p.y = clamp(p.y, 2 - g.cell * .1, g.H - g.cell * .9 - 2);
      }
      function relayout(initial) {
        if (!g.alive) return;
        const top = stage.getBoundingClientRect().top + scrollY;
        const sh = Math.max(240, innerHeight - top - 10);
        const side = innerWidth > innerHeight && innerHeight < 560;
        stage.classList.toggle('side', side);
        stage.style.height = sh + 'px';
        const ar = area.getBoundingClientRect();
        const W = Math.max(200, Math.floor(ar.width)), H = Math.max(160, Math.floor(ar.height));
        const D = Math.min(devicePixelRatio || 1, 2);
        const L = computeLayout(W, H, cols, rows, N);
        const oldW = g.W, oldH = g.H, oldCell = g.cell, oldMode = g.mode;
        if (g.drag) endDrag(false);
        if (!initial) for (const p of g.pieces) if (p.anim && p.anim.then) { const fn = p.anim.then; p.anim = null; fn(); }
        Object.assign(g, { W, H, D, cell: L.cell, bw: L.bw, bh: L.bh, bx: L.bx, by: L.by, slots: L.slots, mode: L.mode });
        cv.width = Math.round(W * D); cv.height = Math.round(H * D);
        if (initial || Math.abs(oldCell - g.cell) > .5 || D !== g.lastD) { g.lastD = D; renderSprites(); }
        if (!initial) {
          const modeChanged = oldMode !== g.mode;
          for (const p of g.pieces) {
            p.anim = null;
            if (p.locked) { p.x = tx(p); p.y = ty(p); continue; }
            if (!modeChanged && oldW) {
              const cx = (p.x + oldCell / 2) / oldW * W, cy = (p.y + oldCell / 2) / oldH * H;
              p.x = cx - g.cell / 2; p.y = cy - g.cell / 2; clampPos(p);
            }
          }
          if (modeChanged && !g.done) assignSlots(false);
          if (g.done) g.pieces.forEach(p => { p.x = tx(p); p.y = ty(p); });
        }
        g.dirty = true;
      }
      function renderSprites() {
        const cell = g.cell, D = g.D;
        const pad = Math.ceil(cell * .31) + 2, S = cell + pad * 2;
        g.pad = pad; g.S = S;
        g.picCv = scaledCopy(g.src, Math.round(g.bw * D), Math.round(g.bh * D));
        const bev = Math.max(1, cell * .024);
        const k = .5, B = Math.max(3, cell * .07), SS = S + B * 4;
        for (const p of g.pieces) {
          p.path = piecePath(g.edges, p.c, p.r, cell, pad);
          const spr = mkCanvas(S * D, S * D), x = spr.getContext('2d');
          x.setTransform(D, 0, 0, D, 0, 0);
          x.save(); x.clip(p.path);
          x.drawImage(g.picCv, pad - p.c * cell, pad - p.r * cell, g.bw, g.bh);
          x.lineJoin = 'round'; x.lineWidth = bev * 2.2;
          x.save(); x.translate(bev, bev); x.strokeStyle = 'rgba(255,255,255,.42)'; x.stroke(p.path); x.restore();
          x.save(); x.translate(-bev, -bev); x.strokeStyle = 'rgba(10,6,30,.38)'; x.stroke(p.path); x.restore();
          x.restore();
          x.lineWidth = 1.1; x.strokeStyle = 'rgba(12,8,30,.5)'; x.stroke(p.path);
          p.spr = spr;
          // soft drop shadow, drawn at half resolution (it's blurry anyway)
          const shc = mkCanvas(SS * k, SS * k), y = shc.getContext('2d');
          y.setTransform(k, 0, 0, k, 0, 0);
          y.translate(B * 2 - 4000, B * 2);
          y.shadowColor = '#000'; y.shadowBlur = B * k * 1.6; y.shadowOffsetX = 4000 * k;
          y.fillStyle = '#000'; y.fill(p.path);
          p.sh = shc; p.B = B;
        }
        g.dirty = true;
      }
      function assignSlots(animate, dur = 480, stagger = 0) {
        const loose = g.pieces.filter(p => !p.locked && !(g.drag && g.drag.id === p.id));
        const slots = shuffle(g.slots.slice());
        const now = performance.now();
        loose.forEach((p, i) => {
          const s = slots[i % Math.max(1, slots.length)] || { x: g.W / 2, y: g.H / 2, jx: 0, jy: 0 };
          const nx = s.x - g.cell / 2 + rand(-s.jx, s.jx), ny = s.y - g.cell / 2 + rand(-s.jy, s.jy);
          if (animate && !reduce) p.anim = { fx: p.x, fy: p.y, tx: nx, ty: ny, t0: now + Math.random() * stagger, dur, ease: easeInOut };
          else { p.anim = null; p.x = nx; p.y = ny; }
        });
        g.order = g.order.filter(id => !g.pieces[id].locked);
        g.dirty = true;
      }
      function scatter(fromBtn) {
        if (g.done || g.intro || g.paused) return;
        audio.sfx('whoosh');
        assignSlots(true, 520, 120);
        if (fromBtn) announce('Unplaced pieces scattered.');
      }
      function setPeek(on) {
        g.peek = on; store.set('game.puzzle.peek', on);
        peekBtn.setAttribute('aria-pressed', String(on)); audio.sfx('click'); g.dirty = true;
      }
      function announce(t) { live.textContent = t; }

      /* ---------- timer ---------- */
      function elapsed() { return g.acc + (g.running ? performance.now() - g.runFrom : 0); }
      function runTimer(on) {
        if (on === g.running) return;
        if (on) { g.runFrom = performance.now(); g.running = true; } else { g.acc = elapsed(); g.running = false; }
      }
      function visibility(hidden) {
        if (g.done || !g.started) return;
        if (hidden) { if (g.running) { runTimer(false); g.hiddenPaused = true; } if (g.drag) endDrag(false); }
        else if (g.hiddenPaused && !g.paused) { g.hiddenPaused = false; runTimer(true); }
      }
      let pauseOv = null;
      function escape() {
        if (g.kbHold) { endDrag(true); return; }
        if (g.done || g.intro) return;
        if (g.paused) resume(); else pause();
      }
      function pause() {
        if (g.paused) return;
        g.paused = true; if (g.drag) endDrag(false);
        runTimer(false);
        const btn = h('button', { class: 'btn solid', type: 'button', text: 'Keep going', onclick: resume });
        pauseOv = h('div', { class: 'overlay' }, h('div', { class: 'ocard' },
          h('p', { class: 'kicker', text: 'Paused' }), h('h3', { text: U.gentle ? 'Take your time.' : 'Tea break.' }),
          h('p', { text: 'The timer\'s stopped. The pieces promise not to move.' }),
          h('div', { class: 'row' }, btn, h('a', { class: 'btn ghost', href: '#/map', text: 'Back to map' }))));
        stage.append(pauseOv); setTimeout(() => btn.focus({ preventScroll: true }), 30);
      }
      function resume() {
        if (!g.paused) return;
        g.paused = false; pauseOv?.remove(); pauseOv = null;
        if (g.started && !document.hidden) runTimer(true);
        cv.focus({ preventScroll: true });
      }

      /* ---------- input ---------- */
      function local(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
      function hit(x, y, fuzzy) {
        for (let i = g.order.length - 1; i >= 0; i--) {
          const p = g.pieces[g.order[i]];
          if (p.locked || p.snapping) continue;
          const lx = x - p.x + g.pad, ly = y - p.y + g.pad;
          if (lx < 0 || ly < 0 || lx > g.S || ly > g.S) continue;
          if (hitCtx.isPointInPath(p.path, lx, ly)) return p;
        }
        if (fuzzy) {
          let best = null, bd = g.cell * .6;
          for (let i = g.order.length - 1; i >= 0; i--) {
            const p = g.pieces[g.order[i]];
            if (p.locked || p.snapping) continue;
            const d = Math.hypot(x - (p.x + g.cell / 2), y - (p.y + g.cell / 2));
            if (d < bd) { bd = d; best = p; }
          }
          return best;
        }
        return null;
      }
      function toTop(p) { g.order = g.order.filter(id => id !== p.id); g.order.push(p.id); }
      function begin() { if (!g.started) { g.started = true; runTimer(true); } }
      function startDrag(p, pt, pointerId) {
        p.anim = null; toTop(p); begin();
        g.drag = { id: p.id, pid: pointerId, ox: pt.x - p.x, oy: pt.y - p.y, lift: 0, t0: performance.now() };
        g.sel = p.id; g.dirty = true;
        audio.sfx('tick');
      }
      function endDrag(trySnap) {
        const d = g.drag; if (!d) return;
        g.drag = null; g.kbHold = false;
        const p = g.pieces[d.id];
        try { if (d.pid != null && cv.hasPointerCapture(d.pid)) cv.releasePointerCapture(d.pid); } catch {}
        g.dirty = true;
        if (!trySnap) return;
        const dist = Math.hypot(p.x - tx(p), p.y - ty(p));
        if (dist < Math.max(12, g.cell * .3)) {
          p.snapping = true;
          p.anim = { fx: p.x, fy: p.y, tx: tx(p), ty: ty(p), t0: performance.now(), dur: reduce ? 1 : 110, ease: easeOut, then: () => lock(p) };
        } else audio.tap();
      }
      cv.addEventListener('pointerdown', e => {
        if (!g.alive || g.done || g.paused || g.intro || g.drag) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const pt = local(e);
        const p = hit(pt.x, pt.y, e.pointerType !== 'mouse');
        if (!p) return;
        e.preventDefault();
        try { cv.setPointerCapture(e.pointerId); } catch {}
        startDrag(p, pt, e.pointerId);
      });
      cv.addEventListener('pointermove', e => {
        const d = g.drag;
        if (!d || d.pid !== e.pointerId) {
          if (!g.drag && e.pointerType === 'mouse' && !g.done) { const pt = local(e); cv.style.cursor = (!g.intro && hit(pt.x, pt.y, false)) ? 'grab' : ''; }
          return;
        }
        e.preventDefault();
        const pt = local(e), p = g.pieces[d.id];
        p.x = pt.x - d.ox; p.y = pt.y - d.oy; clampPos(p);
        cv.style.cursor = 'grabbing';
        g.dirty = true;
      });
      const up = e => { if (g.drag && g.drag.pid === e.pointerId) { endDrag(e.type !== 'pointercancel'); cv.style.cursor = ''; } };
      cv.addEventListener('pointerup', up);
      cv.addEventListener('pointercancel', up);
      cv.addEventListener('lostpointercapture', e => { if (g.drag && g.drag.pid === e.pointerId) endDrag(true); });
      cv.addEventListener('contextmenu', e => e.preventDefault());
      cv.addEventListener('focus', () => { g.focus = true; try { g.kbVis = cv.matches(':focus-visible'); } catch { g.kbVis = false; } if (g.sel < 0 || g.pieces[g.sel]?.locked) g.sel = g.order.at(-1) ?? -1; g.dirty = true; });
      cv.addEventListener('blur', () => { g.focus = false; if (g.kbHold) endDrag(true); g.dirty = true; });
      cv.addEventListener('keydown', e => {
        if (!g.kbVis) { g.kbVis = true; g.dirty = true; }
        if (g.done || g.paused || g.intro) return;
        const k = e.key;
        const loose = g.order.filter(id => !g.pieces[id].locked && !g.pieces[id].snapping);
        if (!loose.length) return;
        if (g.sel < 0 || !loose.includes(g.sel)) g.sel = loose.at(-1);
        if (k === 'Enter' || k === ' ') {
          e.preventDefault();
          if (g.kbHold) endDrag(true);
          else { const p = g.pieces[g.sel]; startDrag(p, { x: p.x, y: p.y }, null); g.kbHold = true; }
          return;
        }
        const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        if (!dirs[k]) return;
        e.preventDefault();
        if (g.kbHold && g.drag) {
          const p = g.pieces[g.drag.id], step = e.shiftKey ? g.cell : g.cell / 4;
          p.x += dirs[k][0] * step; p.y += dirs[k][1] * step; clampPos(p);
        } else {
          const i = loose.indexOf(g.sel), n = loose.length;
          g.sel = loose[(i + (dirs[k][0] + dirs[k][1] > 0 ? 1 : -1) + n) % n];
          toTop(g.pieces[g.sel]);
          audio.sfx('tick');
        }
        g.dirty = true;
      });

      /* ---------- placing ---------- */
      function lock(p) {
        p.snapping = false; p.locked = true; p.x = tx(p); p.y = ty(p);
        g.order = g.order.filter(id => id !== p.id);
        g.placed++;
        cntEl.textContent = `${g.placed}/${N}`;
        audio.sfx('pop');
        const now = performance.now(), cx = p.x + g.cell / 2, cy = p.y + g.cell / 2;
        g.flashes.push({ p, t0: now });
        if (!reduce) {
          const parts = [];
          for (let i = 0; i < 7; i++) parts.push({ a: i / 7 * Math.PI * 2 + rand(-.3, .3), v: g.cell * rand(.45, .8), r: rand(2, 4.5), c: i % 2 ? T.paper : T.gold });
          g.sparks.push({ x: cx, y: cy, t0: now, parts });
        }
        announce(`Piece placed. ${g.placed} of ${N}.`);
        if (g.sel === p.id) g.sel = g.order.at(-1) ?? -1;
        g.dirty = true;
        if (g.placed === N) complete();
      }
      function complete() {
        g.done = true; runTimer(false);
        g.secs = Math.max(1, Math.round(elapsed() / 1000));
        g.doneAt = performance.now();
        timeEl.textContent = fmtTime(g.secs);
        cntEl.textContent = `${N}/${N} ✓`;
        peekBtn.hidden = true; scatBtn.hidden = true;
        // rewards + records
        const key = `game.puzzle.best.${pic.id}-${df.id}`;
        const prev = store.get(key, null);
        const isNew = prev == null || g.secs < prev;
        if (isNew) store.set(key, g.secs);
        store.stat('puzzles');
        store.statMax('bestPuzzlePieces', N);
        const r = cv.getBoundingClientRect();
        const pt = { x: r.left + g.bx + g.bw / 2, y: r.top + g.by + g.bh / 2 };
        g.result = { prev, isNew, best: isNew ? g.secs : prev, award: df.award };
        ctx.award(df.award, pt);
        ctx.stamp();
        audio.sfx('win');
        later(() => fx.confetti(130, { x: pt.x, y: r.top + g.by + g.bh * .3, stars: true }), 450);
        announce(`Puzzle complete in ${fmtTime(g.secs)}.`);
        later(showResults, 2000);
      }
      let resOv = null;
      function showResults() {
        if (!g.done || resOv) return;
        resBtn.hidden = true;
        const R = g.result;
        const again = h('button', { class: 'btn solid', type: 'button', text: 'Play again', onclick: e => { audio.sfx('click'); startGame(pic.id, df.id, { focus: wantFocus(e) }); } });
        const card = h('div', { class: 'ocard pz-res' },
          h('p', { class: 'kicker', style: { color: 'var(--peach)' }, text: `${df.name} · ${N} pieces${pic.sub && !pic.gen && pic.sub !== 'Photo' ? ' · ' + pic.sub : ''}` }),
          h('h3', { text: (U.gentle ? DONE_TITLES_GENTLE : DONE_TITLES)[Math.floor(Math.random() * 4)] }),
          h('p', { text: pic.line }),
          h('div', { class: 'big-score', text: fmtTime(g.secs) }),
          R.isNew && R.prev != null ? h('span', { class: 'newbest', text: 'New best time' })
            : h('p', { class: 'fine', text: R.prev == null ? 'First finish at this size. That\'s the time to beat.' : `Best: ${fmtTime(R.best)}` }),
          h('p', { class: 'pz-earn', text: `+${R.award} ✦ stardust` }),
          h('div', { class: 'row' }, again, h('button', { class: 'btn', type: 'button', text: 'Another picture', onclick: () => { audio.sfx('click'); showPicker(); } })),
          h('div', { class: 'row' },
            h('button', { class: 'btn ghost small', type: 'button', text: 'Admire it', onclick: () => { resOv?.remove(); resOv = null; resBtn.hidden = false; } }),
            h('a', { class: 'btn ghost small', href: '#/map', text: 'Back to map' })));
        resOv = h('div', { class: 'overlay pz-ov' }, card);
        stage.append(resOv);
        setTimeout(() => again.focus({ preventScroll: true }), 40);
      }

      /* ---------- frame + draw ---------- */
      function frame(t) {
        if (!g.alive || !g.picCv) return;
        const now = performance.now();
        if (g.running) {
          const s = Math.floor(elapsed() / 1000);
          if (s !== g.lastSec) { g.lastSec = s; timeEl.textContent = fmtTime(s); }
        }
        let busy = false;
        for (const p of g.pieces) {
          const a = p.anim; if (!a) continue;
          busy = true;
          const k = clamp((now - a.t0) / a.dur, 0, 1), e = a.ease(k);
          p.x = lerp(a.fx, a.tx, e); p.y = lerp(a.fy, a.ty, e);
          if (k >= 1) { p.anim = null; a.then && a.then(); }
        }
        if (g.drag && g.drag.lift < 1) { g.drag.lift = Math.min(1, (now - g.drag.t0) / 120); busy = true; }
        if (g.sparks.length || g.flashes.length) busy = true;
        if (g.done && now - g.doneAt < 3600) busy = true;
        if (busy || g.dirty) { draw(now); g.dirty = false; }
      }
      function roundRect(x, y, w, hh, r) { c2.beginPath(); c2.roundRect ? c2.roundRect(x, y, w, hh, r) : c2.rect(x, y, w, hh); }
      function drawPiece(p, scale, shadow) {
        const S = g.S, ox = p.x - g.pad, oy = p.y - g.pad;
        if (scale !== 1) { c2.save(); const cx = p.x + g.cell / 2, cy = p.y + g.cell / 2; c2.translate(cx, cy); c2.scale(scale, scale); c2.translate(-cx, -cy); }
        if (shadow) {
          const B = p.B, off = shadow > 1 ? g.cell * .09 : g.cell * .03;
          c2.globalAlpha = shadow > 1 ? .55 : .42;
          c2.drawImage(p.sh, ox - B * 2 + off * .5, oy - B * 2 + off, S + B * 4, S + B * 4);
          c2.globalAlpha = 1;
        }
        c2.drawImage(p.spr, ox, oy, S, S);
        if (scale !== 1) c2.restore();
      }
      function draw(now) {
        const { D, W, H } = g;
        c2.setTransform(D, 0, 0, D, 0, 0);
        c2.clearRect(0, 0, W, H);
        const doneK = g.done ? clamp((now - g.doneAt) / 1100, 0, 1) : 0;
        // board
        if (g.done) {
          const pulse = (now - g.doneAt) < 3600 ? .5 + .5 * Math.sin((now - g.doneAt) / 260) : .5;
          c2.save();
          c2.shadowColor = rgba(T.gold, (.45 + .35 * pulse) * easeOut(doneK));
          c2.shadowBlur = (20 + 22 * pulse) * D;
          roundRect(g.bx, g.by, g.bw, g.bh, 4); c2.fillStyle = T.gold; c2.fill();
          c2.restore();
        }
        roundRect(g.bx - 1, g.by - 1, g.bw + 2, g.bh + 2, 5);
        c2.fillStyle = rgba(T.night, .55); c2.fill();
        c2.lineWidth = 1.5; c2.strokeStyle = rgba(T.gold, .4); c2.stroke();
        if (g.peek && !g.done) { c2.globalAlpha = .2; c2.drawImage(g.picCv, g.bx, g.by, g.bw, g.bh); c2.globalAlpha = 1; }
        // locked pieces
        for (const p of g.pieces) if (p.locked) c2.drawImage(p.spr, p.x - g.pad, p.y - g.pad, g.S, g.S);
        // flashes on freshly locked pieces
        for (let i = g.flashes.length - 1; i >= 0; i--) {
          const f = g.flashes[i], k = (now - f.t0) / 380;
          if (k >= 1) { g.flashes.splice(i, 1); continue; }
          c2.save(); c2.globalCompositeOperation = 'lighter'; c2.globalAlpha = (1 - k) * .45;
          c2.drawImage(f.p.spr, f.p.x - g.pad, f.p.y - g.pad, g.S, g.S); c2.restore();
        }
        // seams fade into the clean picture
        if (doneK > 0) {
          c2.globalAlpha = easeInOut(doneK);
          c2.drawImage(g.picCv, g.bx, g.by, g.bw, g.bh);
          c2.globalAlpha = 1;
          c2.lineWidth = 2; c2.strokeStyle = rgba(T.gold, .8 * doneK);
          roundRect(g.bx - 1, g.by - 1, g.bw + 2, g.bh + 2, 4); c2.stroke();
        }
        // loose pieces (drag on top)
        for (const id of g.order) {
          const p = g.pieces[id];
          if (p.locked) continue;
          const dragging = g.drag && g.drag.id === id;
          const lift = dragging ? easeOut(g.drag.lift) : 0;
          drawPiece(p, 1 + .05 * lift, dragging ? 2 : 1);
        }
        // keyboard selection
        if (g.focus && g.kbVis && !g.done && g.sel >= 0 && !g.pieces[g.sel].locked) {
          const p = g.pieces[g.sel];
          c2.save(); c2.translate(p.x - g.pad, p.y - g.pad);
          c2.setLineDash([5, 4]); c2.lineWidth = 2.5; c2.strokeStyle = g.kbHold ? T.hud : T.gold; c2.stroke(p.path);
          c2.restore();
        }
        // sparkles
        for (let i = g.sparks.length - 1; i >= 0; i--) {
          const s = g.sparks[i], k = (now - s.t0) / 560;
          if (k >= 1) { g.sparks.splice(i, 1); continue; }
          const e = easeOut(k);
          c2.globalAlpha = 1 - k;
          for (const q of s.parts) {
            const x = s.x + Math.cos(q.a) * q.v * e, y = s.y + Math.sin(q.a) * q.v * e, r = q.r * (1 - k * .5);
            c2.fillStyle = q.c; c2.beginPath();
            c2.moveTo(x, y - r * 2); c2.quadraticCurveTo(x, y, x + r * 2, y); c2.quadraticCurveTo(x, y, x, y + r * 2);
            c2.quadraticCurveTo(x, y, x - r * 2, y); c2.quadraticCurveTo(x, y, x, y - r * 2); c2.fill();
          }
          c2.globalAlpha = 1;
        }
      }
    }

    ctx.cleanup(() => { if (game) { game.destroy(); game = null; } });
    showPicker();
    // debug hook for automated tests: window.__pz.solve() moves every piece home
    ctx.cleanup(() => { if (window.__pz && window.__pz.owner === wrap) delete window.__pz; });
    window.__pz = { owner: wrap, get g() { return game && game._g; }, start: (p, d) => startGame(p, d), picker: () => showPicker() };
  },
};
