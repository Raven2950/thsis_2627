// Inventory view: everything I have, filterable by type / status / role / importance.
import { store } from '../store.js';
import { viewOnly, trc, isEn } from '../i18n.js';
import { KIND, FOLDER, unconfirmed, isEmpty, today } from '../model.js';
import { esc } from '../markdown.js';
import { asList } from '../note.js';
import { ask, toast } from '../ui.js';
import { pickAndCapture } from './capture.js';
import { marksHtml, bindMarks, queue } from '../marks.js';

const filter = { q: '', type: '', status: '', role: '', importance: '', noWhy: false, star: false, like: false, sort: 'new' };

const options = (all, used, value, label) => {
  const vals = [...new Set([...all, ...used.filter(Boolean)])];
  return `<option value="">${label}</option>` +
    vals.map(v => `<option${v === value ? ' selected' : ''}>${esc(v)}</option>`).join('');
};

function matches(n) {
  const d = n.data;
  if (filter.type && d.type !== filter.type) return false;
  if (filter.status && d.status !== filter.status) return false;
  if (filter.importance && d.importance !== filter.importance) return false;
  if (filter.role && !asList(d.roles).includes(filter.role)) return false;
  if (filter.noWhy && !isEmpty(d.why)) return false;
  if (filter.star && !d.star) return false;
  if (filter.like && !d.like) return false;
  if (filter.q) {
    const hay = [n.name, d.title, d.creator, d.why, d.summary, n.body].join(' ').toLowerCase();
    if (!hay.includes(filter.q.toLowerCase())) return false;
  }
  return true;
}

function row(n, depth = 0) {
  const d = n.data, pending = unconfirmed(d).length;
  return `<tr data-path="${esc(n.path)}" tabindex="0" class="${depth ? 'child' : ''}">
    <td class="mark-cell">${marksHtml(n)}</td>
    <td class="title-cell"><a href="#/item/${encodeURIComponent(n.path)}">${esc(d.title || n.name)}</a>
      ${d.creator ? `<div class="sub">${esc(d.creator)}${d.year ? ` · ${esc(d.year)}` : ''}</div>` : ''}</td>
    <td>${esc(d.type || '')}</td>
    <td>${d.status ? `<span class="pill status-${esc(d.status)}">${esc(d.status)}</span>` : ''}</td>
    <td>${esc(d.importance || '')}</td>
    <td class="why">${isEmpty(d.why) ? '<span class="missing">还没写</span>' : esc(d.why)}</td>
    <td>${pending ? `<span class="badge ai" title="还有 ${pending} 个字段来自 AI 或原文、等我确认">${pending} 待确认</span>` : ''}</td>
  </tr>`;
}

export function renderList(main) {
  const items = store.items();
  const shown = new Set(items.filter(matches));
  const topLevel = items.filter(n => !store.resolve(n.data.parent));
  const byDate = (a, b) => String(b.data.created || '').localeCompare(String(a.data.created || '')) || a.name.localeCompare(b.name);
  const flag = k => n => (n.data[k] ? 0 : 1);
  const SORTS = {
    new: byDate,
    star: (a, b) => flag('star')(a) - flag('star')(b) || String(a.data.plan || '9999').localeCompare(String(b.data.plan || '9999')) || byDate(a, b),
    like: (a, b) => flag('like')(a) - flag('like')(b) || flag('star')(a) - flag('star')(b) || byDate(a, b),
    title: (a, b) => String(a.data.title || a.name).localeCompare(String(b.data.title || b.name)),
  };
  const next = queue().slice(0, 5);

  const rows = [];
  for (const n of topLevel.sort(SORTS[filter.sort] || byDate)) {
    const kids = store.children(n).filter(k => shown.has(k));
    if (shown.has(n) || kids.length) rows.push(row(n), ...kids.map(k => row(k, 1)));
  }
  const noWhy = items.filter(n => isEmpty(n.data.why)).length;

  main.innerHTML = `
    <section class="list-view">
      <div class="list-head">
        <h1>材料 <span class="count">${items.length}</span></h1>
        ${viewOnly() ? '' : `<span class="hint">把 PDF、图片或链接拖进窗口就能收录</span>
          <button id="fromFile">从文件收录…</button><button class="primary" id="newItem">＋ 新材料</button>`}
        ${noWhy ? `<p class="nudge">有 ${noWhy} 份材料还没写「为什么存它」。</p>` : ''}
      </div>
      ${next.length ? `<div class="up-next"><b>接下来要读</b>${next.map(n => `<a href="#/item/${encodeURIComponent(n.path)}">⭐ ${esc(trc(n.data.title || n.name))}${n.data.plan ? ` <span class="muted">${esc(n.data.plan)}</span>` : ''}</a>`).join('')}
        <a href="#/plan" class="more">阅读计划 →</a></div>` : ''}
      <div class="filters">
        <input type="search" id="fq" placeholder="搜索标题、作者、为什么、正文…" value="${esc(filter.q)}">
        <select id="ftype">${options(store.vocab('type'), items.map(n => n.data.type), filter.type, '全部类型')}</select>
        <select id="fstatus">${options(store.vocab('status'), items.map(n => n.data.status), filter.status, '全部状态')}</select>
        <select id="frole">${options(store.vocab('roles'), items.flatMap(n => asList(n.data.roles)), filter.role, '全部角色')}</select>
        <select id="fimp">${options(store.vocab('importance'), items.map(n => n.data.importance), filter.importance, '全部重要性')}</select>
        <label class="check"><input type="checkbox" id="fnowhy"${filter.noWhy ? ' checked' : ''}> 只看没写「为什么」的</label>
        <label class="check"><input type="checkbox" id="fstar"${filter.star ? ' checked' : ''}> 只看 ⭐</label>
        <label class="check"><input type="checkbox" id="flike"${filter.like ? ' checked' : ''}> 只看 ♥</label>
        <select id="fsort" title="排序">${Object.entries({ new: '最新收录', star: '⭐ 优先', like: '♥ 优先', title: '按标题' }).map(([k, v]) => `<option value="${k}"${filter.sort === k ? ' selected' : ''}>${v}</option>`).join('')}</select>
      </div>
      ${items.length === 0
        ? `<p class="empty">这个文件夹里还没有 <code>kind: 材料</code> 的笔记。</p>`
        : `<table class="items">
            <thead><tr><th class="mark-cell"></th><th>标题</th><th>类型</th><th>状态</th><th>重要性</th><th>为什么存它</th><th></th></tr></thead>
            <tbody>${rows.join('') || '<tr><td colspan="7" class="empty">没有符合筛选的材料</td></tr>'}</tbody>
          </table>`}
    </section>`;

  const bind = (id, key, prop = 'value') => main.querySelector(id)?.addEventListener('input', e => {
    filter[key] = e.target[prop];
    const pos = e.target.selectionStart;
    renderList(main);
    if (id === '#fq') { const el = main.querySelector('#fq'); el.focus(); el.setSelectionRange(pos, pos); }
  });
  bind('#fq', 'q'); bind('#ftype', 'type'); bind('#fstatus', 'status'); bind('#frole', 'role');
  bind('#fimp', 'importance'); bind('#fnowhy', 'noWhy', 'checked');
  bind('#fstar', 'star', 'checked'); bind('#flike', 'like', 'checked'); bind('#fsort', 'sort');
  bindMarks(main);

  main.querySelector('#newItem')?.addEventListener('click', newItem);
  main.querySelector('#fromFile')?.addEventListener('click', pickAndCapture);

  for (const tr of main.querySelectorAll('tbody tr[data-path]')) {
    const go = () => (location.hash = `#/item/${encodeURIComponent(tr.dataset.path)}`);
    tr.addEventListener('click', e => { if (!e.target.closest('a, button')) go(); });
    tr.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }
}

// Manual capture. "Why I saved it" is required: it is the one thing I will have forgotten later.
async function newItem() {
  const res = await ask({
    title: '收录新材料', submit: '收录',
    fields: [
      { name: 'title', label: '标题', required: true },
      { name: 'why', label: '为什么存它', required: true, multiline: true, placeholder: '一句话：当时为什么觉得它重要？' },
      { name: 'type', label: '类型', options: store.vocab('type') },
      { name: 'creator', label: '作者/机构' },
      { name: 'url', label: '链接', placeholder: 'https://…' },
    ],
  });
  if (!res) return;
  const data = {
    kind: KIND.item, title: res.title, creator: res.creator || null, year: null, url: res.url || null,
    type: res.type || null, why: res.why, status: store.vocab('status')[0] || null, importance: null,
    roles: [], voice: null, concepts: [], questions: [], parent: null, summary: null,
    from_ai: [], from_source: [], confirmed: [], created: today(), read: null,
  };
  try {
    const note = await store.create(store.uniquePath(FOLDER[KIND.item], res.title), data, '\n## 我得到了什么\n\n\n## 待解决的问题\n\n- \n');
    location.hash = `#/item/${encodeURIComponent(note.path)}`;
  } catch (e) { toast(e.message, true); }
}
