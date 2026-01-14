# TechPartner 6.3 (Hybrid Modular + PWA)

Repo: **pwa** (GitHub Project Pages)

## Deploy ke GitHub Pages
1. Upload semua isi folder `techpartner-pwa/` ke root repo.
2. Settings → Pages → Deploy from branch → `main` / root.
3. Aktifkan **Enforce HTTPS** (wajib untuk Service Worker & kamera).

## Scan QR Kamera
- Klik **Scan QR** → aplikasi meminta izin kamera.
- QR `tp6://asset/<id>` membuka detail aset.
- QR `tp6://location/<id>` mem-filter daftar aset ke ruang tersebut.
- BarcodeDetector bersifat experimental; jika tidak tersedia, gunakan tombol Manual.

## Catatan
- getUserMedia dan BarcodeDetector hanya bekerja di secure context (HTTPS/localhost).
