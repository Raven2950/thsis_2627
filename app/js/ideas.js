// Idea cards: a note per idea (想法/), linked to the materials and brainstorm it came from.
import { store } from './store.js';
import { KIND, FOLDER, IDEA_STAGES, today } from './model.js';
import { asList, toLink, linkTarget } from './note.js';

export const ideas = () => store.byKind(KIND.idea);

export async function createIdea({ idea, forWhom = '', next = '', sources = [], from = null, stage = IDEA_STAGES[0] }) {
  const text = String(idea || '').trim();
  if (!text) throw new Error('先用一句话写下这个想法');
  const names = [...new Set(sources.map(s => store.resolve(s)?.name || linkTarget(s)).filter(Boolean))];
  return store.create(store.uniquePath(FOLDER[KIND.idea], text.slice(0, 40)), {
    kind: KIND.idea, idea: text, stage, for_whom: forWhom || null, next: next || null,
    sources: names.map(toLink), from: from ? toLink(from) : null, created: today(),
  }, '\n## 展开想想\n\n\n## 下一步\n\n- \n');
}

export const setStage = (path, stage) => store.update(path, d => { d.stage = stage; });

// Put an idea card on the keyword map, joined to the sources that are already there.
export async function placeOnMap(note) {
  const canvas = await store.readMap();
  if (canvas.nodes.some(n => n.type === 'file' && n.file === note.path)) return false;
  const srcPaths = asList(note.data.sources).map(s => store.resolve(s)?.path).filter(Boolean);
  const onMap = canvas.nodes.filter(n => n.type === 'file' && srcPaths.includes(n.file));
  const anchor = onMap[0] || canvas.nodes.find(n => n.type === 'file');
  const id = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');
  canvas.nodes.push({ id, type: 'file', file: note.path, x: Math.round((anchor?.x ?? 0) + 60), y: Math.round((anchor?.y ?? 0) - 160), width: 260, height: 100 });
  for (const n of onMap) canvas.edges.push({ id: `${id}-${n.id}`.slice(0, 32), fromNode: n.id, toNode: id, toEnd: 'arrow', label: '启发' });
  await store.writeMap(canvas);
  return true;
}

// Two materials that do not obviously belong together, preferring the ones I reacted to.
export function collisionPair() {
  const items = store.items();
  if (items.length < 2) return [];
  const weight = n => 1 + (n.data.like ? 3 : 0) + (n.data.star ? 1 : 0) + (n.data.why ? 1 : 0) + (/## 我得到了什么\s*\n\s*\S/.test(n.body) ? 2 : 0);
  const pick = (pool, avoid) => {
    const c = pool.filter(n => n !== avoid);
    let r = Math.random() * c.reduce((a, n) => a + weight(n), 0);
    for (const n of c) { r -= weight(n); if (r <= 0) return n; }
    return c[0];
  };
  const a = pick(items);
  const concepts = n => new Set(asList(n.data.concepts).map(v => store.resolve(v)?.path));
  const ca = concepts(a);
  const far = items.filter(n => n !== a && ![...concepts(n)].some(p => ca.has(p)));
  return [a, pick(far.length ? far : items, a)];
}
