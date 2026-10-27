// Date helpers for "the date that matters" in a universe.
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MON = MONTHS.map(m => m.slice(0, 3));
const DAY = 864e5;

export function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) return null;
  return { y: +m[1], m: +m[2], d: +m[3] };
}
export const iso = (y, m, d) => `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
export const todayISO = () => { const n = new Date(); return iso(n.getFullYear(), n.getMonth() + 1, n.getDate()); };
const mid = (y, m, d) => new Date(y, m - 1, d, 12);
const today = () => { const n = new Date(); return mid(n.getFullYear(), n.getMonth() + 1, n.getDate()); };

export function info(s, yearKnown = true) {
  const p = parseDate(s) || parseDate(todayISO());
  const t = today();
  const at = mid(p.y, p.m, p.d);
  let next = mid(t.getFullYear(), p.m, p.d);
  if (next < t) next = mid(t.getFullYear() + 1, p.m, p.d);
  let last = mid(t.getFullYear(), p.m, p.d);
  if (last > t) last = mid(t.getFullYear() - 1, p.m, p.d);
  const isToday = p.m === t.getMonth() + 1 && p.d === t.getDate();
  return {
    y: p.y, m: p.m, d: p.d, yearKnown,
    month: MONTHS[p.m - 1], mon: MON[p.m - 1],
    long: `${MONTHS[p.m - 1]} ${p.d}`, short: `${MON[p.m - 1].toUpperCase()} ${p.d}`,
    full: yearKnown ? `${MONTHS[p.m - 1]} ${p.d}, ${p.y}` : `${MONTHS[p.m - 1]} ${p.d}`,
    date: at, next, last, isToday,
    daysUntil: Math.round((next - t) / DAY),
    daysSinceLast: Math.round((t - last) / DAY),
    daysSince: Math.round((t - at) / DAY), // negative if in the future
    yearsSince: yearKnown ? Math.floor((t - at) / (365.2425 * DAY)) : null,
    weekday: at.toLocaleDateString('en-US', { weekday: 'long' }),
    season: season(p.m),
  };
}
export function season(m) { return m === 12 || m <= 2 ? 'Winter' : m <= 5 ? 'Spring' : m <= 8 ? 'Summer' : 'Fall'; }
export const nowSeason = () => season(new Date().getMonth() + 1);
export function fmtDay(ts) { return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
export function relDays(n) {
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n < 0) return `${-n} day${n === -1 ? '' : 's'} ago`;
  return `in ${n} days`;
}
// km that light travels in n days
export const lightKm = days => days * 86400 * 299792.458;
export const AU = 149597870.7;
