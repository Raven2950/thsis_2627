// What the AI does for the repository. Everything except `recall` lands in the inbox first.
import { store } from './store.js';
import { KIND, isEmpty } from './model.js';
import { asList, linkTarget } from './note.js';
import { complete, completeJSON } from './ai.js';
import { verify } from './verify.js';

const SYSTEM = `You help a design-research student (UX, disability, assistive technology) keep a thesis repository.
Never invent facts: if you are not sure a value is right, use null. Write summaries and reasons in Simplified Chinese;
keep titles and names in their original language.`;

export function section(body, heading) {
  const m = body.match(new RegExp(`^##\\s*${heading}\\s*$([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, 'm'));
  return m ? m[1].trim() : '';
}

function researchContext() {
  const dir = store.byKind(KIND.direction)[0];
  const qs = store.byKind(KIND.question).map(q => `- ${q.name}：${q.data.question || ''}`).join('\n');
  const cs = store.byKind(KIND.concept).filter(c => c.data.status !== '放弃')
    .map(c => `- ${c.name}${c.data.definition ? `：${c.data.definition}` : ''}`).join('\n');
  return `研究方向：${dir ? dir.body.replace(/\[\[|\]\]/g, '').trim().slice(0, 900) : '（未写）'}\n\n研究问题：\n${qs || '（还没有）'}\n\n已有概念：\n${cs || '（还没有）'}`;
}

function itemBrief(n) {
  const d = n.data;
  return [
    `标题：${d.title || n.name}`, d.creator && `作者/机构：${d.creator}`, d.year && `年份：${d.year}`,
    d.type && `类型：${d.type}`, d.url && `链接：${d.url}`, d.why && `我为什么存它：${d.why}`,
    d.summary && `简介：${d.summary}`, section(n.body, '我得到了什么') && `我得到了什么：${section(n.body, '我得到了什么').slice(0, 1200)}`,
    asList(d.concepts).length && `概念：${asList(d.concepts).map(linkTarget).join('、')}`,
  ].filter(Boolean).join('\n');
}

// The model often echoes the 【】 we wrap names in, or gives the title instead of the file name.
function resolveItem(ref) {
  const t = String(ref || '').replace(/[【】[\]]/g, '').trim();
  const hit = store.resolve(t);
  if (hit?.data.kind === KIND.item) return hit;
  const low = t.toLowerCase();
  return store.items().find(n => String(n.data.title || '').toLowerCase() === low) || null;
}

const pendingFor = (kind, path) => store.inbox().filter(e => e.kind === kind && e.target === path);

/* ---------- 补全信息 ---------- */
export async function enrich(note) {
  const types = store.vocab('type').join(' / ');
  const { data, model } = await completeJSON({
    system: `${SYSTEM}\nReply with only JSON.`,
    prompt: `补全这份材料的基础信息。\n\n${itemBrief(note)}\n\n返回 JSON：{"creator": 作者或机构, "year": 年份数字, "type": 从「${types}」里选一个, "url": 只有你确定是官方页面时才填, "summary": 2-3 句中文，说明它是什么、主要讲了什么}`,
    temperature: 0.2,
  });
  const v = await verify({ title: note.data.title || note.name, creator: data.creator || note.data.creator, type: data.type || note.data.type });
  const fields = {}, origins = {};
  for (const f of ['creator', 'year', 'type', 'url', 'summary']) {
    const fromSource = v.status === 'verified' && !isEmpty(v.fields?.[f]) ? v.fields[f] : null;
    const value = fromSource ?? data[f];
    if (isEmpty(value) || String(value) === String(note.data[f] ?? '')) continue;
    fields[f] = value;
    origins[f] = fromSource != null ? 'source' : 'ai';
  }
  if (!Object.keys(fields).length) return 0;
  await store.removeInbox(pendingFor('enrich', note.path).map(e => e.id));
  await store.addInbox([{ kind: 'enrich', target: note.path, model, payload: { fields, origins, verify: { status: v.status, by: v.by } } }]);
  return 1;
}

/* ---------- 建议概念 ---------- */
export async function suggestConcepts(note) {
  const have = new Set(asList(note.data.concepts).map(v => store.resolve(v)?.name || linkTarget(v)));
  const { data, model } = await completeJSON({
    system: `${SYSTEM}\nReply with only JSON.`,
    prompt: `${researchContext()}\n\n---\n这份材料：\n${itemBrief(note)}\n\n根据「我为什么存它」和内容，给它挑 2-4 个概念标签。优先用「已有概念」里的名字（一字不改）；需要新概念时，用 2-8 个字的中文名词短语。\n不要重复它已经有的：${[...have].join('、') || '（无）'}\n\n返回 JSON：{"concepts": [{"name": "...", "existing": true/false, "reason": "一句话：为什么它属于这个概念"}]}`,
    temperature: 0.5,
  });
  const queued = new Set(pendingFor('concept', note.path).map(e => e.payload.name));
  const out = asList(data.concepts).filter(c => c?.name && !have.has(c.name) && !queued.has(c.name)).slice(0, 4)
    .map(c => ({ kind: 'concept', target: note.path, model, payload: { name: c.name.trim(), existing: !!store.resolve(c.name), reason: c.reason || '' } }));
  if (out.length) await store.addInbox(out);
  return out.length;
}

/* ---------- 建议关联 ---------- */
export async function suggestLinks(note) {
  const others = store.items().filter(n => n !== note);
  if (!others.length) return 0;
  const types = store.vocab('link_type');
  const { data, model } = await completeJSON({
    system: `${SYSTEM}\nReply with only JSON.`,
    prompt: `这份材料：\n${itemBrief(note)}\n\n---\n仓库里的其他材料（名字在【】里）：\n${others.map(o => `【${o.name}】${o.data.title || ''}｜${o.data.why || o.data.summary || ''}`).join('\n')}\n\n找出和它关系最明确的 0-3 份（没有就返回空数组，宁缺毋滥）。关系类型只能是：${types.join(' / ')}。\n\n返回 JSON：{"links": [{"target": "【】里的名字，一字不改", "type": "...", "reason": "一句话说清楚它们具体怎么相关"}]}`,
    temperature: 0.4,
  });
  const existing = new Set(store.linksOf(note).map(l => l.to?.name));
  const queued = new Set(pendingFor('link', note.path).map(e => e.payload.to));
  const out = asList(data.links)
    .map(l => ({ ...l, hit: resolveItem(l?.target) }))
    .filter(l => l.hit && l.hit !== note && !existing.has(l.hit.name) && !queued.has(l.hit.name))
    .map(l => ({ kind: 'link', target: note.path, model, payload: { to: l.hit.name, type: types.includes(l.type) ? l.type : types.at(-1), reason: l.reason || '' } }));
  if (out.length) await store.addInbox(out);
  return out.length;
}

/* ---------- 回忆 ---------- */
export function related(note) {
  const mine = new Set(asList(note.data.concepts).map(v => store.resolve(v)).filter(Boolean));
  const out = new Map();
  for (const n of store.items()) {
    if (n === note) continue;
    const shared = asList(n.data.concepts).map(v => store.resolve(v)).filter(c => c && mine.has(c));
    if (shared.length) out.set(n, `共享概念：${shared.map(c => c.name).join('、')}`);
  }
  for (const l of store.linksOf(note)) if (l.to) out.set(l.to, `${l.type}：${l.reason}`);
  for (const l of store.allLinks()) if (l.to === note) out.set(l.from, `${l.type}（反向）：${l.reason}`);
  return out;
}

export async function recall(note) {
  const rel = [...related(note)].map(([n, why]) => `- ${n.data.title || n.name}（${why}）`).join('\n');
  const { text } = await complete({
    system: SYSTEM,
    prompt: `${researchContext()}\n\n---\n我忘了这份材料是干嘛的，请帮我回忆。\n\n${itemBrief(note)}\n\n和它有关的材料：\n${rel || '（还没有）'}\n\n用中文 Markdown 写，简短，分四小节（### 标题）：这是什么 / 我当时为什么存它（只根据我写的「为什么」，没写就直说没写，不要替我编）/ 它和我的哪些材料、哪个研究问题有关 / 下一步可以做什么。`,
    temperature: 0.3, maxTokens: 1500,
  });
  return text.replace(/^```(?:markdown)?\s*|\s*```$/g, '').trim();
}

/* ---------- 推荐新材料 ---------- */
export const TUNE_DEFAULTS = { count: 4, obscurity: 30, wildness: 0.7, distance: 20, types: [] };

export function buildRecommendPrompt(seed, tune) {
  const items = seed.items.map(p => store.get(p)).filter(Boolean);
  const existing = store.items().map(n => n.data.title || n.name);
  const want = [
    seed.concepts.length && `概念：${seed.concepts.join('、')}`,
    seed.question && `研究问题：${seed.question}`,
    items.length && `和这些材料一起看：\n${items.map(itemBrief).join('\n---\n')}`,
    seed.note && `补充说明：${seed.note}`,
  ].filter(Boolean).join('\n\n');
  return `${researchContext()}\n\n---\n请推荐 ${tune.count} 份我还没有的材料，围绕：\n${want}\n\n` +
    `要求：\n- 知名度：${tune.obscurity}/100（0 = 领域里人人都读的经典，100 = 冷门但真实存在的东西）\n` +
    `- 离核心研究问题的距离：${tune.distance}/100（0 = 直接回答问题，100 = 来自别的领域、能带来新视角）\n` +
    `- 类型：${tune.types.length ? tune.types.join(' / ') : '不限（书、论文、报告、产品、艺术作品、展览、视频、代码作品都可以）'}，type 字段从「${store.vocab('type').join(' / ')}」里选\n` +
    `- 必须是真实存在的东西，标题和作者要准确，不确定就不要推荐\n- 不要推荐这些已有的：${existing.join('；')}\n\n` +
    `返回 JSON：{"recommendations": [{"title": "", "creator": "", "year": 数字或null, "type": "", "summary": "一两句中文：它是什么", "reason": "一句中文：为什么对我的 thesis 有用、补了什么", "concepts": ["相关概念名，优先用已有概念"], "url": "确定时才填，否则 null"}]}`;
}

export async function recommend(seed, tune) {
  const prompt = buildRecommendPrompt(seed, tune);
  const { data, model } = await completeJSON({
    system: `${SYSTEM}\nReply with only JSON.`, prompt, temperature: tune.wildness, maxTokens: Math.max(2048, 400 * tune.count + 400),
  });
  const known = new Set(store.items().map(n => (n.data.title || n.name).toLowerCase()));
  const recs = asList(data.recommendations).filter(r => r?.title && !known.has(r.title.toLowerCase()));
  const checked = await Promise.all(recs.map(async r => ({ ...r, verify: await verify(r).catch(() => ({ status: 'unavailable' })) })));
  // A book or paper the catalogues cannot find is most likely made up: leave it out, but say so.
  const kept = checked.filter(r => r.verify.status !== 'not_found');
  const leftOut = checked.filter(r => r.verify.status === 'not_found').map(r => `${r.title}（${r.creator || '?'}）`);
  const request = { seed, tune, model };
  if (kept.length) await store.addInbox(kept.map(r => ({ kind: 'item', model, payload: r, request })));
  return { added: kept.length, leftOut };
}

/* ---------- 缺口：AI 看结构以外的东西 ---------- */
export async function aiGaps(counts) {
  const inventory = store.items().map(n => `- ${n.data.title || n.name}｜${n.data.type || ''}｜${n.data.why || n.data.summary || ''}`).join('\n');
  const tally = list => list.map(x => `${x.name}:${x.items.length}`).join('，');
  const { data, model } = await completeJSON({
    system: `${SYSTEM}\nReply with only JSON.`,
    prompt: `${researchContext()}\n\n---\n我现有的材料：\n${inventory}\n\n计数：概念 ${tally(counts.concepts) || '无'}；研究问题 ${tally(counts.questions)}；角色 ${tally(counts.roles)}；声音来源 ${tally(counts.voices)}。\n\n` +
      `请指出这批材料在结构计数之外的缺口：比如覆盖了哪些障碍类型、漏了哪些；材料性质是否都偏「描述现状」而缺批判、理论或可拆解的具体产品案例；是谁在说话（机构 vs 当事人）。` +
      `只说有根据的观察，3-6 条。\n\n返回 JSON：{"gaps": [{"title": "短标题", "detail": "一两句：根据什么看出来的", "ask": "如果要补，推荐时该怎么描述想要的材料（一句话）"}]}`,
    temperature: 0.4,
  });
  return { gaps: asList(data.gaps), model };
}

/* ---------- 第一批关键词：读全部材料，提出一套关键词 ---------- */
// Earlier (claude.ai) analysis of the Notion material suggested these; offered to the model as hints only.
const EARLIER_CANDIDATES = ['成本与获取门槛', '上手培训与持续支持', '个性化与自定义', 'AI 隐私与信任', '沟通环境与社会情境',
  '数字服务本身不可用', '软件优先 vs 硬件', '身份与声音', '用户参与设计', '污名化 vs 赋权', '独立 vs 依赖'];

export async function summarizeKeywords() {
  const items = store.items();
  const existing = store.byKind(KIND.concept).map(c => c.name);
  const { data, model } = await completeJSON({
    system: `${SYSTEM}\nReply with only JSON.`,
    prompt: `${researchContext()}\n\n---\n我的材料（名字在【】里）：\n${items.map(n => `【${n.name}】${n.data.title || ''}｜类型：${n.data.type || '?'}｜为什么存：${n.data.why || '（没写）'}｜简介：${n.data.summary || ''}`).join('\n')}\n\n` +
      `请为这个仓库总结一批关键词（8-14 个），用来在一张关键词地图上组织我的思路。\n` +
      `- 关键词是 2-8 个字的中文名词短语，可以是主题、张力（如「A vs B」）、方法或现象\n` +
      `- 每个关键词列出属于它的材料（【】里的名字，一字不改）\n` +
      `- 我的研究问题关心、但现在还没有材料的关键词也要提出来，items 留空：这些就是缺口\n` +
      `- 已有关键词不要重复：${existing.join('、') || '（无）'}\n` +
      `- 之前一次分析提过这些候选，可以参考、改名或不用：${EARLIER_CANDIDATES.join('、')}\n\n` +
      `返回 JSON：{"keywords": [{"name": "", "definition": "一句话说明这个关键词在我的研究里指什么", "items": ["材料名"], "reason": "一句话：为什么值得单独成为一个关键词"}]}`,
    temperature: 0.4, maxTokens: 4096,
  });
  const queued = new Set(store.inbox().filter(e => e.kind === 'keyword').map(e => e.payload.name));
  const out = asList(data.keywords)
    .map(k => ({ ...k, name: String(k?.name || '').replace(/[【】]/g, '').trim() }))
    .filter(k => k.name && !store.resolve(k.name) && !queued.has(k.name))
    .map(k => ({
      kind: 'keyword', model,
      payload: { name: k.name.trim(), definition: k.definition || '', reason: k.reason || '',
        items: [...new Set(asList(k.items).map(i => resolveItem(i)?.path).filter(Boolean))] },
    }));
  if (out.length) await store.addInbox(out);
  return out.length;
}

/* ---------- 整理关键词地图：分组 + 关键词之间的关系 ---------- */
export async function organizeKeywords(concepts, previous = []) {
  const lines = concepts.map(c => {
    const items = store.itemsOf(c).map(n => n.data.title || n.name);
    return `【${c.name}】${c.data.definition ? `定义：${c.data.definition}｜` : ''}材料：${items.join('；') || '（还没有）'}`;
  }).join('\n');
  const { data, model } = await completeJSON({
    system: `${SYSTEM}\nReply with only JSON.`,
    prompt: `${researchContext()}\n\n---\n我关键词地图上的关键词（名字在【】里）：\n${lines}\n\n` +
      `请帮我整理这张地图：\n1. 把关键词分成 3-6 组，每组起一个简短的中文组名（2-8 字），说明这组在我的研究里代表什么。每个关键词只放一组。` +
      `${previous.length ? `\n   之前的分组是：${previous.map(g => `${g.name}（${g.keywords.join('、')}）`).join('；')}。合理的话尽量沿用组名，让地图保持稳定。` : ''}\n` +
      `2. 找出关键词之间最值得画出来的 4-10 条关系（因果、张力、前提、包含、对立……），每条用 2-6 个字的标签。只画有根据的，不要为了凑数。\n\n` +
      `返回 JSON：{"groups": [{"name": "", "keywords": ["【】里的名字"], "note": "一句话"}], "relations": [{"from": "关键词", "to": "关键词", "label": "标签", "reason": "一句话"}]}`,
    temperature: 0.3, maxTokens: 4096,
  });
  const byName = name => {
    const t = String(name || '').replace(/[【】]/g, '').trim();
    return concepts.find(c => c.name === t) || null;
  };
  const groups = asList(data.groups).map(g => ({
    name: String(g.name || '').trim(), note: g.note || '',
    members: [...new Set(asList(g.keywords).map(byName).filter(Boolean).map(c => c.path))],
  })).filter(g => g.name && g.members.length);
  const relations = asList(data.relations).map(r => ({ from: byName(r.from), to: byName(r.to), label: String(r.label || '').trim(), reason: r.reason || '' }))
    .filter(r => r.from && r.to && r.from !== r.to).map(r => ({ ...r, from: r.from.path, to: r.to.path }));
  return { groups, relations, model };
}

/* ---------- 收录：从文件内容或链接里认出这是什么 ---------- */
export async function identify({ text, fileName, url }) {
  const types = store.vocab('type').join(' / ');
  const source = text
    ? `文件名：${fileName}\n\n文件开头的文字（可能有排版噪音）：\n${text.slice(0, 7000)}`
    : `只有一个链接（我无法读取网页内容）：${url}`;
  const { data } = await completeJSON({
    system: `${SYSTEM}\nReply with only JSON.`,
    prompt: `${source}\n\n认出这是什么材料。${text ? '只根据上面的文字判断，' : '只有链接时，只填你确定的；不确定的一律 null，'}不要编造。\n` +
      `返回 JSON：{"title": 原文标题, "creator": 作者或机构, "year": 年份数字, "type": 从「${types}」里选一个, "summary": 2-3 句中文：它是什么、主要讲什么}`,
    temperature: 0.1,
  });
  return data;
}
