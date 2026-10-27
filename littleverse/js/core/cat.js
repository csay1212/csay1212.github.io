// The propeller-hat characters: every person in a universe gets one.
// Customizable species, fur, hat, face and accessory. They fly around in the
// games, hide in the worlds, and star in the film.
import { store } from './store.js';

const BASE = { species: 'cat', fur: '#ffffff', hub: '#f5cc4a', blush: true };
export const DEFAULT_THEM = { ...BASE, name: 'You', side: '#f07ab0', fl: '#f7a6c4', fr: '#9b5ff0', brim: '#e3a6f5', prop: '#f490c4',
  eyes: 'wink', mouth: 'tongue', acc: 'lollipop', lolli: ['#ef5fa7', '#a46cf0', '#ffffff'], bg: '#3b2470' };
export const DEFAULT_ME = { ...BASE, name: 'Me', side: '#e8322d', fl: '#fdb515', fr: '#1c4fd0', brim: '#14a06d', prop: '#2a8fe8',
  eyes: 'dots', mouth: 'tongue', acc: 'lollipop', lolli: ['#e8322d', '#fdb515', '#14a06d', '#2a8fe8'], bg: '#14304a' };
// PRESETS.them / PRESETS.me are replaced with the active universe's characters when it starts playing.
export const PRESETS = { them: { ...DEFAULT_THEM }, me: { ...DEFAULT_ME } };
export function setPresets(them, me) {
  PRESETS.them = { ...DEFAULT_THEM, ...(them || {}) };
  PRESETS.me = { ...DEFAULT_ME, ...(me || {}) };
}
export const SPECIES = ['cat', 'bunny', 'bear', 'dog', 'fox', 'mouse'];
export const EYES = ['dots', 'wink', 'happy', 'sleepy', 'stars', 'hearts'];
export const MOUTHS = ['tongue', 'smile', 'open', 'cat'];
export const ACCS = ['none', 'lollipop', 'shades', 'bow', 'flower', 'specs', 'balloon'];

export function getDesign() {
  const d = store.get('hat', null);
  return d && typeof d === 'object' ? { ...PRESETS.them, ...d } : { ...PRESETS.them };
}
export function saveDesign(d) { store.set('hat', { ...d }); }

const INK = '#16121f';
// lighten (amt > 0) or darken (amt < 0) a hex color
export function shade(hex, amt) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return hex;
  const n = parseInt(m[1], 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = v => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt);
  return '#' + [f(r), f(g), f(b)].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}
function earsBack(d) {
  const fur = d.fur || '#fff', inner = '#ffc7d6';
  switch (d.species) {
    case 'bunny': return `<g transform="rotate(-19 54 98)"><ellipse cx="54" cy="54" rx="16" ry="44" fill="${fur}" stroke="${INK}" stroke-width="6"/><ellipse cx="54" cy="58" rx="6.5" ry="30" fill="${inner}"/></g>
      <g transform="rotate(19 146 98)"><ellipse cx="146" cy="54" rx="16" ry="44" fill="${fur}" stroke="${INK}" stroke-width="6"/><ellipse cx="146" cy="58" rx="6.5" ry="30" fill="${inner}"/></g>`;
    case 'bear': return `<circle cx="28" cy="84" r="24" fill="${fur}" stroke="${INK}" stroke-width="6"/><circle cx="28" cy="84" r="11" fill="${shade(fur, -.18)}"/>
      <circle cx="172" cy="84" r="24" fill="${fur}" stroke="${INK}" stroke-width="6"/><circle cx="172" cy="84" r="11" fill="${shade(fur, -.18)}"/>`;
    case 'mouse': return `<circle cx="28" cy="84" r="34" fill="${fur}" stroke="${INK}" stroke-width="6"/><circle cx="28" cy="86" r="20" fill="${inner}"/>
      <circle cx="172" cy="84" r="34" fill="${fur}" stroke="${INK}" stroke-width="6"/><circle cx="172" cy="86" r="20" fill="${inner}"/>`;
    case 'fox': return `<path d="M28 120 L10 40 L72 84Z" fill="${fur}" stroke="${INK}" stroke-width="6"/><path d="M22 66 L10 40 L36 58Z" fill="${INK}"/>
      <path d="M172 120 L190 40 L128 84Z" fill="${fur}" stroke="${INK}" stroke-width="6"/><path d="M178 66 L190 40 L164 58Z" fill="${INK}"/>`;
    case 'dog': return '';
    default: return `<path d="M30 118 L18 56 L70 86Z" fill="${fur}" stroke="${INK}" stroke-width="6"/>
    <path d="M170 118 L182 56 L130 86Z" fill="${fur}" stroke="${INK}" stroke-width="6"/>
    <path d="M30 104 L24 70 L52 88Z" fill="${inner}"/><path d="M170 104 L176 70 L148 88Z" fill="${inner}"/>`;
  }
}
function earsFront(d) {
  if (d.species !== 'dog') return '';
  const c = shade(d.fur || '#fff', -.28);
  return `<path d="M34 104 Q10 112 12 160 Q14 178 30 174 Q46 168 50 126 Q50 108 34 104Z" fill="${c}" stroke="${INK}" stroke-width="5.5"/>
    <path d="M166 104 Q190 112 188 160 Q186 178 170 174 Q154 168 150 126 Q150 108 166 104Z" fill="${c}" stroke="${INK}" stroke-width="5.5"/>`;
}
function spiral(cx, cy, r, turns) {
  let d = '';
  const steps = 60 * turns;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, a = t * turns * 6.283, rr = r * t;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1);
  }
  return d;
}
function star(cx, cy, r, fill) {
  let d = '';
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1); }
  return `<path d="${d}Z" fill="${fill}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
}
function heart(cx, cy, s, fill) {
  return `<path d="M${cx} ${cy + s * .9} C${cx - s * 1.4} ${cy - s * .1} ${cx - s * .9} ${cy - s * 1.2} ${cx} ${cy - s * .45} C${cx + s * .9} ${cy - s * 1.2} ${cx + s * 1.4} ${cy - s * .1} ${cx} ${cy + s * .9}Z" fill="${fill}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
}

function eyesSVG(type) {
  const L = 68, R = 132, Y = 140;
  switch (type) {
    case 'wink': return `<circle cx="${L}" cy="${Y}" r="8.5" fill="${INK}"/><path d="M${R - 8} ${Y - 8} L${R + 8} ${Y} L${R - 8} ${Y + 8}" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    case 'happy': return `<path d="M${L - 10} ${Y + 4} Q${L} ${Y - 10} ${L + 10} ${Y + 4}M${R - 10} ${Y + 4} Q${R} ${Y - 10} ${R + 10} ${Y + 4}" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round"/>`;
    case 'sleepy': return `<path d="M${L - 10} ${Y - 1} Q${L} ${Y + 7} ${L + 10} ${Y - 1}M${R - 10} ${Y - 1} Q${R} ${Y + 7} ${R + 10} ${Y - 1}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
    case 'stars': return star(L, Y, 12, '#f5cc4a') + star(R, Y, 12, '#f5cc4a');
    case 'hearts': return heart(L, Y, 10, '#ef5fa7') + heart(R, Y, 10, '#ef5fa7');
    default: return `<circle cx="${L}" cy="${Y}" r="8.5" fill="${INK}"/><circle cx="${R}" cy="${Y}" r="8.5" fill="${INK}"/><circle cx="${L + 3}" cy="${Y - 3}" r="2.4" fill="#fff"/><circle cx="${R + 3}" cy="${Y - 3}" r="2.4" fill="#fff"/>`;
  }
}
function mouthSVG(type) {
  const w = `<path d="M84 151 Q92 161 100 152 Q108 161 116 151" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
  switch (type) {
    case 'smile': return w;
    case 'open': return `<path d="M88 152 Q100 150 112 152 Q110 172 100 172 Q90 172 88 152Z" fill="#c2405f" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/><path d="M92 165 Q100 159 108 165 Q104 171 100 171 Q96 171 92 165Z" fill="#f49ab0"/>`;
    case 'cat': return `<path d="M92 150 L100 155 L108 150" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M100 155 V160" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
    default: return `<path d="M93 156 Q92 174 100 174 Q108 174 107 156Z" fill="#f49ab0" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M100 160 V168" stroke="#d26a86" stroke-width="2.5" stroke-linecap="round"/>` + w;
  }
}
function accSVG(d) {
  switch (d.acc) {
    case 'lollipop': {
      const cols = (d.lolli && d.lolli.length ? d.lolli : ['#ef5fa7', '#a46cf0']);
      let sp = '';
      cols.slice(1).forEach((c, i) => { sp += `<path d="${spiral(42, 168, 25, 2.2)}" fill="none" stroke="${c}" stroke-width="${7 - i * 1.5}" stroke-linecap="round" transform="rotate(${i * 120} 42 168)"/>`; });
      return `<rect x="38" y="186" width="8" height="40" rx="3" fill="#f6eee3" stroke="${INK}" stroke-width="3"/>
        <circle cx="42" cy="168" r="27" fill="${cols[0]}" stroke="${INK}" stroke-width="5"/>${sp}
        <circle cx="42" cy="168" r="27" fill="none" stroke="${INK}" stroke-width="5"/>
        <ellipse cx="33" cy="157" rx="7" ry="4" fill="#fff" opacity=".7" transform="rotate(-30 33 157)"/>
        <path d="M60 182 Q70 170 80 182 Q74 196 62 192Z" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
    }
    case 'shades': return `<g><path d="M48 132 H88 Q90 152 74 154 Q54 154 50 140Z M112 132 H152 Q150 152 136 154 Q114 154 112 140Z" fill="${INK}"/><path d="M88 136 Q100 130 112 136" fill="none" stroke="${INK}" stroke-width="4"/><path d="M56 137 L66 137 M120 137 L130 137" stroke="#8b8bff" stroke-width="3" stroke-linecap="round" opacity=".8"/></g>`;
    case 'specs': return `<g fill="rgba(200,230,255,.25)" stroke="${INK}" stroke-width="4"><circle cx="68" cy="140" r="17"/><circle cx="132" cy="140" r="17"/></g><path d="M85 138 Q100 130 115 138" fill="none" stroke="${INK}" stroke-width="4"/>`;
    case 'bow': return `<g transform="translate(150 62) rotate(18)"><path d="M0 0 L-24 -14 L-24 14Z M0 0 L24 -14 L24 14Z" fill="#ef5fa7" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><circle r="6" fill="#ff8fc4" stroke="${INK}" stroke-width="3"/></g>`;
    case 'flower': {
      let p = '';
      for (let i = 0; i < 5; i++) { const a = i * 72 * Math.PI / 180; p += `<circle cx="${(Math.cos(a) * 9).toFixed(1)}" cy="${(Math.sin(a) * 9).toFixed(1)}" r="8" fill="#fff4a8" stroke="${INK}" stroke-width="2.5"/>`; }
      return `<g transform="translate(46 88)">${p}<circle r="6" fill="#f5a524" stroke="${INK}" stroke-width="2.5"/></g>`;
    }
    case 'balloon': return `<path d="M168 196 Q176 170 168 150 Q162 132 172 118" fill="none" stroke="${INK}" stroke-width="2.5"/><ellipse cx="176" cy="100" rx="18" ry="22" fill="#ef7fb0" stroke="${INK}" stroke-width="4"/><path d="M172 121 L180 121 L176 116Z" fill="#ef7fb0" stroke="${INK}" stroke-width="2.5"/><ellipse cx="170" cy="92" rx="4" ry="7" fill="#fff" opacity=".6"/>`;
    default: return '';
  }
}

// Returns an <svg> string. opts: {prop:true, bg:false, spin:false, cls}
export function catSVG(design, opts = {}) {
  const d = { ...PRESETS.them, ...design };
  const prop = opts.prop !== false;
  const vb = opts.bg ? '-10 -10 220 240' : (d.acc === 'lollipop' ? '0 0 200 230' : '0 0 200 200');
  const bg = opts.bg ? `<rect x="-10" y="-10" width="220" height="240" rx="${opts.round ? 110 : 24}" fill="${d.bg}"/>` : '';
  const blush = d.blush !== false ? `<g opacity=".85"><ellipse cx="46" cy="160" rx="13" ry="7.5" fill="#ffb3c6"/><ellipse cx="154" cy="160" rx="13" ry="7.5" fill="#ffb3c6"/>
    <path d="M40 162 l3 -5 M46 162 l3 -5 M148 162 l3 -5 M154 162 l3 -5" stroke="#f0678f" stroke-width="2" stroke-linecap="round"/></g>` : '';
  const propeller = prop ? `<g class="prop"><ellipse cx="71" cy="18" rx="31" ry="7.5" fill="${d.prop}" stroke="${INK}" stroke-width="4"/><ellipse cx="129" cy="18" rx="31" ry="7.5" fill="${d.prop}" stroke="${INK}" stroke-width="4"/>
     <ellipse cx="62" cy="15.5" rx="12" ry="2.4" fill="#fff" opacity=".55"/><ellipse cx="120" cy="15.5" rx="12" ry="2.4" fill="#fff" opacity=".55"/></g>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" overflow="visible" class="cat-svg ${opts.spin ? 'spin' : ''} ${opts.cls || ''}" role="img" aria-label="${(d.name || 'friend').replace(/["<>&]/g, '')} in a propeller hat">${bg}
  <g stroke-linejoin="round">
    ${earsBack(d)}
    <ellipse cx="100" cy="134" rx="83" ry="62" fill="${d.fur || '#fff'}" stroke="${INK}" stroke-width="6"/>
    ${d.species === 'fox' ? `<path d="M30 150 Q60 196 100 194 Q140 196 170 150 Q150 178 100 180 Q50 178 30 150Z" fill="#fff" opacity=".95"/>` : ''}
    ${['cat', 'fox', 'mouse', undefined].includes(d.species) ? `<path d="M4 136 L32 141 M4 151 L32 150 M196 136 L168 141 M196 151 L168 150" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>` : ''}
    ${!d.species || d.species === 'cat' ? `<rect x="79" y="108" width="9" height="19" rx="4.5" fill="${shade(d.fur || '#fff', -.25)}"/><rect x="95.5" y="106" width="9" height="21" rx="4.5" fill="${shade(d.fur || '#fff', -.25)}"/><rect x="112" y="108" width="9" height="19" rx="4.5" fill="${shade(d.fur || '#fff', -.25)}"/>` : ''}
    ${['dog', 'bear', 'mouse'].includes(d.species) ? `<ellipse cx="100" cy="146" rx="9" ry="6.5" fill="${INK}"/><ellipse cx="97" cy="144" rx="3" ry="1.8" fill="#fff" opacity=".6"/>` : ''}
    ${blush}
    ${earsFront(d)}
    ${eyesSVG(d.eyes)}
    ${mouthSVG(d.mouth)}
    <rect x="96.5" y="20" width="7" height="16" rx="2" fill="${d.hub}" stroke="${INK}" stroke-width="3"/>
    <path d="M34 99 C34 52 66 34 100 34 Q74 48 62 99Z" fill="${d.side}"/>
    <path d="M62 99 Q74 48 100 34 L100 99Z" fill="${d.fl}"/>
    <path d="M100 99 L100 34 Q126 48 138 99Z" fill="${d.fr}"/>
    <path d="M138 99 Q126 48 100 34 C134 34 166 52 166 99Z" fill="${d.side}"/>
    <path d="M62 99 Q74 48 100 34 M100 34 V99 M138 99 Q126 48 100 34" fill="none" stroke="${INK}" stroke-width="3.5"/>
    <path d="M34 99 C34 52 66 34 100 34 C134 34 166 52 166 99" fill="none" stroke="${INK}" stroke-width="5.5"/>
    <path d="M70 52 Q82 40 96 38" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".55"/>
    <path d="M26 98 Q100 84 174 98 Q182 110 168 114 Q100 102 32 114 Q18 110 26 98Z" fill="${d.brim}" stroke="${INK}" stroke-width="5.5"/>
    <path d="M44 100 Q100 92 156 100" fill="none" stroke="#fff" stroke-width="3" opacity=".4" stroke-linecap="round"/>
    ${propeller}
    <circle cx="100" cy="18" r="6.5" fill="${d.hub}" stroke="${INK}" stroke-width="3.5"/>
    ${accSVG(d)}
  </g></svg>`;
}

// Rasterize a cat for canvas games. Resolves to an <img> sized size×size(ish).
const cache = new Map();
export function catImage(design, size = 128, opts = {}) {
  const svgStr = catSVG(design, { ...opts, prop: opts.prop ?? false });
  const key = svgStr + size;
  if (cache.has(key)) return cache.get(key);
  const p = new Promise(res => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
    img.width = size;
  });
  cache.set(key, p);
  return p;
}
// Draw a spinning propeller on a canvas, matching catSVG's propeller.
// (x, y) = top-left of where the cat image is drawn, s = drawn width in px (cat viewBox is 200 wide)
export function drawProp(c, x, y, s, phase, design) {
  const d = { ...PRESETS.them, ...design };
  const k = s / 200, cx = x + 100 * k, cy = y + 18 * k;
  const sx = Math.abs(Math.cos(phase)) * .92 + .08;
  c.save(); c.translate(cx, cy); c.scale(sx, 1);
  c.lineWidth = 4 * k; c.strokeStyle = INK; c.fillStyle = d.prop;
  for (const dx of [-29, 29]) { c.beginPath(); c.ellipse(dx * k, 0, 31 * k, 7.5 * k, 0, 0, 6.283); c.fill(); c.stroke(); }
  c.restore();
  c.beginPath(); c.arc(cx, cy, 6.5 * k, 0, 6.283); c.fillStyle = d.hub; c.fill(); c.lineWidth = 3.5 * k; c.strokeStyle = INK; c.stroke();
}
// height/width ratio of catSVG output (lollipop makes it taller)
export const catAspect = design => (({ ...PRESETS.them, ...design }).acc === 'lollipop' ? 230 / 200 : 1);
