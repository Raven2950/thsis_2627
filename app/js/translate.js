// English versions of my own writing (Chinese → English only). Every Chinese text I wrote is a key in
// _系统/译文.json; only texts without a translation are sent to the model, a few per request, so
// re-running after small edits costs a request or two. Visitors read the stored English: no AI calls.
import { store } from './store.js';
import { KIND } from './model.js';
import { DEFAULT_VOCAB } from './model.js';
import { completeJSON } from './ai.js';

const CJK = /[㐀-鿿]/;
const SKIP_KINDS = new Set([KIND.vocab, '说明']);
const BUILTIN = new Set(Object.values(DEFAULT_VOCAB).flat());   // the interface table already covers these

// Every Chinese text that can appear on the page and is mine, not the interface's.
export async function collect() {
  const out = new Set();
  const add = (s, raw = false) => { if (typeof s === 'string' && CJK.test(s)) out.add(raw ? s : s.trim()); };
  for (const n of store.all()) {
    if (SKIP_KINDS.has(n.data.kind) || n.path.startsWith('私密/')) continue;
    add(n.name);
    for (const f of ['title', 'why', 'summary', 'definition', 'question', 'creator']) add(n.data[f]);
    if (CJK.test(n.body)) add(n.body, true);
  }
  const [map, org] = await Promise.all([store.readMap(), store.readMapOrg()]);
  for (const node of map.nodes) if (node.type === 'text') add(node.text, true);
  for (const e of map.edges) add(e.label);
  for (const g of org?.groups || []) { add(g.name); add(g.note); }
  for (const r of Object.values(org?.reasons || {})) add(r);
  for (const field of Object.keys(DEFAULT_VOCAB)) for (const v of store.vocab(field)) if (!BUILTIN.has(v)) add(v);
  // Ideas, "where I stopped", map bubbles and AI suggestions waiting in the inbox: visitors can use these pages too.
  for (const n of store.all()) for (const f of ['idea', 'for_whom', 'next', 'resume']) add(n.data[f]);
  for (const b of org?.bubbles || []) { add(b.name); add(b.note); }
  const walk = v => (typeof v === 'string' ? add(v) : v && typeof v === 'object' && Object.values(v).forEach(walk));
  for (const e of store.inbox()) { add(e.model); walk(e.payload); }
  for (const path of store.filesIn('灵感板/').filter(p => p.endsWith('.canvas'))) {
    add(path.split('/').pop().replace(/\.canvas$/, ''));
    const c = await store.readJson(path, { nodes: [], edges: [] });
    for (const n of c.nodes || []) { if (n.type === 'text') add(n.text, true); add(n.label); }
    for (const e of c.edges || []) add(e.label);
  }
  return out;
}

export async function pendingTexts() {
  const have = store.translations();
  return [...await collect()].filter(s => !have[s]);
}

const links = s => (s.match(/!?\[\[[^\]]+\]\]/g) || []).sort().join('\n');
// Models like to translate the note names inside [[links]]; hand them numbered stand-ins instead
// and put the real links back afterwards.
const LINK = /!?\[\[[^\]]+\]\]/g;
const mask = s => { const found = []; return { text: s.replace(LINK, m => `⟦${found.push(m)}⟧`), found }; };
const unmask = (s, found) => s.replace(/⟦(\d+)⟧/g, (m, i) => found[i - 1] ?? m);

const SYSTEM = `You translate a design-research student's thesis notes from Chinese into natural, concise academic English.
Reply with only JSON.`;
const RULES = `Rules:
- Keep Markdown structure exactly (headings, lists, quotes, line breaks).
- Copy every ⟦n⟧ marker unchanged and keep it in place: each stands for a link.
- Keep the heading "## 关联" exactly as it is. In lines like "- 类型 → [[目标]]：理由", translate 类型 and 理由, keep the arrow and the link.
- Keep callout markers like "> [!ai]" and translate the text after them.
- Keep English text, names, titles of works, URLs and numbers as they are.
- Fixed headings: 我得到了什么 → What I took away; 待解决的问题 → Open questions; 我目前的想法 → Current thinking; 演变 → How it evolved.
- Short items (keywords, group names, labels) stay short noun phrases.`;

function batches(texts, budget = 2500) {
  const out = [];
  let cur = [], size = 0;
  for (const t of texts) {
    if (cur.length && (size + t.length > budget || cur.length >= 30)) { out.push(cur); cur = []; size = 0; }
    cur.push(t); size += t.length;
  }
  if (cur.length) out.push(cur);
  return out;
}

// onProgress(done, total). Returns { translated, failed }.
export async function translatePending(onProgress = () => {}) {
  const texts = await pendingTexts();
  const groups = batches(texts);
  const result = { ...store.translations() };
  let translated = 0;
  const failed = [];
  for (let i = 0; i < groups.length; i++) {
    onProgress(i, groups.length);
    const group = groups[i];
    const masked = group.map(mask);
    const input = Object.fromEntries(masked.map((m, j) => [String(j + 1), m.text]));
    const chars = group.reduce((a, t) => a + t.length, 0);
    try {
      const { data } = await completeJSON({
        system: SYSTEM,
        prompt: `${RULES}\n\nTranslate each value of this JSON object. Return a JSON object with the same keys and the English as values.\n\n${JSON.stringify(input, null, 1)}`,
        temperature: 0.2, maxTokens: Math.min(16000, Math.round(chars * 3) + 800),
      });
      group.forEach((src, j) => {
        const raw = data?.[String(j + 1)];
        const en = typeof raw === 'string' ? unmask(raw, masked[j].found) : raw;
        // A translation that lost or changed a link would break navigation: leave that one for next time.
        if (typeof en === 'string' && en.trim() && links(en) === links(src)) { result[src] = en; translated++; }
        else failed.push(src);
      });
    } catch (e) {
      failed.push(...group);
      if (i === 0) throw e;          // nothing worked at all: report it
    }
    await store.saveTranslations(prune(result, await collect()));
  }
  onProgress(groups.length, groups.length);
  return { translated, failed };
}

// Drop translations of texts that no longer exist, so the file does not grow forever.
function prune(t, current) {
  return Object.fromEntries(Object.entries(t).filter(([k]) => current.has(k)));
}
