// Light, dark, or whatever the phone is set to (You → Appearance). The choice is
// settings.theme ('system' | 'light' | 'dark'); html.dark switches the workshop's colors
// (app.css). index.html sets the class before the first paint, so the app never opens in
// the wrong color; this keeps it in step afterwards, and follows the phone when it changes.
import { settings } from '../lib/db.js';
import { statusBar } from './native.js';
import { reduceMotion } from '../core/dom.js';

const media = matchMedia('(prefers-color-scheme: dark)');
const root = document.documentElement;

export const themePref = () => { const t = settings.get().theme; return t === 'light' || t === 'dark' ? t : 'system'; };
export const isDark = () => root.classList.contains('dark');
const wantDark = () => { const p = themePref(); return p === 'dark' || (p === 'system' && media.matches); };

function apply(fade) {
  const dark = wantDark();
  if (dark === isDark()) return;
  const flip = () => {
    root.classList.toggle('dark', dark);
    document.querySelector('meta[name=color-scheme]')?.setAttribute('content', dark ? 'dark' : 'light');
    // A playing universe keeps its night bars; they follow the theme again on the way out.
    if (!document.body.classList.contains('playing')) statusBar('day');
  };
  if (!fade || reduceMotion()) { flip(); return; }
  // Cross-fade the whole page where the browser can; otherwise fade each color across.
  if (document.startViewTransition) { document.startViewTransition(flip); return; }
  root.classList.add('theme-fade');
  flip();
  setTimeout(() => root.classList.remove('theme-fade'), 360);
}

export function setTheme(pref) {
  settings.set({ theme: pref });
  apply(true);
}

export function initTheme() {
  apply(false);
  media.addEventListener('change', () => { if (themePref() === 'system') apply(true); });
}
