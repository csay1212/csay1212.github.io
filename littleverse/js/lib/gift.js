// Gift files: a universe packed into one file (with its photos and songs) that
// the recipient opens in Littleverse. Nothing is uploaded anywhere.
import { db, mediaIds, isAsset } from './db.js';
import { upgradeTracks } from './templates.js';

const FORMAT = 'littleverse-gift';

const toDataURL = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
async function dataURLToBlob(url) { return (await fetch(url)).blob(); }

export async function packGift(u, { from } = {}) {
  const media = {};
  for (const id of mediaIds(u)) {
    const rec = await db.getMedia(id);
    if (rec && rec.blob) media[id] = { type: rec.type, name: rec.name || '', data: await toDataURL(rec.blob) };
  }
  const copy = JSON.parse(JSON.stringify(u));
  delete copy.demo; delete copy.opened;
  copy.kind = 'received';
  copy.from = from || u.me.name;
  copy.giftOf = u.id;
  const payload = { format: FORMAT, v: 1, createdAt: Date.now(), universe: copy, media };
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  const safe = String(u.them.name || 'someone').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'someone';
  return { blob, filename: `For-${safe}.littleverse`, size: blob.size };
}

export async function unpackGift(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { throw new Error('That file isn’t a Littleverse gift.'); }
  if (!data || data.format !== FORMAT || !data.universe) throw new Error('That file isn’t a Littleverse gift.');
  const u = data.universe;
  const map = {};
  for (const [oldId, m] of Object.entries(data.media || {})) {
    try { map[oldId] = await db.putMedia(await dataURLToBlob(m.data), { name: m.name }); } catch {}
  }
  const swap = ref => (ref && !isAsset(ref) ? (map[ref] || null) : ref);
  u.them.photo = swap(u.them.photo); u.me.photo = swap(u.me.photo);
  (u.copy?.memories?.items || []).forEach(m => { m.photo = swap(m.photo); });
  (u.copy?.mixtape?.tracks || []).forEach(t => { if (t.media) t.media = swap(t.media); });
  upgradeTracks(u.copy?.mixtape?.tracks);  // a gift from an older version of the app
  u.id = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  u.kind = 'received';
  u.receivedAt = Date.now();
  delete u.opened; delete u.demo;
  await db.put(u, { touch: false });
  return u;
}

export const fmtSize = n => n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB';
