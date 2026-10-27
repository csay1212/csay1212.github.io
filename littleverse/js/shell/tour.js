// The tour: four cards shown the first time Littleverse opens (and again from You →
// How Littleverse works). Swipe or tap Next; Skip is always in reach. Each card's picture
// is made from the app's own pieces: the example posters, the characters, a letter, a gift.
import { h, ic, haptic } from './kit.js';
import { db } from '../lib/db.js';
import { reduceMotion } from '../core/dom.js';
import { catSVG } from '../core/cat.js';
import { poster } from './poster.js';

let current = null;

// Closes the tour as if Skip was tapped (Android's back button). True if it was open.
export function dismiss() {
  if (!current) return false;
  current('skip');
  return true;
}

// openTour() → Promise<'start' | 'look' | 'skip'>, once it's closed.
export async function openTour() {
  if (current) return 'skip';
  const examples = await exampleUniverses();
  return new Promise(resolve => {
    const ret = document.activeElement;
    const slides = [
      slide('Welcome to Littleverse', 'Make someone a universe',
        'A short film about them, games to play, letters to open later and a sky full of stars. Made by you, for one person.',
        postersArt(examples)),
      slide('Making one', 'Six quick questions',
        'Who it’s for, the occasion, their name and the date, two little characters, the colors and the worlds. Littleverse writes a first draft of every word to fit.',
        stepsArt(examples[0])),
      slide('Then', 'Make every word yours',
        'Change anything: the film, the letters, the coupons, photos, songs and colors. Everything saves as you go.',
        letterArt(examples[0])),
      slide('Sharing', 'Send it as a gift',
        'It goes as one gift file through any app, and they open it in Littleverse. Or just hand them your phone. Gifts people send you land in your Inbox.',
        giftArt(examples[0])),
    ];
    const track = h('div', { class: 'tr-track' }, ...slides.map(s => s.el));
    const dots = h('div', { class: 'tr-dots', 'aria-hidden': 'true' }, ...slides.map(() => h('i')));
    const next = h('button', { class: 'b primary lg block tr-next', type: 'button' }, h('span', { text: 'Next' }));
    const alt = h('button', { class: 'link tr-alt', type: 'button', text: 'Look around first', tabindex: '-1' });
    const skip = h('button', { class: 'tr-skip', type: 'button', text: 'Skip' });
    const el = h('div', { class: 'lv-tour', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Welcome to Littleverse' },
      h('div', { class: 'tr-top' }, h('span', { class: 'tr-brand' }, h('img', { src: 'assets/icon.svg', alt: '' }), 'Littleverse'), skip),
      track,
      h('div', { class: 'tr-foot' }, dots, next, alt));

    let at = -1;
    const last = slides.length - 1;
    const show = i => {
      if (i === at) return;
      at = i;
      slides.forEach((s, k) => {
        s.el.classList.toggle('on', k === i);
        s.el.inert = k !== i;
        if (k === i && !s.el.classList.contains('seen')) { s.el.classList.add('seen'); s.seen?.(); }
      });
      [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
      next.firstChild.textContent = i === last ? 'Start a universe' : 'Next';
      alt.classList.toggle('on', i === last);
      alt.tabIndex = i === last ? 0 : -1;
      skip.classList.toggle('gone', i === last);
    };
    const go = i => {
      i = Math.max(0, Math.min(last, i));
      track.scrollTo({ left: i * track.clientWidth, behavior: reduceMotion() ? 'auto' : 'smooth' });
    };
    // Where the swipe settles is the card that counts.
    let raf = 0;
    track.addEventListener('scroll', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        if (i !== at) { haptic('select'); show(i); }
      });
    }, { passive: true });
    const onResize = () => { track.scrollLeft = at * track.clientWidth; };
    addEventListener('resize', onResize);
    const onKey = e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(at + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(at - 1); }
      else if (e.key === 'Escape') { e.preventDefault(); close('skip'); }
    };
    addEventListener('keydown', onKey);

    const close = how => {
      if (current !== close) return;
      current = null;
      removeEventListener('resize', onResize);
      removeEventListener('keydown', onKey);
      slides.forEach(s => s.stop?.());
      haptic(how === 'start' ? 'medium' : 'light');
      el.classList.add('closing');
      el.classList.remove('open');
      document.body.classList.remove('lock-scroll');
      setTimeout(() => el.remove(), reduceMotion() ? 0 : 260);
      if (how === 'start') location.hash = '#/new';
      else ret?.focus?.({ preventScroll: true });
      resolve(how);
    };
    current = close;
    next.addEventListener('click', () => { if (at === last) close('start'); else { haptic('light'); go(at + 1); } });
    alt.addEventListener('click', () => close('look'));
    skip.addEventListener('click', () => close('skip'));

    document.body.append(el);
    document.body.classList.add('lock-scroll');
    show(0);
    requestAnimationFrame(() => { el.classList.add('open'); next.focus({ preventScroll: true }); });
  });
}

/* ---------- the cards ---------- */
function slide(kicker, title, text, art) {
  const el = h('section', { class: 'tr-slide', role: 'group', 'aria-roledescription': 'card', 'aria-label': title },
    h('div', { class: 'tr-art' }, art.el),
    h('div', { class: 'tr-copy' }, h('p', { class: 'tr-k', text: kicker }), h('h2', { text: title }), h('p', { text })));
  return { el, seen: art.seen, stop: art.stop };
}

// The examples on this phone, or fresh copies if they've been deleted.
async function exampleUniverses() {
  let ex = (await db.all()).filter(u => u.demo && u.kind !== 'received');
  if (ex.length < 3) ex = (await import('../lib/demo.js')).demoUniverses().filter(u => u.kind !== 'received');
  const order = ['demo-mira'];
  return ex.sort((a, b) => (order.includes(b.id) ? 1 : 0) - (order.includes(a.id) ? 1 : 0)).slice(0, 3);
}

// Three examples as posters, fanned out like a hand of cards.
function postersArt(us) {
  const w = Math.round(Math.max(118, Math.min(172, innerWidth * .4, (innerHeight - 430) * .62)));
  const order = [us[1], us[0], us[2]].filter(Boolean);
  return { el: h('div', { class: 'tr-posters' }, ...order.map(u => poster(u, { width: w, photo: false }))) };
}

// The six questions, ticked off one by one, with the star of the first example looking on.
function stepsArt(u) {
  const steps = ['Who it’s for', 'The occasion', 'Their name and the date', 'Two characters', 'The colors', 'Which worlds'];
  const card = h('ol', { class: 'tr-steps' }, ...steps.map((s, i) => h('li', { style: { '--i': i } }, h('b', {}, h('span', { text: String(i + 1) }), ic('check')), h('span', { text: s }))));
  const pal = u ? h('div', { class: 'tr-pal', html: catSVG({ ...(u.them.avatar || {}), name: u.them.name }, { prop: true }) }) : null;
  return { el: h('div', { class: 'tr-stepsw' }, card, pal) };
}

// A letter writing itself, then a quiet "Saved".
function letterArt(u) {
  const name = u?.them?.name || 'Mira';
  const text = `${name},\nHappy birthday. I made you a small universe: a film, some games, and a sky full of stars.`;
  const out = h('span', { class: 'tr-typed' });
  const saved = h('span', { class: 'tr-saved' }, ic('check'), 'Saved');
  const paper = h('div', { class: 'tr-letter' }, out, h('span', { class: 'tr-caret', 'aria-hidden': 'true' }));
  const parts = ['Film', 'Letters', 'Coupons', 'Songs', 'Colors'];
  const chips = h('div', { class: 'tr-chips' }, ...parts.map((p, i) => h('span', { style: { '--i': i }, text: p })));
  let timer = 0;
  const seen = () => {
    if (reduceMotion()) { out.textContent = text; saved.classList.add('on'); return; }
    let n = 0;
    const tick = () => {
      n += text[n] === ' ' ? 2 : 1;
      out.textContent = text.slice(0, n);
      if (n < text.length) timer = setTimeout(tick, text[n - 1] === ',' || text[n - 1] === '.' ? 180 : 32);
      else timer = setTimeout(() => saved.classList.add('on'), 250);
    };
    timer = setTimeout(tick, 350);
  };
  return { el: h('div', { class: 'tr-letterw' }, saved, paper, chips), seen, stop: () => clearTimeout(timer) };
}

// The gift file leaving one phone, and arriving in someone's Inbox.
function giftArt(u) {
  const name = u?.them?.name || 'Mira', from = u?.me?.name || 'Theo';
  const file = h('div', { class: 'tr-file' },
    h('span', { class: 'tr-file-ico' }, ic('gift')),
    h('span', { class: 'tr-file-t' }, h('b', { text: `${name}.littleverse` }), h('small', { text: 'The film, games, photos and songs' })),
    h('span', { class: 'tr-send' }, ic('send')));
  const inbox = h('div', { class: 'tr-inbox' },
    u ? h('span', { class: 'tr-inbox-p' }, poster(u, { width: 46, photo: false })) : null,
    h('span', { class: 'tr-file-t' }, h('small', { class: 'tr-inbox-k', text: 'Inbox' }), h('b', { text: `A gift from ${from}` })),
    h('span', { class: 'pill rose tr-new', text: 'New' }));
  return { el: h('div', { class: 'tr-gift' }, file, h('span', { class: 'tr-path', 'aria-hidden': 'true' }), inbox) };
}
