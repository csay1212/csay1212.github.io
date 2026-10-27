// The Hat Workshop: design the recipient's propeller-hat pilot (animal, fur,
// hat, face, extras, name). The saved design is stored per universe and
// becomes the pilot on the map and in the games that fly one.
import { h, icon, downloadCanvas } from '../core/dom.js';
import { SPECIES, EYES, MOUTHS, ACCS, catSVG } from '../core/cat.js';
import { SPECIES as SPECIES_LABELS, FURS } from '../lib/catalog.js';

// 13 colors + the custom picker = two tidy rows of seven on a phone
const SWATCHES = ['#f07ab0', '#9b5ff0', '#e3a6f5', '#e8322d', '#ff9a7a', '#f5cc4a', '#14a06d', '#86e6d8', '#2a8fe8', '#1c4fd0', '#2a1d55', '#f6eee3', '#16121f'];
// Hat-only looks: they recolor the hat and sticker, never the animal or face.
const FUN_LOOKS = [
  { name: 'Twilight', d: { side: '#3b2470', fl: '#b85c9c', fr: '#f19a86', brim: '#f7c778', prop: '#f5cc4a', lolli: ['#b85c9c', '#f7c778', '#ffffff'], bg: '#140f3a' } },
  { name: 'Mission control', d: { side: '#0f3b3a', fl: '#86e6d8', fr: '#2b7d78', brim: '#16121f', prop: '#ff5a4e', lolli: ['#86e6d8', '#ff5a4e'], bg: '#08161c' } },
  { name: 'Lemonade', d: { side: '#fdb515', fl: '#fff4a8', fr: '#f5cc4a', brim: '#14a06d', prop: '#86e6d8', lolli: ['#fdb515', '#ffffff', '#14a06d'], bg: '#2f2a08' } },
  { name: 'Sunshine', d: { side: '#f5cc4a', fl: '#fff2b8', fr: '#2a8fe8', brim: '#1c4fd0', prop: '#f5cc4a', lolli: ['#f5cc4a', '#1c4fd0'], bg: '#1b1446' } },
  { name: 'Ember', d: { side: '#ff5a4e', fl: '#ffc2bd', fr: '#8a1d16', brim: '#16121f', prop: '#ff5a4e', lolli: ['#ff5a4e', '#16121f', '#ffffff'], bg: '#1a0705' } },
  { name: 'Mint choc', d: { side: '#5b3a29', fl: '#86e6d8', fr: '#c9fff4', brim: '#5b3a29', prop: '#86e6d8', lolli: ['#86e6d8', '#5b3a29'], bg: '#13221f' } },
];
// A character look copies everything about that person's avatar except the badge name.
const LOOK_KEYS = ['species', 'fur', 'side', 'fl', 'fr', 'brim', 'prop', 'hub', 'eyes', 'mouth', 'acc', 'lolli', 'bg', 'blush'];
const EYE_NAMES = { dots: 'Classic', wink: 'Wink', happy: 'Happy', sleepy: 'Sleepy', stars: 'Starry', hearts: 'Hearts' };
const MOUTH_NAMES = { tongue: 'Blep', smile: 'Smile', open: 'Gasp', cat: 'Kitty' };
const ACC_NAMES = { none: 'Nothing', lollipop: 'Lollipop', shades: 'Shades', bow: 'Bow', flower: 'Flower', specs: 'Specs', balloon: 'Balloon' };
const PARTS = [['side', 'Side panels'], ['fl', 'Front left'], ['fr', 'Front right'], ['brim', 'Brim'], ['prop', 'Propeller']];
const TABS = [['animal', 'Animal'], ['hat', 'Hat'], ['face', 'Face'], ['extra', 'Extras'], ['name', 'Name']];
const NAME_MAX = 24;
// The coat each animal starts with. Picking a new animal swaps the fur too, but
// only while it's still the old animal's starting coat (a chosen fur stays).
const COAT = { cat: '#ffffff', bunny: '#ffffff', bear: '#d9a066', dog: '#f3e3cf', fox: '#ff9b52', mouse: '#b9b6c2' };
const speciesLabel = id => (SPECIES_LABELS.find(s => s.id === id) || {}).label || id.charAt(0).toUpperCase() + id.slice(1);
const possessive = n => /s$/i.test(n) ? `${n}’` : `${n}’s`;
const isHex = c => /^#[0-9a-f]{6}$/i.test(c || '');
const same = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();

export default {
  css: 'hats',
  mount(ctx) {
    const { store, cat, audio, fx, U } = ctx;
    const PRESETS = cat.PRESETS;
    let d = { ...cat.getDesign() };
    const saved = () => JSON.stringify(cat.getDesign());
    const dirty = () => JSON.stringify(d) !== saved();
    let tab = 'animal';

    /* ---------- copy from the universe ---------- */
    const them = U.them.name, me = U.me.name;
    const first = (them.trim().split(/\s+/).filter(w => !/^(the|a|an|my|our)$/i.test(w))[0] || them).replace(/[^\p{L}\p{N}'-]/gu, '');
    const has = id => ctx.WORLDS.some(w => w.id === id);
    const places = ['over the map'];
    if (has('flight')) places.push('through the Flight Academy');
    if (has('bakery')) places.push('onto the top of your cake tower');
    const where = places.length > 1 ? `${places.slice(0, -1).join(', ')}${places.length > 2 ? ',' : ''} and ${places.at(-1)}` : places[0];
    const extraName = { birthday: 'Birthday Pilot', belated: 'Birthday Pilot', newyear: 'New Year Navigator', congrats: 'Ace Pilot', reunion: 'Long-Haul Pilot', farewell: 'Long-Haul Pilot', anniversary: 'Co-Pilot', getwell: 'Captain Cozy', thanks: 'Wing Commander' }[U.occ];
    const NAMES = [...new Set([them, `Captain ${first}`, extraName, 'Agent Propeller', 'Sky Captain', 'Lollipop Pilot'].filter(n => n && n.length <= NAME_MAX))];
    const LOOKS = [
      { name: `${possessive(them)} look`, d: PRESETS.them, full: true },
      { name: `${possessive(me)} look`, d: PRESETS.me, full: true },
      ...FUN_LOOKS,
    ];

    /* ---------- preview ---------- */
    const stage = h('div', { class: 'hw-stage', role: 'img', 'aria-label': 'Your pilot. Tap to spin the propeller.' });
    const tag = h('div', { class: 'hw-tag' });
    const spot = h('div', { class: 'hw-spot' }, stage, tag);
    let spinT;
    spot.addEventListener('click', () => {
      stage.querySelector('svg')?.classList.add('spin'); audio.sfx('flap');
      clearTimeout(spinT); spinT = setTimeout(() => stage.querySelector('svg')?.classList.remove('spin'), 1400);
    });
    ctx.cleanup(() => clearTimeout(spinT));
    const undoBtn = h('button', { type: 'button', class: 'hw-undo', 'aria-label': 'Undo changes since your last save' }, h('i', { 'aria-hidden': 'true' }), h('span', { text: 'Unsaved · Undo' }));
    undoBtn.onclick = () => { d = { ...cat.getDesign() }; audio.sfx('click'); paint(); };

    function paint() {
      stage.innerHTML = catSVG(d, { spin: false });
      stage.style.setProperty('--bg', d.bg);
      paintTag();
      paintDirty();
      paintControls();
    }
    function paintDirty() { undoBtn.hidden = !dirty(); }
    function paintTag() {
      const t = d.name || 'Unnamed pilot';
      tag.textContent = t;
      if (t.length > 16) tag.dataset.len = 'xl'; else if (t.length > 11) tag.dataset.len = 'l'; else delete tag.dataset.len;
    }

    /* ---------- controls ---------- */
    const tabs = h('div', { class: 'hw-tabs', role: 'tablist', 'aria-label': 'Design' });
    const panel = h('div', { class: 'hw-panel', role: 'tabpanel' });
    for (const [id, label] of TABS) {
      tabs.append(h('button', { type: 'button', role: 'tab', 'data-t': id, onclick: () => { if (tab === id) return; tab = id; audio.sfx('click'); paintControls(); } }, label));
    }

    // a row of color dots; `cur` is the color in use, `pick` stores a new one
    const swatchRow = (label, list, cur, pick) => {
      const row = h('div', { class: 'hw-field' }, h('span', { class: 'hw-label', text: label }));
      const sw = h('div', { class: 'hw-swatches', role: 'group', 'aria-label': label });
      for (const c of list) {
        sw.append(h('button', { type: 'button', class: 'hw-sw', style: { '--c': c }, 'aria-label': `${label}: ${c}`, 'aria-pressed': String(same(cur, c)),
          onclick: () => { pick(c); audio.sfx('pop'); paint(); } }));
      }
      const off = isHex(cur) && !list.some(c => same(c, cur));   // a color from elsewhere: show it on the custom dot
      const custom = h('input', { type: 'color', class: 'hw-custom', 'aria-label': `${label}: any color`, value: isHex(cur) ? cur : '#ffffff' });
      custom.addEventListener('input', () => { pick(custom.value); paint(); });
      sw.append(h('label', { class: 'hw-sw hw-sw-custom' + (off ? ' on' : ''), style: off ? { '--c': cur } : null, title: 'Any color', 'aria-pressed': String(off) }, custom, h('span', { 'aria-hidden': 'true', text: '+' })));
      row.append(sw);
      return row;
    };
    // picture options (eyes, mouth, accessory, animal)
    const optionRow = (label, list, nameOf, key, thumb, also) => {
      const row = h('div', { class: 'hw-field' }, h('span', { class: 'hw-label', text: label }));
      const opts = h('div', { class: 'hw-opts', role: 'group', 'aria-label': label });
      for (const v of list) {
        const b = h('button', { type: 'button', class: 'hw-opt', 'aria-pressed': String(d[key] === v), 'aria-label': `${label}: ${nameOf(v)}`, onclick: () => { if (also) also(v); d[key] = v; audio.sfx('pop'); paint(); } });
        b.innerHTML = `<span class="hw-thumb ${key}">${thumb(v)}</span>`;
        b.append(h('small', { text: nameOf(v) }));
        opts.append(b);
      }
      row.append(opts);
      return row;
    };

    function paintControls() {
      [...tabs.children].forEach(b => { const on = b.dataset.t === tab; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      panel.replaceChildren();
      if (tab === 'animal') {
        const stock = same(d.fur, COAT[d.species || 'cat']);
        const coatFor = v => (stock && COAT[v]) || d.fur;
        panel.append(optionRow('Animal', SPECIES, speciesLabel, 'species', v => catSVG({ ...d, species: v, fur: coatFor(v), acc: 'none' }, { prop: false }), v => { d.fur = coatFor(v); }));
        panel.append(swatchRow('Fur', FURS, d.fur, c => { d.fur = c; }));
      } else if (tab === 'hat') {
        const pal = h('div', { class: 'hw-palettes' });
        for (const p of LOOKS) {
          const mini = p.full ? { ...p.d, acc: 'none' } : { ...d, ...p.d, acc: 'none' };
          const b = h('button', { type: 'button', class: 'hw-pal' + (p.full ? ' full' : ''), 'aria-label': `Use ${p.name}`, onclick: () => {
            if (p.full) { for (const k of LOOK_KEYS) if (p.d[k] !== undefined) d[k] = Array.isArray(p.d[k]) ? p.d[k].slice() : p.d[k]; }
            else Object.assign(d, p.d, { lolli: p.d.lolli.slice() });
            audio.sfx('pop'); paint();
          } });
          b.innerHTML = `<span class="hw-pal-hat">${catSVG(mini, { prop: true })}</span>`;
          b.append(h('small', { text: p.name }));
          pal.append(b);
        }
        panel.append(h('div', { class: 'hw-field' }, h('span', { class: 'hw-label', text: 'Start from a look' }), pal));
        for (const [k, l] of PARTS) panel.append(swatchRow(l, SWATCHES, d[k], c => { d[k] = c; }));
      } else if (tab === 'face') {
        const face = v => catSVG({ ...d, acc: 'none', blush: true, ...v }, { prop: false });
        panel.append(optionRow('Eyes', EYES, v => EYE_NAMES[v] || v, 'eyes', v => face({ eyes: v })));
        panel.append(optionRow('Mouth', MOUTHS, v => MOUTH_NAMES[v] || v, 'mouth', v => face({ mouth: v })));
        const on = d.blush !== false;
        const bl = h('button', { type: 'button', class: 'hw-toggle', role: 'switch', 'aria-checked': String(on), onclick: () => { d.blush = !on; audio.sfx('pop'); paint(); } },
          h('span', { class: 'hw-knob', 'aria-hidden': 'true' }), h('span', { text: on ? 'Rosy cheeks' : 'No blush' }));
        panel.append(h('div', { class: 'hw-field' }, h('span', { class: 'hw-label', text: 'Cheeks' }), bl));
      } else if (tab === 'extra') {
        panel.append(optionRow('Holding or wearing', ACCS, v => ACC_NAMES[v] || v, 'acc', v => catSVG({ ...d, acc: v }, { prop: false })));
        if (d.acc === 'lollipop') {
          const lol = d.lolli && d.lolli.length ? d.lolli : ['#ef5fa7', '#a46cf0'];
          panel.append(swatchRow('Lollipop', SWATCHES, lol[0], c => { d.lolli = [c, ...lol.slice(1)]; }));
          panel.append(swatchRow('Swirl', SWATCHES, lol[1], c => { d.lolli = [lol[0], c, ...lol.slice(2)]; }));
        }
        panel.append(swatchRow('Sticker background', SWATCHES, d.bg, c => { d.bg = c; }));
      } else {
        const inp = h('input', { type: 'text', class: 'hw-name', maxlength: String(NAME_MAX), value: d.name || '', placeholder: 'Pilot name', autocomplete: 'off', enterkeyhint: 'done', 'aria-label': 'Pilot name' });
        inp.addEventListener('input', () => { d.name = inp.value.trim().slice(0, NAME_MAX); paintTag(); paintDirty(); });
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
        panel.append(h('div', { class: 'hw-field' }, h('label', { class: 'hw-label', text: 'Name on the badge' }), inp,
          h('p', { class: 'hw-hint', text: `Shows up on the map and in the games. “Captain ${first}” is a strong choice.` })));
        const quick = h('div', { class: 'hw-names' });
        for (const n of NAMES) quick.append(h('button', { type: 'button', class: 'hw-chip', 'aria-pressed': String(d.name === n), onclick: () => { d.name = n; audio.sfx('click'); paint(); } }, n));
        panel.append(h('div', { class: 'hw-field' }, h('span', { class: 'hw-label', text: 'Ideas' }), quick));
      }
    }
    // arrow keys move between tabs
    tabs.addEventListener('keydown', e => {
      const i = TABS.findIndex(t => t[0] === tab), dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      tab = TABS[(i + dir + TABS.length) % TABS.length][0]; paintControls();
      tabs.querySelector(`[data-t="${tab}"]`).focus();
    });

    /* ---------- actions ---------- */
    const saveBtn = h('button', { type: 'button', class: 'btn solid big hw-save' }, icon('check'), h('span', { text: 'Save my pilot' }));
    saveBtn.onclick = () => {
      cat.saveDesign(d);
      d = { ...cat.getDesign() };
      paintDirty();
      audio.sfx('win');
      ctx.haptic('success');
      const r = stage.getBoundingClientRect();
      fx.burst(r.left + r.width / 2, r.top + r.height / 3, 34);
      store.stat('hatsSaved');
      if (!store.seen('hats-saved')) ctx.award(15, saveBtn);
      ctx.stamp();
      ctx.toast(`${d.name || 'Your pilot'} is ready for takeoff. Look for them on the map.`);
    };
    const ibtn = (name, label, short, cls) => h('button', { type: 'button', class: 'hw-ibtn ' + cls, 'aria-label': label, title: label }, icon(name), h('span', { text: short }));
    const shuffleBtn = ibtn('shuffle', 'Surprise me', 'Surprise', 'rose');
    shuffleBtn.onclick = () => {
      const r = a => a[Math.floor(Math.random() * a.length)];
      const cols = SWATCHES.slice(0, 10);
      Object.assign(d, { species: r(SPECIES), fur: r(FURS), side: r(cols), fl: r(cols), fr: r(cols), brim: r(cols), prop: r(cols), eyes: r(EYES), mouth: r(MOUTHS), acc: r(ACCS), lolli: [r(cols), r(cols), '#ffffff'] });
      audio.sfx('sparkle'); ctx.haptic('light'); paint();
    };
    const dlBtn = ibtn('download', 'Save as a sticker', 'Sticker', 'hud');
    dlBtn.onclick = async () => {
      const c = await renderPNG(d);
      if (!ctx.alive()) return;
      if (!c) { ctx.toast('Couldn’t draw the sticker on this browser.'); return; }
      const slug = (d.name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const ok = await downloadCanvas(c, `${slug || 'my'}-pilot-sticker.png`);
      ctx.toast(ok ? (U.gentle ? 'Sticker saved.' : `Sticker saved. Use it as a profile picture. ${me} would be honored.`) : 'The download didn’t start. Try a long-press on the preview instead.');
    };

    const intro = h('div', { class: 'wintro hw-intro' },
      h('p', { class: 'kicker rose', text: 'The Studio · Hat Workshop' }),
      h('h2', { text: 'Design your pilot' }),
      h('p', { class: 'lede', text: `Everyone in the ${U.verse} wears a propeller hat. This one is yours. Save it and it flies ${where}.` }));
    const left = h('div', { class: 'hw-left' }, spot, undoBtn);
    const acts = h('div', { class: 'hw-acts' }, shuffleBtn, saveBtn, dlBtn);
    const wrap = h('div', { class: 'hw' }, intro,
      h('div', { class: 'hw-grid' }, left, h('div', { class: 'hw-right card' }, tabs, panel), acts));
    ctx.root.append(wrap);

    // the preview sticks under the header bar on phones
    const fitTop = () => {
      const bar = ctx.frame && ctx.frame.el.querySelector('.wbar');
      wrap.style.setProperty('--hw-top', (bar ? Math.floor(bar.getBoundingClientRect().height) - 1 : 58) + 'px');
    };
    ctx.on(window, 'resize', fitTop);
    fitTop();
    // once the options are scrolled up under it, the preview shrinks so the options get the room
    const onScroll = () => { fitTop(); left.classList.toggle('compact', scrollY > 140 && innerWidth <= 820); };
    ctx.on(window, 'scroll', onScroll, { passive: true });
    onScroll();
    paint();
  },
};

// Draw the character to a canvas sticker (1024px wide) on its background color.
function renderPNG(d) {
  return new Promise(res => {
    const svgStr = catSVG(d, { bg: true, round: true });
    const img = new Image();
    img.onload = () => {
      const W = 1024, H = Math.round(W * 240 / 220);
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0, W, H);
      res(c);
    };
    img.onerror = () => res(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
  });
}
