// Probe Delivery: the physics and the ten levels. No DOM in here, so the
// exact same code runs the aiming preview, the real flight, and the solver
// script that proves every level can be delivered with all three stars.
//
// World: a fixed 1600x900 space, y pointing down. Angles are in degrees with
// 0 = right and 90 = straight up. Fixed 120 Hz steps, semi-implicit Euler,
// softened gravity. Deterministic: same inputs, same flight, every time.

export const W = 1600, H = 900;
export const HZ = 120, DT = 1 / HZ;
export const MAX_STEPS = 12 * HZ;     // 12 seconds of flight, then the battery gives up
export const VMAX = 820;              // launch speed at 100% power (world units / s)
export const MIN_POWER = 0.1;
export const PROBE_R = 10;            // probe collision radius
export const STAR_R = 18;             // ✦ pickup radius (plus the probe's)
export const MARGIN = 50;             // how far past the edge before the signal is lost
const EPS2 = 14 * 14;                 // gravity softening
const RAD = Math.PI / 180;

/* -------------------------------------------------------------------------
   Levels. Bodies:
     planet / moon : x, y, r, mu (gravity), look (palette name), ring {tilt, k, c}
     moon + orbit  : orbit { cx, cy, R, a0 (deg), period (s, + = counterclockwise) }
     sun           : burns on touch
     hole          : black hole, r = event horizon (swallows)
     rock          : static collider, no gravity
   target: the recipient's planet. home: Mission Control (no gravity). start: probe.
   preview: how many steps of the dotted prediction to show.
   line: mission control's note for the level; `belated` replaces it for belated birthdays.
   ------------------------------------------------------------------------- */
export const LEVELS = [
  {
    name: 'First Light',
    line: 'Just aim for your planet, the one in the hat. Mission control believes in you.',
    home: { x: 220, y: 650, r: 44 }, start: { x: 270, y: 604 },
    aim: [0, 0.42],
    target: { x: 1330, y: 300, r: 60, mu: 1.2e6 },
    bodies: [
      { k: 'planet', x: 820, y: 690, r: 46, mu: 3.2e6, look: 'lilac' },
    ],
    stars: [[560, 490], [800, 400], [1060, 330]],
    preview: 900,
  },
  {
    name: 'Gravity Is Free',
    line: 'Planets pull. Use it. Gravity is free, unlike postage.',
    home: { x: 190, y: 470, r: 44 }, start: { x: 248, y: 450 },
    aim: [0, 0.55],
    target: { x: 1400, y: 470, r: 58, mu: 1.2e6 },
    bodies: [
      { k: 'planet', x: 800, y: 470, r: 96, mu: 1.15e7, look: 'peach', ring: { tilt: -14, k: 1.75, c: '#ffd9b8' } },
    ],
    stars: [[480, 330], [800, 250], [1120, 330]],
    preview: 600,
  },
  {
    name: 'The Rubble Belt',
    line: 'Rocks. Lots of them. Mission control counted twice and got two different numbers.',
    home: { x: 250, y: 780, r: 44 }, start: { x: 286, y: 734 },
    aim: [50, 0.5],
    target: { x: 1330, y: 170, r: 56, mu: 1.2e6 },
    bodies: [
      { k: 'planet', x: 800, y: 240, r: 74, mu: 2.1e7, look: 'mint' },
      { k: 'rock', x: -14, y: 463, r: 26 },
      { k: 'rock', x: 36, y: 473, r: 23 },
      { k: 'rock', x: 86, y: 467, r: 26 },
      { k: 'rock', x: 136, y: 471, r: 27 },
      { k: 'rock', x: 186, y: 474, r: 22 },
      { k: 'rock', x: 236, y: 475, r: 22 },
      { k: 'rock', x: 300, y: 482, r: 25 },
      { k: 'rock', x: 536, y: 478, r: 25 },
      { k: 'rock', x: 586, y: 473, r: 26 },
      { k: 'rock', x: 636, y: 471, r: 25 },
      { k: 'rock', x: 686, y: 476, r: 23 },
      { k: 'rock', x: 736, y: 463, r: 27 },
      { k: 'rock', x: 786, y: 460, r: 26 },
      { k: 'rock', x: 836, y: 468, r: 27 },
      { k: 'rock', x: 886, y: 456, r: 27 },
      { k: 'rock', x: 936, y: 480, r: 22 },
      { k: 'rock', x: 986, y: 461, r: 26 },
      { k: 'rock', x: 1036, y: 457, r: 24 },
      { k: 'rock', x: 1086, y: 480, r: 22 },
      { k: 'rock', x: 1186, y: 482, r: 24 },
      { k: 'rock', x: 1236, y: 471, r: 26 },
      { k: 'rock', x: 1286, y: 479, r: 25 },
      { k: 'rock', x: 1336, y: 478, r: 25 },
      { k: 'rock', x: 1386, y: 468, r: 27 },
      { k: 'rock', x: 1436, y: 481, r: 26 },
      { k: 'rock', x: 1486, y: 470, r: 23 },
      { k: 'rock', x: 1536, y: 484, r: 24 },
      { k: 'rock', x: 1586, y: 459, r: 22 },
    ],
    stars: [[405, 486], [635, 166], [1013, 84]],
    preview: 300,
  },
  {
    name: 'The Slingshot',
    line: 'Swing around the big one. It\'s called a slingshot. Very professional.',
    home: { x: 190, y: 170, r: 44 }, start: { x: 246, y: 188 },
    aim: [-10, 0.5],
    target: { x: 240, y: 740, r: 56, mu: 1.2e6 },
    bodies: [
      { k: 'planet', x: 800, y: 460, r: 92, mu: 6e7, look: 'sky', ring: { tilt: 18, k: 1.7, c: '#cfe9ff' } },
      { k: 'rock', x: -6, y: 460, r: 28 },
      { k: 'rock', x: 46, y: 469, r: 24 },
      { k: 'rock', x: 98, y: 454, r: 27 },
      { k: 'rock', x: 150, y: 467, r: 23 },
      { k: 'rock', x: 202, y: 451, r: 26 },
      { k: 'rock', x: 254, y: 464, r: 25 },
      { k: 'rock', x: 306, y: 456, r: 22 },
      { k: 'rock', x: 358, y: 470, r: 27 },
      { k: 'rock', x: 410, y: 453, r: 24 },
      { k: 'rock', x: 462, y: 465, r: 26 },
      { k: 'rock', x: 514, y: 457, r: 28 },
      { k: 'rock', x: 1290, y: 290, r: 22 }, { k: 'rock', x: 1250, y: 700, r: 25 },
    ],
    stars: [[674, 141], [962, 442], [670, 793]],
    preview: 240,
  },
  {
    name: 'Sunburn',
    line: 'That\'s the sun. Don\'t touch it. Same rule as the stove.',
    home: { x: 170, y: 470, r: 44 }, start: { x: 228, y: 452 },
    aim: [0, 0.5],
    target: { x: 1420, y: 470, r: 56, mu: 1.2e6 },
    bodies: [
      { k: 'sun', x: 790, y: 470, r: 74, mu: 4.2e7 },
      { k: 'planet', x: 1190, y: 190, r: 42, mu: 5e6, look: 'lilac' },
      { k: 'rock', x: 790, y: 140, r: 26 }, { k: 'rock', x: 790, y: 800, r: 26 },
      { k: 'rock', x: 520, y: 250, r: 22 }, { k: 'rock', x: 1070, y: 720, r: 23 },
    ],
    stars: [[465, 584], [791, 630], [1148, 585]],
    preview: 200,
  },
  {
    name: 'Event Horizon',
    line: 'A black hole. It keeps whatever it catches, so give it room.',
    belated: 'This black hole is where the calendar went. Give it room.',
    home: { x: 180, y: 720, r: 44 }, start: { x: 232, y: 684 },
    aim: [30, 0.5],
    target: { x: 1400, y: 220, r: 56, mu: 1.2e6 },
    bodies: [
      { k: 'hole', x: 800, y: 470, r: 26, mu: 8e7 },
      { k: 'planet', x: 1330, y: 680, r: 50, mu: 4e6, look: 'gold' },
      { k: 'rock', x: 420, y: 330, r: 22 }, { k: 'rock', x: 1020, y: 160, r: 24 },
    ],
    stars: [[363, 340], [643, 106], [1004, 63]],
    preview: 170,
  },
  {
    name: 'Moonwalk',
    line: 'The moon moves after launch. Timing matters. So does patience.',
    home: { x: 180, y: 450, r: 44 }, start: { x: 238, y: 440 },
    aim: [0, 0.5],
    target: { x: 1420, y: 450, r: 56, mu: 1.2e6 },
    bodies: [
      { k: 'planet', x: 800, y: 450, r: 80, mu: 9e6, look: 'mint', ring: { tilt: -20, k: 1.6, c: '#c9fff4' } },
      { k: 'moon', r: 30, mu: 3e6, look: 'moon', orbit: { cx: 800, cy: 450, R: 235, a0: 30, period: 6 } },
      { k: 'rock', x: 800, y: 70, r: 24 }, { k: 'rock', x: 800, y: 830, r: 24 },
    ],
    stars: [[466, 289], [792, 195], [1124, 292]],
    preview: 150,
  },
  {
    name: 'Cosmic Rush Hour',
    line: 'Rush hour in the cosmos. Signal early. Merge politely.',
    home: { x: 170, y: 160, r: 44 }, start: { x: 228, y: 176 },
    aim: [-20, 0.5],
    target: { x: 1440, y: 740, r: 56, mu: 1.2e6 },
    bodies: [
      { k: 'hole', x: 700, y: 520, r: 24, mu: 6e7 },
      { k: 'planet', x: 1120, y: 300, r: 70, mu: 8e6, look: 'lilac', ring: { tilt: 12, k: 1.7, c: '#e3d6ff' } },
      { k: 'planet', x: 1100, y: 760, r: 46, mu: 3.5e6, look: 'peach' },
      { k: 'rock', x: 520, y: 260, r: 22 }, { k: 'rock', x: 860, y: 140, r: 22 },
      { k: 'rock', x: 900, y: 600, r: 24 }, { k: 'rock', x: 1340, y: 520, r: 22 },
    ],
    stars: [[564, 190], [940, 331], [1215, 521]],
    preview: 130,
  },
  {
    name: 'Fire and Ice',
    line: 'Hot on one side, doom on the other. Thread the needle.',
    home: { x: 170, y: 760, r: 44 }, start: { x: 220, y: 726 },
    aim: [40, 0.5],
    target: { x: 1430, y: 160, r: 56, mu: 1.2e6 },
    bodies: [
      { k: 'sun', x: 560, y: 330, r: 66, mu: 1.4e7 },
      { k: 'hole', x: 1080, y: 560, r: 24, mu: 3.2e7 },
      { k: 'planet', x: 1150, y: 230, r: 50, mu: 4e6, look: 'sky' },
      { k: 'moon', r: 22, mu: 1.2e6, look: 'moon', orbit: { cx: 1150, cy: 230, R: 130, a0: 200, period: 5 } },
      { k: 'rock', x: 820, y: 820, r: 22 }, { k: 'rock', x: 860, y: 120, r: 24 },
      { k: 'rock', x: 790, y: 470, r: 26 }, { k: 'rock', x: 838, y: 430, r: 21 }, { k: 'rock', x: 742, y: 506, r: 22 }, { k: 'rock', x: 720, y: 410, r: 24 },
    ],
    stars: [[591, 790], [1036, 722], [1326, 507]],
    preview: 115,
  },
  {
    name: 'The Long Way Around',
    line: 'The long way around. Slow, but it lands.',
    belated: 'The long way around. Late, but it lands.',
    home: { x: 170, y: 640, r: 44 }, start: { x: 226, y: 620 },
    aim: [0, 0.5],
    target: { x: 720, y: 170, r: 46, mu: 1e6 },
    bodies: [
      { k: 'planet', x: 820, y: 500, r: 96, mu: 6e7, look: 'dusk', ring: { tilt: -12, k: 1.65, c: '#d9c8ff' } },
      { k: 'moon', r: 24, mu: 2e6, look: 'moon', orbit: { cx: 820, cy: 500, R: 175, a0: 0, period: 5 } },
      { k: 'hole', x: 1440, y: 170, r: 22, mu: 1.2e7 },
      { k: 'sun', x: 1400, y: 760, r: 54, mu: 8e6 },
      { k: 'rock', x: 745, y: 75, r: 24 },
      { k: 'rock', x: 695, y: 75, r: 26 },
      { k: 'rock', x: 651, y: 101, r: 23 },
      { k: 'rock', x: 625, y: 145, r: 27 },
      { k: 'rock', x: 625, y: 195, r: 25 },
      { k: 'rock', x: 651, y: 239, r: 24 },
      { k: 'rock', x: 695, y: 265, r: 26 },
      { k: 'rock', x: 745, y: 265, r: 23 },
    ],
    stars: [[565, 848], [923, 643], [938, 305]],
    preview: 100,
  },
];

/* ------------------------------------------------------------------------- */
const prepCache = new WeakMap();
function prep(L) {
  let P = prepCache.get(L);
  if (P) return P;
  const grav = [], hit = [];
  L.bodies.forEach((b, i) => {
    const o = b.orbit ? { cx: b.orbit.cx, cy: b.orbit.cy, R: b.orbit.R, a0: b.orbit.a0 * RAD, w: 2 * Math.PI / b.orbit.period } : null;
    const e = { i, k: b.k, x: b.x || 0, y: b.y || 0, r: b.r, mu: b.mu || 0, o };
    if (e.mu > 0) grav.push(e);
    hit.push(e);
  });
  const t = L.target;
  const tg = { i: -1, k: 'target', x: t.x, y: t.y, r: t.r, mu: t.mu || 0, o: null };
  if (tg.mu > 0) grav.push(tg);
  const home = { i: -2, k: 'home', x: L.home.x, y: L.home.y, r: L.home.r, mu: 0, o: null };
  hit.push(home);
  P = { grav, hit, tg };
  prepCache.set(L, P);
  return P;
}

// position of body b at step n (moons orbit; everything else stays put)
export function bodyPos(b, n) {
  if (!b.orbit) return [b.x, b.y];
  const o = b.orbit, a = o.a0 * RAD + 2 * Math.PI / o.period * n * DT;
  return [o.cx + o.R * Math.cos(a), o.cy - o.R * Math.sin(a)];
}

export function launchVel(angleDeg, power) {
  const a = angleDeg * RAD, v = VMAX * power;
  return [Math.cos(a) * v, -Math.sin(a) * v];
}

/**
 * Fly the probe. Returns
 *  { ok, cause, at (body index, -1 target, -2 home), steps, stars: [starIndex...], starSteps: [...],
 *    path (Float32Array x,y per step, only with opt.record), end: [x, y] }
 * cause: 'target' | 'planet' | 'moon' | 'sun' | 'hole' | 'rock' | 'home' | 'lost' | 'timeout' | 'preview'
 * opt.maxSteps stops early with cause 'preview' (used for the dotted aiming line).
 */
export function simulate(L, angleDeg, power, opt = {}) {
  const P = prep(L);
  const maxSteps = opt.maxSteps || MAX_STEPS;
  const record = !!opt.record;
  const path = record ? new Float32Array((maxSteps + 1) * 2) : null;
  let x = L.start.x, y = L.start.y;
  let [vx, vy] = launchVel(angleDeg, power);
  if (record) { path[0] = x; path[1] = y; }
  const got = [], gotStep = [];
  const sr2 = (STAR_R + PROBE_R) * (STAR_R + PROBE_R);
  const stars = L.stars;
  const grav = P.grav, hit = P.hit, tg = P.tg;
  const ng = grav.length, nh = hit.length;
  // moving bodies: positions cached per step
  const pos = new Float64Array(L.bodies.length * 2);
  const setPos = n => {
    for (let j = 0; j < nh; j++) {
      const b = hit[j]; if (b.i < 0) continue;
      if (b.o) { const a = b.o.a0 + b.o.w * n * DT; pos[b.i * 2] = b.o.cx + b.o.R * Math.cos(a); pos[b.i * 2 + 1] = b.o.cy - b.o.R * Math.sin(a); }
      else { pos[b.i * 2] = b.x; pos[b.i * 2 + 1] = b.y; }
    }
  };
  setPos(0);
  let n = 0, cause = 'timeout', at = null;
  const end = (c, i) => { cause = c; at = i; };
  outer:
  for (n = 1; n <= maxSteps; n++) {
    // gravity from bodies where they were at the start of this step
    let ax = 0, ay = 0;
    for (let j = 0; j < ng; j++) {
      const b = grav[j];
      const bx = b.i >= 0 ? pos[b.i * 2] : b.x, by = b.i >= 0 ? pos[b.i * 2 + 1] : b.y;
      const dx = bx - x, dy = by - y;
      const r2 = dx * dx + dy * dy + EPS2;
      const k = b.mu / (r2 * Math.sqrt(r2));
      ax += dx * k; ay += dy * k;
    }
    vx += ax * DT; vy += ay * DT;
    x += vx * DT; y += vy * DT;
    setPos(n);
    if (record) { path[n * 2] = x; path[n * 2 + 1] = y; }
    // ✦ pickups
    for (let s = 0; s < stars.length; s++) {
      if (got.includes(s)) continue;
      const dx = stars[s][0] - x, dy = stars[s][1] - y;
      if (dx * dx + dy * dy < sr2) { got.push(s); gotStep.push(n); }
    }
    // delivered?
    { const dx = tg.x - x, dy = tg.y - y, rr = tg.r + PROBE_R; if (dx * dx + dy * dy < rr * rr) { end('target', -1); break; } }
    // hazards
    for (let j = 0; j < nh; j++) {
      const b = hit[j];
      const bx = b.i >= 0 ? pos[b.i * 2] : b.x, by = b.i >= 0 ? pos[b.i * 2 + 1] : b.y;
      const dx = bx - x, dy = by - y, rr = b.r + PROBE_R;
      if (dx * dx + dy * dy < rr * rr) { end(b.k, b.i); break outer; }
    }
    if (x < -MARGIN || x > W + MARGIN || y < -MARGIN || y > H + MARGIN) { end('lost', null); break; }
  }
  if (n > maxSteps) { n = maxSteps; cause = maxSteps < MAX_STEPS ? 'preview' : 'timeout'; }
  return { ok: cause === 'target', cause, at, steps: n, stars: got, starSteps: gotStep, path, end: [x, y] };
}
