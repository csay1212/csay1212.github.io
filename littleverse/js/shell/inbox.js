// Inbox: universes other people made for you. Gifts arrive as files
// (".littleverse"); opening one here keeps it on this phone.
import { h, ic, screen, navbar, groupHead, sheet, toast, pickFile, haptic, plural } from './kit.js';
import { db } from '../lib/db.js';
import { occById } from '../lib/catalog.js';
import { unpackGift } from '../lib/gift.js';
import { poster, whenLine } from './poster.js';

const fmtReceived = ts => {
  if (!ts) return 'Received';
  const d = new Date(ts), t = new Date();
  const days = Math.round((new Date(t.getFullYear(), t.getMonth(), t.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
  if (days === 0) return 'Received today';
  if (days === 1) return 'Received yesterday';
  return 'Received ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(d.getFullYear() !== t.getFullYear() ? { year: 'numeric' } : {}) });
};

export async function render(ctx) {
  const gifts = (await db.all()).filter(u => u.kind === 'received').sort((a, b) => (b.receivedAt || 0) - (a.receivedAt || 0));
  const fresh = gifts.filter(u => !u.opened).length;

  const openBtn = (cls = 'b primary block') => {
    const b = h('button', { class: cls + ' ib-open-btn', type: 'button', onclick: () => openGift(ctx, b) }, h('span', { text: 'Open a gift file' }));
    return b;
  };

  const blocks = [navbar({ title: 'Inbox' }), h('h1', { class: 'large-title', text: 'Inbox' })];

  if (gifts.length) {
    blocks.push(h('p', { class: 'subtitle ib-sub', text: 'Universes people made for you. They stay on this phone, ready whenever you are.' }));
    blocks.push(h('div', { class: 'ib-acts' }, openBtn('b quiet block')));
    blocks.push(groupHead(fresh ? `${plural(gifts.length, 'gift')}, ${fresh} new` : plural(gifts.length, 'gift')));
    const list = h('div', { class: 'ib-list' });
    for (const u of gifts) list.append(giftCard(u));
    blocks.push(list);
    blocks.push(h('p', { class: 'group-f ib-foot', text: 'To remove a gift, open it and scroll to the bottom.' }));
  } else {
    blocks.push(h('p', { class: 'subtitle ib-sub', text: 'When someone makes you a universe, they send you a gift file. Open it here and it’s yours to keep.' }));
    blocks.push(h('div', { class: 'ib-acts stack' }, openBtn('b primary lg block'),
      h('a', { class: 'b quiet block', href: '#/new', onclick: () => haptic('light') }, 'Make one for someone')));
    blocks.push(groupHead('How gifts work'));
    blocks.push(h('ol', { class: 'ib-how' },
      h('li', {}, h('b', { text: 'Someone makes you a universe' }), h('span', { text: 'A film, games and letters, all about you.' })),
      h('li', {}, h('b', { text: 'They send you the gift file' }), h('span', { text: 'By message, email or AirDrop. It ends in .littleverse.' })),
      h('li', {}, h('b', { text: 'You open it here' }), h('span', { text: 'It stays on this phone. Nothing is uploaded.' }))));
  }
  return { el: screen({ tabs: ctx.tabs, anim: ctx.anim, cls: 'ib-scr' }, ...blocks), title: 'Inbox' };
}

function giftCard(u) {
  const occ = occById(u.occ);
  const title = (u.copy && u.copy.hero && u.copy.hero.title) || occ.title;
  const from = u.from || u.me.name;
  return h('a', { class: 'ib-gift' + (u.opened ? '' : ' unread'), href: `#/u/${u.id}`, onclick: () => haptic('light'),
    'aria-label': `${title}, from ${from}${u.opened ? '' : ', new'}` },
    h('div', { class: 'ib-poster' }, poster(u, { width: 76 })),
    h('div', { class: 'ib-body' },
      h('span', { class: 'ib-occ', text: title }),
      h('b', { class: 'ib-from' }, `From ${from}`),
      h('small', { text: whenLine(u) }),
      h('small', { class: 'ib-meta', text: fmtReceived(u.receivedAt) }),
      u.opened ? null : h('span', { class: 'pill rose ib-new' }, h('i'), 'New')),
    ic('chevron-right', 's chev'));
}

// Phones don't know the .littleverse type, so their pickers would grey the file out.
// There the picker shows every file, and the gift is checked when it's opened.
const touchDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));

async function openGift(ctx, btn) {
  haptic('light');
  const file = await pickFile(touchDevice ? '' : '.littleverse,application/json');
  if (!file) return;
  const label = btn.querySelector('span');
  btn.disabled = true; btn.classList.add('busy'); label.textContent = 'Opening…';
  try {
    const u = await unpackGift(file);
    haptic('success');
    toast('Gift added', { icon: 'gift' });
    ctx.go(`#/u/${u.id}`);
  } catch (e) {
    haptic('error');
    errorSheet(e, ctx, btn);
  } finally {
    btn.disabled = false; btn.classList.remove('busy'); label.textContent = 'Open a gift file';
  }
}

function errorSheet(e, ctx, btn) {
  const msg = (e && e.message) || 'That file couldn’t be opened.';
  const close = sheet({ title: 'That gift didn’t open', body: h('div', { class: 'pad ib-err' },
    h('p', { class: 'ib-err-msg', text: msg }),
    h('p', { class: 'muted', text: 'Gift files end in .littleverse. If it came in a message, save it to your Files first, then open it here. If it still won’t open, ask the sender to share it again.' }),
    h('div', { class: 'stack' },
      h('button', { class: 'b primary lg block', type: 'button', onclick: () => { close(); setTimeout(() => openGift(ctx, btn), 340); } }, 'Try another file'),
      h('button', { class: 'b quiet block', type: 'button', onclick: () => close() }, 'Close'))) });
}
