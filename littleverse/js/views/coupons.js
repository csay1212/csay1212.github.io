// The Coupon Book: scratch-off coupons, redeemable for real things. In memorial
// universes the same book holds promises instead (mode 'promise'): no redeeming,
// just revealing each one and keeping it close.
import { h, icon, shareOrCopy } from '../core/dom.js';

const fmtDate = ts => { const d = new Date(ts); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) }); };

// small hex helpers so the scratch foil follows the theme's gold
const hexN = s => { const m = /^#?([0-9a-f]{6})$/i.exec(String(s || '').trim()); return m ? parseInt(m[1], 16) : null; };
function mix(a, b, t) {
  const A = hexN(a), B = hexN(b);
  if (A == null || B == null) return a || b;
  return '#' + [16, 8, 0].map(s => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, '0')).join('');
}
const rgba = (c, a) => { const n = hexN(c); return n == null ? c : `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

export default {
  css: 'coupons',
  mount(ctx) {
    const { store, audio, fx, U } = ctx;
    const copy = U.copy.coupons || {};
    const promise = copy.mode === 'promise';
    const list = (copy.items || []).filter(c => c && c.id);
    const state = () => store.get('coupons', {}) || {};
    const setState = (id, patch) => store.set('coupons.' + id, { ...(state()[id] || {}), ...patch });
    const T = U.theme || {};
    const gold = T.gold || '#f5cc4a';

    // short enough for the ticket stub ("Admit Mira", "Admit Thursday Club")
    let short = String(U.them.name || '').trim().replace(/^the\s+/i, '');
    if (short.length > 10) short = short.split(/\s+/)[0];
    if (short.length > 10) short = short.slice(0, 9) + '…';

    const count = h('span');
    const book = h('div', { class: 'cp-book' });
    ctx.root.append(h('div', { class: 'cp' + (promise ? ' promise' : '') },
      h('div', { class: 'wintro' },
        h('p', { class: 'kicker gold', text: promise ? 'The Post Office · Promises' : 'The Post Office · Coupon Book' }),
        h('h2', { text: U.fill(copy.title || (promise ? 'Promises we’re keeping' : 'The Coupon Book')) }),
        h('p', { class: 'lede', text: U.fill(copy.lede || (promise ? 'Scratch each card gently to reveal a promise.' : 'Scratch each coupon to reveal it, then redeem it whenever you like.')) }),
        list.length ? h('p', { class: 'kicker muted cp-count' }, count) : null),
      book));

    if (!list.length) {
      book.classList.add('is-empty');
      book.append(h('div', { class: 'cp-empty' },
        h('img', { src: `assets/emoji/${promise ? 'heart_with_ribbon' : 'admission_tickets'}.webp`, alt: '', width: 88, height: 88 }),
        h('h3', { text: promise ? 'No promises written yet' : 'This coupon book is still blank' }),
        h('p', { text: promise ? 'When they’re written, they’ll be waiting here to be revealed.' : `${U.me.name} hasn’t printed any coupons yet. Check back soon.` }),
        h('a', { class: 'btn ghost', href: '#/map', text: 'Back to the map' })));
      ctx.peek(book, 'coupons-hide', { right: '8px', top: '-10px', rotate: 12, size: 28 });
      return;
    }

    function paintCount() {
      const s = state();
      const scratched = list.filter(c => s[c.id] && s[c.id].s).length;
      const done = list.filter(c => s[c.id] && (promise ? s[c.id].k : s[c.id].r)).length;
      count.textContent = promise ? `${scratched} of ${list.length} revealed · ${done} kept close` : `${scratched} of ${list.length} scratched · ${done} redeemed`;
    }

    list.forEach((c, i) => book.append(h('div', { class: 'cp-wrap', style: { '--i': i } }, coupon(c, i))));
    paintCount();
    ctx.peek(book, 'coupons-hide', { left: '-4px', bottom: '-12px', rotate: -14, size: 28 });

    function coupon(c, i) {
      const st = state()[c.id] || {};
      const title = U.fill(String(c.title || ''));
      const fine = U.fill(String(c.fine || ''));
      const mark = h('div', { class: 'cp-mark', 'aria-hidden': 'true' });
      const actions = h('div', { class: 'cp-actions' });
      const face = h('div', { class: 'cp-face' },
        h('span', { class: 'cp-ico', 'aria-hidden': 'true', text: c.icon || (promise ? '🤍' : '🎟️') }),
        h('div', { class: 'cp-txt' },
          h('p', { class: 'cp-kind', text: promise ? 'A promise' : c.void ? 'Cancelled by the issuer' : 'Good for' }),
          h('h3', { text: title }),
          fine ? h('p', { class: 'cp-fine', text: fine }) : null),
        actions);
      if (c.void) face.append(h('div', { class: 'cp-void', 'aria-hidden': 'true', text: 'VOID' }));
      const foil = h('canvas', { class: 'cp-foil', 'aria-hidden': 'true' });
      const revealBtn = h('button', { type: 'button', class: 'cp-reveal', 'aria-label': `Reveal ${promise ? 'promise' : 'coupon'} ${i + 1}` }, promise ? 'Reveal' : i === 0 ? 'Tap to reveal instead' : 'Reveal');
      const main = h('div', { class: 'cp-main' }, face, foil, revealBtn);
      const el = h('article', { class: 'cp-ticket' + (st.s ? ' scratched' : '') + (c.void ? ' void' : '') },
        h('div', { class: 'cp-stub', 'aria-hidden': 'true' },
          h('span', { text: 'No.' }), h('b', { text: String(i + 1).padStart(2, '0') }),
          h('small', { text: promise ? `For ${short}` : `Admit ${short}` })),
        main);

      function paintActions() {
        const s = state()[c.id] || {};
        actions.replaceChildren();
        const done = promise ? s.k : s.r;
        el.classList.toggle('is-done', !!done);
        mark.textContent = done ? (promise ? `Kept · ${fmtDate(done)}` : `Redeemed · ${fmtDate(done)}`) : '';
        if (done) actions.append(mark);
        if (!s.s || c.void) return;
        if (promise) {
          actions.append(h('button', {
            type: 'button', class: 'btn small cp-keep' + (s.k ? ' on' : ''), 'aria-pressed': s.k ? 'true' : 'false',
            onclick: e => {
              const on = !(state()[c.id] || {}).k;
              setState(c.id, { k: on ? Date.now() : null });
              audio.sfx(on ? 'sparkle' : 'click'); ctx.haptic(on ? 'success' : 'light');
              if (on) { const r = e.currentTarget.getBoundingClientRect(); fx.burst(r.left + r.width / 2, r.top, 14, [T.rose, T.gold, T.paper].filter(Boolean)); store.stat('promisesKept'); }
              paintActions(); paintCount();
            },
          }, icon('heart'), s.k ? 'Kept' : 'Keep this one'));
        } else if (!s.r) {
          actions.append(h('button', { type: 'button', class: 'btn solid small', onclick: async e => {
            setState(c.id, { r: Date.now() }); audio.sfx('stamp'); ctx.haptic('success'); paintActions(); paintCount();
            const r = e.currentTarget?.getBoundingClientRect?.() || main.getBoundingClientRect();
            fx.burst(r.left + r.width / 2, r.top, 24, [T.gold, T.rose, T.hud, T.paper].filter(Boolean));
            store.stat('couponsRedeemed');
            const res = await shareOrCopy({ title: 'Coupon redeemed', text: `🎟️ Redeeming a coupon from ${U.group ? 'our' : 'my'} Littleverse: “${title.replace(/[.!]$/, '')}”. Your move, ${U.me.name}.` });
            if (!ctx.alive()) return;
            ctx.toast(res === 'copied' ? `Redeemed! The message is copied, so send it to ${U.me.name}.` : res === 'shared' ? `Redeemed and sent. Now ${U.me.name} has to deliver.` : `Redeemed! Show ${U.me.name} this screen.`, 4200);
          } }, icon('heart'), 'Redeem'));
        } else {
          actions.append(h('button', { type: 'button', class: 'btn ghost small', onclick: () => { setState(c.id, { r: null }); audio.sfx('click'); paintActions(); paintCount(); } }, 'Un-redeem'));
        }
      }

      // ----- the scratch foil -----
      let fctx = null, W = 0, H = 0, done = !!st.s, scratching = false, last = null, moves = 0, hissT = 0;
      function drawFoil() {
        const r = main.getBoundingClientRect(); if (!r.width) return;
        const dpr = Math.min(devicePixelRatio || 1, 2);
        W = r.width; H = r.height;
        foil.width = Math.round(W * dpr); foil.height = Math.round(H * dpr);
        fctx = foil.getContext('2d', { willReadFrequently: true }); fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // gold foil for coupons, pearl foil for promises
        const base = promise ? mix(T.paper || '#f6eee3', T.lilac || '#b59cff', .22) : gold;
        const light = mix(base, '#ffffff', promise ? .55 : .45), dark = mix(base, '#3a2400', promise ? .16 : .28), deep = mix(base, '#3a2400', promise ? .26 : .38);
        const g = fctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, dark); g.addColorStop(.3, light); g.addColorStop(.5, deep); g.addColorStop(.72, light); g.addColorStop(1, dark);
        fctx.globalCompositeOperation = 'source-over';
        fctx.fillStyle = g; fctx.fillRect(0, 0, W, H);
        let seed = (i + 1) * 9301;
        const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
        for (let k = 0; k < W * H / 90; k++) { fctx.fillStyle = `rgba(255,255,255,${rnd() * .28})`; fctx.fillRect(rnd() * W, rnd() * H, 1.5, 1.5); }
        const ink = mix(base, '#1a0f00', .72);
        fctx.strokeStyle = rgba(ink, .18); fctx.lineWidth = 1;
        for (let x = -H; x < W; x += 14) { fctx.beginPath(); fctx.moveTo(x, H); fctx.lineTo(x + H, 0); fctx.stroke(); }
        fctx.fillStyle = rgba(ink, .82); fctx.textAlign = 'center';
        fctx.font = '600 13px "JetBrains Mono", monospace';
        fctx.fillText(promise ? '✦  S C R A T C H   G E N T L Y  ✦' : '✦  S C R A T C H   M E  ✦', W / 2, H / 2 - 10);
        fctx.font = 'italic 17px "Cormorant Garamond", serif';
        const TEASE = promise ? ['a promise is underneath', 'one we mean', 'kept, always', 'for you', 'take your time', 'we promise'] : ['side to side, like a lottery ticket', 'something good is under here', 'redeemable for real', 'no expiry date', 'this one’s a favorite', 'valid any day you like', 'no peeking. Okay, peek.', 'one of a kind'];
        fctx.fillText(TEASE[i % TEASE.length], W / 2, H / 2 + 14);
      }
      function scratchAt(x, y) {
        if (!fctx) return;
        fctx.globalCompositeOperation = 'destination-out';
        fctx.strokeStyle = '#000'; fctx.lineCap = 'round'; fctx.lineWidth = 36;
        fctx.beginPath(); fctx.moveTo(last ? last.x : x, last ? last.y : y); fctx.lineTo(x, y); fctx.stroke();
        last = { x, y };
        const now = performance.now();
        if (now - hissT > 70 && audio.sfxOn()) { hissT = now; audio.hiss({ dur: .07, freq: 3500 + Math.random() * 2000, q: .8, vol: .18 }); }
        if (++moves % 8 === 0 && cleared() > .5) finish();
      }
      function cleared() {
        try {
          const d = fctx.getImageData(0, 0, foil.width, foil.height).data;
          let clear = 0, n = 0;
          const step = Math.max(4, Math.floor(foil.width / 40)) * 4;
          for (let p = 3; p < d.length; p += step) { n++; if (d[p] < 40) clear++; }
          return clear / n;
        } catch { return 0; }
      }
      function finish() {
        if (done) return; done = true; scratching = false;
        foil.classList.add('gone'); revealBtn.hidden = true;
        el.classList.add('scratched');
        setState(c.id, { s: Date.now() });
        audio.sfx(c.void ? 'error' : 'sparkle'); ctx.haptic('light');
        const r = main.getBoundingClientRect();
        if (!c.void) fx.burst(r.left + r.width / 2, r.top + r.height / 2, promise ? 16 : 30, promise ? [T.gold, T.paper, T.rose].filter(Boolean) : undefined);
        ctx.award(3, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
        store.stat(promise ? 'promisesRevealed' : 'couponsScratched');
        paintActions(); paintCount();
        if (c.void) ctx.toast('That one was always going to be void. Nice try, though.');
        const s = state();
        if (list.every(x => s[x.id] && s[x.id].s)) {
          ctx.stamp();
          ctx.timeout(() => promise ? fx.confetti(70, { stars: true, colors: [T.gold, T.paper, T.peach].filter(Boolean) }) : fx.confetti(180, { colors: [T.gold, T.rose, T.hud, T.lilac, T.paper].filter(Boolean) }), 400);
        }
      }
      if (done) { foil.hidden = true; revealBtn.hidden = true; }
      else {
        requestAnimationFrame(drawFoil);
        foil.addEventListener('pointerdown', e => {
          if (done) return; scratching = true; last = null;
          try { foil.setPointerCapture(e.pointerId); } catch {}
          const r = foil.getBoundingClientRect(); scratchAt(e.clientX - r.left, e.clientY - r.top);
        });
        foil.addEventListener('pointermove', e => {
          if (!scratching || done) return;
          const r = foil.getBoundingClientRect(); scratchAt(e.clientX - r.left, e.clientY - r.top);
        });
        const end = () => { scratching = false; last = null; if (!done && fctx && cleared() > .5) finish(); };
        foil.addEventListener('pointerup', end); foil.addEventListener('pointercancel', end);
        revealBtn.onclick = finish;
      }
      paintActions();
      el._redraw = () => { if (!done) drawFoil(); };
      return el;
    }
    let rt;
    ctx.on(window, 'resize', () => { clearTimeout(rt); rt = setTimeout(() => [...book.querySelectorAll('.cp-ticket')].forEach(e => e._redraw && e._redraw()), 150); });
    ctx.cleanup(() => clearTimeout(rt));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (ctx.alive()) [...book.querySelectorAll('.cp-ticket')].forEach(e => e._redraw && e._redraw()); });
  },
};
