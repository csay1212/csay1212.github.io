// Home: your universes as a shelf of posters, what's coming up, and examples.
// The posters carry all the color; everything around them stays quiet.
import { h, ic, screen, section, group, row, haptic } from './kit.js';
import { db } from '../lib/db.js';
import { occById, themeOf } from '../lib/catalog.js';
import { info } from '../lib/dates.js';
import { poster, metaLine, whenLine } from './poster.js';

export async function render(ctx) {
  const all = await db.all();
  const mine = all.filter(u => u.kind !== 'received' && !u.demo).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const examples = all.filter(u => u.demo && u.kind !== 'received');

  const top = h('div', { class: 'topbar' },
    h('div', { class: 'wordmark' }, h('img', { src: 'assets/icon.svg', alt: '' }), 'Littleverse'),
    h('span', { class: 'grow' }),
    mine.length ? h('a', { class: 'hm-new', href: '#/new', onclick: () => haptic('light') }, ic('plus'), 'New') : null);
  const blocks = [top];

  if (mine.length) {
    blocks.push(h('h1', { class: 'large-title', text: 'Your universes' }));
    const shelf = h('div', { class: 'shelf hm-shelf-mine' });
    for (const u of mine) shelf.append(shelfItem(u, { width: 200, cap: whenLine(u) }));
    shelf.append(newTile());
    blocks.push(shelf);
  } else {
    blocks.push(h('div', { class: 'hm-intro' },
      h('h1', { class: 'large-title', text: 'Make someone a universe' }),
      h('p', { text: 'A short film about them, games to play, letters to open later and a sky full of stars. You make it; they open it on their phone.' }),
      h('a', { class: 'b primary lg block', href: '#/new', onclick: () => haptic('medium') }, 'Start a universe')));
  }

  // coming up: dates that matter, soonest first
  const upcoming = all.filter(u => !u.demo || u.kind === 'received').map(u => ({ u, d: info(u.date, u.yearKnown !== false), occ: occById(u.occ) }))
    .map(x => ({ ...x, n: x.occ.future && x.d.daysSince < 0 ? -x.d.daysSince : x.d.daysUntil }))
    .filter(x => x.occ.yearly || x.occ.future).sort((a, b) => a.n - b.n).slice(0, 3);
  if (upcoming.length) {
    blocks.push(section('Coming up'));
    blocks.push(group(...upcoming.map(({ u, d, n }) => {
      const r = row({
        href: `#/u/${u.id}`,
        title: upTitle(u),
        sub: u.kind === 'received' ? `From ${u.from || u.me.name}` : d.long,
        right: h('span', { class: 'days' + (n === 0 ? ' today' : '') }, h('b', { text: n === 0 ? 'Today' : String(n) }), n === 0 ? null : h('small', { text: n === 1 ? 'day' : 'days' })),
      });
      r.classList.add('up-row');
      r.prepend(dateChip(u, d));
      return r;
    })));
  }

  if (examples.length) {
    blocks.push(section('Examples'));
    blocks.push(h('p', { class: 'sec-note', text: 'Made-up people, real features. Open one to see what you can make.' }));
    const shelf = h('div', { class: 'shelf', style: { '--pw': '150px' } });
    for (const u of examples) shelf.append(shelfItem(u, { width: 150, cap: metaLine(u) }));
    blocks.push(shelf);
  }

  return { el: screen({ tabs: true, anim: ctx.anim }, ...blocks), title: 'Home' };
}

function upTitle(u) {
  const n = u.them.name;
  const pos = /s$/i.test(n) ? `${n}’` : `${n}’s`;
  switch (u.occ) {
    case 'birthday': case 'belated': return `${pos} birthday`;
    case 'anniversary': return `Anniversary with ${n}`;
    case 'reunion': return `${n}, together again`;
    case 'remembrance': return `Remembering ${n}`;
    case 'newyear': return `New year with ${n}`;
    default: return `${occById(u.occ).label} for ${n}`;
  }
}

// a small calendar chip in the universe's own night color
function dateChip(u, d) {
  const t = themeOf(u);
  return h('span', { class: 'up-ico', style: { '--u-bg': t.dusk }, 'aria-hidden': 'true' }, h('span', {}, String(d.d || ''), h('small', { text: d.mon })));
}

function shelfItem(u, { width = 200, cap = '' } = {}) {
  return h('a', { class: 'shelf-item', href: `#/u/${u.id}`, style: { '--pw': width + 'px' }, onclick: () => haptic('light') },
    poster(u, { width }),
    h('div', { class: 'shelf-cap' }, h('b', {}, h('span', { class: 'nm', text: u.them.name })), cap ? h('span', { text: cap }) : null));
}
function newTile() {
  return h('a', { class: 'shelf-item', href: '#/new', style: { '--pw': '150px' }, onclick: () => haptic('light'), 'aria-label': 'New universe' },
    h('div', { class: 'hm-tile' }, h('span', { class: 'icon-b' }, ic('plus')), 'New universe'));
}
