// A universe's home: its poster, Play, Share, and everything you can customize.
import { h, ic, emo, screen, navbar, nbBtn, groupHead, groupFoot, group, row, toggle, sheet, confirmSheet, toast, haptic } from './kit.js';
import { db, settings, mediaIds } from '../lib/db.js';
import { relById, occById, themeOf, WORLD_DEFS } from '../lib/catalog.js';
import { info } from '../lib/dates.js';
import { catSVG } from '../core/cat.js';
import { poster, posterVars, whenLine, metaLine } from './poster.js';
import { packGift, fmtSize } from '../lib/gift.js';
import { worldTitle } from '../lib/templates.js';
import { shareFile } from './native.js';

function progressOf(u) {
  try {
    const d = JSON.parse(localStorage.getItem('lv-progress-' + u.id) || 'null');
    if (!d) return null;
    return { stamps: Object.keys(d.stamps || {}).length, dust: d.stardust || 0, letters: Object.keys(d.letters || {}).length };
  } catch { return null; }
}
const count = (n, w, p) => `${n} ${n === 1 ? w : p || w + 's'}`;

export async function render(ctx) {
  const [id] = ctx.params;
  const u = await db.get(id);
  if (!u) { ctx.replace('#/'); return { el: h('div') }; }
  const received = u.kind === 'received';
  const rel = relById(u.rel), occ = occById(u.occ), t = themeOf(u);
  const d = info(u.date, u.yearKnown !== false);
  const c = u.copy;
  const onWorlds = WORLD_DEFS.filter(w => u.worlds[w.id] !== false);
  const on = id => u.worlds[id] !== false;
  const E = sec => `#/u/${u.id}/e/${sec}`;

  const more = nbBtn('', () => moreSheet(u, ctx), { icon: 'ellipsis', aria: 'More' });
  const bar = navbar({ title: u.them.name, back: received ? '#/inbox' : '#/', backLabel: received ? 'Inbox' : 'Home', right: [more] });

  // hero
  const hero = h('section', { class: 'u-hero', style: posterVars(u) },
    h('div', { class: 'u-hero-bg' }),
    poster(u, { width: 212 }),
    h('h1', { class: 'u-name', text: u.them.name }),
    h('p', { class: 'u-meta' }, received ? `From ${u.from || u.me.name}` : metaLine(u), h('br'), whenLine(u)),
    h('div', { class: 'u-actions' },
      h('a', { class: 'b primary lg block', href: `#/p/${u.id}`, onclick: () => haptic('medium') }, ic('play', 's'), received ? 'Open your gift' : 'Play'),
      received ? null : h('div', { class: 'u-two' },
        h('button', { class: 'b quiet', type: 'button', onclick: () => shareSheet(u) }, ic('send', 's'), 'Send as a gift'),
        h('a', { class: 'b quiet', href: E('film') }, ic('pencil', 's'), 'Edit the film'))));

  const blocks = [bar, hero];

  const pr = progressOf(u);
  if (pr && (pr.stamps || pr.dust)) {
    const total = onWorlds.filter(w => w.id !== 'finale').length + 1 + (u.hidden !== false ? 1 : 0);
    blocks.push(h('div', { class: 'u-progress' },
      h('div', {}, h('b', { text: `${pr.stamps}/${total}` }), h('span', { text: 'stamps' })),
      h('div', {}, h('b', { text: pr.dust.toLocaleString('en-US') }), h('span', { text: 'stardust' })),
      h('div', {}, h('b', { text: String(pr.letters) }), h('span', { text: 'letters opened' }))));
  }

  if (received) {
    blocks.push(groupHead('About this gift'));
    blocks.push(group(
      row({ title: 'Made by', value: u.me.name, chevron: false }),
      row({ title: 'Received', value: u.receivedAt ? new Date(u.receivedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown', chevron: false }),
      row({ title: 'Worlds inside', value: String(onWorlds.length), chevron: false })));
    blocks.push(groupHead('Make one back'));
    blocks.push(group(row({ title: `Make a universe for ${u.from || u.me.name}`, sub: 'Starts a new one with their name already in', onclick: () => { try { sessionStorage.setItem('lv-create-prefill', JSON.stringify({ them: u.from || u.me.name })); } catch {} ctx.go(`#/new/${u.rel === 'friends' ? 'bestie' : u.rel}`); } })));
    blocks.push(h('div', { style: { height: '20px' } }));
    blocks.push(group(row({ title: 'Remove from inbox', danger: true, chevron: false, onclick: () => remove(u, ctx) })));
    return { el: screen({ tabs: false, anim: ctx.anim, cls: 'u-scr' }, ...blocks), title: u.them.name };
  }

  // ---------- what's inside ----------
  const chTitles = [c.film.ch1.title, c.film.ch2.title, c.film.epi.title].filter(Boolean);
  blocks.push(groupHead('The film'));
  blocks.push(group(
    row({ title: 'Opening film', sub: `“${c.hero?.title || occ.title}”${chTitles.length ? `, in ${chTitles.length} parts: ${listOf(chTitles)}` : ''}`, href: E('film') }),
    row({ title: 'The letter', sub: firstLine(c.film.letter.body), href: E('letter') })));

  blocks.push(groupHead('Worlds'));
  const worldRows = [];
  const W = (id, value, sub) => { if (on(id)) worldRows.push(row({ title: T(id), value, sub, href: E(id) })); };
  const T = id => worldTitle(u, id, WORLD_DEFS.find(w => w.id === id)?.name);
  W('mail', count(c.letters.items.length, 'letter'));
  W('coupons', count(c.coupons.items.length, c.coupons.mode === 'promise' ? 'promise' : 'coupon'));
  W('reasons', count(c.reasons.items.length, 'card'));
  W('memories', count(c.memories.items.length, 'moment'));
  W('wordle', count(c.words.length, 'word'));
  W('mixtape', c.mixtape.tracks.length ? count(c.mixtape.tracks.length, 'song') : 'No songs yet');
  W('trailer', count(c.trailer.lines.length, 'line'));
  W('finale', null, c.finale.lines[0] || 'The last message');
  W('almanac', '12 forecasts');
  worldRows.push(row({ title: 'Choose worlds', value: `${onWorlds.length} of ${WORLD_DEFS.length} on`, href: E('worlds') }));
  worldRows.push(row({ title: 'The map', sub: `${c.map?.title || 'Its name'}, the worlds’ names and their order`, href: E('map') }));
  blocks.push(group(...worldRows));

  blocks.push(groupHead('Look'));
  const chars = h('span', { class: 'u-chars' }, h('span', { html: catSVG(u.them.avatar || {}, { prop: true }) }), h('span', { html: catSVG(u.me.avatar || {}, { prop: true }) }));
  const sw = h('span', { class: 'u-swatch', style: { background: `linear-gradient(135deg, ${t.dusk}, ${t.horizon})` } }, h('i', { style: { background: t.gold } }), h('i', { style: { background: t.rose } }));
  const nPhotos = [u.them.photo, u.me.photo].filter(Boolean).length;
  blocks.push(group(
    row({ title: 'Characters', href: E('characters'), right: chars }),
    row({ title: 'Theme', value: t.custom ? 'Your colors' : t.label, href: E('theme'), right: sw }),
    row({ title: 'Photos', value: nPhotos ? count(nPhotos, 'portrait') : 'None yet', href: E('photos') })));

  blocks.push(groupHead('Details'));
  blocks.push(group(
    row({ title: 'Names and date', sub: `For ${u.them.name}, from ${u.me.name}. ${d.full}.`, href: E('details') }),
    row({ title: 'Who it’s for and why', sub: metaLine(u), href: E('occasion') }),
    row({ title: `Hide ${u.me.name} in the worlds`, sub: 'Find them all for a passport stamp', right: toggle(u.hidden !== false, async v => { u.hidden = v; await db.put(u); toast(v ? 'Hidden friends on' : 'Hidden friends off'); }, 'Hidden friends') })));
  blocks.push(groupFoot(u.demo ? 'This is an example. Change anything you like, or reset it from the menu.' : `Saved on this phone. Last edited ${new Date(u.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`));

  return { el: screen({ tabs: false, anim: ctx.anim, cls: 'u-scr' }, ...blocks), title: u.them.name };
}

const firstLine = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean).slice(1, 2)[0] || 'Write something only you could say';
const listOf = a => a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a.at(-1)}`;

async function shareSheet(u) {
  const { blob, filename, size } = await packGift(u, { from: settings.get().name || u.me.name });
  const close = sheet({ title: 'Send as a gift', body: h('div', { class: 'stack pad', style: { paddingBottom: '4px' } },
    h('div', { class: 'gift-card' },
      h('span', { class: 'gc-ico', 'aria-hidden': 'true' }, ic('gift')),
      h('div', {}, h('b', { text: filename }), h('small', { text: `${fmtSize(size)}, ${mediaIds(u).length ? 'with your photos and songs inside' : 'using the built-in songs and art'}` }))),
    h('p', { class: 'muted', style: { margin: '2px 0 6px', fontSize: '15px' }, text: `Send this file to ${u.them.name} however you like: a message, email or AirDrop. They open it in Littleverse to start the film.` }),
    h('button', { class: 'b primary lg block', type: 'button', onclick: async () => { haptic('medium'); const r = await shareFile(blob, filename, { title: `A universe for ${u.them.name}`, text: `I made you something. Open it in Littleverse.` }); if (r === 'downloaded') toast('Gift file saved'); else if (r === 'shared') toast('Gift sent'); if (r !== 'cancelled') close(); } }, ic('share-2', 's'), 'Share gift file'),
    h('a', { class: 'b quiet block', href: `#/p/${u.id}`, onclick: () => close() }, ic('smartphone', 's'), 'Give them your phone instead')) });
}

function moreSheet(u, ctx) {
  const close = sheet({ title: u.them.name, body: h('div', {},
    group(
      row({ title: 'Duplicate', sub: 'Make a copy to change for someone else', onclick: async () => { close(); const c = JSON.parse(JSON.stringify(u)); c.id = 'u' + Date.now().toString(36); delete c.demo; c.createdAt = Date.now(); await db.put(c); toast('Duplicated'); ctx.go(`#/u/${c.id}`); } }),
      row({ title: 'Reset progress', sub: 'Stamps, stardust and opened letters', onclick: async () => { close(); if (await confirmSheet({ title: 'Reset progress?', message: 'Stamps, stardust, high scores and opened letters for this universe will be cleared. The content stays.', confirm: 'Reset progress', danger: true })) { localStorage.removeItem('lv-progress-' + u.id); toast('Progress reset'); ctx.refresh(); } } }),
      u.demo ? row({ title: 'Restore the original example', onclick: async () => { close(); const { demoUniverses } = await import('../lib/demo.js'); const fresh = demoUniverses().find(x => x.id === u.id); if (fresh) { await db.put(fresh, { touch: false }); toast('Example restored'); ctx.refresh(); } } }) : null),
    h('div', { style: { height: '14px' } }),
    group(row({ title: u.demo ? 'Remove this example' : 'Delete universe', danger: true, chevron: false, onclick: () => { close(); remove(u, ctx); } }))) });
}

async function remove(u, ctx) {
  const ok = await confirmSheet({ title: u.kind === 'received' ? 'Remove this gift?' : `Delete ${u.them.name}’s universe?`, message: 'This removes it from this phone, including its photos and progress. This can’t be undone.', confirm: u.kind === 'received' ? 'Remove' : 'Delete', danger: true });
  if (!ok) return;
  await db.remove(u.id);
  toast(u.kind === 'received' ? 'Removed' : 'Deleted');
  ctx.go(u.kind === 'received' ? '#/inbox' : '#/');
}
