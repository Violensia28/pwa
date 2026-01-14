// assets/media.js
export async function compressImage(file, maxWidth=800, quality=0.6) {
  if (!file) return null;
  const dataURL = await fileToDataURL(file);
  const img = await loadImage(dataURL);
  const w = Math.min(maxWidth, img.width);
  const h = Math.round(img.height * (w / img.width));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function compressMany(files, maxCount=6) {
  const arr = Array.from(files || []).slice(0, maxCount);
  const out = [];
  for (const f of arr) {
    const c = await compressImage(f);
    if (c) out.push(c);
  }
  return out;
}

export function renderThumbs(container, dataUrls) {
  container.innerHTML = '';
  (dataUrls || []).forEach((u) => {
    const img = document.createElement('img');
    img.src = u;
    img.style.width = '80px';
    img.style.height = '60px';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '10px';
    img.style.border = '1px solid #e2e8f0';
    img.style.cursor = 'pointer';
    img.title = 'Klik untuk buka';
    img.onclick = () => window.open(u, '_blank');
    container.appendChild(img);
  });
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
