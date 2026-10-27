// The opening film: a short feature in reels, built entirely from the playing
// universe's own words (U.copy.film). Title card, two chapters, a letter, an
// epilogue, the credits and a post-credits scene, with director's commentary,
// a reel progress bar, a dance on the hill, a chord translator, a star catch
// and a cake (blow the candles out, or light them one by one).
import { h } from '../core/dom.js';
import { liveValues, titleFont } from '../active.js';
import { WORLDS } from '../worlds.js';
import { lightKm, AU } from '../lib/dates.js';

// live values worth a highlight when they appear inside a sentence
const HL = new Set(['daysLate', 'daysUntil', 'daysSince', 'years', 'days', 'moons', 'lightyears', 'km', 'au', 'kmLate', 'auLate', 'hoursUntil', 'pluto', 'plutoLate']);
// stats that only make sense once the date is in the past
const SINCE = new Set(['years', 'days', 'moons', 'lightyears', 'km', 'au', 'daysSince', 'pluto']);
const CANDLES = 5;

const fmtBig = n => {
  if (n >= 1e12) return (n / 1e12).toFixed(n >= 1e13 ? 1 : 2) + ' trillion';
  if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 1 : 2) + ' billion';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' million';
  return Math.round(n).toLocaleString('en-US');
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// blend two hex colors (t = 0 → a, 1 → b)
function mix(a, b, t) {
  const p = x => { const m = /^#?([0-9a-f]{6})$/i.exec(x || ''); const n = m ? parseInt(m[1], 16) : 0; return [n >> 16, (n >> 8) & 255, n & 255]; };
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

// Size a display line so its longest word fits, allowing a balanced second line.
let mctx = null;
function fitDisplay(el, { max, min = 34, spacing = 0, box }) {
  const avail = ((box || el.parentElement)?.clientWidth || 320) * .92;
  const words = (el.textContent || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return;
  mctx = mctx || document.createElement('canvas').getContext('2d');
  const fam = getComputedStyle(el).fontFamily || 'Italiana, serif';
  mctx.font = `100px ${fam}`;
  const W = t => mctx.measureText(t).width + spacing * 100 * t.length;
  const one = W(words.join(' '));
  let two = Infinity;
  for (let i = 1; i < words.length; i++) two = Math.min(two, Math.max(W(words.slice(0, i).join(' ')), W(words.slice(i).join(' '))));
  const s1 = avail / one * 100, s2 = avail / two * 100;
  const size = Math.max(min, Math.min(max, s1 >= max * .72 ? s1 : Math.max(s1, s2)));
  el.style.fontSize = size.toFixed(1) + 'px';
}

export default {
  css: 'film',
  mount(ctx) {
    const { U, store, music, fx, audio, toast, cat, reduce } = ctx;
    const C = U.copy || {}, FC = C.film || {}, CM = C.commentary || {}, T = U.theme;
    const F = s => U.fill(String(s ?? ''));
    const isOn = s => !!s && s.on !== false;
    const v = liveValues();
    const them = U.them.name, me = U.me.name, gentle = U.gentle;
    const themD = cat.getDesign(), meD = cat.PRESETS.me;
    const confettiCols = [T.gold, T.rose, T.hud, T.lilac, T.paper];
    const haptic = k => { try { ctx.haptic(k); } catch {} };

    // a sentence with its live numbers in <strong>
    function rich(s) {
      s = String(s ?? '');
      const out = []; const re = /\{(\w+)\}/g; let m, last = 0;
      while ((m = re.exec(s))) {
        if (m.index > last) out.push(s.slice(last, m.index));
        const k = m[1];
        if (k in v) out.push(HL.has(k) ? h('strong', { text: String(v[k]) }) : String(v[k]));
        else out.push(U.fill(m[0]));
        last = re.lastIndex;
      }
      out.push(s.slice(last));
      return out;
    }
    // slates read as a phrase: "Scene 1 · The hill" becomes "Scene 1: The hill"
    const K = s => F(s).replace(/\s+·\s+/g, ': ');
    const head = (sec, extra) => [
      sec.kicker ? h('p', { class: 'kicker', text: K(sec.kicker) }) : null,
      sec.title ? h('h3', { text: F(sec.title) }) : null,
      sec.lede ? h('p', { class: 'lede' }, rich(sec.lede)) : null,
      extra || null,
    ];

    /* ================= title card ================= */
    const hero = C.hero || {};
    // a memorial keeps the title card plain: no "in {scope}" gimmick (only the default line is changed)
    const DEFAULT_SCOPE = '{studio} presents · in {scope}';
    const scopeLine = F(gentle && (!hero.scope || hero.scope === DEFAULT_SCOPE || hero.scope === F(DEFAULT_SCOPE)) ? '{studio} presents' : hero.scope || '{studio} presents');
    const scopeEl = h('p', { class: 'scope' }, scopeLine.split(/\s+·\s+/).map(part => {
      const i = U.scope ? part.indexOf(U.scope) : -1;
      return h('span', {}, i < 0 ? part : [part.slice(0, i), h('b', { text: U.scope }), part.slice(i + U.scope.length)]);
    }));
    const nameEl = h('span', { class: 'who-name', text: them, role: 'button', tabindex: '0', 'aria-label': them });
    const titleEl = h('h1', { class: 'title' }, hero.title ? h('span', { class: 'occ', text: F(hero.title) }) : null, nameEl);
    let lineKids;
    if (U.occ === 'belated' && v.daysLateN === 0) lineKids = ['Premiering ', h('strong', { text: 'right on time' }), '.'];
    else lineKids = rich(hero.line || '');
    const lineEl = hero.line || U.occ === 'belated' ? h('p', { class: 'late' }, lineKids) : null;

    function portrait(who) {
      const p = who === 'them' ? U.them : U.me, d = who === 'them' ? themD : meD;
      const box = h('div', { class: 'portrait ' + who, style: { '--pbg': d.bg || T.dusk } });
      if (p.photoURL) box.append(h('img', { src: p.photoURL, alt: p.name, decoding: 'async' }));
      else box.append(h('div', { class: 'av', html: cat.catSVG(d, { spin: false }) }));
      return box;
    }
    const figure = (who, cap) => h('figure', { class: who },
      portrait(who),
      h('figcaption', {}, h('span', { class: 'nm', text: who === 'them' ? them : me }), cap ? h('small', { text: F(cap) }) : null));
    const duo = h('div', { class: 'duo' }, figure('them', hero.themCap), h('span', { class: 'amp', 'aria-hidden': 'true', text: '&' }), figure('me', hero.meCap));

    const startBtn = h('button', { class: 'btn solid big', type: 'button' }, 'Start the film', h('span', { class: 'arr', 'aria-hidden': 'true', text: '↓' }));
    // (the soundtrack lives in the dock, one thumb away, so the title card doesn't repeat it)
    const cmBtn = h('button', { class: 'chip-toggle', type: 'button', 'aria-pressed': 'false' }, h('span', { class: 'dot' }), 'Director’s commentary');

    const heroEl = h('header', { class: 'hero', 'data-cm': 'hero' },
      h('div', { class: 'halo', 'aria-hidden': 'true' }),
      scopeEl, titleEl, lineEl, duo,
      h('div', { class: 'cta' }, startBtn, h('div', { class: 'extras' }, cmBtn)));

    /* ================= chapters ================= */
    const chapter = (id, cm, reel, ch, cls) => h('section', { class: 'chapter ' + cls, id, 'data-cm': cm },
      h('p', { class: 'reel-k' }, h('span', { text: reel })),
      h('h2', { class: 'season', text: F(ch.title) }),
      ch.sub ? h('p', { class: 'sub', text: F(ch.sub) }) : null);

    const parts = [];
    const logOn = isOn(FC.log) && ((FC.log.rows || []).length || FC.log.title);
    const statsOn = isOn(FC.stats) && (FC.stats.list || []).length;
    if (FC.ch1 && FC.ch1.title && (logOn || statsOn)) parts.push(chapter('ch1', 'ch1', 'Reel one', FC.ch1, 'c1'));

    /* ---- mission log ---- */
    if (logOn) {
      const rows = FC.log.rows || [];
      parts.push(h('section', { class: 'block log-block', 'data-cm': 'log' }, head(FC.log),
        rows.length ? h('div', { class: 'hudbox', role: 'log' },
          h('div', { class: 'hud-head' }, h('span', { text: `Logbook, ${U.scope}` }), h('span', { text: `Crew: ${me}` })),
          h('div', { class: 'log' }, rows.map((r, i) => h('div', { class: 'lrow' },
            h('span', { class: 'd', text: F(r.d) }),
            h('span', { class: 't ' + (r.c || '') }, F(r.t), i === rows.length - 1 ? h('i', { class: 'cursor', 'aria-hidden': 'true' }) : null))))) : null));
    }

    /* ---- by the numbers ---- */
    if (statsOn) {
      const list = FC.stats.list;
      const late = list.some(s => /Late$/.test(s.k));
      const future = U.date.daysSince < 0 && list.some(s => SINCE.has(s.k));
      const split = (str) => { const m = /^([\d.,]+|∞)\s*(.*)$/.exec(String(str).trim()); return m ? [m[1], m[2]] : [String(str), '']; };
      let items, lede = FC.stats.lede;
      if (future) {
        // the date hasn't happened yet: count down to it instead of up from it
        const n = U.date.daysUntil;
        const [kn, ku] = split(fmtBig(lightKm(n)));
        items = [
          { num: n.toLocaleString('en-US'), unit: '', label: n === 1 ? 'day to go' : 'days to go' },
          { num: (n * 24).toLocaleString('en-US'), unit: '', label: 'hours, if you’re counting' },
          { num: kn, unit: ku, label: 'km light will travel before then' },
          ...list.filter(s => s.k === 'fixed').map(s => ({ num: split(F(s.v))[0], unit: split(F(s.v))[1], label: F(s.l) })),
        ].slice(0, 4);
        if (/\{(au|km|days|daysSince|lightyears|years|moons|pluto)\}/.test(lede || '')) {
          const au = Math.round(lightKm(n) / AU).toLocaleString('en-US') + ' AU';
          lede = null;
          items.lede = ['Light will cross ', h('strong', { text: au }), ` before ${U.date.long} gets here. This message only had to get from ${me} to you.`];
        }
      } else {
        items = list.map(s => {
          const raw = s.k === 'fixed' ? F(s.v) : (v[s.k + 'N'] ?? v[s.k]);
          if (raw === '' || raw == null) return null;
          const [num, unit] = typeof raw === 'number' ? [raw.toLocaleString('en-US'), ''] : split(raw);
          return { num, unit, label: F(late ? String(s.l || '').replace(/\{pluto\}/g, '{plutoLate}') : s.l) };
        }).filter(Boolean);
      }
      const ledeEl = items.lede ? h('p', { class: 'lede' }, items.lede) : lede ? h('p', { class: 'lede' }, rich(late ? lede.replace(/\{pluto\}/g, '{plutoLate}') : lede)) : null;
      parts.push(h('section', { class: 'block stats-block', 'data-cm': 'stats' },
        h('p', { class: 'kicker', text: 'By the numbers' }),
        h('div', { class: 'stats' + (items.length % 2 ? ' odd' : '') }, items.map(s => h('div', { class: 'stat' },
          h('b', {}, h('span', { class: 'num', text: s.num }), s.unit ? h('small', { text: s.unit }) : null),
          h('span', { class: 'l', text: s.label })))),
        ledeEl));
    }

    const hillOn = isOn(FC.hill), chordsOn = isOn(FC.chords), catchOn = isOn(FC.catch), cakeOn = isOn(FC.cake), letterOn = isOn(FC.letter);
    if (FC.ch2 && FC.ch2.title && (hillOn || chordsOn || catchOn || cakeOn || letterOn)) parts.push(chapter('ch2', 'ch2', 'Reel two', FC.ch2, 'c2'));

    /* ---- the hill ---- */
    let stage, pair, danceBtn, danceHint, stageState;
    if (hillOn) {
      stage = h('div', { class: 'stage', role: 'img', 'aria-label': `A hill at twilight with ${them} and ${me} under a streetlamp. Tap to make stars.` },
        h('div', { class: 'scene-svg' }),
        h('div', { class: 'stage-caption' }, h('span', { text: 'Loc: a hill, somewhere' }), stageState = h('span', { text: 'Scene: standing around' })),
        h('span', { class: 'shadow l', 'aria-hidden': 'true' }), h('span', { class: 'shadow r', 'aria-hidden': 'true' }),
        pair = h('div', { class: 'pair', 'aria-hidden': 'true' },
          h('div', { class: 'spin' },
            h('div', { class: 'slot l' }, h('div', { class: 'who', html: cat.catSVG(themD, { spin: false }) })),
            h('div', { class: 'slot r' }, h('div', { class: 'who', html: cat.catSVG(meD, { spin: false }) })))));
      parts.push(h('section', { class: 'block hill-block', 'data-cm': 'hill' }, head(FC.hill), stage,
        h('div', { class: 'act' },
          danceBtn = h('button', { class: 'btn rose solid', type: 'button', text: 'Dance' }),
          danceHint = h('span', { class: 'hint', text: gentle ? 'First, a slow dance on the hill.' : 'First, a little tap dance on the hill.' }))));
    }

    /* ---- chords ---- */
    let msgIn, barsEl, playMsgBtn, translated;
    if (chordsOn) {
      // the default lede ends on a joke ("…not accurate. {me} made it up."); a memorial drops it
      const chordsSec = gentle && FC.chords.lede ? { ...FC.chords, lede: String(FC.chords.lede).replace(/\s*The translation is not accurate\.\s*[^.]{1,80}\bmade it up\./, '') } : FC.chords;
      parts.push(h('section', { class: 'block chords-block', 'data-cm': 'chords' }, head(chordsSec),
        h('div', { class: 'translator' },
          h('label', { for: 'film-msg', text: `Message to ${them}` }),
          msgIn = h('input', { id: 'film-msg', type: 'text', maxlength: '60', value: F(FC.chords.message || `hello ${them}`), autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'go' }),
          barsEl = h('div', { class: 'bars', 'aria-hidden': 'true' }),
          h('div', { class: 'act' },
            playMsgBtn = h('button', { class: 'btn hud solid', type: 'button' }, '▶ Play as chords'),
            h('span', { class: 'hint', text: 'Every letter becomes a chord.' })),
          translated = h('p', { class: 'translated', 'aria-live': 'polite', text: 'Awaiting transmission…' }))));
    }

    /* ---- star catch ---- */
    let catchCv, wishList, fuelFill, fuelCount;
    const wishes = ((FC.catch && FC.catch.wishes) || []).map(F).filter(Boolean).slice(0, 12);
    const N = wishes.length || 12;
    if (catchOn) {
      let catchSec = FC.catch;
      if (gentle) {
        // only the generated defaults are swapped for their memorial versions; edited text stays as written
        catchSec = { ...catchSec };
        if (/^Catch 12 stars, one for every month ahead\.?$/.test(String(catchSec.title || '').trim())) catchSec.title = 'Catch 12 stars, one for every month we carry you with us';
        if (/^Scene 3 · refuelling$/i.test(String(catchSec.kicker || '').trim())) catchSec.kicker = 'Scene 3 · twelve wishes';
      }
      parts.push(h('section', { class: 'block catch-block', 'data-cm': 'catch' }, head(catchSec),
        h('div', { class: 'catch-wrap' },
          catchCv = h('canvas', { id: 'film-catch', 'aria-label': 'Falling stars. Tap them to catch wishes.' }),
          h('div', { class: 'fuel' }, h('span', { text: gentle ? 'Wishes' : 'Fuel' }), h('div', { class: 'track' }, fuelFill = h('div', { class: 'fill' })), fuelCount = h('span', { text: `0 / ${N}` }))),
        wishes.length ? wishList = h('ol', { class: 'wishes', 'aria-live': 'polite' }) : null));
    }

    /* ---- cake ---- */
    const cake = FC.cake || {};
    const light = cake.mode === 'light';
    let cakeSvg, candleCount, cakeBig, cakeSmall, micBtn, relightBtn, micMeter;
    if (cakeOn) {
      cakeSvg = h('div', { class: 'cake-art' });
      parts.push(h('section', { class: 'block cake-block' + (light ? ' light' : ''), id: 'cakeSec', 'data-cm': 'cake' },
        cake.kicker ? h('p', { class: 'kicker', text: K(cake.kicker) }) : null,
        h('div', { class: 'cake-area' }, cakeSvg,
          h('div', { class: 'cake-msg' },
            candleCount = h('p', { class: 'count' }),
            cakeBig = h('p', { class: 'big', text: F(cake.big) }),
            cakeSmall = h('p', { class: 'lede', text: F(cake.small) }),
            light ? null : h('div', { class: 'act' },
              micBtn = h('button', { class: 'btn hud', type: 'button', text: '🎤 Blow into the mic' }),
              relightBtn = h('button', { class: 'btn', type: 'button', text: 'Relight the candles', hidden: true })),
            light ? null : micMeter = h('div', { class: 'micmeter', hidden: true }, h('i'))))));
    }

    /* ---- the letter ---- */
    let letterEl = null;
    if (letterOn) {
      const L = FC.letter;
      const paras = String(F(L.body || '')).replace(/\r/g, '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
      const greet = paras.length > 1 && paras[0].length <= 34 && !paras[0].includes('\n') ? paras.shift() : null;
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      letterEl = h('article', { class: 'letter' },
        greet ? h('p', { class: 'to', text: greet }) : null,
        paras.map(p => h('p', { text: p })),
        L.sig ? h('p', { class: 'sig', text: F(L.sig) }) : null,
        h('p', { class: 'stamp', text: `Postmarked ${today}, via ${U.studio}` }));
      parts.push(h('section', { class: 'block letter-block', id: 'letterSec', 'data-cm': 'letter' },
        L.kicker ? h('p', { class: 'kicker', text: K(L.kicker) }) : null, letterEl));
    }

    /* ---- epilogue ---- */
    const TL = FC.timelines;
    const tlOn = isOn(TL) && ((TL.a && (TL.a.rows || []).length) || (TL.b && (TL.b.rows || []).length));
    if (FC.epi && FC.epi.title && tlOn) parts.push(chapter('epilogue', 'epilogue', 'Reel three', FC.epi, 'c3'));
    if (tlOn) {
      const col = (t, cls) => t && (t.rows || []).length ? h('div', { class: 'tl ' + cls },
        h('h4', { text: F(t.title) }),
        h('ol', {}, t.rows.map(r => h('li', {}, h('span', { text: F(r.t) }), h('p', { text: F(r.x) }))))) : null;
      const couponsOn = WORLDS.some(w => w.id === 'coupons');
      parts.push(h('section', { class: 'block tl-block' },
        h('div', { class: 'timelines' }, col(TL.a, 'tl-a'), col(TL.b, 'tl-b')),
        TL.closing ? h('p', { class: 'closing', text: F(TL.closing) }) : null,
        couponsOn && TL.redeem ? h('p', { class: 'tl-redeem' }, h('a', { href: '#/w/coupons', text: F(TL.redeem) + ' ✦' })) : null));
    }

    /* ---- credits ---- */
    const againBtn = h('button', { class: 'btn rose', type: 'button', text: gentle ? 'Send up some stars' : 'One more round of confetti' });
    const finEl = h('p', { class: 'end', text: 'Fin.' });
    const credits = h('footer', { class: 'credits', id: 'credits', 'data-cm': 'credits' },
      (FC.credits || []).filter(c => c && (c.name || c.role)).map(c => h('div', { class: 'cr' },
        c.role ? h('p', { class: 'role', text: F(c.role) }) : null,
        c.name ? h('p', { class: 'name' + (F(c.name).length > 34 ? ' xlong' : F(c.name).length > 20 ? ' long' : ''), text: F(c.name) }) : null,
        c.note ? h('p', { class: 'note', text: F(c.note) }) : null)),
      FC.disclaimer ? h('p', { class: 'disclaimer', text: F(FC.disclaimer) }) : null,
      finEl,
      h('div', { class: 'cta' }, againBtn));

    /* ---- post-credits ---- */
    const post = FC.post || {};
    const pcCat = h('div', { class: 'pc-cat', 'aria-hidden': 'true', html: cat.catSVG(themD, { spin: true }) });
    const postEl = h('section', { class: 'postcredits', id: 'postcredits' },
      h('p', { class: 'kicker rose', text: 'Post-credits scene' }),
      post.title ? h('h2', { text: F(post.title) }) : null,
      post.lede ? h('p', { class: 'lede' }, rich(post.lede)) : null,
      h('div', { class: 'pc-launch' }, h('div', { class: 'pc-trail', 'aria-hidden': 'true' }), pcCat,
        h('a', { class: 'btn solid big', href: '#/map', text: `Enter the ${U.verse} ✦` })));

    // the reel bar: a slim frosted strip at the top with the current chapter and a progress line
    const reelFill = h('i', { class: 'reelfill' });
    const reelbar = h('div', { class: 'reelbar' }, reelFill);
    const reelNow = h('p', { class: 'reel-now' });
    const reelTop = h('div', { class: 'reel-top', 'aria-hidden': 'true' }, reelNow, reelbar);
    const film = h('div', { class: 'film' + (gentle ? ' gentle' : '') }, reelTop, h('main', {}, heroEl, parts, credits, postEl));
    ctx.root.append(film);
    // scenes that are scrolled out of view stop animating (candles, the dance, the bobbing cast)
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('idle', !e.isIntersecting)), { rootMargin: '160px 0px' });
      film.querySelectorAll('main > *').forEach(el => io.observe(el));
      ctx.cleanup(() => io.disconnect());
    }

    /* ================= director's commentary ================= */
    for (const el of film.querySelectorAll('[data-cm]')) {
      const t = CM[el.dataset.cm];
      if (!t) continue;
      const note = h('p', { class: 'cm-note' }, F(t));
      const after = el.matches('.block') ? [...el.children].find(c => c.matches('.lede')) || [...el.children].find(c => c.matches('h3')) : null;
      if (after) after.after(note); else el.append(note);
    }
    const setCm = on => { film.classList.toggle('commentary', on); cmBtn.setAttribute('aria-pressed', String(on)); store.set('film.commentary', on); };
    setCm(!!store.get('film.commentary', false));
    cmBtn.onclick = () => {
      const on = !film.classList.contains('commentary'); setCm(on); audio.sfx('click'); haptic('select');
      if (on) toast(`Director’s commentary on. ${me}’${/s$/i.test(me) ? '' : 's'} notes are now in the margins.`);
      ctx.timeout(measure, 60);
    };

    /* ================= title card behavior ================= */
    const firstScene = film.querySelector('main > section');
    startBtn.onclick = () => { haptic('medium'); (firstScene || credits).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); };
    let titleTaps = 0, titleT;
    const tapTitle = () => {
      titleTaps++; clearTimeout(titleT); titleT = setTimeout(() => { titleTaps = 0; }, 2500);
      nameEl.classList.remove('wiggle'); void nameEl.offsetWidth; nameEl.classList.add('wiggle');
      audio.tone(72 + (titleTaps % 12), undefined, .3, .05, 'sine');
      if (titleTaps === 12) {
        titleTaps = 0; fx.confetti(gentle ? 90 : 200, { stars: true, colors: confettiCols }); audio.sfx('win'); haptic('success');
        toast(gentle ? `Twelve taps. A little light, for ${them}.` : 'Twelve taps. You found a secret.');
        if (!store.seen('egg-title12')) ctx.award(12, nameEl);
      }
    };
    nameEl.addEventListener('click', tapTitle);
    nameEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tapTitle(); } });
    ctx.cleanup(() => clearTimeout(titleT));

    // fit the big name (and long chapter titles) to the phone
    const fitAll = () => {
      const k = heroEl.classList.contains('tighter') ? .7 : heroEl.classList.contains('tight') ? .84 : 1;
      fitDisplay(nameEl, { max: Math.min(200, innerWidth * .27, innerHeight * .15 * k), min: 40, spacing: .02, box: heroEl });
      film.querySelectorAll('.chapter .season').forEach(el => fitDisplay(el, { max: Math.min(132, innerWidth * .19), min: 40, spacing: .08, box: el.parentElement }));
    };
    // the title card must fit above the dock: tighten it step by step on short screens
    const fitHero = () => {
      heroEl.classList.remove('tight', 'tighter');
      fitAll();
      // a director's note under the buttons may scroll; only the title card itself has to fit
      const note = () => [...heroEl.children].filter(c => c.matches('.cm-note')).reduce((a, c) => a + (c.offsetHeight ? c.offsetHeight + 16 : 0), 0);
      for (const cls of ['tight', 'tighter']) {
        if (heroEl.offsetHeight - note() <= innerHeight + 1) break;
        heroEl.classList.add(cls);
        fitAll();
      }
    };
    fitHero();
    if (document.fonts && document.fonts.load) document.fonts.load(titleFont()).then(() => { if (ctx.alive()) { fitHero(); fitCakeName(); measure(); } }).catch(() => {});

    /* ================= reel progress bar ================= */
    const marks = [['ch1', FC.ch1 && F(FC.ch1.title), 'Reel one'], ['ch2', FC.ch2 && F(FC.ch2.title), 'Reel two'], ['letterSec', 'The letter'], ['epilogue', FC.epi && F(FC.epi.title), 'Reel three'], ['credits', 'Credits']]
      .map(([id, label, reel]) => ({ el: film.querySelector('#' + id), label, reel })).filter(m => m.el && m.label);
    for (const m of marks) { m.tick = h('span', { class: 'tick' }); reelbar.append(m.tick); }
    let total = 1, nowT = 0, lastLabel = '';
    function measure() {
      total = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      for (const m of marks) { m.y = m.el.getBoundingClientRect().top + scrollY; m.tick.style.left = Math.min(98, m.y / total * 100) + '%'; }
    }
    function onScroll() {
      const p = Math.min(1, scrollY / total);
      reelFill.style.transform = `scaleX(${p})`;
      for (const m of marks) m.tick.classList.toggle('past', m.y <= scrollY + 4 || p >= .999);
      let cur = null;
      for (const m of marks) if (m.y <= scrollY + innerHeight * .35) cur = m;
      const show = !!cur && scrollY > innerHeight * .6;
      reelTop.classList.toggle('on', show);
      const key = cur ? cur.label : '';
      if (show && key !== lastLabel) {
        const paint = () => { reelNow.replaceChildren(...[cur.reel ? h('span', { class: 'rk', text: cur.reel }) : null, h('span', { class: 'rt', text: cur.label })].filter(Boolean)); reelNow.classList.remove('swap'); };
        if (lastLabel) { reelNow.classList.add('swap'); clearTimeout(nowT); nowT = setTimeout(paint, 160); } else paint();
        lastLabel = key;
      }
    }
    ctx.on(window, 'scroll', onScroll, { passive: true });
    let lastW = innerWidth, lastH = innerHeight;
    ctx.on(window, 'resize', () => {
      // mobile browsers resize when their toolbars slide; only refit the title card for real changes
      if (innerWidth !== lastW || Math.abs(innerHeight - lastH) > 120) { lastW = innerWidth; lastH = innerHeight; fitHero(); } else fitAll();
      measure(); onScroll();
    });
    ctx.timeout(() => { measure(); onScroll(); }, 300);
    ctx.timeout(measure, 1500);
    ctx.cleanup(() => clearTimeout(nowT));

    /* ================= the hill ================= */
    if (hillOn) {
      const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
      const stars = Array.from({ length: 60 }, () => [rnd(), rnd() * .62, rnd() * 1.2 + .35, .3 + rnd() * .7]);
      const city = Array.from({ length: 70 }, () => [rnd(), rnd(), rnd() * 1 + .4, .35 + rnd() * .6]);
      const sceneBox = stage.querySelector('.scene-svg');
      const paint = () => {
        const W = Math.round(stage.clientWidth) || 360, H = Math.round(stage.clientHeight) || 440;
        const gy = H * .79;                                   // where the two of them stand
        const hillBack = mix(T.night, T.horizon, .32), hillFront = mix(T.night, '#000000', .25), ink = mix(T.night, '#000000', .45), bench = mix(T.night, T.horizon, .6);
        const lampX = W * .85, lampTop = H * .5, lampBase = H * .9;
        const benchX = W * .055, benchY = H * .875, bw = Math.min(70, W * .17);
        stage.style.setProperty('--gy', (H - gy) + 'px');
        sceneBox.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
          <defs>
            <linearGradient id="film-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="${T.night}"/><stop offset=".34" stop-color="${T.dusk}"/><stop offset=".56" stop-color="${T.horizon}"/>
              <stop offset=".7" stop-color="${mix(T.horizon, T.rose, .55)}"/><stop offset=".8" stop-color="${mix(T.rose, T.peach, .5)}"/><stop offset=".9" stop-color="${T.gold}"/>
            </linearGradient>
            <radialGradient id="film-lamp"><stop offset="0" stop-color="${mix(T.gold, '#ffffff', .45)}" stop-opacity=".8"/><stop offset="1" stop-color="${T.gold}" stop-opacity="0"/></radialGradient>
            <radialGradient id="film-moon"><stop offset=".5" stop-color="${T.paper}" stop-opacity=".35"/><stop offset="1" stop-color="${T.paper}" stop-opacity="0"/></radialGradient>
          </defs>
          <rect width="${W}" height="${H}" fill="url(#film-sky)"/>
          <g fill="${T.paper}">${stars.map(([x, y, r, o]) => `<circle cx="${(x * W).toFixed(1)}" cy="${(y * H).toFixed(1)}" r="${r.toFixed(2)}" opacity="${o.toFixed(2)}"/>`).join('')}</g>
          <circle cx="${W * .2}" cy="${H * .17}" r="34" fill="url(#film-moon)"/>
          <circle cx="${W * .2}" cy="${H * .17}" r="13" fill="${T.paper}" opacity=".92"/><circle cx="${W * .2 + 6}" cy="${H * .17 - 4}" r="11.5" fill="${mix(T.night, T.dusk, .5)}"/>
          <g fill="${mix(T.gold, '#ffffff', .25)}">${city.map(([x, y, r, o]) => `<circle cx="${(x * W).toFixed(1)}" cy="${(H * .785 + y * H * .04).toFixed(1)}" r="${r.toFixed(2)}" opacity="${o.toFixed(2)}"/>`).join('')}</g>
          <path d="M0 ${H} L0 ${H * .83} C${W * .22} ${H * .8} ${W * .42} ${H * .79} ${W * .6} ${H * .805} C${W * .78} ${H * .82} ${W * .9} ${H * .77} ${W} ${H * .78} L${W} ${H}Z" fill="${hillBack}"/>
          <path d="M0 ${H} L0 ${H * .9} C${W * .2} ${H * .87} ${W * .32} ${gy} ${W * .5} ${gy} C${W * .68} ${gy} ${W * .8} ${H * .87} ${W} ${H * .88} L${W} ${H}Z" fill="${hillFront}"/>
          <g fill="${bench}">
            <rect x="${benchX}" y="${benchY - 14}" width="${bw}" height="4" rx="2"/><rect x="${benchX}" y="${benchY - 4}" width="${bw}" height="5" rx="2"/>
            <rect x="${benchX + 5}" y="${benchY}" width="3.5" height="16"/><rect x="${benchX + bw - 8.5}" y="${benchY}" width="3.5" height="16"/>
          </g>
          <circle cx="${lampX}" cy="${lampTop + 8}" r="${Math.min(72, W * .2)}" fill="url(#film-lamp)"/>
          <g fill="${ink}">
            <rect x="${lampX - 2.5}" y="${lampTop + 18}" width="5" height="${lampBase - lampTop - 18}"/>
            <rect x="${lampX - 9}" y="${lampBase - 4}" width="18" height="7" rx="2"/>
            <path d="M${lampX - 14} ${lampTop + 18} L${lampX + 14} ${lampTop + 18} L${lampX + 9} ${lampTop} L${lampX - 9} ${lampTop}Z"/>
            <rect x="${lampX - 3.5}" y="${lampTop - 7}" width="7" height="7" rx="2"/>
          </g>
          <rect x="${lampX - 8}" y="${lampTop + 3}" width="16" height="13" fill="${mix(T.gold, '#ffffff', .5)}" opacity=".95"/>
        </svg>`;
      };
      paint();
      let pt; ctx.on(window, 'resize', () => { clearTimeout(pt); pt = setTimeout(paint, 120); });
      ctx.cleanup(() => clearTimeout(pt));

      const modes = [
        { cls: '', btn: 'Dance', hint: gentle ? 'First, a slow dance on the hill.' : 'First, a little tap dance on the hill.', st: 'Scene: standing around' },
        { cls: 'dance', btn: 'Float into the stars', hint: 'Now for the part where gravity stops applying.', st: gentle ? 'Scene: a slow dance' : 'Scene: dancing badly, on purpose' },
        { cls: 'float', btn: 'Come back down', hint: 'Orbiting each other. Tap the sky for more stars.', st: 'Scene: zero gravity' },
      ];
      let mode = 0, stepT = 0, step = 0;
      const note = () => {
        if (!pair.classList.contains('dance') || reduce) return;
        const side = step++ % 2 ? 'r' : 'l';
        const s = h('span', { class: 'tapnote ' + side, text: step % 3 ? '✦' : '♪' });
        stage.append(s); setTimeout(() => s.remove(), 1200);
      };
      danceBtn.onclick = () => {
        mode = (mode + 1) % 3; const m = modes[mode];
        pair.className = 'pair ' + m.cls; stage.dataset.mode = m.cls || 'stand';
        danceBtn.textContent = m.btn; danceHint.textContent = m.hint; stageState.textContent = m.st;
        haptic('light');
        clearInterval(stepT);
        if (mode === 1) stepT = setInterval(note, gentle ? 700 : 380);
        if (mode === 2) audio.chime();
      };
      ctx.cleanup(() => clearInterval(stepT));
      stage.addEventListener('pointerdown', e => {
        const r = stage.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        audio.tap();
        for (let i = 0; i < 8; i++) {
          const s = h('span', { class: 'spark' + (i % 2 ? ' r' : '') });
          const a = Math.random() * 6.283, d = 30 + Math.random() * 50;
          s.style.left = x + 'px'; s.style.top = y + 'px';
          s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px');
          stage.append(s); setTimeout(() => s.remove(), 1000);
        }
      });
    }

    /* ================= chord translator ================= */
    if (chordsOn) {
      const scale = [62, 64, 66, 67, 69, 71, 73];
      const palette = ['var(--rose)', 'var(--gold)', 'var(--hud)', 'var(--lilac)', 'var(--peach)', 'var(--sky)', 'var(--paper)'];
      const chordFor = ch => {
        if (!/[a-z0-9]/i.test(ch)) return null;
        const code = ch.toLowerCase().charCodeAt(0);
        const idx = ((code - 48) % 21 + 21) % 21, deg = idx % 7, oct = Math.floor(idx / 7) - 1;
        const n = k => scale[(deg + k) % 7] + 12 * (oct + Math.floor((deg + k) / 7));
        return { notes: [n(0), n(2), n(4)], deg, h: 26 + idx * 2.2 };
      };
      const renderBars = () => {
        barsEl.replaceChildren(...[...msgIn.value].map(ch => {
          const c = chordFor(ch);
          return c ? h('i', { class: 'bar', style: { height: c.h + 'px', '--c': palette[c.deg] } }) : h('i', { class: 'bar rest' });
        }));
        barsEl.classList.toggle('is-empty', !msgIn.value.trim());
      };
      renderBars(); msgIn.addEventListener('input', renderBars);
      msgIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); msgIn.blur(); playMsgBtn.click(); } });
      const replies = (gentle ? ['heard, every word', 'still listening', 'the light is on']
        : ['message received, loud and clear', 'right back at you', 'play it again, slower', 'happy, happy, happy']).map(r => `♪\u00a0${r.replace(/ (\S+)$/, '\u00a0$1')}\u00a0♪`);
      let playing = false;
      playMsgBtn.onclick = () => {
        if (playing || !audio.ac()) return;
        const txt = msgIn.value; if (!txt.trim()) { translated.textContent = 'Type a message first.'; return; }
        playing = true; haptic('light');
        const bars = [...barsEl.children], gap = .2, t0 = audio.now() + .05;
        translated.textContent = 'Transmitting…';
        [...txt].forEach((ch, i) => {
          const c = chordFor(ch);
          if (c) c.notes.forEach(n => audio.tone(n, t0 + i * gap, .5, .07, 'triangle'));
          ctx.timeout(() => { bars.forEach(b => b.classList.remove('on')); if (bars[i]) bars[i].classList.add('on'); }, i * gap * 1000 + 50);
        });
        ctx.timeout(() => {
          bars.forEach(b => b.classList.remove('on')); playing = false;
          translated.textContent = 'Reply received: ' + replies[Math.floor(Math.random() * replies.length)];
        }, txt.length * gap * 1000 + 400);
      };
    }

    /* ================= star catch ================= */
    if (catchOn) {
      // caught wishes, then at most three empty slots and a count of the rest
      const SLOTS = 3;
      const paintWishes = fresh => {
        if (!wishList) return;
        const rows = [];
        for (let i = 0; i < caught; i++) rows.push(h('li', { class: i === fresh ? 'new' : '' }, h('b', { text: String(i + 1).padStart(2, '0') }), h('span', { text: wishes[i] })));
        const left = wishes.length - caught;
        for (let i = caught; i < caught + Math.min(SLOTS, left); i++) rows.push(h('li', { class: 'locked' + (i === caught ? ' next' : '') }, h('b', { text: String(i + 1).padStart(2, '0') }), h('span', { text: i === caught ? 'Catch a star to unlock' : 'Waiting for a star' })));
        if (left > SLOTS) rows.push(h('li', { class: 'more' }, h('span', { text: `+ ${left - SLOTS} more wish${left - SLOTS === 1 ? '' : 'es'} to catch` })));
        wishList.replaceChildren(...rows);
      };
      let caught = 0;
      paintWishes(-1);
      const cv = catchCv, cx = cv.getContext('2d');
      let CW = 0, CH = 0, falling = [], bursts = [];
      const size = () => { const dpr = Math.min(devicePixelRatio || 1, 2), r = cv.getBoundingClientRect(); CW = r.width; CH = r.height; cv.width = CW * dpr; cv.height = CH * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); };
      const newStar = top => ({ x: 22 + Math.random() * (CW - 44), y: top ? -20 - Math.random() * CH : Math.random() * CH * .75, v: .5 + Math.random() * .9, r: 13 + Math.random() * 7, rot: Math.random() * 6, vr: (Math.random() - .5) * .03, c: Math.random() < .5 ? T.gold : T.rose });
      size(); for (let i = 0; i < 7; i++) falling.push(newStar(false));
      ctx.on(window, 'resize', size);
      const starPath = (x, y, r, rot) => { cx.beginPath(); for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; cx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } cx.closePath(); };
      let visible = true;
      const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; });
      io.observe(cv); ctx.cleanup(() => io.disconnect());
      ctx.raf(() => {
        if (!visible) return;
        cx.clearRect(0, 0, CW, CH);
        for (const s of falling) {
          if (!reduce) { s.y += s.v; s.rot += s.vr; }
          if (s.y > CH + 30) Object.assign(s, newStar(true));
          cx.save(); cx.shadowColor = s.c; cx.shadowBlur = 18; cx.fillStyle = s.c; starPath(s.x, s.y, s.r, s.rot); cx.fill(); cx.restore();
        }
        for (let i = bursts.length - 1; i >= 0; i--) {
          const p = bursts[i]; p.x += p.vx; p.y += p.vy; p.vy += .05; p.l -= .02;
          if (p.l <= 0) { bursts.splice(i, 1); continue; }
          cx.globalAlpha = p.l; cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, 2.2, 0, 6.283); cx.fill(); cx.globalAlpha = 1;
        }
        if (caught >= N) {
          cx.fillStyle = T.paper; cx.globalAlpha = .92; cx.textAlign = 'center';
          cx.font = `italic ${CW < 420 ? 22 : 26}px "Cormorant Garamond", serif`;
          cx.fillText('Fuel full.', CW / 2, CH / 2 - 22); cx.fillText('Every wish is on its way.', CW / 2, CH / 2 + 6);
          cx.globalAlpha = 1;
        }
      });
      cv.addEventListener('pointerdown', e => {
        const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        let best = null, bd = 1e9;
        for (const s of falling) { const d = Math.hypot(s.x - x, s.y - y); if (d < s.r + 22 && d < bd) { bd = d; best = s; } }
        if (!best) return;
        for (let i = 0; i < 22; i++) { const a = Math.random() * 6.283, sp = 1 + Math.random() * 3; bursts.push({ x: best.x, y: best.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, l: 1, c: best.c }); }
        Object.assign(best, newStar(true));
        store.stat('starsCaught');
        if (caught < N) {
          caught++;
          paintWishes(caught - 1);
          fuelFill.style.transform = `scaleX(${caught / N})`;
          fuelCount.textContent = `${caught} / ${N}`;
          audio.chime(); haptic('light');
          store.award(1, { x: e.clientX, y: e.clientY });
          if (caught === N) { fx.confetti(gentle ? 80 : 160, { stars: gentle, colors: confettiCols }); haptic('success'); }
        }
      });
    }

    /* ================= cake ================= */
    let fitCakeName = () => {};
    if (cakeOn) {
      const xs = [120, 160, 200, 240, 280], cols = ['#ef7fb0', '#86e6d8', '#f5cc4a', '#b59cff', '#ff9a7a'];
      const nm = esc(String(them).toUpperCase());
      cakeSvg.innerHTML = `<svg class="cake-svg" viewBox="36 66 328 292" role="group" aria-label="${light ? 'A cake with five unlit candles. Tap each wick to light it.' : 'A birthday cake with five candles. Tap each flame to blow it out.'}">
        <defs>
          <radialGradient id="film-fglow"><stop offset="0" stop-color="#ffd76a" stop-opacity=".7"/><stop offset="1" stop-color="#ffd76a" stop-opacity="0"/></radialGradient>
          <radialGradient id="film-halo"><stop offset="0" stop-color="${T.gold}" stop-opacity=".45"/><stop offset="1" stop-color="${T.gold}" stop-opacity="0"/></radialGradient>
        </defs>
        <ellipse class="halo" cx="200" cy="170" rx="190" ry="150" fill="url(#film-halo)"/>
        <ellipse cx="200" cy="334" rx="168" ry="17" fill="${T.night}" opacity=".85"/>
        <rect x="50" y="318" width="300" height="10" rx="5" fill="#d8d0ec"/>
        <rect x="70" y="236" width="260" height="84" rx="10" fill="#6d4fb0"/>
        <path d="M70 246 Q70 236 80 236 L320 236 Q330 236 330 246 L330 256 Q318 272 306 256 Q294 240 282 262 Q270 280 256 258 Q244 240 230 262 Q216 282 202 258 Q190 240 176 262 Q162 282 150 258 Q138 240 124 262 Q110 280 98 258 Q86 240 70 262Z" fill="#ef7fb0"/>
        <rect x="110" y="168" width="180" height="70" rx="10" fill="#f6eee3"/>
        <path d="M110 178 Q110 168 120 168 L280 168 Q290 168 290 178 L290 186 Q278 202 266 186 Q254 172 242 192 Q230 208 218 190 Q206 172 194 192 Q182 208 170 190 Q158 172 146 192 Q134 208 122 190 Q116 182 110 192Z" fill="#f5cc4a"/>
        <g fill="#86e6d8"><circle cx="140" cy="215" r="3"/><circle cx="175" cy="222" r="3"/><circle cx="210" cy="212" r="3"/><circle cx="245" cy="222" r="3"/><circle cx="270" cy="212" r="3"/></g>
        <text class="cake-name" x="200" y="300" text-anchor="middle" font-family="Italiana, Georgia, serif" font-size="30" fill="#f6eee3" letter-spacing="3">${nm}</text>
        <g class="candles">${xs.map((x, i) => `<g class="candle${light ? ' off' : ''}" tabindex="0" role="button" aria-label="${light ? 'Light' : 'Blow out'} candle ${i + 1}">
          <circle class="glow" cx="${x}" cy="114" r="28" fill="url(#film-fglow)"/>
          <rect x="${x - 5}" y="126" width="10" height="44" rx="2" fill="${cols[i]}"/>
          <rect x="${x - 5}" y="134" width="10" height="4" fill="#f6eee3" opacity=".6"/><rect x="${x - 5}" y="148" width="10" height="4" fill="#f6eee3" opacity=".6"/>
          <line x1="${x}" y1="119" x2="${x}" y2="127" stroke="#2a2140" stroke-width="1.8" stroke-linecap="round"/>
          <path class="flame" d="M${x} 98 C${x + 8} 108 ${x + 7} 120 ${x} 121 C${x - 7} 120 ${x - 8} 108 ${x} 98Z" fill="#ffcf4d"/>
          <path class="core" d="M${x} 108 C${x + 3.5} 113 ${x + 3} 119 ${x} 119.5 C${x - 3} 119 ${x - 3.5} 113 ${x} 108Z" fill="#fff6d2"/>
          <circle class="smoke" cx="${x}" cy="110" r="5" fill="#cfc8e2"/>
          <rect class="hit" x="${x - 20}" y="86" width="40" height="88" fill="transparent"/>
        </g>`).join('')}</g>
      </svg>`;
      const nameText = cakeSvg.querySelector('.cake-name');
      fitCakeName = () => {
        nameText.setAttribute('font-size', '30'); nameText.removeAttribute('textLength'); nameText.removeAttribute('lengthAdjust');
        let w = 0; try { w = nameText.getComputedTextLength(); } catch {}
        const maxW = 236;
        if (w > maxW) {
          const fs = Math.max(15, 30 * maxW / w);
          nameText.setAttribute('font-size', fs.toFixed(1));
          if (fs === 15) { nameText.setAttribute('textLength', String(maxW)); nameText.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
        }
      };
      fitCakeName();

      const candles = [...cakeSvg.querySelectorAll('.candle')];
      const area = cakeSvg.closest('.cake-block');
      let lit = light ? 0 : CANDLES;
      const paintCount = () => {
        candleCount.textContent = light ? (lit >= CANDLES ? 'All five are lit' : `${lit} of ${CANDLES} lit`) : (lit ? `${lit} candle${lit > 1 ? 's' : ''} lit` : 'All candles out');
      };
      paintCount();
      let stopMic = () => {};
      if (light) {
        const done = (first) => {
          area.classList.add('all-lit');
          cakeBig.textContent = F(cake.done || 'All five are lit.');
          cakeSmall.textContent = 'They’ll stay lit, every time you come back.';
          if (first) {
            audio.chime(); haptic('success');
            if (!store.seen('film-cake')) ctx.award(10, cakeBig);
            store.stat('candles');
          }
        };
        if (store.get('film.cakeLit', false)) { candles.forEach(g => g.classList.remove('off')); lit = CANDLES; paintCount(); done(false); }
        candles.forEach(g => {
          const ignite = () => {
            if (!g.classList.contains('off')) return;
            g.classList.remove('off'); g.classList.add('ignite'); lit++; paintCount();
            audio.tone(76 + lit * 2, undefined, .6, .045, 'sine'); haptic('light');
            const r = g.querySelector('.flame').getBoundingClientRect();
            fx.burst(r.left + r.width / 2, r.top + r.height / 2, 8, [T.gold, '#ffe9a8']);
            if (lit >= CANDLES) { store.set('film.cakeLit', true); done(true); }
          };
          g.addEventListener('click', ignite);
          g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ignite(); } });
        });
      } else {
        const outs = candles.map(g => {
          const out = () => {
            if (g.classList.contains('out')) return;
            g.classList.add('out'); g.classList.remove('wobble'); lit--; audio.tap(); haptic('light'); paintCount();
            if (!lit) {
              cakeBig.textContent = F(cake.done || 'Wish sent.');
              cakeSmall.textContent = 'Sent at the speed of light. Estimated arrival: right now.';
              relightBtn.hidden = false; fx.confetti(240, { colors: confettiCols }); audio.chime(); haptic('success');
              store.stat('candles');
              if (!store.seen('film-cake')) ctx.award(10, cakeBig);
              stopMic();
            }
          };
          g.addEventListener('click', out);
          g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); out(); } });
          return { g, out };
        });
        relightBtn.onclick = () => {
          candles.forEach(g => g.classList.remove('out')); lit = CANDLES; paintCount();
          cakeBig.textContent = 'Make another wish, then blow them out.';
          cakeSmall.textContent = 'Extra wishes are allowed.';
          relightBtn.hidden = true; haptic('light');
        };
        // blow into the microphone
        let stream = null, micStop = null;
        const meterFill = micMeter.querySelector('i');
        stopMic = () => {
          if (micStop) micStop();
          micStop = null;
          if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; audio.micSession(false); }
          micMeter.hidden = true; micBtn.textContent = '🎤 Blow into the mic';
          candles.forEach(g => g.classList.remove('wobble'));
        };
        ctx.cleanup(() => stopMic());
        micBtn.onclick = async () => {
          if (stream) { stopMic(); return; }
          if (!lit) relightBtn.click();
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('The microphone isn’t available here. Tapping the flames works too.'); return; }
          micBtn.textContent = 'Asking for the mic…';
          audio.micSession(true);
          try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); }
          catch { audio.micSession(false); micBtn.textContent = '🎤 Blow into the mic'; toast('No microphone, no problem. Tap the flames instead.'); return; }
          if (!ctx.alive()) { stream.getTracks().forEach(t => t.stop()); return; }
          const a = audio.ac(); const src = a.createMediaStreamSource(stream);
          const an = a.createAnalyser(); an.fftSize = 1024; src.connect(an);
          const buf = new Float32Array(an.fftSize);
          micBtn.textContent = 'Stop listening'; micMeter.hidden = false;
          cakeSmall.textContent = 'Listening… blow at the screen. (Nothing is recorded.)';
          let floor = .02, calib = 0, blowMs = 0, last = performance.now();
          micStop = ctx.raf(() => {
            an.getFloatTimeDomainData(buf);
            let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
            const rms = Math.sqrt(s / buf.length);
            const t = performance.now(), dt = t - last; last = t;
            if (calib < 400) { calib += dt; floor = Math.max(floor, rms); return; }
            const thr = Math.max(.07, floor * 3);
            meterFill.style.transform = `scaleX(${Math.min(1, rms / thr * .7)})`;
            const next = outs.find(c => !c.g.classList.contains('out'));
            candles.forEach(g => g.classList.toggle('wobble', rms > thr * .5 && !g.classList.contains('out')));
            if (rms > thr) { blowMs += dt; if (blowMs > 160 && next) { next.out(); blowMs = 60; } }
            else blowMs = Math.max(0, blowMs - dt * 2);
          });
        };
      }
    }

    /* ================= credits ================= */
    againBtn.onclick = () => { fx.confetti(gentle ? 120 : 260, { stars: gentle, colors: confettiCols }); audio.chime(); haptic('medium'); };
    // reaching "Fin." (or jumping straight to the post-credits scene) earns the film's stamp
    const credIO = new IntersectionObserver(es => {
      if (!es.some(e => e.isIntersecting)) return;
      if (store.stamp('film')) { ctx.award(20, finEl); haptic('success'); }
      credIO.disconnect();
    }, { threshold: .3 });
    credIO.observe(finEl); credIO.observe(postEl); ctx.cleanup(() => credIO.disconnect());

    /* ================= the hidden sender ================= */
    if (letterEl) ctx.peek(letterEl, 'film-letter', { right: '-8px', bottom: '-12px', rotate: 14, size: 30 });
  },
};
