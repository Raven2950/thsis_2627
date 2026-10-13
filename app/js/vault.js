// Access to the Obsidian vault folder.
// Chrome/Edge: File System Access API, read + write, the folder handle is remembered in IndexedDB.
// Safari/Firefox: <input webkitdirectory>, read-only snapshot.

const DB = 'thesis-web', STORE = 'kv';

function idb(mode, fn) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req?.result);
      tx.onerror = () => reject(tx.error);
    };
  });
}
const kvGet = key => idb('readonly', s => s.get(key)).catch(() => undefined);
const kvSet = (key, val) => idb('readwrite', s => s.put(val, key)).catch(() => {});

export const canWrite = 'showDirectoryPicker' in window;

class FsVault {
  constructor(handle) { this.handle = handle; this.name = handle.name; this.readOnly = false; }

  async *walk(dir = this.handle, prefix = '') {
    for await (const [name, h] of dir.entries()) {
      if (name.startsWith('.')) continue;                       // .obsidian, .trash, .git
      if (h.kind === 'directory') yield* this.walk(h, `${prefix}${name}/`);
      else yield { path: prefix + name, handle: h };
    }
  }
  async readAll() {
    const out = [];
    for await (const { path, handle } of this.walk()) {
      if (!path.endsWith('.md')) continue;
      const f = await handle.getFile();
      out.push({ path, text: await f.text(), mtime: f.lastModified });
    }
    return out;
  }
  async fileHandle(path, create = false) {
    const parts = path.split('/');
    let dir = this.handle;
    for (const p of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(p, { create });
    return dir.getFileHandle(parts.at(-1), { create });
  }
  async read(path) {
    const f = await (await this.fileHandle(path)).getFile();
    return { text: await f.text(), mtime: f.lastModified };
  }
  async write(path, data) {          // string or Blob
    const w = await (await this.fileHandle(path, true)).createWritable();
    await w.write(data);
    await w.close();
  }
  async readFile(path) { return (await this.fileHandle(path)).getFile(); }
  async listFiles() { const out = []; for await (const { path } of this.walk()) out.push(path); return out; }
}

class SnapshotVault {
  constructor(files) {
    this.files = files;
    this.name = files[0]?.webkitRelativePath.split('/')[0] || 'vault';
    this.readOnly = true;
  }
  async readAll() {
    const out = [];
    for (const f of this.files) {
      const path = f.webkitRelativePath.split('/').slice(1).join('/');
      if (!path.endsWith('.md') || path.split('/').some(p => p.startsWith('.'))) continue;
      out.push({ path, text: await f.text(), mtime: f.lastModified });
    }
    return out;
  }
  async listFiles() { return this.files.map(f => f.webkitRelativePath.split('/').slice(1).join('/')).filter(p => !p.split('/').some(s => s.startsWith('.'))); }
  async read(path) {
    const f = this.files.find(f => f.webkitRelativePath.split('/').slice(1).join('/') === path);
    return f ? { text: await f.text(), mtime: f.lastModified } : undefined;
  }
  async readFile(path) {
    const f = this.files.find(f => f.webkitRelativePath.split('/').slice(1).join('/') === path);
    if (!f) throw Object.assign(new Error(`没有这个文件：${path}`), { name: 'NotFoundError' });
    return f;
  }
  async write() { throw new Error('只读模式（Safari）不能写入，请用 Chrome 打开'); }
}

// A vault served over HTTP: the published site (read-only, file list from manifest.json, which the
// GitHub Action writes) or demo mode (?demo: the dev server's directory listing, edits kept in memory).
class HttpVault {
  constructor(base, { published = false } = {}) {
    this.base = new URL(base, location.href); this.name = 'vault'; this.mem = new Map();
    this.published = published; this.readOnly = published; this.demo = !published;
  }
  async list() {
    try { const r = await fetch(new URL('manifest.json', this.base)); if (r.ok) return (await r.json()).files; } catch (e) { /* no manifest */ }
    return this.listDir();
  }
  async listDir(url = this.base, prefix = '') {
    const html = await (await fetch(url)).text();
    const out = [];
    for (const [, href] of html.matchAll(/href="([^"?#]+)"/g)) {
      const name = decodeURIComponent(href);
      if (name.startsWith('.') || name.startsWith('/') || name.startsWith('..')) continue;
      if (name.endsWith('/')) out.push(...await this.listDir(new URL(href, url), prefix + name));
      else out.push(prefix + name);
    }
    return out;
  }
  async listFiles() { if (!this.paths) this.paths = await this.list(); return [...new Set([...this.paths, ...this.mem.keys()])]; }
  async readAll() {
    if (!this.paths) this.paths = await this.list();
    const all = new Set([...this.paths, ...this.mem.keys()]);
    const out = [];
    for (const path of all) if (path.endsWith('.md')) out.push({ path, ...await this.read(path) });
    return out;
  }
  async readFile(path) {
    if (this.mem.has(path)) { const v = this.mem.get(path); return v instanceof Blob ? v : new Blob([v]); }
    const res = await fetch(new URL(path.split('/').map(encodeURIComponent).join('/'), this.base));
    if (!res.ok) throw Object.assign(new Error(`没有这个文件：${path}`), { name: 'NotFoundError' });
    return res.blob();
  }
  async read(path) {
    if (this.mem.has(path)) return { text: this.mem.get(path), mtime: 0 };
    const res = await fetch(new URL(path.split('/').map(encodeURIComponent).join('/'), this.base));
    if (!res.ok) throw Object.assign(new Error(`没有这个文件：${path}`), { name: 'NotFoundError' });
    return { text: await res.text(), mtime: 0 };
  }
  async write(path, data) {
    if (this.readOnly) throw new Error('这是发布版，只能看不能改');
    this.mem.set(path, data);
  }
}
export const demoVault = base => new HttpVault(base);
export const publishedVault = base => new HttpVault(base, { published: true });
export async function hasPublished(base) {
  try { return (await fetch(new URL('manifest.json', new URL(base, location.href)))).ok; } catch (e) { return false; }
}

export async function pickVault() {
  const handle = await window.showDirectoryPicker({ id: 'thesis-vault', mode: 'readwrite' });
  await kvSet('vault', handle);
  return new FsVault(handle);
}

// Returns { vault } when permission is still granted, { pending: handle } when the browser
// needs a click to re-grant it, or null when nothing was remembered.
export async function restoreVault() {
  if (!canWrite) return null;
  const handle = await kvGet('vault');
  if (!handle) return null;
  const perm = await handle.queryPermission({ mode: 'readwrite' });
  return perm === 'granted' ? { vault: new FsVault(handle) } : { pending: handle };
}

export async function regrant(handle) {
  const perm = await handle.requestPermission({ mode: 'readwrite' });
  return perm === 'granted' ? new FsVault(handle) : null;
}

export function pickSnapshot() {
  return new Promise((resolve, reject) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', webkitdirectory: true, multiple: true });
    input.onchange = () => input.files.length ? resolve(new SnapshotVault([...input.files])) : reject(new Error('没有选择文件夹'));
    input.click();
  });
}
