// assets/qr.js
// MVP: scan is manual input/paste. Full camera scan can be added later.

export async function scanQRCode() {
  const val = prompt('Tempel/ketik isi QR di sini (MVP):');
  return (val || '').trim();
}

export function parseQRPayload(text) {
  const t = (text || '').trim();
  const m1 = t.match(/^tp6:\/\/asset\/(.+)$/);
  if (m1) return { kind: 'asset', id: m1[1] };
  const m2 = t.match(/^tp6:\/\/location\/(.+)$/);
  if (m2) return { kind: 'location', id: m2[1] };
  return { kind: 'unknown', raw: t };
}
