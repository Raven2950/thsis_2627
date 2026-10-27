// Ideas: a board of idea cards by stage, and a "collision" that puts two unrelated materials side by side.
import { store } from '../store.js';
import { IDEA_STAGES, KIND } from '../model.js';
import { hydrate } from '../media.js';
import { viewOnly, trc } from '../i18n.js';
import { esc, noteHref } from '../markdown.js';
import { asList, linkTarget } from '../note.js';
import { toast, ask } from '../ui.js';
import { ideas, createIdea, setStage, placeOnMap, collisionPair } from '../ideas.js';

let pair = null;

function card(n) {
  const d = n.data, ro = viewOnly(), i = IDEA_STAGES.indexOf(d.stage);
  return `<div class="idea-card" data-path="${esc(n.path)}">
    <a class="idea-text" href="#/open/${encodeURIComponent(n.name)}">${esc(trc(d.idea || n.name))}</a>
    ${d.for_whom ? `<p class="idea-meta"><b>为谁：</b>${esc(trc(d.for_whom))}</p>` : ''}
    ${d.next ? `<p class="idea-meta"><b>下一步：</b>${esc(trc(d.next))}</p>` : ''}
    ${d.from && store.resolve(d.from) ? `<p class="idea-src"><a href="${noteHref(linkTarget(d.from))}">🧠 来自头脑风暴</a></p>` : ''}
    ${asList(d.sources).length ? `<p class="idea-src">${asList(d.sources).map(s => `<a href="${noteHref(linkTarget(s))}">${esc(trc(store.resolve(s)?.data.title || linkTarget(s)))}</a>`).join('<span class="sep">·</span>')}</p>` : ''}
    ${ro ? '' : `<div class="idea-ops">
      ${i > 0 ? `<button class="mini" data-stage="${IDEA_STAGES[i - 1]}" title="往回挪">←</button>` : ''}
      ${i < IDEA_STAGES.length - 1 ? `<button class="mini" data-stage="${IDEA_STAGES[i + 1]}" title="往前推">→</button>` : ''}
      <button class="mini" data-map>放到地图</button><a class="mini-link" href="#/brainstorm?seed=${encodeURIComponent(n.name)}">以它开始头脑风暴</a></div>`}
  </div>`;
}

// Past brainstorms, newest first, with the notebook photos so I can find them again.
function sessionsHtml() {
  const list = store.byKind(KIND.brainstorm).sort((a, b) => String(b.data.date || '').localeCompare(String(a.data.date || '')));
  if (!list.length) return '';
  return `<h2 class="bs-records-h">头脑风暴记录 <span class="count">${list.length}</span></h2>
    <div class="bs-records">${list.map(n => {
      const photos = [...n.body.matchAll(/!\[\[([^\]|]+\.(?:jpe?g|png|webp|heic))(?:\|[^\]]*)?\]\]/gi)].map(m => m[1]);
      return `<a class="bs-record" href="#/open/${encodeURIComponent(n.name)}">
        <span class="muted">${esc(String(n.data.date || ''))} · ${asList(n.data.ideas).length} 个想法 · ${photos.length} 张照片</span>
        <b>${esc(trc(String(n.data.seed || n.name)))}</b>
        ${photos.length ? `<span class="bs-record-photos">${photos.slice(0, 4).map(p => `<img class="vault-img" data-vault-src="${esc(p)}" alt="">`).join('')}</span>` : ''}</a>`;
    }).join('')}</div>`;
}

export function renderIdeas(main) {
  const ro = viewOnly();
  const all = ideas();
  if (!pair || pair.some(p => !store.get(p.path))) pair = collisionPair();
  main.innerHTML = `<section class="ideas-view">
    <div class="list-head"><h1>想法 <span class="count">${all.length}</span></h1>
      ${ro ? '' : '<button id="newIdea">＋ 新想法</button><a class="button primary" href="#/brainstorm">开始头脑风暴</a>'}</div>
    ${!ro && pair.length === 2 ? `<div class="collision">
      <h2>灵感碰撞</h2>
      <p class="hint">两份平时不会放在一起的材料。它们放在一起，你想到什么？没感觉就换一组。</p>
      <div class="pair">${pair.map(p => `<a class="pair-card" href="#/item/${encodeURIComponent(p.path)}">
        <span class="mat-type">${esc(p.data.type || '材料')}</span><b>${esc(p.data.title || p.name)}</b>${p.data.why ? `<span class="hint">${esc(String(p.data.why).slice(0, 110))}</span>` : ''}</a>`).join('<span class="plus">＋</span>')}</div>
      <textarea id="colIdea" rows="2" placeholder="一句话写下冒出来的想法"></textarea>
      <div class="actions left"><button id="colSave" class="primary">存成想法卡</button><button id="colNext">换一组</button></div>
    </div>` : ''}
    <div class="idea-board">${IDEA_STAGES.map(st => {
      const list = all.filter(n => (n.data.stage || IDEA_STAGES[0]) === st);
      return `<div class="idea-col"><h2>${st} <span class="count">${list.length}</span></h2>${list.map(card).join('') || `<p class="empty">${st === IDEA_STAGES[0] ? '还没有想法。碰撞一下，或者开始一次头脑风暴。' : '—'}</p>`}</div>`;
    }).join('')}</div>
    ${sessionsHtml()}
  </section>`;
  hydrate(main);

  main.querySelector('#colNext')?.addEventListener('click', () => { pair = collisionPair(); renderIdeas(main); });
  main.querySelector('#colSave')?.addEventListener('click', async () => {
    const text = main.querySelector('#colIdea').value.trim();
    if (!text) return toast('先写一句想法', true);
    try { await createIdea({ idea: text, sources: pair.map(p => p.name) }); pair = collisionPair(); toast('存成想法卡了'); }
    catch (e) { toast(e.message, true); }
  });
  main.querySelector('#newIdea')?.addEventListener('click', async () => {
    const res = await ask({ title: '新想法', submit: '存下', fields: [
      { name: 'idea', label: '一句话的想法', required: true, multiline: true },
      { name: 'forWhom', label: '为谁、解决什么问题' },
      { name: 'sources', label: '来自哪些材料（可选，用逗号分开）', placeholder: 'Alt-Text as Poetry, Closer Captions' }] });
    if (!res) return;
    try { await createIdea({ idea: res.idea, forWhom: res.forWhom, sources: res.sources.split(/[,，、]/).map(s => s.trim()).filter(Boolean) }); }
    catch (e) { toast(e.message, true); }
  });
  for (const c of main.querySelectorAll('.idea-card')) {
    const path = c.dataset.path;
    for (const b of c.querySelectorAll('[data-stage]')) b.addEventListener('click', () => setStage(path, b.dataset.stage).catch(e => toast(e.message, true)));
    c.querySelector('[data-map]')?.addEventListener('click', async () => {
      try { toast(await placeOnMap(store.get(path)) ? '放到地图上了' : '它已经在地图上了'); } catch (e) { toast(e.message, true); }
    });
  }
}
