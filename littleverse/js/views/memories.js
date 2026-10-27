// Memory Lane: a scrapbook of moments, in the order they happened. Polaroids
// sit along a winding dotted path that lights up as you walk down it. Tap one
// to hold it closer. Every caption, date and photo comes from the universe.
import { h, svg } from '../core/dom.js';
import { LUCIDE } from '../lib/lucide.js';

const lu = name => h('span', { class: 'lu', 'aria-hidden': 'true',
  html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${LUCIDE[name] || ''}</svg>` });

const EMOJI = ['camera_with_flash', 'framed_picture', 'sparkles', 'red_heart'];
const TAPES = ['var(--lilac)', 'var(--rose)', 'var(--hud)', 'var(--gold)', 'var(--peach)', 'var(--sky)'];
const ROTS = [-3.2, 2.6, -1.6, 3.3, -2.5, 1.8, -3.6, 2.2];
const GRADS = [['var(--rose)', 'var(--lilac)'], ['var(--gold)', 'var(--peach)'], ['var(--lilac)', 'var(--sky)'], ['var(--peach)', 'var(--rose)'], ['var(--hud)', 'var(--lilac)']];
const pad = n => String(n).padStart(2, '0');

export default {
  css: 'memories',
  async mount(ctx) {
    const { U, store, audio, fx } = ctx;
    const raw = (U.copy.memories && U.copy.memories.items) || [];
    const items = raw.filter(it => it && (it.caption || it.photo || it.when)).map((it, i) => ({
      id: String(it.id || 'm' + i), caption: U.fill(String(it.caption || '')).trim(), when: U.fill(String(it.when || '')).trim(), photo: it.photo || null,
    }));
    const N = items.length;
    const urls = await Promise.all(items.map(it => it.photo ? Promise.resolve().then(() => U.url(it.photo)).catch(() => null) : null));
    if (!ctx.alive()) return;
    const broken = new Set();
    const seen = new Set((store.get('memories.seen', []) || []).map(String));
    const themeCols = [U.theme.gold, U.theme.rose, U.theme.peach, U.theme.lilac, U.theme.paper];

    /* ---------- intro ---------- */
    const lede = N === 0 ? (U.gentle ? 'This lane is waiting for its first memory.' : 'This lane is waiting for its first moment.')
      : U.gentle ? 'Some moments, in the order they happened. Tap one to hold it a little closer.'
      : 'Some moments, in the order they happened. Tap one to look closer.';
    const wrap = h('div', { class: 'ml' + (U.gentle ? ' gentle' : '') },
      h('div', { class: 'wintro' },
        h('p', { class: 'kicker ml-kick', text: N ? `The Post Office · ${N} moment${N === 1 ? '' : 's'}` : 'The Post Office · A scrapbook' }),
        h('h2', { text: ctx.world.name }),
        h('p', { class: 'lede', text: lede })));
    ctx.root.append(wrap);

    /* ---------- photos & placeholders ---------- */
    function placeholder(i) {
      const [a, b] = GRADS[i % GRADS.length];
      return h('span', { class: 'ml-ph', style: { '--g1': a, '--g2': b } },
        h('img', { src: `assets/emoji/${EMOJI[i % EMOJI.length]}.webp`, alt: '', class: 'ml-emo', draggable: 'false' }));
    }
    function photoEl(i, cls, lazy) {
      const box = h('span', { class: cls });
      const url = urls[i];
      if (url && !broken.has(i)) {
        const img = h('img', { src: url, alt: '', decoding: 'async', draggable: 'false', loading: lazy ? 'lazy' : null });
        img.addEventListener('load', () => box.classList.add('loaded'), { once: true });
        img.addEventListener('error', () => {
          broken.add(i);
          box.classList.add('ph');
          box.replaceChildren(placeholder(i));
          document.querySelectorAll(`[data-ml-photo="${i}"]`).forEach(o => { if (o !== box && !o.classList.contains('ph')) { o.classList.add('ph'); o.replaceChildren(placeholder(i)); } });
        }, { once: true });
        box.append(img);
      } else { box.classList.add('ph'); box.append(placeholder(i)); }
      box.dataset.mlPhoto = i;
      return box;
    }

    /* ---------- the lane ---------- */
    const maskId = 'mlmask' + Math.random().toString(36).slice(2, 8);
    const maskPath = svg('path', { class: 'ml-mask' });
    const mask = svg('mask', { id: maskId, maskUnits: 'userSpaceOnUse' }, maskPath);
    const road = svg('path', { class: 'ml-road' }), dots = svg('path', { class: 'ml-dots' });
    const glow = svg('path', { class: 'ml-glow', mask: `url(#${maskId})` }), lit = svg('path', { class: 'ml-lit', mask: `url(#${maskId})` });
    const pathSvg = svg('svg', { class: 'ml-path', 'aria-hidden': 'true', width: 1, height: 1 }, svg('defs', null, mask), road, dots, glow, lit);

    const lane = h('ol', { class: 'ml-lane' });
    const pols = [];
    items.forEach((it, i) => {
      const side = i % 2 ? 'r' : 'l';
      const rot = ROTS[i % ROTS.length];
      const pol = h('button', { type: 'button', class: 'ml-pol' + (seen.has(it.id) ? ' seen' : ''),
        style: { '--rot': rot + 'deg', '--tape': TAPES[i % TAPES.length] },
        'aria-label': `${it.caption || `Memory ${i + 1}`}${it.when ? `, ${it.when}` : ''}. Open it.`,
        onclick: () => openLB(i, pol) },
      h('span', { class: 'ml-tape', 'aria-hidden': 'true' }),
      photoEl(i, 'ml-photo', i > 1),
      h('span', { class: 'ml-cap' + (it.caption ? '' : ' empty') }, it.caption ? h('span', { class: 'ml-cap-t', text: it.caption }) : null));
      pols.push(pol);
      lane.append(h('li', { class: `ml-item ${side}` }, pol,
        h('div', { class: 'ml-mark', 'aria-hidden': 'true' },
          h('span', { class: 'ml-pin' }, h('i', { class: 'ml-dot' }), h('span', { class: 'ml-no', text: pad(i + 1) })),
          it.when ? h('span', { class: 'ml-when', text: it.when }) : null)));
    });
    if (!N) {
      lane.classList.add('empty');
      lane.append(h('li', { class: 'ml-item ml-blank' },
        h('div', { class: 'ml-pol ml-pol-blank', style: { '--rot': '-2deg', '--tape': 'var(--lilac)' } },
          h('span', { class: 'ml-tape', 'aria-hidden': 'true' }),
          h('span', { class: 'ml-photo ph' }, placeholder(1)),
          h('span', { class: 'ml-cap' }, h('span', { class: 'ml-cap-t', text: U.gentle ? 'The first page, waiting' : 'The first page, still blank' })))));
    }

    const endPt = h('i', { class: 'ml-endpt' });
    const sign = h('div', { class: 'ml-sign', 'aria-hidden': 'true' },
      endPt,
      h('span', { class: 'ml-post' }),
      h('span', { class: 'ml-boardw' }, h('span', { class: 'ml-board', text: 'To be continued…' })),
      h('img', { class: 'ml-sprout', src: 'assets/emoji/seedling.webp', alt: '', draggable: 'false' }));
    const endText = U.gentle ? 'Every time we tell these stories, the lane gets a little longer.'
      : U.group ? 'There’s plenty of room on this lane for whatever all of you do next.'
      : 'There’s plenty of room on this lane for whatever comes next.';
    const end = h('div', { class: 'ml-end' },
      sign,
      h('p', { class: 'sr', text: 'To be continued.' }),
      h('p', { class: 'ml-end-p', text: endText }),
      h('div', { class: 'ml-end-btns' },
        N > 1 ? h('button', { type: 'button', class: 'btn ghost small', onclick: () => { scrollTo({ top: 0, behavior: ctx.reduce ? 'auto' : 'smooth' }); pols[0]?.focus({ preventScroll: true }); } }, 'Back to the start') : null,
        h('a', { class: 'btn small', href: '#/map', text: 'Back to the map' })));
    const walk = h('div', { class: 'ml-walk' }, pathSvg, h('i', { class: 'ml-start', 'aria-hidden': 'true' }), lane, end);
    wrap.append(walk);

    /* ---------- the winding path ---------- */
    let total = 0, samples = [], lastW = 0, lastH = 0;
    function layout() {
      if (!ctx.alive()) return;
      const W = walk.clientWidth, H = walk.offsetHeight;
      if (!W) return;
      const wr = walk.getBoundingClientRect();
      const at = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2 - wr.left, y: r.top + r.height / 2 - wr.top }; };
      const pts = [{ x: W / 2, y: 6 }, ...[...lane.querySelectorAll('.ml-dot')].map(at)];
      if (!N) pts.push({ x: W / 2, y: lane.offsetTop + lane.offsetHeight * .55 });
      pts.push(at(endPt));
      let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], my = (a.y + b.y) / 2;
        d += ` C${a.x.toFixed(1)} ${my.toFixed(1)} ${b.x.toFixed(1)} ${my.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
      }
      pathSvg.setAttribute('width', W); pathSvg.setAttribute('height', H); pathSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      mask.setAttribute('x', 0); mask.setAttribute('y', 0); mask.setAttribute('width', W); mask.setAttribute('height', H);
      [road, dots, glow, lit, maskPath].forEach(p => p.setAttribute('d', d));
      try {
        total = dots.getTotalLength();
        samples = [];
        for (let k = 0; k <= 160; k++) { const L = total * k / 160; samples.push([L, dots.getPointAtLength(L).y]); }
      } catch { total = 0; samples = []; }
      lastW = W; lastH = H;
      progress();
    }
    function progress() {
      if (!total) return;
      const y = innerHeight * .6 - walk.getBoundingClientRect().top;
      let L = 0;
      for (const [l, sy] of samples) { if (sy <= y) L = l; else break; }
      maskPath.style.strokeDasharray = `${L.toFixed(1)} ${(total + 40).toFixed(1)}`;
    }
    let scrollQueued = false;
    ctx.on(window, 'scroll', () => { if (scrollQueued) return; scrollQueued = true; requestAnimationFrame(() => { scrollQueued = false; if (ctx.alive()) progress(); }); }, { passive: true });
    const ro = new ResizeObserver(() => { if (walk.clientWidth !== lastW || walk.offsetHeight !== lastH) layout(); });
    ro.observe(walk);
    ctx.cleanup(() => ro.disconnect());
    requestAnimationFrame(layout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (ctx.alive()) layout(); });

    /* ---------- polaroids settle in as you scroll ---------- */
    if (ctx.reduce || !('IntersectionObserver' in window)) lane.querySelectorAll('.ml-item').forEach(li => li.classList.add('in'));
    else {
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .12 });
      lane.querySelectorAll('.ml-item').forEach(li => io.observe(li));
      ctx.cleanup(() => io.disconnect());
    }

    /* ---------- the end of the lane ---------- */
    // Scrolling isn't a user gesture, and sound/vibration need one. If the end is
    // reached before the person has touched anything, celebrate on their first tap.
    function whenActive(fn) {
      const ua = navigator.userActivation;
      if (!ua || ua.hasBeenActive) { fn(); return; }
      const evs = ['pointerup', 'keydown', 'touchend'];
      const off = () => evs.forEach(t => removeEventListener(t, go, true));
      const go = () => { off(); if (ctx.alive()) fn(); };
      evs.forEach(t => addEventListener(t, go, true));
      ctx.cleanup(off);
    }
    let arrived = false;
    const arrive = () => {
      if (arrived || !ctx.alive()) return;
      arrived = true;
      sign.classList.add('arrived');
      whenActive(() => {
        if (!ctx.stamp()) return;
        audio.sfx('sparkle');
        const r = endPt.getBoundingClientRect();
        if (r.bottom > 0 && r.top < innerHeight) ctx.timeout(() => fx.burst(r.left + r.width / 2, r.top + r.height / 2, U.gentle ? 18 : 30, themeCols), 120);
      });
    };
    if ('IntersectionObserver' in window) {
      const eio = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { arrive(); eio.disconnect(); } }, { threshold: .6 });
      eio.observe(sign);
      ctx.cleanup(() => eio.disconnect());
    }

    /* ---------- first look at a memory ---------- */
    function markSeen(i, at) {
      const it = items[i];
      if (seen.has(it.id)) return;
      seen.add(it.id);
      store.set('memories.seen', [...seen]);
      store.stat('memoriesOpened');
      pols[i]?.classList.add('seen');
      ctx.timeout(() => ctx.award(5, at), ctx.reduce ? 0 : 420);
    }

    /* ---------- the lightbox ---------- */
    let lb = null;
    function openLB(i, srcEl) {
      if (lb) return;
      let cur = i, busy = false, rot = 0;
      const counter = h('span', { class: 'ml-lb-n' });
      const closeBtn = h('button', { type: 'button', class: 'icon-btn ml-lb-x', 'aria-label': 'Close' }, lu('x'));
      const prevBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Previous memory' }, lu('chevron-left'));
      const nextBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Next memory' }, lu('chevron-right'));
      const dotEls = items.map(() => h('i'));
      const fig = h('figure', { class: 'ml-lb-fig' });
      const stageEl = h('div', { class: 'ml-lb-stage' }, fig);
      const live = h('p', { class: 'sr', 'aria-live': 'polite' });
      const el = h('div', { class: 'ml-lb' + (U.gentle ? ' gentle' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': ctx.world.name },
        h('div', { class: 'ml-lb-top' }, counter, closeBtn),
        stageEl,
        N > 1 ? h('div', { class: 'ml-lb-nav' }, prevBtn, N <= 16 ? h('div', { class: 'ml-lb-dots', 'aria-hidden': 'true' }, dotEls) : h('span'), nextBtn) : h('div', { class: 'ml-lb-nav' }),
        live);
      lb = el;

      function render() {
        const it = items[cur];
        rot = ((cur * 37) % 5 - 2) * .6;
        const cap = it.caption;
        fig.replaceChildren(
          photoEl(cur, 'ml-lb-photo', false),
          h('figcaption', { class: 'ml-lb-cap' },
            cap ? h('span', { class: 'ml-lb-t', style: { fontSize: cap.length > 110 ? '22px' : cap.length > 60 ? '26px' : null }, text: cap }) : null,
            it.when ? h('span', { class: 'ml-lb-when', text: it.when }) : null));
        fig.style.transform = `rotate(${rot}deg)`;
        counter.textContent = `${pad(cur + 1)} / ${pad(N)}`;
        dotEls.forEach((d, k) => d.classList.toggle('on', k === cur));
        prevBtn.disabled = cur === 0; nextBtn.disabled = cur === N - 1;
        live.textContent = `${cap || `Memory ${cur + 1}`}${it.when ? ', ' + it.when : ''}. ${cur + 1} of ${N}.`;
        markSeen(cur, fig);
      }
      async function go(d, fromDx = 0) {
        if (busy) return;
        const n = cur + d;
        if (n < 0 || n >= N) { settle(); return; }
        busy = true;
        audio.sfx('paper'); ctx.haptic('select');
        try {
          if (!ctx.reduce) await fig.animate([{ transform: `translateX(${fromDx}px) rotate(${rot + fromDx / 40}deg)`, opacity: 1 }, { transform: `translateX(${-d * Math.min(innerWidth * .7, 420)}px) rotate(${-d * 9}deg)`, opacity: 0 }], { duration: 210, easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'forwards' }).finished;
        } catch {}
        if (!lb || lb !== el) return;
        fig.getAnimations().forEach(a => a.cancel());
        cur = n; render();
        try {
          if (!ctx.reduce) await fig.animate([{ transform: `translateX(${d * Math.min(innerWidth * .55, 340)}px) rotate(${d * 7}deg)`, opacity: 0 }, { transform: `rotate(${rot}deg)`, opacity: 1 }], { duration: 340, easing: 'cubic-bezier(.2,.9,.3,1.08)' }).finished;
        } catch {}
        busy = false;
      }
      function settle() {
        if (ctx.reduce) { fig.style.transform = `rotate(${rot}deg)`; return; }
        fig.animate([{ transform: fig.style.transform }, { transform: `rotate(${rot}deg)` }], { duration: 320, easing: 'cubic-bezier(.3,1.5,.5,1)' });
        fig.style.transform = `rotate(${rot}deg)`;
      }
      function flipFrom(target, reverse) {
        if (ctx.reduce || !target) return null;
        const a = target.getBoundingClientRect(), b = fig.getBoundingClientRect();
        if (!a.width || !b.width) return null;
        const s = a.width / b.width;
        const dx = a.left + a.width / 2 - (b.left + b.width / 2), dy = a.top + a.height / 2 - (b.top + b.height / 2);
        const tr = parseFloat(target.style.getPropertyValue('--rot')) || 0;
        const frames = [{ transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(${tr}deg)`, opacity: .4 }, { transform: `rotate(${rot}deg)`, opacity: 1 }];
        return fig.animate(reverse ? frames.reverse() : frames, { duration: reverse ? 340 : 480, easing: reverse ? 'cubic-bezier(.5,0,.7,.4)' : 'cubic-bezier(.2,.9,.25,1)', fill: reverse ? 'forwards' : 'none' });
      }
      function close() {
        if (lb !== el) return;
        lb = null;
        document.removeEventListener('keydown', onKey, true);
        document.body.classList.remove('lock-scroll');
        const target = pols[cur];
        if (target) {
          const r0 = target.getBoundingClientRect();
          if (r0.top < 70 || r0.bottom > innerHeight - 10) {
            const html = document.documentElement;
            html.classList.add('no-smooth');
            scrollBy(0, r0.top + r0.height / 2 - innerHeight / 2);
            requestAnimationFrame(() => html.classList.remove('no-smooth'));
          }
        }
        el.classList.remove('in');
        flipFrom(target, true);
        audio.sfx('paper');
        setTimeout(() => el.remove(), ctx.reduce ? 0 : 360);
        target?.focus({ preventScroll: true });
      }

      /* swipe */
      let pid = null, sx = 0, sy = 0, dx = 0, moved = false;
      stageEl.addEventListener('pointerdown', e => {
        if (busy || (e.pointerType === 'mouse' && e.button !== 0)) return;
        pid = e.pointerId; sx = e.clientX; sy = e.clientY; dx = 0; moved = false;
      });
      stageEl.addEventListener('pointermove', e => {
        if (e.pointerId !== pid) return;
        dx = e.clientX - sx;
        if (!moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - sy)) { moved = true; try { stageEl.setPointerCapture(pid); } catch {} }
        if (!moved) return;
        const edge = (cur === 0 && dx > 0) || (cur === N - 1 && dx < 0) || N < 2;
        const x = edge ? dx * .28 : dx;
        fig.style.transform = `translateX(${x}px) rotate(${rot + x / 40}deg)`;
      });
      const up = e => {
        if (e.pointerId !== pid) return;
        pid = null;
        if (!moved) { if (e.type === 'pointerup' && e.target === stageEl) close(); return; }
        const edge = (cur === 0 && dx > 0) || (cur === N - 1 && dx < 0) || N < 2;
        if (!edge && e.type === 'pointerup' && Math.abs(dx) > 64) go(dx < 0 ? 1 : -1, dx);
        else settle();
      };
      stageEl.addEventListener('pointerup', up);
      stageEl.addEventListener('pointercancel', up);

      closeBtn.onclick = close;
      prevBtn.onclick = () => go(-1);
      nextBtn.onclick = () => go(1);
      const onKey = e => {
        if (lb !== el) return;
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
        else if (e.key === 'Tab') {
          const f = [closeBtn, prevBtn, nextBtn].filter(b => b.isConnected && !b.disabled);
          const k = f.indexOf(document.activeElement);
          e.preventDefault();
          f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length]?.focus();
        }
      };
      document.addEventListener('keydown', onKey, true);
      el._teardown = () => { document.removeEventListener('keydown', onKey, true); el.remove(); document.body.classList.remove('lock-scroll'); };

      render();
      document.body.append(el);
      document.body.classList.add('lock-scroll');
      audio.sfx('open'); ctx.haptic('light');
      requestAnimationFrame(() => { if (lb === el) el.classList.add('in'); });
      flipFrom(srcEl, false);
      setTimeout(() => { if (lb === el) closeBtn.focus({ preventScroll: true }); }, 60);
    }
    ctx.cleanup(() => { if (lb) { const el = lb; lb = null; el._teardown(); } });

    /* ---------- a tiny hidden friend ---------- */
    if (N) {
      const k = Math.min(1, N - 1);
      const li = lane.children[k];
      ctx.peek(li, 'memories-hide', k % 2 ? { left: 'calc(40% - 14px)', bottom: '22%', rotate: -16, size: 26 } : { left: 'calc(60% - 14px)', bottom: '22%', rotate: 16, size: 26 });
    } else ctx.peek(sign, 'memories-hide', { right: '18px', bottom: '6px', rotate: 12, size: 26 });
  },
};
