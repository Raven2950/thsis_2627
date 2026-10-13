// "Recommend new material" dialog: what to recommend around, how adventurous, and the exact request.
import { store } from '../store.js';
import { esc } from '../markdown.js';
import { recommend, buildRecommendPrompt, TUNE_DEFAULTS } from '../tasks.js';
import { modelLabel } from '../ai.js';
import { toast } from '../ui.js';

const TUNE_KEY = 'thesis-web-tune';
const loadTune = () => { try { return { ...TUNE_DEFAULTS, ...JSON.parse(localStorage.getItem(TUNE_KEY) || '{}') }; } catch (e) { return { ...TUNE_DEFAULTS }; } };
const saveTune = t => { try { localStorage.setItem(TUNE_KEY, JSON.stringify(t)); } catch (e) { /* private mode */ } };

// seed: { concepts: [names], items: [paths], question: name|null, note: '' }
export function openRecommend(seed) {
  seed = { concepts: [], items: [], question: null, note: '', ...seed };
  const tune = loadTune();
  const dlg = document.createElement('dialog');
  dlg.className = 'ask recommend';
  const chips = [
    ...seed.concepts.map(c => `<span class="linkchip">概念 · ${esc(c)}</span>`),
    ...(seed.question ? [`<span class="linkchip">问题 · ${esc(seed.question)}</span>`] : []),
    ...seed.items.map(p => `<span class="linkchip">材料 · ${esc(store.get(p)?.data.title || p)}</span>`),
  ].join('');
  dlg.innerHTML = `<form method="dialog">
    <h2>推荐新材料</h2>
    <p class="hint">围绕：</p><div class="links">${chips || '<span class="muted">（没选东西，会根据整个研究方向推荐）</span>'}</div>
    <label>补充说明（可选）<input name="note" placeholder="比如：想要听障相关的、想要批判性的理论…" value="${esc(seed.note)}"></label>
    <div class="tune">
      <label>数量 <output>${tune.count}</output><input type="range" name="count" min="1" max="8" step="1" value="${tune.count}"></label>
      <label>知名 ↔ 冷门 <output>${tune.obscurity}</output><input type="range" name="obscurity" min="0" max="100" step="5" value="${tune.obscurity}"></label>
      <label>离核心问题 近 ↔ 远 <output>${tune.distance}</output><input type="range" name="distance" min="0" max="100" step="5" value="${tune.distance}"></label>
      <label>wildness <output>${tune.wildness}</output><input type="range" name="wildness" min="0" max="1" step="0.1" value="${tune.wildness}"></label>
    </div>
    <label>只要这些类型（不选 = 不限）</label>
    <div class="chips">${store.vocab('type').map(t => `<button type="button" class="chip${tune.types.includes(t) ? ' on' : ''}" data-type="${esc(t)}">${esc(t)}</button>`).join('')}</div>
    <details><summary>request json</summary><pre id="reqPreview"></pre></details>
    <p class="hint">模型：${esc(modelLabel())}。书和论文会去 Open Library / Crossref 核对，查不到的会被剔除。</p>
    <div class="actions"><button value="cancel" formnovalidate>取消</button><button class="primary" id="go" type="button">推荐</button></div>
  </form>`;
  document.body.append(dlg);

  const read = () => {
    for (const k of ['count', 'obscurity', 'distance']) tune[k] = Number(dlg.querySelector(`[name=${k}]`).value);
    tune.wildness = Number(dlg.querySelector('[name=wildness]').value);
    seed.note = dlg.querySelector('[name=note]').value.trim();
    dlg.querySelector('#reqPreview').textContent = JSON.stringify({ seed, tune, prompt: buildRecommendPrompt(seed, tune) }, null, 2);
  };
  read();
  for (const r of dlg.querySelectorAll('input')) r.addEventListener('input', () => {
    if (r.type === 'range') r.previousElementSibling.textContent = r.value;
    read();
  });
  for (const c of dlg.querySelectorAll('[data-type]')) c.addEventListener('click', () => {
    c.classList.toggle('on');
    tune.types = [...dlg.querySelectorAll('[data-type].on')].map(x => x.dataset.type);
    read();
  });
  dlg.querySelector('#go').addEventListener('click', async () => {
    read(); saveTune(tune);
    const go = dlg.querySelector('#go');
    go.disabled = true; go.textContent = '推荐中…（AI + 核对，约 20 秒）';
    try {
      const { added, leftOut } = await recommend(seed, tune);
      dlg.close();
      toast(`${added} 条推荐进了收件箱${leftOut.length ? `；${leftOut.length} 条在目录里查不到，已剔除` : ''}`);
      if (leftOut.length) console.info('剔除（可能是编造的）：', leftOut);
      location.hash = '#/inbox';
    } catch (e) { toast(e.message, true); go.disabled = false; go.textContent = '推荐'; }
  });
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}
