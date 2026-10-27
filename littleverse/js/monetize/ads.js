// AdMob banners and the occasional interstitial, for the Android app only.
// index.js loads this file only when Remove ads isn't owned, so with Remove ads (and on
// the web and iPhone versions) none of it runs. What index.js calls:
//   start({ screen })     consent first (Google's UMP form), then the ad SDK, then whatever fits `screen`
//   onScreen(name)        a banner on calm screens only; hidden everywhere else
//   naturalBreak(kind)    now and then an interstitial (never on app open, never mid-action)
//   stop()                remove every ad right away (Remove ads was just bought)
//   settingsRows(ctx)     "Ad privacy choices", when the consent rules require it
//
// Ads must never break or hold up the app: nothing waits on them, every call to the ad
// SDK is guarded, and any failure (no fill, offline, a consent error) just means no ad.
// The IDs live in ads-config.js. Debug builds also have debug-ads.js (test devices, a
// pretend EEA for the consent form, shorter caps); release builds don't.
import { ADS, TEST_UNITS } from './ads-config.js';
import { h, groupHead, group, row, toast } from '../shell/kit.js';

/* ---------- where and how often ---------- */
// A banner only on the three tab screens, where people browse. Never while a universe
// plays (the film and the games), while making or editing one, or on a universe's page.
const CALM = new Set(['home', 'inbox', 'you']);
const calmHash = () => /^#\/?(inbox|you)?\/?$/.test(location.hash || '#/');

// Interstitials only at a natural break: coming back from playing a universe. And rarely:
const CAPS = {
  afterLaunch: 3 * 60e3, // none in the first 3 minutes after the app opens
  gap: 5 * 60e3,         // at least 5 minutes between two, also across restarts
  perDay: 3,             // at most 3 a day
  minPlay: 30e3,         // only after a universe played for 30 seconds or more, not a quick peek
  delay: 500,            // shown once the lights are up again, never while the page changes
};
// A loaded interstitial is good for an hour; after 55 minutes a fresh one is loaded instead.
const EXPIRES = 55 * 60e3;
const LOG = 'lv.ads.interstitials';

/* ---------- state ---------- */
const AdMob = () => window.Capacitor?.Plugins?.AdMob || null;
const root = document.documentElement;
const launched = Date.now();
let stopped = false;
let dbg = null;           // debug-ads.js, debug builds only
let sdkUp = false;        // MobileAds.initialize has run (once per app start)
let consent = null;       // Google's latest answer: { status, canRequestAds, privacyOptionsRequirementStatus }
let consentRun = null;    // the consent flow, while it runs
let consentFails = 0, consentFailedAt = 0;
let screen = 'home', playStart = 0, wake = 0;
let sheetOpen = false, keyboard = false;
// banner: 'none' (no ad view) | 'on' (showing, or loading) | 'off' (hidden, kept for later)
let banner = 'none', bannerH = 0, bannerNav = 0, bannerFails = 0, bannerRetryAt = 0;
let inter = { ready: false, loading: false, at: 0, fails: 0 };
const timers = new Set();
const offs = [];          // listeners and observers, removed by stop()
const slots = new Set();  // settings rows that fill in once consent is known
let queue = Promise.resolve();

const ready = () => !stopped && sdkUp && !!consent?.canRequestAds;
const testAds = () => ADS.testMode || !!dbg; // debug builds never ask for real ads
const units = () => testAds() ? TEST_UNITS : ADS;
const caps = () => ({ ...CAPS, ...(dbg?.caps?.() || {}) });
const quiet = e => { if (dbg) console.warn('ads:', e?.message || e); };
function later(fn, ms) {
  if (stopped) return;
  const t = setTimeout(() => { timers.delete(t); if (!stopped) try { fn(); } catch (e) { quiet(e); } }, ms);
  timers.add(t);
}
// Banner calls go one at a time, in order, so a quick hide can't overtake the show before it.
function bannerCall(fn) {
  queue = queue.then(() => { const A = AdMob(); return A && !stopped ? fn(A) : null; }).catch(quiet);
  return queue;
}

/* ---------- start and stop ---------- */
export async function start({ screen: s } = {}) {
  if (stopped || !AdMob()) return;
  if (s) screen = s;
  dbg = await import('./debug-ads.js').catch(() => null);
  if (stopped) return;
  if (!document.getElementById('lv-ads-css')) document.head.append(h('link', { id: 'lv-ads-css', rel: 'stylesheet', href: 'css/ads.css' }));
  watchPage();
  runConsent(); // not awaited: nothing in the app waits on ads
}

export function stop() {
  if (stopped) return;
  stopped = true;
  for (const t of timers) clearTimeout(t);
  timers.clear();
  for (const off of offs.splice(0)) { try { off(); } catch {} }
  // Removing the ad view is safe even if there isn't one; a banner still loading goes too.
  const A = AdMob();
  if (A && sdkUp) { try { A.removeBanner().catch(quiet); } catch (e) { quiet(e); } }
  // A loaded interstitial is simply never shown.
  banner = 'none'; bannerH = 0;
  inter = { ready: false, loading: false, at: 0, fails: 0 };
  root.classList.remove('lv-ad');
  root.style.removeProperty('--ad-h');
  document.getElementById('lv-ads-css')?.remove();
  for (const s of slots) s.replaceChildren();
  slots.clear();
}

/* ---------- consent first ---------- */
// Google's UMP: ask whether consent is needed here (the EEA, the UK, Switzerland...), show
// the form if it is, and start the ad SDK only when the answer allows ads.
function runConsent({ reset = false } = {}) {
  if (consentRun || stopped) return consentRun;
  const A = AdMob();
  if (!A) return null;
  consentRun = (async () => {
    if (reset) await A.resetConsentInfo();
    let info = await A.requestConsentInfo(consentOptions());
    if (stopped) return;
    setConsent(info);
    if (info.status === 'REQUIRED' && info.isConsentFormAvailable) {
      info = { ...info, ...await A.showConsentForm() };
      if (stopped) return;
      setConsent(info);
    }
    consentFails = 0;
    if (info.canRequestAds) await startSdk();
    else dropAds();
  })().catch(e => { consentFails++; consentFailedAt = Date.now(); quiet(e); })
    .finally(() => { consentRun = null; });
  return consentRun;
}
const consentOptions = () => ({ tagForUnderAgeOfConsent: false, ...(dbg?.consentOptions?.() || {}) });
// Offline at launch, or the form didn't load: try again when the connection is back, or on a
// later tab screen, a minute on at the earliest and a few times at most.
function retryConsent() {
  if (stopped || consentRun || consent?.canRequestAds) return;
  if (consentFails && consentFails < 6 && Date.now() - consentFailedAt > 60e3) runConsent();
}

function setConsent(info) {
  consent = info ? { status: info.status, canRequestAds: !!info.canRequestAds, privacyOptionsRequirementStatus: info.privacyOptionsRequirementStatus } : null;
  for (const s of slots) s._fill();
}

async function startSdk() {
  if (stopped) return;
  const A = AdMob();
  if (!sdkUp) {
    const devices = dbg?.testDeviceIds || [];
    await A.initialize({
      initializeForTesting: devices.length > 0,
      testingDevices: devices,
      // Littleverse isn't made for children, and some universes remember someone who has
      // died: no child-directed treatment, and ads rated for general audiences with parental guidance.
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      maxAdContentRating: 'ParentalGuidance',
    });
    if (stopped) return;
    await listen(A);
    sdkUp = true;
  }
  if (stopped) return;
  sync();
  // The interstitial can't show in the first minutes anyway, so it loads quietly later.
  later(prepareInterstitial, 20e3);
}

// Consent withdrawn (or being asked again): no more ad requests until it allows them.
function dropAds() {
  if (banner !== 'none') bannerCall(A => A.removeBanner());
  banner = 'none'; bannerH = 0;
  inter.ready = false;
  paint();
}

async function listen(A) {
  const on = async (name, fn) => {
    try {
      const hd = await A.addListener(name, e => { if (!stopped) try { fn(e); } catch (x) { quiet(x); } });
      if (stopped) hd.remove(); else offs.push(() => hd.remove());
    } catch (e) { quiet(e); }
  };
  await Promise.all([
    // Its height in dp, which is CSS px here. Hiding also reports 0: only a real size counts.
    on('bannerAdSizeChanged', s => { if (s && s.height > 0) { bannerH = s.height; paint(); } }),
    // No fill or offline: the plugin has already removed the ad view. Try again later, less often each time.
    on('bannerAdFailedToLoad', e => {
      quiet(e);
      banner = 'none'; bannerH = 0;
      bannerFails++;
      const wait = Math.min(10 * 60e3, 60e3 * 2 ** (bannerFails - 1));
      bannerRetryAt = Date.now() + wait;
      paint();
      later(sync, wait + 100);
    }),
    on('bannerAdLoaded', () => { bannerFails = 0; }),
    on('interstitialAdDismissed', () => later(prepareInterstitial, 15e3)),
    on('interstitialAdFailedToShow', e => { quiet(e); inter.ready = false; later(prepareInterstitial, 60e3); }),
  ]);
}

/* ---------- the page around the ads ---------- */
function watchPage() {
  // Leaving a tab screen: hide the banner as the route changes, before the next screen loads.
  const hash = () => sync();
  addEventListener('hashchange', hash);
  offs.push(() => removeEventListener('hashchange', hash));
  // A sheet slides up over the tab screen: the banner steps aside (it would cover the sheet's
  // buttons) but its room stays, so the tab bar doesn't jump behind the dimmed page.
  const mo = new MutationObserver(() => {
    const open = !!document.querySelector('body > .sheet-wrap');
    if (open !== sheetOpen) { sheetOpen = open; sync(); }
  });
  mo.observe(document.body, { childList: true });
  offs.push(() => mo.disconnect());
  const online = () => { retryConsent(); bannerRetryAt = 0; sync(); };
  addEventListener('online', online);
  offs.push(() => removeEventListener('online', online));
  // The keyboard, and the navigation bar's size (from the app's Bars plugin, as in native.js).
  const Bars = window.Capacitor?.Plugins?.Bars;
  if (Bars) {
    try {
      // (addListener gives a handle, or a promise of one, depending on the Capacitor version.)
      Promise.resolve(Bars.addListener('insets', i => {
        if (stopped || !i || i.top == null) return;
        keyboard = !!i.keyboard;
        // The banner is placed just above the navigation bar when it's made: if the bar
        // changes (rotation, gestures switched on), it's made again in the new place.
        if (!keyboard && banner !== 'none' && Math.round(i.bottom || 0) !== bannerNav) {
          bannerCall(A => A.removeBanner());
          banner = 'none'; bannerH = 0;
        }
        sync();
      })).then(hd => { if (stopped) hd.remove(); else offs.push(() => hd.remove()); }, quiet);
    } catch (e) { quiet(e); }
  }
}

// The navigation bar's height in CSS px (= dp), as native.js gets it from the Bars plugin.
const navBar = () => Math.max(0, Math.round(parseFloat(root.style.getPropertyValue('--sa-b')) || 0));

/* ---------- the banner ---------- */
// One adaptive banner at the bottom: a native view drawn over the page, just above the
// navigation bar. ads.css makes room for it: the tab bar sits on a paper tray that holds
// it, so it never covers the tabs, a toast or the end of the screen.
function sync() {
  if (!ready()) { paint(); return; }
  const want = CALM.has(screen) && calmHash() && !sheetOpen && !keyboard;
  if (want && banner !== 'on' && Date.now() < wake) {
    later(sync, wake - Date.now());
  } else if (want && banner === 'none' && Date.now() >= bannerRetryAt) {
    banner = 'on';
    bannerNav = navBar();
    const opts = { adId: units().banner, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: bannerNav };
    bannerCall(A => A.showBanner(opts).catch(e => { banner = 'none'; bannerH = 0; bannerRetryAt = Date.now() + 60e3; paint(); throw e; }));
  } else if (want && banner === 'off') {
    banner = 'on';
    bannerCall(A => A.resumeBanner());
  } else if (!want && banner === 'on') {
    banner = 'off';
    bannerCall(A => A.hideBanner());
  }
  paint();
}

// The room for the banner: .lv-ad on <html>, and its height as --ad-h (see ads.css).
function paint() {
  const on = ready() && CALM.has(screen) && banner !== 'none' && bannerH > 0;
  root.classList.toggle('lv-ad', on);
  if (on) root.style.setProperty('--ad-h', bannerH + 'px');
  else root.style.removeProperty('--ad-h');
}

export function onScreen(name) {
  if (stopped) return;
  try {
    if (name === 'play' && screen !== 'play') playStart = Date.now();
    // Back from a universe the page is still coming out of the dark: the banner waits a moment.
    if (screen === 'play' && name !== 'play') wake = Date.now() + 450;
    screen = name;
    if (CALM.has(name)) retryConsent();
    sync();
  } catch (e) { quiet(e); }
}

/* ---------- the interstitial ---------- */
function readLog() {
  const today = new Date().toDateString();
  try {
    const l = JSON.parse(localStorage.getItem(LOG)) || {};
    return { day: today, n: l.day === today ? l.n || 0 : 0, last: l.last || 0 };
  } catch { return { day: today, n: 0, last: 0 }; }
}
function logShown() {
  const l = readLog();
  try { localStorage.setItem(LOG, JSON.stringify({ day: l.day, n: l.n + 1, last: Date.now() })); } catch {}
}

// Loaded ahead of time, quietly, so it's instant at the break. Nothing ever waits for it.
function prepareInterstitial() {
  const A = AdMob();
  if (!A || !ready() || inter.loading) return;
  if (inter.ready && Date.now() - inter.at < EXPIRES) return;
  if (readLog().n >= caps().perDay) return; // none left today: don't load one for nothing
  inter.loading = true;
  inter.ready = false;
  A.prepareInterstitial({ adId: units().interstitial })
    .then(() => { if (!stopped) { inter.ready = true; inter.at = Date.now(); inter.fails = 0; } })
    .catch(e => { quiet(e); inter.fails++; later(prepareInterstitial, Math.min(30, 2 ** inter.fails) * 60e3); })
    .finally(() => { inter.loading = false; });
}

export function naturalBreak(kind) {
  if (stopped || kind !== 'play-exit') return;
  try {
    const played = playStart ? Date.now() - playStart : 0;
    playStart = 0;
    if (!ready()) return;
    if (!inter.ready || Date.now() - inter.at > EXPIRES) { inter.ready = false; prepareInterstitial(); return; }
    const c = caps(), l = readLog(), now = Date.now();
    if (played < c.minPlay || now - launched < c.afterLaunch || now - l.last < c.gap || l.n >= c.perDay) return;
    later(() => showInterstitial(), c.delay);
  } catch (e) { quiet(e); }
}

function showInterstitial(force = false) {
  const A = AdMob();
  if (!A || !ready() || !inter.ready) return false;
  // Only on a settled screen: not back in a universe, not over a sheet, not in the background.
  if (!force && (screen === 'play' || sheetOpen || document.visibilityState !== 'visible')) return false;
  inter.ready = false;
  logShown();
  A.showInterstitial().catch(e => { quiet(e); later(prepareInterstitial, 60e3); });
  return true;
}

/* ---------- You: ad privacy ---------- */
// The rows fill in once Google has answered, so the You screen never waits on the network.
export async function settingsRows() {
  if (stopped) return [];
  const slot = h('div', { class: 'lv-ad-rows', style: { display: 'contents' } });
  slot._fill = () => {
    if (stopped) return;
    const out = [];
    if (consent?.privacyOptionsRequirementStatus === 'REQUIRED') out.push(groupHead('Ads'),
      group(row({ title: 'Ad privacy choices', sub: 'Change what Google’s ads may use', onclick: privacyChoices })));
    if (dbg?.settingsRows) { try { out.push(...dbg.settingsRows(debugApi)); } catch (e) { quiet(e); } }
    slot.replaceChildren(...out);
  };
  slot._fill();
  // Forget the rows of You screens that are gone.
  for (const s of slots) if (!s.isConnected) slots.delete(s);
  slots.add(slot);
  return [slot];
}

async function privacyChoices() {
  const A = AdMob();
  if (!A || stopped) return;
  try { await A.showPrivacyOptionsForm(); }
  catch (e) { quiet(e); toast('Ad privacy choices couldn’t open. Check your connection and try again.', { icon: 'info' }); return; }
  // New choices apply to the next ad requests by themselves; this only catches a withdrawal.
  try {
    const info = await A.requestConsentInfo(consentOptions());
    if (stopped) return;
    setConsent(info);
    if (info.canRequestAds) await startSdk(); else dropAds();
  } catch (e) { quiet(e); }
}

// For debug-ads.js only.
const debugApi = {
  status: () => {
    const l = readLog();
    return `Consent ${consent ? String(consent.status).toLowerCase().replace('_', ' ') : 'unknown'}, ads ${ready() ? 'on' : 'off'}, `
      + `interstitial ${inter.ready ? 'ready' : inter.loading ? 'loading' : 'not loaded'}, ${l.n} shown today`;
  },
  // Forget the consent answer and ask again, with debug-ads.js's pretend region.
  askConsentAgain: () => { dropAds(); setConsent(null); runConsent({ reset: true }); },
  showInterstitial: () => {
    if (showInterstitial(true)) return;
    prepareInterstitial();
    toast('No interstitial loaded yet. Try again in a few seconds.', { icon: 'info' });
  },
};
