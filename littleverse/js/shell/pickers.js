// Shared pickers used by the create wizard and the editor:
// the character builder, the theme picker, and the date field.
import { h, ic, seg, toggle, haptic } from './kit.js';
import { catSVG, EYES, MOUTHS, ACCS, DEFAULT_THEM } from '../core/cat.js';
import { SPECIES, FURS, HATS, THEMES, themeById } from '../lib/catalog.js';

const svgThumb = (d, prop = true) => catSVG({ ...DEFAULT_THEM, ...d }, { prop });
const LABEL = {
  dots: 'Bright', wink: 'Wink', happy: 'Happy', sleepy: 'Sleepy', stars: 'Starry', hearts: 'Smitten',
  tongue: 'Silly', smile: 'Smile', open: 'Delighted', cat: 'Content',
  none: 'Nothing', lollipop: 'Lollipop', shades: 'Shades', bow: 'Bow', flower: 'Flower', specs: 'Specs', balloon: 'Balloon',
};

export function randomDesign() {
  const r = a => a[Math.floor(Math.random() * a.length)];
  const hat = r(HATS);
  return { ...DEFAULT_THEM, species: r(SPECIES).id, fur: r(FURS), side: hat.side, fl: hat.fl, fr: hat.fr, brim: hat.brim, prop: hat.prop, eyes: r(EYES), mouth: r(MOUTHS), acc: r(ACCS) };
}

const isHex = c => /^#[0-9a-f]{6}$/i.test(c || '');
const sameColor = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
// the hat, part by part (the button on top is the "hub")
const HAT_PARTS = [['side', 'Sides'], ['fl', 'Front left'], ['fr', 'Front right'], ['brim', 'Brim'], ['prop', 'Propeller'], ['hub', 'Button']];

/**
 * Character builder. avatarBuilder(design, onChange, { name, bg }) → element
 * Big live preview on top, a segmented control for the part, a row of choices,
 * and below it the finer controls for that part (any color, each hat part, cheeks…).
 */
export function avatarBuilder(design, onChange, { name = '', bg = '#2a1d55' } = {}) {
  let d = { ...DEFAULT_THEM, ...(design || {}) };
  let part = 'species', stageBg = bg;
  const stage = h('div', { class: 'ab-stage', style: { '--ab-bg': bg } });
  const nameTag = h('div', { class: 'ab-name', text: name });
  const choices = h('div', { class: 'ab-choices', role: 'listbox' });
  const more = h('div', { class: 'ab-more' });
  const paint = () => { stage.innerHTML = catSVG(d, { spin: true }); stage.append(nameTag); stage.style.setProperty('--ab-bg', stageBg); };
  const set = patch => { d = { ...d, ...patch }; paint(); drawChoices(); haptic('select'); onChange({ ...d }); };
  // while a color picker is open: update the preview and save, but leave the controls be
  const tint = patch => { d = { ...d, ...patch }; paint(); onChange({ ...d }); };

  function option(selected, label, inner, onpick, cls = '') {
    return h('button', { class: 'ab-opt ' + cls, type: 'button', role: 'option', 'aria-selected': String(selected), 'aria-label': label, onclick: onpick }, inner, h('span', { class: 'ab-lab', text: label }));
  }
  // a color dot that opens the phone's color picker
  function colorChip(label, value, apply) {
    const dot = h('span', { class: 'ab-cc-c', style: { background: value } });
    const inp = h('input', { class: 'ab-cc-in', type: 'color', value: isHex(value) ? value : '#ffffff', 'aria-label': `${label} color` });
    inp.addEventListener('input', () => { dot.style.background = inp.value; tint(apply(inp.value)); });
    inp.addEventListener('change', () => set(apply(inp.value)));
    return h('label', { class: 'ab-cc' }, dot, h('span', { class: 'ab-cc-l', text: label }), inp);
  }
  const moreGroup = (title, ...kids) => h('div', { class: 'ab-mg' }, h('p', { class: 'ab-mg-h', text: title }), h('div', { class: 'ab-ccs' }, ...kids));
  function drawMore() {
    more.replaceChildren();
    if (part === 'face') {
      const sw = toggle(d.blush !== false, v => set({ blush: v }), 'Rosy cheeks');
      more.append(h('div', { class: 'ab-mg ab-row' }, h('p', { class: 'ab-mg-h', text: 'Rosy cheeks' }), sw));
    }
    if (part === 'hat') more.append(moreGroup('Paint each part', ...HAT_PARTS.map(([k, l]) => colorChip(l, d[k], c => ({ [k]: c })))));
    if (part === 'extra') {
      if (d.acc === 'lollipop') {
        const stripes = () => (d.lolli && d.lolli.length ? d.lolli : DEFAULT_THEM.lolli).slice(0, 4);
        more.append(moreGroup('Lollipop stripes', ...stripes().map((c, i) => colorChip(`Stripe ${i + 1}`, c, v => ({ lolli: stripes().map((x, j) => (j === i ? v : x)) })))));
      }
      more.append(moreGroup('Backdrop', colorChip('Behind them', stageBg, c => { stageBg = c; return { bg: c }; })));
    }
    more.hidden = !more.childNodes.length;
  }
  function drawChoices() {
    choices.replaceChildren();
    if (part === 'species') for (const s of SPECIES) choices.append(option(d.species === s.id, s.label, h('span', { class: 'ab-th', html: svgThumb({ ...d, species: s.id, acc: 'none' }, false) }), () => set({ species: s.id, ...(s.id === 'fox' && d.fur === '#ffffff' ? { fur: '#ff9b52' } : {}) })));
    if (part === 'fur') {
      for (const f of FURS) choices.append(option(sameColor(d.fur, f), 'Color', h('span', { class: 'ab-sw', style: { background: f } }), () => set({ fur: f }), 'sw'));
      // any other color, from the phone's picker
      const own = isHex(d.fur) && !FURS.some(f => sameColor(f, d.fur));
      const inp = h('input', { class: 'ab-cc-in', type: 'color', value: isHex(d.fur) ? d.fur : '#ffffff', 'aria-label': 'Any fur color' });
      const dot = h('span', { class: 'ab-sw ab-any', style: own ? { background: d.fur } : null }, own ? null : '+');
      inp.addEventListener('input', () => { dot.style.background = inp.value; dot.textContent = ''; tint({ fur: inp.value }); });
      inp.addEventListener('change', () => set({ fur: inp.value }));
      choices.append(h('label', { class: 'ab-opt sw', role: 'option', 'aria-selected': String(own) }, dot, inp, h('span', { class: 'ab-lab', text: 'Any color' })));
    }
    if (part === 'hat') for (const hat of HATS) { const { id, ...cols } = hat; choices.append(option(d.side === hat.side && d.fr === hat.fr, id[0].toUpperCase() + id.slice(1), h('span', { class: 'ab-th hat', html: svgThumb({ ...d, ...cols, acc: 'none' }) }), () => set(cols))); }
    if (part === 'face') {
      for (const e of EYES) choices.append(option(d.eyes === e, LABEL[e], h('span', { class: 'ab-th face', html: svgThumb({ ...d, eyes: e, acc: 'none' }, false) }), () => set({ eyes: e })));
      choices.append(h('span', { class: 'ab-div' }));
      for (const m of MOUTHS) choices.append(option(d.mouth === m, LABEL[m], h('span', { class: 'ab-th face', html: svgThumb({ ...d, mouth: m, acc: 'none' }, false) }), () => set({ mouth: m })));
    }
    if (part === 'extra') for (const a of ACCS) choices.append(option(d.acc === a, LABEL[a], h('span', { class: 'ab-th', html: svgThumb({ ...d, acc: a }, false) }), () => set({ acc: a })));
    drawMore();
    const sel = choices.querySelector('[aria-selected=true]');
    // center the chosen option once the row is on screen (it may not be attached yet)
    const center = (tries = 0) => {
      if (!sel || !sel.isConnected) return;
      if (!choices.isConnected || !choices.clientWidth) { if (tries < 40) setTimeout(() => center(tries + 1), 60); return; }
      const x = sel.getBoundingClientRect().left - choices.getBoundingClientRect().left + choices.scrollLeft;
      choices.scrollLeft = Math.max(0, x - (choices.clientWidth - sel.offsetWidth) / 2);
    };
    requestAnimationFrame(() => center());
  }
  const tabs = seg([['species', 'Animal'], ['fur', 'Color'], ['hat', 'Hat'], ['face', 'Face'], ['extra', 'Extra']], part, v => { part = v; drawChoices(); });
  // a new random character, standing in front of the same backdrop
  const dice = h('button', { class: 'ab-dice icon-b', type: 'button', 'aria-label': 'Surprise me', onclick: () => { d = { ...randomDesign(), bg: d.bg }; paint(); drawChoices(); haptic('medium'); onChange({ ...d }); } }, ic('shuffle', 's'));
  paint(); drawChoices();
  const el = h('div', { class: 'ab' }, h('div', { class: 'ab-top' }, stage, dice), h('div', { class: 'ab-tabs' }, tabs), choices, more);
  el.setName = n => { nameTag.textContent = n; };
  el.setBg = c => { stageBg = c; stage.style.setProperty('--ab-bg', c); };
  el.get = () => ({ ...d });
  return el;
}

/** Theme picker: a grid of small posters, one per palette. */
export function themePicker(current, onChange) {
  const grid = h('div', { class: 'tp', role: 'radiogroup' });
  for (const t of THEMES) {
    const b = h('button', { class: 'tp-card', type: 'button', role: 'radio', 'aria-checked': String(t.id === current), 'data-id': t.id,
      style: { background: `radial-gradient(90% 60% at 50% 105%, ${t.horizon}, transparent 70%), linear-gradient(${t.night}, ${t.dusk})` },
      onclick: () => { grid.querySelectorAll('.tp-card').forEach(x => x.setAttribute('aria-checked', String(x === b))); haptic('select'); onChange(t.id); } },
      h('span', { class: 'tp-stars' }),
      h('span', { class: 'tp-moon', style: { background: t.gold } }),
      h('span', { class: 'tp-hill', style: { background: `linear-gradient(${t.horizon}, ${t.night})` } }),
      h('b', { text: t.label, style: { color: t.paper } }));
    grid.append(b);
  }
  return grid;
}

/** Date field: a styled button that shows the date nicely and opens the phone's
 *  native date picker (the real <input type=date> sits invisibly on top of it).
 *  dateField({ value, yearKnown, label, onChange, allowNoYear }) */
export function dateField({ value, yearKnown = true, label = 'Date', onChange, allowNoYear = true }) {
  const inp = h('input', { class: 'inp df-native', type: 'date', value: value || '', 'aria-label': label });
  const shown = h('span', { class: 'df-val' });
  const btn = h('div', { class: 'inp df-btn', 'aria-hidden': 'true' }, ic('calendar', 's'), shown, ic('chevron-down', 's df-chev'));
  const year = h('label', { class: 'yr' }, h('input', { type: 'checkbox', checked: !yearKnown }), h('span', { text: 'I don’t know the year' }));
  const paint = () => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(inp.value || '');
    const noYear = year.querySelector('input').checked;
    if (!m) { shown.textContent = 'Choose a date'; btn.classList.add('df-empty'); return; }
    btn.classList.remove('df-empty');
    const d = new Date(+m[1], +m[2] - 1, +m[3], 12);
    shown.textContent = d.toLocaleDateString('en-US', noYear ? { month: 'long', day: 'numeric' } : { month: 'long', day: 'numeric', year: 'numeric' });
  };
  const fire = () => { paint(); onChange({ date: inp.value, yearKnown: !year.querySelector('input').checked }); };
  inp.addEventListener('change', fire);
  inp.addEventListener('input', paint);
  inp.addEventListener('click', () => { try { inp.showPicker && inp.showPicker(); } catch {} });
  year.querySelector('input').addEventListener('change', fire);
  // keep the visible button in sync with validation classes set on the input
  new MutationObserver(() => btn.classList.toggle('bad', inp.classList.contains('bad'))).observe(inp, { attributes: true, attributeFilter: ['class'] });
  inp.addEventListener('focus', () => btn.classList.add('focus'));
  inp.addEventListener('blur', () => btn.classList.remove('focus'));
  paint();
  return h('div', { class: 'datef' }, h('div', { class: 'df-wrap' }, btn, inp), allowNoYear ? year : null);
}

export { themeById };
