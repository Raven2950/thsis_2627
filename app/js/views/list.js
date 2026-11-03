// Inventory view: everything I have, filterable by type / status / role / importance.
import { store } from '../store.js';
import { viewOnly, trc, isEn } from '../i18n.js';
import { KIND, FOLDER, unconfirmed, isEmpty, today } from '../model.js';
import { esc } from '../markdown.js';
import { asList } from '../note.js';
import { ask, toast } from '../ui.js';
import { pickAndCapture } from './capture.js';
import { marksHtml, ratingHtml, bindMarks, queue, liked } from '../marks.js';

const filter = { q: '', type: '', status: '', role: '', importance: '', rating: '', noWhy: false, star: false, sort: 'new' };

// Columns I can show or hide (the choice is remembered in this browser). Title is always there.
const link = v => esc(String(v).replace(/^\[\[|\]\]$/g, '').split('|').pop());
const COLUMNS = [
  ['num', '#', (n, num) => (num ? String(num).padStart(2, '0') : '')],
  ['plan', '计划读', n => marksHtml(n)],
  ['title', '标题', null],
  ['type', '类型', n => esc(n.data.type || '')],
  ['status', '状态', n => (n.data.status ? `<span class="pill status-${esc(n.data.status)}">${esc(n.data.status)}</span>` : '')],
  ['rating', '评分', n => ratingHtml(n)],
  ['importance', '重要性', n => esc(n.data.importance || '')],
  ['why', '为什么存它', n => (isEmpty(n.data.why) ? '<span class="missing">还没写</span>' : esc(n.data.why))],
  ['roles', '角色', n => asList(n.data.roles).map(esc).join('、')],
  ['concepts', '概念', n => asList(n.data.concepts).map(link).join('、')],
  ['plandate', '计划哪天读', n => esc(n.data.plan || '')],
  ['created', '收录日期', n => esc(String(n.data.created || '').slice(0, 10))],
  ['read', '读完日期', n => esc(String(n.data.read || '').slice(0, 10))],
  ['pending', '待确认', n => { const p = unconfirmed(n.data).length; return p ? `<span class="badge ai" title="还有 ${p} 个字段来自 AI 或原文、等我确认">${p} 待确认</span>` : ''; }],
];
const DEFAULT_COLS = ['num', 'plan', 'title', 'type', 'status', 'rating', 'why', 'pending'];
const COLS_KEY = 'marginalia-list-columns';
function shownCols() {
  try { const v = JSON.parse(localStorage.getItem(COLS_KEY)); if (Array.isArray(v)) return new Set([...v, 'title']); } catch (e) { /* none saved */ }
  return new Set(DEFAULT_COLS);
}
function saveCols(set) { try { localStorage.setItem(COLS_KEY, JSON.stringify([...set])); } catch (e) { /* private mode */ } }
let pickerOpen = false;

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
  if (filter.rating === 'none' && Number(d.rating)) return false;
  if (/^\d$/.test(filter.rating) && !(Number(d.rating) >= Number(filter.rating))) return false;
  if (filter.q) {
    const hay = [n.name, d.title, d.creator, d.why, d.summary, n.body].join(' ').toLowerCase();
    if (!hay.includes(filter.q.toLowerCase())) return false;
  }
  return true;
}

function row(n, depth = 0, num = 0, cols) {
  const d = n.data;
  return `<tr data-path="${esc(n.path)}" tabindex="0" class="${depth ? 'child' : ''}">${COLUMNS.filter(([k]) => cols.has(k)).map(([k, , cell]) => k === 'title'
    ? `<td class="col-title title-cell"><a href="#/item/${encodeURIComponent(n.path)}">${esc(d.title || n.name)}</a>
        ${d.creator ? `<div class="sub">${esc(d.creator)}${d.year ? ` · ${esc(d.year)}` : ''}</div>` : ''}</td>`
    : `<td class="col-${k}">${cell(n, depth ? 0 : num)}</td>`).join('')}</tr>`;
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
    rating: (a, b) => (Number(b.data.rating) || (liked(b.data) ? 3.5 : 0)) - (Number(a.data.rating) || (liked(a.data) ? 3.5 : 0)) || byDate(a, b),
    title: (a, b) => String(a.data.title || a.name).localeCompare(String(b.data.title || b.name)),
  };
  const next = queue().slice(0, 5);

  const cols = shownCols();
  const rows = [];
  let count = 0;
  for (const n of topLevel.sort(SORTS[filter.sort] || byDate)) {
    const kids = store.children(n).filter(k => shown.has(k));
    if (shown.has(n) || kids.length) rows.push(row(n, 0, ++count, cols), ...kids.map(k => row(k, 1, 0, cols)));
  }

  main.innerHTML = `
    <section class="list-view">
      <div class="list-head">
        <h1>材料 <span class="count">${items.length}</span></h1>
        ${viewOnly() ? '' : `<div class="list-actions"><button id="fromFile">从文件收录…</button><button class="primary" id="newItem">＋ 新材料</button></div>`}
      </div>
      ${next.length ? `<div class="up-next"><h2>接下来要读</h2><ol>${next.map(n => `<li><a href="#/item/${encodeURIComponent(n.path)}"><span class="star">◆</span>${esc(trc(n.data.title || n.name))}</a><span class="when">${esc(n.data.plan || '')}</span></li>`).join('')}</ol>
        <a href="#/plan" class="more">阅读计划 →</a></div>` : ''}
      <div class="filters">
        <input type="search" id="fq" placeholder="搜索标题、作者、为什么、正文…" value="${esc(filter.q)}">
        <div class="filter-row">
          <select id="ftype">${options(store.vocab('type'), items.map(n => n.data.type), filter.type, '全部类型')}</select>
          <select id="fstatus">${options(store.vocab('status'), items.map(n => n.data.status), filter.status, '全部状态')}</select>
          <select id="frole">${options(store.vocab('roles'), items.flatMap(n => asList(n.data.roles)), filter.role, '全部角色')}</select>
          <select id="fimp">${options(store.vocab('importance'), items.map(n => n.data.importance), filter.importance, '全部重要性')}</select>
          <select id="frating">${[['', '全部评分'], ['5', '★★★★★'], ['4', '★★★★ 以上'], ['3', '★★★ 以上'], ['none', '还没评分']].map(([v, l]) => `<option value="${v}"${filter.rating === v ? ' selected' : ''}>${l}</option>`).join('')}</select>
          <select id="fsort" title="排序">${Object.entries({ new: '最新收录', star: '◆ 优先', rating: '评分高的在前', title: '按标题' }).map(([k, v]) => `<option value="${k}"${filter.sort === k ? ' selected' : ''}>${v}</option>`).join('')}</select>
          <span class="hint filter-count">${shown.size} / ${items.length}</span>
          <details class="col-picker"${pickerOpen ? ' open' : ''}><summary>显示的列</summary>
            <div class="col-list">${COLUMNS.map(([k, label]) => `<label><input type="checkbox" data-col="${k}"${cols.has(k) ? ' checked' : ''}${k === 'title' ? ' disabled' : ''}> ${label === '#' ? '编号' : label}</label>`).join('')}
              <button class="link" id="colsReset">恢复默认</button></div></details>
        </div>
      </div>
      ${items.length === 0
        ? `<p class="empty">这个文件夹里还没有 <code>kind: 材料</code> 的笔记。</p>`
        : `<table class="items">
            <thead><tr>${COLUMNS.filter(([k]) => cols.has(k)).map(([k, label]) => `<th class="col-${k}">${k === 'plan' ? '◆' : k === 'pending' ? '' : label}</th>`).join('')}</tr></thead>
            <tbody>${rows.join('') || `<tr><td colspan="${cols.size}" class="empty">没有符合筛选的材料</td></tr>`}</tbody>
          </table>`}
    </section>`;

  const bind = (id, key, prop = 'value') => main.querySelector(id)?.addEventListener('input', e => {
    filter[key] = e.target[prop];
    const pos = e.target.selectionStart;
    renderList(main);
    if (id === '#fq') { const el = main.querySelector('#fq'); el.focus(); el.setSelectionRange(pos, pos); }
  });
  bind('#fq', 'q'); bind('#ftype', 'type'); bind('#fstatus', 'status'); bind('#frole', 'role');
  bind('#fimp', 'importance');
  bind('#frating', 'rating'); bind('#fsort', 'sort');
  main.querySelector('.col-picker')?.addEventListener('toggle', e => { pickerOpen = e.target.open; });
  for (const c of main.querySelectorAll('[data-col]')) c.addEventListener('change', () => {
    const set = shownCols(); c.checked ? set.add(c.dataset.col) : set.delete(c.dataset.col);
    saveCols(set); renderList(main);
  });
  main.querySelector('#colsReset')?.addEventListener('click', () => { saveCols(new Set(DEFAULT_COLS)); renderList(main); });
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
