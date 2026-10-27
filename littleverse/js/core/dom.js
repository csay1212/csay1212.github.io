// Tiny DOM helpers shared by every view.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// h('div', {class:'x', text:'hi', onclick:fn}, child, child...)
// User-provided text should go in via `text` (textContent), never `html`.
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') { for (const [sk, sv] of Object.entries(v)) { if (sv == null) continue; if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv; } }
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const NS = 'http://www.w3.org/2000/svg';
export function svg(tag, attrs, ...kids) {
  const el = document.createElementNS(NS, tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  for (const c of kids.flat()) if (c != null) el.append(c);
  return el;
}

// Small line icons (24x24, stroke). Use: icon('back')
const ICONS = {
  back: 'M15 5l-7 7 7 7',
  close: 'M6 6l12 12M18 6L6 18',
  music: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  mute: 'M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6',
  sound: 'M4 9h4l5-4v14l-5-4H4zM17 8a5 5 0 0 1 0 8M19.5 5.5a8.5 8.5 0 0 1 0 13',
  play: 'M7 4l13 8-13 8z',
  pause: 'M7 4h3v16H7zM14 4h3v16h-3z',
  next: 'M5 4l10 8-10 8zM18 4v16',
  prev: 'M19 4L9 12l10 8zM6 4v16',
  replay: 'M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4',
  planet: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM3 15c-1.5 2.2 2.6 3.4 9 1.4s10.5-5.5 9-7.6c-.7-1-2.6-1.2-5-.7',
  film: 'M4 5h16v14H4zM8 5v14M16 5v14M4 9h4M4 15h4M16 9h4M16 15h4',
  star: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z',
  passport: 'M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6zM12 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM9 17h6',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  share: 'M12 3v12M7 8l5-5 5 5M5 14v6h14v-6',
  shuffle: 'M4 7h3c5 0 5 10 10 10h3M17 4l3 3-3 3M4 17h3c1.5 0 2.5-1 3.3-2.2M17 14l3 3-3 3M13.7 9.2C14.5 8 15.5 7 17 7h3',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  calendar: 'M5 6h14v14H5zM5 10h14M9 3v5M15 3v5',
  mic: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  info: 'M12 8h.01M11 12h1v5h1M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
};
export function icon(name, cls) {
  const s = svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: cls || null });
  s.append(svg('path', { d: ICONS[name] || ICONS.star }));
  return s;
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const fmt = n => Math.round(n).toLocaleString('en-US');

// Download a canvas as a PNG (works on phones too; falls back to opening the image).
export function downloadCanvas(canvas, filename) {
  return new Promise(res => {
    const done = blob => {
      if (!blob) { res(false); return; }
      const url = URL.createObjectURL(blob);
      const a = h('a', { href: url, download: filename });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      res(true);
    };
    try { canvas.toBlob(done, 'image/png'); } catch { res(false); }
  });
}

// Share a file or text with the phone's share sheet when possible.
export async function shareOrCopy({ title, text, file }) {
  const Share = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins && window.Capacitor.Plugins.Share;
  if (Share && !file) { try { await Share.share({ title, text }); return 'shared'; } catch { return 'cancelled'; } }
  try {
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ title, text, files: [file] }); return 'shared'; }
    if (navigator.share && !file) { await navigator.share({ title, text }); return 'shared'; }
  } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  try { await navigator.clipboard.writeText(text); return 'copied'; } catch { return 'failed'; }
}
