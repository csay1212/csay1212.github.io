// Toasts, modals, the flying "+stardust", passport stamp popups, and the
// little hidden characters (Where's {me}?).
import { h, icon } from './dom.js';
import { store } from './store.js';
import { sfx } from './audio.js';
import { fx } from './fx.js';
import { ALL_STAMPS, HIDDEN_TOTAL, HIDDEN_ON, ACTIVE_SPOTS } from '../worlds.js';
import { U } from '../active.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- toast ---------- */
let toastEl, toastT;
export function toast(text, ms = 3200) {
  if (!toastEl) { toastEl = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(toastEl); }
  toastEl.textContent = text; toastEl.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), ms);
}

/* ---------- modal ---------- */
let modalStack = [];
export function modal({ title, body, onClose, wide }) {
  const ret = document.activeElement;
  const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title || 'Dialog', style: wide ? { maxWidth: '900px' } : null });
  const wrap = h('div', { class: 'modal-wrap' }, box);
  const close = () => {
    if (!wrap.isConnected) return;
    wrap.classList.remove('open');
    modalStack = modalStack.filter(m => m !== close);
    if (!modalStack.length) document.body.classList.remove('lock-scroll');
    setTimeout(() => wrap.remove(), 230);
    ret?.focus?.({ preventScroll: true });
    onClose && onClose();
  };
  const x = h('button', { class: 'icon-btn x', type: 'button', 'aria-label': 'Close', onclick: close }, icon('close'));
  box.append(x);
  if (title) box.append(h('h3', { text: title }));
  if (body) box.append(body);
  wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  document.body.append(wrap); document.body.classList.add('lock-scroll');
  modalStack.push(close);
  requestAnimationFrame(() => wrap.classList.add('open'));
  setTimeout(() => x.focus({ preventScroll: true }), 60);
  return close;
}
addEventListener('keydown', e => { if (e.key === 'Escape' && modalStack.length) modalStack.at(-1)(); });
export const closeAllModals = () => [...modalStack].reverse().forEach(c => c());

/* ---------- stardust flying to the counter ---------- */
function dustTarget() {
  const els = [...document.querySelectorAll('[data-dust]')].filter(e => e.offsetParent !== null);
  return els[0] || null;
}
export function flyDust(delta, x, y) {
  const target = dustTarget();
  const el = h('div', { class: 'fly', text: `+${delta} ✦` });
  x = x ?? innerWidth / 2; y = y ?? innerHeight / 2;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  document.body.append(el);
  const tr = target ? target.getBoundingClientRect() : null;
  const dx = tr ? tr.left + tr.width / 2 - x : 0, dy = tr ? tr.top + tr.height / 2 - y : -80;
  const anim = el.animate([
    { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
    { transform: 'translate(-50%,-110%) scale(1.15)', opacity: 1, offset: .25 },
    { transform: `translate(calc(-50% + ${dx * .82}px), calc(-50% + ${dy * .82}px)) scale(.75)`, opacity: tr ? .85 : 0, offset: .8 },
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.5)`, opacity: 0 },
  ], { duration: reduce ? 10 : 900, easing: 'cubic-bezier(.5,0,.3,1)' });
  anim.onfinish = () => { el.remove(); if (target) { target.classList.remove('bump'); void target.offsetWidth; target.classList.add('bump'); } };
}

/* ---------- passport stamp popup ---------- */
const stampQueue = [];
let stampBusy = false;
export function stampHTML(def, date) {
  const d = date ? new Date(date) : new Date();
  return h('div', { class: 'stmp', style: { '--sc': def.color || 'var(--rose)' } },
    h('div', {},
      h('div', { class: 'ico', text: def.icon }),
      h('div', { class: 'nm', text: def.short || def.name }),
      h('div', { class: 'dt', text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) })));
}
function nextStamp() {
  if (stampBusy || !stampQueue.length) return;
  stampBusy = true;
  const { id, count } = stampQueue.shift();
  const def = ALL_STAMPS.find(s => s.id === id) || { name: id, icon: '★' };
  const pop = h('div', { class: 'stamp-pop', 'aria-live': 'polite' },
    h('div', { style: { display: 'grid', justifyItems: 'center' } },
      stampHTML(def),
      h('p', { class: 'stamp-caption', text: `Passport stamp ${count} of ${ALL_STAMPS.length}` })));
  document.body.append(pop);
  sfx('stamp');
  setTimeout(() => fx.burst(innerWidth / 2, innerHeight / 2, 30), 300);
  setTimeout(() => { pop.classList.add('out'); }, 2300);
  setTimeout(() => { pop.remove(); stampBusy = false; nextStamp(); }, 2800);
}
store.on('stamp', e => { stampQueue.push(e); nextStamp(); });
store.on('stardust', e => { if (e.delta > 0 && !e.silent) flyDust(e.delta, e.x, e.y); });

/* ---------- Where's {me}? ---------- */
// peek(container, 'id', {left:'10px', bottom:'-12px', rotate:-10, size:30})
export function peek(container, id, pos = {}) {
  if (!HIDDEN_ON || !ACTIVE_SPOTS.includes(id) || store.hiddenFound(id) || !container) return null;
  const size = pos.size || 30;
  const b = h('button', { class: 'peek', type: 'button', 'aria-label': `A tiny ${U.me.name} is hiding here`, title: '?',
    style: { width: size + 'px', height: size + 'px', left: pos.left, right: pos.right, top: pos.top, bottom: pos.bottom, transform: `rotate(${pos.rotate || 0}deg)` } },
    h('img', { src: U.me.photoURL || U.meSticker, alt: '', class: U.me.photoURL ? 'ph' : 'av' }));
  b.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    if (!store.findHidden(id)) return;
    const r = b.getBoundingClientRect();
    b.classList.add('found');
    fx.burst(r.left + r.width / 2, r.top + r.height / 2, 26);
    sfx('sparkle');
    const n = store.hiddenCount();
    store.award(15, { x: r.left + r.width / 2, y: r.top });
    toast(n >= HIDDEN_TOTAL ? `That’s all ${HIDDEN_TOTAL}! ${U.me.name} has nowhere left to hide.` : `You found a hiding ${U.me.name}! ${n} of ${HIDDEN_TOTAL}.`);
    if (n >= HIDDEN_TOTAL) store.stamp('hidden');
    setTimeout(() => b.remove(), 800);
  });
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  container.append(b);
  return b;
}
