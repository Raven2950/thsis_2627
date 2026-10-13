// Where the repository is thin. Counts are plain front-end arithmetic; the AI pass is optional.
import { computeGaps, level, LEVEL_LABEL } from '../gaps.js';
import { aiGaps } from '../tasks.js';
import { esc, noteHref } from '../markdown.js';
import { openRecommend } from './recommend.js';
import { toast } from '../ui.js';

let aiResult = null;

function bars(rows, { recommend, link } = {}) {
  const max = Math.max(1, ...rows.map(r => r.items.length));
  return `<ul class="bars">${rows.map(r => {
    const lv = level(r.items.length);
    return `<li class="lv-${lv}">
      <span class="name">${link ? `<a href="${noteHref(r.name)}">${esc(r.name)}</a>` : esc(r.name)}${r.text ? `<span class="muted"> ${esc(r.text)}</span>` : ''}</span>
      <span class="bar" title="${r.items.map(n => esc(n.data.title || n.name)).join('\n')}"><i style="width:${(r.items.length / max) * 100}%"></i></span>
      <span class="n">${r.items.length}</span><span class="lv">${LEVEL_LABEL[lv]}</span>
      ${recommend && lv !== 'thick' && lv !== 'mid' ? `<button class="mini" data-rec='${esc(JSON.stringify(recommend(r)))}'>推荐</button>` : '<span></span>'}
    </li>`;
  }).join('')}</ul>`;
}

export function renderGaps(main) {
  const g = computeGaps();
  main.innerHTML = `
    <section class="gaps-view">
      <h1>缺口</h1>
      <p class="hint">按材料数量统计：0 = 空，1 = 薄，2–3 = 中，4 份以上 = 厚。“推荐”会针对这个缺口去找新材料。</p>

      <h2>研究问题</h2>
      ${bars(g.questions, { link: true, recommend: r => ({ question: `${r.name}：${r.text || ''}` }) })}

      <h2>概念</h2>
      ${g.concepts.length ? bars(g.concepts, { link: true, recommend: r => ({ concepts: [r.name] }) })
        : '<p class="empty">还没有概念。在材料详情页添加概念，或者让 AI 建议。</p>'}

      <h2>在论文里的角色</h2>
      ${bars(g.roles, { recommend: r => ({ note: `想要能在论文里充当「${r.name}」的材料` }) })}

      <h2>声音来源</h2>
      ${bars(g.voices, { recommend: r => ({ note: `想要声音来源是「${r.name}」的材料` }) })}

      <h2>类型分布</h2>
      ${bars(g.types)}

      <h2>整理状况</h2>
      <ul class="bars house">${g.housekeeping.map(h => `<li><span class="name">${esc(h.name)}</span>
        <span class="list">${h.items.map(n => `<a href="#/item/${encodeURIComponent(n.path)}">${esc(n.data.title || n.name)}</a>`).join('、') || '<span class="muted">没有</span>'}</span>
        <span class="n">${h.items.length}/${g.total}</span></li>`).join('')}</ul>

      <h2>结构之外的缺口 <span class="badge ai">AI</span></h2>
      <p class="hint">计数看不出来的东西，比如覆盖了哪些障碍类型、是不是全是“说明现状”的材料。</p>
      <button id="aiGaps">${aiResult ? '再看一次' : '让 AI 看看'}</button>
      ${aiResult ? `<div class="ai-gaps">${aiResult.gaps.map(x => `<div class="card candidate">
        <h3>${esc(x.title)}</h3><p>${esc(x.detail)}</p>
        ${x.ask ? `<button class="mini" data-rec='${esc(JSON.stringify({ note: x.ask }))}'>按这个推荐</button>` : ''}</div>`).join('')}
        <p class="hint">${esc(aiResult.model)}</p></div>` : ''}
    </section>`;

  for (const b of main.querySelectorAll('[data-rec]')) b.addEventListener('click', () => openRecommend(JSON.parse(b.dataset.rec)));
  main.querySelector('#aiGaps').addEventListener('click', async e => {
    e.target.disabled = true; e.target.textContent = '分析中…';
    try { aiResult = await aiGaps(g); renderGaps(main); }
    catch (err) { toast(err.message, true); e.target.disabled = false; e.target.textContent = '让 AI 看看'; }
  });
}
