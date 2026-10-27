// Open When…: a stack of letters for specific moments. Some are sealed until a
// date or until enough passport stamps are collected. In memorial universes the
// same world is "Letters to {name}", and the envelopes read "For when…".
import { h, icon } from '../core/dom.js';
import { FINALE_NEEDS } from '../worlds.js';

// envelope ink per letter color (theme roles, so every palette works)
const INKS = { gold: 'var(--gold)', rose: 'var(--rose)', lilac: 'var(--lilac)', mint: 'var(--hud)', hud: 'var(--hud)', peach: 'var(--peach)', sky: 'var(--sky)' };
// a postage stamp for each kind of letter (Fluent emoji names)
const POSTAGE = {
  laugh: 'partying_face', sleep: 'crescent_moon', rough: 'rainbow', proud: 'trophy', miss: 'speech_balloon', whenever: 'sparkles',
  bored: 'kite', quiet: 'speech_balloon', pep: 'people_hugging', together: 'confetti_ball', home: 'house_with_garden',
  tz: 'night_with_stars', beautiful: 'camera_with_flash', good: 'sun_with_face', birthday: 'birthday_cake', recipe: 'herb',
  advice: 'light_bulb', tooth: 'magic_wand', brave: 'crown', sad: 'yellow_heart', land: 'seedling', matter: 'glowing_star',
  term: 'graduation_cap', monday: 'hot_beverage', meeting: 'memo', promo: 'rocket', mail: 'envelope_with_arrow',
  treat: 'wrapped_gift', late: 'house_with_garden', doubt: 'shooting_star', why: 'light_bulb',
};
const POSTAGE_GENTLE = { miss: 'purple_heart', quiet: 'house_with_garden', good: 'sun_with_face' };
const NEXT_POSTAGE = { birthday: 'birthday_cake', belated: 'birthday_cake', anniversary: 'ring', reunion: 'airplane_departure', remembrance: 'candle' };

const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

export default {
  css: 'mail',
  mount(ctx) {
    const { store, audio, fx, U } = ctx;
    const copy = U.copy.letters || {};
    const letters = (copy.items || []).filter(l => l && l.id && l.body != null);
    const opened = () => store.get('letters', {}) || {};
    const T = U.theme || {};
    const festive = [T.gold, T.rose, T.hud, T.lilac, T.paper].filter(Boolean);

    /* ---------- wording ---------- */
    const stampsNeeded = lk => Math.max(1, Math.min(Number(lk.stamps) || FINALE_NEEDS, FINALE_NEEDS));
    // "Open when you need a laugh" / "For when we miss you most" / "Open whenever"
    function label(l) {
      let w = U.fill(String(l.when || '').trim()).replace(/^(open|for)\s+when\s+/i, '').replace(/^when\s+(?!ever)/i, '');
      // a stamp-locked letter whose label names the old stamp count follows the real one
      if (l.lock && l.lock.stamps) w = w.replace(new RegExp(`\\b${Number(l.lock.stamps)}(\\s+(passport\\s+)?stamps?)`, 'i'), `${stampsNeeded(l.lock)}$1`);
      if (!w) w = 'whenever';
      const pre = /^whenever\b/i.test(w) ? (U.gentle ? 'For' : 'Open') : (U.gentle ? 'For when' : 'Open when');
      return { pre, w, full: `${pre} ${w}` };
    }
    function postage(l) {
      if (l.lock && l.lock.stamps) return U.gentle ? 'candle' : 'fireworks';
      if (l.id === 'nextdate') return NEXT_POSTAGE[U.occ] || 'spiral_calendar';
      return (U.gentle && POSTAGE_GENTLE[l.id]) || POSTAGE[l.id] || 'love_letter';
    }
    const sign = U.gentle ? 'With love, always' : `— ${U.me.name}`;

    function lockState(l) {
      const lk = l.lock; if (!lk) return null;
      if (lk.date) {
        const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(lk.date)); if (!m) return null;
        const open = new Date(+m[1], +m[2] - 1, +m[3]);
        const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const days = Math.round((open - today) / 864e5);
        if (days <= 0) return null;
        const long = open.toLocaleDateString('en-US', { month: 'long', day: 'numeric', ...(open.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) });
        const short = open.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const sub = days === 1 ? 'tomorrow' : `${plural(days, 'day')} to go`;
        return { text: `Sealed until ${long}`, line: `Opens ${short} · ${sub}`, sub, pct: Math.max(.04, 1 - days / 365) };
      }
      if (lk.stamps) {
        const need = stampsNeeded(lk), n = store.stampCount();
        if (n >= need) return null;
        return { text: `Opens at ${plural(need, 'passport stamp')}`, line: `Opens at ${plural(need, 'stamp')} · ${n} so far`, sub: `You have ${n}`, pct: Math.max(.04, n / need) };
      }
      return null;
    }

    // the stamp goal is "open 5 letters", unless this stack can't offer five yet
    const openable = letters.filter(l => !lockState(l)).length;
    const need = Math.max(1, Math.min(5, letters.length, Math.max(openable, Object.keys(opened()).length)));
    if (need !== 5 && ctx.world && letters.length) { ctx.world.goal = `Open ${plural(need, 'letter')}`; ctx.frame?.paint(); }

    /* ---------- the stack ---------- */
    const count = h('span');
    const rack = h('div', { class: 'lt-rack' });
    const wrap = h('div', { class: 'lt' + (U.gentle ? ' gentle' : '') },
      h('div', { class: 'wintro' },
        h('p', { class: 'kicker rose', text: U.gentle ? 'The Post Office · Letters' : 'The Post Office · Open When…' }),
        h('h2', { text: U.fill(copy.title || (U.gentle ? `Letters to ${U.them.name}` : 'Letters for later')) }),
        copy.lede ? h('p', { class: 'lede', text: U.fill(copy.lede) }) : null,
        letters.length ? h('p', { class: 'kicker muted lt-count' }, count) : null),
      rack);
    ctx.root.append(wrap);

    if (!letters.length) {
      rack.classList.add('is-empty');
      rack.append(h('div', { class: 'lt-empty' },
        h('img', { src: 'assets/emoji/inbox_tray.webp', alt: '', width: 88, height: 88 }),
        h('h3', { text: 'The mailbox is empty, for now' }),
        h('p', { text: U.gentle ? 'No letters have been written here yet. When they are, they’ll wait in this spot.' : `${U.me.name} hasn’t written any letters yet. When they do, they’ll be waiting right here.` }),
        h('a', { class: 'btn ghost', href: '#/map', text: 'Back to the map' })));
      ctx.peek(rack, 'mail-hide', { right: '8px', top: '-10px', rotate: 14, size: 28 });
      return;
    }

    const fmtDay = ts => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    function paint() {
      const op = opened();
      const nOpen = letters.filter(l => op[l.id]).length;
      const nSealed = letters.filter(l => !op[l.id] && lockState(l)).length;
      count.textContent = `${nOpen} of ${letters.length} opened${nSealed ? ` · ${nSealed} sealed` : ''}`;
      rack.replaceChildren();
      letters.forEach((l, i) => {
        const ink = INKS[l.color] || INKS.gold;
        const lock = lockState(l);
        const isOpen = !!op[l.id];
        const lb = label(l);
        const env = h('button', {
          type: 'button', class: `env${lock ? ' locked' : ''}${isOpen ? ' opened' : ''}`,
          style: { '--ec': ink, '--tilt': `${(((i * 37) % 5) - 2) * .7}deg`, '--i': i },
          'aria-label': `${lb.full}${lock ? '. ' + lock.text : isOpen ? '. Already opened' : ''}`,
          onclick: () => {
            if (lock) {
              audio.sfx('error'); ctx.haptic('light');
              env.classList.remove('nope'); void env.offsetWidth; env.classList.add('nope');
              ctx.toast(`${lock.text}. ${lock.sub[0].toUpperCase() + lock.sub.slice(1)}.`); return;
            }
            ctx.haptic('light'); read(l, env);
          },
        },
          h('span', { class: 'env-flap' }),
          h('span', { class: 'env-post' }, h('span', {}, h('img', { src: `assets/emoji/${postage(l)}.webp`, alt: '', width: 26, height: 26, decoding: 'async' }))),
          isOpen ? h('span', { class: 'env-mark', 'aria-hidden': 'true' }, h('b', { text: 'Opened' }), typeof op[l.id] === 'number' ? h('small', { text: fmtDay(op[l.id]) }) : null) : null,
          h('span', { class: 'env-seal' }, lock ? icon('lock') : isOpen ? icon('check') : h('span', { text: '♥' })),
          h('span', { class: 'env-to' },
            h('small', { text: lb.pre }),
            h('b', { text: lb.w }),
            lock ? h('span', { class: 'env-note' }, icon('lock'), h('span', { text: lock.line }))
              : isOpen ? h('span', { class: 'env-note', text: 'Tap to read it again' }) : null),
          lock ? h('span', { class: 'env-bar' }, h('i', { style: { width: Math.round(lock.pct * 100) + '%' } })) : null);
        rack.append(env);
      });
      ctx.peek(rack, 'mail-hide', { right: '-6px', top: '-12px', rotate: 16, size: 28 });
    }
    paint();

    /* ---------- reading view ---------- */
    let reader = null;
    function read(l, fromEl) {
      const ink = INKS[l.color] || INKS.gold;
      const first = !opened()[l.id];
      const lb = label(l);
      audio.sfx('open');
      const close = () => {
        if (!reader) return;
        const r = reader; reader = null;
        r.classList.add('out'); audio.sfx('paper');
        setTimeout(() => r.remove(), 320);
        document.body.classList.remove('lock-scroll');
        stopBreath();
        paint();
        rack.children[letters.indexOf(l)]?.focus?.({ preventScroll: true });
      };
      const paras = bodyNodes(U.fill(String(l.body || '')));
      if (paras[0] && paras[0].textContent.length <= 70) paras[0].classList.add('lt-lead');
      const sheet = h('article', { class: 'lt-sheet', style: { '--ec': ink } },
        h('p', { class: 'lt-when', text: lb.full }),
        ...paras,
        h('p', { class: 'lt-sign', text: sign }));
      if (l.breathe) {
        const k = paras.findIndex(p => /\bbelow\b/i.test(p.textContent));
        const after = paras[k >= 0 ? k : Math.min(1, paras.length - 1)];
        if (after) after.after(breathWidget()); else sheet.append(breathWidget());
      }
      const closeBtn = h('button', { type: 'button', class: 'icon-btn lt-x', 'aria-label': 'Fold the letter back up', onclick: close }, icon('close'));
      reader = h('div', { class: 'lt-read' + (U.gentle ? ' gentle' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': `Letter: ${lb.full}` },
        h('div', { class: 'lt-env-big', style: { '--ec': ink } }, h('span', { class: 'env-flap' }), h('span', { class: 'lt-env-paper' }), h('span', { class: 'env-seal' }, h('span', { text: '♥' }))),
        h('div', { class: 'lt-scroll' }, sheet,
          h('div', { class: 'row center lt-foot' }, h('button', { type: 'button', class: 'btn ghost', onclick: close }, 'Fold it back up'))),
        closeBtn);
      reader.addEventListener('click', e => { if (e.target === reader || e.target.classList.contains('lt-scroll')) close(); });
      reader.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
      document.body.append(reader); document.body.classList.add('lock-scroll');
      requestAnimationFrame(() => reader && reader.classList.add('in'));
      ctx.timeout(() => { if (reader) { reader.classList.add('opening'); audio.sfx('paper'); } }, ctx.reduce ? 0 : 450);
      ctx.timeout(() => { if (reader) { reader.classList.add('reading'); closeBtn.focus({ preventScroll: true }); } }, ctx.reduce ? 10 : 1100);
      if (first) {
        store.set('letters.' + l.id, Date.now());
        store.stat('lettersRead');
        ctx.timeout(() => {
          ctx.award(5, closeBtn);
          const n = letters.filter(x => opened()[x.id]).length;
          if (n >= need) ctx.stamp();
          if (l.lock && l.lock.stamps) {
            if (U.gentle) fx.burst(innerWidth / 2, innerHeight * .3, 28, [T.gold, T.paper, T.peach].filter(Boolean));
            else fx.confetti(200, { stars: true, colors: festive });
          }
        }, ctx.reduce ? 50 : 1300);
      }
    }
    ctx.cleanup(() => { if (reader) { reader.remove(); reader = null; document.body.classList.remove('lock-scroll'); } stopBreath(); });

    /* ---------- the "can't sleep" breathing star ---------- */
    let breathStop = null;
    function stopBreath() { if (breathStop) { breathStop(); breathStop = null; } }
    function breathWidget() {
      const star = h('div', { class: 'br-star', 'aria-hidden': 'true' }, h('span', { text: '✦' }));
      const label = h('p', { class: 'br-label', text: 'Tap to begin' });
      const round = h('p', { class: 'br-round', text: 'Four slow rounds' });
      const box = h('button', { type: 'button', class: 'br', 'aria-label': 'Start the breathing exercise' }, star, label, round);
      const PHASES = [['Breathe in', 4000, 'grow'], ['Hold', 4000, 'hold'], ['Breathe out', 6000, 'shrink']];
      box.onclick = () => {
        if (breathStop) return;
        let k = 0, n = 0, alive = true, t = null;
        box.classList.add('on');
        const step = () => {
          if (!alive) return;
          if (n >= 4) {
            label.textContent = `Goodnight, ${U.them.name}.`; round.textContent = '✦';
            star.className = 'br-star rest'; box.classList.remove('on'); breathStop = null; return;
          }
          const [txt, ms, cls] = PHASES[k];
          label.textContent = txt; round.textContent = `Round ${n + 1} of 4`;
          star.className = 'br-star ' + cls; star.style.setProperty('--ms', ms + 'ms');
          if (k === 0) audio.tone(64, undefined, 2.5, .025, 'sine');
          if (k === 2) audio.tone(57, undefined, 3, .02, 'sine');
          t = setTimeout(() => { k = (k + 1) % 3; if (k === 0) n++; step(); }, ms);
        };
        breathStop = () => { alive = false; clearTimeout(t); };
        step();
      };
      return box;
    }
  },
};

// "\n\n" = new paragraph, "\n" = line break
function bodyNodes(text) {
  return text.split(/\n{2,}/).filter(par => par.trim()).map(par => {
    const p = h('p');
    par.split('\n').forEach((line, i) => { if (i) p.append(h('br')); p.append(line); });
    return p;
  });
}
