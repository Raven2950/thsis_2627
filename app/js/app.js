import { store } from './store.js';
import { canWrite, pickVault, restoreVault, regrant, pickSnapshot, demoVault, publishedVault, hasPublished } from './vault.js';
import { esc } from './markdown.js';
import { toast } from './ui.js';
import { renderList } from './views/list.js';
import { renderDetail } from './views/detail.js';
import { renderOptions } from './views/options.js';
import { renderMap, leaveMap } from './views/map.js';
import { renderInbox } from './views/inbox.js';
import { renderGaps } from './views/gaps.js';
import { renderSettings } from './views/settings.js';
import { renderPlan } from './views/plan.js';
import { renderIdeas } from './views/ideas.js';
import { renderBrainstorm } from './views/brainstorm.js';
import { renderFocus, leaveFocus } from './views/focus.js';
import { installCapture } from './views/capture.js';
import { lang, isEn, setLang, applyLang } from './i18n.js';
import { renderBoards, renderBoard, leaveBoard } from './views/board.js';
import { renderBlog, leaveBlog } from './views/blog.js';
import { themeSwitch, bindTheme } from './theme.js';
import { KIND } from './model.js';
import { pendingTexts, translatePending } from './translate.js';

const main = document.getElementById('main');
const PUBLISHED = '../vault/';          // where the GitHub Action puts the published vault
const statusEl = document.getElementById('vaultStatus');

// Header on one line if it fits, otherwise two rows (see .topbar.stacked in main.css).
const topbar = document.querySelector('.topbar');
function fitTopbar() {
  topbar.classList.remove('stacked');
  if (topbar.scrollWidth > topbar.clientWidth + 1) topbar.classList.add('stacked');
}
{ const ro = new ResizeObserver(() => requestAnimationFrame(fitTopbar));
  for (const el of [document.body, statusEl, topbar.querySelector('nav')]) ro.observe(el); }

// Saving re-renders the page; put the cursor back where it was (e.g. after tabbing to the next field).
function route() {
  const active = document.activeElement;
  const focusId = main.contains(active) && active.id ? active.id : null;
  const sel = focusId && 'selectionStart' in active ? [active.selectionStart, active.selectionEnd] : null;
  render();
  if (!focusId) return;
  const el = document.getElementById(focusId);
  if (!el || el === document.activeElement) return;
  el.focus();
  if (sel) try { el.setSelectionRange(...sel); } catch (e) { /* not a text field */ }
}

const langSwitch = () => `<span class="lang-switch" data-no-tr role="group" aria-label="Language">
  <button data-lang="zh" class="${isEn() ? '' : 'on'}" aria-pressed="${!isEn()}">中</button><button data-lang="en" class="${isEn() ? 'on' : ''}" aria-pressed="${isEn()}">EN</button></span>`;

// How many of my texts still lack an English version (owner only; checked after each render).
let trBusy = false;
async function refreshTranslateButton() {
  const btn = document.getElementById('trBtn');
  if (!btn || trBusy) return;
  const n = (await pendingTexts().catch(() => [])).length;
  btn.hidden = !n;
  btn.textContent = `更新英文版（${n}）`;
}
async function runTranslate() {
  if (trBusy) return;
  trBusy = true;
  const btn = document.getElementById('trBtn');
  try {
    const { translated, failed } = await translatePending((done, total) => {
      if (btn) btn.textContent = isEn() ? `Translating ${done}/${total}…` : `翻译中 ${done}/${total}…`;
    });
    toast(isEn() ? `Translated ${translated}${failed.length ? `; ${failed.length} left for next time` : ''}`
      : `翻译了 ${translated} 段${failed.length ? `；${failed.length} 段没成功，下次再试` : ''}`);
  } catch (e) { toast(e.message, true); }
  trBusy = false;
  refreshTranslateButton();
}

/* ---------- 发布 button ----------
   The page can't run git itself, so it leaves a note in the vault (_系统/发布请求.json); a small
   background program on this Mac (scripts/install-autopublish.sh) sees it, runs scripts/publish.sh
   and writes the result to _系统/发布状态.json, which we wait for here. */
let publishing = false;
const setPublishLabel = t => { const b = document.getElementById('publishBtn'); if (b) { b.textContent = t; b.disabled = publishing; } };
async function publish() {
  if (publishing) return;
  publishing = true;
  setPublishLabel('发布中…');
  const asked = Date.now();
  let done = null;
  try {
    await store.writeJson('_系统/发布请求.json', { at: asked });
    for (let i = 0; i < 45 && !done; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const s = await store.readJson('_系统/发布状态.json', null);
      if (s && s.at >= asked - 1000) done = s;
    }
  } catch (e) { done = { result: 'fail', message: e.message }; }
  publishing = false;
  setPublishLabel('发布');
  if (!done) toast('没等到发布结果：后台程序可能没开，运行一次 scripts/install-autopublish.sh，或双击「发布.command」', true);
  else if (done.result === 'ok') toast('已发布，网站一两分钟后更新');
  else if (done.result === 'none') toast('没有新的改动，网站已经是最新的');
  else toast(done.message || '发布失败', true);
}

function render() {
  const v = store.vault;
  applyLang();
  document.body.classList.toggle('published', !!v?.published);
  document.body.classList.toggle('lang-en', isEn());
  // Visitors see a plain site: no labels, just a small way in for me (opening my vault to edit).
  statusEl.innerHTML = !v ? '' : v.published
    ? (canWrite ? '<button class="ghost owner-btn" id="ownerBtn" title="打开我的库来编辑">✎</button>' : '')
    : `<span class="vault-name" title="库文件夹"><i>库</i>${esc(v.name)}</span>${v.readOnly ? '<span class="badge">只读</span>' : ''}${v.demo ? '<span class="badge demo" title="测试用：修改只保存在这个页面里">测试</span>' : ''}
       <button class="ghost" id="reloadBtn" title="重新读取库里的文件">重新载入</button>
       ${!v.readOnly && !v.demo ? '<button class="publish-btn" id="publishBtn" title="把库里的改动发布到网站上">发布</button>' : ''}`;
  statusEl.insertAdjacentHTML('afterbegin', langSwitch() + themeSwitch());
  bindTheme(statusEl);
  if (v && !v.readOnly && !v.demo) {
    statusEl.insertAdjacentHTML('afterbegin', '<button class="ghost" id="trBtn" hidden title="把我写的中文内容翻成英文，存进库里；只翻新的">更新英文版</button>');
    document.getElementById('trBtn').addEventListener('click', runTranslate);
    refreshTranslateButton();
  }
  for (const b of statusEl.querySelectorAll('[data-lang]')) b.addEventListener('click', () => {
    if (b.dataset.lang === lang()) return;
    setLang(b.dataset.lang);
    route();
  });
  document.getElementById('reloadBtn')?.addEventListener('click', () => store.reload().then(() => toast('已重新载入')));
  document.getElementById('publishBtn')?.addEventListener('click', publish);
  requestAnimationFrame(fitTopbar);
  if (publishing) setPublishLabel('发布中…');
  document.getElementById('ownerBtn')?.addEventListener('click', () => renderWelcome());
  if (!v) return renderWelcome();

  const [, rawView, rawArg] = location.hash.match(/^#\/([^/?]*)\/?([^?]*)/) || [];
  const view = rawView, arg = rawArg;
  for (const a of document.querySelectorAll('[data-nav]')) a.classList.toggle('active', a.dataset.nav === (view === 'board' ? 'boards' : view));
  const param = arg ? decodeURIComponent(arg) : '';
  const inboxCount = store.inbox().length;
  const badge = document.querySelector('[data-nav="inbox"] .nav-count');
  if (badge) badge.textContent = inboxCount || '';
  if (view !== 'board') leaveBoard(main);
  if (view !== 'blog') leaveBlog(main);
  if (view === 'map' || view === 'graph') return renderMap(main);
  leaveMap(main);
  if (view === 'board') return renderBoard(main, param);
  if (view === 'blog') return renderBlog(main, param);
  if (view === 'inbox') return renderInbox(main);
  if (view === 'gaps') return renderGaps(main);
  if (view === 'focus') return renderFocus(main, store.get(param));
  leaveFocus(main);
  if (view === 'plan') return renderPlan(main);
  if (view === 'ideas') return renderIdeas(main);
  if (view === 'boards') return renderBoards(main);
  if (view === 'brainstorm') return renderBrainstorm(main);
  if (view === 'settings') return renderSettings(main);
  // Posts live on the blog page; old links to them (e.g. #/item/材料/Update3….md) still land there.
  if (view === 'item' || view === 'open') {
    const note = view === 'item' ? store.get(param) || store.resolve(param.split('/').pop().replace(/\.md$/, '')) : store.resolve(param);
    if (note?.data.kind === KIND.post) { location.replace(`#/blog/${encodeURIComponent(note.name)}`); return; }
    return renderDetail(main, note);
  }
  if (view === 'options') return renderOptions(main);
  return renderList(main);
}

async function renderWelcome(pending) {
  pending ??= (await restoreVault().catch(() => null))?.pending;
  const published = await hasPublished(PUBLISHED);
  document.body.classList.remove('published');
  main.innerHTML = `
    <section class="welcome">
      <h1>打开你的 thesis 库</h1>
      <p>选择 Obsidian 里那个库的文件夹。网页直接读写里面的 .md 笔记，不会另存一份数据。</p>
      ${pending ? `<button class="primary" id="regrantBtn">继续使用「${esc(pending.name)}」</button>` : ''}
      ${published ? '<button id="viewPublished">看网站上的版本</button>' : ''}
      ${canWrite
        ? `<button class="${pending ? '' : 'primary'}" id="pickBtn">选择库文件夹…</button>`
        : `<button class="primary" id="snapBtn">以只读方式打开文件夹…</button>
           <p class="hint">当前浏览器不支持写入本地文件夹。要编辑，请用 Chrome 打开。</p>`}
    </section>`;
  const open = async get => {
    try { const v = await get(); if (v) { await store.open(v); route(); } }
    catch (e) { if (e.name !== 'AbortError') toast(e.message, true); }
  };
  document.getElementById('regrantBtn')?.addEventListener('click', () => open(() => regrant(pending)));
  document.getElementById('pickBtn')?.addEventListener('click', () => open(pickVault));
  document.getElementById('snapBtn')?.addEventListener('click', () => open(pickSnapshot));
  document.getElementById('viewPublished')?.addEventListener('click', () => open(async () => publishedVault(PUBLISHED)));
}

window.addEventListener('hashchange', route);
installCapture();
store.subscribe(route);

// Pick up edits made in Obsidian when coming back to this tab.
let lastReload = 0;
window.addEventListener('focus', () => {
  if (!store.vault || store.vault.readOnly || Date.now() - lastReload < 1500) return;
  lastReload = Date.now();
  store.reload().catch(e => toast(e.message, true));
});

(async () => {
  // ?demo (edits kept in memory) is only for testing on this computer; on the website it is ignored.
  const params = new URLSearchParams(location.search);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (params.has('demo') && local) { await store.open(demoVault(params.get('demo') || '../vault/')); return route(); }
  if (params.has('demo')) { params.delete('demo'); history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}${location.hash}`); }
  const restored = await restoreVault().catch(() => null);
  if (restored?.vault) await store.open(restored.vault).catch(e => toast(e.message, true));
  // A visitor (no folder of their own) lands on the published version, starting at the map.
  if (!store.vault && await hasPublished(PUBLISHED)) {
    await store.open(publishedVault(PUBLISHED)).catch(e => toast(e.message, true));
    if (store.vault && !location.hash) history.replaceState(null, '', '#/map');
  }
  if (store.vault) route(); else renderWelcome(restored?.pending);
})();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { /* not critical */ });
