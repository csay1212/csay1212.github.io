// The Lollipop Machine: a capsule-toy machine that sells stickers for
// stardust, plus the sticker album they go in.
import { clamp, rand, pick } from '../core/dom.js';
import { zodiacFor, STONES, FLOWERS, showersFor, seasonFor, poss, pluralName } from './almanac-data.js';

const PRICE = 20, REFUND = 5, STAMP_AT = 8, COMPLETE_BONUS = 100;
const ODDS = { common: .70, rare: .25, legendary: .05 };
const TAU = Math.PI * 2;

// Twenty-four stickers. Most are fun and generic; a few come from the universe's
// own date (its sign, birthstone, flower and meteor shower), and the two rarest
// are the people themselves.
const FLOWER_EMOJI = { white_flower: '💮', bouquet: '💐', sunflower: '🌻', tulip: '🌷', rose: '🌹', hibiscus: '🌺', cherry_blossom: '🌸' };
function makeStickers(U) {
  const D = U.date, them = U.them.name, me = U.me.name;
  const sign = zodiacFor(D.m, D.d), stone = STONES[D.m - 1], flower = FLOWERS[D.m - 1];
  const sh = showersFor(D.m, D.d), season = seasonFor(D.m, D.d).north;
  const bday = U.occ === 'birthday' || U.occ === 'belated';
  const SEASON = { spring: ['🌷', 'Spring Tulip'], summer: ['☀️', 'Summer Sun'], autumn: ['🍂', 'Autumn Leaf'], winter: ['❄️', 'Snowflake'] }[season];
  const meteorName = sh.main ? sh.main.name.replace(/s$/, '') : 'Shooting Star';
  return [
    { id: 'lolli', e: '🍭', name: 'Swirl Lollipop', flavor: 'The house specialty. The machine is named after it, after all.', r: 'common' },
    { id: 'cap', e: '🧢', name: 'Propeller Cap', flavor: 'Propeller sold separately.', r: 'common' },
    { id: 'cake', e: '🎂', name: bday ? 'Birthday Cake' : 'Party Cake', flavor: bday ? 'Structurally sound. Mostly.' : 'Any occasion is a cake occasion. Structurally sound. Mostly.', r: 'common' },
    { id: 'balloon', e: '🎈', name: 'Balloon', flavor: 'Floats, like two friends on a hill.', r: 'common' },
    { id: 'star', e: '⭐', name: 'Caught Star', flavor: 'One of the twelve. Still glows a little.', r: 'common' },
    { id: 'moon', e: '🌙', name: 'Lamplight Moon', flavor: 'Hung slightly crooked on purpose.', r: 'common' },
    { id: 'popcorn', e: '🍿', name: 'Premiere Popcorn', flavor: 'Extra butter. It’s a premiere.', r: 'common' },
    { id: 'ticket', e: '🎟️', name: 'Admit One', flavor: `Valid for one trip to the ${U.verse}.`, r: 'common' },
    { id: 'boba', e: '🧋', name: 'Bubble Tea', flavor: 'Extra pearls. No regrets.', r: 'common' },
    { id: 'piano', e: '🎹', name: 'Hill Piano', flavor: 'Slightly out of tune. Charming.', r: 'common' },
    { id: 'gift', e: '🎁', name: 'Wrapped Present', flavor: 'Wrapped perfectly. Shake it gently.', r: 'common' },
    { id: 'cat', e: '🐱', name: 'Generic Cat', flavor: 'Just a cat. Extremely good at it.', r: 'common' },
    { id: 'sign', e: sign.g + '\uFE0F', name: sign.name, flavor: `The sign for ${D.long}: ${sign.trait}.`, r: 'rare' },
    { id: 'stone', gem: stone, name: stone.name, flavor: `${D.month}’s birthstone. Shiny, and very sure of itself.`, r: 'rare' },
    { id: 'meteor', e: '☄️', name: meteorName, flavor: sh.main ? `It streaks across the sky around ${D.long}. Make a wish; it’s required.` : 'Make a wish. It’s required.', r: 'rare' },
    { id: 'season', e: SEASON[0], name: SEASON[1], flavor: `${D.month} weather, bottled.`, r: 'rare' },
    { id: 'flower', e: FLOWER_EMOJI[flower.emoji] || '🌸', name: flower.name.split(' & ')[0], flavor: `${D.month}’s birth flower. Artist’s interpretation.`, r: 'rare' },
    { id: 'rocket', e: '🚀', name: 'Rocket', flavor: `Fueled entirely by wishes. Destination: the ${U.verse}.`, r: 'rare' },
    { id: 'planet', e: '🪐', name: `${poss(them)} Planet`, flavor: 'Delivery address for wishes and very important mail.', r: 'rare' },
    { id: 'clapper', e: '🎬', name: 'Clapperboard', flavor: 'Scene 4, take 12. The one with cake.', r: 'rare' },
    { id: 'date', cal: [D.mon, D.d], name: D.long, flavor: U.occDef && U.occDef.yearly ? 'Circled on every calendar. Every year.' : 'Circled on every calendar.', r: 'legendary' },
    { id: 'crown', e: '👑', name: U.group ? 'Main Characters' : 'Main Character', flavor: U.group ? 'For the main characters. Obviously.' : 'For the main character. Obviously.', r: 'legendary' },
    { id: 'them', img: U.them.photoURL || U.themSticker, photo: !!U.them.photoURL, name: them, flavor: U.gentle ? `The rarest one in the machine. Kept close, always.` : `The rarest sticker in the ${U.verse}. Handle with care.`, r: 'legendary' },
    { id: 'me', img: U.me.photoURL || U.meSticker, photo: !!U.me.photoURL, name: `${me} (Rare Find)`, flavor: pluralName(me) ? 'They got stuck in the machine somehow. Finders keepers.' : `Got stuck in the machine somehow. Finders keepers.`, r: 'legendary' },
  ];
}
const RARITY = { common: 'Common', rare: 'Rare ✦', legendary: 'Legendary ✦✦✦' };

// capsule colors: [top, bottom]
const CAPS = {
  rose: ['#ef7fb0', '#fdf7ee'], mint: ['#86e6d8', '#fdf7ee'], sky: ['#9fd3ff', '#fdf7ee'], peach: ['#ff9a7a', '#fdf7ee'],
  red: ['#ff5a6e', '#fdf7ee'], lilac: ['#b59cff', '#f4eeff'], gold: ['#f5cc4a', '#fff6d8'], duo: ['#ef7fb0', '#b59cff'], duo2: ['#86e6d8', '#f5cc4a'],
};
const GLOBE_COLORS = ['rose', 'mint', 'sky', 'peach', 'red', 'lilac', 'rose', 'mint', 'sky', 'peach', 'red', 'lilac', 'duo', 'duo2', 'gold', 'rose', 'sky', 'lilac', 'mint', 'peach'];
const COMMON_CAPS = ['rose', 'mint', 'sky', 'peach', 'red', 'duo', 'duo2'];
const capFor = (id, rar) => rar === 'legendary' ? 'gold' : rar === 'rare' ? 'lilac' : COMMON_CAPS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % COMMON_CAPS.length];

function spiral(cx, cy, r, turns) {
  let d = '';
  const steps = Math.round(50 * turns);
  for (let i = 0; i <= steps; i++) { const t = i / steps, a = t * turns * TAU, rr = r * t; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1); }
  return d;
}

/* ---------------- the machine, in SVG (viewBox 400 x 690) ---------------- */
const VB_W = 400, VB_H = 690, GLOBE = { cx: 200, cy: 226, r: 160 };
const BACK_SVG = `<svg class="gc-svg gc-back" viewBox="0 0 ${VB_W} ${VB_H}" aria-hidden="true">
 <defs>
  <linearGradient id="gcRed" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8c0b22"/><stop offset=".13" stop-color="#e2304e"/><stop offset=".3" stop-color="#ff6079"/><stop offset=".55" stop-color="#e8304e"/><stop offset=".86" stop-color="#b8142f"/><stop offset="1" stop-color="#7a0a1d"/></linearGradient>
  <linearGradient id="gcGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2bf"/><stop offset=".45" stop-color="#f5cc4a"/><stop offset="1" stop-color="#a87a22"/></linearGradient>
  <linearGradient id="gcGoldH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9a6f1f"/><stop offset=".25" stop-color="#f3da8a"/><stop offset=".5" stop-color="#c79a35"/><stop offset=".75" stop-color="#fff0b8"/><stop offset="1" stop-color="#a87a22"/></linearGradient>
  <radialGradient id="gcGlass" cx=".4" cy=".32" r=".78"><stop offset="0" stop-color="#4a3a92" stop-opacity=".5"/><stop offset=".7" stop-color="#271b5c" stop-opacity=".68"/><stop offset="1" stop-color="#150f38" stop-opacity=".88"/></radialGradient>
  <radialGradient id="gcChute" cx=".5" cy=".15" r=".95"><stop offset="0" stop-color="#3a0b19"/><stop offset="1" stop-color="#0a0205"/></radialGradient>
 </defs>
 <ellipse cx="200" cy="674" rx="168" ry="12" fill="rgba(0,0,0,.42)"/>
 <rect x="196.5" y="30" width="7" height="24" rx="3" fill="#f6eee3"/>
 <circle cx="200" cy="24" r="20" fill="#ef7fb0"/>
 <path d="${spiral(200, 24, 17, 2.3)}" fill="none" stroke="#fff" stroke-width="4.2" stroke-linecap="round" opacity=".92"/>
 <circle cx="200" cy="24" r="20" fill="none" stroke="#b9417a" stroke-width="2"/>
 <ellipse cx="192" cy="15" rx="6" ry="3.4" fill="#fff" opacity=".6" transform="rotate(-30 192 15)"/>
 <path d="M146 72 Q146 44 200 44 Q254 44 254 72 Z" fill="url(#gcGold)" stroke="#8a6216" stroke-width="1.5"/>
 <path d="M164 58 Q176 50 194 49" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/>
 <circle cx="${GLOBE.cx}" cy="${GLOBE.cy}" r="${GLOBE.r}" fill="url(#gcGlass)"/>
 <path d="M104 402 H296 Q324 402 326 430 L338 618 Q340 648 310 648 H90 Q60 648 62 618 L74 430 Q76 402 104 402 Z" fill="url(#gcRed)" stroke="#5e0614" stroke-width="2"/>
 <path d="M90 424 Q87 520 80 626" stroke="#fff" stroke-opacity=".2" stroke-width="9" stroke-linecap="round" fill="none"/>
 <path d="M80 420 H320" stroke="url(#gcGoldH)" stroke-width="5" stroke-linecap="round"/>
 <path d="M70 630 H330" stroke="url(#gcGoldH)" stroke-width="5" stroke-linecap="round"/>
 <g fill="url(#gcGold)" stroke="#8a6216" stroke-width="1"><circle cx="90" cy="436" r="4"/><circle cx="310" cy="436" r="4"/><circle cx="82" cy="614" r="4"/><circle cx="318" cy="614" r="4"/></g>
 <rect x="136" y="430" width="128" height="28" rx="9" fill="#fbf3dd" stroke="url(#gcGoldH)" stroke-width="3"/>
 <text x="200" y="449.5" text-anchor="middle" font-family="JetBrains Mono, ui-monospace, monospace" font-size="12" font-weight="600" letter-spacing="2.4" fill="#9c0f27">✦ LOLLIPOP ✦</text>
 <rect x="96" y="470" width="90" height="98" rx="14" fill="#2a0813" stroke="url(#gcGoldH)" stroke-width="3"/>
 <rect x="134" y="484" width="14" height="44" rx="7" fill="#050103" stroke="#f5cc4a" stroke-width="2"/>
 <text x="141" y="553" text-anchor="middle" font-family="JetBrains Mono, ui-monospace, monospace" font-size="17" font-weight="600" fill="#f5cc4a">${PRICE} ✦</text>
 <circle cx="266" cy="519" r="50" fill="url(#gcGold)" stroke="#8a6216" stroke-width="2"/>
 <circle cx="266" cy="519" r="41" fill="#a5112b" stroke="#5e0614" stroke-width="2"/>
 <g stroke="#f5cc4a" stroke-width="2" stroke-linecap="round" opacity=".7">${Array.from({ length: 12 }, (_, i) => { const a = i / 12 * TAU; return `<line x1="${(266 + Math.cos(a) * 44).toFixed(1)}" y1="${(519 + Math.sin(a) * 44).toFixed(1)}" x2="${(266 + Math.cos(a) * 48).toFixed(1)}" y2="${(519 + Math.sin(a) * 48).toFixed(1)}"/>`; }).join('')}</g>
 <path d="M146 642 V612 Q146 588 170 588 H230 Q254 588 254 612 V642 Z" fill="url(#gcChute)" stroke="url(#gcGoldH)" stroke-width="4"/>
 <rect x="94" y="644" width="54" height="20" rx="8" fill="#3a0a16"/><rect x="252" y="644" width="54" height="20" rx="8" fill="#3a0a16"/>
</svg>`;
const FRONT_SVG = `<svg class="gc-svg gc-front" viewBox="0 0 ${VB_W} ${VB_H}" aria-hidden="true">
 <defs>
  <radialGradient id="gcShade" cx=".5" cy=".42" r=".56"><stop offset=".72" stop-color="#0b0820" stop-opacity="0"/><stop offset="1" stop-color="#0b0820" stop-opacity=".5"/></radialGradient>
  <linearGradient id="gcGoldF" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9a6f1f"/><stop offset=".25" stop-color="#f3da8a"/><stop offset=".5" stop-color="#c79a35"/><stop offset=".75" stop-color="#fff0b8"/><stop offset="1" stop-color="#a87a22"/></linearGradient>
 </defs>
 <circle cx="${GLOBE.cx}" cy="${GLOBE.cy}" r="${GLOBE.r}" fill="url(#gcShade)"/>
 <circle cx="${GLOBE.cx}" cy="${GLOBE.cy}" r="${GLOBE.r - 1.5}" fill="none" stroke="#fff" stroke-opacity=".42" stroke-width="3"/>
 <path d="M66 200 A136 136 0 0 1 168 96" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="12" stroke-linecap="round"/>
 <path d="M62 236 L62 226" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="10" stroke-linecap="round"/>
 <ellipse cx="124" cy="132" rx="15" ry="7" fill="#fff" opacity=".6" transform="rotate(-42 124 132)"/>
 <path d="M342 248 A142 142 0 0 1 302 336" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="7" stroke-linecap="round"/>
 <rect x="82" y="374" width="236" height="34" rx="15" fill="url(#gcGoldF)" stroke="#8a6216" stroke-width="1.5"/>
 <rect x="94" y="386" width="212" height="5" rx="2.5" fill="#8a6216" opacity=".3"/>
 <path d="M104 381 H200" stroke="#fff" stroke-opacity=".5" stroke-width="2.4" stroke-linecap="round"/>
 <g class="gc-flap"><rect x="150" y="591" width="100" height="32" rx="7" fill="#fff" fill-opacity=".12" stroke="#fff" stroke-opacity=".35" stroke-width="1.5"/><path d="M160 598 H200" stroke="#fff" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/></g>
 <rect x="134" y="626" width="132" height="17" rx="8.5" fill="url(#gcGoldF)" stroke="#8a6216" stroke-width="1.5"/>
</svg>`;
const CRANK_SVG = `<svg viewBox="-50 -50 100 100" aria-hidden="true">
 <defs>
  <linearGradient id="gcArm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b8862b"/><stop offset=".45" stop-color="#fff0b8"/><stop offset="1" stop-color="#a87a22"/></linearGradient>
  <radialGradient id="gcHub" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff6d0"/><stop offset=".55" stop-color="#f5cc4a"/><stop offset="1" stop-color="#9a6f1f"/></radialGradient>
 </defs>
 <g class="gc-hintarc"><path d="M 0 -47 A 47 47 0 0 1 40.7 -23.5" fill="none" stroke="#fff6d0" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 7"/><path d="M 44 -30 L 41 -22 L 33 -25" fill="none" stroke="#fff6d0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>
 <g class="gc-arm">
  <rect x="-7.5" y="-38" width="15" height="40" rx="7.5" fill="url(#gcArm)" stroke="#8a6216" stroke-width="1.5"/>
  <circle cx="0" cy="-34" r="11.5" fill="#fbf3dd" stroke="#8a6216" stroke-width="2"/>
  <circle cx="-3.5" cy="-37.5" r="3.5" fill="#fff"/>
  <circle r="16" fill="url(#gcHub)" stroke="#8a6216" stroke-width="2"/>
  <path d="M-7 0 H7 M0 -7 V7" stroke="#8a6216" stroke-width="2.6" stroke-linecap="round"/>
 </g>
</svg>`;

/* ---------------- capsule sprites for the globe canvas ---------------- */
function capsuleSprite(top, bottom, px) {
  const c = document.createElement('canvas'); c.width = c.height = px;
  const g = c.getContext('2d'), m = px / 2, r = px / 2 - Math.max(1, px * .02);
  g.save(); g.beginPath(); g.arc(m, m, r, 0, TAU); g.clip();
  const bt = g.createLinearGradient(0, m, 0, px); bt.addColorStop(0, bottom); bt.addColorStop(1, shade(bottom, -.18));
  g.fillStyle = bt; g.fillRect(0, m, px, m);
  // a little something inside the clear half
  g.globalAlpha = .28; g.fillStyle = top; g.beginPath(); g.arc(m + r * .15, m + r * .42, r * .22, 0, TAU); g.fill(); g.globalAlpha = 1;
  const tp = g.createRadialGradient(m - r * .35, m - r * .5, r * .1, m, m, r * 1.1);
  tp.addColorStop(0, shade(top, .35)); tp.addColorStop(.55, top); tp.addColorStop(1, shade(top, -.28));
  g.fillStyle = tp; g.fillRect(0, 0, px, m);
  g.fillStyle = 'rgba(30,10,30,.22)'; g.fillRect(0, m - px * .035, px, px * .07);
  g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(0, m - px * .035, px, px * .014);
  const sh = g.createRadialGradient(m - r * .3, m - r * .3, r * .5, m, m, r);
  sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(20,5,30,.28)');
  g.fillStyle = sh; g.fillRect(0, 0, px, px);
  g.restore();
  g.strokeStyle = 'rgba(40,10,40,.4)'; g.lineWidth = Math.max(1, px * .025);
  g.beginPath(); g.arc(m, m, r, 0, TAU); g.stroke();
  g.save(); g.translate(m - r * .38, m - r * .5); g.rotate(-.65);
  g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(0, 0, r * .24, r * .1, 0, 0, TAU); g.fill();
  g.restore();
  return c;
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = n >> 8 & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round(r + (t - r) * p); g = Math.round(g + (t - g) * p); b = Math.round(b + (t - b) * p);
  return `rgb(${r},${g},${b})`;
}

/* ---------------- a physics globe full of capsules ---------------- */
function makeGlobe(canvas, reduce) {
  const U = 320, C = 160, R = 151, CR = 24, N = 20;
  const g = canvas.getContext('2d');
  let k = 1, dpr = 1, sprites = {}, bodies = [], awake = 60, held = null;
  function spawn(color, x, y) {
    return { x, y, vx: rand(-30, 30), vy: 0, a: rand(0, TAU), w: rand(-1, 1), c: color, s: 1, alpha: 1 };
  }
  // start piled up at the bottom
  const order = [...GLOBE_COLORS].sort(() => Math.random() - .5);
  for (let i = 0; i < N; i++) {
    const row = Math.floor(i / 5), col = i % 5;
    bodies.push(spawn(order[i % order.length], C + (col - 2) * (CR * 2.05) + (row % 2 ? CR : 0) * .5, C + R - CR - row * CR * 1.8 - 4));
  }
  function size() {
    const r = canvas.getBoundingClientRect();
    const css = Math.max(40, r.width);
    dpr = Math.min(devicePixelRatio || 1, 2); k = css / U;
    canvas.width = Math.round(css * dpr); canvas.height = Math.round(css * dpr);
    const px = Math.ceil(CR * 2 * k * dpr);
    sprites = {};
    for (const [name, [top, bottom]] of Object.entries(CAPS)) sprites[name] = capsuleSprite(top, bottom, px);
    awake = 30; draw();
  }
  function step(dt) {
    const G = 1500, E = .28;
    for (const b of bodies) {
      if (b === held) continue;
      b.vy += G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt;
      b.w *= .985; b.vx *= .998; b.vy *= .998;
    }
    for (let it = 0; it < 4; it++) {
      for (let i = 0; i < bodies.length; i++) {
        const a = bodies[i]; if (a === held) continue;
        for (let j = i + 1; j < bodies.length; j++) {
          const b = bodies[j]; if (b === held) continue;
          const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, min = CR * 2;
          if (d2 >= min * min || d2 === 0) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, o = (min - d) / 2;
          a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o;
          if (it === 0) {
            const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (rv < 0) {
              const imp = -(1 + E) * rv / 2;
              a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny;
              const vt = (b.vx - a.vx) * -ny + (b.vy - a.vy) * nx;
              a.w += vt * .01; b.w -= vt * .01;
            }
          }
        }
      }
      for (const b of bodies) {
        if (b === held) continue;
        const dx = b.x - C, dy = b.y - C, d = Math.hypot(dx, dy), lim = R - CR;
        if (d > lim) {
          const nx = dx / d, ny = dy / d;
          b.x = C + nx * lim; b.y = C + ny * lim;
          const vn = b.vx * nx + b.vy * ny;
          if (vn > 0) { b.vx -= (1 + E) * vn * nx; b.vy -= (1 + E) * vn * ny; }
          const vt = b.vx * -ny + b.vy * nx;
          b.vx -= -ny * vt * .05; b.vy -= nx * vt * .05;
          b.w = b.w * .8 + vt / CR * .2;
        }
      }
    }
  }
  function energy() { let e = 0; for (const b of bodies) e += b.vx * b.vx + b.vy * b.vy + b.w * b.w * 100; return e / bodies.length; }
  function draw() {
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
    g.setTransform(k * dpr, 0, 0, k * dpr, 0, 0);
    for (const b of bodies) {
      const sp = sprites[b.c]; if (!sp) continue;
      g.save(); g.translate(b.x, b.y); g.rotate(b.a);
      if (b.s !== 1) g.scale(b.s, b.s);
      g.globalAlpha = b.alpha;
      g.drawImage(sp, -CR, -CR, CR * 2, CR * 2);
      g.restore();
    }
  }
  let anim = null, paused = false;
  function tick(dt) {
    if (paused || (awake <= 0 && !anim)) return;
    const h = Math.min(dt, 34) / 1000 / 2;
    step(h); step(h);
    if (anim) {
      const t = clamp((performance.now() - anim.t0) / anim.dur, 0, 1), e = t * t;
      const b = anim.b;
      b.x = anim.x0 + (C - anim.x0) * e; b.y = anim.y0 + (C + R + 10 - anim.y0) * e;
      b.s = 1 - .55 * e; b.alpha = 1 - e * e;
      if (t >= 1) { bodies = bodies.filter(o => o !== b); held = null; const done = anim.done; anim = null; done(); }
    }
    draw();
    awake = energy() < 60 ? awake - 1 : 60;
  }
  return {
    size, tick,
    jostle(power = 1, dir = 1) {
      if (reduce) power *= .5;
      for (const b of bodies) {
        if (b === held) continue;
        if (Math.random() < .6) { b.vy -= rand(220, 520) * power; b.vx += rand(-220, 220) * power; b.w += rand(-7, 7) * power; }
        // a gentle stir in the crank's direction
        const dx = b.x - C, dy = b.y - C, d = Math.hypot(dx, dy) || 1;
        b.vx += -dy / d * 120 * power * dir; b.vy += dx / d * 120 * power * dir;
      }
      awake = 60;
    },
    // send one capsule (ideally of the given color) out through the bottom
    release(color) {
      return new Promise(res => {
        if (!bodies.length) { res(); return; }
        const pool = bodies.filter(b => b.c === color);
        const lowest = (pool.length ? pool : bodies).reduce((a, b) => (b.y > a.y ? b : a));
        held = lowest; awake = 60;
        anim = { b: lowest, t0: performance.now(), dur: reduce ? 120 : 340, x0: lowest.x, y0: lowest.y, done: res };
      });
    },
    restock(color) {
      bodies.push(spawn(color || pick(GLOBE_COLORS), C + rand(-50, 50), C - R + CR + 6));
      awake = 60;
    },
    hold(on) { paused = !!on; },
    count: () => bodies.length,
  };
}

/* =====================================================================
   The view
   ===================================================================== */
export default {
  css: 'gacha',
  mount(ctx) {
    const { store, audio, fx, U } = ctx;
    const H = ctx.h, reduce = ctx.reduce;
    const T = U.theme;
    const STICKERS = makeStickers(U);
    const BY_ID = Object.fromEntries(STICKERS.map(s => [s.id, s]));
    const me = U.me.name;

    /* ---------- persistence ---------- */
    const owned = () => store.get('stickers', {}) || {};
    const distinct = () => STICKERS.filter(s => owned()[s.id] > 0).length;
    const freeLeft = () => !store.wasSeen('gacha-free');

    /* ---------- sticker art ---------- */
    function stickerArt(def, opts = {}) {
      const el = H('span', { class: `stk r-${def.r}${opts.missing ? ' missing' : ''}${opts.cls ? ' ' + opts.cls : ''}`, 'aria-hidden': 'true' });
      if (def.img && def.photo) el.append(H('span', { class: 'stk-photo' }, H('img', { src: def.img, alt: '', draggable: 'false' })));
      else if (def.img) el.append(H('span', { class: 'stk-char' }, H('img', { src: def.img, alt: '', draggable: 'false' })));
      else if (def.cal) el.append(H('span', { class: 'stk-cal' }, H('b', { text: def.cal[0] }), H('i', { text: String(def.cal[1]) })));
      else if (def.gem) el.append(H('span', { class: 'stk-gem' + (def.gem.opal ? ' opal' : ''), style: { '--g1': def.gem.c[0], '--g2': def.gem.c[1], '--g3': def.gem.c[2] } }, H('i')));
      else el.append(H('span', { class: 'stk-emo', text: def.e }));
      if (opts.missing) el.append(H('span', { class: 'stk-q', text: '?' }));
      return el;
    }

    /* ---------- DOM ---------- */
    const globeCv = H('canvas', { class: 'gc-globe', 'aria-hidden': 'true' });
    const slotBtn = H('button', { class: 'gc-slotbtn', type: 'button', 'aria-label': `Insert ${PRICE} stardust` });
    const crankBtn = H('button', { class: 'gc-crank', type: 'button', 'aria-label': 'Turn the crank', html: CRANK_SVG });
    const arm = crankBtn.querySelector('.gc-arm');
    const coin = H('span', { class: 'gc-coin', 'aria-hidden': 'true', text: '✦' });
    const capBtn = H('button', { class: 'gc-cap', type: 'button', 'aria-label': 'Open the capsule', hidden: true },
      H('span', { class: 'h t' }), H('span', { class: 'h b' }), H('span', { class: 'shine' }));
    const machine = H('div', { class: 'gc-machine' });
    machine.innerHTML = BACK_SVG;
    machine.append(globeCv, capBtn);
    machine.insertAdjacentHTML('beforeend', FRONT_SVG);
    machine.append(coin, slotBtn, crankBtn);
    const mwrap = H('div', { class: 'gc-mwrap' }, machine);

    const bal = H('b', { class: 'gc-bal' });
    const pulls = H('span', { class: 'gc-pulls' });
    const mainBtn = H('button', { class: 'btn solid big gc-main', type: 'button' });
    const hint = H('p', { class: 'gc-hint', 'aria-live': 'polite' });
    // places that pay out stardust, but only the worlds this universe actually has
    const earn = ['flight', 'bakery', 'probe', 'tapdance', 'wordle', 'chords', 'puzzle'].map(id => ctx.WORLDS.find(w => w.id === id)).filter(Boolean).slice(0, 2);
    const need = H('div', { class: 'gc-need', hidden: true },
      H('p', { class: 'gc-needtxt' }),
      earn.length ? H('div', { class: 'row' }, earn.map((w, i) => H('a', { class: 'btn small ' + (i ? 'rose' : 'hud'), href: '#/w/' + w.id, text: `${w.icon} ${w.short || w.name}` }))) : null);
    const panel = H('div', { class: 'gc-panel' },
      H('div', { class: 'gc-balrow' }, H('span', { class: 'kicker muted', text: 'Your stardust' }), bal, pulls),
      mainBtn, hint, need,
      H('div', { class: 'gc-odds' },
        H('div', { class: 'gc-odds-chips' }, H('span', { class: 'c', text: 'Common 70%' }), H('span', { class: 'r', text: 'Rare 25%' }), H('span', { class: 'l', text: 'Legendary 5%' })),
        H('p', { class: 'gc-odds-note', text: 'Three duplicates in a row, and the next one is guaranteed new.' })),
      H('p', { class: 'keys gc-keys' }, H('kbd', { text: 'Space' }), H('kbd', { text: 'Enter' }), 'do the next thing'));
    const left = H('div', { class: 'gc-left' }, mwrap, panel);

    const albumGrid = H('div', { class: 'gc-grid', role: 'list' });
    const albumCount = H('span', { class: 'gc-acount' });
    const albumBar = H('i');
    const album = H('section', { class: 'card gc-album', 'aria-label': 'Sticker album' },
      H('div', { class: 'gc-ahead' }, H('h3', { text: 'Sticker Album' }), albumCount),
      H('div', { class: 'gc-abar', 'aria-hidden': 'true' }, albumBar),
      albumGrid);
    const intro = H('div', { class: 'wintro gc-intro' },
      H('p', { class: 'kicker rose', text: 'Studio · stickers for stardust' }),
      H('h2', { text: 'Turn the crank.' }),
      H('p', { class: 'lede', text: `Twenty stardust buys one capsule, and every capsule has a sticker inside. There are twenty-four to collect. Some are rare. A few are very, very rare.` }));
    const right = H('div', { class: 'gc-right' }, intro, album);
    const wrap = H('div', { class: 'gc' }, left, right);
    ctx.root.append(wrap);
    ctx.peek(mwrap, 'gacha-hide', { left: 'calc(81% - 9px)', top: '61.5%', rotate: 24, size: 30 });

    /* ---------- globe ---------- */
    const globe = makeGlobe(globeCv, reduce);
    ctx.raf((t, dt) => globe.tick(dt));
    const resize = () => { machine.style.setProperty('--mw', machine.clientWidth + 'px'); globe.size(); };
    if (typeof ResizeObserver === 'function') { const ro = new ResizeObserver(resize); ro.observe(globeCv); ctx.cleanup(() => ro.disconnect()); }
    else ctx.on(window, 'resize', resize);
    resize();

    /* ---------- state machine: idle -> ready -> turning -> capsule -> reveal ---------- */
    let state = 'idle';
    if (store.get('gacha.pending', null) && BY_ID[store.get('gacha.pending')]) state = 'capsule';
    else if (store.get('gacha.coin', false)) state = 'ready';

    let shownDust = store.stardust();
    function paintBalance() { bal.textContent = '✦ ' + shownDust.toLocaleString('en-US'); }
    const offDust = store.on('stardust', e => {
      const later = e.delta > 0;
      if (later) ctx.timeout(() => { shownDust = store.stardust(); paintBalance(); paint(); }, 850);
      else { shownDust = store.stardust(); paintBalance(); paint(); }
    });
    ctx.cleanup(offDust);

    function paint() {
      const free = freeLeft(), dust = store.stardust(), can = free || dust >= PRICE;
      pulls.textContent = `${store.stats().pulls || 0} pull${(store.stats().pulls || 0) === 1 ? '' : 's'} so far`;
      machine.dataset.state = state;
      crankBtn.classList.toggle('ready', state === 'ready');
      slotBtn.classList.toggle('glow', state === 'idle' && can);
      slotBtn.disabled = state !== 'idle';
      crankBtn.setAttribute('aria-disabled', state === 'ready' ? 'false' : 'true');
      need.hidden = !(state === 'idle' && !can);
      mainBtn.disabled = state === 'turning' || state === 'dispensing' || state === 'reveal' || (state === 'idle' && !can);
      mainBtn.classList.toggle('rose', state === 'capsule');
      if (state === 'idle') {
        mainBtn.textContent = free ? 'First one\'s on the house ✦' : `Insert ${PRICE} ✦`;
        hint.textContent = free ? `The first one’s free. ${me} ${pluralName(me) ? 'insist' : 'insists'}.` : can ? 'Pop a coin in the slot, then turn the crank.' : '';
        if (!can) need.querySelector('.gc-needtxt').textContent = `You need ${PRICE - dust} more ✦ for a pull. ` + (earn.length ? 'The Arcade pays well:' : 'Finish worlds and collect passport stamps to earn more.');
      } else if (state === 'ready') { mainBtn.textContent = 'Turn the crank ↻'; hint.textContent = 'Coin\'s in. Drag the crank around, or just tap it.'; }
      else if (state === 'turning' || state === 'dispensing') { mainBtn.textContent = 'Turning…'; hint.textContent = 'Click, click, click…'; }
      else if (state === 'capsule') { mainBtn.textContent = 'Open the capsule'; hint.textContent = 'Something rolled out. Tap the capsule to open it.'; }
      else if (state === 'reveal') { mainBtn.textContent = 'Nice'; hint.textContent = ''; }
    }

    /* ---------- coin ---------- */
    function nudge(el) { if (reduce) return; el.classList.remove('nudge'); void el.offsetWidth; el.classList.add('nudge'); }
    function insert() {
      if (state !== 'idle') return;
      audio.ac();
      if (freeLeft()) store.seen('gacha-free');
      else if (!store.spend(PRICE)) {
        audio.sfx('error'); nudge(slotBtn); paint();
        ctx.toast(`Not enough stardust yet. ${PRICE - store.stardust()} more to go.`);
        return;
      }
      audio.sfx('coin');
      coin.classList.remove('in'); void coin.offsetWidth; coin.classList.add('in');
      ctx.timeout(() => audio.sfx('tick'), reduce ? 10 : 420);
      state = 'ready'; store.set('gacha.coin', true);
      paint();
      ctx.timeout(() => { if (state === 'ready' && document.activeElement === mainBtn) crankBtn.focus({ preventScroll: true }); }, 50);
    }
    slotBtn.onclick = insert;

    /* ---------- crank ---------- */
    let angle = 0, progress = 0, nextClick = Math.PI / 6, auto = null;
    const setArm = () => { arm.style.transform = `rotate(${angle}rad)`; };
    function rotateBy(d) {
      angle += d; progress += Math.abs(d); setArm();
      while (progress >= nextClick && nextClick <= TAU + .001) {
        nextClick += Math.PI / 6;
        audio.sfx('tick');
        globe.jostle(.75, Math.sign(d) || 1);
        if (!reduce) { machine.classList.remove('rattle'); void machine.offsetWidth; machine.classList.add('rattle'); }
      }
      if (progress >= TAU - 1e-6 && state === 'turning') dispense();
    }
    function autoTurn() {
      if (state !== 'ready' && state !== 'turning') return;
      if (auto) return;
      state = 'turning'; paint();
      audio.ac();
      const remaining = Math.max(.01, TAU - progress), dur = reduce ? 350 : 1150 * remaining / TAU + 150;
      const t0 = performance.now();
      let done = 0;
      auto = ctx.raf(t => {
        const p = clamp((performance.now() - t0) / dur, 0, 1);
        const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        const target = remaining * e;
        rotateBy(target - done); done = target;
        if (p >= 1) {
          auto(); auto = null;
          if (state === 'turning') dispense();   // never get stuck a hair short of a full turn
        }
      });
    }
    let drag = null;
    function crankAngle(e) { const r = crankBtn.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)); }
    ctx.on(crankBtn, 'pointerdown', e => {
      if (e.button > 0) return;
      if (state === 'idle') { nudge(crankBtn); audio.sfx('error'); hint.textContent = freeLeft() ? 'Coin first! (This one\'s free.)' : 'Coin first. The crank is locked until then.'; nudge(slotBtn); return; }
      if (state !== 'ready' && state !== 'turning') return;
      if (auto) return;
      e.preventDefault();
      try { crankBtn.setPointerCapture(e.pointerId); } catch {}
      audio.ac();
      drag = { id: e.pointerId, last: crankAngle(e), moved: 0, dragged: false };
    });
    ctx.on(crankBtn, 'pointermove', e => {
      if (!drag || drag.id !== e.pointerId) return;
      e.preventDefault();
      const a = crankAngle(e);
      let d = a - drag.last; drag.last = a;
      if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU;
      drag.moved += Math.abs(d);
      if (!drag.dragged && drag.moved > .3) { drag.dragged = true; state = 'turning'; paint(); }
      if (drag.dragged && state === 'turning') rotateBy(d);
    });
    const endCrank = e => {
      if (!drag || drag.id !== e.pointerId) return;
      const d = drag; drag = null;
      crankBtn.dataset.skipClick = '1';
      ctx.timeout(() => { delete crankBtn.dataset.skipClick; }, 400);
      if (state === 'dispensing' || state === 'capsule') return;
      if (!d.dragged || progress > Math.PI * 1.1) autoTurn();
      else { state = 'ready'; paint(); hint.textContent = 'Keep going! All the way around.'; }
    };
    ctx.on(crankBtn, 'pointerup', endCrank);
    ctx.on(crankBtn, 'pointercancel', endCrank);
    ctx.on(crankBtn, 'lostpointercapture', endCrank);
    crankBtn.onclick = () => {
      if (crankBtn.dataset.skipClick) return;
      if (state === 'ready' || (state === 'turning' && !auto && !drag)) autoTurn();
      else if (state === 'idle') { nudge(crankBtn); audio.sfx('error'); }
    };

    /* ---------- roll + dispense ---------- */
    function roll() {
      const have = owned();
      const missing = STICKERS.filter(s => !(have[s.id] > 0));
      const x = Math.random();
      const rar = x < ODDS.legendary ? 'legendary' : x < ODDS.legendary + ODDS.rare ? 'rare' : 'common';
      let pool = STICKERS.filter(s => s.r === rar);
      if ((store.get('gacha.dups', 0) || 0) >= 3 && missing.length) {
        const sameTier = missing.filter(s => s.r === rar);
        pool = sameTier.length ? sameTier : missing;
      }
      return pick(pool).id;
    }
    async function dispense() {
      state = 'dispensing'; paint();
      const id = roll();
      store.set('gacha.pending', id); store.set('gacha.coin', false); store.stat('pulls');
      progress = 0; nextClick = Math.PI / 6;
      const def = BY_ID[id], color = capFor(id, def.r);
      audio.sfx('whoosh');
      await globe.release(color);
      if (!ctx.alive()) return;
      ctx.timeout(() => globe.restock(), 900);
      showCapsule(id, true);
    }
    function showCapsule(id, animate) {
      const def = BY_ID[id], [c1, c2] = CAPS[capFor(id, def.r)];
      capBtn.style.setProperty('--c1', c1); capBtn.style.setProperty('--c2', c2);
      capBtn.className = 'gc-cap ' + 'cap-' + def.r + (animate && !reduce ? ' drop' : '');
      capBtn.hidden = false;
      machine.classList.add('has-cap');
      if (animate) {
        ctx.timeout(() => { audio.sfx('thud'); }, reduce ? 0 : 330);
        ctx.timeout(() => { if (def.r !== 'common') audio.sfx('sparkle'); }, reduce ? 0 : 600);
      }
      state = 'capsule'; paint();
      ctx.timeout(() => { if (ctx.alive() && state === 'capsule' && (document.activeElement === mainBtn || document.activeElement === crankBtn || document.activeElement === document.body)) capBtn.focus({ preventScroll: true }); }, 700);
    }
    capBtn.onclick = () => openCapsule();

    /* ---------- open + reveal ---------- */
    let revealEl = null;
    function openCapsule() {
      if (state !== 'capsule') return;
      const id = store.get('gacha.pending', null);
      const def = BY_ID[id];
      if (!def) { state = 'idle'; capBtn.hidden = true; machine.classList.remove('has-cap'); paint(); return; }
      audio.ac();
      // apply the sticker right away so nothing is lost if the player leaves mid-animation
      const have = { ...owned() };
      const before = have[id] || 0;
      have[id] = before + 1;
      store.set('stickers', have);
      store.set('gacha.pending', null);
      const isNew = before === 0;
      store.set('gacha.dups', isNew ? 0 : (store.get('gacha.dups', 0) || 0) + 1);
      if (isNew) store.update('gacha.found', f => ({ ...(f || {}), [id]: Date.now() }), {});
      state = 'reveal'; paint();
      const r = capBtn.getBoundingClientRect();
      audio.sfx('open');
      fx.burst(r.left + r.width / 2, r.top + r.height / 2, 22, def.r === 'legendary' ? [T.gold, '#fff1bf', '#ffffff'] : def.r === 'rare' ? [T.lilac, '#ece4ff', '#ffffff'] : undefined);
      capBtn.classList.remove('drop'); capBtn.classList.add('open');
      ctx.timeout(() => {
        capBtn.hidden = true; capBtn.classList.remove('open'); machine.classList.remove('has-cap');
        showReveal(def, isNew, have[id]);
      }, reduce ? 60 : 430);
      paintAlbum(id);
    }
    function showReveal(def, isNew, n) {
      const close = H('button', { class: 'btn ghost', type: 'button', text: 'Nice' });
      const again = H('button', { class: 'btn solid rose', type: 'button' });
      const badge = isNew ? H('span', { class: 'gc-new', text: 'NEW!' }) : H('span', { class: 'gc-dup', text: `Duplicate · +${REFUND} ✦ back` });
      const card = H('div', { class: `gc-rcard r-${def.r}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': `You got ${def.name}` },
        H('p', { class: 'kicker gc-rk', text: RARITY[def.r] }),
        H('div', { class: 'gc-rart' }, stickerArt(def, { cls: 'big' })),
        H('h3', { text: def.name }),
        H('p', { class: 'gc-flavor', text: def.flavor }),
        H('div', { class: 'gc-rmeta' }, badge, n > 1 ? H('span', { class: 'gc-have', text: `You have ×${n}` }) : null),
        H('div', { class: 'row gc-rbtns' }, again, close));
      revealEl = H('div', { class: `gc-reveal r-${def.r}` }, H('div', { class: 'gc-rays', 'aria-hidden': 'true' }), card);
      ctx.root.append(revealEl);
      document.body.classList.add('lock-scroll');
      wrap.classList.add('held'); globe.hold(true);
      const paintAgain = () => {
        const can = freeLeft() || store.stardust() >= PRICE;
        again.disabled = !can;
        again.textContent = can ? `Again · ${PRICE} ✦` : `Need ${PRICE - store.stardust()} more ✦`;
      };
      paintAgain();
      const offA = store.on('stardust', () => ctx.timeout(paintAgain, 900));
      ctx.cleanup(offA);
      const finish = (pullAgain) => {
        if (!revealEl) return;
        offA();
        const el = revealEl; revealEl = null;
        el.classList.add('out');
        ctx.timeout(() => el.remove(), 260);
        document.body.classList.remove('lock-scroll');
        wrap.classList.remove('held'); globe.hold(false);
        state = 'idle'; paint();
        if (pullAgain) insert();
        mainBtn.focus({ preventScroll: true });
        afterReveal();
      };
      close.onclick = () => finish(false);
      again.onclick = () => finish(true);
      revealEl.addEventListener('click', e => { if (e.target === revealEl) finish(false); });
      revealEl._finish = finish;
      ctx.timeout(() => close.focus({ preventScroll: true }), 80);
      // sound + sparkle by rarity
      if (def.r === 'legendary') {
        audio.sfx('win');
        fx.confetti(170, { stars: true, colors: [T.gold, '#fff1bf', T.rose, '#ffffff'] });
      } else if (def.r === 'rare') {
        audio.sfx('perfect');
        const r = card.getBoundingClientRect(); fx.burst(r.left + r.width / 2, r.top + r.height * .35, 36, [T.lilac, '#ece4ff', T.hud, '#ffffff']);
      } else { audio.sfx('pop'); ctx.timeout(() => audio.sfx('sparkle'), 120); }
      if (!isNew) ctx.timeout(() => ctx.award(REFUND, badge), 500);
    }
    function afterReveal() {
      // the passport stamp waits until the player has had a proper look at the sticker
      if (distinct() >= STAMP_AT && !store.hasStamp('gacha')) ctx.timeout(() => ctx.stamp(), 300);
      if (distinct() >= STICKERS.length && !store.wasSeen('gacha-complete')) ctx.timeout(celebrate, store.hasStamp('gacha') ? 350 : 3300);
    }
    function celebrate() {
      if (store.seen('gacha-complete')) return;
      audio.sfx('win');
      fx.confetti(240, { stars: true });
      const body = H('div', { class: 'gc-done' },
        H('div', { class: 'gc-done-art' }, stickerArt(BY_ID.crown), stickerArt(BY_ID.them, { cls: 'big' }), stickerArt(BY_ID.me)),
        H('p', { class: 'lede', text: `All twenty-four stickers. The album is complete, the machine is impressed, and ${me} ${pluralName(me) ? 'are' : 'is'} honestly a little emotional about it.` }),
        H('p', { class: 'hand gc-done-note', text: `+${COMPLETE_BONUS} ✦ completion bonus` }));
      ctx.modal({ title: 'Album complete!', body });
      ctx.award(COMPLETE_BONUS, { x: innerWidth / 2, y: innerHeight * .4 });
    }

    /* ---------- album ---------- */
    const cells = {};
    function paintAlbum(flashId) {
      const have = owned();
      const n = distinct();
      albumCount.textContent = `${n} / ${STICKERS.length} · ${Math.round(n / STICKERS.length * 100)}%`;
      albumBar.style.width = (n / STICKERS.length * 100) + '%';
      // only rebuild the cells that changed (sticker art with outlines is not free to paint)
      STICKERS.forEach((def, i) => {
        const c = have[def.id] || 0, old = cells[def.id];
        if (old && old._c === c && def.id !== flashId) return;
        const cell = buildCell(def, i, c, def.id === flashId);
        cell._c = c;
        if (old) old.replaceWith(cell); else albumGrid.append(cell);
        cells[def.id] = cell;
      });
    }
    function buildCell(def, i, c, flash) {
      const got = c > 0;
      const cell = H('button', {
        class: `gc-cell r-${def.r}${got ? ' got' : ''}${flash ? ' flash' : ''}`, type: 'button', role: 'listitem',
        'aria-label': got ? `${def.name}, ${def.r}${c > 1 ? `, ×${c}` : ''}` : `Sticker ${i + 1}, ${def.r}, not found yet`,
      },
        H('span', { class: 'gc-no', text: 'No. ' + String(i + 1).padStart(2, '0') }),
        stickerArt(def, { missing: !got }),
        H('span', { class: 'gc-nm', text: got ? def.name : '???' }),
        c > 1 ? H('span', { class: 'gc-x', text: '×' + c }) : null);
      cell.onclick = () => {
        if (got) { detail(def); return; }
        audio.sfx('click');
        ctx.toast(def.r === 'legendary' ? 'A legendary one. Still somewhere in the machine.' : def.r === 'rare' ? 'A rare one. Still in the machine somewhere.' : 'Not found yet. Keep cranking.');
      };
      return cell;
    }
    function detail(def) {
      audio.sfx('click');
      const c = owned()[def.id] || 0;
      const when = (store.get('gacha.found', {}) || {})[def.id];
      const body = H('div', { class: `gc-detail r-${def.r}` },
        H('div', { class: 'gc-dart' }, stickerArt(def, { cls: 'big' })),
        H('p', { class: 'kicker gc-rk', text: RARITY[def.r] }),
        H('p', { class: 'gc-flavor', text: def.flavor }),
        H('p', { class: 'fine', text: `In your album ×${c}${when ? ' · first found ' + new Date(when).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}` }));
      ctx.modal({ title: def.name, body });
    }

    /* ---------- primary action (button, Space, Enter) ---------- */
    function primary() {
      if (state === 'idle') insert();
      else if (state === 'ready' || (state === 'turning' && !auto && !drag)) autoTurn();
      else if (state === 'capsule') openCapsule();
      else if (state === 'reveal' && revealEl) revealEl._finish(false);
    }
    mainBtn.onclick = primary;
    ctx.on(window, 'keydown', e => {
      if (document.querySelector('.modal-wrap')) return;
      if (e.key === 'Escape' && revealEl) { e.preventDefault(); revealEl._finish(false); return; }
      if (e.key !== ' ' && e.key !== 'Enter') return;
      const t = e.target;
      if (t && t !== document.body && t !== document.documentElement && (t.closest('button, a, input, textarea, select, [contenteditable]'))) return;
      if (e.repeat) return;
      e.preventDefault();
      primary();
    });
    ctx.cleanup(() => {
      if (revealEl) document.body.classList.remove('lock-scroll');
      // left in the middle of a reveal: still hand over the stamp that was earned
      if (distinct() >= STAMP_AT && !store.hasStamp('gacha')) ctx.stamp();
      if (distinct() >= STICKERS.length && !store.seen('gacha-complete')) store.award(COMPLETE_BONUS);
    });

    /* ---------- go ---------- */
    paintBalance();
    paintAlbum();
    if (state === 'capsule') showCapsule(store.get('gacha.pending'), false);
    paint();
    // catch up on rewards if the collection got there some other way
    if (distinct() >= STAMP_AT && !store.hasStamp('gacha')) ctx.timeout(() => ctx.stamp(), 800);
    if (distinct() >= STICKERS.length && !store.wasSeen('gacha-complete')) ctx.timeout(celebrate, 900);
    // welcome jiggle
    ctx.timeout(() => globe.jostle(.35), 350);
  },
};
