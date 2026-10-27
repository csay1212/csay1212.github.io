// UI kit for the app shell: icons, rows, fields, toggles, sheets, toasts.
// Every shell screen is built from these so the whole app feels like one thing.
import { h } from '../core/dom.js';
import { LUCIDE } from '../lib/lucide.js';
import { emojiURL } from '../lib/catalog.js';
import { haptic } from './native.js';

export { h, haptic };

export function ic(name, cls = '') {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
  s.setAttribute('class', 'ic ' + cls);
  s.innerHTML = LUCIDE[name] || LUCIDE.sparkles;
  return s;
}
export const emo = (name, cls = '', alt = '') => h('img', { class: 'emo ' + cls, src: emojiURL(name), alt, loading: 'lazy', decoding: 'async', draggable: 'false' });

/* ---------- screen scaffolding ---------- */
// screen({ tabs: true|false, anim: 'push'|'pop'|'fade'|'up' }, ...children)
export function screen(opts = {}, ...kids) {
  const el = h('main', { class: `scr ${opts.tabs === false ? 'no-tabs' : ''} scr-in-${opts.anim || 'fade'} ${opts.cls || ''}` }, ...kids);
  return el;
}
// navbar({ title, back: href|fn, backLabel, right: [nodes], always })
export function navbar({ title = '', back, backLabel = 'Back', right = [], always = false } = {}) {
  const l = back ? h('button', { class: 'nb-btn', type: 'button', 'aria-label': backLabel, onclick: () => { haptic('light'); typeof back === 'function' ? back() : (location.hash = back); } }, ic('chevron-left'), h('span', { text: backLabel })) : h('span');
  const bar = h('header', { class: 'navbar' + (always ? ' always' : '') }, h('div', { class: 'nb-l' }, l), h('div', { class: 'nb-title', text: title }), h('div', { class: 'nb-r' }, ...right));
  const onScroll = () => bar.classList.toggle('scrolled', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true });
  bar._off = () => removeEventListener('scroll', onScroll);
  queueMicrotask(onScroll);
  return bar;
}
export const nbBtn = (label, onclick, { strong = false, icon, disabled = false, aria } = {}) =>
  h('button', { class: 'nb-btn' + (strong ? ' strong' : ''), type: 'button', onclick: e => { haptic('light'); onclick(e); }, disabled, 'aria-label': aria || label }, icon ? ic(icon) : null, label && !icon ? label : null);

export const largeTitle = (t, sub) => [h('h1', { class: 'large-title', text: t }), sub ? h('p', { class: 'subtitle', text: sub }) : null];
export const section = (title, action) => h('div', { class: 'sec' }, h('h2', { text: title }), action || null);

/* ---------- grouped lists ---------- */
export const groupHead = t => h('h3', { class: 'group-h', text: t });
export const groupFoot = t => h('p', { class: 'group-f', text: t });
export const group = (...rows) => h('div', { class: 'group' }, ...rows);
// row({ title, sub, value, href, onclick, right, chevron, danger, lead })
// Rows are text-first: the old `icon`/`emoji`/`tint` options are accepted but not drawn,
// so lists stay quiet. Pass `lead` (a node) for the rare row that needs a picture.
export function row(o) {
  const left = o.lead ? h('span', { class: 'ri-ico' }, o.lead) : null;
  const tag = o.href ? 'a' : o.onclick ? 'button' : 'div';
  const el = h(tag, { class: 'row-i' + (o.danger ? ' danger' : '') + (o.cls ? ' ' + o.cls : ''), href: o.href || null, type: tag === 'button' ? 'button' : null,
    onclick: o.onclick ? e => { haptic('light'); o.onclick(e); } : o.href ? () => haptic('light') : null },
    left,
    h('span', { class: 'ri-main' }, h('b', { text: o.title }), o.sub ? h('small', { text: o.sub }) : null),
    o.value != null ? h('span', { class: 'ri-val', text: o.value }) : null,
    o.right || null,
    (o.chevron ?? !!(o.href || o.onclick)) && !(o.right && o.right.classList && o.right.classList.contains('tgl')) ? ic('chevron-right', 's chev') : null);
  return el;
}
export function toggle(on, onchange, label = '') {
  const t = h('button', { class: 'tgl', type: 'button', role: 'switch', 'aria-checked': String(!!on), 'aria-label': label });
  t.addEventListener('click', e => { e.stopPropagation(); const v = t.getAttribute('aria-checked') !== 'true'; t.setAttribute('aria-checked', String(v)); haptic('select'); onchange(v); });
  return t;
}

/* ---------- fields ---------- */
export function field(label, input, hint) {
  const id = input.id || ('f' + Math.random().toString(36).slice(2, 8));
  input.id = id;
  return h('div', { class: 'field' }, h('label', { for: id, text: label }), input, hint ? h('p', { class: 'hint-t', text: hint }) : null);
}
export const input = (value, { placeholder = '', maxlength = 60, type = 'text', oninput, cls = '' } = {}) =>
  h('input', { class: 'inp ' + cls, type, value: value ?? '', placeholder, maxlength, autocomplete: 'off', autocapitalize: type === 'text' ? 'words' : null, enterkeyhint: 'done', oninput: oninput ? e => oninput(e.target.value) : null });
export function textarea(value, { placeholder = '', rows = 6, oninput, cls = '', maxlength = 6000 } = {}) {
  const t = h('textarea', { class: 'inp ' + cls, rows, placeholder, maxlength, oninput: oninput ? e => oninput(e.target.value) : null });
  t.value = value ?? '';
  return t;
}
export function seg(options, value, onchange) {
  const wrap = h('div', { class: 'segc', role: 'group' });
  const paint = v => [...wrap.children].forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
  for (const [v, label] of options) wrap.append(h('button', { type: 'button', 'data-v': v, text: label, onclick: () => { paint(v); haptic('select'); onchange(v); } }));
  paint(value);
  return wrap;
}

/* ---------- sheet ---------- */
const sheets = [];
export function sheet({ title, body, onClose, done }) {
  const ret = document.activeElement;
  const wrap = h('div', { class: 'sheet-wrap', role: 'dialog', 'aria-modal': 'true', 'aria-label': title || 'Sheet' });
  const close = () => {
    if (!wrap.isConnected) return;
    wrap.classList.remove('open');
    sheets.splice(sheets.indexOf(close), 1);
    setTimeout(() => wrap.remove(), 320);
    ret?.focus?.({ preventScroll: true });
    onClose && onClose();
  };
  const right = done ? h('button', { class: 'nb-btn strong', type: 'button', text: done.label || 'Done', onclick: () => { haptic('light'); done.fn ? done.fn(close) : close(); } })
    : h('button', { class: 'icon-b', type: 'button', 'aria-label': 'Close', onclick: close }, ic('x', 's'));
  const sh = h('div', { class: 'sheet' }, h('div', { class: 'grab' }), title ? h('div', { class: 'sh-h' }, h('h3', { text: title }), right) : null, h('div', { class: 'sh-body' }, body));
  wrap.append(sh);
  wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  // swipe down to dismiss
  let y0 = null, dy = 0;
  sh.addEventListener('touchstart', e => { if (sh.scrollTop <= 0) { y0 = e.touches[0].clientY; dy = 0; } }, { passive: true });
  sh.addEventListener('touchmove', e => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); sh.style.transition = 'none'; sh.style.transform = `translateY(${dy}px)`; }, { passive: true });
  sh.addEventListener('touchend', () => { if (y0 == null) return; sh.style.transition = ''; sh.style.transform = ''; if (dy > 110) close(); y0 = null; });
  document.body.append(wrap);
  sheets.push(close);
  requestAnimationFrame(() => wrap.classList.add('open'));
  return close;
}
export const closeSheets = () => [...sheets].reverse().forEach(c => c());
export const hasSheet = () => sheets.length > 0;
addEventListener('keydown', e => { if (e.key === 'Escape' && sheets.length) sheets.at(-1)(); });

// confirm({ title, message, confirm: 'Delete', danger: true }) → Promise<boolean>
export function confirmSheet({ title, message, confirm = 'Confirm', cancel = 'Cancel', danger = false }) {
  return new Promise(res => {
    let answered = false;
    const close = sheet({ title, onClose: () => { if (!answered) res(false); }, body: h('div', { class: 'pad stack', style: { paddingBottom: '6px' } },
      message ? h('p', { class: 'muted', style: { margin: '0 0 8px', fontSize: '15.5px' }, text: message }) : null,
      h('button', { class: 'b block lg ' + (danger ? 'danger' : 'primary'), type: 'button', text: confirm, onclick: () => { answered = true; haptic(danger ? 'heavy' : 'medium'); res(true); close(); } }),
      h('button', { class: 'b block quiet', type: 'button', text: cancel, onclick: () => { answered = true; res(false); close(); } })) });
  });
}

/* ---------- toast ---------- */
let tEl, tT;
export function toast(text, { icon = 'circle-check', ms = 2600 } = {}) {
  if (!tEl) { tEl = h('div', { class: 'lv-toast', role: 'status', 'aria-live': 'polite' }); document.body.append(tEl); }
  tEl.replaceChildren(icon ? ic(icon) : '', h('span', { text }));
  tEl.classList.add('on');
  clearTimeout(tT); tT = setTimeout(() => tEl.classList.remove('on'), ms);
}

/* ---------- file picking ---------- */
export function pickFile(accept) {
  return new Promise(res => {
    const i = h('input', { type: 'file', accept, style: { position: 'fixed', left: '-9999px' } });
    i.addEventListener('change', () => { res(i.files && i.files[0] || null); i.remove(); }, { once: true });
    document.body.append(i);
    i.click();
    setTimeout(() => { if (!i.files || !i.files.length) { /* stays until picked or GC */ } }, 60000);
  });
}

export const plural = (n, w, pl) => `${n} ${n === 1 ? w : (pl || w + 's')}`;
