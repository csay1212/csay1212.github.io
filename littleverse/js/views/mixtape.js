// The Mixtape: the universe's soundtrack on a cassette, with liner notes.
// It drives the same player as the music button, so nothing restarts.
import { h, icon } from '../core/dom.js';

const fmt = s => (!isFinite(s) || s < 0) ? '–:––' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hexN = s => { const m = /^#?([0-9a-f]{6})$/i.exec(String(s || '').trim()); return m ? parseInt(m[1], 16) : null; };
function mix(a, b, t) {
  const A = hexN(a), B = hexN(b);
  if (A == null || B == null) return a || b;
  return '#' + [16, 8, 0].map(s => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, '0')).join('');
}

// The cassette, painted in the universe's colors. Text is escaped (it's user-written).
function cassetteSVG(title, studio, th) {
  const C = {
    shellA: mix(th.dusk || '#2a1d55', '#ffffff', .1), shellB: mix(th.night2 || '#120f33', th.dusk || '#2a1d55', .35),
    edge: mix(th.night || '#0c0b24', '#000000', .35), screw: mix(th.dusk || '#2a1d55', '#ffffff', .25),
    label: mix(th.paper || '#f6eee3', '#ffffff', .45), strip: th.rose || '#ef7fb0', band: th.gold || '#f5cc4a',
    ink: mix(th.rose || '#ef7fb0', '#1a0a14', .38), win: mix(th.night || '#0c0b24', '#000000', .2), hub: mix(th.dusk || '#2a1d55', '#000000', .2),
  };
  const t = String(title || '').trim() || 'Side A';
  // fit the handwritten title on the label
  const est = t.length * .44;
  const fs = Math.max(17, Math.min(27, 312 / Math.max(est, 1)));
  const fit = est * fs > 318 ? ' textLength="318" lengthAdjust="spacingAndGlyphs"' : '';
  let st = String(studio || '').toUpperCase();
  if (st.length > 32) st = st.slice(0, 31) + '…';
  const teeth = () => Array.from({ length: 6 }, (_, i) => `<rect x="-2.5" y="-15" width="5" height="7" rx="1" fill="${C.hub}" transform="rotate(${i * 60} 0 0)"/>`).join('');
  const reel = (id, cx) => `<g transform="translate(${cx} 96)"><circle class="pack" id="${id}p" r="30" fill="#3a2a1e"/><g class="reel" id="${id}"><circle r="17" fill="#f6eee3" stroke="${C.hub}" stroke-width="2"/>${teeth()}<circle r="5" fill="${C.hub}"/></g></g>`;
  return `<svg viewBox="0 0 420 270" class="mx-svg" role="img" aria-label="A cassette tape labelled ${esc(t)}">
    <defs><linearGradient id="mxShell" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.shellA}"/><stop offset="1" stop-color="${C.shellB}"/></linearGradient>
    <clipPath id="mxWin"><rect x="118" y="66" width="184" height="60" rx="30"/></clipPath></defs>
    <rect x="4" y="4" width="412" height="262" rx="18" fill="url(#mxShell)" stroke="${C.edge}" stroke-width="3"/>
    <rect x="4" y="4" width="412" height="262" rx="18" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="1"/>
    ${[[22, 22], [398, 22], [22, 248], [398, 248], [210, 240]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="${C.edge}"/><path d="M${x - 3} ${y} H${x + 3}" stroke="${C.screw}" stroke-width="1.5"/>`).join('')}
    <rect x="30" y="22" width="360" height="152" rx="10" fill="${C.label}"/>
    <rect x="30" y="22" width="360" height="26" rx="10" fill="${C.strip}"/><rect x="30" y="38" width="360" height="10" fill="${C.strip}"/>
    <rect x="30" y="48" width="360" height="6" fill="${C.band}"/>
    <text x="46" y="41" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" letter-spacing="2" fill="#fff">A</text>
    <text x="374" y="40" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="9" letter-spacing="1.6" fill="#fff">${esc(st)}</text>
    <rect x="118" y="66" width="184" height="60" rx="30" fill="${C.win}" stroke="${C.hub}" stroke-width="2"/>
    <g clip-path="url(#mxWin)">${reel('mxL', 160)}${reel('mxR', 260)}<rect x="118" y="66" width="184" height="60" fill="rgba(160,190,255,.08)"/></g>
    <path d="M128 72 Q160 66 196 70" stroke="rgba(255,255,255,.25)" stroke-width="3" fill="none" stroke-linecap="round"/>
    <text x="210" y="158" text-anchor="middle" font-family="Caveat, cursive" font-size="${fs.toFixed(1)}" font-weight="700" fill="${C.ink}"${fit}>${esc(t)}</text>
    <path d="M68 167 Q210 173 352 165" stroke="${C.ink}" stroke-width="1.2" fill="none" opacity=".45"/>
    <path d="M80 266 L104 200 H316 L340 266Z" fill="${C.shellB}" stroke="${C.edge}" stroke-width="2"/>
    ${[150, 186, 234, 270].map(x => `<circle cx="${x}" cy="230" r="${x === 186 || x === 234 ? 9 : 6}" fill="${C.edge}"/>`).join('')}
    <rect x="198" y="222" width="24" height="12" rx="2" fill="${C.edge}"/>
  </svg>`;
}

export default {
  css: 'mixtape',
  mount(ctx) {
    const { music, audio, store, U } = ctx;
    const copy = U.copy.mixtape || {};
    const tracks = (music.tracks || []).slice();
    const empty = !tracks.length;
    const title = U.fill(copy.title || `Songs for ${U.them.name}`);
    const noteFor = U.fill(copy.note || `For ${U.them.name}. Compiled by ${U.me.name}.`);
    const startedHere = at => { store.stat('mixtapePlays'); if (ctx.stamp()) ctx.award(10, at || playBtn); };

    const tape = h('div', { class: 'mx-tape' + (empty ? ' blank' : ''), html: cassetteSVG(title, U.studio, U.theme || {}) });
    const deck = h('div', { class: 'mx-deck' }, tape);

    // per-side numbering: A1, A2, B1…
    const sideNo = [];
    { const seen = {}; tracks.forEach((t, i) => { const s = (t.side || 'A').toString().toUpperCase().slice(0, 1); seen[s] = (seen[s] || 0) + 1; sideNo[i] = s + seen[s]; }); }

    const nowT = h('b', { class: 'mx-now' }), nowS = h('span', { class: 'mx-side' }), nowA = h('span', { class: 'mx-artist' });
    const cur = h('span', { class: 'mono', text: '0:00' }), dur = h('span', { class: 'mono', text: '–:––' });
    const bar = h('input', { type: 'range', min: '0', max: '1000', value: '0', class: 'mx-bar', 'aria-label': 'Seek' });
    const playBtn = h('button', { type: 'button', class: 'mx-play', 'aria-label': 'Play' }, icon('play'));
    const prevBtn = h('button', { type: 'button', class: 'icon-btn mx-skip', 'aria-label': 'Previous song', onclick: () => { music.prev(); audio.sfx('click'); startedHere(); } }, icon('prev'));
    const nextBtn = h('button', { type: 'button', class: 'icon-btn mx-skip', 'aria-label': 'Next song', onclick: () => { music.next(); audio.sfx('click'); startedHere(); } }, icon('next'));
    const pencil = h('button', { type: 'button', class: 'btn ghost small mx-pencil', title: 'For the cassette veterans' }, '✏️ Rewind with a pencil');
    const vu = h('div', { class: 'mx-vu', 'aria-hidden': 'true' }, ...Array.from({ length: 18 }, (_, i) => h('i', { style: { '--d': (0.45 + ((i * 37) % 11) / 18).toFixed(2) + 's', '--o': (-(i * 0.13)).toFixed(2) + 's' } })));

    const list = h('ol', { class: 'mx-list' });
    const note = h('p', { class: 'mx-note' });
    const notebox = h('div', { class: 'mx-notebox' }, h('span', { class: 'mx-jk', text: 'About this one' }), note);
    tracks.forEach((t, i) => {
      list.append(h('li', {}, h('button', { type: 'button', 'data-i': i, onclick: () => { music.select(i); audio.sfx('click'); startedHere(); } },
        h('span', { class: 'mx-n', text: sideNo[i] }),
        h('span', { class: 'mx-t' }, h('span', { text: t.title || `Track ${i + 1}` }), t.artist ? h('small', { text: t.artist }) : null),
        h('span', { class: 'mx-eq eq', html: '<i></i><i></i><i></i>' }))));
    });

    const jcard = h('div', { class: 'mx-jcard' },
      h('p', { class: 'mx-jk', text: 'Liner notes' }),
      h('h3', { text: title }),
      noteFor ? h('p', { class: 'mx-for', text: noteFor }) : null,
      empty
        ? h('div', { class: 'mx-blank' }, h('span', { class: 'mx-jk', text: 'Side A' }), h('i'), h('i'), h('i'), h('span', { class: 'mx-jk', text: 'Side B' }), h('i'), h('i'))
        : list,
      empty ? null : notebox);

    let left;
    if (empty) {
      // a blank tape: still lovely, still playable (it just hisses)
      const listen = h('button', { type: 'button', class: 'btn solid' }, icon('play'), 'Play the blank tape');
      let spinT = 0;
      listen.onclick = () => {
        audio.ac();
        if (audio.sfxOn()) audio.hiss({ dur: 3.2, freq: 2400, q: .4, vol: .08 });
        tape.classList.add('playing'); spinUntil = performance.now() + 3200;
        clearTimeout(spinT); spinT = ctx.timeout(() => tape.classList.remove('playing'), 3200);
        ctx.toast(U.gentle ? 'Just the soft hum of the tape. Sometimes that’s enough.' : 'Side A: a very peaceful recording of nothing at all.', 3600);
        startedHere(listen);
      };
      left = h('div', { class: 'mx-left' }, deck,
        h('div', { class: 'mx-empty' },
          h('img', { src: 'assets/emoji/videocassette.webp', alt: '', width: 64, height: 64 }),
          h('h3', { text: 'No songs on this tape yet' }),
          h('p', { text: U.gentle ? 'When songs are added, they’ll play right here, on this tape.' : `${U.me.name} hasn’t recorded anything yet. When they do, it’ll play right here.` }),
          listen));
    } else {
      left = h('div', { class: 'mx-left' }, deck,
        h('div', { class: 'mx-info' }, nowS, nowT, nowA),
        h('div', { class: 'mx-seek' }, cur, bar, dur),
        h('div', { class: 'mx-ctrls' }, prevBtn, playBtn, nextBtn),
        vu,
        h('div', { class: 'row center' }, pencil));
    }

    const grid = h('div', { class: 'mx-grid' }, left, jcard);
    ctx.root.append(h('div', { class: 'mx' },
      h('div', { class: 'wintro' },
        h('p', { class: 'kicker', text: 'The Post Office · Mixtape' }),
        h('h2', { text: 'The soundtrack, on tape' }),
        h('p', { class: 'lede', text: empty ? 'A cassette, labelled and ready. The songs just haven’t been recorded yet.' : 'The songs from the film, on the format they deserve. This tape plays the same soundtrack as the music button, so you can keep it going while you explore.' })),
      grid));
    ctx.peek(jcard, 'mixtape-hide', { right: '10px', bottom: '-12px', rotate: 10, size: 28 });

    // reels spin and the tape packs grow/shrink with the song's progress
    const L = tape.querySelector('#mxL'), R = tape.querySelector('#mxR'), Lp = tape.querySelector('#mxLp'), Rp = tape.querySelector('#mxRp');
    let ang = 0, dragging = false, spinUntil = 0;

    if (empty) {
      ctx.raf((t, dt) => {
        if (t < spinUntil) ang += dt * .18;
        L.setAttribute('transform', `rotate(${ang})`); R.setAttribute('transform', `rotate(${ang})`);
      });
      return;
    }

    playBtn.onclick = () => { const was = music.isPlaying(); music.toggle(); audio.sfx('click'); if (!was) startedHere(); };
    pencil.onclick = () => {
      if (audio.sfxOn()) audio.hiss({ dur: .9, freq: 900, q: 2, vol: .25, sweepTo: 3500 });
      tape.classList.add('rewind'); ctx.timeout(() => tape.classList.remove('rewind'), 900);
      music.seek(0);
      ctx.toast(U.gentle ? 'Rewound by hand, the old way.' : 'Rewound by hand. Very authentic. Your finger now smells like pencil.');
    };
    bar.addEventListener('input', () => { dragging = true; const d = music.el.duration; if (isFinite(d)) music.seek(bar.value / 1000 * d); });
    ['change', 'pointerup', 'pointercancel', 'blur'].forEach(ev => bar.addEventListener(ev, () => { dragging = false; }));

    const paint = s => {
      const i = Math.min(Math.max(0, s.track || 0), tracks.length - 1);
      if (!sideNo[i]) return;
      const t = tracks[i] || {};
      nowT.textContent = t.title || `Track ${i + 1}`;
      nowS.textContent = `Side ${sideNo[i][0]} · track ${i + 1} of ${tracks.length}`;
      nowA.textContent = t.artist || ''; nowA.hidden = !t.artist;
      note.textContent = U.fill(t.note || '');
      notebox.hidden = !t.note;
      playBtn.replaceChildren(icon(s.playing ? 'pause' : 'play')); playBtn.setAttribute('aria-label', s.playing ? 'Pause' : 'Play');
      tape.classList.toggle('playing', !!s.playing); vu.classList.toggle('on', !!s.playing);
      [...list.querySelectorAll('button')].forEach(b => { const on = +b.dataset.i === i; b.classList.toggle('cur', on); b.querySelector('.mx-eq').classList.toggle('on', on && s.playing); b.setAttribute('aria-current', on ? 'true' : 'false'); });
    };
    const off = music.on(paint); ctx.cleanup(off);

    ctx.raf((t, dt) => {
      const el = music.el, d = el.duration, c = el.currentTime || 0;
      const p = isFinite(d) && d > 0 ? Math.min(1, c / d) : 0;
      if (music.isPlaying() && !el.paused) ang += dt * .18;
      if (tape.classList.contains('rewind')) ang -= dt * 1.4;
      L.setAttribute('transform', `rotate(${ang})`); R.setAttribute('transform', `rotate(${ang})`);
      Lp.setAttribute('r', (20 + 28 * (1 - p)).toFixed(1)); Rp.setAttribute('r', (20 + 28 * p).toFixed(1));
      cur.textContent = fmt(c); dur.textContent = fmt(d);
      if (!dragging) bar.value = String(Math.round(p * 1000));
      bar.style.setProperty('--p', (p * 100).toFixed(2) + '%');
    });
  },
};
