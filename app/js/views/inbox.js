// Everything the AI proposed, waiting for keep / cancel.
import { confirmTr } from '../i18n.js';
import { store } from '../store.js';
import { FIELD_LABEL } from '../model.js';
import { esc, noteHref } from '../markdown.js';
import { VERIFY_LABEL } from '../verify.js';
import { INBOX_KIND_LABEL, keep, cancel, preview } from '../inbox.js';
import { ask, toast } from '../ui.js';
import { renderMarkdown } from '../markdown.js';

const titleOf = path => { const n = store.get(path); return n ? (n.data.title || n.name) : path; };
const itemLink = path => `<a href="#/item/${encodeURIComponent(path)}">${esc(titleOf(path))}</a>`;

function verifyBadge(v) {
  if (!v) return '';
  const cls = v.status === 'verified' ? 'source confirmed' : v.status === 'unverifiable' ? '' : 'ai';
  const link = v.fields?.url ? ` <a href="${esc(v.fields.url)}" target="_blank" rel="noopener">↗</a>` : '';
  return `<span class="badge ${cls}" title="${esc(v.by || '')}">${VERIFY_LABEL[v.status] || v.status}${v.by ? ` · ${esc(v.by)}` : ''}</span>${link}`;
}

function card(e) {
  const p = e.payload, pv = preview(e);
  const actions = `<div class="actions"><button data-cancel="${e.id}">cancel</button><button class="primary" data-keep="${e.id}">keep</button></div>`;
  const meta = `<div class="meta">${esc(INBOX_KIND_LABEL[e.kind])} · ${esc(e.model || '')} · ${esc((e.createdAt || '').slice(0, 10))}</div>`;

  if (e.kind === 'enrich') return `<div class="card candidate" data-id="${e.id}">${meta}
    <h3>${itemLink(e.target)}</h3>
    <p class="hint">核对：${verifyBadge(p.verify)}</p>
    <table class="diff"><tr><th></th><th>字段</th><th>现在</th><th>建议</th></tr>
    ${Object.entries(p.fields).map(([f, v]) => `<tr>
      <td><input type="checkbox" checked data-field="${f}"></td><td>${esc(FIELD_LABEL[f] || f)}</td>
      <td class="muted">${esc(store.get(e.target)?.data[f] ?? '—')}</td>
      <td>${esc(v)} <span class="badge ${p.origins[f] === 'source' ? 'source' : 'ai'}">${p.origins[f] === 'source' ? '原文' : 'AI'}</span></td></tr>`).join('')}
    </table>${actions}</div>`;

  if (e.kind === 'keyword') return `<div class="card candidate" data-id="${e.id}">${meta}
    <h3>关键词「${esc(p.name)}」 <span class="badge ${p.items.length ? 'ai' : ''}">${p.items.length ? `${p.items.length} 份材料` : '还没有材料 · 缺口'}</span></h3>
    <p>${esc(p.definition)}</p>
    ${p.items.length ? `<p class="hint">会标到：${p.items.map(itemLink).join('、')}</p>` : ''}
    ${p.reason ? `<p class="hint">${esc(p.reason)}</p>` : ''}
    ${actions}</div>`;

  if (e.kind === 'concept') return `<div class="card candidate" data-id="${e.id}">${meta}
    <h3>${itemLink(e.target)} ＋ 概念「${esc(p.name)}」 ${pv.exists ? '<span class="badge confirmed">已有 ✓</span>' : '<span class="badge ai">新概念</span>'}</h3>
    <p>${esc(p.reason)}</p>
    ${pv.exists ? `<p class="hint">这个概念下已有 ${pv.items.length} 份材料${pv.items.length ? `：${pv.items.map(n => esc(n.data.title || n.name)).join('、')}` : ''}</p>` : ''}
    ${actions}</div>`;

  if (e.kind === 'link') return `<div class="card candidate" data-id="${e.id}">${meta}
    <h3>${itemLink(e.target)} <span class="arrow">— ${esc(p.type)} →</span> <a href="${noteHref(p.to)}">${esc(store.resolve(p.to)?.data.title || p.to)}</a></h3>
    <p>${esc(p.reason)}</p>${actions}</div>`;

  // recommended item
  return `<div class="card candidate rec" data-id="${e.id}">${meta}
    <h3>${esc(p.title)}</h3>
    <p class="sub">${[p.creator, p.year, p.type].filter(Boolean).map(esc).join(' · ')} ${verifyBadge(p.verify)}</p>
    ${p.summary ? `<p>${esc(p.summary)}</p>` : ''}
    ${p.reason ? `<p class="reason"><b>为什么推荐：</b>${esc(p.reason)}</p>` : ''}
    ${pv.concepts?.length ? `<div class="pv"><b>收入后会连到：</b><ul>${pv.concepts.map(c => `<li>${c.exists ? '✓' : '＋'} ${esc(c.name)}
      ${c.exists ? `<span class="muted">→ ${c.items.length ? c.items.map(n => esc(n.data.title || n.name)).join('、') : '还没有材料'}</span>` : '<span class="muted">（新概念）</span>'}</li>`).join('')}</ul></div>` : ''}
    ${p.guide ? `<details class="guide"><summary>导读（读之前看）</summary><div class="markdown">${renderMarkdown(p.guide)}</div></details>` : ''}
    ${e.request ? `<details><summary>request json</summary><pre>${esc(JSON.stringify(e.request, null, 2))}</pre></details>` : ''}
    ${actions}</div>`;
}

export function renderInbox(main) {
  const all = store.inbox();
  const groups = Object.keys(INBOX_KIND_LABEL).map(k => [k, all.filter(e => e.kind === k)]).filter(([, l]) => l.length);
  main.innerHTML = `
    <section class="inbox-view">
      <h1>收件箱 <span class="count">${all.length}</span></h1>
      <p class="hint">AI 的产出都先放在这里，keep 之后才会写进笔记。橙色虚线 = AI 说的；蓝色 = 从 Open Library / Crossref 查到的。</p>
      ${groups.length ? groups.map(([k, list]) => `<h2>${INBOX_KIND_LABEL[k]} <span class="count">${list.length}</span>
          <button class="mini" data-clear="${k}">全部 cancel</button></h2>${list.map(card).join('')}`).join('')
        : '<p class="empty">空的。可以在材料详情页让 AI 补全信息、建议概念或关联，或者在「地图」上让 AI 总结关键词、选关键词点「推荐」。</p>'}
    </section>`;

  const find = id => store.inbox().find(e => e.id === id);
  for (const b of main.querySelectorAll('[data-cancel]')) b.addEventListener('click', () => cancel(find(b.dataset.cancel)).catch(e => toast(e.message, true)));
  for (const b of main.querySelectorAll('[data-clear]')) b.addEventListener('click', () => {
    const ids = store.inbox().filter(e => e.kind === b.dataset.clear).map(e => e.id);
    if (confirmTr(`放弃这 ${ids.length} 条建议？`)) store.removeInbox(ids);
  });
  for (const b of main.querySelectorAll('[data-keep]')) b.addEventListener('click', async () => {
    const e = find(b.dataset.keep);
    try {
      if (e.kind === 'enrich') {
        const fields = [...b.closest('.card').querySelectorAll('[data-field]:checked')].map(c => c.dataset.field);
        if (!fields.length) return toast('至少勾一个字段，或者点 cancel', true);
        await keep(e, { fields });
      } else if (e.kind === 'item') {
        const res = await ask({
          title: `收录：${e.payload.title}`, submit: '收录',
          note: `AI 的推荐理由：${e.payload.reason || '—'}`,
          fields: [{ name: 'why', label: '为什么存它（用你自己的话）', required: true, multiline: true }],
        });
        if (!res) return;
        const note = await keep(e, { why: res.why });
        toast(`已收录，在「材料」里`);
        return void (location.hash = `#/item/${encodeURIComponent(note.path)}`);
      } else await keep(e);
      toast('已写进笔记');
    } catch (err) { toast(err.message, true); }
  });
}
