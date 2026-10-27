// Confetti (from the original film) as a shared overlay. Only animates while
// there's confetti on screen.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COLORS = ['#f5cc4a', '#ef7fb0', '#86e6d8', '#b59cff', '#f6eee3'];
let cf, cc, dpr = 1, bits = [], raf = 0;

function size() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  cf.width = innerWidth * dpr; cf.height = innerHeight * dpr; cc.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function loop() {
  cc.clearRect(0, 0, innerWidth, innerHeight);
  for (let i = bits.length - 1; i >= 0; i--) {
    const b = bits[i];
    b.vy += .25 * b.g; b.vx *= .99; b.x += b.vx; b.y += b.vy; b.r += b.vr;
    if (b.y > innerHeight + 40 || b.x < -60 || b.x > innerWidth + 60) { bits.splice(i, 1); continue; }
    cc.save(); cc.translate(b.x, b.y); cc.rotate(b.r); cc.fillStyle = b.c;
    if (b.star) { cc.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5, rr = k % 2 ? b.w * .45 : b.w; cc.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } cc.fill(); }
    else cc.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.r * 1.5)));
    cc.restore();
  }
  raf = bits.length ? requestAnimationFrame(loop) : 0;
  if (!raf) cc.clearRect(0, 0, innerWidth, innerHeight);
}

export const fx = {
  init(canvas) { cf = canvas; cc = cf.getContext('2d'); size(); addEventListener('resize', size); },
  // confetti(n, {x, y, spread, colors, stars})
  confetti(n = 160, o = {}) {
    if (reduce) return;
    const x = o.x ?? innerWidth / 2, y = o.y ?? innerHeight * .35, sp = o.spread ?? innerWidth * .4, cols = o.colors || COLORS;
    for (let i = 0; i < n; i++) bits.push({
      x: x + (Math.random() - .5) * sp, y, vx: (Math.random() - .5) * 14, vy: -Math.random() * 12 - 4, g: 1,
      w: 5 + Math.random() * 6, h: 8 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: cols[i % cols.length], star: o.stars && i % 3 === 0,
    });
    if (!raf) raf = requestAnimationFrame(loop);
  },
  // a small radial pop at a screen point (button clicks, catches)
  burst(x, y, n = 24, cols = COLORS) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, v = 2 + Math.random() * 5;
      bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, g: .5, w: 4 + Math.random() * 4, h: 4 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[i % cols.length], star: i % 2 === 0 });
    }
    if (!raf) raf = requestAnimationFrame(loop);
  },
};
