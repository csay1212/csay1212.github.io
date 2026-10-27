// The Grand Finale: fireworks over the hill that spell things out, then end
// credits starring the recipient (built from everything they did in this
// universe), then one last message. Unlocks at FINALE_NEEDS passport stamps.
import { h, icon } from '../core/dom.js';
import { FINALE_NEEDS, ALL_STAMPS, HIDDEN_TOTAL, HIDDEN_ON, WORLDS } from '../worlds.js';

const RANKS = ['', 'D', 'C', 'B', 'A', 'S'];
const hexN = s => { const m = /^#?([0-9a-f]{6})$/i.exec(String(s || '').trim()); return m ? parseInt(m[1], 16) : null; };
function mix(a, b, t) {
  const A = hexN(a), B = hexN(b);
  if (A == null || B == null) return a || b;
  return '#' + [16, 8, 0].map(s => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, '0')).join('');
}
const plural = (n, w, pl) => `${n.toLocaleString('en-US')} ${n === 1 ? w : (pl || w + 's')}`;

// the hidden friends, counted: "Theos", "Bennetts" (not "The Bennettss")
function hiddenName(me) {
  const n = String(me || '').trim().replace(/^the\s+/i, '');
  return /s$/i.test(n) ? n : n + 's';
}

// how many hidden friends were found (store.hiddenCount() if the store offers it,
// otherwise read the store's legacy key for them directly)
const hiddenFound = store => store.hiddenCount();

function creditLines(store, U) {
  const st = store.stats(), raw = store.raw(), best = k => store.getBest(k);
  const on = id => WORLDS.some(w => w.id === id);
  const wname = (id, fb) => (WORLDS.find(w => w.id === id) || {}).name || fb;
  const me = U.me.name, gentle = U.gentle;
  const L = [];
  const add = (role, name, note) => L.push({ role, name, note });
  if (on('flight') && best('flight') > 0) add('Pilot', plural(best('flight'), 'gate'), `${wname('flight', 'Flight Academy')}, top of the class`);
  if (on('bakery') && best('bakery') > 0) add('Master baker', plural(best('bakery'), 'layer'), 'The tallest cake in the galaxy, structurally questionable');
  const del = Object.keys(store.get('game.probe.stars', {}) || {}).length;
  if (on('probe') && del) add('Interplanetary courier', plural(del, 'delivery', 'deliveries'), 'Every message, delivered by hand');
  if (on('tapdance') && st.bestDanceRank) add('Tap dancer', `Rank ${RANKS[st.bestDanceRank] || 'B'}`, 'Under one streetlamp, on one hill');
  if (on('chords') && best('chords') > 0) add('Translator of chords', `${best('chords')} in a row`, 'Fluent in starlight. Probably.');
  if (on('puzzle') && st.puzzles) add('Portrait restorer', plural(st.puzzles, 'puzzle'), U.them.photoURL ? 'Every piece back where it belongs' : 'Two friends, reassembled');
  const words = ((store.get('game.wordle', {}) || {}).solved || []).length;
  if (on('wordle') && words) add('Word detective', `${words} of ${(U.copy.words || []).length || 12} words`, `${wname('wordle', 'Word game')} champion`);
  const consts = store.get('stars.list', []) || [];
  if (on('stars') && consts.length && consts[0].name) add('Astronomer', `“${consts[0].name}”`, 'A constellation, officially (unofficially) registered');
  const stickers = Object.keys(raw.stickers || {}).length;
  if (on('gacha') && stickers) add('Sticker collector', `${stickers} of 24`, `${wname('gacha', 'The Lollipop Machine')} thanks you for your business`);
  const promise = (U.copy.coupons || {}).mode === 'promise';
  const coup = Object.values(raw.coupons || {}).filter(c => c && (promise ? c.k : c.r)).length;
  if (on('coupons') && coup) add(promise ? 'Keeper of promises' : 'Coupon holder', promise ? `${coup} kept close` : `${coup} redeemed`, promise ? 'Every one of them, kept' : `${me} has been notified`);
  if (st.starsCaught) add('Star catcher', plural(st.starsCaught, 'star'), 'Every one of them carried a wish');
  if (on('mail') && st.lettersRead) add('Letter reader', plural(st.lettersRead, 'letter') + ' opened', gentle ? 'Every one of them, read slowly' : 'Some of them at the right moment, hopefully');
  if (on('reasons') && st.reasonsTurned) add('Card turner', plural(st.reasonsTurned, 'card') + ' turned', gentle ? 'Every one of them true' : 'Every one of them true. Ask anyone.');
  if (on('memories') && st.memoriesOpened) add('Keeper of memories', plural(st.memoriesOpened, 'memory', 'memories'), 'Walked all the way down the lane');
  if (on('mixtape') && st.mixtapePlays) add('On the decks', plural(st.mixtapePlays, 'play'), 'The mixtape, played on the format it deserves');
  if (on('trailer') && st.trailers) add('Premiere audience', `Watched ${st.trailers === 1 ? 'once' : st.trailers + ' times'}`, 'Front row, popcorn ready');
  const pin = hiddenFound(store);
  if (HIDDEN_ON && pin) add('Hide-and-seek champion', `Found ${pin} of ${HIDDEN_TOTAL} ${hiddenName(me)}`, pin >= HIDDEN_TOTAL ? `${me} had nowhere left to hide` : `${me} is still hiding somewhere`);
  return L;
}

export default {
  css: 'finale',
  mount(ctx) {
    const { store, audio, music, cat, U } = ctx;
    const T = U.theme || {};
    const gentle = U.gentle;
    const n = store.stampCount();
    const scene = h('div', { class: 'fn' + (gentle ? ' gentle' : '') });
    ctx.root.append(scene);
    ctx.pauseSky();
    const back = h('a', { class: 'back fn-back', href: '#/map', 'aria-label': 'Back to the map' }, icon('back'), h('span', { text: 'Map' }));

    /* ---------- the hill and the two characters (shared by every state) ---------- */
    const ground = mix(T.night || '#0c0b24', '#000000', .45), glow = T.gold || '#f5cc4a', lampC = mix(T.gold || '#f5cc4a', '#ffffff', .45);
    const hill = h('div', { class: 'fn-hill', 'aria-hidden': 'true', html: `<svg viewBox="0 0 800 160" preserveAspectRatio="none"><path d="M0 160 L0 92 C140 70 260 64 380 74 C520 86 640 62 800 70 L800 160Z" fill="${ground}"/><path d="M0 92 C140 70 260 64 380 74 C520 86 640 62 800 70" fill="none" stroke="${glow}" stroke-opacity=".28" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>` });
    const lamp = h('div', { class: 'fn-lamp', 'aria-hidden': 'true', html: `<svg viewBox="0 0 40 150"><circle cx="20" cy="22" r="22" fill="${lampC}" opacity=".25"/><rect x="18" y="26" width="4" height="124" fill="${ground}"/><path d="M10 26 H30 L26 10 H14Z" fill="${ground}"/><rect x="13" y="13" width="14" height="11" fill="${lampC}"/></svg>` });
    const cats = h('div', { class: 'fn-cats', 'aria-hidden': 'true' },
      h('div', { class: 'fn-cat g', html: cat.catSVG(cat.getDesign(), { spin: false }) }),
      h('div', { class: 'fn-cat p', html: cat.catSVG(cat.PRESETS.me, { spin: false }) }));

    /* ---------- locked ---------- */
    if (n < FINALE_NEEDS) {
      const left = FINALE_NEEDS - n;
      scene.classList.add('locked');
      scene.append(hill, lamp, cats, back, h('div', { class: 'fn-lock' },
        h('span', { class: 'fn-lock-ico' }, icon('lock')),
        h('p', { class: 'kicker gold', text: 'The Grand Finale' }),
        h('h2', { text: 'Not yet.' }),
        h('p', { class: 'lede', text: `The finale opens at ${plural(FINALE_NEEDS, 'passport stamp')}. ${left === 1 ? 'Just one more to go.' : `${left} more to go.`} Every world you finish adds one.` }),
        h('div', { class: 'fn-lock-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(FINALE_NEEDS), 'aria-valuenow': String(n), 'aria-label': 'Passport stamps' },
          h('i', { style: { width: Math.max(2, n / FINALE_NEEDS * 100) + '%' } })),
        h('p', { class: 'fn-lock-count', text: `${n} of ${FINALE_NEEDS} stamps` }),
        h('div', { class: 'fn-lock-acts' }, h('a', { class: 'btn solid', href: '#/map', text: 'Back to the map' }), h('button', { type: 'button', class: 'btn ghost', onclick: ctx.openPassport, text: 'See my passport' }))));
      return;
    }

    /* ---------- the stage ---------- */
    const cv = h('canvas', { class: 'fn-cv', 'aria-hidden': 'true' });
    const caption = h('div', { class: 'fn-cap', 'aria-live': 'polite' });
    const skip = h('button', { type: 'button', class: 'btn ghost small fn-skip', hidden: true }, 'Skip to the credits ▸');
    const roll = h('div', { class: 'fn-roll', hidden: true });
    scene.append(cv, hill, lamp, cats, caption, roll, back, skip);

    // firework colors: the theme's roles, softer and warmer for a memorial
    const COLORS = (gentle ? [T.gold, T.paper, T.peach, T.rose, T.sky] : [T.gold, T.rose, T.hud, T.lilac, T.peach, T.sky, T.paper]).filter(Boolean);
    const pickC = () => COLORS[Math.floor(Math.random() * Math.min(COLORS.length, 5))];

    /* ---------- fireworks engine ---------- */
    const c2 = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    const shells = [], parts = [];
    function size() {
      dpr = Math.min(devicePixelRatio || 1, innerWidth > 1400 ? 1.25 : 1.75);
      W = innerWidth; H = innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); c2.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size(); ctx.on(window, 'resize', size);
    const sOn = () => audio.sfxOn();
    const vol = gentle ? .55 : 1;
    function launchSound() { if (sOn()) audio.blip({ f0: 300, f1: 1400, dur: .7, vol: .05 * vol, type: 'sine' }); }
    function boomSound(big) {
      if (!sOn()) return;
      audio.kick(undefined, (big ? .9 : .6) * vol);
      audio.hiss({ dur: big ? 1.4 : .9, freq: 900, q: .3, type: 'lowpass', vol: (big ? .6 : .4) * vol, sweepTo: 120 });
      const t0 = audio.now();
      for (let i = 0; i < 7; i++) audio.hiss({ t: t0 + .25 + Math.random() * .7, dur: .03, freq: 5000 + Math.random() * 3000, q: 2, vol: .12 * vol });
    }
    // shell: rises to (tx, ty), then bursts. opts.points: a shape to form (text/heart), or a plain burst
    function shell(tx, ty, opts = {}) {
      const x0 = tx + (Math.random() - .5) * 80;
      shells.push({ x: x0, y: H + 10, tx, ty, t: 0, dur: opts.fast ? 700 : (gentle ? 1400 : 1100) + Math.random() * 300, x0, col: opts.col || pickC(), opts });
      launchSound();
    }
    function burst(s) {
      const { opts } = s, col = s.col;
      if (opts.points) {
        // particles fly to their places in the shape, hold, then fall
        opts.points.forEach(([px, py], i) => {
          const c = opts.multi ? COLORS[i % Math.min(4, COLORS.length)] : col;
          parts.push({ x: s.tx, y: s.ty, sx: s.tx, sy: s.ty, gx: px, gy: py, t: 0, mode: 'shape', hold: opts.hold || 2600, c, r: 1.6 + Math.random() * .8, a: 1, tw: Math.random() * 6 });
        });
        boomSound(true);
      } else {
        const N = opts.n || ((gentle ? 50 : 70) + Math.random() * 50 | 0), sp = opts.speed || ((gentle ? 2.1 : 2.6) + Math.random() * 2.2);
        const two = Math.random() < .4 ? pickC() : null;
        for (let i = 0; i < N; i++) {
          const a = i / N * 6.283 + Math.random() * .1, v = sp * (.55 + Math.random() * .5);
          parts.push({ x: s.tx, y: s.ty, vx: Math.cos(a) * v, vy: Math.sin(a) * v, mode: 'free', a: 1, c: two && i % 2 ? two : col, r: 1.4 + Math.random() * 1.2, decay: (gentle ? .007 : .009) + Math.random() * .008, tw: Math.random() * 6 });
        }
        boomSound(N > 100);
      }
      if (parts.length > 2600) parts.splice(0, parts.length - 2600);
    }
    // points that spell a word (thin display font, thickened a little so it reads in sparks)
    function fitFont(text, maxW, maxH) {
      const ox = fitFont.c || (fitFont.c = document.createElement('canvas').getContext('2d'));
      let fs = Math.min(maxH, 220);
      ox.font = `400 ${fs}px Italiana, Georgia, serif`;
      const w0 = ox.measureText(text).width;
      return w0 > maxW ? fs * maxW / w0 : fs;
    }
    function textPoints(text, cx, cy, maxW, maxH, fixed) {
      const oc = document.createElement('canvas'), ox = oc.getContext('2d', { willReadFrequently: true });
      const fs = fixed || fitFont(text, maxW, maxH);
      ox.font = `400 ${fs}px Italiana, Georgia, serif`;
      const w = ox.measureText(text).width;
      oc.width = Math.ceil(w + fs * .2 + 8); oc.height = Math.ceil(fs * 1.25);
      ox.font = `400 ${fs}px Italiana, Georgia, serif`; ox.fillStyle = '#fff'; ox.strokeStyle = '#fff'; ox.textBaseline = 'middle'; ox.textAlign = 'center';
      ox.lineWidth = Math.max(1, fs * .035); ox.lineJoin = 'round';
      ox.fillText(text, oc.width / 2, oc.height / 2); ox.strokeText(text, oc.width / 2, oc.height / 2);
      const d = ox.getImageData(0, 0, oc.width, oc.height).data;
      const step = Math.max(3, Math.round(fs / 30));
      const pts = [];
      for (let y = 0; y < oc.height; y += step) for (let x = 0; x < oc.width; x += step) if (d[(y * oc.width + x) * 4 + 3] > 140) pts.push([cx - oc.width / 2 + x, cy - oc.height / 2 + y]);
      while (pts.length > 900) pts.splice(Math.floor(Math.random() * pts.length), 1);
      return pts;
    }
    function heartPoints(cx, cy, s) {
      const pts = [];
      for (let i = 0; i < 140; i++) { const t = i / 140 * 6.283; pts.push([cx + s * 16 * Math.sin(t) ** 3 / 16, cy - s * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16]); }
      return pts;
    }
    const ease = t => 1 - Math.pow(1 - t, 3);
    ctx.raf((t, dt) => {
      const k = dt / 16.7;
      c2.globalCompositeOperation = 'destination-out';
      c2.fillStyle = `rgba(0,0,0,${.22 * k})`; c2.fillRect(0, 0, W, H);
      c2.globalCompositeOperation = 'lighter';
      for (let i = shells.length - 1; i >= 0; i--) {
        const s = shells[i]; s.t += dt;
        const p = Math.min(1, s.t / s.dur), e = ease(p);
        const x = s.x0 + (s.tx - s.x0) * e, y = H + 10 + (s.ty - H - 10) * e;
        c2.fillStyle = s.col; c2.beginPath(); c2.arc(x, y, 2.2, 0, 6.283); c2.fill();
        c2.fillStyle = 'rgba(255,220,160,.35)'; c2.beginPath(); c2.arc(x + (Math.random() - .5) * 2, y + 6, 1.4, 0, 6.283); c2.fill();
        if (p >= 1) { shells.splice(i, 1); burst(s); }
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i];
        if (q.mode === 'shape') {
          q.t += dt;
          if (q.t < 900) { const e2 = ease(q.t / 900); q.x = q.sx + (q.gx - q.sx) * e2; q.y = q.sy + (q.gy - q.sy) * e2; }
          else if (q.t < 900 + q.hold) { q.x = q.gx; q.y = q.gy; }
          else { q.mode = 'free'; q.vx = (Math.random() - .5) * .6; q.vy = Math.random() * .3; q.decay = .012 + Math.random() * .01; }
          const tw = .65 + .35 * Math.sin(q.tw + t * .012);
          c2.fillStyle = q.c; c2.globalAlpha = tw; c2.beginPath(); c2.arc(q.x, q.y, q.r, 0, 6.283); c2.fill(); c2.globalAlpha = 1;
        } else {
          q.vx *= .985; q.vy = q.vy * .985 + .045 * k; q.x += q.vx * k; q.y += q.vy * k; q.a -= q.decay * k;
          if (q.a <= 0 || q.y > H + 20) { parts.splice(i, 1); continue; }
          c2.globalAlpha = Math.max(0, q.a) * (.7 + .3 * Math.sin(q.tw + t * .02));
          c2.fillStyle = q.c; c2.beginPath(); c2.arc(q.x, q.y, q.r, 0, 6.283); c2.fill(); c2.globalAlpha = 1;
        }
      }
      c2.globalCompositeOperation = 'source-over';
    });

    /* ---------- tap to launch your own ---------- */
    let showing = false;
    scene.addEventListener('pointerdown', e => {
      if (!showing || e.target.closest('button,a')) return;
      shell(e.clientX, Math.min(e.clientY, H * .7));
    });

    /* ---------- the show ---------- */
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(() => { if (ctx.alive()) fn(); }, ms));
    ctx.cleanup(() => timers.forEach(clearTimeout));
    const say = (txt, ms = 2600) => { caption.textContent = txt; caption.classList.remove('on'); void caption.offsetWidth; caption.classList.add('on'); at(ms, () => caption.classList.remove('on')); };
    const shapeY = () => H * (innerWidth < 600 ? .3 : .34);
    const shapeW = () => Math.min(W * .88, 900), shapeH = () => Math.min(H * .26, 220);
    // one or two lines of sparks, sized so long words still fit a phone
    function spell(words, opts = {}) {
      const lines = words.filter(Boolean).map(w => String(w).toUpperCase());
      if (!lines.length) return;
      const wide = innerWidth >= 600 && lines.join(' ').length <= 16;
      if (lines.length === 1 || wide) {
        const txt = lines.join(' ');
        shell(W / 2, shapeY(), { ...opts, points: textPoints(txt, W / 2, shapeY(), shapeW() * (opts.scaleW || 1), shapeH() * (opts.scaleH || 1)) });
      } else {
        // both lines share one size, so a short second word doesn't shout
        const fs = Math.min(fitFont(lines[0], shapeW(), shapeH() * .8), fitFont(lines[1], shapeW(), shapeH() * .8));
        const dy = Math.min(shapeH() * .45, fs * .62), y1 = shapeY() - dy, y2 = shapeY() + dy;
        shell(W / 2, y1, { ...opts, points: textPoints(lines[0], W / 2, y1, shapeW(), shapeH() * .8, fs), hold: (opts.hold || 3600) + 200 });
        at(500, () => shell(W / 2, y2, { ...opts, points: textPoints(lines[1], W / 2, y2, shapeW(), shapeH() * .8, fs), hold: (opts.hold || 3600) - 300 }));
      }
    }
    // a long name goes on two lines, split near the middle
    function nameLines(name) {
      const up = String(name || '').trim();
      if (up.length <= 9 || !/\s/.test(up)) return [up];
      const words = up.split(/\s+/);
      let best = [up], bestD = Infinity;
      for (let i = 1; i < words.length; i++) {
        const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
        const d = Math.max(a.length, b.length);
        if (d < bestD) { bestD = d; best = [a, b]; }
      }
      return best;
    }
    const burstWords = (Array.isArray(U.copy.finale?.burst) && U.copy.finale.burst.length ? U.copy.finale.burst : gentle ? ['ALWAYS', 'LOVED'] : ['FOR', 'YOU']).slice(0, 2).map(w => U.fill(String(w)));
    const occ = U.occ;
    const dateLine = gentle ? `${U.date.long}. Always.`
      : occ === 'birthday' || occ === 'belated' ? `${U.date.long}. Same date every year. ${U.me.name} has it memorized now.`
      : occ === 'anniversary' ? `${U.date.long}. Where it all started.`
      : occ === 'reunion' ? `${U.date.long}. Counting the days.`
      : occ === 'newyear' ? 'Day one of a whole new year.'
      : `${U.date.long}. A date worth remembering.`;

    function runShow() {
      showing = true; skip.hidden = false;
      scene.classList.add('running');
      // the show needs music: start the soundtrack if it isn't already playing
      if (!music.isPlaying() && !music.state().empty) { try { music.play(); } catch {} }
      say(gentle ? 'Tap anywhere to light one of your own.' : 'Tap anywhere to launch your own.', 3200);
      let T0 = 400;
      const opening = gentle ? 4 : 6;
      for (let i = 0; i < opening; i++) { const d = T0 + i * (gentle ? 900 : 650); at(d, () => shell(W * (.15 + Math.random() * .7), H * (.15 + Math.random() * .3))); }
      T0 += 4600;
      at(T0, () => spell(nameLines(U.them.name), { col: T.gold, hold: 3200, scaleH: 1 }));
      at(T0 + 1300, () => say(`${U.them.name}.`, 3000));
      T0 += 5600;
      for (let i = 0; i < (gentle ? 3 : 5); i++) at(T0 + i * (gentle ? 700 : 420), () => shell(W * (.1 + Math.random() * .8), H * (.12 + Math.random() * .3), { fast: !gentle }));
      T0 += 2600;
      at(T0, () => shell(W / 2, shapeY(), { points: heartPoints(W / 2, shapeY(), Math.min(W, H) * .2), col: T.rose, hold: 2600 }));
      T0 += 4400;
      at(T0, () => spell([U.date.short.replace(' ', ' · ')], { col: T.hud || T.sky, hold: 2600, scaleW: .8 }));
      at(T0 + 1300, () => say(dateLine, 3400));
      T0 += 5000;
      for (let i = 0; i < (gentle ? 5 : 9); i++) at(T0 + i * (gentle ? 420 : 260), () => shell(W * (.08 + Math.random() * .84), H * (.1 + Math.random() * .35), { fast: !gentle }));
      T0 += 3000;
      at(T0, () => spell(burstWords, { multi: true, hold: 3600, scaleH: .8 }));
      T0 += 6200;
      for (let i = 0; i < (gentle ? 9 : 16); i++) at(T0 + i * (gentle ? 300 : 180), () => shell(W * (.05 + Math.random() * .9), H * (.08 + Math.random() * .4), { fast: !gentle, n: gentle ? 80 : 110 }));
      T0 += 4200;
      at(T0, startCredits);
    }

    /* ---------- end credits ---------- */
    let creditsOn = false;
    function startCredits() {
      if (creditsOn) return; creditsOn = true;
      timers.forEach(clearTimeout); timers.length = 0;
      showing = true;
      skip.hidden = true; caption.classList.remove('on');
      scene.classList.add('credits');
      // let any words still hanging in the sky drift away so the credits read cleanly
      parts.forEach(q => { if (q.mode === 'shape') { q.mode = 'free'; q.vx = (Math.random() - .5) * .6; q.vy = Math.random() * .3; q.decay = .025 + Math.random() * .015; } });
      const lines = creditLines(store, U);
      const stamps = store.stampCount();
      const hero = U.copy.hero || {};
      const filmCredits = (U.copy.film && U.copy.film.credits) || [];
      const thanks = U.fill((filmCredits.find(c => /thank/i.test(c.role || '')) || {}).name || (gentle ? `Everyone who loved ${U.them.name}` : `Everyone who made ${U.them.name} who they are`));
      let disc = U.fill((U.copy.film && U.copy.film.disclaimer) || '').replace(/\bthis film\b/i, 'this universe');
      if (!gentle && (store.stats().starsCaught || 0) >= 12) disc = `${disc} All twelve stars were caught responsibly.`.trim();
      const finale = U.copy.finale || {};
      const last = (finale.lines || []).map(l => U.fill(String(l))).filter(Boolean);
      const sign = U.fill(finale.sign || (gentle ? '— With love, always' : `— ${U.me.name}`));
      // "as the birthday star", but "almost here" / "with love, always" stand on their own
      const asRole = cap => { const c = U.fill(String(cap)).trim(); return /^(the|a|an|my|our|your|their|his|her|mvp|best|themselves|yourself)\b/i.test(c) ? `as ${c}` : c; };
      const cr = (role, name, note, sm) => h('div', { class: 'fn-cr' }, h('p', { class: 'role', text: role }), h('p', { class: 'name' + (sm ? ' sm' : ''), text: name }), note ? h('p', { class: 'note', text: note }) : null);
      roll.replaceChildren(h('div', { class: 'fn-roll-in' },
        h('p', { class: 'kicker rose', text: `${U.studio} presents` }),
        h('h2', { text: U.verse }),
        cr('Starring', U.them.name, gentle ? 'as themselves, always' : `${asRole(hero.themCap || 'themselves')}${lines.length ? ', and also:' : ''}`),
        ...(lines.length ? lines : [{ role: 'Explorer', name: `of the ${U.verse}`, note: 'Every world, visited with style' }]).map(l => cr(l.role, l.name, l.note, true)),
        cr('Passport', `${stamps} of ${ALL_STAMPS.length} stamps`, `${store.totalEarned().toLocaleString('en-US')} stardust earned along the way`, true),
        cr('And', U.me.name, asRole(hero.meCap || (gentle ? 'the ones who remember' : 'the one who made this'))),
        cr(occ === 'belated' ? 'Written, directed & delivered slightly late by' : 'Written & directed by', U.me.name, null, true),
        cr('Music', music.state().empty ? 'A synthesizer that lives in your browser' : 'The mixtape, and a synthesizer that lives in your browser', null, true),
        cr('Special thanks', gentle ? thanks : `${thanks} · one streetlamp · every star in the sky`, null, true),
        disc ? h('p', { class: 'note fn-disc', text: disc }) : null,
        h('div', { class: 'fn-last' }, ...last.map((l, i) => h('p', { style: { '--i': i }, text: l })), h('p', { class: 'fn-sign', style: { '--i': last.length }, text: sign }))));
      roll.hidden = false;
      const inner = roll.firstChild;
      const speed = gentle ? .04 : .045;
      y = innerHeight; dragY = null;
      const lastBox = inner.querySelector('.fn-last');
      stopRoll = ctx.raf((t, dt) => {
        if (dragY == null) y -= dt * speed;
        const stop = innerHeight / 2 - (lastBox.offsetTop + lastBox.offsetHeight / 2);
        if (y <= stop) { y = stop; if (!roll.classList.contains('ended')) endReached(); }
        if (y > innerHeight) y = innerHeight;
        inner.style.transform = `translateY(${y}px)`;
        if (Math.random() < (gentle ? .007 : .012) * (dt / 16)) shell(W * (.05 + Math.random() * .9), H * (.1 + Math.random() * .25), { fast: true, n: 50, speed: 2 });
      });
    }
    // the credits can be dragged or scrolled too
    let y = 0, dragY = null, stopRoll = null;
    roll.addEventListener('wheel', e => { y -= e.deltaY * .6; e.preventDefault(); }, { passive: false });
    roll.addEventListener('pointerdown', e => { if (e.target.closest('button,a')) return; dragY = e.clientY; try { roll.setPointerCapture(e.pointerId); } catch {} });
    roll.addEventListener('pointermove', e => { if (dragY == null) return; y += e.clientY - dragY; dragY = e.clientY; });
    const up = () => { dragY = null; }; roll.addEventListener('pointerup', up); roll.addEventListener('pointercancel', up);
    function replay() {
      if (stopRoll) { stopRoll(); stopRoll = null; }
      creditsOn = false; showing = false;
      roll.hidden = true; roll.classList.remove('ended'); roll.replaceChildren();
      scene.classList.remove('credits', 'running');
      parts.length = 0; shells.length = 0;
      ctx.haptic('light');
      runShow();
    }
    function endReached() {
      roll.classList.add('ended');
      const mailOn = WORLDS.some(w => w.id === 'mail');
      const acts = h('div', { class: 'fn-acts' },
        h('button', { type: 'button', class: 'btn solid', onclick: replay }, icon('replay'), 'Watch again'),
        mailOn ? h('a', { class: 'btn rose', href: '#/w/mail', text: gentle ? 'Read the letters' : 'Open the last letter' }) : null,
        h('a', { class: 'btn ghost', href: '#/map', text: 'Back to the map' }));
      roll.querySelector('.fn-last').append(acts);
      for (let i = 0; i < (gentle ? 6 : 10); i++) ctx.timeout(() => shell(W * (.1 + Math.random() * .8), H * (.08 + Math.random() * .3), { n: gentle ? 90 : 120 }), 600 + i * (gentle ? 360 : 240));
      if (!store.seen('finale-done')) ctx.timeout(() => ctx.award(50, { x: innerWidth / 2, y: innerHeight * .7 }), 1800);
      store.stat('finales');
    }
    skip.onclick = () => startCredits();

    /* ---------- the opening card ---------- */
    const begin = h('button', { type: 'button', class: 'btn solid big' }, '✦ Begin the finale');
    const intro = h('div', { class: 'fn-intro' },
      h('p', { class: 'kicker gold', text: `${n} stamps · finale unlocked` }),
      h('h2', { text: 'The Grand Finale' }),
      h('p', { class: 'lede', text: gentle ? 'Back on the hill, one more time. Take all the time you need.' : `Back on the hill, one more time. Sound on, if you can.${music.state().empty ? '' : ' This part has music.'}` }),
      begin);
    scene.append(intro);
    begin.onclick = () => { audio.ac(); ctx.haptic('medium'); intro.classList.add('gone'); ctx.timeout(() => intro.remove(), 700); runShow(); };
    ctx.on(document, 'keydown', e => { if (e.key === 'Escape') ctx.go('#/map'); });
  },
};
