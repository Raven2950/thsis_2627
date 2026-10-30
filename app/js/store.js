// In-memory index of the vault. The .md files stay the source of truth: every edit re-reads the
// file from disk, changes it and writes it back, so edits made in Obsidian meanwhile are not lost.
import { parseNote, serializeNote, linkTarget, asList } from './note.js';
import { KIND, FOLDER, DEFAULT_VOCAB, today, safeFileName } from './model.js';
import { parseLinks, addLinkToBody, removeLinkFromBody } from './links.js';

const VOCAB_PATH = '_系统/词表.md';
const INBOX_PATH = '_系统/收件箱.json';
export const MAP_PATH = '关键词地图.canvas';  // JSON Canvas, opens in Obsidian too
const ORG_PATH = '_系统/地图整理.json';
const TR_PATH = '_系统/译文.json';            // Chinese → English for my own writing (translate.js)       // map groups, AI arrows, pinned / hidden keywords
const TEMPLATES = '_模板/';          // Obsidian templates carry kind: 材料 but are not materials

let vault = null;
const notes = new Map();           // path -> { path, name, data, body, mtime }
let inbox = [];                    // AI candidates waiting for keep / cancel
let files = [];                    // every file path in the vault (images, PDFs…)
let translations = {};             // source text -> English
const listeners = new Set();

const baseName = path => path.split('/').at(-1).replace(/\.md$/, '');
const emit = () => listeners.forEach(fn => fn());

// In English the page shows my writing translated, and edit boxes start with the English text.
// Saving a value I left as it was must not put the English over the Chinese: a new value that is
// just the old value's translation is put back to the old value.
const trOf = s => translations[s] ?? translations[String(s).trim()];
const sameAsTranslation = (old, now) => typeof old === 'string' && typeof now === 'string' && CJK.test(old)
  && trOf(old) != null && String(trOf(old)).trim() === now.trim();
function keepOriginals(old, now) {
  if (sameAsTranslation(old, now)) return old;
  if (!old || !now || typeof old !== 'object' || typeof now !== 'object') return now;
  if (Array.isArray(now)) {
    if (!Array.isArray(old)) return now;
    const byId = new Map(old.filter(o => o && o.id != null).map(o => [o.id, o]));
    return now.map((v, i) => keepOriginals(v && v.id != null ? byId.get(v.id) : old[i], v));
  }
  for (const k of Object.keys(now)) now[k] = keepOriginals(old[k], now[k]);
  return now;
}
const CJK = /[㐀-鿿]/;

function index(path, text, mtime) {
  const { data, body } = parseNote(text);
  notes.set(path, { path, name: baseName(path), data, body, mtime });
}

export class ConflictError extends Error {}

export const store = {
  get vault() { return vault; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  async open(v) { vault = v; await this.reload(); },

  async reload() {
    if (!vault) return;
    notes.clear();
    for (const f of await vault.readAll()) if (!f.path.startsWith(TEMPLATES)) index(f.path, f.text, f.mtime);
    try { inbox = JSON.parse((await vault.read(INBOX_PATH))?.text || '{}').entries || []; } catch (e) { inbox = []; }
    files = vault.listFiles ? await vault.listFiles().catch(() => []) : [];
    try { translations = JSON.parse((await vault.read(TR_PATH))?.text || '{}').t || {}; } catch (e) { translations = {}; }
    emit();
  },

  all() { return [...notes.values()]; },
  byKind(kind) { return this.all().filter(n => n.data.kind === kind); },
  items() { return this.byKind(KIND.item); },
  get(path) { return notes.get(path); },

  // Obsidian-style resolution: a link names a file by its base name (or by a path).
  resolve(link) {
    const target = linkTarget(link);
    if (!target) return null;
    if (notes.has(`${target}.md`)) return notes.get(`${target}.md`);
    return this.all().find(n => n.name === target || n.path === target || asList(n.data.aliases).includes(target)) || null;
  },

  // Items whose `parent` points at this note.
  children(note) { return this.items().filter(n => this.resolve(n.data.parent) === note); },

  // `expectBody`: the body as it was when an edit started. If the file's body changed on disk since
  // (e.g. edited in Obsidian), refuse instead of overwriting it.
  async update(path, mutate, { expectBody } = {}) {
    const { text } = await vault.read(path);
    const { data, body } = parseNote(text);
    if (data._yamlError) throw new Error(`YAML 无法解析：${data._yamlError}`);
    if (expectBody != null && body !== expectBody) throw new ConflictError('这篇笔记在别处被改过了');
    const before = structuredClone(data);
    const res = mutate(data, body) || {};
    let newBody = res.body ?? body;
    if (newBody !== body && sameAsTranslation(body, newBody)) newBody = body;
    const out = serializeNote(keepOriginals(before, res.data || data), newBody);
    await vault.write(path, out);
    index(path, out, Date.now());
    emit();
  },

  uniquePath(folder, title) {
    const base = safeFileName(title) || '未命名';
    let path = `${folder}/${base}.md`;
    for (let i = 2; notes.has(path) || this.all().some(n => n.name === baseName(path)); i++) path = `${folder}/${base} ${i}.md`;
    return path;
  },

  async create(path, data, body = '') {
    if (notes.has(path)) throw new Error(`已经存在：${path}`);
    const out = serializeNote(data, body);
    await vault.write(path, out);
    index(path, out, Date.now());
    emit();
    return notes.get(path);
  },

  // A [[link]] typed in the web UI that points nowhere yet becomes a new concept / question note.
  async ensureNote(kind, name) {
    const hit = this.resolve(name);
    if (hit) return hit;
    const data = kind === KIND.concept
      ? { kind, definition: null, status: '萌芽', broader: [], related: [], opposes: [], aliases: [], created: today() }
      : { kind, question: name, status: '开放', created: today() };
    return this.create(this.uniquePath(FOLDER[kind], name), data, kind === KIND.concept ? '\n## 演变\n\n' : '\n## 我目前的想法\n\n');
  },

  /* ---------- option lists ---------- */
  vocabNote() { return notes.get(VOCAB_PATH) || this.byKind(KIND.vocab)[0] || null; },
  vocab(field) {
    const v = this.vocabNote()?.data[field];
    return Array.isArray(v) ? v.map(String) : DEFAULT_VOCAB[field] || [];
  },
  async editVocab(field, fn) {
    let note = this.vocabNote();
    if (!note) note = await this.create(VOCAB_PATH, { kind: KIND.vocab, ...DEFAULT_VOCAB },
      '\n网页里下拉菜单的选项。可以直接在这里增删改；在网页「选项」页里改名会同时改掉所有笔记里的旧值。\n');
    await this.update(note.path, data => { data[field] = fn(asList(data[field]).map(String)); });
  },
  addVocab(field, value) { return this.editVocab(field, list => list.includes(value) ? list : [...list, value]); },
  removeVocab(field, value) { return this.editVocab(field, list => list.filter(v => v !== value)); },
  moveVocab(field, value, dir) {
    return this.editVocab(field, list => {
      const i = list.indexOf(value), j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return list;
      [list[i], list[j]] = [list[j], list[i]];
      return list;
    });
  },
  // Rename everywhere: the option list and every note that uses the old value.
  async renameVocab(field, from, to) {
    await this.editVocab(field, list => [...new Set(list.map(v => v === from ? to : v))]);
    if (field === 'link_type') {
      const users = this.all().filter(n => parseLinks(n.body).some(l => l.type === from));
      for (const n of users) await this.update(n.path, (data, body) => ({
        body: parseLinks(body).filter(l => l.type === from).reduce((b, l) => addLinkToBody(removeLinkFromBody(b, l), { ...l, type: to }), body),
      }));
      return users.length;
    }
    const key = field === 'concept_status' ? 'status' : field;
    const kind = field === 'concept_status' ? KIND.concept : KIND.item;
    const users = this.byKind(kind).filter(n => n.data[key] === from || asList(n.data[key]).includes(from));
    for (const n of users) await this.update(n.path, data => {
      data[key] = Array.isArray(data[key]) ? [...new Set(data[key].map(v => v === from ? to : v))] : to;
    });
    return users.length;
  },
  usage(field, value) {
    if (field === 'link_type') return this.allLinks().filter(l => l.type === value).length;
    const key = field === 'concept_status' ? 'status' : field;
    const kind = field === 'concept_status' ? KIND.concept : KIND.item;
    return this.byKind(kind).filter(n => n.data[key] === value || asList(n.data[key]).includes(value)).length;
  },

  /* ---------- typed links (## 关联) ---------- */
  linksOf(note) { return parseLinks(note.body).map(l => ({ ...l, from: note, to: this.resolve(l.target) })); },
  allLinks() { return this.all().flatMap(n => this.linksOf(n)); },
  addLink(path, link) { return this.update(path, (data, body) => ({ body: addLinkToBody(body, link) })); },
  removeLink(path, link) { return this.update(path, (data, body) => ({ body: removeLinkFromBody(body, link) })); },

  /* ---------- inbox (_系统/收件箱.json) ---------- */
  inbox() { return inbox; },
  async saveInbox() {
    await vault.write(INBOX_PATH, JSON.stringify({ about: '网页「收件箱」里等待确认的 AI 产出。keep 之后会写进笔记。', entries: inbox }, null, 2));
    emit();
  },
  async addInbox(entries) {
    const stamp = new Date().toISOString();
    inbox = [...entries.map(e => ({ id: crypto.randomUUID().slice(0, 8), createdAt: stamp, ...e })), ...inbox];
    await this.saveInbox();
  },
  async removeInbox(ids) {
    const drop = new Set([].concat(ids));
    inbox = inbox.filter(e => !drop.has(e.id));
    await this.saveInbox();
  },

  /* ---------- keyword map (JSON Canvas) ---------- */
  async readMap() {
    try {
      const text = (await vault.read(MAP_PATH))?.text;
      if (text) { const c = JSON.parse(text); return { nodes: c.nodes || [], edges: c.edges || [] }; }
    } catch (e) { /* missing or unreadable: start empty */ }
    return { nodes: [], edges: [] };
  },
  async writeMap(canvas) { await vault.write(MAP_PATH, JSON.stringify(keepOriginals(await this.readMap(), canvas), null, '\t')); },
  async readMapOrg() {
    try { const t = (await vault.read(ORG_PATH))?.text; if (t) return JSON.parse(t); } catch (e) { /* none yet */ }
    return null;
  },
  async writeMapOrg(org) { await vault.write(ORG_PATH, JSON.stringify(keepOriginals(await this.readMapOrg(), org), null, 2)); },
  // Materials tagged with this concept.
  itemsOf(concept) { return this.items().filter(n => asList(n.data.concepts).some(v => this.resolve(v) === concept)); },

  /* ---------- attachments (PDFs, images… kept in 附件/) ---------- */
  readFile(path) { return vault.readFile(path); },
  // Obsidian finds an embedded file by its path, or by its name anywhere in the vault.
  resolveFile(ref) {
    const t = linkTarget(ref) || String(ref || '');
    if (!t) return null;
    if (files.includes(t)) return t;
    const name = t.split('/').pop();
    return files.find(p => p.split('/').pop() === name) || null;
  },
  async exists(path) { try { await vault.readFile(path); return true; } catch (e) { return false; } },
  async attachmentPath(fileName) {
    const dot = fileName.lastIndexOf('.');
    const ext = dot > 0 ? fileName.slice(dot).toLowerCase() : '';
    const base = safeFileName(dot > 0 ? fileName.slice(0, dot) : fileName) || '附件';
    let path = `附件/${base}${ext}`;
    for (let i = 2; await this.exists(path); i++) path = `附件/${base} ${i}${ext}`;
    return path;
  },
  async writeFile(path, blob) { await vault.write(path, blob); if (!files.includes(path)) files.push(path); },

  /* ---------- English versions of my writing ---------- */
  translation(text) { return translations[text] ?? translations[String(text).trim()] ?? null; },
  translations() { return translations; },
  async saveTranslations(t) {
    translations = t;
    await vault.write(TR_PATH, JSON.stringify({ about: '网页英文模式用的译文：中文原文 → 英文。在网页里点「更新英文版」生成。', t }, null, 1));
    emit();
  },

  /* ---------- small JSON files under _系统/ ---------- */
  async readJson(path, fallback) {
    try { const t = (await vault.read(path))?.text; if (t) return JSON.parse(t); } catch (e) { /* missing */ }
    return fallback;
  },
  async writeJson(path, value) { await vault.write(path, JSON.stringify(value, null, 1)); if (!files.includes(path)) files.push(path); },
  // Every file under a folder (images, canvases…), not just notes.
  filesIn(prefix) { return files.filter(p => p.startsWith(prefix)); },
};
