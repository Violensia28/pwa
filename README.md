# TechPartner 6.1 (Hybrid Modular + PWA)

Repo: **pwa** (GitHub Project Pages)

## Deploy ke GitHub Pages
1. Upload semua isi folder `techpartner-pwa/` ke root repo.
2. Settings → Pages → Deploy from branch → `main` / root.
3. Aktifkan **Enforce HTTPS** (wajib untuk PWA Service Worker).

## Mulai dari 0 data
- Data tersimpan lokal di browser (LocalStorage) dan bisa dibackup/restore JSON.
- Sync GitHub optional: isi Settings → GitHub Cloud.

## PWA Offline
- Buka web saat online 1x, lalu app shell ter-cache.
- Setelah itu bisa dibuka saat offline (data tetap lokal).

## Catatan
- Jangan commit token/API key ke repo.
- Mode Atasan bisa verify WO, tapi read-only untuk edit/hapus.
