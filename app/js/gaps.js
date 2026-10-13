// Gap counting, no AI: how much material sits under each concept / question / role / voice.
import { store } from './store.js';
import { KIND, isEmpty, unconfirmed } from './model.js';
import { asList } from './note.js';

export const level = n => n === 0 ? 'empty' : n === 1 ? 'thin' : n <= 3 ? 'mid' : 'thick';
export const LEVEL_LABEL = { empty: '空', thin: '薄', mid: '中', thick: '厚' };

const linkedTo = (field, note) => store.items().filter(n => asList(n.data[field]).some(v => store.resolve(v) === note));
const countBy = (field, values) => {
  const items = store.items();
  const all = [...new Set([...values, ...items.flatMap(n => asList(n.data[field]))])];
  return all.map(v => ({ name: v, items: items.filter(n => asList(n.data[field]).includes(v)) }));
};

export function computeGaps() {
  const items = store.items();
  const byCount = (a, b) => a.items.length - b.items.length;
  return {
    total: items.length,
    concepts: store.byKind(KIND.concept).filter(c => c.data.status !== '放弃')
      .map(c => ({ name: c.name, note: c, items: linkedTo('concepts', c) })).sort(byCount),
    questions: store.byKind(KIND.question)
      .map(q => ({ name: q.name, note: q, text: q.data.question, items: linkedTo('questions', q) })).sort((a, b) => a.name.localeCompare(b.name)),
    roles: countBy('roles', store.vocab('roles')).sort(byCount),
    voices: countBy('voice', store.vocab('voice')).sort(byCount),
    types: countBy('type', []).sort((a, b) => b.items.length - a.items.length),
    housekeeping: [
      { name: '还没写「为什么存它」', items: items.filter(n => isEmpty(n.data.why)) },
      { name: '没有概念', items: items.filter(n => isEmpty(n.data.concepts)) },
      { name: '没挂到研究问题', items: items.filter(n => isEmpty(n.data.questions)) },
      { name: '有 AI 内容待确认', items: items.filter(n => unconfirmed(n.data).length) },
      { name: '想读但还没读', items: items.filter(n => n.data.status === store.vocab('status')[0]) },
    ],
  };
}
