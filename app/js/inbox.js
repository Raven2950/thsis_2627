// Keep / cancel for AI candidates. Keeping writes into the notes; cancelling just drops the entry.
import { store } from './store.js';
import { KIND, FOLDER, today, isEmpty } from './model.js';
import { asList, toLink, linkTarget } from './note.js';

export const INBOX_KIND_LABEL = { keyword: '建议关键词', enrich: '补全信息', concept: '建议概念', link: '建议关联', item: '推荐材料' };

// What keeping an entry would add to the map, shown before deciding.
export function preview(entry) {
  if (entry.kind === 'item') {
    const concepts = asList(entry.payload.concepts).map(name => {
      const c = store.resolve(name);
      const items = c ? store.items().filter(n => asList(n.data.concepts).some(v => store.resolve(v) === c)) : [];
      return { name: c?.name || name, exists: !!c, items };
    });
    return { concepts };
  }
  if (entry.kind === 'concept') {
    const c = store.resolve(entry.payload.name);
    const items = c ? store.items().filter(n => asList(n.data.concepts).some(v => store.resolve(v) === c)) : [];
    return { exists: !!c, items };
  }
  return {};
}

const addConceptLinks = async (path, names) => {
  const targets = [];
  for (const name of names) targets.push(await store.ensureNote(KIND.concept, name));
  await store.update(path, data => {
    const have = asList(data.concepts);
    const add = targets.filter(t => !have.some(v => store.resolve(v) === t)).map(t => toLink(t.name));
    data.concepts = [...have, ...add];
  });
};

// `extra` carries what I add when keeping (e.g. my own "why" for a recommended item,
// or the subset of fields I accept from an enrichment).
export async function keep(entry, extra = {}) {
  const p = entry.payload;
  if (entry.kind === 'enrich') {
    const accept = extra.fields || Object.keys(p.fields);
    await store.update(entry.target, data => {
      for (const f of accept) {
        data[f] = p.fields[f];
        const key = p.origins[f] === 'source' ? 'from_source' : 'from_ai';
        for (const k of ['from_ai', 'from_source', 'confirmed']) data[k] = asList(data[k]).filter(x => x !== f);
        data[key] = [...asList(data[key]), f];
      }
    });
  }
  if (entry.kind === 'concept') await addConceptLinks(entry.target, [p.name]);
  if (entry.kind === 'keyword') {
    const concept = await store.ensureNote(KIND.concept, p.name);
    if (p.definition) await store.update(concept.path, (data, body) => ({
      body: `${body.replace(/\s*$/, '')}\n\n> [!ai] AI 对这个关键词的说明（${entry.model || 'AI'}）\n> ${p.definition}\n> \n> ${p.reason || ''}\n`,
    }));
    for (const path of asList(p.items).filter(path => store.get(path))) await addConceptLinks(path, [concept.name]);
    await store.removeInbox(entry.id);
    return concept;
  }
  if (entry.kind === 'link') {
    const to = store.resolve(p.to);
    if (!to) throw new Error(`找不到「${p.to}」`);
    await store.addLink(entry.target, { type: p.type, target: to.name, reason: p.reason, ai: true });
  }
  if (entry.kind === 'item') {
    if (isEmpty(extra.why)) throw new Error('收录前要先写「为什么存它」');
    const fromSource = p.verify?.status === 'verified' ? Object.keys(p.verify.fields || {}).filter(f => !isEmpty(p.verify.fields[f])) : [];
    const f = { ...p, ...(p.verify?.status === 'verified' ? Object.fromEntries(fromSource.map(k => [k, p.verify.fields[k]])) : {}) };
    const aiFields = ['creator', 'year', 'type', 'url', 'summary'].filter(k => !isEmpty(f[k]) && !fromSource.includes(k));
    const note = await store.create(store.uniquePath(FOLDER[KIND.item], f.title), {
      kind: KIND.item, title: f.title, creator: f.creator || null, year: f.year || null, url: f.url || null,
      type: f.type || null, why: extra.why, status: store.vocab('status')[0] || null, importance: null,
      roles: [], voice: null, concepts: [], questions: [], parent: null, summary: f.summary || null,
      from_ai: aiFields, from_source: fromSource, confirmed: [], created: today(), read: null,
    }, `\n> [!ai] AI 推荐理由（${entry.model || 'AI'}）\n> ${p.reason || ''}\n\n## 我得到了什么\n\n\n## 待解决的问题\n\n- \n`);
    await addConceptLinks(note.path, asList(p.concepts).map(linkTarget).filter(Boolean));
    await store.removeInbox(entry.id);
    return note;
  }
  await store.removeInbox(entry.id);
}

export const cancel = entry => store.removeInbox(entry.id);
