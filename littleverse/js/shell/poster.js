// Every universe is presented as a film poster: the studio, the two characters
// under a spotlight, the occasion, the name, and a line of billing.
import { h } from '../core/dom.js';
import { catSVG } from '../core/cat.js';
import { themeOf, fontById, relById, occById } from '../lib/catalog.js';
import { info } from '../lib/dates.js';
import { mediaURL } from '../lib/db.js';

function stars(seed, n = 26) {
  let s = 0;
  for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = (rnd() * 100).toFixed(1), y = (14 + rnd() * 50).toFixed(1), r = (rnd() * 0.5 + 0.25).toFixed(2), o = (rnd() * .6 + .35).toFixed(2);
    const c = rnd() < .15 ? 'var(--p-gold)' : rnd() < .2 ? 'var(--p-rose)' : '#fff';
    out += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity="${o}"/>`;
  }
  return `<svg class="p-stars" viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden="true">${out}</svg>`;
}

export function posterVars(u) {
  const t = themeOf(u), f = t.font;
  return { '--p-night': t.night, '--p-dusk': t.dusk, '--p-horizon': t.horizon, '--p-gold': t.gold, '--p-rose': t.rose, '--p-paper': t.paper, '--p-glow': t.rose + '55',
    '--p-font': f.family, '--p-fw': String(f.weight || 400), '--p-fs': String(f.scale || 1) };
}

// poster(u, { width: 224, badge: 'Example' })
export function poster(u, { width = 224, badge = null, photo = true } = {}) {
  const t = themeOf(u);
  const occ = occById(u.occ);
  const name = u.them.name || 'Someone';
  const title = (u.copy && u.copy.hero && u.copy.hero.title) || occ.title;
  const d = info(u.date, u.yearKnown !== false);
  const el = h('div', { class: 'poster', style: { '--pw': width + 'px', ...posterVars(u) }, role: 'img', 'aria-label': `${title}, ${name}. A ${u.studio || ''} feature.` });
  el.innerHTML = stars(u.id || name, Math.round(26 * t.stars));
  el.append(h('div', { class: 'p-glow' }), h('div', { class: 'p-hill' }));
  const studioLine = `${u.studio || (u.me.name + ' Pictures')} ${String(u.copy?.gate?.presents || '').trim() || 'presents'}`;
  el.append(h('div', { class: 'p-top' + (studioLine.length > 24 ? ' long' : ''), text: studioLine }));
  const cast = h('div', { class: 'p-cast' },
    h('div', { class: 'pc pa', html: catSVG({ ...(u.them.avatar || {}), name }, { prop: true }) }),
    h('div', { class: 'pc pb', html: catSVG({ ...(u.me.avatar || {}), name: u.me.name }, { prop: true }) }));
  el.append(cast);
  if (photo && u.them.photo) {
    mediaURL(u.them.photo).then(url => {
      if (!url) return;
      cast.remove();
      el.append(h('div', { class: 'p-photo' }, h('img', { src: url, alt: '' })));
    });
  }
  const nm = h('div', { class: 'p-name' + (name.length > 13 ? ' xlong' : name.length > 8 ? ' long' : ''), text: name });
  const bill = h('div', { class: 'p-bill' });
  bill.innerHTML = `${esc(u.studio || '')} · a film by <b>${esc(u.me.name)}</b><br>${esc(d.full)}`;
  el.append(h('div', { class: 'p-text' }, h('div', { class: 'p-occ', text: title }), nm, bill));
  if (badge) el.append(h('span', { class: 'p-badge', text: badge }));
  return el;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// one-line description in plain words: "A birthday for a partner"
const OCC_PHRASE = { birthday: 'A birthday', belated: 'A belated birthday', anniversary: 'An anniversary', justbecause: 'A just-because', sorry: 'An apology',
  congrats: 'A congratulations', farewell: 'A farewell', getwell: 'A get-well', reunion: 'A countdown', thanks: 'A thank-you', remembrance: 'A remembrance', newyear: 'A new year' };
const REL_PHRASE = { partner: 'a partner', bestie: 'a best friend', friends: 'friends', family: 'family', distance: 'someone far away', kid: 'a little one',
  mentor: 'a mentor', colleague: 'a colleague', pet: 'a pet', self: 'future me' };
export function metaLine(u) {
  if (u.rel === 'memorial') return 'In loving memory';
  return `${OCC_PHRASE[u.occ] || occById(u.occ).label} for ${REL_PHRASE[u.rel] || relById(u.rel).label.toLowerCase()}`;
}
// when the date is next: "October 21, in 17 days", "Today, October 21"
export function whenLine(u) {
  const d = info(u.date, u.yearKnown !== false);
  const occ = occById(u.occ);
  if (occ.future && d.daysSince < 0) return `${d.long}, ${d.daysSince === -1 ? 'tomorrow' : `in ${-d.daysSince} days`}`;
  if (d.isToday) return `Today, ${d.long}`;
  if (occ.yearly) return `${d.long}, ${d.daysUntil === 1 ? 'tomorrow' : `in ${d.daysUntil} days`}`;
  return d.full;
}
