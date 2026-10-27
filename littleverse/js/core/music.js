// The soundtrack: the universe's songs, looping in order. A shared service with
// phone-proofing, so the music keeps going between worlds. Tracks are set by
// the runtime when a universe starts playing (music.setTracks).
const TRACKS = [];
let META = { artist: '', album: '', art: '' };
const player = new Audio();
player.preload = 'auto';
player.setAttribute('playsinline', '');
let playing = false, track = 0, fails = 0;
const holds = new Set();
let resumeAfterHold = false;
const subs = new Set();
const emit = () => subs.forEach(fn => { try { fn(state()); } catch (e) { console.error(e); } });
const state = () => ({ playing, track, title: TRACKS[track] ? TRACKS[track].title : '', held: holds.size > 0, empty: !TRACKS.length });

function setMeta() {
  if (!TRACKS.length || !('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: TRACKS[track].title, artist: TRACKS[track].artist || META.artist, album: META.album,
      artwork: META.art ? [{ src: new URL(META.art, location.href).href, sizes: '512x512', type: 'image/png' }] : [],
    });
  } catch {}
}
function loadTrack(i, at) {
  if (!TRACKS.length) { emit(); return; }
  track = (i + TRACKS.length) % TRACKS.length;
  const src = TRACKS[track].url || TRACKS[track].src;
  player.src = /^(blob:|data:)/.test(src) ? src : encodeURI(src);
  if (at) player.addEventListener('loadedmetadata', () => { try { player.currentTime = at; } catch {} }, { once: true });
  setMeta(); emit();
}
let blockedMsg = false;
function resume() {
  if (!playing || !player.paused) return;
  player.play().catch(err => {
    // iPhone refuses to start audio without a fresh tap: say so instead of failing silently
    if (err && err.name === 'NotAllowedError') { playing = false; blockedMsg = true; emit(); }
  });
}
player.addEventListener('ended', () => { loadTrack(track + 1); resume(); });
player.addEventListener('playing', () => { fails = 0; blockedMsg = false; });
player.addEventListener('error', () => {
  if (!playing) return;
  if (++fails > 2) { fails = 0; loadTrack(track + 1); } else loadTrack(track, player.currentTime || 0);
  setTimeout(resume, 800);
});
// headphones unplugged: a pause right after an audio-device change is a real pause
let deviceChangedAt = 0;
try { navigator.mediaDevices && navigator.mediaDevices.addEventListener('devicechange', () => { deviceChangedAt = Date.now(); }); } catch {}
player.addEventListener('pause', () => {
  if (!playing || player.ended || holds.size) return;
  setTimeout(() => {
    if (!playing || !player.paused || holds.size) return;
    if (Date.now() - deviceChangedAt < 3000) { set(false); return; }
    if (!document.hidden) resume();
  }, 1500);
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && !holds.size) resume(); });
// stuck buffering for ~9 seconds: reload at the same spot
let lastT = -1, still = 0;
setInterval(() => {
  if (!playing || player.paused || document.hidden) { still = 0; return; }
  if (player.currentTime === lastT) { if (++still >= 3) { still = 0; loadTrack(track, player.currentTime); resume(); } } else still = 0;
  lastT = player.currentTime;
}, 3000);
if ('mediaSession' in navigator) {
  try {
    navigator.mediaSession.setActionHandler('play', () => set(true));
    navigator.mediaSession.setActionHandler('pause', () => set(false));
    navigator.mediaSession.setActionHandler('nexttrack', () => { loadTrack(track + 1); resume(); });
    navigator.mediaSession.setActionHandler('previoustrack', () => { loadTrack(track - 1); resume(); });
  } catch {}
}
function set(on) {
  if (on && !TRACKS.length) { playing = false; emit(); return; }
  if (on) {
    holds.clear(); resumeAfterHold = false;
    playing = true; blockedMsg = false;
    player.play().catch(() => { playing = false; emit(); });
  } else { playing = false; player.pause(); }
  emit();
}

export const music = {
  tracks: TRACKS,
  // replace the playlist (list of {title, artist, url|src, note, side})
  setTracks(list, meta = {}) {
    set(false); holds.clear(); resumeAfterHold = false;
    TRACKS.length = 0; TRACKS.push(...(list || []).filter(t => t && (t.url || t.src)));
    META = { artist: meta.artist || '', album: meta.album || '', art: meta.art || '' };
    track = 0; fails = 0;
    if (TRACKS.length) loadTrack(0); else { player.removeAttribute('src'); try { player.load(); } catch {} emit(); }
  },
  stop() { set(false); },
  // 0–1; phones that keep volume to the hardware buttons (iPhone) simply ignore it
  setVolume(v) { const n = Number(v); player.volume = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1; },
  el: player,
  state,
  blocked: () => blockedMsg,
  on(fn) { subs.add(fn); fn(state()); return () => subs.delete(fn); },
  play: () => set(true),
  pause: () => set(false),
  toggle: () => set(!playing),
  isPlaying: () => playing,
  next() { loadTrack(track + 1); set(true); },
  prev() { if (player.currentTime > 4) { player.currentTime = 0; set(true); return; } loadTrack(track - 1); set(true); },
  select(i) { if (i === track && playing) return; loadTrack(i); set(true); },
  seek(sec) { try { player.currentTime = sec; } catch {} },
  // A game that brings its own music asks the soundtrack to step aside, then gives it back.
  hold(reason = 'game') {
    if (!holds.size) resumeAfterHold = playing;
    holds.add(reason);
    if (playing) { playing = false; player.pause(); }
    emit();
  },
  release(reason = 'game') {
    if (!holds.delete(reason) || holds.size) return;
    if (resumeAfterHold) { resumeAfterHold = false; playing = true; resume(); }
    emit();
  },
  // iPhone only lets audio start from a tap. Call this inside a tap to "warm up"
  // the player so it can start a few seconds later without another tap.
  unlock() {
    if (playing) return;
    try {
      player.muted = true;
      const p = player.play();
      if (p && p.then) p.then(() => { if (!playing) player.pause(); player.muted = false; }).catch(() => { player.muted = false; });
      else { player.pause(); player.muted = false; }
    } catch { player.muted = false; }
  },
  label() {
    if (!TRACKS.length) return 'No music';
    if (blockedMsg) return 'Tap to keep playing';
    return playing ? TRACKS[track].title : 'Play music';
  },
};
