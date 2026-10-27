// Ads and the one-time "Remove ads" purchase, for the Android app only.
// main.js and settings.js load this folder only inside the Android app, so the
// web and iPhone versions never fetch any of it: they stay ad-free and purchase-free.
//
// At start, Google Play is asked whether "Remove ads" is owned first. Only if it
// isn't is ./ads.js loaded and the ad SDK started; when it's owned, no ad code runs.
//
//   boot()              once, after the first screen is up
//   onScreen(name)      every route: 'home' | 'inbox' | 'you' | 'new' | 'universe' | 'edit' | 'play'
//   naturalBreak(kind)  a pause between activities: 'play-exit' (back from playing a universe)
//   settingsRows(ctx)   what the You screen shows: the purchase, ad privacy, and (debug builds) testing
//
// The pieces:
//   ads-config.js  every AdMob ID, in one place
//   ads.js         banners, the occasional interstitial, Google's consent form
//   purchases.js   Remove ads: buy, restore, the ownership check
//   debug.js       debug builds only; lives in android/app/src/debug/assets, so release builds don't have it
import * as purchases from './purchases.js';

let ads = null;
let debug = null;
let screen = 'home';
let booted = null;

export function boot() {
  return booted || (booted = (async () => {
    debug = await import('./debug.js').catch(() => null);
    const owned = await purchases.init({ debug });
    purchases.onChange(o => { if (o) stopAds(); });
    if (!owned) await startAds();
  })().catch(e => console.error('monetize', e)));
}

async function startAds() {
  const mod = await import('./ads.js');
  if (purchases.isOwned()) return;
  ads = mod;
  await ads.start({ screen });
}
function stopAds() {
  if (!ads) return;
  try { ads.stop(); } catch (e) { console.error(e); }
  ads = null;
}

export function onScreen(name) { screen = name; ads?.onScreen(name); }
export function naturalBreak(kind) { ads?.naturalBreak(kind); }

export async function settingsRows(ctx) {
  await boot();
  const out = [...await purchases.settingsRows(ctx)];
  if (ads?.settingsRows) out.push(...await ads.settingsRows(ctx));
  if (debug?.settingsRows) out.push(...await debug.settingsRows(ctx));
  return out;
}
