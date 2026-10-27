// Create a universe: a short wizard that ends in a little premiere.
// Who it's for → the occasion → names and the date → the two characters →
// the look → which worlds. The draft lives in sessionStorage, so a reload or a
// quick trip elsewhere doesn't lose anything.
import { h, ic, emo, screen, input, seg, toggle, confirmSheet, toast, pickFile, haptic } from './kit.js';
import { avatarBuilder, themePicker, dateField } from './pickers.js';
import { poster, posterVars } from './poster.js';
import { db, settings, compressImage, mediaURL } from '../lib/db.js';
import { RELATIONSHIPS, OCCASION_FOR, DEFAULT_THEME, WORLD_DEFS, SECTORS, HATS, recommendedWorlds, occById, themeById, themeOf } from '../lib/catalog.js';
import { statusBar } from './native.js';
import { newUniverse, verseName } from '../lib/templates.js';
import { todayISO, parseDate } from '../lib/dates.js';
import { DEFAULT_THEM, DEFAULT_ME } from '../core/cat.js';

const KEY = 'lv-create';
// Another screen can start the wizard with a name already in
// (e.g. "Make one back" on a received gift): sessionStorage['lv-create-prefill'] = '{"them":"Noor"}'.
const PREFILL = 'lv-create-prefill';
const STEPS = 6;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const draftStore = {
  load() { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; } },
  save(s) { try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch {} },
  clear() { try { sessionStorage.removeItem(KEY); } catch {} },
};

/* ======================================================================
   Copy that adapts to who it's for
   ====================================================================== */
const WHY = {
  partner: ['What’s the occasion?', 'Birthdays and anniversaries are the classics. “Just because” is underrated.'],
  bestie: ['What’s the occasion?', 'A big day, or no reason at all. Best friends don’t need one.'],
  friends: ['What’s the occasion?', 'One universe for the whole group. Everyone can play it on their own phone.'],
  family: ['What’s the occasion?', 'A birthday, a thank you, or a reminder that they’re loved.'],
  distance: ['What’s the occasion?', 'A countdown keeps the days in view until you’re in the same place again.'],
  memorial: ['What would you like to mark?', 'Remembrance is a gentle place to celebrate a life. Their birthday can still be theirs, too.'],
  kid: ['What are we celebrating?', 'Big milestones and small ones. Little ones love both.'],
  mentor: ['What would you like to say?', 'Most people never get a proper thank you. This is a good way to give one.'],
  colleague: ['What’s the occasion?', 'Farewells, birthdays and big wins. Better than a card everyone signs.'],
  pet: ['What’s the occasion?', 'They can’t read, but they will appreciate the attention.'],
  self: ['What’s the moment?', 'Make something for the version of you who opens it later.'],
};
const OCC_BLURB = {
  memorial: { remembrance: 'Celebrate their life and keep them close.', birthday: 'Mark the day that’s still theirs.', thanks: 'For everything they gave you.' },
  pet: { birthday: 'Or gotcha day. Treats are mandatory.', justbecause: 'Because they’re a very good friend.', getwell: 'For a vet visit or a slow week.', thanks: 'For every walk and every welcome home.' },
  self: { newyear: 'Hopes for the year, to open later.', birthday: 'A note for next year’s you.', congrats: 'Remember how this felt.', justbecause: 'A time capsule, no reason needed.' },
  distance: { reunion: 'Count the days until you’re together.', farewell: 'Before the miles start.' },
  friends: { farewell: 'When one of you is moving away.', reunion: 'Until everyone’s in one place again.', newyear: 'One more year of the group chat.' },
  colleague: { farewell: 'A last day, or a brand new job.' },
  mentor: { thanks: 'For what they taught you.' },
  kid: { congrats: 'First day of school, a big win, a new skill.' },
};
const NAME_PH = { partner: 'Mira', bestie: 'Jules', friends: 'The Thursday Club', family: 'Grandma Rose', distance: 'Sam', memorial: 'Grandpa Walt', kid: 'Ollie', mentor: 'Coach Rivera', colleague: 'Priya', pet: 'Biscuit', self: 'Future me' };

function themLabels(rel) {
  if (rel === 'friends') return ['The group’s name', 'Whatever you call yourselves. It goes on the poster.'];
  if (rel === 'self') return ['Who’s opening it', '“Future me” works, or just your name.'];
  return ['Their name', 'It goes on the poster and all through the film.'];
}
function meLabels(rel) {
  if (rel === 'self') return ['Your name, today', 'Shown as “a film by …” on the poster.'];
  return ['Your name', 'Shown as “a film by …”. Signing as a family or group? “The Bennetts” works too.'];
}

const nextNewYear = () => `${new Date().getFullYear() + 1}-01-01`;
// label, hint, default date, whether "I don't know the year" makes sense
function dateMeta(rel, occ) {
  const o = occById(occ);
  const m = { label: o.dateLabel, hint: '', def: todayISO(), noYear: true };
  switch (occ) {
    case 'birthday': case 'remembrance':
      m.label = rel === 'self' ? 'Your birthday' : rel === 'pet' ? 'Their birthday or gotcha day' : 'Their birthday';
      m.def = ''; m.hint = 'Not sure of the year? Tick the box and it’s left out.'; break;
    case 'belated': m.label = rel === 'self' ? 'The birthday you missed' : o.dateLabel; m.def = ''; m.hint = 'Their birthday. Not sure of the year? Tick the box.'; break;
    case 'anniversary': m.def = ''; m.hint = 'The first date, the wedding, the day it became official. Your call.'; break;
    case 'reunion': m.def = ''; m.noYear = false; m.hint = 'The countdown runs until this day.'; break;
    case 'newyear': m.def = nextNewYear(); m.noYear = false; m.hint = 'The day the new year starts.'; break;
    case 'sorry': case 'getwell': m.label = 'The date'; m.hint = 'Today’s date is fine.'; break;
    case 'congrats': m.hint = 'The graduation, the first day, or the day it happened.'; break;
    case 'farewell': m.hint = 'Their last day, or the day they leave.'; break;
    default: m.hint = 'Today works, or pick a day that means something.';
  }
  return m;
}

/* ======================================================================
   Draft state
   ====================================================================== */
function fresh() {
  return { v: 1, step: 0, pre: null, rel: null, occ: null, them: '', me: settings.get().name || '', date: '', yearKnown: true,
    dateTouched: false, photo: null, cast: 'them', themAvatar: null, meAvatar: null, theme: null, themeTouched: false,
    worlds: null, worldsTouched: false, touched: {}, dirty: false };
}

function detailErrors(s) {
  const e = {};
  if (!s.them.trim()) e.them = s.rel === 'friends' ? 'Add a name for the group' : s.rel === 'self' ? 'Add a name for the poster' : 'Add their name';
  if (!s.me.trim()) e.me = 'Add your name, so they know who made it';
  const p = parseDate(s.date);
  if (!s.date) e.date = 'Pick the date';
  else if (!p || p.y < 1900 || p.y > 2200) e.date = 'That date doesn’t look right';
  else {
    const t = todayISO();
    if (['birthday', 'belated', 'remembrance'].includes(s.occ) && s.yearKnown && s.date > t) e.date = 'That date is still to come. Only know the day and month? Tick “I don’t know the year”.';
    if (s.occ === 'anniversary' && s.yearKnown && s.date > t) e.date = 'That day hasn’t happened yet. Pick the day it started.';
    if (s.occ === 'reunion' && s.date < t) e.date = 'Pick a day that’s still ahead, so there’s something to count down to.';
  }
  return e;
}

function initState(ctx) {
  const pre = RELATIONSHIPS.some(r => r.id === ctx.params[0]) ? ctx.params[0] : null;
  let prefill = null;
  try { prefill = JSON.parse(sessionStorage.getItem(PREFILL) || 'null'); sessionStorage.removeItem(PREFILL); } catch {}
  const old = draftStore.load();
  if (old && old.v === 1 && !prefill && (!pre || old.pre === pre || old.rel === pre)) return sanitize({ ...fresh(), ...old });
  if (old && old.photo) db.dropMedia(old.photo);
  const s = fresh();
  if (pre) { s.rel = pre; s.pre = pre; s.step = 1; }
  if (prefill && prefill.them) s.them = String(prefill.them).slice(0, 32);
  if (prefill && prefill.rel && OCCASION_FOR[prefill.rel] && !pre) s.rel = prefill.rel;
  return s;
}
// never resume on a step whose earlier answers are missing
function sanitize(s) {
  if (!s.rel || !OCCASION_FOR[s.rel]) { s.rel = null; s.step = 0; }
  if (s.occ && s.rel && !OCCASION_FOR[s.rel].includes(s.occ)) s.occ = null;
  if (!s.occ) s.step = Math.min(s.step, 1);
  if (s.step > 2 && Object.keys(detailErrors(s)).length) s.step = 2;
  s.step = Math.max(0, Math.min(STEPS - 1, s.step | 0));
  return s;
}

/* ---------- starting characters: two distinct, friendly defaults ---------- */
const FUR = { cat: ['#ffffff', '#f3e3cf', '#b9b6c2', '#5b5566', '#ffc9d9'], bunny: ['#ffffff', '#f3e3cf', '#ffc9d9', '#b9b6c2'], bear: ['#d9a066', '#8a5a3c', '#f3e3cf'], fox: ['#ff9b52'], dog: ['#f3e3cf', '#d9a066', '#b9b6c2', '#ffffff'] };
const NICE = { species: ['cat', 'bunny', 'bear', 'fox', 'dog'], eyes: ['dots', 'wink', 'happy', 'stars', 'hearts'], mouth: ['tongue', 'smile', 'open', 'cat'], acc: ['none', 'none', 'lollipop', 'bow', 'flower', 'specs', 'shades', 'balloon'] };
const pickOne = a => a[Math.floor(Math.random() * a.length)];
const strip = ({ name, ...d }) => d;
function character(base, avoid = {}, force = {}) {
  let species = force.species || pickOne(NICE.species.filter(x => x !== avoid.species));
  const hat = pickOne(HATS.filter(x => x.side !== avoid.side));
  const { id, ...cols } = hat;
  return { ...strip(base), species, fur: force.fur || pickOne(FUR[species]), ...cols, eyes: force.eyes || pickOne(NICE.eyes), mouth: force.mouth || pickOne(NICE.mouth), acc: force.acc || pickOne(NICE.acc) };
}
function castFor(rel) {
  const gentle = rel === 'memorial';
  const soft = gentle ? { eyes: 'happy', mouth: 'smile', acc: pickOne(['none', 'flower', 'specs']) } : {};
  const them = character(DEFAULT_THEM, {}, { ...soft, ...(rel === 'pet' ? { species: pickOne(['dog', 'cat']) } : {}), ...(rel === 'kid' ? { acc: 'balloon' } : {}) });
  // future me is still you: same animal and fur, a different hat
  const me = rel === 'self'
    ? character(DEFAULT_ME, { side: them.side }, { species: them.species, fur: them.fur, eyes: 'dots' })
    : character(DEFAULT_ME, { species: them.species, side: them.side }, gentle ? { eyes: 'happy', mouth: 'smile', acc: 'none' } : {});
  return [them, me];
}

const ARTICLES = /^(the|a|an|my|our)$/i;
function studioName(me) {
  const words = me.trim().split(/\s+/);
  const rest = words.filter(w => !ARTICLES.test(w));
  const base = words.length > rest.length && rest.join(' ').length <= 18 ? rest.join(' ') : (rest[0] || words[0]);
  return `${base} Pictures`;
}

// A lightweight universe for the poster preview, before anything is saved.
function draftUniverse(s) {
  const occ = occById(s.occ);
  return {
    id: 'draft-' + (s.them || 'x'), rel: s.rel, occ: s.occ, theme: s.theme || DEFAULT_THEME[s.rel], date: s.date || todayISO(), yearKnown: s.yearKnown,
    studio: studioName(s.me || 'You'), them: { name: s.them.trim(), photo: s.photo, avatar: s.themAvatar }, me: { name: s.me.trim(), avatar: s.meAvatar },
    copy: { hero: { title: s.rel === 'memorial' && s.occ === 'birthday' ? 'Happy Birthday' : occ.title } },
  };
}

/* ======================================================================
   Screen
   ====================================================================== */
export async function render(ctx) {
  const s = initState(ctx);
  let dir = 0, cur = null, done = false, atNight = false;
  const save = () => { if (!done) draftStore.save(s); };

  const backBtn = h('button', { class: 'icon-b plain cw-nav', type: 'button', 'aria-label': 'Previous step', onclick: () => { haptic('light'); back(); } }, ic('chevron-left'));
  const closeBtn = h('button', { class: 'icon-b plain cw-nav', type: 'button', 'aria-label': 'Close', onclick: () => { haptic('light'); close(); } }, ic('x'));
  const segs = Array.from({ length: STEPS }, () => h('i'));
  const prog = h('div', { class: 'cw-prog', role: 'progressbar', 'aria-valuemin': '1', 'aria-valuemax': String(STEPS) }, ...segs);
  const bar = h('header', { class: 'cw-bar' }, h('div', { class: 'cw-l' }, backBtn), prog, h('div', { class: 'cw-r' }, closeBtn));
  const stage = h('div', { class: 'cw-stage' });
  const hint = h('p', { class: 'cw-hint', 'aria-live': 'polite', hidden: true });
  let nudged = false, lastStep = -1;
  const cta = h('button', { class: 'b primary lg block', type: 'button', onclick: () => {
    const msg = cur && cur.check ? cur.check() : null;
    if (msg) { nudged = true; refresh(); cta.classList.remove('shake'); void cta.offsetWidth; cta.classList.add('shake'); haptic('warning'); return; }
    next();
  } });
  const ctaWrap = h('div', { class: 'sticky-cta cw-cta' }, hint, cta);
  const root = screen({ tabs: false, anim: ctx.anim, cls: 'cw-scr' }, bar, stage, ctaWrap);

  const onScroll = () => bar.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });

  function refresh() {
    if (s.step !== lastStep) { nudged = false; lastStep = s.step; }
    const msg = cur.check ? cur.check() : null;
    cta.classList.toggle('is-off', !!msg); cta.setAttribute('aria-disabled', String(!!msg));
    hint.hidden = !(msg && nudged); hint.textContent = msg || '';
    const last = s.step === STEPS - 1;
    cta.replaceChildren(...(last ? ['Create universe'] : ['Continue']));
    segs.forEach((g, i) => g.style.setProperty('--f', i < s.step ? 1 : i > s.step ? 0 : (s.step === 3 && s.cast === 'them' ? .5 : 1)));
    prog.setAttribute('aria-valuenow', String(s.step + 1));
    prog.setAttribute('aria-label', `Step ${s.step + 1} of ${STEPS}`);
    backBtn.style.visibility = s.step === 0 ? 'hidden' : 'visible';
  }
  function paint() {
    cur = [stepWho, stepWhy, stepDetails, stepCast, stepLook, stepWorlds][s.step]();
    const el = h('div', { class: 'cw-step' + (dir < 0 ? ' back' : dir > 0 ? ' fwd' : '') }, cur.el);
    stage.replaceChildren(el);
    window.scrollTo(0, 0);
    refresh();
    save();
    if (dir) el.querySelector('h1')?.focus({ preventScroll: true });
  }
  const update = () => { s.dirty = true; save(); refresh(); };

  function next() {
    if (cta.disabled || done) return;
    haptic('medium');
    if (cur.onNext && cur.onNext() === false) return;
    if (s.step === STEPS - 1) { create(); return; }
    s.step++; dir = 1;
    if (s.step === 3) s.cast = 'them';
    paint();
  }
  function back() {
    if (cur.onBack && cur.onBack() === false) return;
    if (s.step === 0) { close(); return; }
    s.step--; dir = -1;
    if (s.step === 3) s.cast = 'me';
    paint();
  }
  async function close() {
    if (s.dirty) {
      const ok = await confirmSheet({ title: 'Discard this universe?', message: 'What you’ve chosen so far won’t be saved.', confirm: 'Discard', cancel: 'Keep making it', danger: true });
      if (!ok) return;
    }
    done = true;
    if (s.photo) db.dropMedia(s.photo);
    draftStore.clear();
    if (history.length > 1) history.back(); else ctx.replace('#/');
  }

  const head = (title, sub) => h('div', { class: 'cw-head' }, h('h1', { text: title, tabindex: '-1' }), sub ? h('p', { text: sub }) : null);

  // Choosing an answer on the first two steps moves on by itself, after a beat
  // long enough to see the mark land.
  const advanceFrom = step => setTimeout(() => { if (s.step === step && !done) next(); }, reduceMotion() ? 60 : 240);
  const choice = (id, title, blurb, picked, onpick, tag) => h('button', { class: 'choice', type: 'button', 'aria-pressed': String(picked), 'data-id': id, onclick: onpick },
    h('span', { class: 'ch-main' }, h('b', {}, title, tag ? h('span', { class: 'ch-tag', text: tag }) : null), blurb ? h('small', { text: blurb }) : null),
    h('span', { class: 'ch-mark', 'aria-hidden': 'true' }));
  const mark = (list, id) => list.querySelectorAll('.choice').forEach(t => t.setAttribute('aria-pressed', String(t.dataset.id === id)));

  /* ---------- 1. who ---------- */
  function stepWho() {
    const list = h('div', { class: 'choices', role: 'group', 'aria-label': 'Who it’s for' });
    for (const r of RELATIONSHIPS) {
      list.append(choice(r.id, r.label, r.blurb, s.rel === r.id, () => {
        haptic('select');
        if (s.rel !== r.id) {
          s.rel = r.id;
          if (s.occ && !OCCASION_FOR[r.id].includes(s.occ)) s.occ = null;
          if (!s.themeTouched) s.theme = null;
          if (!s.worldsTouched) s.worlds = null;
          if (s.occ && !s.dateTouched) { s.date = dateMeta(s.rel, s.occ).def; s.yearKnown = true; }
        }
        mark(list, r.id);
        update();
        advanceFrom(0);
      }));
    }
    return { el: h('div', {}, head('Who’s it for?', 'Pick the closest fit. It shapes the first draft of every word, and you can change all of them.'), list),
      check: () => s.rel ? null : 'Choose who it’s for to continue' };
  }

  /* ---------- 2. why ---------- */
  function stepWhy() {
    const ids = OCCASION_FOR[s.rel];
    const [title, sub] = WHY[s.rel] || WHY.partner;
    const list = h('div', { class: 'choices', role: 'group', 'aria-label': 'Occasion' });
    ids.forEach((id, i) => {
      const o = occById(id);
      const blurb = (OCC_BLURB[s.rel] && OCC_BLURB[s.rel][id]) || o.blurb;
      list.append(choice(id, o.label, blurb, s.occ === id, () => {
        haptic('select');
        if (s.occ !== id) {
          s.occ = id;
          if (!s.dateTouched) { s.date = dateMeta(s.rel, id).def; s.yearKnown = true; }
          if (!s.worldsTouched) s.worlds = null;
        }
        mark(list, id);
        update();
        advanceFrom(1);
      }, i === 0 ? 'Suggested' : null));
    });
    return { el: h('div', {}, head(title, sub), list), check: () => s.occ ? null : 'Choose an occasion to continue' };
  }

  /* ---------- 3. names, date, photo ---------- */
  function stepDetails() {
    const meta = dateMeta(s.rel, s.occ);
    if (!s.date && meta.def && !s.dateTouched) s.date = meta.def;
    if (!meta.noYear) s.yearKnown = true;
    const errs = {};
    const errEl = k => (errs[k] = h('p', { class: 'cw-err', role: 'alert', hidden: true }));
    const show = () => {
      const e = detailErrors(s);
      for (const k of ['them', 'me', 'date']) {
        const on = !!(e[k] && s.touched[k]);
        errs[k].hidden = !on;
        errs[k].replaceChildren(...(on ? [ic('info', 's'), h('span', { text: e[k] })] : []));
      }
      themIn.classList.toggle('bad', !!(e.them && s.touched.them));
      meIn.classList.toggle('bad', !!(e.me && s.touched.me));
      dateBox.querySelector('input[type=date]').classList.toggle('bad', !!(e.date && s.touched.date));
    };
    const [tl, th] = themLabels(s.rel), [ml, mh] = meLabels(s.rel);
    const themIn = input(s.them, { placeholder: NAME_PH[s.rel] ? `e.g. ${NAME_PH[s.rel]}` : 'Their name', maxlength: 32, oninput: v => { s.them = v; paintPhotoTitle(); update(); if (s.touched.them) show(); } });
    themIn.setAttribute('enterkeyhint', 'next');
    themIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); meIn.focus(); } });
    themIn.addEventListener('blur', () => { s.them = s.them.trim(); themIn.value = s.them; if (s.them || s.touched.them) { s.touched.them = true; show(); } save(); });
    const meIn = input(s.me, { placeholder: s.rel === 'memorial' ? 'The Bennetts' : 'Your name', maxlength: 32, oninput: v => { s.me = v; update(); if (s.touched.me) show(); } });
    meIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); meIn.blur(); } });
    meIn.addEventListener('blur', () => { s.me = s.me.trim(); meIn.value = s.me; s.touched.me = true; show(); save(); });
    themIn.id = 'cw-them'; meIn.id = 'cw-me';

    const dateBox = dateField({ value: s.date, yearKnown: s.yearKnown, label: meta.label, allowNoYear: meta.noYear,
      onChange: ({ date, yearKnown }) => { s.date = date; s.yearKnown = yearKnown; s.dateTouched = true; s.touched.date = true; update(); show(); } });
    dateBox.querySelector('input[type=date]').id = 'cw-date';

    // optional photo
    const ph = h('div', { class: 'cw-ph', 'aria-hidden': 'true' });
    const phTitle = h('b');
    const phActs = h('div', { class: 'cw-ph-acts' });
    function paintPhotoTitle() { phTitle.textContent = s.rel === 'self' ? 'A photo of you' : s.them.trim() ? `A photo of ${s.them.trim()}` : s.rel === 'friends' ? 'A group photo' : 'A photo of them'; }
    async function paintPhoto() {
      paintPhotoTitle();
      const url = s.photo ? await mediaURL(s.photo) : null;
      if (s.photo && !url) { s.photo = null; save(); }
      ph.classList.toggle('has', !!url);
      ph.replaceChildren(url ? h('img', { src: url, alt: '' }) : ic('camera'));
      phActs.replaceChildren(...(url
        ? [h('button', { class: 'b sm quiet', type: 'button', onclick: addPhoto }, 'Change'), h('button', { class: 'b sm quiet cw-rm', type: 'button', onclick: removePhoto }, 'Remove')]
        : [h('button', { class: 'b sm quiet', type: 'button', onclick: addPhoto }, ic('image', 's'), 'Add photo')]));
    }
    async function addPhoto() {
      haptic('light');
      const f = await pickFile('image/*');
      if (!f) return;
      const blob = await compressImage(f);
      const id = await db.putMedia(blob, { name: f.name || 'photo.jpg' });
      if (s.photo) db.dropMedia(s.photo);
      s.photo = id; update();
      await paintPhoto();
      haptic('success'); toast('Photo added');
    }
    async function removePhoto() {
      haptic('light');
      if (s.photo) await db.dropMedia(s.photo);
      s.photo = null; update();
      await paintPhoto();
      toast('Photo removed');
    }
    paintPhoto();

    const el = h('div', {},
      head('Names and the date', 'They go on the poster, in the film and all through the worlds.'),
      h('div', { class: 'field' }, h('label', { for: 'cw-them', text: tl }), themIn, errEl('them'), h('p', { class: 'hint-t', text: th })),
      h('div', { class: 'field' }, h('label', { for: 'cw-me', text: ml }), meIn, errEl('me'), h('p', { class: 'hint-t', text: mh })),
      h('div', { class: 'field' }, h('label', { for: 'cw-date', text: meta.label }), dateBox, errEl('date'), meta.hint ? h('p', { class: 'hint-t', text: meta.hint }) : null),
      h('div', { class: 'field' }, h('span', { class: 'lab', text: 'Photo' }),
        h('div', { class: 'cw-photo' }, ph, h('div', { class: 'cw-ph-main' }, phTitle, h('small', { text: 'Optional. For the poster, the film and the jigsaw.' }), phActs))));
    queueMicrotask(show);
    return {
      el,
      check: () => { const e = detailErrors(s); return e.them ? `${e.them} to continue` : e.me ? 'Add your name to continue' : e.date ? (s.date ? 'Check the date to continue' : 'Pick the date to continue') : null; },
      onNext: () => {
        s.them = s.them.trim(); s.me = s.me.trim();
        if (!settings.get().name && s.me) settings.set({ name: s.me });
      },
    };
  }

  /* ---------- 4. characters ---------- */
  function stepCast() {
    if (!s.themAvatar || !s.meAvatar) { [s.themAvatar, s.meAvatar] = castFor(s.rel); save(); }
    const themName = s.them.trim(), meName = s.me.trim();
    const sub = h('p');
    const holder = h('div', { class: 'cw-ab-holder' });
    const sw = seg([['them', themName], ['me', 'You']], s.cast, v => { if (v === s.cast) return; s.cast = v; mount(v === 'me' ? 1 : -1); refresh(); save(); });
    sw.classList.add('cw-seg');
    function mount(d = 0) {
      const who = s.cast, key = who + 'Avatar';
      sub.textContent = who === 'them'
        ? `${themName} stars in the film and flies through every world. Make them look the part.`
        : `And this is you, ${meName}. You’re in the film too, and hiding all over the worlds.`;
      const b = avatarBuilder(s[key], d2 => { s[key] = { ...d2 }; update(); }, { name: who === 'them' ? themName : meName, bg: s[key].bg });
      b.classList.add('cw-ab');
      if (d) b.classList.add(d > 0 ? 'fwd' : 'back');
      holder.replaceChildren(b);
      sw.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.v === who)));
    }
    mount();
    return {
      el: h('div', {}, h('div', { class: 'cw-head' }, h('h1', { text: 'Meet the cast', tabindex: '-1' }), sub), h('div', { class: 'cw-seg-wrap' }, sw), holder),
      onNext: () => { if (s.cast === 'them') { s.cast = 'me'; mount(1); refresh(); save(); window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' }); return false; } },
      onBack: () => { if (s.cast === 'me') { s.cast = 'them'; mount(-1); refresh(); save(); return false; } },
    };
  }

  /* ---------- 5. the look ---------- */
  function stepLook() {
    if (!s.theme) s.theme = DEFAULT_THEME[s.rel] || 'twilight';
    const hero = h('div', { class: 'cw-look' });
    const name = h('p', { class: 'cw-look-name' });
    const paintPoster = swap => {
      const d = draftUniverse(s);
      for (const [k, v] of Object.entries(posterVars(d))) hero.style.setProperty(k, v);
      const p = poster(d, { width: 184 });
      if (swap) p.classList.add('cw-swap');
      hero.replaceChildren(p);
      name.textContent = themeById(s.theme).label;
    };
    paintPoster(false);
    const picker = themePicker(s.theme, id => { s.theme = id; s.themeTouched = true; update(); paintPoster(true); });
    return { el: h('div', {}, head('Pick the look', 'Colors for the poster, the film and every world. Tap one to try it on.'), hero, picker) };
  }

  /* ---------- 6. worlds ---------- */
  function stepWorlds() {
    if (!s.worlds) s.worlds = recommendedWorlds(s.rel, s.occ);
    const count = h('b');
    const reset = h('button', { class: 'link', type: 'button' });
    const rows = new Map();
    const paintSummary = () => {
      const n = WORLD_DEFS.filter(w => s.worlds[w.id]).length;
      count.textContent = `${n} of ${WORLD_DEFS.length} switched on`;
      const rec = recommendedWorlds(s.rel, s.occ);
      const isRec = WORLD_DEFS.every(w => !!rec[w.id] === !!s.worlds[w.id]);
      const allOn = WORLD_DEFS.every(w => s.worlds[w.id]);
      reset.textContent = isRec ? (allOn ? '' : 'Switch all on') : 'Use suggested';
      reset.hidden = !reset.textContent;
    };
    reset.onclick = () => {
      haptic('select');
      const rec = recommendedWorlds(s.rel, s.occ);
      const isRec = WORLD_DEFS.every(w => !!rec[w.id] === !!s.worlds[w.id]);
      s.worlds = isRec ? Object.fromEntries(WORLD_DEFS.map(w => [w.id, true])) : rec;
      s.worldsTouched = !isRec ? false : true;
      for (const [id, r] of rows) { r.classList.toggle('off', !s.worlds[id]); r.querySelector('.tgl').setAttribute('aria-checked', String(!!s.worlds[id])); }
      paintSummary(); update();
    };
    const blocks = [];
    for (const sec of SECTORS) {
      const ws = WORLD_DEFS.filter(w => w.sector === sec.id);
      if (!ws.length) continue;
      blocks.push(h('div', { class: 'cw-sec' }, h('b', { text: sec.name }), h('small', { text: sec.sub.replace('{me}', s.me.trim() || 'someone') })));
      blocks.push(h('div', { class: 'group' }, ...ws.map(w => {
        const t = toggle(!!s.worlds[w.id], v => { s.worlds = { ...s.worlds, [w.id]: v }; s.worldsTouched = true; r.classList.toggle('off', !v); paintSummary(); update(); }, w.name);
        const r = h('div', { class: 'cw-w' + (s.worlds[w.id] ? '' : ' off'), onclick: () => t.click() },
          h('span', { class: 'cw-w-main' }, h('b', { text: w.name }), h('small', { text: w.line || w.blurb })), t);
        rows.set(w.id, r);
        return r;
      })));
    }
    paintSummary();
    return {
      el: h('div', {}, head('Choose the worlds', 'We switched on the ones that suit this occasion. You can change these any time.'),
        h('div', { class: 'cw-wsum' }, count, reset), ...blocks,
        h('p', { class: 'group-f', text: 'Every world you finish earns a passport stamp. Collect enough and the grand finale unlocks.' })),
      check: () => WORLD_DEFS.some(w => s.worlds[w.id]) ? null : 'Switch on at least one world',
    };
  }

  /* ---------- 7. create + premiere ---------- */
  async function create() {
    done = true;
    cta.disabled = true;
    const them = s.them.trim(), me = s.me.trim();
    if (!s.themAvatar || !s.meAvatar) [s.themAvatar, s.meAvatar] = castFor(s.rel);
    const u = newUniverse({ rel: s.rel, occ: s.occ, them, me, date: s.date, yearKnown: s.yearKnown, theme: s.theme || DEFAULT_THEME[s.rel], themAvatar: s.themAvatar, meAvatar: s.meAvatar });
    u.studio = studioName(me);
    u.them.photo = s.photo || null;
    u.worlds = { ...recommendedWorlds(s.rel, s.occ), ...(s.worlds || {}) };
    try { await db.put(u); }
    catch (e) { console.error(e); done = false; cta.disabled = false; toast('Couldn’t save. Try again.', { icon: 'info' }); return; }
    draftStore.clear();
    removeEventListener('scroll', onScroll);
    root.replaceChildren(premiere(u));
    // the premiere is night: the status bar goes light-on-dark until the screen is left
    statusBar('night', themeOf(u).night); atNight = true;
    haptic('success');
  }

  function premiere(u) {
    const sparks = h('div', { class: 'cw-sparks', 'aria-hidden': 'true' });
    const cols = ['var(--p-gold)', 'var(--p-rose)', 'var(--p-paper)', 'var(--p-gold)'];
    const n = 0; // the premiere is quiet now: the poster is the moment
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * .35;
      const dist = 130 + Math.random() * 150;
      sparks.append(h('i', { class: 'cw-spark' + (i % 3 === 0 ? ' dot' : ''), style: {
        '--dx': `${(Math.cos(a) * dist).toFixed(1)}px`, '--dy': `${(Math.sin(a) * dist * .95).toFixed(1)}px`, '--s': `${(7 + Math.random() * 12).toFixed(1)}px`,
        '--c': cols[i % cols.length], '--d': `${(1.2 + Math.random() * .9).toFixed(2)}s`, '--dl': `${(.42 + Math.random() * .22).toFixed(2)}s`, '--r': `${Math.round(Math.random() * 300 - 150)}deg` } }));
    }
    const twinkles = h('div', { class: 'cw-twinkles', 'aria-hidden': 'true' },
      ...[[6, 14, 14], [88, 8, 10], [94, 46, 16], [2, 58, 11], [80, 86, 13], [14, 90, 9], [50, -4, 9]].map(([x, y, sz], i) =>
        h('i', { style: { left: x + '%', top: y + '%', '--s': sz + 'px', '--dl': (1.4 + i * .23).toFixed(2) + 's' } })));
    const playIt = () => {
      haptic('medium');
      // swap the wizard's history entry for the universe page, then play on top of it
      history.replaceState(history.state, '', `#/u/${u.id}`);
      location.hash = `#/p/${u.id}`;
    };
    const customize = () => { haptic('light'); location.replace(`#/u/${u.id}`); };
    const them = u.them.name;
    return h('section', { class: 'cw-reveal', style: posterVars(u), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'cw-rv-title' },
      h('div', { class: 'cw-rv-main' },
        h('div', { class: 'cw-rv-stage' }, h('div', { class: 'cw-rv-rays', 'aria-hidden': 'true' }), h('div', { class: 'cw-rv-glow', 'aria-hidden': 'true' }), twinkles, h('div', { class: 'cw-rv-poster' }, poster(u, { width: 220 })), sparks),
        h('div', { class: 'cw-rv-text' },
          h('span', { class: 'cw-rv-kicker' }, 'Now showing'),
          h('h2', { id: 'cw-rv-title', text: 'Your universe is ready' }),
          h('p', { text: `${verseName(them)} is ready for ${them}. Play it through once, then make every word your own.` }))),
      h('div', { class: 'cw-rv-acts' },
        h('button', { class: 'b primary lg block', type: 'button', onclick: playIt }, 'Play it'),
        h('button', { class: 'b quiet block', type: 'button', onclick: customize }, 'Customize')));
  }

  paint();
  return {
    el: root,
    title: 'New universe',
    cleanup: () => { removeEventListener('scroll', onScroll); if (atNight) statusBar('day'); },
  };
}
