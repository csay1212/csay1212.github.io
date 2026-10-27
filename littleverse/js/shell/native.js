// Small bridge to native features when running as an installed app (Capacitor),
// with web fallbacks so everything also works in a normal browser.
const Cap = () => (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ? window.Capacitor : null;
const plugin = name => { const c = Cap(); return c && c.Plugins ? c.Plugins[name] : null; };
export const isNative = () => !!Cap();
// The Android app is the only build with ads and the Remove ads purchase.
export const isAndroidApp = () => { const c = Cap(); return !!(c && c.getPlatform && c.getPlatform() === 'android'); };

let hapticsOn = true;
export function setHaptics(on) { hapticsOn = on; }
export function haptic(kind = 'light') {
  if (!hapticsOn) return;
  if (!isNative() && navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try {
    const H = plugin('Haptics');
    if (H) {
      if (kind === 'success' || kind === 'warning' || kind === 'error') H.notification({ type: kind.toUpperCase() });
      else if (kind === 'select') H.selectionChanged?.();
      else H.impact({ style: kind === 'heavy' ? 'HEAVY' : kind === 'medium' ? 'MEDIUM' : 'LIGHT' });
      return;
    }
    if (navigator.vibrate) navigator.vibrate(kind === 'success' ? [12, 40, 18] : kind === 'heavy' ? 22 : kind === 'medium' ? 14 : 8);
  } catch {}
}

// Share a file (gift) or text. Returns 'shared' | 'downloaded' | 'copied' | 'cancelled' | 'failed'.
export async function shareFile(blob, filename, { title = '', text = '' } = {}) {
  const Share = plugin('Share'), FS = plugin('Filesystem');
  if (Share && FS) {
    try {
      const data = await blobToBase64(blob);
      const res = await FS.writeFile({ path: filename, data, directory: 'CACHE' });
      await Share.share({ title, text, url: res.uri, dialogTitle: title });
      return 'shared';
    } catch (e) { if (/cancel/i.test(String(e && e.message))) return 'cancelled'; }
  }
  try {
    const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ title, text, files: [file] }); return 'shared'; }
  } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return 'downloaded';
  } catch { return 'failed'; }
}
export async function shareText(text, title = '') {
  const Share = plugin('Share');
  try { if (Share) { await Share.share({ title, text }); return 'shared'; } } catch { return 'cancelled'; }
  try { if (navigator.share) { await navigator.share({ title, text }); return 'shared'; } } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  try { await navigator.clipboard.writeText(text); return 'copied'; } catch { return 'failed'; }
}
function blobToBase64(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
}

// The workshop is daylight (dark status-bar text on paper), or after hours in the dark
// theme (light text on deep ink); a playing universe is night (light text on its sky).
// Also keeps the browser's theme-color in step. On Android the page is drawn edge to
// edge, so the bars show the page itself and only their icons change colour (the Bars
// plugin in the Android project).
export const DAY = '#edf0f4';
export const AFTER_HOURS = '#0e1220';
const quiet = p => { if (p && p.catch) p.catch(() => {}); };
export function statusBar(mode = 'day', color) {
  const dark = mode !== 'day' || document.documentElement.classList.contains('dark');
  const bg = color || (mode !== 'day' ? '#0c0b24' : dark ? AFTER_HOURS : DAY);
  try { document.querySelector('meta[name=theme-color]')?.setAttribute('content', bg); } catch {}
  try {
    const Bars = plugin('Bars');
    if (Bars) { quiet(Bars.setStyle({ dark, color: bg })); return; }
    const SB = plugin('StatusBar');
    if (SB) quiet(SB.setStyle({ style: dark ? 'DARK' : 'LIGHT' }));
  } catch {}
}

// The system bars' sizes, as --sa-t/r/b/l (the CSS takes the larger of these and
// env(safe-area-inset-*), which older Android WebViews leave at 0).
function watchInsets() {
  const Bars = plugin('Bars');
  if (!Bars) return;
  const root = document.documentElement.style;
  const apply = i => {
    if (!i || i.top == null) return;
    for (const [k, v] of [['t', i.top], ['r', i.right], ['b', i.bottom], ['l', i.left]]) root.setProperty('--sa-' + k, (v || 0) + 'px');
    document.documentElement.classList.toggle('kb-open', !!i.keyboard);
  };
  try { quiet(Bars.addListener('insets', apply)); quiet(Bars.getInsets().then(apply)); } catch {}
}

export function initNative({ onBack } = {}) {
  const c = Cap();
  if (!c) return;
  document.documentElement.classList.add('native');
  watchInsets();
  statusBar('day');
  try { plugin('SplashScreen')?.hide(); } catch {}
  try {
    plugin('App')?.addListener('backButton', () => {
      if (onBack && onBack()) return;
      if (location.hash && location.hash !== '#/') history.back(); else plugin('App').exitApp();
    });
  } catch {}
}

