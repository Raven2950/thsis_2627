// Guided brainstorm. I think on paper; the page keeps the rhythm: what to do this round, for how long,
// a nudge (a new angle, a random card from my repository), and a clear stop at the end of each round.
// Afterwards: photos of the notebook, a few notes, and the ideas I circled become idea cards.
import { confirmTr } from '../i18n.js';
import { store } from '../store.js';
import { KIND, FOLDER, today } from '../model.js';
import { esc } from '../markdown.js';
import { asList, toLink } from '../note.js';
import { toast, chime, mmss } from '../ui.js';
import { shrinkImage } from '../media.js';
import { createIdea, collisionPair } from '../ideas.js';

const SETTINGS = 'thesis-web-brainstorm';
export const DEFAULT_ROUNDS = [
  { id: 'many', name: '先求多', minutes: 5, on: true, tip: '写下至少 10 个联想。不要评价，越怪越好。' },
  { id: 'angles', name: '换个角度', minutes: 4, on: true, tip: '每看到一个提示，就再写 2–3 个想法。没感觉就点「换一个」。' },
  { id: 'random', name: '强行连接', minutes: 4, on: true, tip: '这份材料和你的问题有什么关系？想到什么都写下来，牵强也没关系。' },
  { id: 'crazy8', name: '快速画 8 格', minutes: 8, on: true, tip: '把纸折成 8 格，每格 1 分钟，画一个方案草图。听到提示音就换下一格。' },
  { id: 'pick', name: '选出 1–2 个', minutes: 3, on: true, tip: '圈出最想继续的 1–2 个，用一句话写下来。' },
];
const ANGLES = ['如果是给小孩用呢？', '如果反过来做呢？', '最极端的使用者是谁？他需要什么？', '如果完全没有屏幕呢？', '如果必须在 30 秒内完成呢？',
  '如果它是一件艺术作品，而不是一个产品呢？', '如果由当事人自己来做呢？', '如果免费？如果很贵？', '十年后它会是什么样？', '最糟糕的版本是什么？',
  '如果要两个人一起用呢？', '如果只能用声音呢？', '把问题缩小到一个具体的人、一个具体的时刻呢？'];

const loadRounds = () => {
  try { const saved = JSON.parse(localStorage.getItem(SETTINGS) || 'null'); if (Array.isArray(saved)) return DEFAULT_ROUNDS.map(r => ({ ...r, ...(saved.find(s => s.id === r.id) || {}) })); }
  catch (e) { /* private mode */ }
  return DEFAULT_ROUNDS.map(r => ({ ...r }));
};
const saveRounds = rounds => { try { localStorage.setItem(SETTINGS, JSON.stringify(rounds.map(({ id, minutes, on }) => ({ id, minutes, on })))); } catch (e) { /* private mode */ } };

let bs = null;   // { phase: 'setup'|'run'|'capture', seed, seedLink, rounds, i, endsAt, timer, angle, card, shown:Set, photos:[], minuteMark }

const pickCard = () => {
  const [a] = collisionPair();
  if (a) bs.shown.add(a.name);
  return a || null;
};

function startRound(extraMin) {
  const r = bs.active[bs.i];
  clearInterval(bs.timer);
  bs.endsAt = Date.now() + (extraMin ?? r.minutes) * 60e3;
  bs.blockSec = (extraMin ?? r.minutes) * 60;
  bs.minuteMark = Math.floor(bs.blockSec / 60);
  if (r.id === 'angles' && !bs.angle) bs.angle = ANGLES[Math.floor(Math.random() * ANGLES.length)];
  if (r.id === 'random' && !bs.card) bs.card = pickCard();
  bs.overdue = false;
  bs.timer = setInterval(tick, 400);
}
function tick() {
  const el = document.getElementById('bsClock');
  if (!el || !bs || bs.phase !== 'run') return;
  const left = (bs.endsAt - Date.now()) / 1000;
  el.textContent = mmss(left);
  el.closest('.bs-timer')?.style.setProperty('--p', `${Math.max(0, Math.min(1, 1 - left / bs.blockSec)) * 100}%`);
  const r = bs.active[bs.i];
  if (r.id === 'crazy8') {                 // a soft chime each minute: next box
    const m = Math.ceil(left / 60);
    if (m < bs.minuteMark && left > 0) { bs.minuteMark = m; chime(1); }
    const done = Math.min(8, Math.floor((bs.blockSec - left) / (bs.blockSec / 8)));
    document.querySelectorAll('.c8 span').forEach((s, i) => s.classList.toggle('on', i === done));
  }
  if (left <= 0 && !bs.overdue) { bs.overdue = true; clearInterval(bs.timer); roundOver(); }
}
function roundOver() {
  chime(3);
  const last = bs.i === bs.active.length - 1;
  const dlg = document.createElement('dialog');
  dlg.className = 'ask focus-stop';
  dlg.innerHTML = `<form method="dialog"><h2>「${esc(bs.active[bs.i].name)}」时间到</h2>
    <div class="stop-choices"><button value="next" class="primary">${last ? '结束，去存档' : `下一轮：${esc(bs.active[bs.i + 1].name)}`}</button>
    <button value="more">再给 2 分钟</button></div></form>`;
  document.body.append(dlg);
  dlg.addEventListener('close', () => { const v = dlg.returnValue; dlg.remove(); v === 'more' ? (startRound(2), rerender()) : next(); });
  dlg.showModal();
}
function next() {
  clearInterval(bs.timer);
  if (bs.i < bs.active.length - 1) { bs.i++; bs.angle = null; bs.card = null; startRound(); }
  else bs.phase = 'capture';
  rerender();
}
let rootEl = null;
const rerender = () => rootEl && renderBrainstorm(rootEl);

/* ---------- screens ---------- */
function setupHtml() {
  const kws = store.byKind(KIND.concept).map(c => c.name);
  const ideaNotes = store.byKind(KIND.idea);
  const liked = store.items().filter(n => n.data.like || n.data.star);
  return `<section class="bs-view">
    <h1>头脑风暴</h1>
    <p class="hint">你在本子上写，这一页负责带节奏：每一轮做什么、做多久，到点会明确提醒。</p>
    <h2>1. 从哪里开始？</h2>
    <textarea id="bsSeed" rows="2" placeholder="一个问题或一个念头，比如：alt text 能不能留出想象的空间？">${esc(bs.seed || '')}</textarea>
    <div class="bs-picks">
      ${ideaNotes.length ? `<select id="bsFromIdea"><option value="">从一张想法卡开始…</option>${ideaNotes.map(n => `<option value="${esc(n.name)}">${esc(String(n.data.idea || n.name).slice(0, 50))}</option>`).join('')}</select>` : ''}
      ${kws.length ? `<select id="bsFromKw"><option value="">从一个关键词开始…</option>${kws.map(k => `<option>${esc(k)}</option>`).join('')}</select>` : ''}
      ${liked.length ? '<button class="mini" id="bsFromLiked">从我 ⭐/♥ 的材料里随机挑一个</button>' : ''}
    </div>
    <h2>2. 轮次 <span class="hint">（可以调时长、关掉某一轮；会记住你的设置）</span></h2>
    <table class="bs-rounds"><tbody>${bs.rounds.map((r, i) => `<tr class="${r.on ? '' : 'off'}">
      <td><input type="checkbox" data-on="${i}"${r.on ? ' checked' : ''}></td><td><b>${esc(r.name)}</b><div class="hint">${esc(r.tip)}</div></td>
      <td class="min"><input type="number" min="1" max="30" value="${r.minutes}" data-min="${i}"> 分钟</td></tr>`).join('')}</tbody></table>
    <div class="actions left"><button class="primary" id="bsGo">开始（共 ${bs.rounds.filter(r => r.on).reduce((a, r) => a + r.minutes, 0)} 分钟）</button><button id="bsReset">恢复默认</button></div>
  </section>`;
}

function runHtml() {
  const r = bs.active[bs.i];
  const card = bs.card;
  return `<section class="bs-view bs-run">
    <p class="bs-seed">起点：${esc(bs.seed)}</p>
    <p class="bs-step">第 ${bs.i + 1} / ${bs.active.length} 轮</p>
    <h1>${esc(r.name)}</h1>
    <p class="bs-tip">${esc(r.tip)}</p>
    <div class="bs-timer"><span id="bsClock">--:--</span></div>
    ${r.id === 'angles' ? `<div class="bs-prompt">${esc(bs.angle)}</div><button class="mini" id="bsAngle">换一个</button>` : ''}
    ${r.id === 'random' && card ? `<div class="bs-card"><span class="mat-type">${esc(card.data.type || '材料')}</span><b>${esc(card.data.title || card.name)}</b>
      ${card.data.why ? `<p class="hint">${esc(String(card.data.why).slice(0, 160))}</p>` : ''}</div><button class="mini" id="bsCard">换一张</button>` : ''}
    ${r.id === 'crazy8' ? `<div class="c8">${Array.from({ length: 8 }, (_, i) => `<span>${i + 1}</span>`).join('')}</div>` : ''}
    <div class="actions"><button id="bsSkip">跳到下一轮</button><button id="bsStop">提前结束，去存档</button></div>
  </section>`;
}

function captureHtml() {
  return `<section class="bs-view">
    <h1>存下这次头脑风暴</h1>
    <p class="hint">起点：${esc(bs.seed)}</p>
    <h2>本子的照片</h2>
    <div class="bs-drop" id="bsDrop" data-own-drop>把照片拖到这里，或 <button class="mini" id="bsPick">选择照片</button><span class="hint">会自动压缩，并去掉拍摄地点</span></div>
    <div class="bs-thumbs">${bs.photos.map((p, i) => `<figure><img src="${p.url}" alt="本子照片 ${i + 1}"><button class="x" data-rm="${i}" title="去掉">×</button></figure>`).join('')}</div>
    <h2>随手记 <span class="hint">（可选：几个关键词就行）</span></h2>
    <textarea id="bsNotes" rows="3">${esc(bs.notes || '')}</textarea>
    <h2>你圈出的想法 <span class="hint">（每一条会变成一张想法卡）</span></h2>
    ${[0, 1, 2].map(i => `<input class="bs-idea" data-idea="${i}" placeholder="想法 ${i + 1}：一句话" value="${esc(bs.ideas[i] || '')}">`).join('')}
    <div class="actions left"><button class="primary" id="bsSave">存档</button><button id="bsDiscard">不存了</button></div>
  </section>`;
}

/* ---------- saving ---------- */
async function save() {
  const date = today();
  const stamp = `${date} ${String(bs.seed).replace(/\s+/g, ' ').slice(0, 24)}`;
  const photoPaths = [];
  for (const [i, p] of bs.photos.entries()) {
    let path = `${FOLDER[KIND.brainstorm]}/图片/${date}-${i + 1}.jpg`;
    for (let k = 2; await store.exists(path); k++) path = `${FOLDER[KIND.brainstorm]}/图片/${date}-${i + 1}-${k}.jpg`;
    await store.writeFile(path, p.blob);
    photoPaths.push(path);
  }
  const noteName = store.uniquePath(FOLDER[KIND.brainstorm], stamp).replace(/^.*\//, '').replace(/\.md$/, '');
  const cards = [];
  for (const text of bs.ideas.map(s => s.trim()).filter(Boolean)) {
    cards.push(await createIdea({ idea: text, sources: [bs.seedLink, ...bs.shown].filter(Boolean), from: noteName }));
  }
  const rounds = bs.active.slice(0, bs.i + 1).map(r => `- ${r.name} · ${r.minutes} 分钟`).join('\n');
  const body = `\n## 起点\n\n${bs.seed}${bs.seedLink ? `（[[${bs.seedLink}]]）` : ''}\n\n## 轮次\n\n${rounds}\n` +
    `${bs.shown.size ? `\n强行连接时翻到的材料：${[...bs.shown].map(n => `[[${n}]]`).join('、')}\n` : ''}` +
    `\n## 本子\n\n${photoPaths.map(p => `![[${p}]]`).join('\n\n') || '（没有照片）'}\n` +
    `${bs.notes ? `\n## 随手记\n\n${bs.notes}\n` : ''}` +
    `\n## 这次想到的\n\n${cards.map(c => `- [[${c.name}]]`).join('\n') || '- '}\n`;
  const note = await store.create(`${FOLDER[KIND.brainstorm]}/${noteName}.md`, {
    kind: KIND.brainstorm, date, seed: bs.seed, seed_link: bs.seedLink ? toLink(bs.seedLink) : null,
    ideas: cards.map(c => toLink(c.name)), materials: [...bs.shown].map(toLink), created: date,
  }, body);
  for (const p of bs.photos) URL.revokeObjectURL(p.url);
  bs = null;
  toast(cards.length ? `存好了，${cards.length} 张想法卡在「想法」页` : '存好了');
  location.hash = `#/open/${encodeURIComponent(note.name)}`;
}

async function addPhotos(files) {
  for (const f of [...files].filter(f => f.type.startsWith('image/'))) {
    try { const blob = await shrinkImage(f); bs.photos.push({ blob, url: URL.createObjectURL(blob) }); }
    catch (e) { toast(`${f.name} 读不了：${e.message}`, true); }
  }
  rerender();
}

/* ---------- entry ---------- */
export function renderBrainstorm(main) {
  rootEl = main;
  if (store.vault.readOnly) { main.innerHTML = '<section class="bs-view"><p class="empty">发布版里不能做头脑风暴。</p></section>'; return; }
  if (!bs) {
    const seedName = new URLSearchParams(location.hash.split('?')[1] || '').get('seed');
    const seedNote = seedName ? store.resolve(seedName) : null;
    bs = { phase: 'setup', rounds: loadRounds(), seed: seedNote ? (seedNote.data.idea || seedNote.name) : '', seedLink: seedNote?.name || null,
      i: 0, shown: new Set(), photos: [], ideas: [], notes: '' };
  }
  main.innerHTML = bs.phase === 'setup' ? setupHtml() : bs.phase === 'run' ? runHtml() : captureHtml();
  const on = (sel, ev, fn) => main.querySelector(sel)?.addEventListener(ev, fn);

  if (bs.phase === 'setup') {
    on('#bsSeed', 'input', e => { bs.seed = e.target.value; bs.seedLink = null; });
    on('#bsFromIdea', 'change', e => { const n = store.resolve(e.target.value); if (n) { bs.seed = n.data.idea || n.name; bs.seedLink = n.name; rerender(); } });
    on('#bsFromKw', 'change', e => { if (e.target.value) { bs.seed = `关于「${e.target.value}」，我能做什么？`; bs.seedLink = e.target.value; rerender(); } });
    on('#bsFromLiked', 'click', () => {
      const pool = store.items().filter(n => n.data.like || n.data.star);
      const n = pool[Math.floor(Math.random() * pool.length)];
      bs.seed = `从「${n.data.title || n.name}」出发，可以做什么？`; bs.seedLink = n.name; rerender();
    });
    for (const c of main.querySelectorAll('[data-on]')) c.addEventListener('change', () => { bs.rounds[c.dataset.on].on = c.checked; saveRounds(bs.rounds); rerender(); });
    for (const c of main.querySelectorAll('[data-min]')) c.addEventListener('change', () => {
      bs.rounds[c.dataset.min].minutes = Math.max(1, Math.min(30, Number(c.value) || 1)); saveRounds(bs.rounds); rerender();
    });
    on('#bsReset', 'click', () => { bs.rounds = DEFAULT_ROUNDS.map(r => ({ ...r })); saveRounds(bs.rounds); rerender(); });
    on('#bsGo', 'click', () => {
      bs.seed = main.querySelector('#bsSeed').value.trim();
      if (!bs.seed) return toast('先写一个起点：一个问题或一个念头', true);
      bs.active = bs.rounds.filter(r => r.on);
      if (!bs.active.length) return toast('至少留一轮', true);
      bs.phase = 'run'; bs.i = 0; startRound(); rerender();
    });
  } else if (bs.phase === 'run') {
    tick();
    on('#bsAngle', 'click', () => { bs.angle = ANGLES.filter(a => a !== bs.angle)[Math.floor(Math.random() * (ANGLES.length - 1))]; rerender(); });
    on('#bsCard', 'click', () => { bs.card = pickCard(); rerender(); });
    on('#bsSkip', 'click', next);
    on('#bsStop', 'click', () => { clearInterval(bs.timer); bs.phase = 'capture'; rerender(); });
  } else {
    const drop = main.querySelector('#bsDrop');
    drop.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); drop.classList.remove('over'); addPhotos(e.dataTransfer.files); });
    on('#bsPick', 'click', () => {
      const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*', multiple: true });
      input.onchange = () => addPhotos(input.files); input.click();
    });
    for (const b of main.querySelectorAll('[data-rm]')) b.addEventListener('click', () => { const [p] = bs.photos.splice(Number(b.dataset.rm), 1); URL.revokeObjectURL(p.url); rerender(); });
    on('#bsNotes', 'input', e => { bs.notes = e.target.value; });
    for (const i of main.querySelectorAll('[data-idea]')) i.addEventListener('input', () => { bs.ideas[i.dataset.idea] = i.value; });
    on('#bsSave', 'click', async e => { e.target.disabled = true; try { await save(); } catch (err) { toast(err.message, true); e.target.disabled = false; } });
    on('#bsDiscard', 'click', () => { if (confirmTr('这次的内容不存了？')) { bs = null; location.hash = '#/ideas'; } });
  }
}
