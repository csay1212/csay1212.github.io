// Hand-drawn planets for every world on the map. Each returns an SVG string
// (viewBox 0 0 160 160, planet centered at 80,80). Unknown worlds get a
// generated ringed planet, so a new world never shows up blank.
const INK = '#16121f';
const g = (id, a, b, c) => `<radialGradient id="${id}" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="${a}"/><stop offset=".6" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>`;
const ball = (id, r = 50) => `<circle cx="80" cy="80" r="${r}" fill="url(#${id})"/>`;
const rim = (r = 50, c = 'rgba(255,255,255,.35)') => `<circle cx="80" cy="80" r="${r}" fill="none" stroke="${c}" stroke-width="1.5"/>`;
// soft halo behind each planet (a radial gradient: much cheaper than a blur filter on phones)
let glowN = 0;
const glow = (c) => { const id = 'plg' + (glowN++); return `<defs><radialGradient id="${id}"><stop offset=".55" stop-color="${c}" stop-opacity=".28"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs><circle cx="80" cy="80" r="74" fill="url(#${id})"/>`; };
const defsBase = '';

const ART = {
  flight: p => `<defs>${defsBase}${g(p + 'a', '#d9f1ff', '#7cc4f5', '#2f6fb4')}</defs>${glow('#9fd3ff')}${ball(p + 'a')}
    <g fill="#fff" opacity=".9"><ellipse cx="62" cy="92" rx="22" ry="8"/><ellipse cx="76" cy="86" rx="14" ry="10"/><ellipse cx="104" cy="68" rx="16" ry="6"/><ellipse cx="96" cy="64" rx="9" ry="7"/></g>
    ${rim()}<rect x="77" y="20" width="6" height="14" rx="2" fill="#f5cc4a" stroke="${INK}" stroke-width="2"/>
    <g class="pl-prop"><ellipse cx="62" cy="20" rx="20" ry="5" fill="#2a8fe8" stroke="${INK}" stroke-width="2.5"/><ellipse cx="98" cy="20" rx="20" ry="5" fill="#2a8fe8" stroke="${INK}" stroke-width="2.5"/></g>
    <circle cx="80" cy="20" r="4.5" fill="#f5cc4a" stroke="${INK}" stroke-width="2.5"/>`,
  bakery: p => `<defs>${defsBase}${g(p + 'a', '#ffd6e8', '#ef7fb0', '#9b3e74')}<clipPath id="${p}c"><circle cx="80" cy="80" r="50"/></clipPath></defs>${glow('#ef7fb0')}${ball(p + 'a')}
    <g clip-path="url(#${p}c)"><path d="M20 60 Q30 50 40 62 Q46 80 54 64 Q62 48 70 66 Q76 86 86 62 Q94 46 102 64 Q110 82 118 60 Q126 48 140 58 L140 20 L20 20Z" fill="#f6eee3"/>
    <g fill="#86e6d8"><rect x="50" y="90" width="7" height="3" rx="1.5" transform="rotate(30 53 91)"/><rect x="92" y="98" width="7" height="3" rx="1.5" transform="rotate(-20 95 99)"/><rect x="70" y="112" width="7" height="3" rx="1.5"/></g>
    <g fill="#f5cc4a"><rect x="104" y="84" width="7" height="3" rx="1.5" transform="rotate(60 107 85)"/><rect x="62" y="100" width="7" height="3" rx="1.5" transform="rotate(-50 65 101)"/></g></g>
    ${rim()}<rect x="76" y="14" width="8" height="22" rx="2" fill="#b59cff" stroke="${INK}" stroke-width="2"/><path class="pl-flame" d="M80 2 C85 8 85 13 80 14 C75 13 75 8 80 2Z" fill="#ffcf4d"/>`,
  probe: p => `<defs>${defsBase}${g(p + 'a', '#c9fff4', '#86e6d8', '#2b7d78')}</defs>${glow('#86e6d8')}${ball(p + 'a')}
    <g fill="rgba(20,60,70,.35)"><circle cx="62" cy="66" r="9"/><circle cx="98" cy="92" r="12"/><circle cx="74" cy="106" r="6"/><circle cx="104" cy="58" r="5"/></g>${rim()}
    <g class="pl-orbit"><ellipse cx="80" cy="80" rx="70" ry="22" fill="none" stroke="rgba(134,230,216,.35)" stroke-dasharray="3 5" transform="rotate(-18 80 80)"/>
    <g class="pl-sat"><rect x="140" y="60" width="10" height="8" rx="2" fill="#f6eee3" stroke="${INK}" stroke-width="1.5"/><rect x="130" y="62" width="9" height="4" fill="#9fd3ff"/><rect x="151" y="62" width="9" height="4" fill="#9fd3ff"/></g></g>`,
  tapdance: p => `<defs>${defsBase}${g(p + 'a', '#fff2b8', '#f5cc4a', '#b07a14')}</defs>${glow('#f5cc4a')}
    <ellipse cx="80" cy="84" rx="76" ry="16" fill="none" stroke="#f6eee3" stroke-width="9" opacity=".95" transform="rotate(-10 80 84)"/>
    ${ball(p + 'a', 46)}<circle cx="64" cy="64" r="7" fill="#fff" opacity=".35"/>${rim(46)}
    <g transform="rotate(-10 80 84)"><path d="M4 84 A76 16 0 0 0 156 84" fill="none" stroke="#f6eee3" stroke-width="9"/>
    <path d="M4 84 A76 16 0 0 0 156 84" fill="none" stroke="${INK}" stroke-width="5" stroke-dasharray="3 9" opacity=".85"/></g>`,
  chords: p => `<defs>${defsBase}<linearGradient id="${p}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e5dbff"/><stop offset=".5" stop-color="#b59cff"/><stop offset="1" stop-color="#5b3fb0"/></linearGradient></defs>${glow('#b59cff')}
    <path d="M80 26 L130 62 L111 122 L49 122 L30 62Z" fill="url(#${p}a)" stroke="#f6eee3" stroke-width="2"/>
    <path d="M80 26 L80 78 L130 62 M80 78 L111 122 M80 78 L49 122 M80 78 L30 62" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1.5"/>
    <g class="pl-notes" fill="#f6eee3"><circle cx="80" cy="12" r="4"/><circle cx="146" cy="58" r="4"/><circle cx="122" cy="138" r="4"/><circle cx="38" cy="138" r="4"/><circle cx="14" cy="58" r="4"/></g>`,
  puzzle: p => `<defs>${defsBase}${g(p + 'a', '#ffe0d2', '#ff9a7a', '#b04f3a')}<clipPath id="${p}c"><circle cx="80" cy="80" r="50"/></clipPath></defs>${glow('#ff9a7a')}${ball(p + 'a')}
    <g clip-path="url(#${p}c)" fill="none" stroke="rgba(60,20,20,.45)" stroke-width="2.5"><path d="M80 20 V60 C70 58 70 74 80 72 V140"/><path d="M20 80 H58 C56 70 72 70 70 80 H140"/><path d="M80 100 C90 98 90 114 80 112"/><path d="M100 80 C98 90 114 90 112 80"/></g>
    <g transform="translate(118 30) rotate(18)"><path d="M0 0 H16 C14 -8 26 -8 24 0 H32 V24 H0Z" fill="#ffd2c2" stroke="${INK}" stroke-width="2"/></g>${rim()}`,
  wordle: (p, o = {}) => {
    const word = (o.letters || 'WORD').toUpperCase().slice(0, 5).split('');
    const cols = ['#6aaa64', '#c9b458', '#6aaa64', '#3a3a4c', '#c9b458'];
    return `<defs>${defsBase}${g(p + 'a', '#d4fff6', '#86e6d8', '#2d7a73')}</defs>${glow('#86e6d8')}${ball(p + 'a', 44)}${rim(44)}
    <g class="pl-orbit" font-family="JetBrains Mono, monospace" font-weight="700" font-size="14" text-anchor="middle">
      ${word.map((l, i) => {
        const r = (i / word.length * 360 - 90) * Math.PI / 180, x = 80 + Math.cos(r) * 66, y = 80 + Math.sin(r) * 66;
        return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><rect x="-11" y="-11" width="22" height="22" rx="3" fill="${cols[i]}" stroke="#f6eee3" stroke-width="1.5"/><text y="5" fill="#fff">${esc(l)}</text></g>`;
      }).join('')}</g>`;
  },
  hats: p => `<defs>${defsBase}${g(p + 'a', '#ffe8f2', '#f3b6d2', '#a2557f')}</defs>${glow('#ef7fb0')}${ball(p + 'a', 48)}
    <g transform="translate(80 84)"><circle cx="-16" cy="6" r="4" fill="${INK}"/><circle cx="16" cy="6" r="4" fill="${INK}"/><path d="M-8 16 Q-4 20 0 16 Q4 20 8 16" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="-26" cy="16" rx="6" ry="3.5" fill="#ff9ab8" opacity=".7"/><ellipse cx="26" cy="16" rx="6" ry="3.5" fill="#ff9ab8" opacity=".7"/></g>
    <path d="M38 66 C38 36 58 24 80 24 C102 24 122 36 122 66Z" fill="#f07ab0" stroke="${INK}" stroke-width="3"/>
    <path d="M58 66 Q66 34 80 24 V66Z" fill="#f7a6c4"/><path d="M80 66 V24 Q94 34 102 66Z" fill="#9b5ff0"/>
    <path d="M58 66 Q66 34 80 24 M80 24 V66 M102 66 Q94 34 80 24" fill="none" stroke="${INK}" stroke-width="2"/>
    <path d="M30 64 Q80 54 130 64 Q134 72 124 74 Q80 66 36 74 Q26 72 30 64Z" fill="#e3a6f5" stroke="${INK}" stroke-width="3"/>
    <rect x="77" y="10" width="6" height="14" rx="2" fill="#f5cc4a" stroke="${INK}" stroke-width="2"/>
    <g class="pl-prop"><ellipse cx="63" cy="10" rx="17" ry="4.5" fill="#f490c4" stroke="${INK}" stroke-width="2.2"/><ellipse cx="97" cy="10" rx="17" ry="4.5" fill="#f490c4" stroke="${INK}" stroke-width="2.2"/></g><circle cx="80" cy="10" r="4" fill="#f5cc4a" stroke="${INK}" stroke-width="2"/>`,
  stars: p => `<defs>${defsBase}${g(p + 'a', '#4a3d8f', '#221a55', '#0b0824')}</defs>${glow('#f5cc4a')}${ball(p + 'a')}
    <g stroke="rgba(245,204,74,.7)" stroke-width="1.4" fill="none"><path d="M50 70 L66 58 L84 64 L100 52 L112 72 L96 96 L70 98 L66 58"/></g>
    <g fill="#ffe9a8">${[[50, 70], [66, 58], [84, 64], [100, 52], [112, 72], [96, 96], [70, 98]].map(([x, y], i) => `<circle class="pl-tw" style="animation-delay:${-i * .4}s" cx="${x}" cy="${y}" r="${i % 3 ? 2.2 : 3.2}"/>`).join('')}</g>
    ${rim(50, 'rgba(245,204,74,.4)')}<path class="pl-tw" d="M130 26 L133 34 L141 37 L133 40 L130 48 L127 40 L119 37 L127 34Z" fill="#f5cc4a"/>`,
  gacha: p => `<defs>${defsBase}<radialGradient id="${p}a" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="rgba(255,255,255,.45)"/><stop offset=".7" stop-color="rgba(200,220,255,.12)"/><stop offset="1" stop-color="rgba(200,220,255,.3)"/></radialGradient><clipPath id="${p}c"><circle cx="80" cy="70" r="46"/></clipPath></defs>${glow('#ef7fb0')}
    <g clip-path="url(#${p}c)">${[[60, 96, '#ef7fb0'], [84, 100, '#f5cc4a'], [106, 94, '#86e6d8'], [70, 76, '#b59cff'], [96, 78, '#ff9a7a'], [58, 58, '#9fd3ff'], [84, 56, '#ef7fb0'], [108, 64, '#f5cc4a'], [76, 112, '#86e6d8'], [100, 114, '#b59cff']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="11" fill="${c}" stroke="${INK}" stroke-width="1.5"/><path d="M${x - 11} ${y} H${x + 11}" stroke="${INK}" stroke-width="1" opacity=".5"/>`).join('')}</g>
    <circle cx="80" cy="70" r="46" fill="url(#${p}a)" stroke="#f6eee3" stroke-width="2.5"/><path d="M52 50 Q60 36 76 32" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>
    <path d="M44 112 H116 L122 148 H38Z" fill="#e8322d" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><rect x="70" y="124" width="20" height="14" rx="3" fill="#2a1d55" stroke="${INK}" stroke-width="2"/><circle cx="104" cy="128" r="6" fill="#f5cc4a" stroke="${INK}" stroke-width="2"/>`,
  mail: p => `<defs>${defsBase}${g(p + 'a', '#ffe1ee', '#ef7fb0', '#933865')}<clipPath id="${p}c"><circle cx="80" cy="80" r="50"/></clipPath></defs>${glow('#ef7fb0')}${ball(p + 'a')}
    <g clip-path="url(#${p}c)"><rect x="34" y="56" width="92" height="60" rx="4" fill="#f6eee3" stroke="${INK}" stroke-width="2.5"/><path d="M34 58 L80 92 L126 58" fill="#efe2cf" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/></g>
    <path d="M80 84 C74 76 66 82 72 90 L80 98 L88 90 C94 82 86 76 80 84Z" fill="#e23f6e" stroke="${INK}" stroke-width="2"/>${rim()}`,
  coupons: p => `<defs>${defsBase}${g(p + 'a', '#fff2c2', '#f5cc4a', '#a97808')}</defs>${glow('#f5cc4a')}${ball(p + 'a', 46)}${rim(46)}
    <text x="80" y="92" text-anchor="middle" font-family="Italiana, Georgia, serif" font-size="34" fill="#5a3b00">✦</text>
    <g transform="rotate(-16 80 80)"><path d="M10 80 A70 18 0 0 0 150 80" fill="none" stroke="#ef7fb0" stroke-width="14"/><path d="M10 80 A70 18 0 0 0 150 80" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="2 6" opacity=".9"/></g>`,
  almanac: p => `<defs>${defsBase}${g(p + 'a', '#d7ecff', '#6e9de0', '#233b7a')}<linearGradient id="${p}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient></defs>${glow('#9fd3ff')}${ball(p + 'a')}
    <g fill="rgba(255,255,255,.18)"><ellipse cx="66" cy="70" rx="26" ry="8" transform="rotate(-20 66 70)"/><ellipse cx="96" cy="100" rx="22" ry="6" transform="rotate(-20 96 100)"/></g>${rim()}
    <g class="pl-meteors" stroke="url(#${p}m)" stroke-width="2.4" stroke-linecap="round"><path d="M100 4 L132 28"/><path d="M124 0 L152 22" style="animation-delay:-.6s"/><path d="M134 34 L156 52" style="animation-delay:-1.2s"/></g>`,
  mixtape: p => `<defs>${defsBase}</defs>${glow('#b59cff')}<g class="pl-spin"><circle cx="80" cy="80" r="52" fill="#141020" stroke="#2c2540" stroke-width="2"/>
    ${[44, 38, 32, 26].map(r => `<circle cx="80" cy="80" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="1.2"/>`).join('')}
    <path d="M44 50 A50 50 0 0 1 80 30" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="3"/>
    <circle cx="80" cy="80" r="18" fill="#b59cff"/><circle cx="80" cy="80" r="3" fill="#141020"/><text x="80" y="74" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="5" fill="#2a1d55">SIDE A</text></g>`,
  trailer: p => `<defs>${defsBase}${g(p + 'a', '#ffc2bd', '#ff5a4e', '#8a1d16')}</defs>${glow('#ff5a4e')}<g class="pl-spin">${ball(p + 'a', 48)}
    ${[0, 72, 144, 216, 288].map(a => { const r = a * Math.PI / 180; return `<circle cx="${(80 + Math.cos(r) * 26).toFixed(1)}" cy="${(80 + Math.sin(r) * 26).toFixed(1)}" r="10" fill="#2a0c0a" opacity=".75"/>`; }).join('')}
    <circle cx="80" cy="80" r="7" fill="#2a0c0a"/>${rim(48)}</g>
    <g transform="rotate(14 80 80)"><rect x="0" y="118" width="160" height="18" fill="#16121f"/>${Array.from({ length: 13 }, (_, i) => `<rect x="${4 + i * 12}" y="121" width="6" height="4" rx="1" fill="#f6eee3"/><rect x="${4 + i * 12}" y="129" width="6" height="4" rx="1" fill="#f6eee3"/>`).join('')}</g>`,
  finale: p => `<defs>${defsBase}<radialGradient id="${p}a" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff8dc"/><stop offset=".4" stop-color="#f5cc4a"/><stop offset="1" stop-color="#f5cc4a" stop-opacity="0"/></radialGradient></defs>
    <circle cx="80" cy="80" r="70" fill="url(#${p}a)" opacity=".5"/>
    <g class="pl-burst" stroke-linecap="round" stroke-width="3">${Array.from({ length: 16 }, (_, i) => { const a = i / 16 * 6.283, c = ['#f5cc4a', '#ef7fb0', '#86e6d8', '#b59cff'][i % 4]; return `<path d="M${(80 + Math.cos(a) * 22).toFixed(1)} ${(80 + Math.sin(a) * 22).toFixed(1)} L${(80 + Math.cos(a) * 58).toFixed(1)} ${(80 + Math.sin(a) * 58).toFixed(1)}" stroke="${c}"/>`; }).join('')}</g>
    <circle cx="80" cy="80" r="16" fill="#fff4c4"/>`,
  reasons: p => `<defs>${defsBase}${g(p + 'a', '#efe6ff', '#b59cff', '#5b3fb0')}</defs>${glow('#b59cff')}${ball(p + 'a', 46)}
    <g fill="rgba(255,255,255,.16)"><ellipse cx="64" cy="66" rx="20" ry="7" transform="rotate(-24 64 66)"/><ellipse cx="98" cy="102" rx="16" ry="5" transform="rotate(-24 98 102)"/></g>${rim(46)}
    <g class="pl-orbit">
      <g transform="translate(132 46) rotate(16)"><rect x="-13" y="-18" width="26" height="36" rx="4" fill="#f6eee3" stroke="${INK}" stroke-width="2"/><path d="M0 -3 C-3 -8 -9 -5 -6 0 L0 6 L6 0 C9 -5 3 -8 0 -3Z" fill="#e23f6e"/></g>
      <g transform="translate(28 114) rotate(-18)"><rect x="-11" y="-15" width="22" height="30" rx="3.5" fill="#fff4c4" stroke="${INK}" stroke-width="2"/><path d="M0 -6 L2 -1 L7 -1 L3 2 L4.5 7 L0 4 L-4.5 7 L-3 2 L-7 -1 L-2 -1Z" fill="#f5cc4a" stroke="${INK}" stroke-width="1"/></g>
    </g>`,
  memories: p => `<defs>${defsBase}${g(p + 'a', '#ffe7d8', '#ff9a7a', '#a8503a')}<clipPath id="${p}c"><rect x="-17" y="-17" width="34" height="27"/></clipPath></defs>${glow('#ff9a7a')}${ball(p + 'a', 46)}
    <g fill="rgba(90,30,20,.22)"><circle cx="62" cy="96" r="8"/><circle cx="100" cy="70" r="5"/><circle cx="92" cy="108" r="4"/></g>${rim(46)}
    <g transform="translate(110 44) rotate(14)">
      <rect x="-22" y="-22" width="44" height="50" rx="2" fill="#fbf6ee" stroke="${INK}" stroke-width="2"/>
      <g clip-path="url(#${p}c)"><rect x="-17" y="-17" width="34" height="27" fill="#9fd3ff"/><path d="M-17 10 L-6 -2 L2 6 L8 0 L17 10Z" fill="#3b6544"/><circle cx="9" cy="-9" r="4" fill="#f5cc4a"/></g>
    </g>
    <g class="pl-tw"><path d="M36 40 L38 46 L44 48 L38 50 L36 56 L34 50 L28 48 L34 46Z" fill="#fff4c4"/></g>`,
  observatory: p => `<defs>${defsBase}</defs>${glow('#f5cc4a')}<path d="M30 96 A50 50 0 0 1 130 96Z" fill="#17123d" stroke="#f5cc4a" stroke-width="2.5"/><rect x="74" y="50" width="12" height="46" rx="2" fill="#0c0b24" stroke="#f5cc4a" stroke-width="2"/>
    <rect x="22" y="96" width="116" height="30" fill="#17123d" stroke="#f5cc4a" stroke-width="2.5"/><rect x="70" y="106" width="20" height="20" rx="10" fill="#0c0b24" stroke="#f5cc4a" stroke-width="2"/><line x1="10" y1="126" x2="150" y2="126" stroke="#f5cc4a" stroke-width="2.5"/>
    <path d="M80 50 L66 6 L94 6Z" fill="#f5cc4a" opacity=".25"/>`,
};

// A planet for any world id we don't have art for: a ringed planet whose
// colors come from the id, so every new world still gets its own look.
const HUES = [['#ffe0ec', '#ef7fb0', '#8f3a68'], ['#fff2c2', '#f5cc4a', '#a97808'], ['#d4fff6', '#86e6d8', '#2d7a73'], ['#efe6ff', '#b59cff', '#5b3fb0'], ['#ffe7d8', '#ff9a7a', '#a8503a'], ['#d9f1ff', '#9fd3ff', '#2f6fb4']];
const generic = (p, id) => {
  let n = 0; for (const ch of String(id)) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  const [a, b, c] = HUES[n % HUES.length], tilt = -28 + (n % 5) * 10;
  return `<defs>${g(p + 'a', a, b, c)}</defs>${glow(b)}
    <g transform="rotate(${tilt} 80 80)"><path d="M8 80 A72 18 0 0 1 152 80" fill="none" stroke="${a}" stroke-width="6" opacity=".7"/></g>
    ${ball(p + 'a', 44)}<g fill="rgba(255,255,255,.18)"><ellipse cx="66" cy="68" rx="18" ry="6" transform="rotate(-20 66 68)"/></g>${rim(44)}
    <g transform="rotate(${tilt} 80 80)"><path d="M8 80 A72 18 0 0 0 152 80" fill="none" stroke="${a}" stroke-width="6" opacity=".9"/></g>`;
};
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }

// planetSVG(id, {letters}) → an SVG string. `letters` personalizes the word-game tiles.
export function planetSVG(id, opts = {}) {
  const safe = String(id).replace(/[^\w-]/g, '');
  const p = 'pl-' + safe + '-';
  const art = ART[safe] ? ART[safe](p, opts) : generic(p, safe);
  return `<svg viewBox="0 0 160 160" aria-hidden="true" class="planet-svg">${art}</svg>`;
}
