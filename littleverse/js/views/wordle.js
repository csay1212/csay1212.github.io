// The word game (named after the recipient, e.g. "Mira-dle"): a handful of
// five-letter words from the universe, six guesses each. Standard rules
// (greens first, then golds limited by the letters left), any five letters
// count, and progress is saved so you can leave mid-word and come back.
import { h, svg, icon, shareOrCopy } from '../core/dom.js';

const ROWS = 6, LEN = 5;
const KB_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
];
const RANK = { absent: 1, present: 2, correct: 3 };
const EMOJI = { correct: '🟩', present: '🟨', absent: '⬛' };
const pad2 = n => String(n).padStart(2, '0');
const bksp = () => svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, svg('path', { d: 'M9 5h11v14H9l-6-7zM12 9.5l5 5M17 9.5l-5 5' }));
const WIN_TITLES = ['Solved!', 'Nailed it.', 'Look at you.', 'Well played.', 'Correct. Obviously.'];
const WIN_TITLES_GENTLE = ['Solved.', 'Beautifully done.', 'There it is.', 'Well found.'];
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const numWord = n => n < 20 ? NUM[n] : n === 30 ? 'thirty' : n < 30 ? 'twenty' + (n > 20 ? '-' + NUM[n - 20] : '') : String(n);
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
const MAX_WORDS = 30;
// hue (0-360) and saturation (0-1) of a hex color
function hs(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return { h: 0, s: 0 };
  const n = parseInt(m[1], 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
  if (!d) return { h: 0, s: 0 };
  const sat = d / (1 - Math.abs(2 * l - 1));
  const hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (hh * 60 + 360) % 360, s: sat };
}
// "right spot" and "in the word" must never look alike. Most palettes give a
// clear pair (hud vs gold); warm ones (golden hour, candlelight) don't, so
// they get a soft green for "right spot" instead.
function tileColors(T) {
  const a = hs(T.hud), b = hs(T.gold);
  const dh = Math.min(Math.abs(a.h - b.h), 360 - Math.abs(a.h - b.h));
  return { ok: dh >= 60 && a.s >= .35 ? T.hud : '#7fd19f', in: T.gold };
}
// "Café" → "CAFE"; anything that isn't five plain letters is skipped
const clean = w => String(w || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '');

export function scoreGuess(guess, answer) {
  const res = Array(LEN).fill('absent'), left = {};
  for (let i = 0; i < LEN; i++) {
    if (guess[i] === answer[i]) res[i] = 'correct';
    else left[answer[i]] = (left[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < LEN; i++) {
    if (res[i] !== 'correct' && left[guess[i]] > 0) { res[i] = 'present'; left[guess[i]]--; }
  }
  return res;
}

export default {
  css: 'wordle',
  mount(ctx) {
    const { store, audio, fx, U } = ctx;
    const reduce = ctx.reduce;
    const NAME = ctx.world.name || 'The Word Game';
    const src = Array.isArray(U.copy.words) ? U.copy.words : (ctx.CONTENT.words || []);
    const WORDS = src
      .filter(x => x && typeof x === 'object')
      .map(x => ({ w: clean(x.w), hint: U.fill(String(x.hint || '')).trim() }))
      .filter(x => x.w.length === LEN)
      .slice(0, MAX_WORDS);
    const TOTAL = WORDS.length;
    const STAMP_N = Math.max(1, Math.min(3, TOTAL));   // the stamp goal, even for a short list
    // the recipient's own name, when it happens to be one of the words
    const NAME_WORD = clean(U.them.name);
    const them = U.them.name, me = U.me.name;
    ctx.root.classList.add('full');
    const wrap = h('div', { class: 'wd' });
    const tc = tileColors(U.theme || {});
    wrap.style.setProperty('--c-ok', tc.ok); wrap.style.setProperty('--c-in', tc.in);
    ctx.root.append(wrap);

    /* ---------- saved state ---------- */
    const okIdx = i => Number.isInteger(i) && i >= 0 && i < TOTAL;
    const okRows = r => Array.isArray(r) ? r.filter(x => typeof x === 'string' && /^[A-Z]{5}$/.test(x)).slice(0, ROWS) : [];
    function load() {
      const d = store.get('game.wordle', null) || {};
      const S = {
        solved: Array.isArray(d.solved) ? [...new Set(d.solved.filter(okIdx))] : [],
        guesses: d.guesses && typeof d.guesses === 'object' ? { ...d.guesses } : {},
        hints: d.hints && typeof d.hints === 'object' ? { ...d.hints } : {},
        current: d.current && okIdx(d.current.idx) ? { idx: d.current.idx, rows: okRows(d.current.rows) } : null,
        progress: {}, done: {}, missed: d.missed && typeof d.missed === 'object' ? { ...d.missed } : {},
      };
      for (const [k, v] of Object.entries(d.progress || {})) if (okIdx(+k)) S.progress[k] = okRows(v);
      for (const [k, v] of Object.entries(d.done || {})) if (okIdx(+k)) S.done[k] = okRows(v);
      // the in-progress game always wins over an older progress entry
      if (S.current && !S.solved.includes(S.current.idx) && S.current.rows.length) S.progress[S.current.idx] = S.current.rows.slice();
      return S;
    }
    let S = load();
    const save = () => store.set('game.wordle', JSON.parse(JSON.stringify(S)));
    const isSolved = i => S.solved.includes(i);
    const nextUnsolved = from => {
      for (let k = 1; k <= TOTAL; k++) { const i = ((from ?? -1) + k + TOTAL) % TOTAL; if (!isSolved(i)) return i; }
      return -1;
    };
    // self-heal: if a stamp was earned but the page closed mid-celebration
    if (TOTAL && S.solved.length >= STAMP_N && !store.hasStamp('wordle')) ctx.timeout(() => ctx.stamp(), 600);

    /* ---------- screen + timers ---------- */
    let screen = null;          // { kind:'list' } | game object
    let timers = [];
    let pending = [];           // rewards waiting for the reveal; flushed if the player leaves early
    const later = (fn, ms) => { const id = ctx.timeout(fn, ms); timers.push(id); return id; };
    function flushPending() { const p = pending; pending = []; p.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }
    function leaveScreen() { timers.forEach(clearTimeout); timers = []; flushPending(); }
    ctx.cleanup(() => { timers.forEach(clearTimeout); flushPending(); });

    let rzT = 0;
    ctx.on(window, 'resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { if (ctx.alive() && screen && screen.fit) screen.fit(); }, 80); });
    ctx.cleanup(() => clearTimeout(rzT));

    // physical keyboard (on document so the site-wide secret-word listener doesn't eat the guesses)
    ctx.on(document, 'keydown', e => {
      if (!screen || !screen.key || e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector('.modal-wrap')) return;
      if (e.key === 'Escape') { if (screen.esc && screen.esc()) e.preventDefault(); return; }
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      let k = null;
      if (/^[a-zA-Z]$/.test(e.key)) k = e.key.toUpperCase();
      else if (e.key === 'Enter') {
        // let a keyboard-focused button do its own thing
        let kbFocus = false; try { kbFocus = !!(t && t.closest && t.closest('button, a') && t.matches(':focus-visible')); } catch {}
        if (kbFocus) return;
        k = 'ENTER';
      } else if (e.key === 'Backspace') k = 'BACK';
      if (!k) return;
      if (screen.key(k)) { e.preventDefault(); e.stopPropagation(); }
    });

    /* ================= level select ================= */
    function intro() {
      const legend = (st, l, txt) => h('span', { class: 'wd-lg' }, h('i', { class: 'wd-mini', 'data-s': st, text: l }), h('span', { text: txt }));
      const count = TOTAL === 1 ? 'One five-letter word' : `${cap(numWord(TOTAL))} five-letter words`;
      const forWhom = U.gentle ? `chosen with ${them} in mind` : 'chosen just for you';
      const rules = TOTAL === 1 ? 'Six guesses to find it.' : 'Six guesses each, any order you like.';
      return h('div', { class: 'wintro wd-intro' },
        h('p', { class: 'kicker', text: 'The Arcade · word game' }),
        h('h2', { text: NAME }),
        TOTAL ? h('p', { class: 'lede', text: `${count}, ${forWhom}. ${rules}` }) : null,
        TOTAL ? h('div', { class: 'wd-legend' }, legend('correct', 'W', 'right spot'), legend('present', 'O', 'in the word'), legend('absent', 'R', 'not in it')) : null,
        TOTAL ? h('p', { class: 'fine wd-rule', text: 'Any five letters count as a guess. No dictionary police here.' }) : null);
    }
    function showList() {
      leaveScreen();
      S = load();
      if (!TOTAL) {
        wrap.replaceChildren(h('div', { class: 'wd-list' }, intro(),
          h('div', { class: 'wd-none' },
            h('img', { src: 'assets/emoji/input_latin_uppercase.webp', alt: '', width: 72, height: 72, onerror: e => e.target.remove() }),
            h('b', { text: 'No words yet' }),
            h('p', { text: 'The words for this one haven’t been picked yet. Check back soon.' }),
            h('a', { class: 'btn', href: '#/map', text: 'Back to the map' }))));
        screen = { kind: 'list' };
        scrollTo(0, 0);
        return;
      }
      const n = S.solved.length, next = nextUnsolved(S.current ? S.current.idx - 1 : -1);
      const prog = h('div', { class: 'wd-prog' },
        h('div', { class: 'wd-pbar' },
          h('div', { class: 'wd-ptxt' }, h('b', { text: `${n} / ${TOTAL}` }), h('span', { text: n >= TOTAL ? 'all solved' : n >= STAMP_N ? 'solved · stamp collected' : `solved · ${STAMP_N - n} more for the stamp` })),
          h('div', { class: 'bar' }, h('i', { style: { width: (n / TOTAL * 100) + '%' } }))),
        next >= 0
          ? h('button', { class: 'btn solid', type: 'button', onclick: () => { audio.sfx('open'); openGame(next); } }, S.progress[next]?.length ? `Continue Nº ${pad2(next + 1)}` : n ? 'Next unsolved' : 'Start the first word')
          : h('button', { class: 'btn', type: 'button', disabled: true, text: 'All solved ✓' }));
      const grid = h('div', { class: 'wd-levels' });
      WORDS.forEach((wd, i) => {
        const solved = isSolved(i), prog = S.progress[i] || [], missed = S.missed[i] && !solved;
        const minis = h('div', { class: 'wd-minis', 'aria-hidden': 'true' });
        if (solved) for (const ch of wd.w) minis.append(h('i', { class: 'wd-mini', 'data-s': 'correct', text: ch }));
        else if (prog.length) scoreGuess(prog.at(-1), wd.w).forEach(st => minis.append(h('i', { class: 'wd-mini', 'data-s': st })));
        else for (let k = 0; k < LEN; k++) minis.append(h('i', { class: 'wd-mini', 'data-s': 'empty' }));
        let status, label;
        if (solved) { status = `Solved in ${S.guesses[i] ?? '?'}${S.hints[i] ? ', with a hint' : ''}`; label = `solved in ${S.guesses[i] ?? '?'} of 6${S.hints[i] ? ', hint used' : ''}`; }
        else if (prog.length) { status = `${prog.length} of 6 guesses`; label = `in progress, ${prog.length} of 6 guesses used`; }
        else if (missed) { status = 'Try again'; label = 'missed, try again'; }
        else { status = 'Play'; label = 'not played yet'; }
        grid.append(h('button', {
          class: `wd-lv${solved ? ' solved' : ''}${prog.length ? ' playing' : ''}${missed ? ' missed' : ''}`,
          type: 'button', 'aria-label': `Word ${i + 1}, ${label}`,
          onclick: () => { audio.sfx('open'); openGame(i); },
        }, h('span', { class: 'wd-no', text: `Word ${i + 1}` }), minis, h('span', { class: 'wd-st', text: status })));
      });
      const all = n >= TOTAL ? h('div', { class: 'wd-all' },
        h('b', { text: TOTAL === 1 ? 'Solved.' : `All ${numWord(TOTAL)}.` }),
        h('span', { text: U.gentle ? `Every word, for ${them}.` : 'Not a single word left.' })) : null;
      const page = h('div', { class: 'wd-list' }, intro(), all, prog, grid,
        h('p', { class: 'fine wd-foot', text: 'Progress saves as you go. Leave mid-word and it’ll be right here when you get back.' }));
      wrap.replaceChildren(page);
      screen = { kind: 'list' };
      ctx.peek(grid, 'wordle-hide', { right: '-12px', top: '-19px', rotate: 14, size: 30 });
      scrollTo(0, 0);
    }

    /* ================= a word ================= */
    function openGame(idx) {
      leaveScreen();
      S = load();
      const { w: word, hint } = WORDS[idx];
      const solvedBefore = isSolved(idx);
      let rows = solvedBefore ? (S.done[idx]?.includes(word) ? S.done[idx].slice() : [word]) : (S.progress[idx] || []).slice();
      let cur = '', busy = false, over = solvedBefore || rows.includes(word) || rows.length >= ROWS;
      if (!solvedBefore && over) { rows = []; over = false; } // stale row data: start fresh
      if (!solvedBefore) { S.current = { idx, rows: rows.slice() }; save(); }
      const keyState = {};

      /* ---------- DOM ---------- */
      const hintBtn = h('button', { class: 'wd-hintbtn', type: 'button', 'aria-label': 'Show the hint for this word' }, h('span', { 'aria-hidden': 'true', text: '💡' }), h('span', { class: 'lbl', text: 'Hint' }));
      const head = h('div', { class: 'wd-head' },
        h('button', { class: 'wd-back', type: 'button', 'aria-label': 'All words', onclick: () => { audio.sfx('click'); showList(); } }, icon('back'), h('span', { text: 'Words' })),
        h('div', { class: 'wd-ttl' }, h('span', { text: NAME }), h('b', { text: `Nº ${pad2(idx + 1)}` })),
        hintBtn);
      const hintLine = h('p', { class: 'wd-hint', 'aria-live': 'polite' });
      const board = h('div', { class: 'wd-board', role: 'grid', 'aria-label': `Guesses for word ${idx + 1}` });
      const tiles = [], rowEls = [];
      for (let r = 0; r < ROWS; r++) {
        const row = h('div', { class: 'wd-row', role: 'row' }); const tr = [];
        for (let c = 0; c < LEN; c++) { const t = h('div', { class: 'wd-tile', role: 'gridcell', 'data-s': 'empty' }); row.append(t); tr.push(t); }
        board.append(row); rowEls.push(row); tiles.push(tr);
      }
      const msg = h('div', { class: 'wd-msg', role: 'status', 'aria-live': 'polite' });
      const boardWrap = h('div', { class: 'wd-boardwrap' }, board, msg);
      const keyEls = {};
      const kb = h('div', { class: 'wd-kb', role: 'group', 'aria-label': 'Keyboard' }, KB_ROWS.map(kr => h('div', { class: 'wd-krow' }, kr.map(k => {
        const b = h('button', {
          class: 'wd-key' + (k.length > 1 ? ' wide' : ''), type: 'button', 'data-k': k,
          'aria-label': k === 'BACK' ? 'Backspace' : k === 'ENTER' ? 'Enter' : k,
          onclick: e => { press(k); if (e.detail > 0) b.blur(); },
        }, k === 'BACK' ? bksp() : k === 'ENTER' ? 'Enter' : k);
        keyEls[k] = b; return b;
      }))));
      const endBar = h('div', { class: 'wd-end', hidden: true });
      const game = h('div', { class: 'wd-game' }, head, hintLine, boardWrap, kb, endBar);
      wrap.replaceChildren(game);
      scrollTo(0, 0);

      /* ---------- painting ---------- */
      function paintHint() {
        const used = !!S.hints[idx], show = used || over; // after the game the hint is the little "aha"
        hintLine.replaceChildren();
        hintLine.classList.toggle('on', show);
        if (show) hintLine.append(h('span', { 'aria-hidden': 'true', text: '💡 ' }), hint || (U.gentle ? 'No hint for this one.' : `No hint for this one. ${me} trusts you.`));
        else hintLine.append('Any five letters count. ', h('em', { text: 'Stuck? There\'s a hint.' }));
        hintBtn.disabled = used || over;
        hintBtn.querySelector('.lbl').textContent = used ? 'Hint shown' : 'Hint';
        hintBtn.style.visibility = over && !used ? 'hidden' : '';
      }
      function setTile(t, ch, s) { t.textContent = ch || ''; t.dataset.s = s; t.setAttribute('aria-label', ch ? `${ch}${s === 'correct' ? ', right spot' : s === 'present' ? ', in the word' : s === 'absent' ? ', not in the word' : ''}` : 'empty'); }
      function paintRow() {
        const r = rows.length; if (r >= ROWS) return;
        for (let c = 0; c < LEN; c++) setTile(tiles[r][c], cur[c], cur[c] ? 'tbd' : 'empty');
      }
      function learn(guess, res) { res.forEach((s, i) => { const ch = guess[i]; if (!keyState[ch] || RANK[s] > RANK[keyState[ch]]) keyState[ch] = s; }); }
      function paintKeys() { for (const [k, b] of Object.entries(keyEls)) { if (keyState[k]) b.dataset.s = keyState[k]; else delete b.dataset.s; } }
      rows.forEach((g, r) => { const res = scoreGuess(g, word); g.split('').forEach((ch, c) => setTile(tiles[r][c], ch, res[c])); learn(g, res); });
      paintKeys(); paintRow(); paintHint();

      let msgT = 0;
      function say(text, ms = 1600) {
        msg.textContent = text; msg.classList.add('on');
        clearTimeout(msgT); msgT = later(() => msg.classList.remove('on'), ms);
      }
      hintBtn.onclick = e => {
        if (S.hints[idx] || over) return;
        S.hints[idx] = true; save(); paintHint(); fit(); audio.sfx('sparkle');
        if (e.detail > 0) hintBtn.blur();
      };

      /* ---------- fitting the screen ---------- */
      function fit() {
        if (!game.isConnected) return;
        const side = innerWidth > innerHeight && innerHeight < 560;
        game.classList.toggle('side', side);
        const top = game.getBoundingClientRect().top + scrollY;
        game.style.height = Math.max(side ? 300 : 460, innerHeight - top) + 'px';
        const r = boardWrap.getBoundingClientRect();
        const gap = r.height < 330 ? 4 : 6;
        const ts = Math.max(26, Math.floor(Math.min((r.height - (ROWS - 1) * gap - 6) / ROWS, (r.width - (LEN - 1) * gap - 4) / LEN, 70)));
        board.style.setProperty('--ts', ts + 'px'); board.style.setProperty('--gap', gap + 'px');
      }

      /* ---------- input ---------- */
      function press(k) {
        if (busy) return true;   // swallow keys while tiles flip
        if (over) return false;
        if (k === 'ENTER') { submit(); return true; }
        if (k === 'BACK') { if (cur.length) { cur = cur.slice(0, -1); paintRow(); audio.sfx('click'); } return true; }
        if (/^[A-Z]$/.test(k)) {
          if (cur.length >= LEN) return true;
          cur += k; paintRow(); audio.tap();
          const t = tiles[rows.length][cur.length - 1];
          t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop');
          return true;
        }
        return false;
      }
      function submit() {
        const r = rows.length;
        if (cur.length < LEN) {
          say(cur.length ? 'Five letters, please.' : 'Type a word first.');
          audio.sfx('error');
          if (!reduce) { rowEls[r].classList.remove('shake'); void rowEls[r].offsetWidth; rowEls[r].classList.add('shake'); }
          return;
        }
        const guess = cur; cur = '';
        const res = scoreGuess(guess, word);
        rows.push(guess);
        const win = guess === word, lose = !win && rows.length >= ROWS;
        let firstSolve = false, prize = 0, allNow = false;
        // persist first, celebrate after the reveal
        if (win) {
          firstSolve = !isSolved(idx);
          if (firstSolve) {
            S.solved.push(idx); S.guesses[idx] = rows.length;
            prize = 10 + 3 * (6 - rows.length);
            store.stat('words');
          }
          S.done[idx] = rows.slice(); delete S.progress[idx]; S.current = null;
          allNow = firstSolve && S.solved.length >= TOTAL;
        } else if (lose) {
          S.missed[idx] = (S.missed[idx] || 0) + 1; delete S.progress[idx]; S.current = null;
        } else {
          S.progress[idx] = rows.slice(); S.current = { idx, rows: rows.slice() };
        }
        save();
        if (win || lose) over = true;
        let allBonus = 0;
        if (firstSolve) {
          const solvedN = S.solved.length;
          pending.push(() => { if (prize) ctx.award(prize, board); });
          if (solvedN >= STAMP_N) pending.push(() => ctx.stamp());
          if (allNow && !store.seen('wordle-all12')) { allBonus = 25; pending.push(() => ctx.award(25, { x: innerWidth / 2, y: innerHeight / 2 })); }
        }
        busy = true;
        const STEP = reduce ? 0 : 280, DUR = reduce ? 0 : 500;
        guess.split('').forEach((ch, c) => {
          const t = tiles[r][c];
          if (reduce) { setTile(t, ch, res[c]); return; }
          t.style.animationDelay = (c * STEP) + 'ms';
          t.classList.remove('pop'); t.classList.add('flip');
          later(() => { setTile(t, ch, res[c]); if (res[c] === 'correct') audio.sfx('dust', { step: c * 2 }); else audio.sfx('tick'); }, c * STEP + DUR / 2);
        });
        later(() => {
          busy = false;
          tiles[r].forEach(t => { t.classList.remove('flip'); t.style.animationDelay = ''; });
          learn(guess, res); paintKeys();
          if (win) celebrate({ firstSolve, prize, allBonus, allNow });
          else if (lose) lost();
          else { paintRow(); if (rows.length === ROWS - 1) say('Last guess. No pressure.', 2000); }
        }, (LEN - 1) * STEP + DUR + 40);
      }

      /* ---------- endings ---------- */
      function shareText(won) {
        const grid = rows.map(g => scoreGuess(g, word).map(s => EMOJI[s]).join('')).join('\n');
        return `${NAME} Nº ${idx + 1} · ${won ? rows.length : 'X'}/6\n${grid}`;
      }
      async function share(won, btn) {
        audio.sfx('click');
        const r = await shareOrCopy({ title: NAME, text: shareText(won) });
        if (!ctx.alive()) return;
        if (r === 'copied') { ctx.toast(U.gentle ? 'Copied. Paste it anywhere you like.' : `Copied. Paste it somewhere ${me} will see it.`); if (btn) { btn.textContent = 'Copied ✓'; } }
        else if (r === 'failed') ctx.toast('Couldn\'t copy that. A screenshot works too.');
      }
      function miniGrid() {
        return h('div', { class: 'wd-sgrid', 'aria-hidden': 'true' }, rows.map(g => h('div', {}, scoreGuess(g, word).map(s => h('i', { 'data-s': s })))));
      }
      function nextBtn(cls = 'btn solid') {
        const n = nextUnsolved(idx);
        if (n < 0) return h('button', { class: cls, type: 'button', text: 'All words', onclick: () => { audio.sfx('click'); showList(); } });
        return h('button', { class: cls, type: 'button', text: 'Next word', onclick: () => { audio.sfx('open'); openGame(n); } });
      }
      let ov = null;
      function closeOv() { ov?.remove(); ov = null; showEnd(); }
      function showEnd() {
        const won = rows.includes(word);
        kb.hidden = true; endBar.hidden = false;
        endBar.replaceChildren(
          h('p', { class: 'wd-endtxt', text: won ? `Solved in ${rows.length}/6${S.hints[idx] ? ' · hint used' : ''}` : `The word was ${word}.` }),
          h('div', { class: 'row' },
            h('button', { class: 'btn small', type: 'button', text: 'Share', onclick: e => share(won, e.currentTarget) }),
            won ? null : h('button', { class: 'btn small', type: 'button', text: 'Try again', onclick: () => { audio.sfx('click'); openGame(idx); } }),
            nextBtn('btn solid small')));
        fit();
      }
      function overlay(card, focusEl) {
        ov = h('div', { class: 'overlay wd-ov' }, card);
        ov.addEventListener('click', e => { if (e.target === ov) closeOv(); });
        game.append(ov);
        setTimeout(() => focusEl && focusEl.focus({ preventScroll: true }), 50);
      }
      function celebrate({ firstSolve, prize, allBonus, allNow }) {
        const n = rows.length;
        paintHint();
        if (!reduce) tiles[n - 1].forEach((t, c) => { t.style.animationDelay = c * 90 + 'ms'; t.classList.add('bounce'); });
        audio.sfx(n <= 2 ? 'perfect' : 'win');
        const br = board.getBoundingClientRect();
        later(() => fx.confetti(allNow ? 220 : 90, { x: br.left + br.width / 2, y: br.top + br.height * .4, stars: allNow, spread: br.width }), 250);
        later(flushPending, 450);
        later(() => {
          const pool = U.gentle ? WIN_TITLES_GENTLE : WIN_TITLES;
          const title = word === NAME_WORD ? (U.gentle ? 'There you are.' : U.group ? 'Hello, all of you.' : 'Hello, you.')
            : n === 1 ? (U.gentle ? 'First try.' : 'First try?! Suspicious.') : n === 6 ? (U.gentle ? 'Found it, on the last row.' : 'Phew. Last row.')
            : pool[Math.floor(Math.random() * pool.length)];
          const next = nextBtn();
          const card = h('div', { class: 'ocard wd-res' },
            h('p', { class: 'kicker', text: `${NAME} Nº ${pad2(idx + 1)} · ${word}` }),
            h('h3', { text: title }),
            h('div', { class: 'wd-stats' },
              h('div', {}, h('b', { text: `${n}/6` }), h('span', { text: 'guesses' })),
              h('div', {}, h('b', { text: S.hints[idx] ? 'Yes' : 'No' }), h('span', { text: 'hint used' }))),
            miniGrid(),
            allNow && TOTAL > 1 ? h('p', { class: 'wd-special' }, h('b', { text: `All ${numWord(TOTAL)}.` }), U.gentle ? ` Every word, for ${them}.` : ' Not a single word left.') : null,
            firstSolve ? h('p', { class: 'wd-earn', text: `+${prize + allBonus} ✦ stardust` }) : h('p', { class: 'fine', text: 'Already solved before, so no extra stardust. Still impressive.' }),
            h('div', { class: 'row' }, next, h('button', { class: 'btn', type: 'button', text: 'Share', onclick: e => share(true, e.currentTarget) })),
            h('div', { class: 'row' },
              h('button', { class: 'btn ghost small', type: 'button', text: 'See the board', onclick: closeOv }),
              nextUnsolved(idx) >= 0 ? h('button', { class: 'btn ghost small', type: 'button', text: 'All words', onclick: () => { audio.sfx('click'); showList(); } }) : null));
          overlay(card, next);
        }, reduce ? 300 : 1300);
      }
      function lost() {
        audio.sfx('lose');
        paintHint();
        later(() => {
          const again = h('button', { class: 'btn solid', type: 'button', text: 'Try again', onclick: () => { audio.sfx('click'); openGame(idx); } });
          const card = h('div', { class: 'ocard wd-res lose' },
            h('p', { class: 'kicker', text: `${NAME} Nº ${pad2(idx + 1)}` }),
            h('h3', { text: U.gentle ? 'Not this time.' : 'So close.' }),
            h('p', { text: 'The word was' }),
            h('div', { class: 'wd-reveal', 'aria-label': word }, word.split('').map((ch, i) => h('i', { class: 'wd-mini big', 'data-s': 'correct', style: { animationDelay: i * 90 + 'ms' }, text: ch }))),
            h('p', { class: 'wd-gentle', text: U.gentle ? 'Some words take their time.' : `${me} would have missed this one too.` }),
            h('div', { class: 'row' }, again, nextBtn('btn')),
            h('div', { class: 'row' },
              h('button', { class: 'btn ghost small', type: 'button', text: 'Share', onclick: e => share(false, e.currentTarget) }),
              h('button', { class: 'btn ghost small', type: 'button', text: 'See the board', onclick: closeOv })));
          overlay(card, again);
        }, reduce ? 200 : 700);
      }

      screen = { kind: 'game', idx, fit, key: k => (ov ? false : press(k)), esc: () => { if (ov) { closeOv(); return true; } return false; } };
      if (over) showEnd();
      fit();
      requestAnimationFrame(() => { if (game.isConnected) fit(); });
    }

    // left mid-word last time: drop right back in
    if (S.current && okIdx(S.current.idx) && S.current.rows.length && !isSolved(S.current.idx)) openGame(S.current.idx);
    else showList();
  },
};
