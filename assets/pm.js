// assets/pm.js

export function addDays(dateStr, days) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + Number(days || 0));
  return d.toISOString().slice(0,10);
}

export function daysBetween(a, b) {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db - da) / (1000*60*60*24));
}

export function computeNextDue(lastService, intervalDays) {
  const iv = Number(intervalDays || 0);
  if (!lastService || !iv) return '';
  return addDays(lastService, iv);
}

export function overdueDays(nextDue, todayStr) {
  if (!nextDue) return 0;
  const t = todayStr || new Date().toISOString().slice(0,10);
  const diff = daysBetween(nextDue, t);
  return Math.max(0, diff);
}

export function priorityScore(asset, todayStr) {
  const t = todayStr || new Date().toISOString().slice(0,10);
  const od = overdueDays(asset.next_due, t);
  let score = od;
  if (asset.cond === 'Rusak') score += 50;
  else if (asset.cond === 'Perlu Servis') score += 20;
  if (asset.criticality === 'Tinggi') score += 30;
  return score;
}
