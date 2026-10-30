// Moodboards: free canvases like Figma / Miro, for aesthetic references. Nothing moves by itself
// here: I place images, stack them, add sticky notes, arrows, frames and material cards.
//
// Files: 灵感板/<name>.canvas (JSON Canvas, so Obsidian opens the same board)
//        灵感板/图片/<name>/…  images (≤ 2000 px) and 缩略/… small copies for zoomed-out views
//        _系统/灵感板.json      per board: which keyword it hangs on, whether its images are published
import { store } from '../store.js';
import { viewOnly, trc } from '../i18n.js';
import { KIND, today } from '../model.js';
import { esc, renderMarkdown } from '../markdown.js';
import { toast, ask } from '../ui.js';
import { encodeImage } from '../media.js';

export const BOARD_DIR = '灵感板';
const META_PATH = '_系统/灵感板.json';
const PRESETS = { 1: '#e5484d', 2: '#e9973f', 3: '#e3c13b', 4: '#46a758', 5: '#3aa6b9', 6: '#8e6cf0' };
const colorOf = c => (c ? PRESETS[c] || c : null);
const FULL_MAX = 2000, THUMB_MAX = 480;
const IMG_RE = /\.(jpe?g|png|webp|gif|avif|svg)$/i;

export const boardPath = name => `${BOARD_DIR}/${name}.canvas`;
const imageDir = name => `${BOARD_DIR}/图片/${name}`;
const thumbOf = path => path.replace(/\/([^/]+)$/, '/缩略/$1');
const uid = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');

export function boardNames() {
  const re = new RegExp(`^${BOARD_DIR}/([^/]+)\\.canvas$`);
  return store.filesIn(`${BOARD_DIR}/`).map(p => p.match(re)?.[1]).filter(Boolean).sort((a, b) => a.localeCompare(b));
}
let meta = null;
async function loadMeta() { meta = await store.readJson(META_PATH, { boards: {} }); meta.boards ||= {}; return meta; }
const metaOf = name => (meta.boards[name] ||= { public: false, keyword: '' });
async function saveMeta() { if (!viewOnly()) await store.writeJson(META_PATH, meta); }
const readBoard = async name => { const c = await store.readJson(boardPath(name), null); return c && { nodes: c.nodes || [], edges: c.edges || [] }; };

// Links to the boards that hang on a keyword (concept page, map panel): <div data-boards-for="name">.
export async function fillBoardLinks(el) {
  const slots = el?.querySelectorAll('[data-boards-for]');
  if (!slots?.length) return;
  await loadMeta();
  for (const s of slots) {
    const names = boardNames().filter(n => meta.boards[n]?.keyword === s.dataset.boardsFor);
    s.innerHTML = names.length ? `<h2>灵感板</h2><p class="board-links">${names.map(n => `<a href="#/board/${encodeURIComponent(n)}">🖼 ${esc(n)}</a>`).join('')}</p>` : '';
  }
}

/* ---------- images: one URL per path, small copies when zoomed out, loaded only near the view ---------- */
const urls = new Map();          // path -> Promise<objectURL | null>
function urlOf(path) {
  if (!urls.has(path)) urls.set(path, store.readFile(path).then(b => URL.createObjectURL(b)).catch(() => null));
  return urls.get(path);
}
async function bestUrl(path, small) {
  if (small && !/\.(gif|svg)$/i.test(path)) { const t = await urlOf(thumbOf(path)); if (t) return t; }
  return urlOf(path);
}

/* ---------- list of boards ---------- */
export async function renderBoards(main) {
  await loadMeta();
  const ro = viewOnly();
  const names = boardNames();
  const boards = await Promise.all(names.map(async n => ({ name: n, c: await readBoard(n) })));
  main.innerHTML = `<section class="boards-view">
    <div class="list-head"><h1>灵感板 <span class="count">${names.length}</span></h1>
      ${ro ? '' : '<button class="primary" id="newBoard">＋ 新灵感板</button>'}</div>
    <p class="hint">像 Figma / Miro 的自由画布：放图片做美学参考，叠放、加便利贴、画箭头、用框分区。也能在 Obsidian 里打开同一块板。</p>
    <div class="board-grid">${boards.map(({ name, c }) => {
      const imgs = (c?.nodes || []).filter(n => n.type === 'file' && IMG_RE.test(n.file));
      const m = metaOf(name);
      return `<a class="board-card" href="#/board/${encodeURIComponent(name)}">
        <span class="board-thumbs">${imgs.slice(0, 4).map(n => `<img data-board-img="${esc(n.file)}" alt="">`).join('') || '<span class="muted">空的</span>'}</span>
        <b>${esc(trc(name))}</b>
        <span class="muted">${imgs.length} 张图 · ${(c?.nodes || []).filter(n => n.type === 'text').length} 张便利贴${m.keyword ? ` · ${esc(trc(m.keyword))}` : ''}${m.public ? '' : ' · 图片不公开'}</span></a>`;
    }).join('') || '<p class="empty">还没有灵感板。</p>'}</div></section>`;
  for (const img of main.querySelectorAll('[data-board-img]')) bestUrl(img.dataset.boardImg, true).then(u => { if (u) img.src = u; else img.remove(); });
  main.querySelector('#newBoard')?.addEventListener('click', async () => {
    const res = await ask({ title: '新灵感板', submit: '建好', fields: [
      { name: 'name', label: '名字', required: true, placeholder: '比如：赛博朋克色调' },
      { name: 'keyword', label: '挂到哪个关键词（可选）', options: store.byKind(KIND.concept).map(n => n.name) }] });
    const name = res?.name.replace(/[\\/:*?"<>|#^[\]]/g, ' ').trim();
    if (!name) return;
    if (boardNames().includes(name)) return toast('已经有同名的灵感板', true);
    await store.writeJson(boardPath(name), { nodes: [], edges: [] });
    metaOf(name).keyword = res.keyword || '';
    await saveMeta();
    location.hash = `#/board/${encodeURIComponent(name)}`;
  });
}

/* ---------- one board ---------- */
let B = null;                    // { name, canvas, savedText, view, selected, editingId, undo, redo }
let root = null, saveTimer = null, io = null, lodTimer = null;
const els = new Map();           // node id -> element
const sigs = new Map();          // node id -> what it was drawn from

const nodeById = id => B.canvas.nodes.find(n => n.id === id);
const isImage = n => n.type === 'file' && IMG_RE.test(n.file);
const noteOf = n => (n.type === 'file' && /\.md$/.test(n.file) ? store.get(n.file) : null);
const rectOf = n => ({ x: n.x, y: n.y, w: n.width || 200, h: n.height || 120 });
const inside = (a, b) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
// Frames sit underneath; everything else keeps its order (later = on top).
const drawOrder = () => [...B.canvas.nodes.filter(n => n.type === 'group'), ...B.canvas.nodes.filter(n => n.type !== 'group')];

function snapshot() { B.undo.push(JSON.stringify(B.canvas)); if (B.undo.length > 100) B.undo.shift(); B.redo.length = 0; }
function history(from, to) {
  if (!from.length || viewOnly()) return;
  to.push(JSON.stringify(B.canvas));
  B.canvas = JSON.parse(from.pop());
  B.selected.clear(); B.editingId = null;
  scheduleSave(); draw();
}
function scheduleSave() {
  if (viewOnly()) return;
  clearTimeout(saveTimer);
  const name = B.name, canvas = B.canvas;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    const text = JSON.stringify(canvas);
    try { await store.writeJson(boardPath(name), canvas); if (B?.name === name) B.savedText = text; }
    catch (e) { toast(e.message, true); }
  }, 500);
}

/* ---------- view ---------- */
const vp = () => root?.querySelector('#bdVp');
function toWorld(cx, cy) { const r = vp().getBoundingClientRect(); return [(cx - r.left - B.view.x) / B.view.k, (cy - r.top - B.view.y) / B.view.k]; }
function viewCenter() { const r = vp().getBoundingClientRect(); return toWorld(r.left + r.width / 2, r.top + r.height / 2); }
function applyView() {
  const st = root?.querySelector('#bdStage');
  if (st) st.style.transform = `translate(${B.view.x}px,${B.view.y}px) scale(${B.view.k})`;
  const z = root?.querySelector('#bdZoom'); if (z) z.textContent = `${Math.round(B.view.k * 100)}%`;
  clearTimeout(lodTimer); lodTimer = setTimeout(refreshImages, 150);
}
function fit() {
  const ns = B.canvas.nodes;
  const r = vp()?.getBoundingClientRect();
  if (!r) return;
  if (!ns.length) { B.view = { x: r.width / 2, y: r.height / 2, k: 1 }; return applyView(); }
  const x0 = Math.min(...ns.map(n => n.x)), y0 = Math.min(...ns.map(n => n.y));
  const x1 = Math.max(...ns.map(n => n.x + (n.width || 200))), y1 = Math.max(...ns.map(n => n.y + (n.height || 120)));
  const k = Math.min(1.5, Math.max(0.05, Math.min((r.width - 80) / (x1 - x0), (r.height - 80) / (y1 - y0))));
  B.view = { k, x: r.width / 2 - (x0 + x1) / 2 * k, y: r.height / 2 - (y0 + y1) / 2 * k };
  applyView();
}

/* ---------- drawing (keyed: only changed nodes are rebuilt, so images don't reload) ---------- */
function nodeInner(n) {
  const ro = viewOnly();
  const tools = ro ? '' : '<span class="handle" title="拖到另一个东西上，画一条箭头"></span><span class="resize" title="拖动改变大小"></span>';
  if (n.type === 'group') return `<div class="frame-label">${esc(trc(n.label || '框'))}</div>${ro ? '' : '<span class="resize" title="拖动改变大小"></span>'}`;
  if (isImage(n)) return `<img alt="" draggable="false"><span class="img-missing">${store.vault.readOnly ? '图片未公开' : '找不到图片'}</span>${tools}`;
  const note = noteOf(n);
  if (n.type === 'file') {
    if (!note) return `<div class="card-missing">${esc(n.file.split('/').pop())}</div>${tools}`;
    const d = note.data;
    const title = d.kind === KIND.idea ? d.idea : d.title || note.name;
    return `<div class="mat-head"><span class="mat-type">${esc(d.kind === KIND.item ? d.type || d.kind : d.kind)}</span><span class="mat-marks">${d.star ? '⭐' : ''}${d.like ? '♥' : ''}</span></div>
      <div class="mat-title">${esc(trc(title || note.name))}</div>${d.why ? `<div class="mat-why">${esc(trc(String(d.why)).slice(0, 140))}</div>` : ''}${tools}`;
  }
  if (B.editingId === n.id) return `<textarea class="sticky-edit">${esc(n.text || '')}</textarea>${tools}`;
  return `<div class="sticky-text markdown">${n.text ? renderMarkdown(trc(n.text)) : '<p class="muted">双击写点什么</p>'}</div>${tools}`;
}
function kindClass(n) {
  if (n.type === 'group') return 'frame';
  if (isImage(n)) return 'img';
  if (n.type === 'file') return 'card';
  return n.color ? 'sticky' : 'sticky plain';
}
function draw() {
  const box = root?.querySelector('#bdNodes');
  if (!box) return;
  const order = drawOrder(), alive = new Set(order.map(n => n.id));
  for (const [id, el] of els) if (!alive.has(id)) { io?.unobserve(el); el.remove(); els.delete(id); sigs.delete(id); }
  order.forEach((n, i) => {
    const c = colorOf(n.color);
    const note = noteOf(n);
    const sig = JSON.stringify([n.type, n.file, n.text, n.label, n.color, B.editingId === n.id, note?.mtime, viewOnly()]);
    let el = els.get(n.id);
    if (!el || sigs.get(n.id) !== sig) {
      const fresh = document.createElement('div');
      fresh.dataset.id = n.id;
      fresh.innerHTML = nodeInner(n);
      if (el) { io?.unobserve(el); el.replaceWith(fresh); } else box.append(fresh);
      el = fresh; els.set(n.id, el); sigs.set(n.id, sig);
      if (isImage(n)) { el.dataset.file = n.file; io?.observe(el); }
      if (B.editingId === n.id) setTimeout(() => { const ta = el.querySelector('.sticky-edit'); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } }, 0);
    }
    el.className = `bnode ${kindClass(n)}${B.selected.has(n.id) ? ' sel' : ''}`;
    el.style.cssText = `left:${n.x}px;top:${n.y}px;width:${n.width || 200}px;height:${n.height || 120}px;z-index:${i};${c ? `--c:${c};` : ''}`;
  });
  // Keep the DOM order the same as the stacking order (for screen readers and tab order).
  if (order.some((n, i) => box.children[i] !== els.get(n.id))) order.forEach(n => box.append(els.get(n.id)));
  drawEdges();
  panel();
}
function placeOne(n) {
  const el = els.get(n.id);
  if (el) { el.style.left = `${n.x}px`; el.style.top = `${n.y}px`; el.style.width = `${n.width}px`; el.style.height = `${n.height}px`; }
}

function clip(r, tx, ty) {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2, dx = tx - cx, dy = ty - cy;
  if (!dx && !dy) return [cx, cy];
  const s = Math.min(Math.abs((r.w / 2 + 4) / (dx || 1e-9)), Math.abs((r.h / 2 + 4) / (dy || 1e-9)));
  return [cx + dx * s, cy + dy * s];
}
function drawEdges() {
  const svg = root?.querySelector('#bdEdges');
  if (!svg) return;
  svg.innerHTML = B.canvas.edges.map(e => {
    const a = nodeById(e.fromNode), b = nodeById(e.toNode);
    if (!a || !b) return '';
    const ra = rectOf(a), rb = rectOf(b);
    const [x1, y1] = clip(ra, rb.x + rb.w / 2, rb.y + rb.h / 2), [x2, y2] = clip(rb, ra.x + ra.w / 2, ra.y + ra.h / 2);
    const c = colorOf(e.color) || 'var(--ink)', ang = Math.atan2(y2 - y1, x2 - x1), L = 12;
    const head = (x, y, t) => `<path class="head" d="M${x},${y} L${x - L * Math.cos(t - 0.45)},${y - L * Math.sin(t - 0.45)} L${x - L * Math.cos(t + 0.45)},${y - L * Math.sin(t + 0.45)}Z" fill="${c}"/>`;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    return `<g class="edge${B.selected.has(e.id) ? ' sel' : ''}" data-edge="${e.id}">
      <path class="hit" d="M${x1},${y1} L${x2},${y2}"/><path class="line" d="M${x1},${y1} L${x2},${y2}" style="stroke:${c}"/>
      ${e.toEnd === 'none' ? '' : head(x2, y2, ang)}${e.fromEnd === 'arrow' ? head(x1, y1, ang + Math.PI) : ''}
      ${e.label ? `<text class="elabel" x="${mx}" y="${my}">${esc(trc(e.label))}</text>` : ''}</g>`;
  }).join('');
}

// Load images only near the view; swap to the small copy when they're drawn small.
function setSrc(el) {
  const n = nodeById(el.dataset.id), img = el.querySelector('img');
  if (!n || !img) return;
  const small = (n.width || 200) * B.view.k <= THUMB_MAX * 0.9;
  const want = `${n.file}|${small}`;
  if (img.dataset.want === want) return;
  img.dataset.want = want;
  bestUrl(n.file, small).then(u => {
    if (img.dataset.want !== want) return;
    if (u) { img.src = u; el.classList.remove('missing'); } else el.classList.add('missing');
  });
}
function refreshImages() {
  for (const el of els.values()) if (el.dataset.file && el.dataset.near) setSrc(el);
}

/* ---------- adding things ---------- */
async function addImages(files, at) {
  const list = [...files].filter(f => f.type.startsWith('image/') || IMG_RE.test(f.name));
  if (!list.length) return toast('只能放图片', true);
  if (viewOnly()) return;
  snapshot();
  let [x, y] = at || viewCenter(), rowH = 0, col = 0;
  const added = [];
  toast(`正在放入 ${list.length} 张图…`);
  for (const f of list) {
    try {
      let full, thumb, w, h, ext;
      if (/gif$/i.test(f.type) || /\.gif$/i.test(f.name)) {
        // Keep GIFs moving: store as they are, with a still small copy.
        const t = await encodeImage(f, THUMB_MAX);
        full = f; thumb = t.blob; w = t.width; h = t.height; ext = 'gif';
      } else {
        const big = await encodeImage(f, FULL_MAX), small = await encodeImage(f, THUMB_MAX);
        full = big.blob; thumb = small.blob; w = big.width; h = big.height; ext = big.ext;
      }
      const path = `${imageDir(B.name)}/${today()}-${uid().slice(0, 6)}.${ext}`;
      await store.writeFile(path, full);
      await store.writeFile(thumbOf(path), thumb);
      const width = Math.round(Math.min(320, w)), height = Math.round(width * h / w);
      const n = { id: uid(), type: 'file', file: path, x: Math.round(x), y: Math.round(y), width, height };
      B.canvas.nodes.push(n); added.push(n.id);
      x += width + 20; rowH = Math.max(rowH, height);
      if (++col % 4 === 0) { x -= 4 * 340; y += rowH + 20; rowH = 0; }
    } catch (e) { toast(`${f.name}：读不了这张图（HEIC 请先转成 JPG）`, true); }
  }
  B.selected = new Set(added);
  scheduleSave(); draw();
  if (added.length) toast(`放入了 ${added.length} 张图`);
}
function addNode(n, select = true) {
  snapshot();
  B.canvas.nodes.push(n);
  if (select) B.selected = new Set([n.id]);
  scheduleSave(); draw();
  return n;
}
function newSticky(x, y, text = '') {
  const n = addNode({ id: uid(), type: 'text', text, x: Math.round(x), y: Math.round(y), width: 220, height: 160, color: '3' });
  if (!text) { B.editingId = n.id; draw(); }
}
function newFrame() {
  const sel = B.canvas.nodes.filter(n => B.selected.has(n.id) && n.type !== 'group');
  let r;
  if (sel.length) {
    const x0 = Math.min(...sel.map(n => n.x)), y0 = Math.min(...sel.map(n => n.y));
    const x1 = Math.max(...sel.map(n => n.x + (n.width || 200))), y1 = Math.max(...sel.map(n => n.y + (n.height || 120)));
    r = { x: x0 - 40, y: y0 - 60, width: x1 - x0 + 80, height: y1 - y0 + 100 };
  } else { const [cx, cy] = viewCenter(); r = { x: cx - 300, y: cy - 200, width: 600, height: 400 }; }
  addNode({ id: uid(), type: 'group', label: '新的框', ...Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Math.round(v)])) });
  setTimeout(() => root?.querySelector('#frLabel')?.select(), 0);
}
async function addCard() {
  const notes = [...store.items(), ...store.byKind(KIND.idea), ...store.byKind(KIND.concept)];
  const res = await ask({ title: '放一张材料卡', submit: '放上去', fields: [{ name: 'n', label: '材料、想法或关键词', options: notes.map(n => n.name).sort((a, b) => a.localeCompare(b)) }] });
  if (!res?.n) return;
  const note = store.resolve(res.n) || notes.find(n => (n.data.title || '').toLowerCase() === res.n.toLowerCase());
  if (!note) return toast('库里找不到这篇笔记', true);
  const [x, y] = viewCenter();
  addNode({ id: uid(), type: 'file', file: note.path, x: Math.round(x - 130), y: Math.round(y - 60), width: 260, height: 120 });
}
function removeSelected() {
  if (!B.selected.size || viewOnly()) return;
  snapshot();
  B.canvas.nodes = B.canvas.nodes.filter(n => !B.selected.has(n.id));
  const alive = new Set(B.canvas.nodes.map(n => n.id));
  B.canvas.edges = B.canvas.edges.filter(e => !B.selected.has(e.id) && alive.has(e.fromNode) && alive.has(e.toNode));
  B.selected.clear();
  scheduleSave(); draw();
}
function duplicateSelected() {
  const ns = B.canvas.nodes.filter(n => B.selected.has(n.id));
  if (!ns.length || viewOnly()) return;
  snapshot();
  const map = new Map();
  for (const n of ns) { const c = { ...n, id: uid(), x: n.x + 30, y: n.y + 30 }; map.set(n.id, c.id); B.canvas.nodes.push(c); }
  for (const e of B.canvas.edges.filter(e => map.has(e.fromNode) && map.has(e.toNode))) B.canvas.edges.push({ ...e, id: uid(), fromNode: map.get(e.fromNode), toNode: map.get(e.toNode) });
  B.selected = new Set(map.values());
  scheduleSave(); draw();
}
function restack(toFront) {
  const ns = B.canvas.nodes.filter(n => B.selected.has(n.id));
  if (!ns.length || viewOnly()) return;
  snapshot();
  const rest = B.canvas.nodes.filter(n => !B.selected.has(n.id));
  B.canvas.nodes = toFront ? [...rest, ...ns] : [...ns, ...rest];
  scheduleSave(); draw();
}
function finishEditing() {
  if (!B?.editingId) return;
  const n = nodeById(B.editingId), ta = root?.querySelector('.sticky-edit');
  B.editingId = null;
  if (n && ta && ta.value !== (n.text || '')) { snapshot(); n.text = ta.value; scheduleSave(); }
  draw();
}

/* ---------- side panel ---------- */
const swatches = (cur, none) => `<span class="swatches">${none ? `<button class="sw none${!cur ? ' on' : ''}" data-color="" title="${esc(none)}">∅</button>` : ''}${Object.entries(PRESETS).map(([k, v]) => `<button class="sw${cur === k ? ' on' : ''}" data-color="${k}" style="--c:${v}" title="颜色"></button>`).join('')}</span>`;
function panel() {
  const el = root?.querySelector('#bdPanel');
  if (!el) return;
  const ro = viewOnly();
  const nodes = B.canvas.nodes.filter(n => B.selected.has(n.id)), edges = B.canvas.edges.filter(e => B.selected.has(e.id));
  const m = metaOf(B.name);
  let html;
  if (!nodes.length && !edges.length) {
    const imgs = B.canvas.nodes.filter(isImage).length;
    html = `<h2>${esc(trc(B.name))}</h2>
      <p class="hint">${imgs} 张图 · ${B.canvas.nodes.filter(n => n.type === 'text').length} 张便利贴 · ${B.canvas.edges.length} 条箭头</p>
      <label class="row-label">挂到关键词 <select id="bdKeyword"${ro ? ' disabled' : ''}><option value="">（不挂）</option>${store.byKind(KIND.concept).map(c => `<option${c.name === m.keyword ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
      ${ro ? '' : `<label class="check"><input type="checkbox" id="bdPublic"${m.public ? ' checked' : ''}> 发布时公开这块板的图片</label>
        <p class="hint">不勾的话，网站上只显示便利贴、箭头和框，图片会显示成“图片未公开”。别人的作品截图建议不要公开。</p>`}
      <h2>怎么用</h2><ul class="hint">
        <li>把图片拖进来，或者 ⌘V 粘贴；一次可以放很多张</li>
        <li>双击空白处：新建便利贴；双击便利贴：编辑</li>
        <li>拖动空白处：平移；⌘ + 滚轮或双指捏合：缩放</li>
        <li>shift + 拖动空白处：框选；shift + 点击：多选</li>
        <li>拖动右边的圆点到另一个东西上：画箭头</li>
        <li>] 放到最上面，[ 放到最下面；⌘D 复制；⌘Z 撤销</li></ul>`;
  } else if (edges.length === 1 && !nodes.length) {
    const e = edges[0];
    html = `<p class="kind">箭头</p>
      <input id="edLabel" placeholder="箭头上的字（可选）" value="${esc(e.label || '')}"${ro ? ' disabled' : ''}>
      ${ro ? '' : `${swatches(e.color, '默认颜色')}
        <div class="actions left"><button class="mini" id="edEnds">${e.toEnd === 'none' ? '加上箭头' : e.fromEnd === 'arrow' ? '只要一头' : '两头都有箭头'}</button>
        <button class="mini" id="edPlain">${e.toEnd === 'none' ? '' : '改成直线'}</button><button class="mini" id="edFlip">反向</button><button class="mini" id="bdDelete">删除</button></div>`}`;
  } else if (nodes.length === 1) {
    const n = nodes[0], note = noteOf(n);
    if (n.type === 'group') html = `<p class="kind">框</p><input id="frLabel" value="${esc(n.label || '')}"${ro ? ' disabled' : ''}>
      ${ro ? '' : `${swatches(n.color, '默认颜色')}<p class="hint">拖动框时，完全在框里的东西会跟着一起走。</p><div class="actions left"><button class="mini" id="bdDelete">删除框</button></div>`}`;
    else if (isImage(n)) html = `<p class="kind">图片</p><p class="hint">${esc(n.file.split('/').pop())}</p>
      <div class="actions left"><button class="mini" id="imgOpen">看原图</button>${ro ? '' : `<button class="mini" id="bdFront">放到最上面</button><button class="mini" id="bdBack">放到最下面</button><button class="mini" id="bdDelete">删除</button>`}</div>
      ${ro ? '' : '<p class="hint">拖右下角改大小，会保持比例（按住 shift 可以自由拉伸）。</p>'}`;
    else if (note) html = `<p class="kind">${esc(note.data.kind)}</p><h2>${esc(trc(note.data.title || note.data.idea || note.name))}</h2>
      <div class="actions left"><a href="${note.data.kind === KIND.item ? `#/item/${encodeURIComponent(note.path)}` : `#/open/${encodeURIComponent(note.name)}`}">打开</a>${ro ? '' : '<button class="mini" id="bdDelete">从板上拿走</button>'}</div>`;
    else html = `<p class="kind">便利贴</p>${ro ? '' : `${swatches(n.color, '无底色（纯文字）')}<div class="actions left"><button class="mini" id="stEdit">编辑文字</button><button class="mini" id="bdFront">放到最上面</button><button class="mini" id="bdDelete">删除</button></div>`}`;
  } else {
    html = `<p class="kind">选中了 ${nodes.length + edges.length} 个</p>${ro ? '' : `<div class="actions left">
      <button class="mini" id="bdFrame">用框圈起来</button><button class="mini" id="bdFront">放到最上面</button><button class="mini" id="bdBack">放到最下面</button><button class="mini" id="bdDelete">删除</button></div>`}`;
  }
  el.innerHTML = html;
  const on = (id, fn) => el.querySelector(id)?.addEventListener('click', fn);
  on('#bdDelete', removeSelected); on('#bdFront', () => restack(true)); on('#bdBack', () => restack(false)); on('#bdFrame', newFrame);
  on('#stEdit', () => { B.editingId = nodes[0].id; draw(); });
  on('#imgOpen', () => urlOf(nodes[0].file).then(u => u ? window.open(u, '_blank') : toast('找不到原图', true)));
  for (const b of el.querySelectorAll('[data-color]')) b.addEventListener('click', () => {
    snapshot();
    for (const x of [...nodes, ...edges]) { if (b.dataset.color) x.color = b.dataset.color; else delete x.color; }
    scheduleSave(); draw();
  });
  const edge = edges[0];
  el.querySelector('#edLabel')?.addEventListener('change', e => { snapshot(); edge.label = e.target.value.trim() || undefined; scheduleSave(); draw(); });
  on('#edEnds', () => { snapshot(); if (edge.toEnd === 'none') delete edge.toEnd; else if (edge.fromEnd === 'arrow') delete edge.fromEnd; else edge.fromEnd = 'arrow'; scheduleSave(); draw(); });
  on('#edPlain', () => { snapshot(); edge.toEnd = 'none'; delete edge.fromEnd; scheduleSave(); draw(); });
  on('#edFlip', () => { snapshot(); [edge.fromNode, edge.toNode] = [edge.toNode, edge.fromNode]; scheduleSave(); draw(); });
  el.querySelector('#frLabel')?.addEventListener('change', e => { snapshot(); nodes[0].label = e.target.value.trim(); scheduleSave(); draw(); });
  el.querySelector('#bdKeyword')?.addEventListener('change', async e => { m.keyword = e.target.value; await saveMeta(); toast(m.keyword ? `挂到了「${m.keyword}」` : '不挂关键词了'); });
  el.querySelector('#bdPublic')?.addEventListener('change', async e => { m.public = e.target.checked; await saveMeta(); toast(m.public ? '下次发布时，这块板的图片会公开' : '这块板的图片不会发布'); });
}

/* ---------- pointer and keyboard ---------- */
function bindStage() {
  const v = vp();
  let g = null;
  v.addEventListener('pointerdown', ev => {
    if (ev.button !== 0 && ev.button !== 1) return;
    const t = ev.target;
    if (t.closest('.sticky-edit')) return;
    if (B.editingId && !t.closest(`[data-id="${B.editingId}"]`)) finishEditing();
    const nodeEl = t.closest('.bnode[data-id]'), edgeEl = t.closest('[data-edge]');
    const [wx, wy] = toWorld(ev.clientX, ev.clientY), ro = viewOnly();
    if (ev.button === 1 || (!nodeEl && !edgeEl && !ev.shiftKey)) {
      if (B.selected.size && ev.button === 0) { B.selected.clear(); draw(); }
      g = { kind: 'pan', sx: ev.clientX, sy: ev.clientY, x: B.view.x, y: B.view.y };
    } else if (!nodeEl && !edgeEl) {
      g = { kind: 'marquee', sx: wx, sy: wy, base: new Set(B.selected) };
    } else if (edgeEl) {
      const id = edgeEl.dataset.edge;
      if (ev.shiftKey) B.selected.has(id) ? B.selected.delete(id) : B.selected.add(id); else B.selected = new Set([id]);
      draw(); return;
    } else if (t.classList.contains('handle') && !ro) {
      g = { kind: 'connect', from: nodeEl.dataset.id };
    } else if (t.classList.contains('resize') && !ro) {
      snapshot();
      const n = nodeById(nodeEl.dataset.id);
      g = { kind: 'resize', n, sx: wx, sy: wy, w: n.width || 200, h: n.height || 120 };
    } else {
      const id = nodeEl.dataset.id;
      if (ev.shiftKey) B.selected.has(id) ? B.selected.delete(id) : B.selected.add(id);
      else if (!B.selected.has(id)) B.selected = new Set([id]);
      // Frames carry what's inside them.
      const picked = B.canvas.nodes.filter(n => B.selected.has(n.id));
      const carried = new Set(picked);
      for (const f of picked.filter(n => n.type === 'group')) for (const n of B.canvas.nodes) if (n !== f && inside(rectOf(n), rectOf(f))) carried.add(n);
      g = { kind: 'move', sx: wx, sy: wy, start: [...carried].map(n => [n, n.x, n.y]), moved: false, before: JSON.stringify(B.canvas) };
      draw();
    }
    v.setPointerCapture(ev.pointerId);
  });
  v.addEventListener('pointermove', ev => {
    if (!g) return;
    const [wx, wy] = toWorld(ev.clientX, ev.clientY);
    if (g.kind === 'pan') { B.view.x = g.x + ev.clientX - g.sx; B.view.y = g.y + ev.clientY - g.sy; applyView(); }
    else if (g.kind === 'move' && !viewOnly()) {
      const dx = wx - g.sx, dy = wy - g.sy;
      if (!g.moved && Math.hypot(dx, dy) * B.view.k < 3) return;
      g.moved = true;
      for (const [n, x, y] of g.start) { n.x = Math.round(x + dx); n.y = Math.round(y + dy); placeOne(n); }
      drawEdges();
    } else if (g.kind === 'resize') {
      let w = Math.max(40, g.w + wx - g.sx), h = Math.max(30, g.h + wy - g.sy);
      if (isImage(g.n) && !ev.shiftKey) h = w * g.h / g.w;
      g.n.width = Math.round(w); g.n.height = Math.round(h); placeOne(g.n); drawEdges();
    } else if (g.kind === 'connect') {
      const a = rectOf(nodeById(g.from)), [x0, y0] = clip(a, wx, wy);
      let tmp = root.querySelector('#bdTmp');
      if (!tmp) { root.querySelector('#bdEdges').insertAdjacentHTML('beforeend', '<path id="bdTmp" class="tmp"/>'); tmp = root.querySelector('#bdTmp'); }
      tmp.setAttribute('d', `M${x0},${y0} L${wx},${wy}`);
    } else if (g.kind === 'marquee') {
      const x = Math.min(g.sx, wx), y = Math.min(g.sy, wy), w = Math.abs(wx - g.sx), h = Math.abs(wy - g.sy);
      let m = root.querySelector('#bdMarquee');
      if (!m) { root.querySelector('#bdStage').insertAdjacentHTML('beforeend', '<div id="bdMarquee" class="marquee"></div>'); m = root.querySelector('#bdMarquee'); }
      Object.assign(m.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
      const box = { x, y, w, h };
      B.selected = new Set([...g.base, ...B.canvas.nodes.filter(n => n.type !== 'group' && inside(rectOf(n), box)).map(n => n.id)]);
      for (const [id, el] of els) el.classList.toggle('sel', B.selected.has(id));
    }
  });
  const end = ev => {
    if (!g) return;
    const x = g; g = null;
    if (x.kind === 'move' && x.moved) { B.undo.push(x.before); B.redo.length = 0; scheduleSave(); }
    if (x.kind === 'resize') { scheduleSave(); setSrc(els.get(x.n.id) || document.createElement('div')); }
    if (x.kind === 'marquee') { root.querySelector('#bdMarquee')?.remove(); draw(); }
    if (x.kind === 'connect') {
      root.querySelector('#bdTmp')?.remove();
      const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.bnode[data-id]');
      if (target && target.dataset.id !== x.from) {
        snapshot();
        const e = { id: uid(), fromNode: x.from, toNode: target.dataset.id };
        B.canvas.edges.push(e); B.selected = new Set([e.id]);
        scheduleSave(); draw();
        setTimeout(() => root?.querySelector('#edLabel')?.focus(), 0);
      }
    }
  };
  v.addEventListener('pointerup', end);
  v.addEventListener('pointercancel', end);
  v.addEventListener('dblclick', ev => {
    if (viewOnly()) return;
    const nodeEl = ev.target.closest('.bnode[data-id]');
    if (!nodeEl) { if (!ev.target.closest('[data-edge]')) { const [x, y] = toWorld(ev.clientX, ev.clientY); newSticky(x - 110, y - 80); } return; }
    const n = nodeById(nodeEl.dataset.id);
    if (n.type === 'text') { B.editingId = n.id; B.selected = new Set([n.id]); draw(); }
    else if (n.type === 'group') root.querySelector('#frLabel')?.select();
    else if (noteOf(n)) location.hash = noteOf(n).data.kind === KIND.item ? `#/item/${encodeURIComponent(n.file)}` : `#/open/${encodeURIComponent(noteOf(n).name)}`;
  });
  v.addEventListener('wheel', ev => {
    ev.preventDefault();
    if (ev.ctrlKey || ev.metaKey) {
      const r = v.getBoundingClientRect(), sx = ev.clientX - r.left, sy = ev.clientY - r.top;
      const k = Math.min(4, Math.max(0.05, B.view.k * Math.exp(-ev.deltaY * 0.01)));
      B.view.x = sx - (sx - B.view.x) * (k / B.view.k); B.view.y = sy - (sy - B.view.y) * (k / B.view.k); B.view.k = k;
    } else { B.view.x -= ev.deltaX; B.view.y -= ev.deltaY; }
    applyView();
  }, { passive: false });
  // Files dropped on the board become image cards right there.
  v.addEventListener('dragover', ev => { if (!viewOnly() && [...ev.dataTransfer.types].includes('Files')) { ev.preventDefault(); v.classList.add('dropping'); } });
  v.addEventListener('dragleave', () => v.classList.remove('dropping'));
  v.addEventListener('drop', ev => {
    v.classList.remove('dropping');
    if (viewOnly() || !ev.dataTransfer.files.length) return;
    ev.preventDefault();
    addImages(ev.dataTransfer.files, toWorld(ev.clientX, ev.clientY));
  });
}

const onBoard = () => root?.isConnected && location.hash.startsWith('#/board/');
function onKey(ev) {
  if (!onBoard()) return;
  if (ev.target.closest?.('input, textarea, select, [contenteditable], dialog')) {
    if (ev.key === 'Escape' && B.editingId) finishEditing();
    return;
  }
  const mod = ev.metaKey || ev.ctrlKey, k = ev.key.toLowerCase();
  if (mod && k === 'z') { ev.preventDefault(); ev.shiftKey ? history(B.redo, B.undo) : history(B.undo, B.redo); }
  else if (mod && k === 'd') { ev.preventDefault(); duplicateSelected(); }
  else if (mod && k === 'a') { ev.preventDefault(); B.selected = new Set(B.canvas.nodes.map(n => n.id)); draw(); }
  else if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); removeSelected(); }
  else if (ev.key === ']') restack(true);
  else if (ev.key === '[') restack(false);
  else if (ev.key === 'Escape') { B.selected.clear(); draw(); }
}
function onPaste(ev) {
  if (!onBoard() || viewOnly() || ev.target.closest?.('input, textarea, select, [contenteditable], dialog')) return;
  const files = [...ev.clipboardData.files];
  if (files.length) { ev.preventDefault(); return addImages(files); }
  const text = ev.clipboardData.getData('text/plain').trim();
  if (text) { ev.preventDefault(); const [x, y] = viewCenter(); newSticky(x - 110, y - 80, text); }
}
document.addEventListener('keydown', onKey);
document.addEventListener('paste', onPaste);

export async function renderBoard(main, name) {
  await loadMeta();
  if (!boardNames().includes(name)) {
    main.innerHTML = `<section class="detail"><a href="#/boards">← 灵感板</a><p class="empty">没有这块灵感板。</p></section>`;
    return;
  }
  const disk = await readBoard(name) || { nodes: [], edges: [] };
  const diskText = JSON.stringify(disk);
  const same = B?.name === name && root === main && main.querySelector('#bdStage');
  if (same) {
    // Back from Obsidian: take its version if it changed there and I have nothing unsaved.
    if (!saveTimer && diskText !== B.savedText && diskText !== JSON.stringify(B.canvas)) { B.canvas = disk; B.savedText = diskText; }
    return draw();
  }
  B = { name, canvas: disk, savedText: diskText, view: { x: 0, y: 0, k: 1 }, selected: new Set(), editingId: null, undo: [], redo: [] };
  root = main;
  els.clear(); sigs.clear();
  main.classList.add('wide');
  const ro = viewOnly();
  main.innerHTML = `<section class="map-view board-view" data-own-drop>
    <div class="graph-bar">
      <a href="#/boards">← 灵感板</a><b class="bd-name">${esc(trc(name))}</b>
      ${ro ? '<span class="badge">只读</span>' : `<button class="primary" id="bdImg">＋ 图片</button><button id="bdSticky">＋ 便利贴</button>
        <button id="bdNewFrame">＋ 框</button><button id="bdCard">＋ 材料卡</button><button id="bdUndo" title="⌘Z">撤销</button>`}
      <button id="bdFit">适应窗口</button><span class="muted" id="bdZoom"></span>
      <span class="hint">${ro ? '拖动平移 · ⌘ + 滚轮缩放' : '拖进或粘贴图片 · 双击空白处写便利贴'}</span>
    </div>
    <div class="graph-wrap">
      <div class="map-vp board-vp" id="bdVp"><div class="map-stage" id="bdStage">
        <div id="bdNodes"></div><svg class="map-edges board-edges" id="bdEdges" width="1" height="1"></svg>
      </div></div>
      <aside class="graph-panel" id="bdPanel"></aside>
    </div></section>`;
  io?.disconnect();
  io = new IntersectionObserver(entries => {
    for (const e of entries) { if (e.isIntersecting) { e.target.dataset.near = '1'; setSrc(e.target); } else delete e.target.dataset.near; }
  }, { root: main.querySelector('#bdVp'), rootMargin: '800px' });
  bindStage();
  const on = (id, fn) => main.querySelector(id)?.addEventListener('click', fn);
  on('#bdImg', () => {
    const input = Object.assign(document.createElement('input'), { type: 'file', multiple: true, accept: 'image/*' });
    input.onchange = () => input.files.length && addImages(input.files);
    input.click();
  });
  on('#bdSticky', () => { const [x, y] = viewCenter(); newSticky(x - 110, y - 80); });
  on('#bdNewFrame', newFrame);
  on('#bdCard', addCard);
  on('#bdUndo', () => history(B.undo, B.redo));
  on('#bdFit', fit);
  draw();
  requestAnimationFrame(fit);
}

export function leaveBoard(main) {
  if (root !== main) return;
  finishEditing();
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; store.writeJson(boardPath(B.name), B.canvas).catch(e => toast(e.message, true)); }
  io?.disconnect(); io = null;
  els.clear(); sigs.clear();
  root = null; B = null;
  main.classList.remove('wide');
}
