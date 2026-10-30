// Keyword map. The tool arranges it: a force simulation pulls keywords that share materials together,
// AI groups them (colour + soft outline) and draws the relations worth seeing. I mostly add sticky
// notes; dragging a keyword pins it where I put it.
//
// Files: 关键词地图.canvas (JSON Canvas: positions, colours, arrows, stickies; opens in Obsidian)
//        _系统/地图整理.json (groups, which arrows the AI drew, pinned / hidden keywords)
import { forceSimulation, forceLink, forceManyBody, forceX, forceY } from 'd3-force';
import { store } from '../store.js';
import { viewOnly, trc, isEn } from '../i18n.js';
import { KIND } from '../model.js';
import { asList, toLink } from '../note.js';
import { esc, renderMarkdown } from '../markdown.js';
import { toast, ask } from '../ui.js';
import { openRecommend } from './recommend.js';
import { keep, cancel } from '../inbox.js';
import { summarizeKeywords, organizeKeywords } from '../tasks.js';
import { hydrate } from '../media.js';

// Obsidian's canvas colour presets "1"–"6"; any "#hex" works too.
const PRESETS = { 1: '#e5484d', 2: '#e9973f', 3: '#e3c13b', 4: '#46a758', 5: '#3aa6b9', 6: '#8e6cf0' };
const GROUP_PALETTE = ['5', '6', '2', '4', '1', '#d9617c', '#7a8b99', '3'];
const colorOf = c => (c ? PRESETS[c] || c : null);
const STICKY_COLOR = '3';
const EMPTY_ORG = () => ({ groups: [], aiEdges: [], reasons: {}, pinned: [], hidden: [], bubbles: [], edgeStyle: {} });
// Line styles I can give an arrow (stored in 地图整理.json; JSON Canvas has no field for them).
const LINE_DASH = { solid: '', dashed: '8 6', dotted: '2 5' };

let canvas = null, savedText = '';
let org = EMPTY_ORG(), savedOrgText = '';
let view = { x: 80, y: 80, k: 1 };
let fitted = false, showShared = true;
let selected = new Set();
let selectedBubble = null;           // a theme bubble picked by its label
let editingId = null, editDraft = null;
let busy = '';                       // '' | 'summarize' | 'organize' | 'acceptAll'
const sizes = new Map();             // node id -> measured { w, h }
const undo = [], redo = [];
let saveTimer = null, root = null;
let sim = null, simKey = '';
const simById = new Map();           // id -> simulation node { x, y (centre), w, h, ... }

const uid = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');
const nodeById = id => canvas.nodes.find(n => n.id === id);
const noteOf = n => (n?.type === 'file' ? store.get(n.file) : null);
const conceptOf = n => { const x = noteOf(n); return x?.data.kind === KIND.concept ? x : null; };
const itemOf = n => { const x = noteOf(n); return x?.data.kind === KIND.item ? x : null; };
const ideaOf = n => { const x = noteOf(n); return x?.data.kind === KIND.idea ? x : null; };
const nodeOfPath = path => canvas.nodes.find(n => n.type === 'file' && n.file === path);
const groupOf = path => org.groups.find(g => g.members.includes(path));
const visibleNodes = () => canvas.nodes.filter(n => n.type !== 'group');
const ghosts = () => (viewOnly() ? [] : store.inbox().filter(e => e.kind === 'keyword'));

/* ---------- persistence ---------- */
function forDisk() {
  // Groups become Obsidian canvas groups (boxes with a label) so the grouping shows there too.
  const groups = org.groups.map((g, i) => {
    const rs = g.members.map(nodeOfPath).filter(Boolean).map(rectOf);
    if (!rs.length) return null;
    const x = Math.min(...rs.map(r => r.x)) - 30, y = Math.min(...rs.map(r => r.y)) - 50;
    return { id: `grp-${i}`, type: 'group', label: g.name, color: g.color,
      x: Math.round(x), y: Math.round(y), width: Math.round(Math.max(...rs.map(r => r.x + r.w)) + 30 - x), height: Math.round(Math.max(...rs.map(r => r.y + r.h)) + 30 - y) };
  }).filter(Boolean);
  const bubbles = (org.bubbles || []).map(b => {
    const rs = b.members.map(nodeById).filter(Boolean).map(rectOf);
    if (!rs.length) return null;
    const x = Math.min(...rs.map(r => r.x)) - 50, y = Math.min(...rs.map(r => r.y)) - 70;
    return { id: `bub-${b.id}`, type: 'group', label: b.name, color: b.color,
      x: Math.round(x), y: Math.round(y), width: Math.round(Math.max(...rs.map(r => r.x + r.w)) + 50 - x), height: Math.round(Math.max(...rs.map(r => r.y + r.h)) + 50 - y) };
  }).filter(Boolean);
  return { nodes: [...bubbles, ...groups, ...canvas.nodes.filter(n => !(n.type === 'group' && /^(grp|bub)-/.test(String(n.id))))], edges: canvas.edges };
}
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (store.vault.readOnly) return;
    try {
      const disk = forDisk();
      savedText = JSON.stringify(disk, null, '\t');
      await store.writeMap(disk);
      const o = JSON.stringify(org, null, 2);
      if (o !== savedOrgText) { savedOrgText = o; await store.writeMapOrg(org); }
    } catch (e) { toast(`地图没保存上：${e.message}`, true); }
  }, 600);
}
function snapshot() { undo.push(JSON.stringify({ canvas, org })); if (undo.length > 100) undo.shift(); redo.length = 0; }
function history(from, to) {
  if (!from.length) return;
  to.push(JSON.stringify({ canvas, org }));
  ({ canvas, org } = JSON.parse(from.pop()));
  selected.clear();
  scheduleSave(); rebuild(0.3);
}

async function syncFromDisk() {
  const [disk, o] = [await store.readMap(), await store.readMapOrg()];
  const text = JSON.stringify(disk, null, '\t');
  if (canvas && (text === savedText || editingId)) return;
  canvas = { nodes: disk.nodes.filter(n => !(n.type === 'group' && /^(grp|bub)-/.test(String(n.id)))), edges: disk.edges };
  savedText = text;
  org = { ...EMPTY_ORG(), ...(o || {}) };
  savedOrgText = JSON.stringify(org, null, 2);
}

/* ---------- geometry ---------- */
function sizeOf(id, n) { return sizes.get(id) || { w: n?.width || 160, h: n?.height || 44 }; }
function rectOf(n) { const s = sizeOf(n.id, n); return { x: n.x, y: n.y, w: s.w, h: s.h }; }
function clip(r, tx, ty) {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2, dx = tx - cx, dy = ty - cy;
  if (!dx && !dy) return [cx, cy];
  const s = Math.min(Math.abs((r.w / 2 + 6) / dx), Math.abs((r.h / 2 + 6) / dy));
  return [cx + dx * s, cy + dy * s];
}
function curve(a, b) {
  const ac = [a.x + a.w / 2, a.y + a.h / 2], bc = [b.x + b.w / 2, b.y + b.h / 2];
  const p0 = clip(a, ...bc), p1 = clip(b, ...ac);
  const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2, dx = p1[0] - p0[0], dy = p1[1] - p0[1];
  const c = [mx - dy * 0.15, my + dx * 0.15];
  return { d: `M${p0[0]},${p0[1]} Q${c[0]},${c[1]} ${p1[0]},${p1[1]}`, mid: [0.25 * p0[0] + 0.5 * c[0] + 0.25 * p1[0], 0.25 * p0[1] + 0.5 * c[1] + 0.25 * p1[1]] };
}
const toWorld = (sx, sy) => {
  const r = root.querySelector('#mapVp').getBoundingClientRect();
  return [(sx - r.left - view.x) / view.k, (sy - r.top - view.y) / view.k];
};
function applyView() { const st = root?.querySelector('#mapStage'); if (st) st.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.k})`; }
function viewCenter() {
  const vp = root.querySelector('#mapVp'), r = vp.getBoundingClientRect();
  return toWorld(r.left + vp.clientWidth / 2, r.top + vp.clientHeight / 2);
}
function fit() {
  if (!root) return;
  const vp = root.querySelector('#mapVp');
  const all = [...visibleNodes().map(rectOf), ...ghosts().map(e => simById.get(`g:${e.id}`)).filter(Boolean).map(s => ({ x: s.x - s.w / 2, y: s.y - s.h / 2, w: s.w, h: s.h }))];
  if (!all.length || !vp.clientWidth) { view = { x: vp.clientWidth / 2, y: vp.clientHeight / 2, k: 1 }; return applyView(); }
  const x1 = Math.min(...all.map(r => r.x)) - 40, y1 = Math.min(...all.map(r => r.y)) - 60;
  const x2 = Math.max(...all.map(r => r.x + r.w)) + 40, y2 = Math.max(...all.map(r => r.y + r.h)) + 40;
  const k = Math.min(1.3, (vp.clientWidth - 40) / (x2 - x1), (vp.clientHeight - 40) / (y2 - y1));
  view = { k, x: (vp.clientWidth - (x2 - x1) * k) / 2 - x1 * k, y: (vp.clientHeight - (y2 - y1) * k) / 2 - y1 * k };
  applyView();
}
const centroid = ps => ps.length ? [ps.reduce((a, p) => a + p[0], 0) / ps.length, ps.reduce((a, p) => a + p[1], 0) / ps.length] : null;
function boardCenter() {
  return centroid(visibleNodes().map(n => { const r = rectOf(n); return [r.x + r.w / 2, r.y + r.h / 2]; })) || [0, 0];
}
// Near the keywords it shares materials with; otherwise somewhere around the middle.
function birthPlace(itemSet) {
  const near = visibleNodes().filter(n => conceptOf(n) && store.itemsOf(conceptOf(n)).some(i => itemSet.has(i.path)))
    .map(n => { const r = rectOf(n); return [r.x + r.w / 2, r.y + r.h / 2]; });
  const [x, y] = centroid(near) || boardCenter();
  const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 80;
  return [x + Math.cos(a) * d, y + Math.sin(a) * d];
}

/* ---------- keep the board in step with the vault ---------- */
// Every concept is on the map unless I hid it.
function ensureKeywordNodes() {
  let added = false;
  for (const c of store.byKind(KIND.concept)) {
    if (org.hidden.includes(c.path) || nodeOfPath(c.path)) continue;
    const ghost = simById.get(`g:${ghosts().find(e => e.payload.name === c.name)?.id}`);
    const [x, y] = ghost ? [ghost.x, ghost.y] : birthPlace(new Set(store.itemsOf(c).map(i => i.path)));
    canvas.nodes.push({ id: uid(), type: 'file', file: c.path, x: Math.round(x - 80), y: Math.round(y - 22), width: 160, height: 44, ...(groupOf(c.path) ? { color: groupOf(c.path).color } : {}) });
    added = true;
  }
  if (added) scheduleSave();
  return added;
}

/* ---------- simulation ---------- */
// Rectangles push each other apart along the axis where they overlap least.
// Returns whether anything still overlaps.
function pushApart(nodes, k, pad = 16) {
  let overlapping = false;
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const a = nodes[i], b = nodes[j];
    const ox = (a.w + b.w) / 2 + pad - Math.abs(a.x - b.x), oy = (a.h + b.h) / 2 + pad - Math.abs(a.y - b.y);
    if (ox <= 0 || oy <= 0) continue;
    const am = a.fx == null ? (b.fx == null ? 0.5 : 1) : 0, bm = b.fx == null ? (a.fx == null ? 0.5 : 1) : 0;
    if (am || bm) overlapping = true;
    if (ox < oy) { const s = Math.sign(a.x - b.x) || 1; a.x += s * ox * k * am; b.x -= s * ox * k * bm; }
    else { const s = Math.sign(a.y - b.y) || 1; a.y += s * oy * k * am; b.y -= s * oy * k * bm; }
  }
  return overlapping;
}
function rectCollide() {
  let nodes;
  const force = alpha => pushApart(nodes, 0.5 * Math.min(1, alpha * 6));
  force.initialize = ns => (nodes = ns);
  return force;
}
// Members of a group drift towards the group's centre, and groups keep their distance from each other.
function groupPull(strength = 0.2) {
  let nodes;
  const force = alpha => {
    const gs = org.groups.map(g => {
      const ms = nodes.filter(n => n.path && g.members.includes(n.path));
      if (!ms.length) return null;
      const [cx, cy] = centroid(ms.map(n => [n.x, n.y]));
      const r = Math.max(...ms.map(n => Math.hypot(n.x - cx, n.y - cy) + Math.hypot(n.w, n.h) / 2)) + 40;
      return { ms, cx, cy, r };
    }).filter(Boolean);
    for (const g of gs) if (g.ms.length > 1)
      for (const n of g.ms) { n.vx += (g.cx - n.x) * strength * alpha; n.vy += (g.cy - n.y) * strength * alpha; }
    for (let i = 0; i < gs.length; i++) for (let j = i + 1; j < gs.length; j++) {
      const a = gs[i], b = gs[j], dx = b.cx - a.cx, dy = b.cy - a.cy, d = Math.hypot(dx, dy) || 1;
      const overlap = a.r + b.r - d;
      if (overlap <= 0) continue;
      const push = overlap * 0.06 * alpha, ux = dx / d, uy = dy / d;
      for (const n of a.ms) if (n.fx == null) { n.vx -= ux * push; n.vy -= uy * push; }
      for (const n of b.ms) if (n.fx == null) { n.vx += ux * push; n.vy += uy * push; }
    }
  };
  force.initialize = ns => (nodes = ns);
  return force;
}

// Clusters that must not overlap: each group, each ungrouped keyword, and every other node on its own.
// Material cards and stickies hanging off a keyword travel with that keyword's cluster.
function clustersOf(nodes) {
  const byPath = new Map(nodes.filter(n => n.path).map(n => [n.path, n]));
  const byId = new Map(nodes.map(n => [n.id, n]));
  const owner = new Map(), cs = [];
  const join = (n, i) => { owner.set(n.id, i); cs[i].push(n); };
  for (const g of org.groups) {
    const ms = g.members.map(p => byPath.get(p)).filter(Boolean);
    if (!ms.length) continue;
    cs.push([]); for (const n of ms) join(n, cs.length - 1);
  }
  for (const n of nodes) if (n.path && !owner.has(n.id)) { cs.push([]); join(n, cs.length - 1); }
  for (let pass = 0; pass < 2; pass++) for (const e of canvas.edges) for (const [a, b] of [[e.fromNode, e.toNode], [e.toNode, e.fromNode]]) {
    const n = byId.get(a);
    if (n && !owner.has(a) && owner.has(b)) join(n, owner.get(b));
  }
  for (const n of nodes) if (!owner.has(n.id)) { cs.push([]); join(n, cs.length - 1); }
  return cs;
}
// Area a cluster takes on screen: its nodes plus the outline's padding and the group label above.
function clusterBox(ms) {
  return { x1: Math.min(...ms.map(n => n.x - n.w / 2)) - 26, y1: Math.min(...ms.map(n => n.y - n.h / 2)) - 44,
    x2: Math.max(...ms.map(n => n.x + n.w / 2)) + 26, y2: Math.max(...ms.map(n => n.y + n.h / 2)) + 26 };
}
// Push overlapping clusters apart, each as one piece, along the axis where they overlap least.
// Fixed nodes stay put, so a cluster with free nodes gives way to one without. Returns whether anything still overlaps.
function separateClusters(cs, k, gap = 56) {
  let overlapping = false;
  const free = ms => ms.some(n => n.fx == null);
  const shift = (ms, dx, dy) => { for (const n of ms) if (n.fx == null) { n.x += dx; n.y += dy; } };
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
    const a = clusterBox(cs[i]), b = clusterBox(cs[j]);
    const ox = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1) + gap, oy = Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1) + gap;
    if (ox <= 0 || oy <= 0) continue;
    const fa = free(cs[i]), fb = free(cs[j]);
    if (!fa && !fb) continue;
    overlapping = true;
    const am = fa ? (fb ? 0.5 : 1) : 0, bm = fb ? (fa ? 0.5 : 1) : 0;
    if (ox < oy) {
      const s = Math.sign(a.x1 + a.x2 - b.x1 - b.x2) || 1;
      shift(cs[i], s * ox * k * am, 0); shift(cs[j], -s * ox * k * bm, 0);
    } else {
      const s = Math.sign(a.y1 + a.y2 - b.y1 - b.y2) || 1;
      shift(cs[i], 0, s * oy * k * am); shift(cs[j], 0, -s * oy * k * bm);
    }
  }
  return overlapping;
}
function clusterSeparate() {
  let cs = [], nodes = [];
  const force = alpha => separateClusters(cs, 0.5 * Math.min(1, alpha * 4));
  force.initialize = ns => { nodes = ns; cs = clustersOf(ns); };
  // Untangle fully: clusters apart, and no two cards on top of each other.
  force.settle = () => { for (let i = 0; i < 400; i++) if (!separateClusters(cs, 0.5) & !pushApart(nodes, 0.5)) break; };
  return force;
}

// Members of one of my theme bubbles stay near each other (gently: bubbles may overlap groups).
function bubblePull(strength = 0.05) {
  let nodes;
  const force = alpha => {
    for (const b of org.bubbles || []) {
      const ms = nodes.filter(n => b.members.includes(n.id));
      if (ms.length < 2) continue;
      const [cx, cy] = centroid(ms.map(n => [n.x, n.y]));
      for (const n of ms) { n.vx += (cx - n.x) * strength * alpha; n.vy += (cy - n.y) * strength * alpha; }
    }
  };
  force.initialize = ns => (nodes = ns);
  return force;
}

function simGraph() {
  const nodes = [], links = [];
  const itemsOfId = new Map();
  for (const n of visibleNodes()) {
    const c = conceptOf(n), s = sizeOf(n.id, n), prev = simById.get(n.id);
    const linked = (n.type === 'text' || itemOf(n) || ideaOf(n)) && canvas.edges.some(e => e.fromNode === n.id || e.toNode === n.id);
    const free = (c || linked) && !org.pinned.includes(n.id);
    const sn = { id: n.id, w: s.w, h: s.h, x: n.x + s.w / 2, y: n.y + s.h / 2, vx: prev?.vx || 0, vy: prev?.vy || 0, path: c?.path || null };
    if (!free) { sn.fx = sn.x; sn.fy = sn.y; }
    nodes.push(sn);
    if (c) itemsOfId.set(n.id, new Set(store.itemsOf(c).map(i => i.path)));
  }
  for (const e of ghosts()) {
    const id = `g:${e.id}`, prev = simById.get(id), s = sizes.get(id) || { w: 180, h: 40 };
    const set = new Set(e.payload.items);
    const [x, y] = prev ? [prev.x, prev.y] : birthPlace(set);
    nodes.push({ id, w: s.w, h: s.h, x, y, vx: 0, vy: 0, ghost: e.id });
    itemsOfId.set(id, set);
  }
  const ids = [...itemsOfId.keys()];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = itemsOfId.get(ids[i]);
    const n = [...itemsOfId.get(ids[j])].filter(x => a.has(x)).length;
    if (n) links.push({ source: ids[i], target: ids[j], kind: 'shared', n });
  }
  const present = new Set(nodes.map(n => n.id));
  for (const e of canvas.edges) if (present.has(e.fromNode) && present.has(e.toNode)) links.push({ source: e.fromNode, target: e.toNode, kind: 'edge', n: 1 });
  return { nodes, links };
}

function onTick() {
  for (const sn of sim.nodes()) {
    if (sn.ghost) {
      const el = root?.querySelector(`[data-ghost="${sn.ghost}"]`);
      if (el) { el.style.left = `${sn.x - sn.w / 2}px`; el.style.top = `${sn.y - sn.h / 2}px`; }
      continue;
    }
    const n = nodeById(sn.id);
    if (!n) continue;
    n.x = Math.round(sn.x - sn.w / 2); n.y = Math.round(sn.y - sn.h / 2);
    const el = root?.querySelector(`.mnode[data-id="${sn.id}"]`);
    if (el) { el.style.left = `${n.x}px`; el.style.top = `${n.y}px`; }
  }
  drawEdges();
}

// Floating can be switched off (it's heavy on big maps); the choice is saved with the map.
const floating = () => org.float !== false;

// With floating off nothing moves on its own: only a re-layout or AI organize arranges the board, in one go.
function holdStill() {
  sim?.stop(); sim = null; simKey = '';
  for (const n of simGraph().nodes) simById.set(n.id, n);
  for (const sn of simById.values()) if (sn.ghost) {
    const el = root.querySelector(`[data-ghost="${sn.ghost}"]`);
    if (el) { el.style.left = `${sn.x - sn.w / 2}px`; el.style.top = `${sn.y - sn.h / 2}px`; }
  }
  drawEdges();
  if (!fitted) { fit(); fitted = true; }
}

// alpha: how much to stir the layout (1 = from scratch); undefined = only if something changed.
function rebuild(alpha) {
  if (!root?.querySelector('#mapNodes')) return;
  draw();
  const once = !floating();
  if (once && !(alpha >= 0.9)) return holdStill();
  const { nodes, links } = simGraph();
  const groupOfId = new Map(nodes.filter(n => n.path).map(n => [n.id, groupOf(n.path)]));
  const sameGroup = l => { const a = groupOfId.get(l.source), b = groupOfId.get(l.target); return !a || !b || a === b; };
  const key = nodes.map(n => `${n.id}${n.fx == null ? '' : '*'}`).join() + links.map(l => `${l.source}-${l.target}-${l.n}`).join() + JSON.stringify(org.groups.map(g => g.members)) + JSON.stringify((org.bubbles || []).map(b => b.members));
  if (sim && key === simKey && alpha == null) return;
  for (const n of nodes) simById.set(n.id, n);
  simKey = key;
  sim?.stop();
  const [cx, cy] = boardCenter();
  const separate = clusterSeparate();
  sim = forceSimulation(nodes)
    .force('link', forceLink(links.map(l => ({ ...l, same: sameGroup(l) }))).id(d => d.id)
      .distance(l => (l.same ? (l.kind === 'edge' ? 180 : Math.max(110, 200 - 30 * l.n)) : 300))
      .strength(l => (l.same ? (l.kind === 'edge' ? 0.2 : Math.min(0.7, 0.15 * l.n)) : 0.03)))
    .force('charge', forceManyBody().strength(-380).distanceMax(700))
    .force('collide', rectCollide())
    .force('group', groupPull())
    .force('bubble', bubblePull())
    .force('x', forceX(cx).strength(0.025)).force('y', forceY(cy).strength(0.025))
    .force('separate', separate)
    .alpha(alpha ?? 0.35).alphaDecay(0.035).velocityDecay(0.45)
    .on('tick', onTick)
    // The forces fade out before every overlap is gone; finish the job once the layout has settled.
    .on('end', () => { separate.settle(); onTick(); scheduleSave(); if (!fitted && root) { fit(); fitted = true; } });
  if (once) {
    sim.stop();
    sim.tick(Math.ceil(Math.log(sim.alphaMin() / sim.alpha()) / Math.log(1 - sim.alphaDecay())));
    separate.settle(); onTick(); scheduleSave();
    sim = null; simKey = '';
    if (!fitted && root) { fit(); fitted = true; }
  }
}

/* ---------- rendering ---------- */
function nodeHtml(n) {
  const sel = selected.has(n.id) ? ' sel' : '', pin = org.pinned.includes(n.id) ? ' pinned' : '';
  const c = colorOf(n.color);
  const style = `left:${n.x}px;top:${n.y}px;${c ? `--c:${c};` : ''}`;
  const item = itemOf(n);
  if (item) {
    const d = item.data, why = trc(String(d.why || ''));
    return `<div class="mnode mat${sel}${pin}" data-id="${n.id}" style="${style}width:${n.width || 240}px" title="双击打开这份材料">
      <div class="mat-head"><span class="mat-type">${esc(d.type || '材料')}</span><span class="mat-marks">${d.star ? '⭐' : ''}${d.like ? '♥' : ''}</span></div>
      <div class="mat-title">${esc(trc(d.title || item.name))}</div>
      ${why ? `<div class="mat-why">${esc(why.length > 150 ? `${why.slice(0, 150)}…` : why)}</div>` : ''}
      <span class="handle" title="拖到关键词或便利贴上，画一条线"></span></div>`;
  }
  const idea = ideaOf(n);
  if (idea) {
    return `<div class="mnode idea${sel}${pin}" data-id="${n.id}" style="${style}width:${n.width || 260}px" title="双击打开这张想法卡">
      <div class="mat-head"><span class="mat-type">💡 想法 · ${esc(idea.data.stage || '种子')}</span></div>
      <div class="mat-title">${esc(trc(idea.data.idea || idea.name))}</div>
      <span class="handle" title="拖到关键词、材料或便利贴上，画一条线"></span></div>`;
  }
  if (n.type === 'file') {
    const concept = conceptOf(n);
    if (!concept) return `<div class="mnode kw missing${sel}" data-id="${n.id}" style="${style}"><span class="label">${esc(n.file.split('/').pop().replace(/\.md$/, ''))}</span><span class="cnt">?</span></div>`;
    const count = store.itemsOf(concept).length;
    return `<div class="mnode kw${count ? '' : ' empty'}${sel}${pin}" data-id="${n.id}" style="${style}font-size:${13 + Math.min(count, 6) * 1.6}px"
      title="${esc(concept.data.definition || '')}"><span class="label">${esc(concept.name)}</span><span class="cnt">${count}</span><span class="handle" title="拖到另一个关键词上，画一条箭头"></span></div>`;
  }
  const editing = editingId === n.id;
  const body = editing ? `<textarea class="sticky-edit">${esc(editDraft ?? n.text ?? '')}</textarea>`
    : `<div class="sticky-text markdown">${n.text ? renderMarkdown(trc(n.text)) : '<p class="muted">双击写点什么</p>'}</div>`;
  return `<div class="mnode sticky${sel}${pin}${editing ? ' editing' : ''}" data-id="${n.id}" style="${style}width:${n.width || 220}px;height:${n.height || 140}px;${c ? '' : `--c:${PRESETS[STICKY_COLOR]};`}">
    ${body}<span class="handle" title="拖到关键词上：便利贴会跟着它走"></span><span class="resize" title="拖动改变大小"></span></div>`;
}
function ghostHtml(e) {
  const s = simById.get(`g:${e.id}`), [x, y] = s ? [s.x - s.w / 2, s.y - s.h / 2] : boardCenter();
  return `<div class="mnode ghost" data-ghost="${e.id}" style="left:${x}px;top:${y}px" title="${esc(e.payload.definition || '')}">
    <span class="label">${esc(e.payload.name)}</span><span class="cnt">${e.payload.items.length}</span>
    <button class="g-keep" title="接受这个关键词">✓</button><button class="g-cancel" title="不要">✕</button></div>`;
}
function measure() {
  for (const el of root.querySelectorAll('#mapNodes .mnode')) {
    const id = el.dataset.id || `g:${el.dataset.ghost}`;
    sizes.set(id, { w: el.offsetWidth, h: el.offsetHeight });
    const sn = simById.get(id);
    if (sn) { sn.w = el.offsetWidth; sn.h = el.offsetHeight; }
  }
}
function draw() {
  if (!root?.querySelector('#mapNodes')) return;
  root.querySelector('#mapNodes').innerHTML = visibleNodes().map(nodeHtml).join('') + ghosts().map(ghostHtml).join('');
  hydrate(root.querySelector('#mapNodes'));
  measure();
  // In English the labels are swapped after this render (i18n's observer runs as a microtask), and
  // they're usually longer: measure again then, or the layout would make room for the Chinese ones.
  queueMicrotask(() => { if (root?.querySelector('#mapNodes')) { measure(); drawEdges(); } });
  drawEdges();
  const ta = root.querySelector('.sticky-edit');
  if (ta && document.activeElement !== ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  panel();
}

// Convex hull of the padded member rectangles, drawn with rounded corners.
function hullPath(rects, pad = 22) {
  const pts = rects.flatMap(r => [[r.x - pad, r.y - pad], [r.x + r.w + pad, r.y - pad], [r.x + r.w + pad, r.y + r.h + pad], [r.x - pad, r.y + r.h + pad]])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), p) <= 0) lower.pop(); lower.push(p); }
  for (const p of [...pts].reverse()) { while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), p) <= 0) upper.pop(); upper.push(p); }
  const h = [...lower.slice(0, -1), ...upper.slice(0, -1)];
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = `M${mid(h.at(-1), h[0]).join(',')}`;
  for (let i = 0; i < h.length; i++) d += ` Q${h[i].join(',')} ${mid(h[i], h[(i + 1) % h.length]).join(',')}`;
  return `${d}Z`;
}

function drawEdges() {
  const svg = root?.querySelector('#mapEdges');
  if (!svg) return;
  const parts = [], markers = new Map();
  const marker = c => {
    const id = `ah-${(c || 'ink').replace(/[^a-z0-9]/gi, '')}`;
    markers.set(id, `<marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:${c || 'var(--ink)'}"/></marker>`);
    return `url(#${id})`;
  };
  for (const b of org.bubbles || []) {
    const rs = b.members.map(nodeById).filter(Boolean).map(rectOf);
    if (!rs.length) continue;
    const c = colorOf(b.color) || 'var(--muted)';
    parts.push(`<path class="bubble${selectedBubble === b.id ? ' sel' : ''}" d="${hullPath(rs, 40)}" style="fill:${c};stroke:${c}"/>`);
    const cx = rs.reduce((a, r) => a + r.x + r.w / 2, 0) / rs.length, top = Math.min(...rs.map(r => r.y)) - 52;
    parts.push(`<text class="bubble-label" data-bubble="${b.id}" x="${cx}" y="${top}" style="fill:${c}">◎ ${esc(b.name)}</text>`);
  }
  for (const g of org.groups) {
    const rs = g.members.map(nodeOfPath).filter(Boolean).map(rectOf);
    if (!rs.length) continue;
    const c = colorOf(g.color) || 'var(--muted)';
    parts.push(`<path class="hull" d="${hullPath(rs)}" style="fill:${c};stroke:${c}"/>`);
    const cx = rs.reduce((a, r) => a + r.x + r.w / 2, 0) / rs.length, top = Math.min(...rs.map(r => r.y)) - 30;
    parts.push(`<text class="hull-label" x="${cx}" y="${top}" style="fill:${c}">${esc(g.name)}</text>`);
  }
  if (showShared) {
    const kws = visibleNodes().filter(n => conceptOf(n));
    for (let i = 0; i < kws.length; i++) for (let j = i + 1; j < kws.length; j++) {
      const a = new Set(store.itemsOf(conceptOf(kws[i])));
      const shared = store.itemsOf(conceptOf(kws[j])).filter(x => a.has(x));
      if (!shared.length) continue;
      parts.push(`<path class="shared" d="${curve(rectOf(kws[i]), rectOf(kws[j])).d}" style="stroke-width:${0.8 + shared.length * 0.7}"><title>共享材料：${esc(shared.map(s => s.data.title || s.name).join('、'))}</title></path>`);
    }
  }
  for (const e of canvas.edges) {
    const a = nodeById(e.fromNode), b = nodeById(e.toNode);
    if (!a || !b) continue;
    const g = curve(rectOf(a), rectOf(b)), c = colorOf(e.color), ai = org.aiEdges.includes(e.id);
    const st = org.edgeStyle?.[e.id];
    const lineStyle = [c ? `stroke:${c}` : '', st?.line ? `stroke-dasharray:${LINE_DASH[st.line] || 'none'}` : '', st?.width ? `stroke-width:${st.width}` : ''].filter(Boolean).join(';');
    const ends = `${e.toEnd !== 'none' ? `marker-end="${marker(c)}"` : ''} ${e.fromEnd === 'arrow' ? `marker-start="${marker(c)}"` : ''}`;
    parts.push(`<g class="edge${ai ? ' ai' : ''}${selected.has(e.id) ? ' sel' : ''}" data-edge="${e.id}">
      <path class="hit" d="${g.d}"/><path class="line" d="${g.d}" ${ends} style="${lineStyle}"/>
      ${e.label ? `<text x="${g.mid[0]}" y="${g.mid[1]}" class="elabel" style="${c ? `fill:${c}` : ''}">${esc(e.label)}</text>` : ''}
      ${ai && org.reasons?.[e.id] ? `<title>${esc(org.reasons[e.id])}</title>` : ''}</g>`);
  }
  svg.innerHTML = `<defs>${[...markers.values()].join('')}</defs>${parts.join('')}`;
}

/* ---------- AI ---------- */
async function aiSummarize() {
  busy = 'summarize'; panel();
  try { const n = await summarizeKeywords(); toast(n ? `AI 提出了 ${n} 个关键词（橙色虚线），可以逐个 ✓ / ✕，或者全部接受` : 'AI 没有新的关键词'); }
  catch (e) { toast(e.message, true); }
  busy = ''; fitted = false; if (root?.isConnected) rebuild(0.8);
}

async function aiOrganize() {
  const concepts = visibleNodes().map(conceptOf).filter(Boolean);
  if (concepts.length < 2) return toast('地图上至少要有两个关键词');
  busy = 'organize'; panel();
  try {
    const prev = org.groups.map(g => ({ name: g.name, keywords: g.members.map(p => store.get(p)?.name).filter(Boolean) }));
    const res = await organizeKeywords(concepts, prev);
    snapshot();
    org.groups = res.groups.map((g, i) => ({
      name: g.name, note: g.note, members: g.members,
      color: org.groups.find(o => o.name === g.name)?.color || GROUP_PALETTE[i % GROUP_PALETTE.length],
    }));
    for (const n of canvas.nodes) if (n.type === 'file') { const g = groupOf(n.file); if (g) n.color = g.color; }
    // AI arrows are redrawn each time; arrows I drew or kept stay.
    canvas.edges = canvas.edges.filter(e => !org.aiEdges.includes(e.id));
    org.aiEdges = []; org.reasons = {};
    for (const r of res.relations) {
      const a = nodeOfPath(r.from), b = nodeOfPath(r.to);
      if (!a || !b || canvas.edges.some(e => (e.fromNode === a.id && e.toNode === b.id) || (e.fromNode === b.id && e.toNode === a.id))) continue;
      const id = uid();
      canvas.edges.push({ id, fromNode: a.id, toNode: b.id, ...(r.label ? { label: r.label } : {}) });
      org.aiEdges.push(id); org.reasons[id] = r.reason;
    }
    org.organizedAt = new Date().toISOString(); org.model = res.model;
    scheduleSave();
    toast(`分成了 ${org.groups.length} 组，画了 ${org.aiEdges.length} 条关系`);
  } catch (e) { toast(e.message, true); }
  busy = ''; fitted = false;
  if (root?.isConnected) rebuild(0.9);
}

async function acceptAll() {
  busy = 'acceptAll'; panel();
  try {
    for (const e of ghosts()) await keep(e);
    ensureKeywordNodes();
  } catch (e) { toast(e.message, true); busy = ''; return; }
  busy = '';
  await aiOrganize();
}

/* ---------- side panel ---------- */
function swatches() {
  return `<div class="swatches">${Object.entries(PRESETS).map(([k, c]) => `<button class="sw" data-color="${k}" style="--c:${c}" title="颜色 ${k}"></button>`).join('')}
    <label class="sw custom" title="自定义颜色"><input type="color" id="customColor"></label><button class="sw none" data-color="" title="默认颜色">∅</button></div>`;
}

function panel() {
  const el = root?.querySelector('#mapPanel');
  if (!el) return;
  const nodes = visibleNodes().filter(n => selected.has(n.id));
  const edges = canvas.edges.filter(e => selected.has(e.id));
  const kws = nodes.map(conceptOf).filter(Boolean);
  const ro = viewOnly();
  const kwCount = visibleNodes().filter(conceptOf).length;
  const ungrouped = visibleNodes().filter(n => conceptOf(n) && !groupOf(n.file)).length;
  let html = '';
  const bubble = (org.bubbles || []).find(b => b.id === selectedBubble);
  const mats = nodes.map(itemOf).filter(Boolean);

  if (bubble) {
    html = `<p class="kind">主题气泡</p><h2>◎ ${esc(bubble.name)}</h2>
      <textarea id="bubNote" rows="3" placeholder="这个主题是什么、为什么值得发展"${ro ? ' disabled' : ''}>${esc(bubble.note || '')}</textarea>
      <p class="hint">${bubble.members.length} 个节点。选中一个节点后可以在面板里把它加进或移出气泡。</p>
      ${ro ? '' : `<div class="actions left"><label class="mini-color" title="换颜色" style="--c:${colorOf(bubble.color)}"><input type="color" id="bubColor" value="${colorOf(bubble.color)}"></label>
        <button class="mini" id="bubRename">改名</button><button class="mini" id="bubDelete">删除气泡</button></div>`}`;
    el.innerHTML = html;
    return bindBubblePanel(el, bubble);
  }

  if (!nodes.length && !edges.length) {
    const g = ghosts().length;
    html = `<h2>关键词地图</h2>
      <p class="hint">${kwCount} 个关键词 · ${org.groups.length} 组${org.organizedAt ? ` · 上次整理 ${esc(org.organizedAt.slice(0, 10))}` : ''}</p>
      ${ro ? '' : `
        ${g ? `<div class="nudge">AI 建议了 ${g} 个关键词（橙色虚线）
            <div class="actions"><button class="primary" id="mAcceptAll"${busy ? ' disabled' : ''}>${busy === 'acceptAll' ? '接受中…' : '全部接受并整理'}</button></div></div>`
          : `<div class="actions left"><button id="mSummarize"${busy ? ' disabled' : ''}>${busy === 'summarize' ? 'AI 正在读你的材料…' : kwCount ? '让 AI 再找些关键词' : '让 AI 总结关键词'}</button></div>`}
        ${kwCount >= 2 && ungrouped && org.groups.length ? `<p class="nudge">${ungrouped} 个关键词还没分组，点上面的「AI 整理」</p>` : ''}
        ${busy === 'organize' ? '<p class="hint">AI 整理中…</p>' : ''}`}
      ${org.groups.length ? `<h2>分组</h2><ul class="groups">${org.groups.map((gr, i) => `<li>
          <span class="dot" style="--c:${colorOf(gr.color)}"></span><button class="linkish" data-gsel="${i}" title="${esc(gr.note || '')}">${esc(gr.name)}</button>
          <span class="muted">${gr.members.length}</span>
          ${ro ? '' : `<span class="ops"><label class="mini-color" title="换颜色" style="--c:${colorOf(gr.color)}"><input type="color" data-gcolor="${i}" value="${colorOf(gr.color)}"></label><button class="mini" data-grename="${i}">改名</button></span>`}</li>`).join('')}</ul>` : ''}
      ${(org.bubbles || []).length ? `<h2>我的主题</h2><ul class="groups">${org.bubbles.map(b => `<li>
          <span class="dot ring" style="--c:${colorOf(b.color)}"></span><button class="linkish" data-bsel="${b.id}" title="${esc(b.note || '')}">${esc(b.name)}</button>
          <span class="muted">${b.members.length}</span></li>`).join('')}</ul>` : ''}
      ${org.hidden.length ? `<h2>隐藏的关键词</h2><div class="links">${org.hidden.map(p => store.get(p)).filter(Boolean).map(c => `<button class="mini" data-unhide="${esc(c.path)}">显示 ${esc(c.name)}</button>`).join('')}</div>` : ''}
      <details class="tips-box"><summary>操作说明</summary><ul class="tips">
        <li>位置由工具自动排：共享材料越多的关键词靠得越近，同组的聚在一起</li>
        <li>拖动关键词 = 把它固定在那里；「重新排布」取消所有固定</li>
        <li>双击空白处 = 便利贴；把便利贴上的小圆点拖到关键词上，它就会跟着那个关键词走</li>
        <li>拖关键词上的小圆点到另一个关键词 = 自己画箭头（AI 整理时不会被覆盖）</li>
        <li>拖空白处移动画布，⌘/Ctrl + 滚轮缩放，Delete 删除选中，⌘Z 撤销</li>
        <li>点线 = 共享材料；红虚线 = 还没有材料（缺口）</li>
        <li>选中关键词，在材料列表里点「上图」，把一份材料从关键词引到地图上</li>
        <li>shift 多选几个节点，点「新建主题气泡」，圈出你想发展的方向</li></ul></details>`;
  } else if (kws.length === 1 && nodes.length === 1) {
    const c = kws[0], n = nodes[0], items = store.itemsOf(c), g = groupOf(c.path);
    const pool = store.items().filter(x => !items.includes(x));
    html = `<h2>${esc(c.name)}</h2>
      <textarea id="kwDef" rows="2" placeholder="我的一句话定义"${ro ? ' disabled' : ''}>${esc(c.data.definition || '')}</textarea>
      ${ro ? '' : `<label class="row-label">分组 <select id="kwGroup"><option value="">（不分组）</option>${org.groups.map((gr, i) => `<option value="${i}"${gr === g ? ' selected' : ''}>${esc(gr.name)}</option>`).join('')}<option value="__new">＋ 新分组…</option></select></label>`}
      <h2>材料 <span class="count">${items.length}</span></h2>
      <ul class="kw-items">${items.map(x => `<li><a href="#/item/${encodeURIComponent(x.path)}">${esc(x.data.title || x.name)}</a>
        ${ro ? '' : `<span>${nodeOfPath(x.path) ? '<span class="muted on-map">在图上</span>' : `<button class="mini" data-place="${esc(x.path)}" title="把这份材料从关键词引到地图上">上图</button>`}<button class="x" data-untag="${esc(x.path)}" title="去掉这个关键词">×</button></span>`}</li>`).join('') || '<li class="muted">还没有材料（缺口）</li>'}</ul>
      ${ro ? '' : `<input id="kwAdd" list="dl-kwadd" placeholder="把一份材料标到这个关键词…"><datalist id="dl-kwadd">${pool.map(x => `<option value="${esc(x.name)}">`).join('')}</datalist>`}
      <div class="actions"><a href="#/open/${encodeURIComponent(c.name)}">打开概念页</a><button id="kwRec">为它推荐材料</button></div>
      ${ro ? '' : `<div class="actions">${org.pinned.includes(n.id) ? '<button id="kwUnpin">取消固定</button>' : ''}<button id="kwHide">在地图上隐藏</button></div>`}`;
  } else if (mats.length === 1 && nodes.length === 1) {
    const it = mats[0], d = it.data;
    html = `<p class="kind">材料</p><h2>${esc(d.title || it.name)}</h2>
      ${d.why ? `<p class="hint">${esc(d.why)}</p>` : ''}
      ${ro ? '' : `<div class="actions left"><button class="mini${d.star ? ' on' : ''}" id="matStar" title="看了描述觉得有用，计划读">${d.star ? '⭐ 计划读' : '☆ 计划读'}</button>
        <button class="mini${d.like ? ' on' : ''}" id="matLike" title="读完觉得写得很好，想继续发展">${d.like ? '♥ 喜欢' : '♡ 喜欢'}</button></div>`}
      <div class="actions"><a href="#/item/${encodeURIComponent(it.path)}">打开材料页</a>${ro ? '' : '<button id="matSticky">＋ 连一张便利贴</button>'}</div>`;
  } else if (nodes.length === 1 && nodes[0].type === 'text') {
    html = `<p class="kind">便利贴</p>${ro ? '' : '<div class="actions left"><button id="stickyEdit">编辑文字</button></div><p class="hint">也可以双击便利贴编辑。</p>'}`;
  } else if (kws.length >= 2) {
    const both = store.items().filter(it => kws.every(c => store.itemsOf(c).includes(it)));
    html = `<h2>已选 ${kws.length} 个关键词</h2><p>${kws.map(c => esc(c.name)).join(' · ')}</p>
      <h2>同时属于它们的材料 <span class="count">${both.length}</span></h2>
      <ul>${both.map(x => `<li><a href="#/item/${encodeURIComponent(x.path)}">${esc(x.data.title || x.name)}</a></li>`).join('') || '<li class="muted">没有：这是一个交叉处的缺口</li>'}</ul>
      <div class="actions"><button id="kwRec">围绕它们推荐</button></div>`;
  } else if (edges.length === 1 && !nodes.length) {
    const e = edges[0], ai = org.aiEdges.includes(e.id);
    html = `<h2>${ai ? 'AI 画的关系' : '箭头'}</h2>
      ${ai && org.reasons?.[e.id] ? `<p class="hint">${esc(org.reasons[e.id])}</p>` : ''}
      <input id="edgeLabel" placeholder="标签，比如：导致 / 张力 / 前提" value="${esc(e.label || '')}"${ro ? ' disabled' : ''}>
      ${ro ? '' : `<label class="check"><input type="checkbox" id="edgeBoth"${e.fromEnd === 'arrow' ? ' checked' : ''}> 双向</label>
      <label class="check"><input type="checkbox" id="edgeNone"${e.toEnd === 'none' ? ' checked' : ''}> 没有箭头（只是线）</label>
      <div class="seg" role="group" aria-label="线型">${Object.entries({ solid: '实线', dashed: '虚线', dotted: '点线' }).map(([k, label]) =>
        `<button class="mini${(org.edgeStyle?.[e.id]?.line || (ai ? 'dashed' : 'solid')) === k ? ' on' : ''}" data-line="${k}">${label}</button>`).join('')}</div>
      <div class="seg" role="group" aria-label="粗细">${[1, 2, 3].map(w => `<button class="mini${(org.edgeStyle?.[e.id]?.width || 1.6) === w ? ' on' : ''}" data-width="${w}">${['细', '中', '粗'][w - 1]}</button>`).join('')}</div>
      ${ai ? '<div class="actions"><button id="edgeKeep">保留（以后 AI 整理不会删掉它）</button></div>' : ''}`}`;
  } else {
    html = `<h2>已选 ${nodes.length + edges.length} 个</h2>`;
  }
  if (nodes.length && !ro) {
    if (nodes.length >= 2) html += '<div class="actions left"><button id="newBubble">＋ 新建主题气泡</button></div>';
    else if ((org.bubbles || []).length) {
      const n0 = nodes[0];
      html += `<label class="row-label">主题气泡 <select id="bubJoin"><option value="">—</option>${org.bubbles.map(b =>
        `<option value="${b.id}"${b.members.includes(n0.id) ? ' selected' : ''}>${b.members.includes(n0.id) ? '✓ ' : ''}${esc(b.name)}</option>`).join('')}</select></label>`;
    }
  }
  if ((nodes.length || edges.length) && !ro) {
    html += swatches();
    if (edges.length || nodes.length > kws.length) html += `<div class="actions"><button id="selDelete">${mats.length && !edges.length ? '从地图上移除' : '删除'}</button></div>`;
  }
  el.innerHTML = html;
  bindPanel(el, { nodes, edges, kws });
}

function bindPanel(el, { nodes, edges, kws }) {
  const on = (sel, ev, fn) => el.querySelector(sel)?.addEventListener(ev, fn);
  const recolor = color => { snapshot(); for (const x of [...nodes, ...edges]) { if (color) x.color = color; else delete x.color; } scheduleSave(); draw(); };
  for (const b of el.querySelectorAll('[data-color]')) b.onclick = () => recolor(b.dataset.color);
  on('#customColor', 'change', e => recolor(e.target.value));
  on('#selDelete', 'click', removeSelected);
  on('#kwRec', 'click', () => openRecommend({ concepts: kws.map(c => c.name) }));
  on('#mSummarize', 'click', aiSummarize);
  on('#mAcceptAll', 'click', acceptAll);
  for (const b of el.querySelectorAll('[data-gsel]')) b.onclick = () => {
    selected = new Set(org.groups[b.dataset.gsel].members.map(nodeOfPath).filter(Boolean).map(n => n.id)); draw();
  };
  for (const inp of el.querySelectorAll('[data-gcolor]')) inp.onchange = () => {
    snapshot();
    const g = org.groups[inp.dataset.gcolor]; g.color = inp.value;
    for (const p of g.members) { const n = nodeOfPath(p); if (n) n.color = inp.value; }
    scheduleSave(); draw();
  };
  for (const b of el.querySelectorAll('[data-grename]')) b.onclick = async () => {
    const g = org.groups[b.dataset.grename];
    const res = await ask({ title: '分组改名', fields: [{ name: 'v', label: '组名', required: true, value: g.name }] });
    if (res?.v) { snapshot(); g.name = res.v; scheduleSave(); draw(); }
  };
  for (const b of el.querySelectorAll('[data-unhide]')) b.onclick = () => {
    snapshot(); org.hidden = org.hidden.filter(p => p !== b.dataset.unhide); ensureKeywordNodes(); scheduleSave(); rebuild(0.5);
  };
  const c = kws[0], n = nodes[0];
  on('#kwDef', 'change', e => store.update(c.path, d => { d.definition = e.target.value.trim() || null; }).catch(err => toast(err.message, true)));
  on('#kwGroup', 'change', async e => {
    let idx = e.target.value;
    if (idx === '__new') {
      const res = await ask({ title: '新分组', fields: [{ name: 'v', label: '组名', required: true }] });
      if (!res?.v) return draw();
      org.groups.push({ name: res.v, members: [], color: GROUP_PALETTE[org.groups.length % GROUP_PALETTE.length] });
      idx = org.groups.length - 1;
    }
    snapshot();
    const target = idx === '' ? null : org.groups[idx];
    for (const g of org.groups) g.members = g.members.filter(p => p !== c.path);
    if (target) { target.members.push(c.path); n.color = target.color; } else delete n.color;
    org.groups = org.groups.filter(g => g.members.length);
    scheduleSave(); rebuild(0.4);
  });
  for (const b of el.querySelectorAll('[data-untag]')) b.onclick = () => store.update(b.dataset.untag, d => {
    d.concepts = asList(d.concepts).filter(v => store.resolve(v) !== c);
  }).catch(err => toast(err.message, true));
  on('#kwAdd', 'change', e => {
    const it = store.resolve(e.target.value.trim());
    if (it?.data.kind !== KIND.item) return;
    store.update(it.path, d => { d.concepts = [...asList(d.concepts), toLink(c.name)]; }).catch(err => toast(err.message, true));
  });
  on('#kwUnpin', 'click', () => { org.pinned = org.pinned.filter(id => id !== n.id); scheduleSave(); rebuild(0.4); });
  on('#kwHide', 'click', () => {
    snapshot();
    org.hidden.push(c.path);
    canvas.nodes = canvas.nodes.filter(x => x !== n);
    canvas.edges = canvas.edges.filter(e => e.fromNode !== n.id && e.toNode !== n.id);
    selected.clear(); scheduleSave(); rebuild(0.3);
  });
  for (const b of el.querySelectorAll('[data-bsel]')) b.onclick = () => { selectedBubble = b.dataset.bsel; selected.clear(); draw(); };
  for (const b of el.querySelectorAll('[data-place]')) b.onclick = () => placeItem(b.dataset.place, n);
  on('#stickyEdit', 'click', () => openNode(n));
  const it = nodes.map(itemOf).filter(Boolean)[0];
  const flag = key => store.update(it.path, d => { d[key] = d[key] ? null : true; }).then(() => draw()).catch(err => toast(err.message, true));
  on('#matStar', 'click', () => flag('star'));
  on('#matLike', 'click', () => flag('like'));
  on('#matSticky', 'click', () => {
    snapshot();
    const r = rectOf(n), s = { id: uid(), type: 'text', text: '', x: Math.round(r.x + r.w + 40), y: Math.round(r.y), width: 240, height: 160, color: STICKY_COLOR };
    canvas.nodes.push(s);
    canvas.edges.push({ id: uid(), fromNode: s.id, toNode: n.id, toEnd: 'none' });
    selected = new Set([s.id]); editingId = s.id;
    scheduleSave(); rebuild(0.3);
  });
  on('#newBubble', 'click', async () => {
    const res = await ask({ title: '新建主题气泡', fields: [{ name: 'v', label: '主题名', required: true, placeholder: '比如：描述里的想象空间' }] });
    if (!res?.v) return;
    snapshot();
    org.bubbles = [...(org.bubbles || []), { id: uid().slice(0, 8), name: res.v, note: '', members: nodes.map(x => x.id), color: GROUP_PALETTE[(org.bubbles || []).length % GROUP_PALETTE.length] }];
    selectedBubble = org.bubbles.at(-1).id; selected.clear();
    scheduleSave(); rebuild(0.3);
  });
  on('#bubJoin', 'change', e => {
    snapshot();
    const b = org.bubbles.find(x => x.id === e.target.value);
    if (b) b.members = b.members.includes(n.id) ? b.members.filter(id => id !== n.id) : [...b.members, n.id];
    org.bubbles = org.bubbles.filter(x => x.members.length);
    scheduleSave(); rebuild(0.3);
  });
  for (const b of el.querySelectorAll('[data-line]')) b.onclick = () => { snapshot(); org.edgeStyle = { ...org.edgeStyle, [edges[0].id]: { ...org.edgeStyle?.[edges[0].id], line: b.dataset.line } }; scheduleSave(); draw(); };
  for (const b of el.querySelectorAll('[data-width]')) b.onclick = () => { snapshot(); org.edgeStyle = { ...org.edgeStyle, [edges[0].id]: { ...org.edgeStyle?.[edges[0].id], width: Number(b.dataset.width) } }; scheduleSave(); draw(); };
  const e0 = edges[0];
  on('#edgeLabel', 'change', e => { snapshot(); e0.label = e.target.value.trim() || undefined; scheduleSave(); draw(); });
  on('#edgeBoth', 'change', e => { snapshot(); if (e.target.checked) e0.fromEnd = 'arrow'; else delete e0.fromEnd; scheduleSave(); draw(); });
  on('#edgeNone', 'change', e => { snapshot(); if (e.target.checked) e0.toEnd = 'none'; else delete e0.toEnd; scheduleSave(); draw(); });
  on('#edgeKeep', 'click', () => { org.aiEdges = org.aiEdges.filter(id => id !== e0.id); scheduleSave(); draw(); toast('这条关系现在是你的了'); });
}

function bindBubblePanel(el, b) {
  const on = (sel, ev, fn) => el.querySelector(sel)?.addEventListener(ev, fn);
  on('#bubNote', 'change', e => { snapshot(); b.note = e.target.value.trim(); scheduleSave(); });
  on('#bubColor', 'change', e => { snapshot(); b.color = e.target.value; scheduleSave(); draw(); });
  on('#bubRename', 'click', async () => {
    const res = await ask({ title: '气泡改名', fields: [{ name: 'v', label: '主题名', required: true, value: b.name }] });
    if (res?.v) { snapshot(); b.name = res.v; scheduleSave(); draw(); }
  });
  on('#bubDelete', 'click', () => { snapshot(); org.bubbles = org.bubbles.filter(x => x !== b); selectedBubble = null; scheduleSave(); rebuild(0.2); });
}

// Lead a material out of a keyword: a card next to it, joined by a dotted line, that follows the keyword.
function placeItem(path, from) {
  if (nodeOfPath(path)) return;
  snapshot();
  const r = rectOf(from);
  const n = { id: uid(), type: 'file', file: path, x: Math.round(r.x + r.w / 2 - 120), y: Math.round(r.y + r.h + 70), width: 240, height: 90 };
  canvas.nodes.push(n);
  const e = { id: uid(), fromNode: from.id, toNode: n.id, toEnd: 'none' };
  canvas.edges.push(e);
  org.edgeStyle = { ...org.edgeStyle, [e.id]: { line: 'dotted' } };
  selected = new Set([n.id]);
  scheduleSave(); rebuild(0.4);
}

/* ---------- actions ---------- */
// Delete removes stickies and arrows; keywords are hidden instead (their notes and tags stay).
function removeSelected() {
  if (!selected.size || viewOnly()) return;
  snapshot();
  for (const n of visibleNodes().filter(x => selected.has(x.id) && conceptOf(x))) org.hidden.push(n.file);
  canvas.nodes = canvas.nodes.filter(n => !selected.has(n.id));
  const alive = new Set(canvas.nodes.map(n => n.id));
  canvas.edges = canvas.edges.filter(e => !selected.has(e.id) && alive.has(e.fromNode) && alive.has(e.toNode));
  org.aiEdges = org.aiEdges.filter(id => canvas.edges.some(e => e.id === id));
  for (const b of org.bubbles || []) b.members = b.members.filter(id => alive.has(id));
  org.bubbles = (org.bubbles || []).filter(b => b.members.length);
  selected.clear();
  scheduleSave(); rebuild(0.2);
}

function newSticky(x, y) {
  snapshot();
  const n = { id: uid(), type: 'text', text: '', x: Math.round(x), y: Math.round(y), width: 220, height: 140, color: STICKY_COLOR };
  canvas.nodes.push(n);
  selected = new Set([n.id]);
  editingId = n.id;
  scheduleSave(); rebuild();
}

async function newKeyword() {
  const res = await ask({ title: '新关键词', fields: [{ name: 'name', label: '关键词', required: true, placeholder: '比如：独立 vs 依赖' }] });
  if (!res?.name) return;
  try {
    const concept = await store.ensureNote(KIND.concept, res.name);
    org.hidden = org.hidden.filter(p => p !== concept.path);
    ensureKeywordNodes();
    const n = nodeOfPath(concept.path);
    if (n) selected = new Set([n.id]);
    rebuild(0.5);
  } catch (e) { toast(e.message, true); }
}

function openNode(n) {
  if (!n) return;
  if (n.type === 'text') {
    if (viewOnly()) return;
    editingId = n.id; selected = new Set([n.id]); draw();
    setTimeout(() => { const ta = root?.querySelector('.sticky-edit'); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } }, 0);
    return;
  }
  const c = conceptOf(n), it = itemOf(n), idea = ideaOf(n);
  if (idea) location.hash = `#/open/${encodeURIComponent(idea.name)}`;
  else if (c) location.hash = `#/open/${encodeURIComponent(c.name)}`;
  else if (it) location.hash = `#/item/${encodeURIComponent(it.path)}`;
}

function finishEditing() {
  if (!editingId) return;
  const n = nodeById(editingId), text = root?.querySelector('.sticky-edit')?.value ?? editDraft;
  editingId = null; editDraft = null;
  if (n && text != null && text !== (n.text || '')) { snapshot(); n.text = text; scheduleSave(); }
  draw();
}

/* ---------- pointer interaction ---------- */
function bindStage() {
  const vp = root.querySelector('#mapVp');
  let gesture = null;
  // Double clicks are detected by hand: the first press re-renders the node, so the browser's own
  // dblclick lands on the canvas (and pointer events carry no click count).
  let lastDown = { id: null, t: 0 }, suppressDblUntil = 0;

  vp.addEventListener('pointerdown', ev => {
    if (ev.button !== 0) return;
    const t = ev.target;
    if (t.closest('.sticky-edit') || t.closest('.ghost button')) return;
    if (editingId && !t.closest(`[data-id="${editingId}"]`)) finishEditing();
    const nodeEl = t.closest('.mnode[data-id]'), edgeEl = t.closest('[data-edge]');
    const [wx, wy] = toWorld(ev.clientX, ev.clientY);
    const ro = viewOnly();
    const bub = t.closest('[data-bubble]');
    if (bub) { selectedBubble = bub.dataset.bubble; selected.clear(); draw(); return; }

    if (nodeEl && t.classList.contains('handle') && !ro) {
      gesture = { kind: 'connect', from: nodeEl.dataset.id };
    } else if (nodeEl && t.classList.contains('resize') && !ro) {
      snapshot();
      const n = nodeById(nodeEl.dataset.id);
      gesture = { kind: 'resize', n, sx: wx, sy: wy, w: n.width || 220, h: n.height || 140 };
    } else if (nodeEl) {
      const id = nodeEl.dataset.id;
      const now = Date.now();
      if (!ev.shiftKey && lastDown.id === id && now - lastDown.t < 450) {
        lastDown = { id: null, t: 0 }; suppressDblUntil = now + 700;
        ev.preventDefault();                       // keep the browser from moving focus off the new editor
        return openNode(nodeById(id));
      }
      lastDown = { id, t: now };
      const before = [...selected].join();
      if (ev.shiftKey) selected.has(id) ? selected.delete(id) : selected.add(id);
      else if (!selected.has(id)) selected = new Set([id]);
      const moving = visibleNodes().filter(n => selected.has(n.id));
      gesture = { kind: 'move', sx: wx, sy: wy, start: moving.map(n => [n, n.x, n.y]), moved: false, before: JSON.stringify({ canvas, org }) };
      if (selectedBubble || before !== [...selected].join()) { selectedBubble = null; draw(); }
    } else if (edgeEl) {
      const id = edgeEl.dataset.edge;
      if (ev.shiftKey) selected.has(id) ? selected.delete(id) : selected.add(id); else selected = new Set([id]);
      draw();
      return;
    } else if (!t.closest('.ghost')) {
      if (!ev.shiftKey && (selected.size || selectedBubble)) { selected.clear(); selectedBubble = null; draw(); }
      gesture = { kind: 'pan', sx: ev.clientX, sy: ev.clientY, x: view.x, y: view.y };
    }
    if (gesture) vp.setPointerCapture(ev.pointerId);
  });

  vp.addEventListener('pointermove', ev => {
    if (!gesture) return;
    const [wx, wy] = toWorld(ev.clientX, ev.clientY);
    if (gesture.kind === 'pan') {
      view.x = gesture.x + ev.clientX - gesture.sx; view.y = gesture.y + ev.clientY - gesture.sy; applyView();
    } else if (gesture.kind === 'move' && !viewOnly()) {
      const dx = wx - gesture.sx, dy = wy - gesture.sy;
      if (!gesture.moved && Math.hypot(dx, dy) * view.k < 3) return;
      gesture.moved = true;
      for (const [n, x, y] of gesture.start) {
        n.x = Math.round(x + dx); n.y = Math.round(y + dy);
        const sn = simById.get(n.id);
        if (sn) { sn.fx = sn.x = n.x + sn.w / 2; sn.fy = sn.y = n.y + sn.h / 2; }
        const el = root.querySelector(`.mnode[data-id="${n.id}"]`);
        if (el) { el.style.left = `${n.x}px`; el.style.top = `${n.y}px`; }
      }
      if (sim) sim.alphaTarget(0.12).restart();
      drawEdges();
    } else if (gesture.kind === 'resize') {
      gesture.n.width = Math.max(120, Math.round(gesture.w + wx - gesture.sx));
      gesture.n.height = Math.max(60, Math.round(gesture.h + wy - gesture.sy));
      const el = root.querySelector(`.mnode[data-id="${gesture.n.id}"]`);
      el.style.width = `${gesture.n.width}px`; el.style.height = `${gesture.n.height}px`;
      sizes.set(gesture.n.id, { w: gesture.n.width, h: gesture.n.height });
      const sn = simById.get(gesture.n.id); if (sn) { sn.w = gesture.n.width; sn.h = gesture.n.height; }
      drawEdges();
    } else if (gesture.kind === 'connect') {
      const p0 = clip(rectOf(nodeById(gesture.from)), wx, wy);
      let tmp = root.querySelector('#tmpEdge');
      if (!tmp) { root.querySelector('#mapEdges').insertAdjacentHTML('beforeend', '<path id="tmpEdge" class="tmp"/>'); tmp = root.querySelector('#tmpEdge'); }
      tmp.setAttribute('d', `M${p0[0]},${p0[1]} L${wx},${wy}`);
    }
  });

  const end = ev => {
    if (!gesture) return;
    const g = gesture; gesture = null;
    if (g.kind === 'move' && g.moved) {
      undo.push(g.before); redo.length = 0;
      // Where I put it is where it stays.
      for (const [n] of g.start) if (!org.pinned.includes(n.id)) org.pinned.push(n.id);
      if (sim) sim.alphaTarget(0);
      scheduleSave(); rebuild(0.25);
    }
    if (g.kind === 'resize') { scheduleSave(); rebuild(); }
    if (g.kind === 'connect') {
      root.querySelector('#tmpEdge')?.remove();
      const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.mnode[data-id]');
      if (target && target.dataset.id !== g.from) {
        snapshot();
        const e = { id: uid(), fromNode: g.from, toNode: target.dataset.id };
        // A sticky tied to a keyword follows it around (plain line, no arrowhead).
        const from = nodeById(g.from);
        if (from?.type === 'text') { org.pinned = org.pinned.filter(id => id !== from.id); e.toEnd = 'none'; }
        canvas.edges.push(e);
        selected = new Set([e.id]);
        scheduleSave(); rebuild(0.3);
      }
    }
  };
  vp.addEventListener('input', ev => { if (ev.target.classList.contains('sticky-edit')) editDraft = ev.target.value; });
  vp.addEventListener('pointerup', end);
  vp.addEventListener('pointercancel', end);

  vp.addEventListener('dblclick', ev => {
    // Double clicks on nodes are handled on pointerdown (the first click may have re-rendered them).
    if (viewOnly() || Date.now() < suppressDblUntil || ev.target.closest('#mapNodes, [data-bubble]')) return;
    const edgeEl = ev.target.closest('[data-edge]');
    if (edgeEl) {
      selected = new Set([edgeEl.dataset.edge]); draw();
      root.querySelector('#edgeLabel')?.focus();
    } else if (!ev.target.closest('.ghost')) {
      const [x, y] = toWorld(ev.clientX, ev.clientY);
      newSticky(x - 110, y - 70);
    }
  });

  vp.addEventListener('wheel', ev => {
    ev.preventDefault();
    if (ev.ctrlKey || ev.metaKey) {
      const r = vp.getBoundingClientRect(), sx = ev.clientX - r.left, sy = ev.clientY - r.top;
      const k = Math.min(3, Math.max(0.15, view.k * Math.exp(-ev.deltaY * 0.01)));
      view.x = sx - (sx - view.x) * (k / view.k); view.y = sy - (sy - view.y) * (k / view.k); view.k = k;
    } else { view.x -= ev.deltaX; view.y -= ev.deltaY; }
    applyView();
  }, { passive: false });

  vp.addEventListener('click', async ev => {
    const g = ev.target.closest('.ghost');
    if (!g || !ev.target.closest('button')) return;
    const entry = store.inbox().find(e => e.id === g.dataset.ghost);
    if (!entry) return;
    try {
      if (ev.target.classList.contains('g-cancel')) await cancel(entry);
      else { await keep(entry); ensureKeywordNodes(); rebuild(0.4); }
    } catch (e) { toast(e.message, true); }
  });
}

function onKey(ev) {
  if (!root?.isConnected || !location.hash.startsWith('#/map')) return;
  if (ev.target.closest?.('input, textarea, select, [contenteditable]')) {
    if (ev.key === 'Escape' && editingId) finishEditing();
    return;
  }
  const mod = ev.metaKey || ev.ctrlKey;
  if (mod && ev.key.toLowerCase() === 'z') { ev.preventDefault(); ev.shiftKey ? history(redo, undo) : history(undo, redo); }
  else if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); removeSelected(); }
  else if (ev.key === 'Escape') { selected.clear(); draw(); }
}
document.addEventListener('keydown', onKey);

/* ---------- entry ---------- */
export async function renderMap(main) {
  const first = root !== main || !main.querySelector('#mapStage');
  root = main;
  main.classList.add('wide');
  if (first) {
    const ro = viewOnly();
    main.innerHTML = `<section class="map-view">
      <div class="graph-bar">
        ${ro ? '<span class="badge">只读</span>' : `<button class="primary" id="mOrganize">AI 整理</button>
        <button id="mRelayout" title="取消所有固定，重新自动排布">重新排布</button>
        <button id="mKw">＋ 关键词</button><button id="mSticky">＋ 便利贴</button>`}
        <button id="mFit">适应窗口</button>${ro ? '' : '<button id="mUndo" title="⌘Z">撤销</button>'}
        <label class="check"><input type="checkbox" id="mShared"${showShared ? ' checked' : ''}> 共享材料连线</label>
        <label class="check" title="关掉后关键词不再自己移动，停在你放的位置；「重新排布」仍会排一次"><input type="checkbox" id="mFloat"> 关键词漂浮</label>
        <span class="hint">数字 = 关键词下的材料数${ro ? ' · 点关键词看材料' : ' · 拖动关键词会把它固定'}</span>
      </div>
      <div class="graph-wrap">
        <div class="map-vp" id="mapVp"><div class="map-stage" id="mapStage">
          <svg class="map-edges" id="mapEdges" width="1" height="1"></svg><div id="mapNodes"></div>
        </div></div>
        <aside class="graph-panel" id="mapPanel"></aside>
      </div></section>`;
    bindStage();
    const on = (id, fn) => main.querySelector(id)?.addEventListener('click', fn);
    on('#mOrganize', aiOrganize);
    on('#mRelayout', () => {
      snapshot();
      // Keep only free-floating stickies fixed; everything else rejoins the layout.
      org.pinned = org.pinned.filter(id => nodeById(id)?.type === 'text' && !canvas.edges.some(e => e.fromNode === id || e.toNode === id));
      scheduleSave(); fitted = false; rebuild(1);
    });
    on('#mKw', newKeyword);
    on('#mSticky', () => { const [x, y] = viewCenter(); newSticky(x - 110, y - 70); });
    on('#mFit', fit);
    on('#mUndo', () => history(undo, redo));
    main.querySelector('#mShared').onchange = e => { showShared = e.target.checked; drawEdges(); };
    main.querySelector('#mFloat').onchange = e => {
      if (e.target.checked) delete org.float; else org.float = false;
      if (!viewOnly()) scheduleSave();
      rebuild(e.target.checked ? 0.3 : undefined);
    };
    applyView();
  }
  await syncFromDisk();
  if (root !== main || !main.isConnected) return;
  main.querySelector('#mFloat').checked = floating();
  const added = ensureKeywordNodes();
  if (first || added) {
    rebuild(added ? 0.7 : 0.3);
    if (first && !fitted) requestAnimationFrame(fit);
  } else rebuild();
}

export function leaveMap(main) {
  if (root === main) { finishEditing(); sim?.stop(); sim = null; simKey = ''; root = null; }
  main.classList.remove('wide');
}
