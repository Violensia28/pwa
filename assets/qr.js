// assets/qr.js
// QR module MVP: scanning via BarcodeDetector when available; otherwise manual.

export async function scanQRCode() {
  // Minimal flow: if BarcodeDetector exists, attempt camera scan; else prompt.
  if ('BarcodeDetector' in window) {
    // A full camera scanner UI is non-trivial without extra UI.
    // MVP: prompt for code; user can paste value from external scanner.
    const val = prompt('Scan QR belum diaktifkan penuh. Tempel/ketik isi QR di sini:');
    return (val || '').trim();
  }
  const val = prompt('Browser tidak mendukung scanner. Tempel/ketik isi QR:');
  return (val || '').trim();
}

export function buildAssetQRPayload(assetId) {
  return `tp6://asset/${assetId}`;
}

export function buildLocationQRPayload(locationId) {
  return `tp6://location/${locationId}`;
}

export function parseQRPayload(text) {
  const t = (text || '').trim();
  const m1 = t.match(/^tp6:\/\/asset\/(.+)$/);
  if (m1) return { kind: 'asset', id: m1[1] };
  const m2 = t.match(/^tp6:\/\/location\/(.+)$/);
  if (m2) return { kind: 'location', id: m2[1] };
  return { kind: 'unknown', raw: t };
}
