// Little synth for sound effects and chords. Nothing is downloaded: every
// sound here is made in the browser. (The soundtrack songs live in music.js.)
import { store } from './store.js';

let ctx = null, master = null, dry = null, noiseBuf = null;

export function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = .55;
    const comp = ctx.createDynamicsCompressor();
    const d = ctx.createDelay(); d.delayTime.value = .31;
    const fb = ctx.createGain(); fb.gain.value = .3;
    const wet = ctx.createGain(); wet.gain.value = .22;
    master.connect(comp); comp.connect(ctx.destination);
    master.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(comp);
    // a second bus with no echo, for drums and tight game sounds
    dry = ctx.createGain(); dry.gain.value = .6; dry.connect(comp);
  }
  if (ctx.state === 'suspended') ctx.resume();
  // iPhone (iOS 17+): let game sounds play even when the ring/silent switch is on silent
  try { if (navigator.audioSession && navigator.audioSession.type !== 'play-and-record' && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch {}
  return ctx;
}
// The microphone (blowing out candles) needs a recording-capable audio session on iPhone.
export function micSession(on) {
  try { if (navigator.audioSession) navigator.audioSession.type = on ? 'play-and-record' : 'playback'; } catch {}
}
export const now = () => (ctx ? ctx.currentTime : 0);
export const out = () => master;
export const dryOut = () => dry;
const on = () => store.settings().sfx !== false;
export const sfxOn = on;

export const mf = n => 440 * Math.pow(2, (n - 69) / 12);

// soft electric-piano note
export function tone(n, t, dur, vol = .08, type = 'triangle', dest) {
  if (!ac()) return;
  t = t ?? ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = mf(n);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .012);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + .05);
  const o2 = ctx.createOscillator(), g2 = ctx.createGain();
  o2.type = 'sine'; o2.frequency.value = mf(n) * 2;
  g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(vol * .25, t + .008);
  g2.gain.exponentialRampToValueAtTime(.0001, t + dur * .5);
  o2.connect(g2); g2.connect(dest || master); o2.start(t); o2.stop(t + dur);
}
export function chord(notes, t, dur = .6, vol = .06, type = 'triangle') { notes.forEach(n => tone(n, t, dur, vol, type)); }

function noise() {
  if (noiseBuf) return noiseBuf;
  const len = ctx.sampleRate * 1;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const ch = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
// filtered noise burst (taps, whooshes, snares)
export function hiss({ t, dur = .06, freq = 3000, q = 2, type = 'bandpass', vol = .9, decay = 4, sweepTo, dest } = {}) {
  if (!ac()) return;
  t = t ?? ctx.currentTime;
  const s = ctx.createBufferSource(); s.buffer = noise();
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(dest || dry); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
  void decay;
}
// pitched blip with a frequency sweep
export function blip({ t, f0 = 600, f1 = 1200, dur = .12, vol = .15, type = 'sine', dest } = {}) {
  if (!ac()) return;
  t = t ?? ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(dest || dry); o.start(t); o.stop(t + dur + .03);
}
export function kick(t, vol = .9) { blip({ t, f0: 140, f1: 40, dur: .32, vol, type: 'sine' }); }

// The original film's two sounds, kept exactly.
export function tap() { if (!on() || !ac()) return; hiss({ dur: .06, freq: 2600 + Math.random() * 1200, q: 2, vol: .9, dest: master }); }
export function chime() {
  if (!on() || !ac()) return;
  const t = ctx.currentTime, base = [74, 78, 81, 86][Math.floor(Math.random() * 4)];
  tone(base, t, .8, .09, 'sine'); tone(base + 7, t + .07, .8, .06, 'sine');
}

// Named effects used across the games.
export function sfx(name, opt = {}) {
  if (!on() || !ac()) return;
  const t = ctx.currentTime;
  switch (name) {
    case 'click': blip({ t, f0: 900, f1: 700, dur: .05, vol: .08, type: 'triangle' }); break;
    case 'pop': blip({ t, f0: 300, f1: 900, dur: .09, vol: .18, type: 'sine' }); break;
    case 'coin': tone(88, t, .25, .07, 'square', dry); tone(93, t + .07, .4, .07, 'square', dry); break;
    case 'dust': { const b = 84 + (opt.step || 0) % 12; tone(b, t, .3, .05, 'sine'); tone(b + 12, t + .04, .25, .03, 'sine'); break; }
    case 'flap': hiss({ t, dur: .09, freq: 1400, q: .8, vol: .35, sweepTo: 600 }); break;
    case 'whoosh': hiss({ t, dur: .45, freq: 400, q: .7, vol: .5, sweepTo: 3200 }); break;
    case 'thud': kick(t, .7); hiss({ t, dur: .12, freq: 300, q: .6, type: 'lowpass', vol: .5 }); break;
    case 'crash': kick(t, .9); hiss({ t, dur: .5, freq: 1200, q: .4, type: 'lowpass', vol: .7, sweepTo: 200 }); break;
    case 'perfect': [79, 83, 86, 91].forEach((n, i) => tone(n, t + i * .05, .5, .06, 'sine')); break;
    case 'win': [72, 76, 79, 84, 88].forEach((n, i) => tone(n, t + i * .09, .9, .07, 'triangle')); break;
    case 'lose': [67, 63, 60].forEach((n, i) => tone(n, t + i * .14, .5, .07, 'triangle')); break;
    case 'error': blip({ t, f0: 220, f1: 140, dur: .18, vol: .12, type: 'square' }); break;
    case 'stamp': kick(t, 1); hiss({ t, dur: .18, freq: 900, q: .5, type: 'lowpass', vol: .9 }); setTimeout(() => sfx('win'), 180); break;
    case 'sparkle': for (let i = 0; i < 6; i++) tone(88 + [0, 4, 7, 12, 16, 19][i], t + i * .04, .35, .03, 'sine'); break;
    case 'open': blip({ t, f0: 500, f1: 1400, dur: .18, vol: .1, type: 'triangle' }); hiss({ t, dur: .2, freq: 4000, q: 1, vol: .2 }); break;
    case 'paper': hiss({ t, dur: .25, freq: 5000, q: .5, type: 'highpass', vol: .25 }); break;
    case 'boom': kick(t, 1); hiss({ t, dur: 1.2, freq: 900, q: .3, type: 'lowpass', vol: .8, sweepTo: 80 }); break;
    case 'launch': hiss({ t, dur: .8, freq: 300, q: 1, vol: .35, sweepTo: 2600 }); break;
    case 'tick': blip({ t, f0: 1800, f1: 1700, dur: .03, vol: .05, type: 'square' }); break;
    default: blip({ t });
  }
}

// Short original fanfare for the studio ident at the start of every universe.
export function fanfare() {
  if (!ac()) return;
  const t = ctx.currentTime + .05;
  // shimmer
  [91, 95, 98, 103, 98, 95].forEach((n, i) => tone(n, t + i * .06, .6, .02, 'sine'));
  // brass-ish rising chord (triangle stacks)
  const seq = [[60, 64, 67], [62, 65, 69], [64, 67, 72], [65, 69, 72, 77]];
  seq.forEach((c, i) => c.forEach(n => tone(n, t + .35 + i * .28, i === 3 ? 2.6 : .5, i === 3 ? .07 : .055, 'triangle')));
  [48, 52, 55].forEach((n, i) => tone(n, t + .35 + i * .28, .6, .08, 'sine'));
  tone(41, t + 1.19, 2.6, .1, 'sine'); tone(53, t + 1.19, 2.4, .06, 'sine');
  hiss({ t: t + 1.19, dur: 1.6, freq: 6000, q: .4, type: 'highpass', vol: .12 });
}
