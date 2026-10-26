// One note, fully editable. For a 材料 note: what it is, why I saved it, where each field came from.
// Other notes (研究问题, 概念, 方向) get a plain page plus everything that links to them.
import { store, ConflictError } from '../store.js';
import { viewOnly, trc, isEn } from '../i18n.js';
import { KIND, FIELD_LABEL, originOf, isEmpty, unconfirmed, today } from '../model.js';
import { esc, noteHref, renderMarkdown } from '../markdown.js';
import { asList, linkTarget, toLink } from '../note.js';
import { toast, selectHtml, bindSelect, ask } from '../ui.js';
import { enrich, suggestConcepts, suggestLinks, recall, related } from '../tasks.js';
import { openRecommend } from './recommend.js';
import { parseLinks } from '../links.js';
import { marksHtml, bindMarks, setPlan } from '../marks.js';
import { IDEA_STAGES } from '../model.js';
import { vaultUrl, hydrate } from '../media.js';

const ORIGIN_LABEL = { me: '我', source: '原文', ai: 'AI' };
const drafts = new Map();            // path -> body being edited: { text, base }
const recalls = new Map();           // path -> AI recall text (not saved unless I choose to)
const busy = new Set();              // AI actions running, as `${path}|${action}`

const run = p => p.then(() => toast('已保存到笔记')).catch(e => toast(e.message, true));

function originBadge(data, field) {
  if (isEmpty(data[field])) return '';
  const { origin, confirmed } = originOf(data, field);
  if (origin === 'me') return '';
  return `<span class="badge ${origin}${confirmed ? ' confirmed' : ''}" title="${confirmed ? '已确认' : '未确认'}">${ORIGIN_LABEL[origin]}${confirmed ? ' ✓' : ''}</span>`;
}

const dropFrom = (data, key, field) => {
  if (Array.isArray(data[key])) data[key] = data[key].filter(f => f !== field);
};

// Writing a field myself makes it mine: it leaves from_ai / from_source / confirmed.
function setField(path, field, value) {
  return store.update(path, data => {
    data[field] = isEmpty(value) ? null : value;
    for (const k of ['from_ai', 'from_source', 'confirmed']) dropFrom(data, k, field);
    if (field === 'status' && ['读过', '用过'].includes(value) && isEmpty(data.read)) data.read = today();
  });
}

const confirmField = (path, field) => store.update(path, data => {
  data.confirmed = [...new Set([...asList(data.confirmed), field])];
});

// Notes whose properties or body link to this note.
function backlinks(note) {
  const re = /\[\[([^\]|#]+)/g;
  return store.all().filter(n => n !== note && (
    JSON.stringify(n.data).match(re)?.some(m => store.resolve(m.slice(2)) === note) ||
    [...n.body.matchAll(re)].some(m => store.resolve(m[1]) === note)));
}

function backlinkSection(note) {
  const back = backlinks(note);
  if (!back.length) return '';
  return `<section class="backlinks"><h2>链接到这里的笔记 <span class="count">${back.length}</span></h2><ul>
    ${back.map(n => `<li><a href="${noteHref(n.name)}">${esc(n.data.title || n.name)}</a>
      <span class="muted">${esc(n.data.kind || '')}</span></li>`).join('')}</ul></section>`;
}

const obsidianLink = note => (store.vault.published ? '' : `<a class="obsidian" href="${obsidianUrl(note)}">在 Obsidian 中打开 ↗</a>`);
const obsidianUrl = note => `obsidian://open?vault=${encodeURIComponent(store.vault.name)}&file=${encodeURIComponent(note.path.replace(/\.md$/, ''))}`;

/* ---------- link picker: concepts / questions / parent ---------- */
const LINK_KIND = { concepts: KIND.concept, questions: KIND.question, parent: KIND.item };

function linkPicker(note, field, ro) {
  const values = asList(note.data[field]);
  const single = field === 'parent';
  const pool = store.byKind(LINK_KIND[field]).filter(n => n !== note).map(n => n.name);
  const chips = values.map(v => {
    const t = linkTarget(v), hit = store.resolve(v);
    return `<span class="linkchip"><a href="${noteHref(t)}" class="${hit ? '' : 'unresolved'}">${esc(hit?.data.title || t)}</a>${
      ro ? '' : `<button class="x" data-unlink="${esc(field)}" data-value="${esc(v)}" title="移除">×</button>`}</span>`;
  }).join('');
  const canAdd = !ro && !(single && values.length);
  return `<div class="links">${chips || (canAdd ? '' : '<span class="muted">—</span>')}
    ${canAdd ? `<input id="add-${field}" list="dl-${field}" data-linkadd="${field}" placeholder="${
      field === 'concepts' ? '添加概念，回车（没有的会新建）' : field === 'questions' ? '挂到研究问题…' : '选择所属合集…'}">
      <datalist id="dl-${field}">${pool.map(p => `<option value="${esc(p)}">`).join('')}</datalist>` : ''}</div>`;
}

async function addLink(note, field, name) {
  name = linkTarget(name);
  if (!name) return;
  if (field === 'parent') {
    const hit = store.resolve(name);
    if (!hit || hit.data.kind !== KIND.item) return toast(`没有叫「${name}」的材料`, true);
    return run(setField(note.path, 'parent', toLink(hit.name)));
  }
  const target = await store.ensureNote(LINK_KIND[field], name);
  const list = asList(note.data[field]);
  if (list.some(v => store.resolve(v) === target)) return;
  return run(setField(note.path, field, [...list, toLink(target.name)]));
}

/* ---------- body editor ---------- */
const withoutRelations = body => body.replace(/^## 关联\s*$[\s\S]*?(?=^##\s|(?![\s\S]))/m, '');
function bodySection(note, ro) {
  const draft = drafts.get(note.path);
  if (draft) return `<section class="body editing">
      <div class="body-bar"><span class="hint">Markdown，和 Obsidian 里写法一样。⌘/Ctrl + S 保存</span>
        <span><button id="bodyCancel">取消</button> <button class="primary" id="bodySave">保存正文</button></span></div>
      <textarea id="bodyText" spellcheck="false">${esc(draft.text)}</textarea></section>`;
  return `<section class="body markdown">
      ${ro ? '' : '<div class="body-bar"><span></span><button id="bodyEdit">编辑正文</button></div>'}
      ${renderMarkdown(withoutRelations(trc(note.body))) || '<p class="muted">（正文是空的）</p>'}</section>`;
}

function bindBody(main, note) {
  main.querySelector('#bodyEdit')?.addEventListener('click', () => {
    drafts.set(note.path, { text: note.body, base: note.body });
    renderDetail(main, note);
    main.querySelector('#bodyText')?.focus();
  });
  const ta = main.querySelector('#bodyText');
  if (!ta) return;
  const draft = drafts.get(note.path);
  const fit = () => { ta.style.height = 'auto'; ta.style.height = `${Math.max(240, ta.scrollHeight + 4)}px`; };
  fit();
  ta.addEventListener('input', () => { draft.text = ta.value; fit(); });
  const save = async (force = false) => {
    try {
      await store.update(note.path, () => ({ body: draft.text }), { expectBody: force ? null : draft.base });
      drafts.delete(note.path);
      toast('正文已保存');
      renderDetail(main, store.get(note.path));
    } catch (e) {
      if (!(e instanceof ConflictError)) return toast(e.message, true);
      const ok = confirm('这篇笔记的正文在 Obsidian 里被改过了。\n\n确定：用网页里的版本覆盖\n取消：放弃网页里的修改，载入最新版本');
      if (ok) return save(true);
      drafts.delete(note.path);
      await store.reload();
    }
  };
  ta.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save(); } });
  main.querySelector('#bodySave').addEventListener('click', () => save());
  main.querySelector('#bodyCancel').addEventListener('click', () => { drafts.delete(note.path); renderDetail(main, store.get(note.path)); });
}

/* ---------- shared wiring ---------- */
function bindCommon(main, note) {
  const ro = viewOnly();
  if (ro) return;
  for (const el of main.querySelectorAll('[data-text]'))
    el.addEventListener('change', () => run(setField(note.path, el.dataset.text, el.value.trim())));
  for (const el of main.querySelectorAll('select[data-vocab]'))
    bindSelect(el, FIELD_LABEL[el.dataset.vocab], async (value, isNew) => {
      if (isNew) await store.addVocab(el.dataset.vocab, value);
      run(setField(note.path, el.dataset.key || el.dataset.vocab, value));
    });
  for (const b of main.querySelectorAll('[data-confirm]'))
    b.addEventListener('click', () => run(confirmField(note.path, b.dataset.confirm)));
  for (const b of main.querySelectorAll('[data-unlink]'))
    b.addEventListener('click', () => {
      const field = b.dataset.unlink;
      const rest = asList(note.data[field]).filter(v => v !== b.dataset.value);
      run(setField(note.path, field, field === 'parent' ? null : rest));
    });
  for (const input of main.querySelectorAll('[data-linkadd]')) {
    const go = () => { const v = input.value.trim(); input.value = ''; if (v) addLink(note, input.dataset.linkadd, v); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); go(); } });
    // picking from the datalist fires `change` with an exact match
    input.addEventListener('change', () => { if (store.resolve(input.value)) go(); });
  }
  bindBody(main, note);
}

/* ---------- attachment (PDF, image… in 附件/) ---------- */
const previews = new Set();          // notes whose attachment preview is open

function attachmentSection(note) {
  const ref = linkTarget(note.data.file);
  if (!ref) return '';
  const path = store.resolveFile(ref);
  if (!path) return `<section class="attachment"><div class="att-bar"><span>📎 <b>${esc(ref.split('/').pop())}</b></span>
    <span class="hint">附件只在作者自己的电脑上</span></div></section>`;
  const isPdf = /\.pdf$/i.test(path), isImg = /\.(png|jpe?g|gif|webp|svg)$/i.test(path);
  const open = previews.has(note.path);
  return `<section class="attachment">
    <div class="att-bar"><span>📎 <b>${esc(path.split('/').pop())}</b></span>
      <span><button class="mini" data-attach="${esc(path)}">新窗口打开</button>
      ${isPdf || isImg ? `<button class="mini" id="attPreview">${open ? '收起预览' : '预览'}</button>` : ''}</span></div>
    ${open ? (isPdf ? '<iframe class="att-frame" title="PDF 预览"></iframe>' : '<img class="att-img" alt="附件预览">') : ''}
  </section>`;
}

function bindAttachments(main, note) {
  for (const a of main.querySelectorAll('[data-attach]')) a.addEventListener('click', async e => {
    e.preventDefault();
    try { window.open(await vaultUrl(a.dataset.attach), '_blank', 'noopener'); }
    catch (err) { toast(`打不开：${err.message}`, true); }
  });
  main.querySelector('#attPreview')?.addEventListener('click', () => {
    previews.has(note.path) ? previews.delete(note.path) : previews.add(note.path);
    renderDetail(main, store.get(note.path));
  });
  const frame = main.querySelector('.att-frame, .att-img');
  if (frame) vaultUrl(note.data.file).then(u => (frame.src = u)).catch(err => toast(`预览失败：${err.message}`, true));
  hydrate(main);
}

/* ---------- AI actions ---------- */
const AI_ACTIONS = { enrich: '补全信息', concepts: '建议概念', links: '建议关联', recall: '帮我回忆', recommend: '找类似的' };

function aiBar(note, ro) {
  if (ro) return '';
  const pending = store.inbox().filter(e => e.target === note.path).length;
  const text = recalls.get(note.path);
  return `<section class="ai-bar">
      <span class="badge ai">AI</span>
      ${Object.entries(AI_ACTIONS).map(([k, label]) => `<button class="mini" data-ai="${k}"${busy.has(`${note.path}|${k}`) ? ' disabled' : ''}>${
        busy.has(`${note.path}|${k}`) ? '…' : label}</button>`).join('')}
      ${pending ? `<a href="#/inbox" class="pending">收件箱里有 ${pending} 条关于它的建议 →</a>` : ''}
    </section>
    ${text ? `<div class="callout callout-ai recall"><div class="callout-title">回忆（AI，没有保存）</div>${renderMarkdown(text)}
      <div class="actions"><button class="mini" id="recallClose">关闭</button><button class="mini" id="recallSave">存进正文</button></div></div>` : ''}`;
}

function bindAi(main, note) {
  for (const b of main.querySelectorAll('[data-ai]')) b.addEventListener('click', async () => {
    const k = b.dataset.ai, key = `${note.path}|${k}`;
    if (k === 'recommend') return openRecommend({ items: [note.path], concepts: asList(note.data.concepts).map(linkTarget) });
    busy.add(key); renderDetail(main, store.get(note.path));
    try {
      const fresh = store.get(note.path);
      if (k === 'recall') recalls.set(note.path, await recall(fresh));
      else {
        const n = await ({ enrich, concepts: suggestConcepts, links: suggestLinks })[k](fresh);
        toast(n ? `${n} 条建议进了收件箱` : 'AI 没有新的建议');
      }
    } catch (e) { toast(e.message, true); }
    busy.delete(key);
    if (location.hash.includes(encodeURIComponent(note.path))) renderDetail(main, store.get(note.path));
  });
  main.querySelector('#recallClose')?.addEventListener('click', () => { recalls.delete(note.path); renderDetail(main, store.get(note.path)); });
  main.querySelector('#recallSave')?.addEventListener('click', () => {
    const quoted = recalls.get(note.path).split('\n').map(l => `> ${l}`).join('\n');
    run(store.update(note.path, (data, body) => ({ body: `${body.replace(/\s*$/, '')}\n\n> [!ai] 回忆（${today()}）\n${quoted}\n` })))
      .then(() => { recalls.delete(note.path); renderDetail(main, store.get(note.path)); });
  });
}

/* ---------- 关联 ---------- */
// In English the reasons come from the translated body (links are kept intact by translate.js).
const shownLinks = n => (isEn() ? parseLinks(trc(n.body)).map(l => ({ ...l, from: n, to: store.resolve(l.target) })) : store.linksOf(n));

function relationsSection(note, ro) {
  const out = shownLinks(note);
  const incoming = store.all().flatMap(shownLinks).filter(l => l.to === note);
  const auto = [...related(note)].filter(([, why]) => why.startsWith('共享概念'));
  const title = n => esc(n?.data.title || n?.name || '');
  const pool = store.items().filter(n => n !== note);
  return `<section class="relations">
    <h2>关联</h2>
    <ul class="rel-list">
      ${out.map((l, i) => `<li><span class="rel-type">${esc(l.type)} →</span>
        ${l.to ? `<a href="${noteHref(l.to.name)}">${title(l.to)}</a>` : `<span class="unresolved">${esc(l.target)}</span>`}
        <span class="reason">${esc(l.reason)}</span>${l.ai ? ' <span class="badge ai confirmed">AI</span>' : ''}
        ${ro ? '' : `<button class="x" data-unrel="${i}" title="删除这条关联">×</button>`}</li>`).join('')}
      ${incoming.map(l => `<li class="in"><span class="rel-type">← ${esc(l.type)}</span>
        <a href="${noteHref(l.from.name)}">${title(l.from)}</a><span class="reason">${esc(l.reason)}</span></li>`).join('')}
      ${auto.map(([n, why]) => `<li class="auto"><span class="rel-type">自动</span>
        <a href="#/item/${encodeURIComponent(n.path)}">${title(n)}</a><span class="reason">${esc(why)}</span></li>`).join('')}
      ${out.length + incoming.length + auto.length ? '' : '<li class="muted">还没有关联</li>'}
    </ul>
    ${ro ? '' : `<div class="rel-add">
      ${selectHtml('id="relType" data-reltype', store.vocab('link_type'), store.vocab('link_type')[0])}
      <input id="relTarget" list="dl-rel" placeholder="连到哪份材料…">
      <datalist id="dl-rel">${pool.map(n => `<option value="${esc(n.name)}">${esc(n.data.title || '')}</option>`).join('')}</datalist>
      <input id="relReason" placeholder="理由（必填）：它们具体怎么相关？">
      <button class="mini" id="relAdd">添加</button></div>`}
  </section>`;
}

function bindRelations(main, note) {
  const links = store.linksOf(note);
  for (const b of main.querySelectorAll('[data-unrel]')) b.addEventListener('click', () => run(store.removeLink(note.path, links[b.dataset.unrel])));
  const typeSel = main.querySelector('#relType');
  bindSelect(typeSel, '关联类型', async (v, isNew) => { if (isNew) { await store.addVocab('link_type', v); main.querySelector('#relType').value = v; } });
  main.querySelector('#relAdd').addEventListener('click', () => {
    const target = store.resolve(main.querySelector('#relTarget').value.trim());
    const reason = main.querySelector('#relReason').value.trim();
    const type = main.querySelector('#relType').value;
    if (!target) return toast('先选一份库里已有的材料', true);
    if (!reason) return toast('写一句理由：以后会忘的就是这个', true);
    if (!type || type === '__add__') return toast('选一个关联类型', true);
    run(store.addLink(note.path, { type, target: target.name, reason }));
  });
}

/* ---------- 材料 ---------- */
function renderItem(main, note) {
  const d = note.data, ro = viewOnly();
  const pending = unconfirmed(d);
  const roles = asList(d.roles);
  const parent = store.resolve(d.parent);
  const kids = store.children(note);

  const confirmBtn = field => pending.includes(field) && !ro
    ? `<button class="mini" data-confirm="${field}" title="我核对过，这个值没问题">确认</button>` : '';
  const textField = (field, wide = false) => `<div class="field${wide ? ' wide' : ''}">
      <dt>${FIELD_LABEL[field]} ${originBadge(d, field)} ${confirmBtn(field)}
        ${field === 'url' && d.url ? `<a href="${esc(d.url)}" target="_blank" rel="noopener" class="open-url">打开 ↗</a>` : ''}</dt>
      <dd><input id="f-${field}" data-text="${field}" value="${esc(d[field] ?? '')}"${ro ? ' disabled' : ''}
        class="${originOf(d, field).origin === 'ai' && !originOf(d, field).confirmed ? 'ai-text' : ''}"></dd></div>`;
  const vocabField = field => `<div class="field"><dt>${FIELD_LABEL[field]}</dt>
      <dd>${selectHtml(`id="f-${field}" data-vocab="${field}"`, store.vocab(field), d[field], ro)}</dd></div>`;

  main.innerHTML = `
    <article class="detail">
      <nav class="crumbs"><a href="#/list">← 材料</a>${parent ? ` / <a href="${noteHref(parent.name)}">${esc(parent.data.title || parent.name)}</a>` : ''}</nav>
      <header>
        <h1>${esc(d.title || note.name)}</h1>
        <p class="sub">${[d.creator, d.year, d.type].filter(Boolean).map(esc).join(' · ')}</p>
        ${ro ? '' : `<a class="button primary focus-btn" href="#/focus/${encodeURIComponent(note.path)}">开始专注读</a>`}
        ${d.resume && !ro ? `<p class="resume">上次停在：${esc(d.resume)}</p>` : ''}
        <div class="detail-marks">${marksHtml(note)}${ro ? (d.plan ? `<span class="muted">计划 ${esc(d.plan)}</span>` : '')
          : `<label class="check">计划哪天读 <input type="date" id="f-plan" value="${esc(d.plan || '')}"></label>`}</div>
        ${obsidianLink(note)}
      </header>

      <section class="why-box${isEmpty(d.why) ? ' empty' : ''}">
        <label for="f-why">为什么存它</label>
        <textarea id="f-why" data-text="why" rows="2" placeholder="一句话：当时我为什么觉得它重要？以后会忘的就是这句。"${ro ? ' disabled' : ''}>${esc(d.why ?? '')}</textarea>
      </section>

      <section class="mine">
        ${['status', 'importance', 'type', 'voice'].map(vocabField).join('')}
        <div class="field wide"><dt>在论文里的角色 ${originBadge(d, 'roles')}</dt><dd class="chips">
          ${[...new Set([...store.vocab('roles'), ...roles])].map(r => `<button class="chip${roles.includes(r) ? ' on' : ''}" data-role="${esc(r)}"${ro ? ' disabled' : ''}>${esc(r)}</button>`).join('')}
          ${ro ? '' : '<button class="chip add" id="addRole" title="新增一个角色选项">＋</button>'}
        </dd></div>
      </section>

      <section class="refs">
        <h2>资料信息 ${pending.length ? `<span class="badge ai">${pending.length} 待确认</span>` : ''}</h2>
        <dl>
          ${textField('title', true)}
          ${textField('creator')}
          ${textField('year')}
          ${textField('url', true)}
          <div class="field wide"><dt>${FIELD_LABEL.summary} ${originBadge(d, 'summary')} ${confirmBtn('summary')}</dt>
            <dd><textarea id="f-summary" data-text="summary" rows="2"${ro ? ' disabled' : ''}
              class="${originOf(d, 'summary').origin === 'ai' ? 'ai-text' : ''}">${esc(d.summary ?? '')}</textarea></dd></div>
          <div class="field wide"><dt>概念 ${originBadge(d, 'concepts')}</dt><dd>${linkPicker(note, 'concepts', ro)}</dd></div>
          <div class="field wide"><dt>研究问题 ${originBadge(d, 'questions')}</dt><dd>${linkPicker(note, 'questions', ro)}</dd></div>
          <div class="field"><dt>所属合集</dt><dd>${linkPicker(note, 'parent', ro)}</dd></div>
          <div class="field"><dt>收录 / 读完</dt><dd class="muted">${esc(d.created ?? '—')} / ${esc(d.read ?? '—')}</dd></div>
        </dl>
      </section>

      ${attachmentSection(note)}
      ${aiBar(note, ro)}
      ${relationsSection(note, ro)}

      ${kids.length ? `<section class="children"><h2>合集里的条目 <span class="count">${kids.length}</span></h2><ul>
        ${kids.map(k => `<li><a href="#/item/${encodeURIComponent(k.path)}">${esc(k.data.title || k.name)}</a></li>`).join('')}</ul></section>` : ''}

      ${bodySection(note, ro)}
      ${backlinkSection(note)}
    </article>`;

  bindCommon(main, note);
  bindAttachments(main, note);
  bindMarks(main);
  main.querySelector('#f-plan')?.addEventListener('change', e => setPlan(note.path, e.target.value));
  if (ro) return;
  bindAi(main, note);
  bindRelations(main, note);
  for (const b of main.querySelectorAll('[data-role]'))
    b.addEventListener('click', () => {
      const r = b.dataset.role;
      run(setField(note.path, 'roles', roles.includes(r) ? roles.filter(x => x !== r) : [...roles, r]));
    });
  main.querySelector('#addRole').addEventListener('click', async () => {
    const res = await ask({ title: '新增「角色」选项', fields: [{ name: 'v', label: '名称', required: true }] });
    if (!res?.v) return;
    await store.addVocab('roles', res.v);
    run(setField(note.path, 'roles', [...new Set([...roles, res.v])]));
  });
}

/* ---------- 研究问题 / 概念 / 方向 / 其他 ---------- */
function renderOther(main, note) {
  const d = note.data, ro = viewOnly();
  const lead = d.kind === KIND.question ? 'question' : d.kind === KIND.concept ? 'definition' : d.kind === KIND.idea ? 'idea' : null;
  const isIdea = d.kind === KIND.idea;
  const shownKeys = new Set(['kind', lead, 'status', 'created', ...(isIdea ? ['stage', 'for_whom', 'next'] : [])]);
  const props = Object.entries(d).filter(([k, v]) => !shownKeys.has(k) && !k.startsWith('_') && !isEmpty(v));
  const fmt = v => asList(v).map(x => /^\s*\[\[/.test(x)
    ? `<a href="${noteHref(linkTarget(x))}">${esc(linkTarget(x))}</a>` : esc(x)).join('<span class="sep">·</span>');
  const linkedItems = backlinks(note).filter(n => n.data.kind === KIND.item);

  main.innerHTML = `
    <article class="detail">
      <nav class="crumbs"><a href="#/list">← 材料</a></nav>
      <header>
        <p class="kind">${esc(d.kind || '笔记')}</p>
        <h1>${esc(note.name)}</h1>
        ${obsidianLink(note)}
      </header>
      ${lead ? `<section class="why-box${isEmpty(d[lead]) ? ' empty' : ''}">
        <label for="f-${lead}">${lead === 'question' ? '问题' : lead === 'idea' ? '一句话的想法' : '我的一句话定义'}</label>
        <textarea id="f-${lead}" data-text="${lead}" rows="2"${ro ? ' disabled' : ''}>${esc(d[lead] ?? '')}</textarea></section>` : ''}
      <section class="mine">
        ${isIdea ? `<div class="field"><dt>阶段</dt><dd><select id="f-stage" data-stage-select${ro ? ' disabled' : ''}>${IDEA_STAGES.map(st => `<option${st === (d.stage || IDEA_STAGES[0]) ? ' selected' : ''}>${st}</option>`).join('')}</select></dd></div>
          <div class="field wide"><dt>为谁、解决什么问题</dt><dd><textarea id="f-for_whom" data-text="for_whom" rows="2"${ro ? ' disabled' : ''}>${esc(d.for_whom ?? '')}</textarea></dd></div>
          <div class="field wide"><dt>下一步</dt><dd><textarea id="f-next" data-text="next" rows="2" placeholder="比如：画故事板 / 找两个人聊聊"${ro ? ' disabled' : ''}>${esc(d.next ?? '')}</textarea></dd></div>` : ''}
        ${d.kind === KIND.concept ? `<div class="field"><dt>状态</dt><dd>${selectHtml('id="f-status" data-vocab="concept_status" data-key="status"', store.vocab('concept_status'), d.status, ro)}</dd></div>` : ''}
        ${props.map(([k, v]) => `<div class="field"><dt>${esc(FIELD_LABEL[k] || k)}</dt><dd>${fmt(v)}</dd></div>`).join('')}
      </section>
      ${[KIND.question, KIND.concept].includes(d.kind) && !linkedItems.length
        ? `<p class="nudge">还没有材料挂到这个${esc(d.kind)}下。</p>` : ''}
      ${bodySection(note, ro)}
      ${backlinkSection(note)}
    </article>`;
  bindCommon(main, note);
  bindAttachments(main, note);
  main.querySelector('[data-stage-select]')?.addEventListener('change', e => run(setField(note.path, 'stage', e.target.value)));
}

export function renderDetail(main, note) {
  if (!note) {
    main.innerHTML = `<section class="detail"><nav class="crumbs"><a href="#/list">← 材料</a></nav>
      <p class="empty">库里没有这篇笔记。</p></section>`;
    return;
  }
  if (renderDetail.last !== note.path) window.scrollTo(0, 0);
  renderDetail.last = note.path;
  (note.data.kind === KIND.item ? renderItem : renderOther)(main, note);
}

// Leaving with an unsaved body edit
window.addEventListener('beforeunload', e => { if ([...drafts.values()].some(d => d.text !== d.base)) e.preventDefault(); });
