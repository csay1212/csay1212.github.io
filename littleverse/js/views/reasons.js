// Reasons: a deck of playing cards. Each card says something true about the
// person this universe is for. Tap the top card to turn it over, swipe it
// away (or press Next) for the next one. Every reason, the title, the names
// and the colors come from the active universe.
import { h } from '../core/dom.js';
import { LUCIDE } from '../lib/lucide.js';

const lu = name => h('span', { class: 'lu', 'aria-hidden': 'true',
  html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${LUCIDE[name] || ''}</svg>` });

// Four friendly "suits", painted with theme roles.
const SUITS = [
  { id: 'heart', color: 'var(--rose)', svg: '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>' },
  { id: 'star', color: 'var(--gold)', svg: '<path d="M12 1.2Q13.5 10.5 22.8 12 13.5 13.5 12 22.8 10.5 13.5 1.2 12 10.5 10.5 12 1.2z"/>' },
  { id: 'moon', color: 'var(--lilac)', svg: '<path d="M12.5 2.6a7 7 0 0 0 8.9 8.9A9.6 9.6 0 1 1 12.5 2.6z"/>' },
  { id: 'bloom', color: 'var(--peach)', svg: '<circle cx="12" cy="6.4" r="4.6"/><circle cx="17.6" cy="12" r="4.6"/><circle cx="12" cy="17.6" r="4.6"/><circle cx="6.4" cy="12" r="4.6"/><circle cx="12" cy="12" r="2.6" fill-opacity=".45" style="fill:var(--paper)"/>' },
];
const suitSVG = s => `<svg viewBox="0 0 24 24" aria-hidden="true">${s.svg}</svg>`;

// Small seeded random so a universe's card backs always look the same.
function seeded(str) {
  let a = 2166136261;
  for (const c of String(str || 'littleverse')) a = Math.imul(a ^ c.charCodeAt(0), 16777619);
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sparkle = (x, y, r, cls = 'sp') => `<path class="${cls}" d="M${x} ${y - r}Q${x + r * .16} ${y - r * .16} ${x + r} ${y}Q${x + r * .16} ${y + r * .16} ${x} ${y + r}Q${x - r * .16} ${y + r * .16} ${x - r} ${y}Q${x - r * .16} ${y - r * .16} ${x} ${y - r}z"/>`;

// The back of every card: a starfield with a few constellations, a framed
// border and a medallion with the universe's monogram. 250×350 units.
function backPattern(seed, mono, verse) {
  const rnd = seeded(seed);
  let s = '';
  for (let i = 0; i < 70; i++) {
    const x = 20 + rnd() * 210, y = 22 + rnd() * 306;
    if (Math.hypot(x - 125, y - 172) < 66) continue;
    s += `<circle class="st" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(.35 + rnd() * rnd() * 1.3).toFixed(2)}" opacity="${(.25 + rnd() * .6).toFixed(2)}"/>`;
  }
  const regions = [[32, 54, 74, 52], [144, 54, 74, 52], [32, 248, 76, 50], [142, 248, 76, 50]];
  const skip = Math.floor(rnd() * 4);
  regions.forEach(([rx, ry, rw, rh], k) => {
    if (k === skip) return;
    const n = 4 + Math.floor(rnd() * 2), pts = [];
    for (let i = 0; i < n; i++) pts.push([rx + (i / (n - 1)) * rw * (.6 + rnd() * .4), ry + rnd() * rh]);
    s += `<polyline class="cl" points="${pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}"/>`;
    pts.forEach(([x, y], i) => { s += i % 2 ? `<circle class="cn" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.7"/>` : sparkle(+x.toFixed(1), +y.toFixed(1), 3.6, 'cn'); });
  });
  s += `<rect class="fr" x="10" y="10" width="230" height="330" rx="12"/><rect class="fr2" x="16.5" y="16.5" width="217" height="317" rx="8"/>`;
  s += sparkle(24, 24, 5) + sparkle(226, 24, 5) + sparkle(24, 326, 5) + sparkle(226, 326, 5);
  s += `<circle class="mdr" cx="125" cy="172" r="58"/><circle class="md" cx="125" cy="172" r="47"/><circle class="md2" cx="125" cy="172" r="40"/>`;
  s += sparkle(125, 101, 6) + sparkle(125, 243, 6) + sparkle(54, 172, 4.5) + sparkle(196, 172, 4.5);
  s += `<text class="mg" x="125" y="174" text-anchor="middle" dominant-baseline="central">${esc(mono)}</text>`;
  s += `<text class="lbl" x="125" y="40" text-anchor="middle">${esc(verse.toUpperCase())}</text>`;
  return s;
}
const backSVG = (pattern, label) => `<svg viewBox="0 0 250 350" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${pattern}${label ? `<text class="lbl no" x="125" y="318" text-anchor="middle">${esc(label)}</text>` : ''}</svg>`;

const ORNAMENT = '<svg viewBox="0 0 120 12" aria-hidden="true"><path d="M2 6h46M72 6h46" stroke="currentColor" stroke-width="1" opacity=".5"/><path d="M60 1.5l4.5 4.5-4.5 4.5-4.5-4.5z" fill="currentColor"/><circle cx="51" cy="6" r="1.4" fill="currentColor"/><circle cx="69" cy="6" r="1.4" fill="currentColor"/></svg>';

const shuffled = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

export default {
  css: 'reasons',
  mount(ctx) {
    const { U, store, audio, fx } = ctx;
    const items = ((U.copy.reasons && U.copy.reasons.items) || [])
      .map(t => U.fill(typeof t === 'string' ? t : (t && (t.text || t.body)) || '').trim()).filter(Boolean);
    const N = items.length;
    const title = ctx.world.name;
    const them = U.them.name;
    const themeCols = [U.theme.gold, U.theme.rose, U.theme.lilac, U.theme.paper, U.theme.peach];

    // monogram: the universe's initial (Miraverse → M), else the recipient's
    const verseWord = (U.verse || '').replace(/verse$/i, '');
    const mono = (verseWord && !/^little$/i.test(verseWord) ? verseWord : (them.split(/\s+/).find(w => !/^(the|a|an|my|our)$/i.test(w)) || them || '✦'))[0].toUpperCase();
    const pattern = backPattern(U.id || them, mono, U.verse || '');

    const lede = N === 0 ? (U.gentle ? 'This deck is still being written. The cards will be here soon.' : 'This deck is still being shuffled. The cards will be here soon.')
      : N === 1 ? (U.gentle ? `One card, holding something we remember about ${them}. Turn it over slowly.` : U.group ? 'One card. It says something true about all of you. Tap it to turn it over.' : 'One card. It says something true. Tap it to turn it over.')
      : U.gentle ? `Each card holds something we remember about ${them}. Turn them over slowly.`
      : U.group ? 'Each card says something true about all of you. Tap the top one to turn it over.'
      : 'Each card says something true. Tap the top one to turn it over.';

    const wrap = h('div', { class: 'rs' + (U.gentle ? ' gentle' : '') });
    wrap.append(h('div', { class: 'wintro' },
      h('p', { class: 'kicker rose', text: N > 1 ? `The Post Office · A deck of ${N}` : N === 1 ? 'The Post Office · One card' : 'The Post Office · A deck of cards' }),
      h('h2', { text: title }),
      h('p', { class: 'lede', text: lede })));
    ctx.root.append(wrap);

    if (!N) {
      wrap.append(h('div', { class: 'rs-empty' },
        h('div', { class: 'rs-under solo rs-bk', html: backSVG(pattern, '') }),
        h('a', { class: 'btn ghost', href: '#/map', text: 'Back to the map' })));
      return;
    }

    /* ---------- state ---------- */
    const seen = new Set((store.get('reasons.seen', []) || []).filter(i => Number.isInteger(i) && i >= 0 && i < N));
    const saveSeen = () => store.set('reasons.seen', [...seen].sort((a, b) => a - b));
    let deck = [...items.keys()].filter(i => !seen.has(i)).concat([...items.keys()].filter(i => seen.has(i)));
    let top = null, flipped = false, busy = false, sinceEnd = 0, justDone = false;

    /* ---------- layout ---------- */
    const barFill = h('i');
    const progText = h('span', { class: 'rs-prog-t' });
    const prog = h('div', { class: 'rs-prog' }, progText, h('span', { class: 'rs-bar', 'aria-hidden': 'true' }, barFill));
    const unders = [1, 2, 3].map(k => h('div', { class: `rs-under u${k} rs-bk`, 'aria-hidden': 'true', html: backSVG(pattern, '') }));
    const stage = h('div', { class: 'rs-stage' }, ...unders.slice().reverse());
    const live = h('p', { class: 'sr', 'aria-live': 'polite' });
    const mainLabel = h('span');
    const mainIco = h('span', { class: 'rs-main-ico' });
    const mainBtn = h('button', { type: 'button', class: 'btn solid rs-main' }, mainLabel, mainIco);
    const shuffleBtn = h('button', { type: 'button', class: 'rs-link' }, lu('shuffle'), h('span', { text: 'Shuffle' }));
    const allBtn = h('button', { type: 'button', class: 'rs-link' }, lu('layout-grid'), h('span', { text: 'See them all' }));
    wrap.append(prog, stage, h('div', { class: 'rs-actions' }, mainBtn, h('div', { class: 'rs-links' }, shuffleBtn, allBtn)), live);

    function paintProgress() {
      const n = seen.size;
      progText.replaceChildren();
      if (N === 1) progText.append(n ? h('b', { text: 'Turned over' }) : 'Not turned over yet');
      else if (n >= N) progText.append(h('b', { text: `All ${N}` }), ' turned over');
      else progText.append(h('b', { text: String(n) }), ` of ${N} turned over`);
      barFill.style.width = (n / N * 100) + '%';
      prog.classList.toggle('done', n >= N);
    }
    function paintUnder() {
      const count = Math.min(3, top && top._end ? N : N - 1);
      unders.forEach((u, i) => { u.hidden = i >= count; });
    }
    function paintMain() {
      mainIco.replaceChildren();
      shuffleBtn.hidden = !!(top && top._end) || N < 2;
      if (top && top._end) { mainLabel.textContent = 'Shuffle & deal again'; mainIco.append(lu('shuffle')); }
      else if (flipped) { mainLabel.textContent = N === 1 ? 'Put it back' : 'Next card'; mainIco.append(lu('arrow-right')); }
      else { mainLabel.textContent = 'Turn it over'; }
    }
    const pull = p => stage.style.setProperty('--pull', p.toFixed(3));

    /* ---------- one card ---------- */
    function fitText(card) {
      const box = card.querySelector('.rs-tbox'), p = card.querySelector('.rs-text');
      if (!box || !p) return;
      let fs = +card.style.getPropertyValue('--fs') || 26;
      let guard = 30;
      while (guard-- > 0 && fs > 14 && p.scrollHeight > box.clientHeight + 1) { fs -= 1; card.style.setProperty('--fs', fs); }
    }
    function startSize(t) { const n = t.length; return n <= 28 ? 31 : n <= 55 ? 27 : n <= 90 ? 24 : n <= 140 ? 21 : 19; }

    function makeCard(idx) {
      const suit = SUITS[idx % SUITS.length];
      const text = items[idx];
      const corner = cls => h('span', { class: 'rs-idx ' + cls, 'aria-hidden': 'true' }, h('b', { text: String(idx + 1) }), h('span', { html: suitSVG(suit) }));
      const el = h('button', { type: 'button', class: 'rs-card', style: { '--sc': suit.color, '--fs': startSize(text) } },
        h('span', { class: 'rs-lift' },
          h('span', { class: 'rs-flip' },
            h('span', { class: 'rs-back rs-bk', html: backSVG(pattern, `No. ${idx + 1} of ${N}`) }),
            h('span', { class: 'rs-face' },
              corner('tl'), corner('br'),
              h('span', { class: 'rs-pip', html: suitSVG(suit) }),
              h('span', { class: 'rs-tbox' }, h('span', { class: 'rs-text', text })),
              h('span', { class: 'rs-orn', html: ORNAMENT }),
              h('span', { class: 'rs-glint', 'aria-hidden': 'true' })))));
      el._idx = idx;
      bindCard(el);
      return el;
    }
    function makeEnd() {
      const el = h('button', { type: 'button', class: 'rs-card rs-endcard', 'aria-label': 'The whole deck is turned over. Press Enter to shuffle and deal again.' },
        h('span', { class: 'rs-lift' },
          h('span', { class: 'rs-endface' },
            h('img', { src: 'assets/emoji/' + (U.gentle ? 'glowing_star' : 'sparkles') + '.webp', alt: '', class: 'rs-end-emo' }),
            h('span', { class: 'rs-end-k', text: N === 1 ? 'The whole deck' : `All ${N} cards` }),
            h('span', { class: 'rs-end-h', text: U.gentle ? (N === 1 ? 'Every word of it' : 'Every one of them') : 'That’s the whole deck' }),
            h('span', { class: 'rs-end-p', text: N === 1 ? (U.gentle ? `Something we carry with us, the way we carry ${them}.` : 'Every word of it is true. And it’s only the one that fit on a card.')
              : U.gentle ? `Each card is something we carry with us. ${them} is in all of them.`
              : U.group ? 'Every one of them is true, about every one of you. And these are only the ones that fit on cards.'
              : 'Every one of them is true. And these are only the ones that fit on cards.' }),
            h('span', { class: 'rs-end-sig', text: U.gentle ? 'always' : `— ${U.me.name}` }))));
      el._end = true;
      bindCard(el);
      return el;
    }
    function label() {
      if (!top || top._end) return;
      const idx = top._idx;
      top.setAttribute('aria-label', flipped
        ? `Card ${idx + 1} of ${N}: ${items[idx]}. Press Enter to turn it back over, or the right arrow for the next card.`
        : `Card ${idx + 1} of ${N}, face down. Press Enter to turn it over.`);
    }

    function deal({ flip: startFlipped = false, enter = true } = {}) {
      const el = deck.length ? makeCard(deck[0]) : makeEnd();
      top = el; flipped = !!startFlipped;
      el.classList.toggle('flipped', flipped);
      stage.append(el);
      if (enter && !ctx.reduce) { el.classList.add('enter'); ctx.timeout(() => el.classList.remove('enter'), 520); }
      fitText(el);
      paintUnder(); paintMain(); label();
    }
    function dealEnd() {
      const el = makeEnd();
      top = el; flipped = false;
      stage.append(el);
      if (!ctx.reduce) { el.classList.add('enter'); ctx.timeout(() => el.classList.remove('enter'), 520); }
      paintUnder(); paintMain();
      audio.sfx('sparkle');
    }

    /* ---------- actions ---------- */
    function flip() {
      if (busy || !top) return;
      if (top._end) { shuffle(); return; }
      const el = top, idx = el._idx;
      flipped = !flipped;
      el.classList.toggle('flipped', flipped);
      el.classList.remove('flipping'); void el.offsetWidth; el.classList.add('flipping');
      ctx.timeout(() => el.classList.remove('flipping'), 760);
      ctx.haptic('light'); audio.sfx('flap');
      paintMain(); label();
      if (!flipped) return;
      live.textContent = `Card ${idx + 1}: ${items[idx]}`;
      el.classList.remove('glint'); void el.offsetWidth; el.classList.add('glint');
      if (!seen.has(idx)) {
        seen.add(idx); saveSeen(); store.stat('reasonsTurned');
        ctx.timeout(() => { ctx.award(3, el); audio.sfx('dust', { step: seen.size }); }, ctx.reduce ? 0 : 340);
        paintProgress();
        if (seen.size === N) {
          justDone = true;
          ctx.timeout(() => {
            ctx.stamp();
            const r = el.getBoundingClientRect();
            if (U.gentle) fx.burst(r.left + r.width / 2, r.top + r.height / 3, 22, themeCols);
            else { fx.confetti(140, { stars: true, colors: themeCols }); fx.burst(r.left + r.width / 2, r.top + r.height / 3, 26, themeCols); }
          }, ctx.reduce ? 50 : 700);
        }
      }
    }

    function sendOff(dir = -1, dy = 0) {
      if (busy || !top) return;
      busy = true;
      const el = top;
      const hadFocus = el === document.activeElement;
      el.classList.remove('dragging', 'enter', 'flipping');
      el.classList.add('gone');
      el.style.transform = `translate(${dir * (innerWidth * .55 + 280)}px, ${dy + 40}px) rotate(${dir * 26}deg)`;
      el.style.opacity = '0';
      audio.sfx('paper'); ctx.haptic('select');
      ctx.timeout(() => {
        pull(0);
        if (el._end) { sinceEnd = 0; deal(); }
        else {
          deck.push(deck.shift());
          sinceEnd++;
          if (seen.size >= N && (justDone || sinceEnd >= N)) { justDone = false; sinceEnd = 0; dealEnd(); }
          else deal();
        }
        busy = false;
        if (hadFocus) top.focus({ preventScroll: true });
      }, ctx.reduce ? 0 : 190);
      ctx.timeout(() => el.remove(), ctx.reduce ? 0 : 520);
    }

    function shuffle() {
      if (busy) return;
      busy = true;
      const hadFocus = top === document.activeElement;
      ctx.haptic('medium');
      audio.sfx('flap');
      if (!ctx.reduce) { ctx.timeout(() => audio.sfx('flap'), 160); ctx.timeout(() => audio.sfx('flap'), 320); }
      stage.classList.remove('shuffling'); void stage.offsetWidth; stage.classList.add('shuffling');
      const un = shuffled(deck.filter(i => !seen.has(i))), se = shuffled(deck.filter(i => seen.has(i)));
      const prevTop = top && !top._end ? top._idx : -1;
      deck = un.concat(se);
      if (deck.length > 1 && deck[0] === prevTop) deck.push(deck.shift());
      sinceEnd = 0; justDone = false;
      ctx.timeout(() => {
        top && top.remove();
        deal({ enter: false });
        busy = false;
        if (hadFocus) top.focus({ preventScroll: true });
      }, ctx.reduce ? 0 : 430);
      ctx.timeout(() => stage.classList.remove('shuffling'), ctx.reduce ? 0 : 820);
      live.textContent = 'Shuffled.';
    }

    function goTo(i) {
      if (busy) return;
      deck = [i, ...deck.filter(x => x !== i)];
      top && top.remove();
      sinceEnd = 0;
      deal({ flip: seen.has(i) });
      audio.sfx('pop');
      ctx.timeout(() => {
        top.focus({ preventScroll: true });
        const r = stage.getBoundingClientRect();
        if (r.top < 60 || r.bottom > innerHeight) stage.scrollIntoView({ block: 'center', behavior: ctx.reduce ? 'auto' : 'smooth' });
      }, 260);
    }

    /* ---------- input: tap, swipe, keys ---------- */
    function bindCard(el) {
      let sx = 0, sy = 0, dx = 0, dy = 0, t0 = 0, pid = null, moved = false, suppress = false;
      el.addEventListener('pointerdown', e => {
        if (busy || el !== top || (e.pointerType === 'mouse' && e.button !== 0)) return;
        pid = e.pointerId; sx = e.clientX; sy = e.clientY; dx = dy = 0; t0 = performance.now(); moved = false;
      });
      el.addEventListener('pointermove', e => {
        if (e.pointerId !== pid) return;
        dx = e.clientX - sx; dy = e.clientY - sy;
        if (!moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) {
          moved = true; el.classList.add('dragging');
          try { el.setPointerCapture(pid); } catch {}
        }
        if (moved) {
          el.style.transform = `translate(${dx}px, ${dy * .2}px) rotate(${dx / 16}deg)`;
          pull(Math.min(1, Math.abs(dx) / 150));
        }
      });
      const end = e => {
        if (e.pointerId !== pid) return;
        pid = null;
        if (!moved) return;
        suppress = true; setTimeout(() => { suppress = false; }, 60);
        el.classList.remove('dragging');
        const v = Math.abs(dx) / Math.max(1, performance.now() - t0);
        if (e.type === 'pointerup' && (Math.abs(dx) > 92 || (v > .55 && Math.abs(dx) > 34))) sendOff(dx > 0 ? 1 : -1, dy * .2);
        else { el.style.transform = ''; pull(0); }
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('click', e => { if (suppress || el !== top) { e.preventDefault(); return; } flip(); });
      el.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); if (el._end) shuffle(); else if (flipped) sendOff(e.key === 'ArrowRight' ? -1 : 1); else flip(); }
      });
    }

    mainBtn.addEventListener('click', () => {
      if (!top) return;
      if (top._end) shuffle();
      else if (flipped) sendOff(-1);
      else flip();
    });
    shuffleBtn.addEventListener('click', shuffle);
    allBtn.addEventListener('click', openAll);

    /* ---------- see them all ---------- */
    function openAll() {
      const grid = h('div', { class: 'rs-all' });
      const sorted = [...items.keys()];
      for (const i of sorted) {
        const suit = SUITS[i % SUITS.length];
        const turned = seen.has(i);
        const b = h('button', { type: 'button', class: 'rs-mini' + (turned ? ' turned' : ''), style: { '--sc': suit.color },
          'aria-label': turned ? `Card ${i + 1}: ${items[i]}. Pull it to the top of the deck.` : `Card ${i + 1}, not turned over yet. Pull it to the top of the deck.`,
          onclick: () => { close(); ctx.timeout(() => goTo(i), 30); } },
        turned ? [
          h('span', { class: 'rs-idx tl', 'aria-hidden': 'true' }, h('b', { text: String(i + 1) }), h('span', { html: suitSVG(suit) })),
          h('span', { class: 'rs-mini-text', text: items[i] }),
        ] : h('span', { class: 'rs-mini-back rs-bk', html: backSVG(pattern, `No. ${i + 1}`) }));
        grid.append(b);
      }
      const n = seen.size;
      const body = h('div', { class: 'rs-allwrap' },
        h('p', { class: 'kicker muted', text: n >= N ? `All ${N} turned over` : `${n} of ${N} turned over` }),
        h('p', { class: 'hint', text: n >= N ? 'Tap any card to pull it back to the top of the deck.' : 'Cards you haven’t turned yet are face down. Tap any card to pull it to the top of the deck.' }),
        grid);
      const close = ctx.modal({ title, body, wide: true });
    }

    /* ---------- go ---------- */
    paintProgress();
    deal({ enter: false });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (ctx.alive() && top && !top._end) { top.style.setProperty('--fs', startSize(items[top._idx])); fitText(top); } });
    let rt = 0;
    ctx.on(window, 'resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (ctx.alive() && top && !top._end) { top.style.setProperty('--fs', startSize(items[top._idx])); fitText(top); } }, 150); });
    ctx.cleanup(() => clearTimeout(rt));
    if (seen.size >= N && !store.hasStamp('reasons')) {
      // every card was already turned (the deck got shorter): stamp it, after a tap so the haptic is allowed
      const ua = navigator.userActivation;
      if (!ua || ua.hasBeenActive) ctx.stamp();
      else { const go = () => { removeEventListener('pointerup', go, true); if (ctx.alive()) ctx.stamp(); }; addEventListener('pointerup', go, true); ctx.cleanup(() => removeEventListener('pointerup', go, true)); }
    }

    ctx.peek(stage, 'reasons-hide', { right: 'calc(50% - var(--cw) / 2 - 12px)', top: '2px', rotate: 16, size: 30 });
  },
};
