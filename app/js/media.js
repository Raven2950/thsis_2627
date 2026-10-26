// Files embedded in notes (images, PDFs) are read from the vault and shown through object URLs.
import { store } from './store.js';

const urls = new Map();   // vault path -> object URL

export async function vaultUrl(ref) {
  const path = store.resolveFile(ref);
  if (!path) throw new Error('这个文件只在作者自己的电脑上（没有发布）');
  if (!urls.has(path)) urls.set(path, URL.createObjectURL(await store.readFile(path)));
  return urls.get(path);
}

// Fill in <img data-vault-src> produced by renderMarkdown.
export function hydrate(root) {
  for (const img of root?.querySelectorAll('img[data-vault-src]:not([src])') || []) {
    vaultUrl(img.dataset.vaultSrc).then(u => { img.src = u; }).catch(() => {
      const note = Object.assign(document.createElement('span'), { className: 'muted', textContent: `（图片 ${img.alt} 不在这里）` });
      img.replaceWith(note);
    });
  }
}

// Re-encode a photo in the browser: at most `max` px on the long side, as JPEG. Drawing to a canvas
// drops all metadata, so phone photos lose their GPS location before they ever reach the vault.
export async function shrinkImage(file, max = 1600) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) });
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(res, 'image/jpeg', 0.82));
}
