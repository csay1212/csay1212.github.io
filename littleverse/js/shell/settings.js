// You: your name, sound and haptics, what's stored on this phone, credits,
// and a way to start over.
import { h, ic, emo, screen, navbar, groupHead, groupFoot, group, row, toggle, field, input, sheet, confirmSheet, toast, haptic, plural } from './kit.js';
import { db, settings, mediaIds } from '../lib/db.js';
import { demoUniverses } from '../lib/demo.js';
import { fmtSize } from '../lib/gift.js';
import { setHaptics, isAndroidApp } from './native.js';

const VERSION = '1.1';

export async function render(ctx) {
  const all = await db.all();
  const st = settings.get();
  const mine = all.filter(u => u.kind !== 'received');
  const examples = mine.filter(u => u.demo);
  const received = all.filter(u => u.kind === 'received');
  const demos = demoUniverses();
  const have = new Set(all.map(u => u.id));
  const missing = demos.filter(d => !have.has(d.id));

  const blocks = [navbar({ title: 'You' }), h('h1', { class: 'large-title', text: 'You' })];

  // ---------- who you are ----------
  const mono = h('span', { class: 'st-mono', 'aria-hidden': 'true' });
  const nm = h('b', { class: 'st-name' });
  const paintName = () => {
    const n = settings.get().name;
    mono.replaceChildren(n ? h('span', { text: [...n.trim()][0].toUpperCase() }) : ic('user-round'));
    mono.classList.toggle('st-blank', !n);
    nm.textContent = n || 'Add your name';
    nm.classList.toggle('placeholder', !n);
  };
  paintName();
  blocks.push(h('button', { class: 'st-me', type: 'button', 'aria-label': 'Edit your name', onclick: () => { haptic('light'); nameSheet(paintName); } },
    mono, h('span', { class: 'st-me-main' }, nm, h('small', { text: 'Your name on new universes, as in “a film by …”' })), ic('chevron-right', 's chev')));

  // ---------- sound and touch ----------
  blocks.push(groupHead('Sound and touch'));
  blocks.push(group(
    row({ icon: 'volume-2', tint: '#7c5cff', title: 'Sound effects', sub: 'Clicks, chimes, fireworks', right: toggle(st.sfx !== false, v => { settings.set({ sfx: v }); toast(v ? 'Sound effects on' : 'Sound effects off', { icon: v ? 'volume-2' : 'volume-x' }); }, 'Sound effects') }),
    row({ icon: 'smartphone', tint: '#e0609a', title: 'Haptics', sub: 'Small taps as you choose', right: toggle(st.haptics !== false, v => { settings.set({ haptics: v }); setHaptics(v); if (v) haptic('medium'); toast(v ? 'Haptics on' : 'Haptics off'); }, 'Haptics') })));
  blocks.push(groupFoot('Music has its own controls inside each universe.'));

  // ---------- storage ----------
  const mediaVal = h('span', { class: 'ri-val', text: '…' });
  blocks.push(groupHead('On this phone'));
  blocks.push(group(
    row({ icon: 'layers', tint: '#3b82c4', title: 'Universes', sub: `${plural(mine.length - examples.length, 'made by you', 'made by you')}, ${plural(examples.length, 'example')}`, value: String(mine.length), chevron: false }),
    row({ icon: 'gift', tint: '#d9772b', title: 'Received gifts', value: String(received.length), chevron: false }),
    row({ icon: 'image', tint: '#2fa36b', title: 'Photos and songs', sub: 'Added by you or from gifts', right: mediaVal, chevron: false }),
    row({ icon: 'archive', tint: '#8a7f9e', title: 'Restore the examples', sub: missing.length ? `Bring back ${plural(missing.length, 'removed example')}` : 'Every example is in place, including the gift in your inbox',
      onclick: async () => {
        if (!missing.length) { toast('All the examples are already here', { icon: 'circle-check' }); return; }
        for (const d of missing) await db.put(d, { touch: false });
        haptic('success'); toast('Examples restored'); ctx.refresh();
      } })));
  mediaSize(all).then(n => { mediaVal.textContent = n ? fmtSize(n) : 'None yet'; });

  // ---------- Remove ads and ad privacy (the Android app only) ----------
  if (isAndroidApp()) {
    try { const m = await import('../monetize/index.js'); blocks.push(...await m.settingsRows(ctx)); }
    catch (e) { console.error(e); }
  }

  // ---------- about ----------
  blocks.push(groupHead('About'));
  blocks.push(group(
    row({ icon: 'info', tint: '#5b5390', title: 'Version', value: VERSION, chevron: false }),
    row({ icon: 'lock', tint: '#2f8f83', title: 'Privacy', sub: isAndroidApp() ? 'Your universes stay on this phone' : 'Everything stays on this phone', onclick: privacySheet }),
    row({ icon: 'scroll-text', tint: '#b0802a', title: 'Open-source credits', sub: 'Emoji, icons, fonts and music', onclick: creditsSheet })));

  // ---------- danger zone ----------
  blocks.push(groupHead('Danger zone'));
  blocks.push(group(row({ icon: 'trash-2', title: 'Erase everything', sub: 'Every universe, gift, photo and setting', danger: true, chevron: false, onclick: eraseAll })));
  blocks.push(groupFoot('Gift files you’ve already sent aren’t affected.'));

  blocks.push(h('div', { class: 'st-colophon' }, h('img', { src: 'assets/icon.svg', alt: '' }), h('span', { class: 'st-word', text: 'Littleverse' }), h('small', { text: `Version ${VERSION}. ${isAndroidApp() ? 'Your universes stay' : 'Everything stays'} on this phone.` })));

  return { el: screen({ tabs: ctx.tabs, anim: ctx.anim, cls: 'st-scr' }, ...blocks), title: 'You' };
}

async function mediaSize(all) {
  const ids = new Set();
  for (const u of all) for (const id of mediaIds(u)) ids.add(id);
  let total = 0;
  for (const id of ids) { try { const rec = await db.getMedia(id); if (rec && rec.blob) total += rec.blob.size || 0; } catch {} }
  return total;
}

function nameSheet(onSaved) {
  let val = settings.get().name || '';
  const inp = input(val, { placeholder: 'Your name', maxlength: 32, oninput: v => { val = v; btn.disabled = !v.trim() && !settings.get().name; } });
  const save = () => {
    const n = val.trim();
    settings.set({ name: n });
    haptic('success');
    toast(n ? 'Name saved' : 'Name removed');
    onSaved(); close();
  };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
  const btn = h('button', { class: 'b primary lg block', type: 'button', onclick: save }, 'Save name');
  const close = sheet({ title: 'Your name', body: h('div', { class: 'st-sheet' },
    field('Name', inp, 'Used as the sender on new universes. A family or group name works too, like “The Bennetts”. Universes you’ve already made keep their names.'),
    h('div', { class: 'pad' }, btn)) });
  setTimeout(() => { inp.focus(); inp.select(); }, 360);
}

// The full policy lives on the website. It's an absolute address on purpose: in the
// Android app, Capacitor hands any address outside the app to the system browser, and
// on the web it opens in a new tab.
const POLICY_URL = 'https://csay1212.github.io/littleverse/privacy.html';

function privacySheet() {
  // Only the Android app has ads and the Remove ads purchase, so only it mentions them.
  const android = isAndroidApp();
  sheet({ title: 'Privacy', body: h('div', { class: 'pad st-prose' },
    h('p', { class: 'st-lead', text: `${android ? 'Your universes stay' : 'Everything stays'} on this phone unless you send a gift file.` }),
    h('p', { text: 'Littleverse has no accounts and no servers. Your universes, photos, songs and progress are stored on this phone only.' }),
    android && h('p', { text: 'This app shows ads from Google. To choose and measure them, Google receives your phone’s advertising ID, its IP address, basic device and app details, and how you interact with the ads. Never your universes.' }),
    android && h('p', { text: 'Remove ads is a one-time purchase through Google Play. Google handles the payment; Littleverse only learns whether you own it, and remembers that on this phone.' }),
    h('p', { text: 'When you send a gift, Littleverse packs that one universe into a file, and you choose who gets it. The gift isn’t uploaded, tracked or shared along the way.' }),
    h('p', { text: 'Deleting a universe, or erasing everything, removes it from this phone for good.' }),
    h('p', null, h('a', { class: 'link', href: POLICY_URL, target: '_blank', rel: 'noopener', text: 'Read the full privacy policy' }))) });
}

function creditsSheet() {
  const font = (name, family, sample) => {
    const r = row({ title: name, sub: 'SIL Open Font License, via Fontsource', value: null, chevron: false });
    const b = r.querySelector('b'); b.style.fontFamily = `"${family}", serif`; if (sample) b.style.fontSize = sample;
    return r;
  };
  sheet({ title: 'Open-source credits', body: h('div', { class: 'st-credits' },
    h('p', { class: 'st-credits-lead', text: 'Littleverse is built with these generous projects. Thank you.' }),
    groupHead('Artwork and icons'),
    group(
      row({ emoji: 'sparkles', title: 'Fluent Emoji 3D', sub: 'Microsoft, MIT License', chevron: false }),
      row({ icon: 'shapes', tint: '#f26a5a', title: 'Lucide icons', sub: 'Lucide contributors, ISC License', chevron: false })),
    groupHead('Fonts'),
    group(
      font('Italiana', 'Italiana', '19px'),
      font('Cormorant Garamond', 'Cormorant Garamond', '18.5px'),
      font('JetBrains Mono', 'JetBrains Mono', '14.5px'),
      font('Caveat', 'Caveat', '21px'),
      font('Figtree', 'Figtree')),
    groupHead('Music and illustrations'),
    group(
      row({ emoji: 'musical_notes', title: 'Lofi: First Snow, Snow Drift, Everything You Ever Dreamed', sub: 'HoliznaCC0, public domain (CC0)', chevron: false }),
      row({ emoji: 'musical_notes', title: 'Piano: Bach’s Goldberg Variations', sub: 'Played by Kimiko Ishizaka, public domain (CC0)', chevron: false }),
      row({ emoji: 'framed_picture', title: 'Example illustrations', sub: 'Original, made for Littleverse', chevron: false })),
    groupFoot('All characters and people in the examples are fictional. Any resemblance to real people is a coincidence.')) });
}

async function eraseAll() {
  const ok = await confirmSheet({ title: 'Erase everything?', message: 'Every universe, received gift, photo, song, setting and bit of progress on this phone will be deleted. Littleverse will start fresh, like a new install. This can’t be undone.', confirm: 'Erase everything', danger: true });
  if (!ok) return;
  for (const u of await db.all()) { try { await db.remove(u.id); } catch (e) { console.error(e); } }
  await clearOrphanMedia();
  for (const store of [localStorage, sessionStorage]) {
    // Remove ads stays bought (lv-remove-ads): erasing the universes doesn't undo a purchase.
    try { for (const k of Object.keys(store)) if (k.startsWith('lv-') && k !== 'lv-remove-ads') store.removeItem(k); } catch {}
  }
  history.replaceState(null, '', location.pathname + location.search + '#/');
  location.reload();
}

// Photos added in an unfinished draft aren't referenced by any universe, so
// db.remove() can't find them. Clear what's left in the media store.
function clearOrphanMedia() {
  return new Promise(res => {
    try {
      const req = indexedDB.open('littleverse', 1);
      req.onupgradeneeded = () => {
        const idb = req.result;
        if (!idb.objectStoreNames.contains('universes')) idb.createObjectStore('universes', { keyPath: 'id' });
        if (!idb.objectStoreNames.contains('media')) idb.createObjectStore('media', { keyPath: 'id' });
      };
      req.onsuccess = () => {
        const idb = req.result;
        try {
          if (!idb.objectStoreNames.contains('media')) { idb.close(); res(); return; }
          const t = idb.transaction('media', 'readwrite');
          t.objectStore('media').clear();
          t.oncomplete = t.onerror = t.onabort = () => { idb.close(); res(); };
        } catch { idb.close(); res(); }
      };
      req.onerror = () => res();
      req.onblocked = () => res();
    } catch { res(); }
  });
}
