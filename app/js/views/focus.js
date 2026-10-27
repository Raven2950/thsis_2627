// Focus reading: one material, a short timer that stops clearly, small steps to tick, a box to
// catch quotes and reactions straight into 我得到了什么, and "I want to stop" that remembers where.
import { store } from '../store.js';
import { KIND, today } from '../model.js';
import { esc, renderMarkdown } from '../markdown.js';
import { toast, ask, chime, mmss } from '../ui.js';
import { vaultUrl } from '../media.js';
import { linkTarget } from '../note.js';
import { isEn, trc } from '../i18n.js';

export const LOG_PATH = '_系统/专注记录.json';
const DEFAULT_MIN = 10;

let session = null;     // { path, startedAt, endsAt, minutes, steps: [{text, done}], timer, paused, left }

/* ---------- reading log, for "this week I read…" ---------- */
export async function readLog() { return store.readJson(LOG_PATH, { sessions: [] }); }
async function logSession(path, minutes) {
  if (minutes < 1 || store.vault.readOnly) return;
  const log = await readLog();
  log.sessions.push({ path, date: today(), minutes: Math.round(minutes) });
  await store.writeJson(LOG_PATH, log);
}
export async function weekStats() {
  const log = await readLog();
  const since = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
  const recent = log.sessions.filter(s => s.date >= since);
  return { minutes: recent.reduce((a, s) => a + s.minutes, 0), materials: new Set(recent.map(s => s.path)).size, sessions: recent.length };
}

/* ---------- steps: from the reading guide's "how to read", then two small fixed ones ---------- */
function defaultSteps(note) {
  // In English, take the line from the translated guide (its label is worded freely, e.g. "How to read it").
  const how = isEn()
    ? trc(note.body).match(/\*\*[^*\n]*(?:read|approach)[^*\n]*\*\*\s*[：:]\s*([^\n]+)/i)?.[1]?.replace(/\s*\((?:about|approximately|approx\.?|~)[^)]*\)/gi, '').trim()
    : note.body.match(/\*\*建议怎么读\*\*[：:]\s*([^\n]+)/)?.[1]?.replace(/（约[^）]*）/g, '').trim();
  return [
    how ? `先读：${how}` : '先读开头或摘要，弄清它在讲什么',
    '找一句让你有反应的话，复制到右边',
    '写一句你自己的反应',
  ].map(text => ({ text, done: false }));
}

/* ---------- writing into the note ---------- */
function appendToGot(body, block) {
  const lines = body.split('\n');
  const start = lines.findIndex(l => /^##\s*我得到了什么\s*$/.test(l));
  if (start < 0) return `${body.trimEnd()}\n\n## 我得到了什么\n\n${block}\n`;
  let end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  if (end < 0) end = lines.length;
  while (end > start + 1 && !lines[end - 1].trim()) end--;
  lines.splice(end, 0, '', block);
  return lines.join('\n');
}
const capture = (path, { quote, page, reaction }) => store.update(path, (data, body) => {
  const parts = [];
  if (quote) parts.push(`> ${quote.replace(/\n+/g, ' ')}${page ? `（${page}）` : ''}`);
  if (reaction) parts.push(`${quote ? '\n' : ''}${reaction}（${today()}）`);
  if (data.status === '想读') data.status = '在读';
  return { body: appendToGot(body, parts.join('\n')) };
});

/* ---------- timer ---------- */
function start(minutes) {
  clearInterval(session.timer);
  session.minutes += minutes;
  session.endsAt = Date.now() + minutes * 60e3;
  session.paused = false;
  session.overdue = false;
  session.timer = setInterval(tick, 500);
  tick();
}
function tick() {
  const el = document.getElementById('focusClock');
  if (!el || !session) { clearInterval(session?.timer); return; }
  const left = (session.endsAt - Date.now()) / 1000;
  el.textContent = mmss(left);
  el.parentElement.style.setProperty('--p', `${Math.max(0, Math.min(1, 1 - left / (session.lastBlock * 60))) * 100}%`);
  // Re-renders call tick() too: ask only once per block.
  if (left <= 0 && !session.overdue) { session.overdue = true; clearInterval(session.timer); timeUp(); }
}
function timeUp() {
  chime(3);
  const dlg = document.createElement('dialog');
  dlg.className = 'ask focus-stop';
  dlg.innerHTML = `<form method="dialog"><h2>时间到了</h2>
    <p>你已经专心读了 ${Math.round(session.minutes)} 分钟。接下来？</p>
    <div class="stop-choices">
      <button value="5" class="primary">再读 5 分钟</button><button value="10">再读 10 分钟</button>
      <button value="rest">休息一下（先记下读到哪）</button><button value="end">结束</button>
    </div></form>`;
  document.body.append(dlg);
  dlg.addEventListener('close', () => {
    const v = dlg.returnValue; dlg.remove();
    if (v === '5' || v === '10') { session.lastBlock = Number(v); start(Number(v)); }
    else if (v === 'rest') wantToStop();
    else finish();
  });
  dlg.showModal();
}

async function finish(message = '这次专注结束了，干得好。') {
  if (!session) return;
  clearInterval(session.timer);
  const used = session.minutes - Math.max(0, (session.endsAt - Date.now()) / 60e3);
  const path = session.path;
  session = null;
  await logSession(path, used).catch(() => {});
  toast(message);
  location.hash = `#/item/${encodeURIComponent(path)}`;
}

async function wantToStop() {
  const res = await ask({
    title: '先停在这里', submit: '记下来，去休息',
    note: '写半句就好，下次打开会从这里提醒你。',
    fields: [{ name: 'at', label: '读到哪了', placeholder: '比如：第 3 节 / 第 12 页 / 视频 5:30' },
      { name: 'thinking', label: '脑子里在想什么', multiline: true, placeholder: '一个没想完的念头也可以' }],
  });
  if (!res) return;
  const text = [res.at, res.thinking].filter(Boolean).join('：');
  if (text) await store.update(session.path, d => { d.resume = `${text}（${today()}）`; }).catch(e => toast(e.message, true));
  finish('记下了。休息一下，下次从这里接着来。');
}

/* ---------- page ---------- */
export async function renderFocus(main, note) {
  if (!note || note.data.kind !== KIND.item) {
    main.innerHTML = '<section class="detail"><p class="empty">找不到这份材料。</p><a href="#/plan">← 阅读计划</a></section>';
    return;
  }
  const d = note.data, ro = store.vault.readOnly;
  if (!session || session.path !== note.path) {
    clearInterval(session?.timer);
    session = { path: note.path, minutes: 0, steps: defaultSteps(note), lastBlock: DEFAULT_MIN, chosen: DEFAULT_MIN, started: false, draft: {} };
  }
  const file = linkTarget(d.file);
  const hasFile = file && store.resolveFile(file);
  const guide = note.body.match(/> \[!ai\] 导读[\s\S]*?(?=\n(?!>)|$)/)?.[0];

  main.classList.add('wide');
  main.innerHTML = `<section class="focus-view">
    <div class="focus-source">
      ${hasFile ? '<iframe class="focus-frame" title="原文"></iframe>'
        : `<div class="focus-nofile">
            <h2>${esc(d.title || note.name)}</h2>
            ${d.url ? `<p><button class="primary" id="openSrc">打开原文（新窗口）</button></p><p class="hint">把原文窗口和这个页面并排放，读的时候右边一直在。</p>` : '<p class="hint">这份材料没有链接或附件。</p>'}
            ${guide ? `<div class="markdown focus-guide">${renderMarkdown(guide)}</div>` : ''}
          </div>`}
    </div>
    <aside class="focus-panel">
      <a href="#/item/${encodeURIComponent(note.path)}" class="focus-back">← 退出专注</a>
      <h2>${esc(d.title || note.name)}</h2>
      ${d.resume ? `<p class="resume">上次停在：${esc(d.resume)}</p>` : ''}
      <div class="focus-timer${session.started ? '' : ' idle'}">
        ${session.started ? `<span id="focusClock">--:--</span>`
          : `<div class="focus-start"><label>读多久 <select id="focusMin">${[5, 10, 15, 20, 25].map(m => `<option${m === session.chosen ? ' selected' : ''}>${m}</option>`).join('')}</select> 分钟</label>
              <button class="primary" id="focusGo">开始</button></div>`}
      </div>
      <h3>这次只做这几步</h3>
      <ul class="focus-steps">${session.steps.map((s, i) => `<li><label><input type="checkbox" data-step="${i}"${s.done ? ' checked' : ''}> ${esc(s.text)}</label></li>`).join('')}</ul>
      <button class="mini" id="addStep">＋ 加一步</button>
      ${ro ? '' : `<h3>随手记 <span class="hint">存进「我得到了什么」</span></h3>
        <textarea id="capQuote" rows="3" placeholder="粘贴一句原文">${esc(session.draft.capQuote || '')}</textarea>
        <input id="capPage" placeholder="出处：页码 / 段落 / 时间点" value="${esc(session.draft.capPage || '')}">
        <textarea id="capReact" rows="2" placeholder="你的反应：它让你想到什么？">${esc(session.draft.capReact || '')}</textarea>
        <div class="actions left"><button id="capSave">存下这一条</button></div>`}
      <div class="actions focus-end">${ro ? '' : '<button id="wantStop">我想玩了</button>'}<button id="focusDone">读完了</button></div>
    </aside>
  </section>`;

  if (hasFile) vaultUrl(file).then(u => { const f = main.querySelector('.focus-frame'); if (f) f.src = u; }).catch(() => {});
  main.querySelector('#openSrc')?.addEventListener('click', () => window.open(d.url, 'thesis-source', 'width=900,height=1000'));
  main.querySelector('#focusGo')?.addEventListener('click', () => {
    session.chosen = Number(main.querySelector('#focusMin').value);
    session.lastBlock = session.chosen;
    session.started = true;
    if (d.status === '想读' && !ro) store.update(note.path, x => { x.status = '在读'; }).catch(() => {});
    renderFocus(main, store.get(note.path) || note);
    start(session.chosen);
  });
  if (session.started) tick();
  for (const c of main.querySelectorAll('[data-step]')) c.addEventListener('change', () => { session.steps[c.dataset.step].done = c.checked; });
  main.querySelector('#addStep').addEventListener('click', async () => {
    const res = await ask({ title: '加一步', fields: [{ name: 'v', label: '一个小步骤', required: true, placeholder: '比如：看完第二节的图' }] });
    if (res?.v) { session.steps.push({ text: res.v, done: false }); renderFocus(main, store.get(note.path) || note); }
  });
  // Coming back from the source window reloads the vault and re-renders: keep what I was typing.
  for (const id of ['capQuote', 'capPage', 'capReact']) main.querySelector(`#${id}`)?.addEventListener('input', e => { session.draft[id] = e.target.value; });
  main.querySelector('#capSave')?.addEventListener('click', async () => {
    const v = { quote: main.querySelector('#capQuote').value.trim(), page: main.querySelector('#capPage').value.trim(), reaction: main.querySelector('#capReact').value.trim() };
    if (!v.quote && !v.reaction) return toast('先写点什么', true);
    try { await capture(note.path, v); toast('存进「我得到了什么」了'); for (const id of ['#capQuote', '#capPage', '#capReact']) main.querySelector(id).value = ''; session.draft = {}; }
    catch (e) { toast(e.message, true); }
  });
  main.querySelector('#wantStop')?.addEventListener('click', wantToStop);
  main.querySelector('#focusDone').addEventListener('click', async () => {
    if (!ro) await store.update(note.path, x => { x.status = '读过'; x.read = x.read || today(); x.resume = null; }).catch(e => toast(e.message, true));
    finish('读完一份！');
  });
}

export function leaveFocus(main) { main.classList.remove('wide'); }
// Keep the clock running while I glance at another page; the session ends only by its buttons.
export const focusActive = () => session?.started ? session.path : null;
