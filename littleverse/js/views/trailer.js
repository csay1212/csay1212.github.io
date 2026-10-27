// Coming Soon: a dramatic movie trailer for the sequel, with synthesized
// trailer sound design and an "Add to calendar" reminder at the end. Every word
// comes from the universe (U.copy.trailer) and its date.
import { h, icon } from '../core/dom.js';
import { shareFile } from '../shell/native.js';

const hexN = s => { const m = /^#?([0-9a-f]{6})$/i.exec(String(s || '').trim()); return m ? parseInt(m[1], 16) : null; };
function mix(a, b, t) {
  const A = hexN(a), B = hexN(b);
  if (A == null || B == null) return a || b;
  return '#' + [16, 8, 0].map(s => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, '0')).join('');
}
// calendar lines must be at most 75 bytes; longer ones continue on the next line after a space
function fold(line) {
  const enc = new TextEncoder(); const out = []; let cur = '';
  for (const ch of line) { if (enc.encode(cur + ch).length > (out.length ? 74 : 75)) { out.push(cur); cur = ''; } cur += ch; }
  out.push(cur);
  return out.join('\r\n ');
}
const icsText = s => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const ymd = d => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
const an = w => (/^[aeiou]/i.test(String(w || '').trim()) ? 'an' : 'a');
const slug = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'the-sequel';

// small pictures for "There will be …" lines
const LINE_ART = [[/cake/i, 'birthday_cake'], [/sing|song|music/i, 'musical_notes'], [/champagne|toast|party/i, 'party_popper'], [/hug/i, 'people_hugging'],
  [/snack/i, 'wrapped_gift'], [/danc/i, 'mans_shoe'], [/dinner|table/i, 'hot_beverage'], [/video call|calls/i, 'speech_balloon'], [/visit/i, 'house_with_garden'],
  [/speech/i, 'trophy'], [/stor(y|ies)/i, 'open_book'], [/laugh/i, 'smiling_face_with_hearts'], [/plan/i, 'spiral_calendar'], [/good days|sun/i, 'sun_with_face']];

export default {
  css: 'trailer',
  mount(ctx) {
    const { audio, store, U } = ctx;
    const A = audio;
    const T = U.theme || {};
    const copy = U.copy.trailer || {};
    const them = U.them.name, me = U.me.name;
    const title = U.fill(copy.title || `${them} 2`);
    const sub = U.fill(copy.sub || 'The sequel');
    const rating = U.fill(copy.rating || '');
    const lines = (copy.lines || []).filter(l => l && l.t).map(l => ({ ...l, t: U.fill(l.t), small: l.small ? U.fill(l.small) : null }));
    const occ = U.occ, yearly = !!(U.occDef && U.occDef.yearly);

    /* ---------- the premiere date ---------- */
    const today = new Date(new Date().toDateString());
    const target = occ === 'reunion' ? new Date(U.date.y, U.date.m - 1, U.date.d) : new Date(U.date.next.getFullYear(), U.date.next.getMonth(), U.date.next.getDate());
    const days = Math.round((target - today) / 864e5);
    const weekday = target.toLocaleDateString('en-US', { weekday: 'long' });
    const longDate = target.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const TODAY_LINE = { birthday: 'Happy birthday!', belated: 'Happy birthday!', anniversary: 'Happy anniversary!', newyear: 'Happy new year!', reunion: 'Today’s the day!',
      congrats: 'Congratulations!', farewell: 'Bon voyage!', thanks: 'Thank you!', getwell: 'Feel better soon.', remembrance: 'Today, we remember.' };
    const countdown = days === 0 ? `Now showing. ${U.gentle ? 'Today, and always.' : TODAY_LINE[occ] || 'Today’s the day.'}`
      : days < 0 ? `Premiered ${-days === 1 ? 'yesterday' : `${-days} days ago`}. Still showing.`
      : days === 1 ? `Tomorrow · a ${weekday}` : `${days} days to go · a ${weekday}`;

    // the three reminders, worded for the occasion
    const bday = occ === 'birthday' || occ === 'belated';
    const alarms = U.gentle ? [`One week until ${U.date.long}. A day to remember ${them}.`, `Tomorrow we remember ${them}.`, `Today we remember ${them}, with love.`]
      : bday ? [`One week until ${them}’s birthday. The sequel is coming.`, `Tomorrow is ${them}’s birthday. Premiere at midnight.`, `Today is ${them}’s birthday. Happy birthday, ${them}!`]
      : occ === 'anniversary' ? ['One week until the anniversary. The sequel is coming.', 'The anniversary is tomorrow. Book the table.', 'Happy anniversary! Now showing.']
      : occ === 'reunion' ? ['One week to go. Together again soon.', 'Tomorrow’s the day. See you soon!', 'Today’s the day. Together, finally.']
      : occ === 'newyear' ? [`One week until ${U.date.long}. Plans, ready?`, `${title} premieres tomorrow.`, `${title} is now showing. Happy new year!`]
      : [`One week until ${title} premieres.`, `${title} premieres tomorrow.`, `${title} is now showing.`];
    function icsFile() {
      const end = new Date(target.getFullYear(), target.getMonth(), target.getDate() + 1);
      const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
      const alarm = (trig, txt) => ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(txt)}`, `TRIGGER:${trig}`, 'END:VALARM'];
      const summary = `${title} premieres${bday && !U.gentle ? ` · ${them}’s birthday` : ''}`;
      const desc = [rating && rating.replace(/[.!]*$/, '.'), `${an(U.studio) === 'an' ? 'An' : 'A'} ${U.studio} production, made by ${me}.`, yearly ? 'Showing every year.' : ''].filter(Boolean).join(' ');
      return [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Littleverse//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
        `UID:${slug(U.id || 'universe')}-${ymd(target)}-premiere@littleverse`, `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${ymd(target)}`, `DTEND;VALUE=DATE:${ymd(end)}`, ...(yearly ? ['RRULE:FREQ=YEARLY'] : []),
        `SUMMARY:${icsText(summary)}`, `DESCRIPTION:${icsText(desc)}`, 'TRANSP:TRANSPARENT',
        ...alarm('-P6DT15H', alarms[0]), ...alarm('-PT15H', alarms[1]), ...alarm('PT9H', alarms[2]),
        'END:VEVENT', 'END:VCALENDAR',
      ].map(fold).join('\r\n') + '\r\n';
    }

    // text sizing so long names and titles still fit a phone
    const avail = () => Math.min(innerWidth, 900) - 64;
    function fitSize(text, max, min, perChar, maxLines = 2, vw = 1) {
      max = Math.min(max, innerWidth * vw);
      const s = String(text), longest = Math.max(1, ...s.split(/\s+/).map(w => [...w].length)), n = [...s].length;
      let fs = Math.min(max, avail() / (longest * perChar));
      const oneLine = avail() / (n * perChar);
      if (oneLine >= fs * .62) fs = Math.min(fs, oneLine);
      else if (n * perChar * fs > avail()) fs = Math.min(fs, (avail() * maxLines * .92) / (n * perChar));
      return Math.max(min, Math.round(fs)) + 'px';
    }

    let started = false, idx = -1, timer = null, done = false, droneStop = null;
    const card = h('div', { class: 'tr-card', 'aria-live': 'polite' });
    const flash = h('div', { class: 'tr-flash' });
    const skip = h('button', { type: 'button', class: 'btn ghost small tr-skip' }, 'Skip ▸▸');
    const back = h('a', { class: 'back tr-back', href: '#/map', 'aria-label': 'Back to the map' }, icon('back'), h('span', { text: 'Map' }));
    const scene = h('div', { class: 'tr' },
      h('div', { class: 'tr-grain' }), h('div', { class: 'tr-vig' }),
      h('div', { class: 'tr-bar t' }), h('div', { class: 'tr-bar b' }),
      card, flash, back, skip);
    ctx.root.append(scene);
    ctx.pauseSky();

    /* ---------- sound design ---------- */
    const t = () => A.now();
    const snd = {
      boom() { const c = A.ac(); if (!c) return; const tt = t(); A.kick(tt, 1); A.blip({ t: tt, f0: 70, f1: 30, dur: 1.6, vol: .5, type: 'sine' }); A.hiss({ t: tt, dur: 1.4, freq: 500, q: .4, type: 'lowpass', vol: .5, sweepTo: 60 }); },
      hit() { if (!A.ac()) return; const tt = t(); A.kick(tt, .9); A.hiss({ t: tt, dur: .25, freq: 1800, q: .6, vol: .7 }); A.blip({ t: tt, f0: 180, f1: 90, dur: .3, vol: .3, type: 'triangle' }); },
      alarm() { if (!A.ac()) return; const tt = t(); for (let i = 0; i < 4; i++) A.blip({ t: tt + i * .14, f0: 2093, f1: 2093, dur: .08, vol: .09, type: 'square' }); },
      rise() { if (!A.ac()) return; const tt = t(); A.hiss({ t: tt, dur: 2.2, freq: 200, q: .7, type: 'bandpass', vol: .45, sweepTo: 7000 }); A.blip({ t: tt, f0: 110, f1: 880, dur: 2.2, vol: .12, type: 'sawtooth' }); for (let i = 0; i < 8; i++) A.sfx('tick'); },
      braam() {
        const c = A.ac(); if (!c) return; const tt = t();
        const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 6;
        f.frequency.setValueAtTime(140, tt); f.frequency.exponentialRampToValueAtTime(1400, tt + .25); f.frequency.exponentialRampToValueAtTime(260, tt + 2.6);
        const g = c.createGain(); g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(.22, tt + .05); g.gain.exponentialRampToValueAtTime(.001, tt + 3);
        f.connect(g); g.connect(A.dryOut());
        [41.2, 41.5, 82.4, 61.7, 123.5].forEach(fr => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(tt); o.stop(tt + 3.1); });
        A.kick(tt, 1);
      },
      drone() {
        const c = A.ac(); if (!c) return () => {};
        const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
        o.type = 'sine'; o.frequency.value = 55; o2.type = 'triangle'; o2.frequency.value = 82.4;
        lfo.frequency.value = .3; lg.gain.value = .02; lfo.connect(lg); lg.connect(g.gain);
        g.gain.value = 0; g.gain.linearRampToValueAtTime(.06, c.currentTime + 2);
        o.connect(g); o2.connect(g); g.connect(A.out()); o.start(); o2.start(); lfo.start();
        return () => { try { g.gain.cancelScheduledValues(c.currentTime); g.gain.setValueAtTime(g.gain.value, c.currentTime); g.gain.linearRampToValueAtTime(0, c.currentTime + .4); o.stop(c.currentTime + .5); o2.stop(c.currentTime + .5); lfo.stop(c.currentTime + .5); } catch {} };
      },
    };
    ctx.cleanup(() => { if (droneStop) droneStop(); });

    /* ---------- the cards ---------- */
    const bigEmoji = (lines.find(l => l.big) || {}).t?.split(/\s+/)[0] || '✨';
    const hillSVG = () => {
      const sky0 = mix(T.night || '#0c0b24', T.dusk || '#2a1d55', .5), sky1 = T.horizon || '#4a2c6e', sky2 = mix(T.rose || '#ef7fb0', T.horizon || '#4a2c6e', .3), sky3 = mix(T.peach || '#ff9a7a', T.gold || '#f5cc4a', .5);
      const ground = mix(T.night || '#0c0b24', '#000000', .35), lamp = mix(T.gold || '#f5cc4a', '#ffffff', .45);
      return `<svg viewBox="0 0 400 200" aria-hidden="true"><defs><linearGradient id="trg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky0}"/><stop offset=".45" stop-color="${sky1}"/><stop offset=".72" stop-color="${sky2}"/><stop offset="1" stop-color="${sky3}"/></linearGradient></defs>
        <rect width="400" height="200" fill="url(#trg)"/>${[[40, 30], [96, 52], [150, 22], [230, 40], [290, 18], [360, 46], [200, 64], [120, 80]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 1.1 : 1.6}" fill="#fff" opacity=".8"/>`).join('')}
        <path d="M0 200 L0 160 C100 140 220 136 400 152 L400 200Z" fill="${ground}"/><rect x="318" y="96" width="4" height="62" fill="${ground}"/><rect x="312" y="90" width="16" height="9" fill="${lamp}"/><circle cx="320" cy="94" r="30" fill="${lamp}" opacity=".2"/></svg>`;
    };
    const visuals = {
      calendar: () => h('div', { class: 'tr-cal' }, h('span', { text: U.date.month.toUpperCase() }), h('b', { text: String(U.date.d) }), h('i', { text: bigEmoji })),
      hill: () => h('div', { class: 'tr-hill', html: hillSVG() }),
    };
    const rise = lines.findIndex(l => l.s === 'rise');
    const seq = [
      { kind: 'band' },
      ...lines.map((c, i) => {
        let vis = i === rise ? 'calendar' : (rise >= 0 && i === rise + 1 && c.s === 'braam') ? 'hill' : null;
        let art = null;
        if (!vis && !c.big && c.small) { const m = LINE_ART.find(([re]) => re.test(c.t)); if (m) art = m[1]; }
        return { ...c, vis, art };
      }),
      { kind: 'title' },
      { kind: 'end' },
    ];
    // the rating band's "Contains …" line, from the trailer's own promises
    const contains = lines.map(l => /^there will be\s+(.+?)[.!]*$/i.exec(l.t)?.[1]).filter(x => x && x.length <= 22).slice(0, 3);
    const containsTxt = contains.length ? `Contains ${contains.length > 1 ? contains.slice(0, -1).join(', ') + ' and ' + contains.at(-1) : contains[0]}` : '';

    function show(i) {
      clearTimeout(timer);
      idx = i;
      const s = seq[i];
      if (!s) return;
      card.className = 'tr-card';
      card.replaceChildren();
      void card.offsetWidth;
      let dur = 2300;
      if (s.kind === 'band') {
        card.classList.add('band');
        const nm = them.toUpperCase();
        card.append(h('div', { class: 'tr-band' },
          h('p', { text: 'The following preview has been approved for' }),
          h('b', { text: nm, style: { fontSize: fitSize(nm, 96, 30, .84) } }),
          h('p', { text: `by the ${U.studio} Ratings Board` }),
          rating || containsTxt ? h('small', { text: [rating, containsTxt].filter(Boolean).join(' · ') }) : null));
        dur = 3400;
      } else if (s.kind === 'title') {
        card.classList.add('title');
        const T2 = title.toUpperCase();
        const ME = me.toUpperCase(), STUDIO = U.studio.toUpperCase();
        card.append(h('p', { class: 'tr-pre', text: `${U.studio} presents` }),
          h('h2', { text: T2, style: { fontSize: fitSize(T2, 200, 40, .66, 2) } }),
          sub ? h('p', { class: 'tr-sub', text: sub }) : null,
          h('p', { class: 'tr-billing', text: `${STUDIO} presents ${an(ME).toUpperCase()} ${ME} production · in association with ${U.verse.toUpperCase()} · “${T2}” · starring ${them.toUpperCase()} · music by THE MIXTAPE · special effects by A SKY FULL OF STARS · written & directed by ${ME}` }));
        snd.braam(); flashIt();
        dur = 4600;
      } else if (s.kind === 'end') { finish(true); return; }
      else {
        if (s.big) card.classList.add('big');
        if (s.vis && visuals[s.vis]) card.append(visuals[s.vis]());
        if (s.art) card.append(h('img', { class: 'tr-art', src: `assets/emoji/${s.art}.webp`, alt: '', width: 96, height: 96 }));
        card.append(h('p', { class: 'tr-line', text: s.t, style: s.big ? null : { fontSize: fitSize(s.t, 74, 30, .5, 3, .13) } }));
        if (s.small) card.append(h('p', { class: 'tr-quote', text: s.small }));
        if (snd[s.s]) snd[s.s]();
        if (s.s === 'braam') flashIt();
        dur = s.big ? 1200 : s.small ? 2900 : 2300;
      }
      requestAnimationFrame(() => card.classList.add('in'));
      timer = setTimeout(() => { if (ctx.alive()) show(i + 1); }, ctx.reduce ? dur + 600 : dur);
    }
    ctx.cleanup(() => clearTimeout(timer));
    function flashIt() { if (ctx.reduce) return; flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on'); }

    function finish(watched) {
      if (done && idx === seq.length - 1 && card.classList.contains('end')) return;
      done = true; idx = seq.length - 1; clearTimeout(timer);
      if (droneStop) { droneStop(); droneStop = null; }
      skip.hidden = true;
      card.className = 'tr-card end';
      const acts = h('div', { class: 'tr-acts' });
      if (days >= 0) {
        const ics = h('button', { type: 'button', class: 'btn solid big' }, icon('calendar'), 'Add to calendar');
        ics.onclick = async () => {
          A.sfx('coin'); ctx.haptic('success');
          const res = await shareFile(new Blob([icsFile()], { type: 'text/calendar;charset=utf-8' }), `${slug(title)}-premiere.ics`, { title: `${title} premieres` });
          if (!ctx.alive()) return;
          if (res === 'cancelled') return;
          if (res === 'failed') { ctx.toast('That didn’t work on this device. Try again from a browser.'); return; }
          ctx.toast(`A reminder with three alarms: a week before, the day before, and the day itself.${yearly ? ' Every year.' : ''}`, 5200);
          if (!store.seen('trailer-ics')) ctx.award(5, ics);
        };
        acts.append(ics);
      }
      acts.append(
        h('button', { type: 'button', class: 'btn ghost', onclick: () => start() }, icon('replay'), 'Replay'),
        h('a', { class: 'btn rose', href: '#/map' }, 'Back to the map'));
      card.replaceChildren(
        h('p', { class: 'tr-pre', text: days < 0 ? 'Premiered' : U.gentle ? 'Showing' : 'In theaters' }),
        h('h2', { text: longDate }),
        h('p', { class: 'tr-sub', text: countdown }),
        acts,
        days >= 0 ? h('p', { class: 'fine tr-calnote', text: `The calendar file works with Apple Calendar, Google Calendar and Outlook.${yearly ? ' It repeats every year.' : ''}` }) : null);
      requestAnimationFrame(() => card.classList.add('in'));
      ctx.releaseMusic();
      if (watched) { if (ctx.stamp()) ctx.award(10, card); store.stat('trailers'); }
      else if (!store.hasStamp('trailer')) card.append(h('p', { class: 'fine', text: 'Watch it to the end (tapping through counts) to earn the passport stamp.' }));
    }

    function start() {
      started = true; done = false;
      skip.hidden = false;
      ctx.holdMusic();
      A.ac();
      if (droneStop) droneStop();
      droneStop = snd.drone();
      show(0);
    }

    /* ---------- intro: press play ---------- */
    const playBtn = h('button', { type: 'button', class: 'tr-play', 'aria-label': 'Play the trailer' }, icon('play'));
    card.className = 'tr-card intro in';
    card.append(h('p', { class: 'tr-pre', text: 'Coming attractions' }), playBtn,
      h('p', { class: 'tr-hint', text: 'Sound on, if you can. It’s a trailer.' }),
      h('p', { class: 'tr-hint2', text: 'Tap anywhere to jump ahead.' }));
    skip.hidden = true;
    playBtn.onclick = () => start();

    // tap the screen to jump ahead a card; skip jumps to the end
    scene.addEventListener('click', e => {
      if (!started || done || e.target.closest('button,a')) return;
      show(idx + 1);
    });
    skip.onclick = () => finish(false);
    ctx.on(document, 'keydown', e => {
      if (e.key === 'Escape') { ctx.go('#/map'); return; }
      if ((e.key === ' ' || e.key === 'Enter') && !e.target.closest('button,a')) { e.preventDefault(); if (!started) start(); else if (!done) show(idx + 1); }
      if (e.key === 'ArrowRight' && started && !done) show(idx + 1);
    });
    ctx.on(document, 'visibilitychange', () => { if (document.hidden && started && !done) finish(false); });
  },
};
