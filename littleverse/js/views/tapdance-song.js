// "Streetlamp Swing": an original swing tune for the tap-dance
// world, the little synth band that plays it, and the step charts that are
// derived from it. Everything is made in the browser; nothing is sampled.
//
// Form (126 bpm, swung eighths, key of F):
//   count-in (2 bars of taps) · intro vamp (2) · A1 (8) · A2 (8) · bridge (8) · A3 (8) · tag (4)

export const BPM = 126;
export const SPB = 60 / BPM;          // seconds per beat
const SW = 0.64;                       // where the swung "and" lands inside a beat

// beat position -> swung beat position (x.5 means "the and of x")
export const sw = p => { const f = p - Math.floor(p); return Math.abs(f - .5) < 1e-6 ? Math.floor(p) + SW : p; };
export const beatTime = p => sw(p) * SPB;

/* ------------------------------------------------------------------ harmony */
// r: bass root (midi), t: chord tones in semitones, v: piano voicing (rootless, mid register)
const CH = {
  Fmaj7: { r: 41, t: [0, 4, 7, 11], v: [57, 60, 64, 67] },
  F6: { r: 41, t: [0, 4, 7, 9], v: [57, 60, 62, 65] },
  F7: { r: 41, t: [0, 4, 7, 10], v: [57, 60, 63, 67] },
  D7: { r: 38, t: [0, 4, 7, 10], v: [57, 60, 64, 66] },
  Gm7: { r: 43, t: [0, 3, 7, 10], v: [57, 58, 62, 65] },
  C7: { r: 36, t: [0, 4, 7, 10], v: [57, 58, 62, 64] },
  Bbmaj7: { r: 46, t: [0, 4, 7, 11], v: [57, 60, 62, 65] },
  Bbm6: { r: 46, t: [0, 3, 7, 9], v: [55, 58, 61, 65] },
  Am7: { r: 45, t: [0, 3, 7, 10], v: [55, 59, 60, 64] },
  Dbmaj7: { r: 37, t: [0, 4, 7, 11], v: [56, 60, 63, 65] },
  Fmaj9: { r: 41, t: [0, 4, 7, 11], v: [53, 57, 60, 64, 67, 69] },
};
const A_BARS = [['Fmaj7'], ['D7'], ['Gm7'], ['C7'], ['Fmaj7'], ['D7'], ['Gm7', 'C7']];
const SECTIONS = [
  { id: 'intro', at: 8, bars: [['Gm7', 'C7'], ['Gm7', 'C7']] },
  { id: 'A1', at: 16, bars: [...A_BARS, ['Fmaj7', 'C7']] },
  { id: 'A2', at: 48, bars: [...A_BARS, ['Fmaj7', 'F7']] },
  { id: 'B', at: 80, bars: [['Bbmaj7'], ['Bbm6'], ['Am7'], ['D7'], ['Gm7'], ['C7'], ['Am7', 'D7'], ['Gm7', 'C7']] },
  { id: 'A3', at: 112, bars: [...A_BARS, ['F6']] },
  { id: 'tag', at: 144, bars: [['Gm7', 'C7'], ['Gm7', 'C7'], ['Dbmaj7'], ['Fmaj9']] },
];
export const FINAL_BEAT = 156;       // the last chord
export const END_BEAT = 160;

/* ------------------------------------------------------------------ melody */
// [beat within section, midi, length in beats]. Original tune: a little
// question-and-answer figure that climbs a step, then a bridge that leans on
// the minor iv chord before coming home.
const HEAD = [
  [0, 69, 1.5], [1.5, 72, .5], [2, 76, 1], [3, 74, .5], [3.5, 72, .5],
  [4, 69, 2.5], [6.5, 66, .5], [7, 69, 1],
  [8, 70, 1.5], [9.5, 74, .5], [10, 77, 1], [11, 76, .5], [11.5, 74, .5],
  [12, 72, 2.5], [14.5, 67, .5], [15, 70, 1],
  [16, 69, 1], [17, 72, .5], [17.5, 77, 1.5], [19, 76, 1],
  [20, 74, .5], [20.5, 72, .5], [21, 69, 1], [22, 72, 1], [23, 74, 1],
];
const END1 = [[24, 70, 1], [25, 74, 1], [26, 72, .5], [26.5, 70, .5], [27, 67, 1], [28, 69, 3]];
const END2 = [[24, 70, .5], [24.5, 69, .5], [25, 67, 1], [26, 76, 1], [27, 72, 1], [28, 77, 2], [31, 72, .5], [31.5, 74, .5]];
const END3 = [[24, 70, .5], [24.5, 74, .5], [25, 79, 1], [26, 76, .5], [26.5, 74, .5], [27, 72, 1], [28, 77, 3.5]];
const BRIDGE = [
  [0, 77, 2], [2, 74, .5], [2.5, 69, .5], [3, 74, 1],
  [4, 73, 2.5], [6.5, 70, .5], [7, 73, 1],
  [8, 72, 1.5], [9.5, 76, .5], [10, 79, 1], [11, 76, 1],
  [12, 78, 2], [14, 74, .5], [14.5, 72, .5], [15, 69, 1],
  [16, 70, 1], [17, 74, .5], [17.5, 77, 1.5], [19, 74, 1],
  [20, 76, 2], [22, 79, 1], [23, 76, 1],
  [24, 72, 1], [25, 76, 1], [26, 78, 1], [27, 81, 1],
  [28, 79, 1.5], [29.5, 77, .5], [30, 76, .5], [30.5, 74, .5], [31, 72, 1],
];
const TAG = [
  [0, 74, .5], [.5, 77, .5], [1, 81, 1], [2, 79, .5], [2.5, 76, .5], [3, 72, 1],
  [4, 74, .5], [4.5, 77, .5], [5, 81, 1], [6, 79, .5], [6.5, 76, .5], [7, 72, 1.5],
  [8, 77, 1.5], [9.5, 75, .5], [10, 72, 1],
  [12, 81, 4],
];
// absolute melody: { b: beat, n: midi, len: beats, sec: section id }
const MEL = [];
const addMel = (at, list, sec) => list.forEach(([b, n, len]) => MEL.push({ b: at + b, n, len, sec }));
addMel(16, [...HEAD, ...END1], 'A1');
addMel(48, [...HEAD, ...END2], 'A2');
addMel(80, BRIDGE, 'B');
addMel(112, [...HEAD, ...END3], 'A3');
addMel(144, TAG, 'tag');
const SECTION_STARTS = new Set([16, 48, 80, 112]);

/* ------------------------------------------------------------------ the arrangement */
// Every sound in the song as data: { t (seconds from the first count-in tap), k (instrument), ... }
export function buildSong() {
  const ev = [];
  const at = (beat, k, o = {}, straight = false) => ev.push({ t: (straight ? beat : sw(beat)) * SPB, b: beat, k, ...o });

  // count-in: "tap ... tap ... tap tap tap tap"
  [0, 2].forEach(b => at(b, 'count', { vol: .16, hi: false }));
  [4, 5, 6, 7].forEach(b => at(b, 'count', { vol: .13, hi: true }));
  at(7.5, 'hat', { vol: .04 });

  // walking bass, piano comping, drums
  let prevBass = 41, barNo = 0;
  const flat = [];
  for (const s of SECTIONS) s.bars.forEach((bar, i) => flat.push({ sec: s.id, at: s.at + i * 4, bar, i, last: i === s.bars.length - 1 }));
  flat.forEach((B, idx) => {
    const next = flat[idx + 1];
    const nextRoot = next ? CH[next.bar[0]].r : 41;
    const isFinal = B.sec === 'tag' && B.i === 3;
    // ---- bass
    if (isFinal) {
      at(B.at, 'bass', { n: 41, dur: 3.2 * SPB, vol: .09 });
      at(B.at, 'bass', { n: 29, dur: 3.2 * SPB, vol: .04 });
    } else {
      const line = walkBar(B.bar, nextRoot, prevBass, barNo);
      line.forEach(([b, n, v]) => at(B.at + b, 'bass', { n, dur: SPB * (v < .5 ? .4 : .92), vol: .075 * (v ?? 1) }));
      prevBass = line[line.length - 1][1];
    }
    // ---- piano comping
    const intro = B.sec === 'intro';
    if (isFinal) {
      at(B.at, 'piano', { notes: CH.Fmaj9.v, dur: 3.6, vol: .03, strum: .035 });
    } else if (B.bar.length === 2) {
      const [c1, c2] = B.bar.map(c => CH[c].v);
      at(B.at, 'piano', { notes: c1, dur: .55, vol: intro ? .026 : .03 });
      at(B.at + 2, 'piano', { notes: c2, dur: .55, vol: intro ? .026 : .03 });
      at(B.at + 3.5, 'piano', { notes: c2, dur: .3, vol: .023 });
    } else {
      const v = CH[B.bar[0]].v;
      const pat = [[[0, .6], [1.5, .3]], [[1, .32], [3, .32]], [[0, .6], [1.5, .3]], [[0, 1.1], [2.5, .3]]][barNo % 4];
      pat.forEach(([b, d], j) => at(B.at + b, 'piano', { notes: v, dur: d * 1.6, vol: j ? .025 : .031 }));
    }
    // ---- drums
    if (!isFinal) {
      for (let k = 0; k < 4; k++) {
        const back = k % 2 === 1;
        at(B.at + k, 'ride', { vol: back ? .11 : .085 });
        if (back) { at(B.at + k + .5, 'ride', { vol: .06 }); at(B.at + k, 'hat', { vol: .07 }); at(B.at + k, 'slap', { vol: .05 }); }
        else at(B.at + k, 'swish', { vol: .03 });
        at(B.at + k, 'kick', { vol: (k === 0 && B.i === 0) ? .13 : .055 });
      }
      // fills into the next section
      if (B.last && B.sec !== 'tag') {
        [2, 2 + 1 / 3, 2 + 2 / 3, 3, 3 + 1 / 3, 3 + 2 / 3].forEach((b, j) => at(B.at + b, 'snare', { vol: .022 + j * .007 }));
        at(B.at + 4, 'crash', { vol: .05 });
      }
      if (B.sec === 'tag' && B.i === 2) {
        for (let j = 0; j < 12; j++) at(B.at + 2 + j / 6, 'snare', { vol: .012 + j * .004 }, true);
      }
    } else {
      at(B.at, 'crash', { vol: .07 });
      at(B.at, 'kick', { vol: .2 });
      // the "ta-dah" taps at the very end
      at(B.at + 2 + 1 / 3, 'count', { vol: .13, hi: true });
      at(B.at + 2 + 2 / 3, 'count', { vol: .16, hi: false });
    }
    barNo++;
  });

  // melody
  for (const m of MEL) at(m.b, 'lead', { n: m.n, dur: Math.min(3.2, m.len * SPB + .32), vol: m.b >= FINAL_BEAT ? .088 : .085 });
  // the ending flourish: a run up into the last chord
  [65, 69, 72, 76, 79, 81, 84, 88].forEach((n, i) => at(FINAL_BEAT - 1 + i / 8, 'lead', { n, dur: .5, vol: .028 + i * .002 }, true));
  [93, 96, 100].forEach((n, i) => at(FINAL_BEAT + .25 + i * .25, 'bell', { n, vol: .012 }, true));

  ev.sort((a, b) => a.t - b.t);
  return { events: ev, length: beatTime(END_BEAT) + 1.2 };
}

// a bar of walking bass: [[beat, midi, velocity]]
function walkBar(bar, nextRoot, prev, barNo) {
  // the octave of midi m closest to ref, kept inside the bass range
  const near = (m, ref, lo = 36, hi = 55) => {
    let best = null;
    for (let o = -4; o <= 4; o++) { const c = m + o * 12; if (c >= lo && c <= hi && (best == null || Math.abs(c - ref) < Math.abs(best - ref))) best = c; }
    return best ?? m;
  };
  const approach = (target, from) => { const tgt = near(target, from, 36, 50); return barNo % 3 === 1 ? tgt + 1 : tgt - 1; };
  if (bar.length === 2) {
    const a = CH[bar[0]], b = CH[bar[1]];
    const r1 = near(a.r, prev, 36, 50), r2 = near(b.r, r1, 36, 50);
    const mid = (r1 + r2) / 2;
    const passing = [a.t[1], a.t[2], a.t[1] - 12, a.t[2] - 12].map(x => r1 + x).filter(x => x >= 36 && x <= 55)
      .sort((x, y) => Math.abs(x - mid) - Math.abs(y - mid))[0] ?? r1;
    return [[0, r1], [1, passing], [2, r2], [3, approach(nextRoot, r2)]];
  }
  const c = CH[bar[0]], r = near(c.r, prev, 36, 50);
  const line = barNo % 2
    ? [[0, r], [1, r + 2], [2, r + c.t[1]], [3, approach(nextRoot, r + c.t[1])]]
    : [[0, r], [1, r + c.t[1]], [2, r + c.t[2]], [3, approach(nextRoot, r + c.t[2])]];
  if (barNo % 4 === 3) line.splice(3, 0, [2.5, line[3][1], .4]);   // a swung ghost note
  return line;
}

/* ------------------------------------------------------------------ the charts */
// [{ t (seconds), b (beat), lane: 0 left / 1 right, dbl }]
export function buildChart(diff) {
  const out = [];
  const push = (b, lane, dbl = false) => out.push({ b, t: beatTime(b), lane, dbl });
  const backbeatAfter = b => { let x = Math.floor(b) + 1; while (x % 2 !== 1 || x - b < .99) x++; return x; };
  let prevB, prevLane, prevN = 65;
  if (diff === 'stroll') {
    [8, 10, 12, 14].forEach((b, i) => push(b, i % 2));
    prevB = 14; prevLane = 1;
    for (const m of MEL) {
      if (m.b >= FINAL_BEAT) break;
      if (!Number.isInteger(m.b) || m.len < 1 || m.b - prevB < 1) continue;
      while (m.b - prevB > 2.5) {
        const fb = backbeatAfter(prevB);
        if (fb > m.b - 1) break;
        prevLane ^= 1; push(fb, prevLane); prevB = fb;
      }
      const lane = m.n > prevN ? 1 : m.n < prevN ? 0 : prevLane ^ 1;
      push(m.b, lane); prevB = m.b; prevLane = lane; prevN = m.n;
    }
    push(FINAL_BEAT, 0, true); push(FINAL_BEAT, 1, true);
  } else {
    [8, 9, 10, 11, 12, 13, 13.5, 14, 15].forEach((b, i) => push(b, i % 2));
    prevB = 15; prevLane = 0;
    let prevDbl = false;
    for (const m of MEL) {
      if (m.b >= FINAL_BEAT) break;
      // fill long gaps with backbeat steps
      while (sw(m.b) - sw(prevB) > 2.2) {
        const fb = backbeatAfter(prevB);
        if (fb > m.b - .99) break;
        prevLane ^= 1; push(fb, prevLane); prevB = fb; prevDbl = false;
      }
      const gap = sw(m.b) - sw(prevB);
      // a two-foot step needs a moment of space before it
      const dbl = (SECTION_STARTS.has(m.b) || m.len >= 2.5) && gap >= .99;
      let lane = m.n > prevN ? 1 : m.n < prevN ? 0 : prevLane ^ 1;
      if (gap < .75 && !prevDbl) lane = prevLane ^ 1;
      if (dbl) { push(m.b, 0, true); push(m.b, 1, true); }
      else push(m.b, lane);
      prevB = m.b; prevLane = lane; prevN = m.n; prevDbl = dbl;
    }
    push(FINAL_BEAT, 0, true); push(FINAL_BEAT, 1, true);
    push(FINAL_BEAT + 2 + 1 / 3, 0); push(FINAL_BEAT + 2 + 2 / 3, 1);
  }
  out.sort((a, b) => a.t - b.t || a.lane - b.lane);
  out.forEach((n, i) => { n.id = i; });
  return out;
}

/* ------------------------------------------------------------------ the band */
// createBand(ac, wetDest, dryDest): melodic voices go to the echo bus, the
// rhythm section stays dry. Every source is tracked so stopAll() really is silence.
export function createBand(ac, wetDest, dryDest) {
  const live = new Set();
  const wet = ac.createGain(), dry = ac.createGain();
  wet.gain.value = 1; dry.gain.value = 1;
  wet.connect(wetDest); dry.connect(dryDest);
  let stopped = false;

  const nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  { const d = nb.getChannelData(0); let s = 1234567; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; } }

  const reg = n => { live.add(n); n.onended = () => live.delete(n); return n; };
  const gainNode = (dest) => { const g = ac.createGain(); g.connect(dest); return g; };
  const osc = (type, f, t, t1, dest, detune = 0) => {
    const o = ac.createOscillator(); o.type = type; o.frequency.value = f; if (detune) o.detune.value = detune;
    o.connect(dest); o.start(t); o.stop(t1); return reg(o);
  };
  const mf = n => 440 * Math.pow(2, (n - 69) / 12);
  const noise = (t, dur, filt, f, q, vol, dest = dry, attack = 0) => {
    const s = ac.createBufferSource(); s.buffer = nb; s.loop = true;
    const bq = ac.createBiquadFilter(); bq.type = filt; bq.frequency.value = f; bq.Q.value = q;
    const g = gainNode(dest);
    if (attack) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); }
    else g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(bq); bq.connect(g); s.start(t, (t * 7.31) % .8); s.stop(t + dur + .02); reg(s);
  };

  const voices = {
    // soft triangle "piano" for the tune (same recipe as audio.tone, but tracked)
    lead(e, t) {
      const g = gainNode(wet), f = mf(e.n);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(e.vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + e.dur);
      osc('triangle', f, t, t + e.dur + .03, g);
      const g2 = gainNode(wet);
      g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(e.vol * .22, t + .008); g2.gain.exponentialRampToValueAtTime(.0001, t + e.dur * .5);
      osc('sine', f * 2, t, t + e.dur * .5 + .03, g2);
    },
    bell(e, t) {
      const g = gainNode(wet);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(e.vol, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + 1.4);
      osc('sine', mf(e.n), t, t + 1.45, g);
    },
    // comping chords: warm, short, slightly filtered
    piano(e, t) {
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; lp.Q.value = .3; lp.connect(wet);
      e.notes.forEach((n, i) => {
        const tt = t + (e.strum || 0) * i + i * .004;
        const g = gainNode(lp);
        g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(e.vol, tt + .006); g.gain.exponentialRampToValueAtTime(.0001, tt + e.dur);
        osc('triangle', mf(n), tt, tt + e.dur + .03, g);
        const g2 = gainNode(lp);
        g2.gain.setValueAtTime(0, tt); g2.gain.linearRampToValueAtTime(e.vol * .25, tt + .004); g2.gain.exponentialRampToValueAtTime(.0001, tt + Math.min(.35, e.dur));
        osc('sine', mf(n) * 2, tt, tt + Math.min(.35, e.dur) + .03, g2);
      });
    },
    // plucked upright-ish bass
    bass(e, t) {
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = .7; lp.connect(dry);
      const g = gainNode(lp), f = mf(e.n), end = t + e.dur;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(e.vol, t + .008);
      g.gain.setTargetAtTime(e.vol * .35, t + .02, .14);
      g.gain.setTargetAtTime(0, end - .05, .03);
      osc('sine', f, t, end + .2, g);
      const gt = gainNode(g); gt.gain.value = .4;
      osc('triangle', f, t, end + .2, gt, 4);
      const g2 = gainNode(lp);
      g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(e.vol * .42, t + .006); g2.gain.exponentialRampToValueAtTime(.0001, t + .32);
      osc('sine', f * 2, t, t + .34, g2);
    },
    ride(e, t) { noise(t, .32, 'highpass', 7200, .6, e.vol); noise(t, .09, 'bandpass', 5200, 2.5, e.vol * .5); },
    hat(e, t) { noise(t, .05, 'highpass', 8200, .7, e.vol); },
    slap(e, t) { noise(t, .15, 'bandpass', 2300, .8, e.vol); },
    swish(e, t) { noise(t, .34, 'bandpass', 3600, .5, e.vol, dry, .07); },
    snare(e, t) {
      noise(t, .13, 'bandpass', 1900, .7, e.vol);
      const g = gainNode(dry); g.gain.setValueAtTime(e.vol * .6, t); g.gain.exponentialRampToValueAtTime(.0001, t + .07);
      osc('triangle', 190, t, t + .08, g);
    },
    crash(e, t) { noise(t, 1.6, 'highpass', 4800, .5, e.vol); noise(t, .6, 'bandpass', 3200, .9, e.vol * .4); },
    kick(e, t) {
      const g = gainNode(dry), o = ac.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(115, t); o.frequency.exponentialRampToValueAtTime(42, t + .16);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(e.vol, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .26);
      o.connect(g); o.start(t); o.stop(t + .28); reg(o);
    },
    // a tap shoe: a bright click with a little wooden knock under it
    count(e, t) { voices.tap({ vol: e.vol, hi: e.hi }, t); },
    tap(e, t) {
      noise(t, .045, 'bandpass', e.hi ? 4200 : 3400, 1.6, e.vol);
      const g = gainNode(dry), o = ac.createOscillator(); o.type = 'triangle';
      const f0 = e.hi ? 1500 : 1150;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * .55, t + .03);
      g.gain.setValueAtTime(e.vol * .55, t); g.gain.exponentialRampToValueAtTime(.0001, t + .045);
      o.connect(g); o.start(t); o.stop(t + .06); reg(o);
    },
    // a soft scuff for a missed step
    scuff(e, t) { noise(t, .1, 'lowpass', 700, .6, e.vol); },
  };

  return {
    play(e, t) { if (stopped) return; const v = voices[e.k]; if (v) v(e, t); },
    live: () => live.size,
    stopped: () => stopped,
    stopAll() {
      if (stopped) return;
      stopped = true;
      const now = ac.currentTime;
      for (const g of [wet, dry]) { try { g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(0, now + .015); } catch {} }
      for (const n of live) { try { n.stop(now + .02); } catch {} }
      setTimeout(() => { try { wet.disconnect(); dry.disconnect(); } catch {} }, 60);
    },
  };
}
