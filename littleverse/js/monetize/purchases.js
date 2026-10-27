// The one-time "Remove ads" purchase (Google Play product "remove_ads"), Android app only.
// What index.js expects:
//   init({ debug }) → Promise<boolean>   is Remove ads owned? Once per app start, before any ad code
//   onChange(fn)                         fn(owned) whenever ownership changes (a purchase goes through)
//   isOwned() → boolean                  the latest answer
//   settingsRows(ctx) → Promise<Node[]>  "Remove ads" and "Restore purchase" for the You screen
//
// Google Play is asked through the app's own small plugin, PlayBillingPlugin.java (Play
// Billing Library 9, no third-party service; why that over a ready-made plugin is at its top).
//
// Play is asked on every start and every return to the app. Its last answer is kept on the
// phone, so someone who bought Remove ads and opens the app offline, or while Play is slow,
// still sees no ads: init() waits a moment for Play, then goes with the kept answer and lets
// Play's reply land when it comes. When Play says it isn't owned (say, after a refund), the
// kept answer is cleared and ads come back on the next start. Only a payment that has gone
// through counts; a pending one doesn't, until Play says it's paid.
import { h, group, groupHead, groupFoot, row, sheet, toast, haptic } from '../shell/kit.js';

const PRODUCT = 'remove_ads';  // the product ID in Play Console
const KEY = 'lv-remove-ads';   // Play's last answer on this phone: 'owned', 'pending' or nothing
const WAIT = 2500;             // how long a start waits for Play before going with the kept answer

const PENDING = 'Your payment is pending. Ads will go away as soon as it goes through.';

let owned = false;     // what the app goes by
let paid = false;      // what Play (or the kept answer) says, without the debug switch
let pending = false;
let testing = null;    // debug builds: the debug module, while its switch says owned
let product = null;    // { price } from Play, or { failed: true }
let loading = null;
let busy = '';         // 'buy' or 'restore' while one runs
let epoch = 0;         // goes up when a purchase comes in, so a reply sent before it can't undo it
let started = null;
let repaint = null;    // redraws the You screen's rows while they're showing
const listeners = new Set();

export function init({ debug } = {}) {
  return started || (started = (async () => {
    if (debug?.pretendOwned?.()) testing = debug;
    const kept = recall();
    paid = kept === 'owned';
    pending = kept === 'pending';
    owned = !!testing || paid;
    listen();
    // Play's reply updates `owned` when it arrives; after WAIT the kept answer stands.
    await Promise.race([check(), new Promise(r => setTimeout(r, WAIT))]);
    return owned;
  })());
}
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export const isOwned = () => owned;

/* ---------- talking to Play ---------- */
const plugin = name => window.Capacitor?.Plugins?.[name] || null;
function native(method, args) {
  const P = plugin('PlayBilling');
  if (!P) return Promise.reject(Object.assign(new Error('The PlayBilling plugin is missing'), { code: 'unavailable' }));
  return P[method](args);
}
const quiet = p => { if (p && p.catch) p.catch(() => {}); };

function listen() {
  // A purchase that changes on its own, like a pending payment going through.
  try { quiet(plugin('PlayBilling')?.addListener('update', e => updated(e?.state))); } catch (e) { console.error(e); }
  // Back in the app: Play may have news (a payment went through, a refund).
  try { quiet(plugin('App')?.addListener('resume', () => { if (!busy) check(); })); } catch (e) { console.error(e); }
}

// Asks Play whether Remove ads is owned (Play acknowledges a new purchase on the way).
// Resolves { state } or { error }; never throws.
function check() {
  const at = epoch;
  return native('check', { product: PRODUCT }).then(
    r => { settle(r.state, at); return { state: r.state }; },
    e => { console.error('Remove ads: Play check failed', e?.code, e?.message || e); return { error: e?.code || 'error' }; });
}

function updated(state) {
  if (state === 'owned') { epoch++; settle('owned'); }
  else if (state === 'pending' && !paid) { pending = true; remember(); repaint?.(); }
}

function settle(state, at = epoch) {
  // A "not owned" that was asked before a purchase came in is out of date.
  if (state !== 'owned' && at !== epoch) return;
  const was = paid, waiting = pending;
  paid = state === 'owned';
  pending = state === 'pending';
  remember();
  // A pending payment went through (while the app was open, or since it last ran).
  if (paid && !was && waiting && !busy) { haptic('success'); toast('Your payment went through. Ads are gone. Thank you!', { icon: 'heart', ms: 4200 }); }
  const now = !!testing || paid;
  const changed = now !== owned;
  owned = now;
  repaint?.();
  if (changed) for (const fn of [...listeners]) { try { fn(now); } catch (e) { console.error(e); } }
}

function recall() { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } }
function remember() {
  try { if (paid || pending) localStorage.setItem(KEY, paid ? 'owned' : 'pending'); else localStorage.removeItem(KEY); } catch {}
}

// Play's price for Remove ads. Fetched once; after a failure, again each time the You screen opens.
function loadPrice(retry = false) {
  if (owned || loading || product?.price || (product && !retry)) return;
  loading = native('product', { product: PRODUCT }).then(
    r => { product = r?.price ? { price: r.price } : { failed: true }; },
    e => { console.error('Remove ads: Play has no product to show', e?.code, e?.message || e); product = { failed: true }; })
    .finally(() => { loading = null; repaint?.(); });
}

/* ---------- buying and restoring ---------- */
async function buy() {
  if (busy) return;
  if (pending) { notice('Payment pending', PENDING); return; }
  busy = 'buy'; repaint?.();
  try {
    const r = await native('buy', { product: PRODUCT });
    epoch++;
    if (r.result === 'purchased') {
      settle('owned');
      haptic('success');
      toast('Thank you! Ads are gone.', { icon: 'heart' });
    } else if (r.result === 'pending') {
      pending = true; remember();
      notice('Payment pending', PENDING);
    } else if (r.result === 'cancelled') {
      toast('Purchase cancelled. No charge was made.', { icon: 'info' });
    } else {
      // Already bought on this Google account, or Play's answer was unclear: ask again.
      const c = await check();
      if (c.state === 'owned') { haptic('success'); toast('You already own Remove ads, so it’s back. Ads are gone.', { icon: 'circle-check', ms: 3600 }); }
      else if (c.state === 'pending') notice('Payment pending', PENDING);
      else explain(c.error, 'buy');
    }
  } catch (e) {
    console.error('Remove ads: purchase failed', e?.code, e?.message || e);
    explain(e?.code, 'buy');
  } finally {
    busy = ''; repaint?.();
  }
}

async function restore() {
  if (busy) return;
  const was = paid;
  busy = 'restore'; repaint?.();
  const c = await check();
  busy = ''; repaint?.();
  if (c.state === 'owned') { haptic('success'); toast(was ? 'All set. Remove ads is already yours.' : 'Purchase restored. Ads are gone.', { icon: 'circle-check' }); }
  else if (c.state === 'pending') notice('Payment pending', PENDING);
  else if (c.state === 'none') notice('Nothing to restore', 'This Google account hasn’t bought Remove ads. If you bought it with another account, switch to that one in the Play Store and try again.');
  else explain(c.error, 'restore');
}

const SORRY = {
  'not-found': ['Not available yet', 'Remove ads can’t be bought just yet. Please try again later.'],
  unavailable: ['Google Play isn’t available', 'Purchases go through the Google Play Store. Check that it’s on this phone and signed in, then try again later.'],
  network: ['No connection', 'Google Play couldn’t be reached. Check your internet connection and try again.'],
  declined: ['Payment declined', 'The payment didn’t go through, so nothing was charged. You can try another payment method.'],
};
function explain(code, during) {
  if (code === 'busy') return;  // a purchase is already open
  const [title, text] = SORRY[code] || ['Something went wrong', during === 'buy'
    ? 'The purchase didn’t go through. Please try again later.'
    : 'Google Play couldn’t check your purchase. Please try again later.'];
  notice(title, text);
}

// A short message with an OK button, in the same sheet as the app's other questions.
function notice(title, text) {
  const close = sheet({ title, body: h('div', { class: 'pad stack', style: { paddingBottom: '6px' } },
    h('p', { class: 'muted', style: { margin: '0 0 8px', fontSize: '15.5px' }, text }),
    h('button', { class: 'b block lg primary', type: 'button', text: 'OK', onclick: () => close() })) });
}

/* ---------- the You screen ---------- */
export async function settingsRows() {
  const box = group();
  const foot = groupFoot('');
  const paint = () => {
    if (owned) {
      box.replaceChildren(
        row({ title: 'Ads removed. Thank you!', sub: testing?.ownedNote || 'Bought through Google Play', chevron: false }),
        restoreRow());
      foot.textContent = 'It stays with your Google account, so a new phone can restore it.';
      return;
    }
    loadPrice();
    const value = busy === 'buy' ? '…' : pending ? 'Pending' : product?.price || (product?.failed ? 'Not available yet' : '…');
    box.replaceChildren(
      row({ title: 'Remove ads', sub: pending ? 'Your payment is pending' : 'One payment, no more ads', value, onclick: buy }),
      restoreRow());
    foot.textContent = 'A one-time purchase through Google Play. It stays with your Google account, so a new phone can restore it.';
  };
  const restoreRow = () => row({ title: 'Restore purchase', sub: 'Bought it before? Bring it back', value: busy === 'restore' ? '…' : null, onclick: restore });
  repaint = paint;
  loadPrice(true);
  paint();
  return [groupHead('Ads'), box, foot];
}
