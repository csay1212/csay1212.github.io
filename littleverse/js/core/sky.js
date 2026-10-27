// The twinkling background sky shared by every scene, plus two extras:
// registered constellations glow in it, and a secret hyperspace jump.
// Star colors follow the universe's theme (sky.setPalette).
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let cv, cx, W = 0, H = 0, dpr = 1, stars = [], shoot = null, raf = 0, paused = 0;
let hyper = 0, consts = [], speedLines = [], frame = 0, dirty = true, density = 1;
let PAL = { gold: '245,204,74', rose: '239,127,176', paper: '246,238,227' };
const rgb = hex => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return null; const n = parseInt(m[1], 16); return `${n >> 16},${(n >> 8) & 255},${n & 255}`; };

function size() {
  dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  dirty = true;
  const n = Math.round(W * H / 5200 * density);
  stars = Array.from({ length: n }, () => ({
    x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + .2, p: Math.random() * 6.28, s: .5 + Math.random() * 1.5,
    c: Math.random() < .12 ? 'gold' : Math.random() < .2 ? 'rose' : 'paper',
  }));
}

function drawConsts(t) {
  for (const c of consts) {
    const pts = c.pts.map(([x, y]) => [c.x * W + (x - .5) * c.s, c.y * H + (y - .5) * c.s]);
    const a = .22 + .08 * Math.sin(t * .0012 + c.x * 10);
    cx.strokeStyle = `rgba(${PAL.gold},${a})`; cx.lineWidth = 1;
    cx.beginPath();
    for (const [i, j] of c.edges) { if (!pts[i] || !pts[j]) continue; cx.moveTo(pts[i][0], pts[i][1]); cx.lineTo(pts[j][0], pts[j][1]); }
    cx.stroke();
    cx.fillStyle = `rgba(255,236,170,${a + .4})`;
    for (const [x, y] of pts) { cx.beginPath(); cx.arc(x, y, 1.8, 0, 6.283); cx.fill(); }
    if (c.name) {
      cx.font = '10px "JetBrains Mono", monospace'; cx.textAlign = 'center';
      cx.fillStyle = `rgba(${PAL.gold},${a + .15})`;
      const by = Math.max(...pts.map(p => p[1]));
      cx.fillText(c.name.toUpperCase(), c.x * W, by + 16);
    }
  }
}

function draw(t) {
  raf = requestAnimationFrame(draw);
  if (paused > 0) return;
  // Twinkling is slow, so it only needs ~30 frames a second; full rate is kept for
  // shooting stars and hyperspace. With reduced motion the sky is drawn once.
  const busy = hyper > 0 || !!shoot;
  if (reduce && !busy && !dirty) return;
  if (!busy && (++frame & 1) && !dirty) return;
  dirty = false;
  cx.clearRect(0, 0, W, H);
  if (hyper > 0) {
    // hyperspace: stars streak outward from the center
    hyper -= 1;
    const k = Math.min(1, hyper / 60, (240 - hyper) / 40);
    for (const l of speedLines) {
      l.d *= 1.06 + .04 * k; if (l.d > Math.max(W, H)) { l.d = 4 + Math.random() * 20; l.a = Math.random() * 6.283; }
      const x1 = W / 2 + Math.cos(l.a) * l.d, y1 = H / 2 + Math.sin(l.a) * l.d;
      const x0 = W / 2 + Math.cos(l.a) * l.d * (1 - .18 * k), y0 = H / 2 + Math.sin(l.a) * l.d * (1 - .18 * k);
      cx.strokeStyle = `rgba(${l.c},${.5 + .5 * k})`; cx.lineWidth = 1.4; cx.beginPath(); cx.moveTo(x0, y0); cx.lineTo(x1, y1); cx.stroke();
    }
    return;
  }
  for (const s of stars) {
    const a = reduce ? .7 : .35 + .65 * Math.abs(Math.sin(s.p + t * .001 * s.s));
    cx.fillStyle = `rgba(${PAL[s.c]},${a})`; cx.beginPath(); cx.arc(s.x, s.y, s.r, 0, 6.283); cx.fill();
  }
  if (consts.length) drawConsts(t);
  if (!reduce) {
    if (!shoot && Math.random() < .0022 && !document.body.classList.contains('in-world')) shoot = { x: Math.random() * W * .8, y: Math.random() * H * .4, vx: 7 + Math.random() * 4, vy: 2.5 + Math.random() * 2, life: 1 };
    if (shoot) {
      const g = cx.createLinearGradient(shoot.x, shoot.y, shoot.x - shoot.vx * 14, shoot.y - shoot.vy * 14);
      g.addColorStop(0, `rgba(255,240,200,${shoot.life})`); g.addColorStop(1, 'rgba(255,240,200,0)');
      cx.strokeStyle = g; cx.lineWidth = 1.6; cx.beginPath(); cx.moveTo(shoot.x, shoot.y); cx.lineTo(shoot.x - shoot.vx * 14, shoot.y - shoot.vy * 14); cx.stroke();
      shoot.x += shoot.vx; shoot.y += shoot.vy; shoot.life -= .012; if (shoot.life <= 0) shoot = null;
    }
  } else if (raf) { /* static sky: keep drawing slowly */ }
}

export const sky = {
  // colors from the theme, and how starry the sky is (t.stars, 1 = the usual)
  setPalette(t) {
    PAL = { gold: rgb(t.gold) || PAL.gold, rose: rgb(t.rose) || PAL.rose, paper: rgb(t.paper) || PAL.paper };
    const d = t.stars > 0 ? t.stars : 1;
    if (d !== density) { density = d; if (cv) size(); }
    dirty = true;
  },
  init(canvas) {
    if (cv === canvas) return;
    cv = canvas; cx = cv.getContext('2d'); size();
    addEventListener('resize', size);
    raf = requestAnimationFrame(draw);
  },
  // games that fill the screen can pause the sky to save battery
  pause() { paused++; },
  resume() { paused = Math.max(0, paused - 1); dirty = true; },
  hyperspace() {
    if (reduce) return;
    speedLines = Array.from({ length: 220 }, () => ({ a: Math.random() * 6.283, d: 4 + Math.random() * Math.max(W, H) * .6, c: Math.random() < .2 ? '245,204,74' : Math.random() < .2 ? '239,127,176' : '246,238,227' }));
    hyper = 240;
  },
  shootingStar() { if (!reduce) shoot = { x: Math.random() * W * .5, y: Math.random() * H * .3, vx: 9, vy: 3.5, life: 1 }; },
  // [{name, pts:[[x,y]...] (0..1), edges:[[i,j]...], x, y (0..1 screen), s (px)}]
  setConstellations(list) { consts = list || []; dirty = true; },
};
