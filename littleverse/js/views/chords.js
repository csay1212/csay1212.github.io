// Call & Response: a Simon-style memory game where a friend from another star
// speaks in chords. Five crystal pads, each a chord from one warm palette (all
// diatonic to D major, so any sequence sounds pretty). Transmissions are
// scheduled on the audio clock; the pads light up by watching that clock.
import { h, clamp } from '../core/dom.js';

// h() assigns style objects directly, which skips CSS custom properties
const vars = (el, o) => { for (const [k, v] of Object.entries(o)) el.style.setProperty(k, v); return el; };

// [name, color, keys, voicing (midi, low to high)]. The crystal colors stay
// fixed on purpose: a memory game needs five hues that never look alike,
// whatever the universe's palette is.
const PADS = [
  { name: 'Rose quartz', col: '#ef7fb0', keys: ['1', 'q'], notes: [50, 57, 61, 64, 66, 74] },   // Dmaj9
  { name: 'Citrine', col: '#f5cc4a', keys: ['2', 'w'], notes: [52, 59, 62, 66, 67, 76] },       // Em9
  { name: 'Aquamarine', col: '#86e6d8', keys: ['3', 'e'], notes: [43, 50, 54, 57, 61, 78] },    // Gmaj9#11
  { name: 'Amethyst', col: '#b59cff', keys: ['4', 'r'], notes: [47, 54, 57, 62, 64, 81] },      // Bm11
  { name: 'Sunstone', col: '#ff9a7a', keys: ['5', 't'], notes: [45, 52, 55, 59, 62, 83] },      // A9sus4
];
// What the friend says after each message, translated (roughly). Built from the
// playing universe so names, dates and the occasion are always its own.
function phrasesFor(U) {
  const them = U.them.name, me = U.me.name, many = U.group;
  const you = many ? 'You are good listeners.' : 'You are good listener.';
  const list = [
    many ? 'You are good friends.' : 'You are good friend.',
    you,
    'Statement: your ears are excellent.',
    'Question: why hat spin? Answer: joy.',
    'Statement: propeller hat is excellent hat.',
    'Request: more chords. Also snacks.',
    'Translation: thank you for listening.',
    'Song is good. You are good. Both good.',
    'Human, I am pleased. Very pleased.',
    'You sing back correct. Remarkable.',
    `Hello, ${them}. Signal is clear.`,
    `Message from ${me}: hello. I deliver.`,
    `Important date: ${U.date.long}. Noted.`,
    'Statement: stars are big. Friendship is bigger.',
  ];
  const occ = {
    birthday: ['Happy birthday. Translation: very happy birthday.', 'Statement: cake is excellent.'],
    belated: ['Happy birthday. Timing is flexible. Joy is not.', 'Statement: cake is excellent.'],
    anniversary: ['Two orbits, one path. Is good.', 'Happy anniversary. Noted with joy.'],
    newyear: ['New year. New chords. Same friend.', 'Request: good year. Request granted.'],
    reunion: ['Distance is only number. Number gets smaller.', 'Countdown noted. Very exciting.'],
    farewell: ['Safe travels. Signal reaches everywhere.', 'Goodbye is short word. Friendship is long word.'],
    congrats: ['Statement: you did big thing. Proud.', 'Celebration chord. Play it loud.'],
    getwell: ['Rest. Chords will wait.', 'Statement: you get better. Is plan.'],
    thanks: ['Translation: thank you. Also thank you.', 'Gratitude received. Very warm.'],
    justbecause: ['No reason. Just chords.', 'Statement: today is good day for song.'],
    sorry: ['Listening is also kindness.', 'Statement: a calm chord helps.'],
  }[U.occ] || [];
  return list.concat(occ);
}
const STAMP_AT = 8;
const MAX_TAPE = 16;
const mf = n => 440 * Math.pow(2, (n - 69) / 12);
const gapFor = n => Math.max(.3, .64 - .024 * (n - 1));   // seconds between chords; speeds up slowly

/* ------------------------------------------------------------------ crystals */
// A faceted gem as an SVG string. Each pad gets its own slightly irregular cut.
function gemSVG(i, col) {
  let s = 97 + i * 31;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const k = [6, 7, 6, 8, 7][i];
  const rot = -Math.PI / 2 + (rnd() - .5) * .5;
  const outer = [], inner = [];
  for (let j = 0; j < k; j++) {
    const a = rot + j / k * Math.PI * 2;
    const r = 44 * (.86 + rnd() * .14) * (1 + .08 * Math.sin(a) ** 2);   // a touch taller than wide
    outer.push([50 + Math.cos(a) * r * .92, 52 + Math.sin(a) * r]);
    const ri = r * (.42 + rnd() * .08);
    inner.push([46 + Math.cos(a + .12) * ri * .92, 47 + Math.sin(a + .12) * ri]);
  }
  const P = pts => pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  let facets = '';
  const light = -2.3;   // light from the upper left
  for (let j = 0; j < k; j++) {
    const a = outer[j], b = outer[(j + 1) % k], c = inner[(j + 1) % k], d = inner[j];
    const mx = (a[0] + b[0]) / 2 - 50, my = (a[1] + b[1]) / 2 - 52;
    const l = .5 + .5 * Math.cos(Math.atan2(my, mx) - light);
    const overlay = l > .5 ? `rgba(255,255,255,${((l - .5) * .9).toFixed(2)})` : `rgba(10,6,30,${((.5 - l) * .9).toFixed(2)})`;
    facets += `<polygon points="${P([a, b, c, d])}" fill="${col}"/><polygon points="${P([a, b, c, d])}" fill="${overlay}"/>`;
  }
  const id = 'gm' + i;
  return `<svg class="gem" viewBox="0 0 100 104" aria-hidden="true">
    <defs><radialGradient id="${id}t" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".45" stop-color="${col}" stop-opacity=".9"/><stop offset="1" stop-color="${col}"/></radialGradient></defs>
    <polygon points="${P(outer)}" fill="${col}"/>
    ${facets}
    <polygon points="${P(inner)}" fill="url(#${id}t)"/>
    <g fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".8" stroke-linejoin="round">
      <polygon points="${P(outer)}"/><polygon points="${P(inner)}"/>
      ${outer.map((p, j) => `<line x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${inner[j][0].toFixed(1)}" y2="${inner[j][1].toFixed(1)}"/>`).join('')}
    </g>
    <polygon points="${P(outer)}" fill="none" stroke="rgba(12,8,36,.55)" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M${(inner[0][0] - 9).toFixed(1)} ${(inner[0][1] + 6).toFixed(1)} l6 -8 l3 2 l-6 8z" fill="#fff" opacity=".75"/>
  </svg>`;
}

/* ------------------------------------------------------------------ synth */
function createSynth(ac, wetDest, dryDest) {
  const live = new Set();
  const wet = ac.createGain(), dry = ac.createGain();
  wet.connect(wetDest); dry.connect(dryDest);
  let stopped = false, drone = null;
  const reg = n => { live.add(n); n.onended = () => live.delete(n); return n; };
  const g = dest => { const x = ac.createGain(); x.connect(dest); return x; };
  const osc = (type, f, t, t1, dest, det = 0) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; o.connect(dest); o.start(t); o.stop(t1); return reg(o); };

  // a soft pad note: slow-ish attack, gentle decay, long tail
  function padNote(n, t, dur, vol, dest) {
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = n > 70 ? 5200 : 2600; lp.Q.value = .4; lp.connect(dest);
    const e = g(lp);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vol, t + .035);
    e.gain.setTargetAtTime(vol * .45, t + .06, .25);
    e.gain.setTargetAtTime(0, t + dur * .55, dur * .22);
    osc('triangle', mf(n), t, t + dur + .3, e);
    osc('sine', mf(n), t, t + dur + .3, e, 6);
  }
  // the crystal shimmer on the top voice
  function bell(n, t, vol, dest) {
    const e = g(dest);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vol, t + .006); e.gain.exponentialRampToValueAtTime(.0001, t + 1.1);
    osc('sine', mf(n), t, t + 1.15, e);
  }
  return {
    live: () => live.size,
    chord(i, t, { dur = 1.5, vol = 1, strum = .024, shimmer = true } = {}) {
      if (stopped) return;
      const notes = PADS[i].notes;
      notes.forEach((n, j) => {
        const top = j === notes.length - 1, low = j === 0;
        padNote(n, t + j * strum, dur, (low ? .036 : top ? .03 : .02) * vol, wet);
      });
      if (shimmer) {
        const top = notes[notes.length - 1];
        bell(top + 12, t + strum * notes.length, .011 * vol, wet);
        bell(top + 19, t + strum * notes.length + .05, .0045 * vol, wet);
      }
    },
    // a soft dissonant buzz for a wrong answer
    buzz(t) {
      if (stopped) return;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(260, t + .6); lp.connect(dry);
      const e = g(lp);
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(.055, t + .02); e.gain.exponentialRampToValueAtTime(.0001, t + .7);
      [40, 41, 46].forEach((n, j) => { const o = osc(j === 2 ? 'square' : 'sawtooth', mf(n), t, t + .75, e); o.frequency.exponentialRampToValueAtTime(mf(n) * .96, t + .7); });
    },
    // two little "translation complete" notes
    chime(t) {
      if (stopped) return;
      bell(86, t, .03, wet); bell(93, t + .09, .022, wet);
    },
    // Zen mode's auto-harmony: a quiet drone that follows the last chord's root
    drone(root, t) {
      if (stopped) return;
      if (!drone) {
        const e = g(wet); e.gain.value = 0;
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(e);
        const a = ac.createOscillator(), b = ac.createOscillator();
        a.type = 'sine'; b.type = 'triangle'; a.connect(lp); b.connect(lp);
        a.frequency.value = mf(root - 12); b.frequency.value = mf(root - 5);
        a.start(t); b.start(t); reg(a); reg(b);
        drone = { e, a, b };
      }
      drone.a.frequency.setTargetAtTime(mf(root - 12), t, .18);
      drone.b.frequency.setTargetAtTime(mf(root - 5), t, .18);
      drone.e.gain.cancelScheduledValues(t);
      drone.e.gain.setTargetAtTime(.04, t, .25);
      drone.e.gain.setTargetAtTime(0, t + 1.6, 1.8);
    },
    stopDrone() {
      if (!drone) return;
      const t = ac.currentTime;
      try { drone.e.gain.cancelScheduledValues(t); drone.e.gain.setTargetAtTime(0, t, .08); drone.a.stop(t + .5); drone.b.stop(t + .5); } catch {}
      drone = null;
    },
    stopAll() {
      if (stopped) return;
      stopped = true;
      const now = ac.currentTime;
      for (const x of [wet, dry]) { try { x.gain.cancelScheduledValues(now); x.gain.setValueAtTime(x.gain.value, now); x.gain.linearRampToValueAtTime(0, now + .015); } catch {} }
      for (const n of live) { try { n.stop(now + .02); } catch {} }
      drone = null;
      setTimeout(() => { try { wet.disconnect(); dry.disconnect(); } catch {} }, 60);
    },
  };
}

export default {
  css: 'chords',
  mount(ctx) {
    const { audio, store, U } = ctx;
    const T = U.theme;
    const PHRASES = phrasesFor(U);
    const reduce = ctx.reduce;
    ctx.root.classList.add('full');
    ctx.pauseSky();   // the stage draws its own stars
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* ================= DOM ================= */
    const status = h('div', { class: 'ch-status' });
    const phraseText = h('span');
    const phrase = h('div', { class: 'ch-phrase' }, phraseText, h('i', { class: 'ch-cursor' }));
    const meta = h('div', { class: 'ch-meta' });
    const wave = h('div', { class: 'ch-wave', 'aria-hidden': 'true' }, PADS.map(p => vars(h('i'), { '--c': p.col })));
    const hud = h('div', { class: 'ch-hud', role: 'status', 'aria-live': 'polite' },
      h('div', { class: 'ch-hud-top' }, h('span', { text: 'Xenolingua translator v0.8' }), h('span', { class: 'ch-link' }, h('i'), 'Link')),
      status, phrase, meta, wave);

    const field = h('div', { class: 'ch-field' });
    const fieldbox = h('div', { class: 'ch-fieldbox' }, field);
    const coreNum = h('b', { text: '··' }), coreLbl = h('span', { text: 'chords' });
    const core = h('div', { class: 'ch-core', 'aria-hidden': 'true' }, h('i'), h('i'), coreNum, coreLbl);
    field.append(core);
    const pads = PADS.map((p, i) => {
      const a = i / 5 * Math.PI * 2;
      const el = h('button', {
        class: 'ch-pad', type: 'button', 'aria-label': `${p.name} crystal (key ${p.keys[0]})`,
        style: { left: (50 + Math.sin(a) * 31) + '%', top: (53 - Math.cos(a) * 31) + '%' },
      }, h('span', { class: 'ch-glow' }), h('span', { class: 'ch-shadow' }), h('span', { class: 'ch-gem', html: gemSVG(i, p.col) }), h('span', { class: 'ch-flare' }), finePointer ? h('span', { class: 'ch-k', text: p.keys[0] }) : null);
      vars(el, { '--c': p.col, '--rot': ((i * 47) % 30 - 15) + 'deg', '--fl': (-i * 1.3).toFixed(1) + 's' });
      field.append(el);
      return el;
    });

    const segBtns = {};
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Mode' },
      ['classic', 'zen'].map(m => (segBtns[m] = h('button', { type: 'button', text: m === 'classic' ? 'Classic' : 'Zen', onclick: () => setMode(m) }))));
    const startBtn = h('button', { class: 'btn hud solid small', type: 'button', onclick: () => startClassic() }, '▶ Start');
    const repeatBtn = h('button', { class: 'btn hud small', type: 'button', onclick: () => askRepeat(), title: 'One per game' }, '↻ Ask to repeat');
    const recBtn = h('button', { class: 'btn rose small', type: 'button', onclick: () => toggleRec() }, '● Record');
    const playBtn = h('button', { class: 'btn small', type: 'button', onclick: () => playTape() }, '▶ Play back');
    const echoBtn = h('button', { class: 'btn ghost small', type: 'button', onclick: () => { echo = !echo; store.set('game.chords.echo', echo); paintCtrl(); } });
    const tapeDots = h('div', { class: 'ch-tape', 'aria-hidden': 'true' });
    const ctrl = h('div', { class: 'ch-ctrl' }, seg, h('div', { class: 'ch-actions' }, startBtn, repeatBtn, recBtn, playBtn, echoBtn), tapeDots);

    const starCv = h('canvas', { class: 'ch-starcv' });
    const stars = h('div', { class: 'ch-stars', 'aria-hidden': 'true' }, starCv);
    for (let i = 0; i < 7; i++) {
      stars.append(h('i', { class: 'tw', style: { left: (Math.random() * 100).toFixed(1) + '%', top: (Math.random() * 100).toFixed(1) + '%', animationDelay: (-Math.random() * 5).toFixed(1) + 's' } }));
    }
    function paintStars(W, H) {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      starCv.width = Math.round(W * dpr); starCv.height = Math.round(H * dpr);
      const c = starCv.getContext('2d'); c.scale(dpr, dpr);
      let sd = 7;
      const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      const n = Math.min(160, Math.round(W * H / 5000));
      for (let i = 0; i < n; i++) {
        c.globalAlpha = .2 + rnd() * .65; c.fillStyle = rnd() < .12 ? T.gold : rnd() < .15 ? T.rose : T.paper;
        c.beginPath(); c.arc(rnd() * W, rnd() * H, rnd() * 1.1 + .3, 0, 6.283); c.fill();
      }
    }
    const grid = h('div', { class: 'ch-grid' }, hud, fieldbox, ctrl);
    const stage = h('div', { class: 'stage-wrap ch-stage' }, stars, grid);
    const safeProbe = h('i', { class: 'ch-safe', 'aria-hidden': 'true' });
    const wrap = h('div', { class: 'ch' }, stage, safeProbe);
    ctx.root.append(wrap);
    // a tiny hidden friend, peeking up from the bottom edge of the translator
    ctx.peek(hud, 'chords-hide', { right: '18px', bottom: '-13px', size: 30, rotate: 8 });

    /* ================= state ================= */
    let mode = 'classic';
    let phase = 'idle';           // idle | listen | input | translate | over
    let seq = [], idx = 0, longest = 0, lifeline = true, round = 0;
    let plan = [], planEnd = 0, planDone = null, resend = false;
    let phraseQueue = [], echo = store.get('game.chords.echo', true) !== false;
    let tape = [], recording = false, recStart = 0, tapePlan = [], idleT = 0;
    let A = null, synth = null, fast = false;
    let typeTimer = null, droneT = 0;

    const W8 = ms => fast ? Math.min(ms, 60) : ms;
    function ensureAudio() {
      const ac = audio.ac();
      if (!ac) { ctx.toast('No Web Audio in this browser, so the crystals stay quiet. Your friend is very sorry.'); return null; }
      A = ac;
      if (!synth) synth = createSynth(ac, audio.out(), audio.dryOut());
      ctx.holdMusic();   // the soundtrack steps aside while the crystals talk
      if (idleT) { clearTimeout(idleT); idleT = 0; }
      return ac;
    }
    function killAudio() { if (synth) { synth.stopAll(); synth = null; } }
    // ...and comes back once they're quiet: after a game, or after a few idle seconds in Zen
    function giveSoundtrackBack() { if (idleT) { clearTimeout(idleT); idleT = 0; } if (ctx.releaseMusic) ctx.releaseMusic(); }
    function zenIdleSoon(ms = 6000) {
      if (idleT) clearTimeout(idleT);
      idleT = ctx.timeout(() => { idleT = 0; if (mode === 'zen' && !recording && !tapePlan.length && !document.hidden) giveSoundtrackBack(); }, ms);
    }

    /* ================= HUD ================= */
    function setStatus(text, cls = '') { status.textContent = text; status.className = 'ch-status ' + cls; }
    function typePhrase(text, quoted = true) {
      if (typeTimer) { typeTimer(); typeTimer = null; }
      const full = quoted ? `“${text}”` : text;
      if (reduce || fast) { phraseText.textContent = full; return; }
      let n = 0;
      phraseText.textContent = '';
      const id = ctx.interval(() => {
        n++; phraseText.textContent = full.slice(0, n);
        if (n >= full.length) { clearInterval(id); typeTimer = null; }
      }, 26);
      typeTimer = () => clearInterval(id);
    }
    function nextPhrase() {
      if (!phraseQueue.length) {
        phraseQueue = PHRASES.slice();
        for (let i = phraseQueue.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [phraseQueue[i], phraseQueue[j]] = [phraseQueue[j], phraseQueue[i]]; }
      }
      return phraseQueue.pop();
    }
    function paintMeta() {
      const best = store.getBest('chords');
      if (mode === 'zen') meta.textContent = `Tape ${String(tape.length).padStart(2, '0')}/${MAX_TAPE}${recording ? ' · rec ●' : ''}`;
      else meta.textContent = `Round ${String(Math.max(round, 0)).padStart(2, '0')} · Longest ${String(longest).padStart(2, '0')} · Best ${best == null ? '--' : String(best).padStart(2, '0')}`;
      coreNum.textContent = mode === 'zen' ? '♪' : (round ? String(round).padStart(2, '0') : '··');
      coreLbl.textContent = mode === 'zen' ? 'zen' : (phase === 'input' ? 'your turn' : 'chords');
    }
    function paintCtrl() {
      segBtns.classic.setAttribute('aria-pressed', mode === 'classic');
      segBtns.zen.setAttribute('aria-pressed', mode === 'zen');
      const busy = mode === 'classic' && (phase === 'listen' || phase === 'input' || phase === 'translate');
      segBtns.classic.disabled = segBtns.zen.disabled = busy;
      startBtn.hidden = mode !== 'classic' || busy;
      startBtn.textContent = phase === 'over' ? '↺ Again' : '▶ Start';
      repeatBtn.hidden = mode !== 'classic' || !busy;
      repeatBtn.disabled = !lifeline || phase !== 'input';
      repeatBtn.textContent = lifeline ? '↻ Ask to repeat' : '↻ Asked already';
      recBtn.hidden = playBtn.hidden = echoBtn.hidden = mode !== 'zen';
      recBtn.textContent = recording ? '■ Stop' : '● Record';
      recBtn.classList.toggle('solid', recording);
      playBtn.disabled = recording || !tape.length || tapePlan.length > 0;
      echoBtn.textContent = echo ? 'Echo: on' : 'Echo: off';
      echoBtn.setAttribute('aria-pressed', echo);
      tapeDots.hidden = mode !== 'zen';
      stage.classList.toggle('zen', mode === 'zen');
      stage.classList.toggle('listening', phase === 'listen');
      stage.classList.toggle('inputting', phase === 'input' || mode === 'zen');
      paintMeta();
    }
    function paintTape(active = -1) {
      tapeDots.replaceChildren(...tape.map((tp, j) => vars(h('i', { class: j === active ? 'on' : '' }), { '--c': PADS[tp.i].col })));
      for (let j = tape.length; j < MAX_TAPE; j++) tapeDots.append(h('i', { class: 'blank' }));
    }

    /* ================= lights ================= */
    const litUntil = new Array(5).fill(0);
    function light(i, ms) {
      litUntil[i] = performance.now() + ms;
      pads[i].classList.add('lit');
      const bar = wave.children[i];
      bar.classList.add('on');
    }
    ctx.raf(now => {
      for (let i = 0; i < 5; i++) if (litUntil[i] && now >= litUntil[i]) { litUntil[i] = 0; pads[i].classList.remove('lit'); wave.children[i].classList.remove('on'); }
      if (!A) return;
      const t = A.currentTime;
      // the friend's transmission (or the tape) lights pads exactly when they sound
      for (const p of plan) if (!p.shown && t >= p.at) { p.shown = true; light(p.i, p.len * 1000); core.classList.remove('pulse'); void core.offsetWidth; core.classList.add('pulse'); }
      if (planDone && t >= planEnd) { const fn = planDone; planDone = null; plan = []; fn(); }
      for (let j = 0; j < tapePlan.length; j++) { const p = tapePlan[j]; if (!p.shown && t >= p.at) { p.shown = true; light(p.i, 260); paintTape(j); } }
      if (tapePlan.length && tapePlan.every(p => p.shown) && t > tapePlan[tapePlan.length - 1].at + .4) { tapePlan = []; paintTape(); paintCtrl(); if (mode === 'zen') zenIdleSoon(3500); }
    });

    /* ================= classic game ================= */
    function pickNext() {
      let i;
      do { i = Math.floor(Math.random() * 5); } while (seq.length >= 2 && seq[seq.length - 1] === i && seq[seq.length - 2] === i);
      return i;
    }
    function transmit(slow = 1, label = 'Incoming transmission…') {
      const ac = ensureAudio(); if (!ac) return;
      phase = 'listen'; idx = 0;
      setStatus(label, 'rx');
      paintCtrl();
      if (document.hidden) { resend = true; return; }   // wait until someone is looking
      const gap = gapFor(seq.length) * slow * (fast ? .35 : 1);
      const t0 = ac.currentTime + (fast ? .08 : .45);
      plan = seq.map((i, k) => ({ i, at: t0 + k * gap, len: Math.min(.5, gap * .7), shown: false }));
      seq.forEach((i, k) => synth.chord(i, t0 + k * gap, { dur: Math.min(1.6, gap * 2.6) }));
      planEnd = t0 + (seq.length - 1) * gap + Math.min(.5, gap * .7) + .05;
      planDone = () => {
        if (phase !== 'listen') return;
        phase = 'input'; idx = 0;
        setStatus(`Your turn · 0 of ${seq.length}`, 'tx');
        paintCtrl();
      };
    }
    function startClassic() {
      if (mode !== 'classic') setMode('classic');
      if (!ensureAudio()) return;
      hideOverlay();
      seq = [pickNext()]; longest = 0; lifeline = true; round = 1; resend = false;
      typePhrase('Channel open. Listen first, then answer.', false);
      paintCtrl();
      transmit();
    }
    function nextRound() {
      seq.push(pickNext()); round = seq.length;
      paintMeta();
      transmit();
    }
    function succeed() {
      phase = 'translate';
      longest = seq.length;
      setStatus('Translating…', 'rx');
      synth && synth.chime(A.currentTime + .05);
      paintCtrl();
      let wait = 1500;
      ctx.timeout(() => {
        if (phase !== 'translate') return;
        const special = longest === STAMP_AT ? 'Eight chords! Translation: you speak chord now.'
          : longest === 12 ? (U.gentle ? 'Twelve chords. Statement: remarkable.' : `Statement: you are better at this than ${U.me.name}.`) : null;
        const text = special || nextPhrase();
        typePhrase(text);
        setStatus(`Translation · message ${longest} received`, 'ok');
        if (longest >= STAMP_AT) {
          const got = ctx.stamp();
          if (got) wait += 2600;
        }
        ctx.timeout(() => { if (phase === 'translate') nextRound(); }, W8(wait + text.length * 26));
      }, W8(650));
    }
    function fail(i) {
      phase = 'over';
      const want = seq[idx];
      synth && synth.buzz(A.currentTime + .01);
      setStatus('Translation error!', 'err');
      typePhrase('…?! Static. Friend is confused.', false);
      stage.classList.add('glitch');
      ctx.timeout(() => stage.classList.remove('glitch'), 500);
      pads[i].classList.add('wrong');
      ctx.timeout(() => pads[i].classList.remove('wrong'), 700);
      // show what it should have been
      ctx.timeout(() => light(want, 650), 380);
      ctx.timeout(() => light(want, 650), 1150);
      paintCtrl();
      ctx.timeout(gameOver, W8(1900));
    }
    function gameOver() {
      giveSoundtrackBack();
      const n = longest;
      const res = store.best('chords', n);
      store.statMax('bestChords', n);
      if (n >= STAMP_AT) ctx.stamp();
      round = 0; paintCtrl();
      const dust = n > 0 ? 2 * n : 0;
      const dustEl = h('p', { class: 'ch-dust', text: dust ? `+${dust} ✦ stardust` : 'No stardust yet. The friend is patient.' });
      const best = store.getBest('chords');
      const card = h('div', { class: 'ocard ch-card' },
        h('p', { class: 'kicker', text: 'Link closed' }),
        h('h3', { text: n ? `${n} chord${n === 1 ? '' : 's'}` : 'Lost in translation' }),
        (res.isNew || (res.first && n > 0)) ? h('span', { class: 'newbest', text: 'New best' }) : null,
        h('p', { text: n >= STAMP_AT ? 'Friend says: remarkable. You speak chord now.' : n >= 4 ? 'Friend says: again? Again. You are close.' : U.gentle ? 'Friend says: is okay. Again, when you are ready.' : `Friend says: is okay. ${U.me.name} also bad at this.` }),
        h('p', { class: 'fine', text: `Longest message: ${n} · Best: ${best ?? 0}` }),
        dustEl,
        h('p', { class: 'fine ch-goal', text: store.hasStamp('chords') ? '✓ Passport stamp collected' : `Stamp goal: repeat an ${STAMP_AT}-chord message` }),
        h('div', { class: 'row' },
          h('button', { class: 'btn hud solid big', type: 'button', 'data-primary': '', onclick: () => startClassic() }, '↺ Try again')),
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost small', type: 'button', onclick: () => setMode('zen') }, 'Zen mode'),
          h('a', { class: 'btn ghost small', href: '#/map' }, 'Back to map')));
      showOverlay(card, () => startClassic());
      if (dust) ctx.award(dust, dustEl);
    }
    function askRepeat() {
      if (!lifeline || phase !== 'input') return;
      lifeline = false;
      typePhrase('Request: repeat. Slowly, please.');
      transmit(1.3, 'Repeating transmission…');
    }

    /* ================= pads ================= */
    function tapPad(i) {
      const ac = ensureAudio();
      if (!ac) return;
      if (mode === 'zen') {
        synth.chord(i, ac.currentTime + .005, { dur: 1.5 });
        light(i, 280);
        if (echo) {
          synth.chord(i, ac.currentTime + .42, { dur: 1.2, vol: .32, strum: .05, shimmer: false });
          synth.chord(i, ac.currentTime + .84, { dur: 1, vol: .12, strum: .07, shimmer: false });
          synth.drone(PADS[i].notes[0], ac.currentTime + .01);
          if (droneT) clearTimeout(droneT);
          droneT = ctx.timeout(() => { droneT = 0; if (synth) synth.stopDrone(); }, 7000);
        }
        zenIdleSoon();
        if (recording) {
          tape.push({ i, at: performance.now() - recStart });
          paintTape();
          if (tape.length >= MAX_TAPE) toggleRec();
          paintMeta();
        }
        return;
      }
      if (phase !== 'input') {
        pads[i].classList.remove('nudge'); void pads[i].offsetWidth; pads[i].classList.add('nudge');
        return;
      }
      synth.chord(i, ac.currentTime + .005, { dur: 1.3 });
      light(i, 260);
      if (i !== seq[idx]) { fail(i); return; }
      idx++;
      setStatus(`Your turn · ${idx} of ${seq.length}`, 'tx');
      if (idx >= seq.length) succeed();
    }
    pads.forEach((el, i) => {
      el.addEventListener('pointerdown', e => { if (e.button > 0) return; e.preventDefault(); tapPad(i); });
      el.addEventListener('click', e => { if (e.detail === 0) tapPad(i); });   // keyboard activation
    });

    /* ================= zen ================= */
    function toggleRec() {
      if (!recording) { tape = []; recording = true; recStart = performance.now(); setStatus('Recording · up to 16 chords', 'err'); }
      else { recording = false; zenIdleSoon(); setStatus(tape.length ? `Recorded ${tape.length} chord${tape.length === 1 ? '' : 's'}. Press play back.` : 'Free channel · play anything', 'ok'); }
      paintTape(); paintCtrl();
    }
    function playTape() {
      if (!tape.length || recording) return;
      const ac = ensureAudio(); if (!ac) return;
      const t0 = ac.currentTime + .15, first = tape[0].at;
      tapePlan = tape.map(tp => ({ i: tp.i, at: t0 + (tp.at - first) / 1000, shown: false }));
      tapePlan.forEach(p => synth.chord(p.i, p.at, { dur: 1.5 }));
      setStatus('Playing your message back…', 'rx');
      typePhrase(nextPhrase());
      paintCtrl();
    }
    function setMode(m) {
      if (m === mode && !overlay) return;
      if (mode === 'classic' && (phase === 'listen' || phase === 'input' || phase === 'translate')) return;
      mode = m;
      hideOverlay();
      if (synth) synth.stopDrone();
      recording = false; tapePlan = [];
      if (m === 'zen') {
        phase = 'idle'; round = 0;
        setStatus('Free channel · play anything', 'ok');
        typePhrase('No scoring here. Just talk.', false);
        paintTape();
      } else {
        phase = 'idle';
        giveSoundtrackBack();
        setStatus('Channel open · awaiting first contact', '');
        typePhrase('Press start. Your friend will speak first.', false);
        showStart();
      }
      paintCtrl();
    }

    /* ================= overlays ================= */
    let overlay = null, primary = null;
    function showOverlay(card, onPrimary) {
      hideOverlay();
      overlay = h('div', { class: 'overlay ch-ov' }, card);
      primary = onPrimary || null;
      stage.append(overlay);
      const b = card.querySelector('[data-primary]');
      if (b && finePointer) setTimeout(() => b.focus({ preventScroll: true }), 60);
    }
    function hideOverlay() { if (overlay) overlay.remove(); overlay = null; primary = null; }
    function showStart() {
      const best = store.getBest('chords');
      const card = h('div', { class: 'ocard ch-card' },
        h('p', { class: 'kicker', text: 'First contact' }),
        h('h3', { text: 'Call & Response' }),
        h('p', { text: 'Your friend from another star speaks in chords. Listen to the message, then play it back on the crystals. One chord longer every round.' }),
        finePointer
          ? h('div', { class: 'keys' }, 'Tap the crystals or press ', h('kbd', { text: '1' }), '–', h('kbd', { text: '5' }), ' or ', h('kbd', { text: 'Q' }), h('kbd', { text: 'W' }), h('kbd', { text: 'E' }), h('kbd', { text: 'R' }), h('kbd', { text: 'T' }))
          : h('p', { class: 'fine', text: 'Tap the crystals in the same order.' }),
        h('p', { class: 'fine ch-goal', text: store.hasStamp('chords') ? '✓ Passport stamp collected' : `Stamp goal: repeat an ${STAMP_AT}-chord message` }),
        h('p', { class: 'fine', text: best != null ? `Longest so far: ${best} chord${best === 1 ? '' : 's'}` : 'No messages translated yet.' }),
        h('div', { class: 'row' },
          h('button', { class: 'btn hud solid big', type: 'button', 'data-primary': '', onclick: () => startClassic() }, '▶ Start transmission'),
          h('button', { class: 'btn ghost', type: 'button', onclick: () => setMode('zen') }, 'Zen mode')));
      showOverlay(card, () => startClassic());
    }

    /* ================= input ================= */
    ctx.on(window, 'keydown', e => {
      const tg = e.target;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
      if (document.querySelector('.modal-wrap')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = (e.key || '').toLowerCase();
      const i = PADS.findIndex(p => p.keys.includes(k) || e.code === 'Numpad' + p.keys[0]);
      if (i >= 0 && !overlay) { e.preventDefault(); if (!e.repeat) { tapPad(i); pads[i].classList.add('key'); ctx.timeout(() => pads[i].classList.remove('key'), 140); } return; }
      const onControl = tg && tg.closest && tg.closest('button, a, input');
      if ((k === 'enter' || k === ' ') && primary && !onControl) { e.preventDefault(); primary(); }
    });
    ctx.on(stage, 'contextmenu', e => e.preventDefault());
    // leaving: the router keeps this view up during the iris wipe, so go quiet right away
    ctx.on(window, 'hashchange', () => {
      if (/\/w\/chords\b/.test(location.hash)) return;
      if (phase === 'listen') { resend = true; planDone = null; plan = []; }
      tapePlan = [];
      killAudio();
      // if the trip was cancelled we're still here: pick the message back up
      ctx.timeout(() => { if (resend && phase === 'listen' && !document.hidden) { resend = false; transmit(1, 'Signal lost. Re-sending…'); } }, 2500);
    });
    ctx.on(document, 'visibilitychange', () => {
      if (document.hidden) {
        if (phase === 'listen') { resend = true; planDone = null; plan = []; killAudio(); }
        if (tapePlan.length) { tapePlan = []; killAudio(); paintTape(); paintCtrl(); }
        if (synth) synth.stopDrone();
      } else if (resend && phase === 'listen') {
        resend = false;
        transmit(1, 'Signal lost. Re-sending…');
      } else if (mode === 'zen' && !tapePlan.length) zenIdleSoon(1500);
    });

    /* ================= layout ================= */
    function layout() {
      const barEl = ctx.frame && ctx.frame.el.querySelector('.wbar');
      const barH = barEl ? barEl.getBoundingClientRect().height : 58;
      const vh = window.visualViewport ? window.visualViewport.height : innerHeight;
      const pad = innerWidth < 600 ? 8 : 16;
      // keep the controls clear of the home indicator
      const safeB = safeProbe.offsetHeight || 0;
      wrap.style.padding = `${pad}px ${pad}px ${pad + safeB}px`;
      stage.style.height = clamp(Math.floor(vh - barH - pad * 2 - safeB), 240, 860) + 'px';
      const W = stage.clientWidth, H = stage.clientHeight;
      paintStars(W, H);
      const wide = W / H > 1.15;
      stage.classList.toggle('wide', wide);
      stage.classList.toggle('short', wide && H < 470);
      let D;
      if (wide) D = Math.min(H - 24, W * .56, 600);
      else {
        field.style.width = field.style.height = '0px';
        // squeezed (small phones, or Zen's extra buttons): tuck the HUD in a little
        if (fieldbox.clientHeight < Math.min(W - 24, 280)) stage.classList.add('short');
        D = Math.min(W - 24, fieldbox.clientHeight - 4, 600);
      }
      D = Math.max(200, Math.floor(D));
      field.style.width = field.style.height = D + 'px';
      field.style.setProperty('--pad', Math.round(D * .34) + 'px');
    }
    let rT = 0;
    const onResize = () => { cancelAnimationFrame(rT); rT = requestAnimationFrame(() => { if (ctx.alive()) layout(); }); };
    ctx.on(window, 'resize', onResize);
    // the controls change height between Classic and Zen; keep the crystals out of their way
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(onResize);
      ro.observe(ctrl); ro.observe(hud);
      ctx.cleanup(() => ro.disconnect());
    }
    if (window.visualViewport) ctx.on(window.visualViewport, 'resize', onResize);
    ctx.on(window, 'orientationchange', () => ctx.timeout(layout, 250));
    ctx.cleanup(() => { cancelAnimationFrame(rT); phase = 'gone'; killAudio(); });

    /* ================= debug hook for automated tests ================= */
    const hook = {
      state: () => ({ mode, phase, seq: seq.slice(), idx, longest, round, lifeline, tape: tape.length, recording, live: synth ? synth.live() : 0, overlay: !!overlay }),
      press: i => tapPad(i), start: () => startClassic(), mode: m => setMode(m), fast: (on = true) => { fast = !!on; },
    };
    window.__chords = hook;
    ctx.cleanup(() => { if (window.__chords === hook) delete window.__chords; });

    layout();
    ctx.timeout(layout, 400);
    setStatus('Channel open · awaiting first contact');
    typePhrase('Press start. Your friend will speak first.', false);
    paintTape();
    paintCtrl();
    showStart();
  },
};

export { createSynth };   // for offline level checks
