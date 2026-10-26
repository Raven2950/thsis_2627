// Reading plan: what I starred, by the day I mean to read it, plus what I liked.
import { store } from '../store.js';
import { viewOnly, trc } from '../i18n.js';
import { esc } from '../markdown.js';
import { queue, setPlan, markRead, marksHtml, bindMarks, DONE } from '../marks.js';
import { today } from '../model.js';
import { weekStats } from './focus.js';

const addDays = (d, n) => { const x = new Date(`${d}T12:00:00`); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

function row(n) {
  const d = n.data, ro = viewOnly();
  return `<li class="plan-row">
    ${marksHtml(n)}
    <a href="#/item/${encodeURIComponent(n.path)}" class="plan-title">${esc(trc(d.title || n.name))}</a>
    <span class="muted plan-type">${esc(d.type || '')}</span>
    ${ro ? (d.plan ? `<span class="plan-date">${esc(d.plan)}</span>` : '')
      : `<input type="date" class="plan-date" data-plan="${esc(n.path)}" value="${esc(d.plan || '')}" title="计划哪天读">
         <a class="mini-link" href="#/focus/${encodeURIComponent(n.path)}">开始读</a>
         <button class="mini" data-read="${esc(n.path)}" title="标成读过">读完</button>`}
    ${d.resume && !ro ? `<div class="plan-why resume">上次停在：${esc(d.resume)}</div>` : ''}
    ${d.why ? `<div class="plan-why">${esc(trc(String(d.why)))}</div>` : ''}
  </li>`;
}

export function renderPlan(main) {
  const t = today(), week = addDays(t, 7);
  const q = queue();
  const groups = [
    ['今天和之前', q.filter(n => n.data.plan && n.data.plan <= t)],
    ['这一周', q.filter(n => n.data.plan && n.data.plan > t && n.data.plan <= week)],
    ['以后', q.filter(n => n.data.plan && n.data.plan > week)],
    ['还没排日期', q.filter(n => !n.data.plan)],
  ];
  const liked = store.items().filter(n => n.data.like);
  const recent = store.items().filter(n => DONE.slice(0, 2).includes(n.data.status) && n.data.read)
    .sort((a, b) => String(b.data.read).localeCompare(String(a.data.read))).slice(0, 8);

  main.innerHTML = `<section class="plan-view">
    <h1>阅读计划</h1>
    <p class="week-stats" id="weekStats"></p>
    <p class="hint">⭐ 计划读的材料按日期排在这里；给它填个日期就进日程，点「读完」就从计划里移走。♥ 是读完觉得很好、想继续发展的。</p>
    ${q.length ? groups.filter(([, l]) => l.length).map(([title, list]) => `<h2>${title} <span class="count">${list.length}</span></h2>
      <ul class="plan-list">${list.map(row).join('')}</ul>`).join('')
      : '<p class="empty">还没有 ⭐ 的材料。在「列表」或材料页点 ☆，就会出现在这里。</p>'}
    <h2>♥ 喜欢的 <span class="count">${liked.length}</span></h2>
    ${liked.length ? `<ul class="plan-list">${liked.map(row).join('')}</ul>` : '<p class="empty">读完觉得好的，点 ♡。</p>'}
    ${recent.length ? `<h2>最近读完</h2><ul class="plan-list done">${recent.map(n => `<li class="plan-row"><a href="#/item/${encodeURIComponent(n.path)}" class="plan-title">${esc(trc(n.data.title || n.name))}</a><span class="muted">${esc(n.data.read)}</span></li>`).join('')}</ul>` : ''}
  </section>`;

  bindMarks(main);
  weekStats().then(s => { const el = main.querySelector('#weekStats'); if (el) el.textContent = s.sessions ? `这 7 天：专心读了 ${s.minutes} 分钟，读了 ${s.materials} 份材料` : '这 7 天还没有专注阅读的记录。从下面挑一份，点「开始读」。'; }).catch(() => {});
  for (const i of main.querySelectorAll('[data-plan]')) i.addEventListener('change', () => setPlan(i.dataset.plan, i.value));
  for (const b of main.querySelectorAll('[data-read]')) b.addEventListener('click', () => markRead(b.dataset.read));
}
