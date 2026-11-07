// Blog: my own writing (updates, reflections, documentation), apart from the materials. A quiet
// reading page: a short menu on the left (search, tags, posts by date), the post on the right.
// Posts are notes in 博客/ (kind: 博客, title, date, tags); write them here or in Obsidian.
import { store, ConflictError } from '../store.js';
import { KIND, FOLDER, today } from '../model.js';
import { asList } from '../note.js';
import { esc, renderMarkdown } from '../markdown.js';
import { hydrate } from '../media.js';
import { toast, ask } from '../ui.js';
import { viewOnly, trc, isEn, lang, setLang, confirmTr } from '../i18n.js';
import { themeSwitch, bindTheme } from '../theme.js';
import { toolHtml, bindEditorTools, bindReadingTools } from '../highlight.js';

let query = '', tag = '', editing = null;     // editing: { path, title, date, tags, body, base }

// Two-language posts: "X.md" plus "X.en.md" (or "X.zh.md") in the same folder are one post.
// The menu lists it once; a small link by the date switches the language.
const PAIR = /\.(en|zh)$/;
const dirOf = n => n.path.slice(0, n.path.lastIndexOf('/'));
let postLang = null;                            // the language I picked for posts; null = follow the page
function versions(n) {
  const base = n.name.replace(PAIR, ''), here = store.byKind(KIND.post).filter(x => dirOf(x) === dirOf(n));
  const main = here.find(x => x.name === base), en = here.find(x => x.name === `${base}.en`), zh = here.find(x => x.name === `${base}.zh`);
  if (!en && !zh) return null;
  return { main: main || en || zh, en: en || (zh ? main : null), zh: zh || (en ? main : null) };
}
const wanted = () => postLang || (isEn() ? 'en' : 'zh');
// The file to show for a post, and whether it is my own text in that language (then no machine translation).
function shownOf(n) { const v = versions(n); return v ? { file: v[wanted()] || v.main, own: true, v } : { file: n, own: false, v: null }; }
const isTranslationFile = n => PAIR.test(n.name) && versions(n)?.main !== n;

const posts = () => store.byKind(KIND.post).filter(n => !isTranslationFile(n))
  .sort((a, b) => String(b.data.date || b.data.created || '').localeCompare(String(a.data.date || a.data.created || '')));
// A post without a title property takes its first "# heading" as the title (and that heading
// isn't repeated in the body); otherwise the file name.
const H1 = /^\s*#\s+(.+?)\s*(?:\n|$)/;
const titleIn = f => f.data.title || f.body.match(H1)?.[1] || f.name.replace(PAIR, '');
const bodyIn = f => (f.data.title ? f.body : f.body.replace(H1, ''));
const titleOf = n => { const { file, own } = shownOf(n); const t = titleIn(file); return own ? t : trc(t); };
const bodyOf = n => { const { file, own } = shownOf(n); return own ? bodyIn(file) : trc(bodyIn(file)); };
const dateOf = n => String(n.data.date || n.data.created || '').slice(0, 10);
const href = n => `#/blog/${encodeURIComponent(n.name)}`;
function niceDate(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const t = new Date(`${d}T12:00:00`);
  return isEn() ? t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase()
    : `${t.getFullYear()} 年 ${t.getMonth() + 1} 月 ${t.getDate()} 日`;
}
const matches = n => (!tag || asList(n.data.tags).map(String).includes(tag))
  && (!query || `${n.data.title} ${n.name} ${trc(n.body)} ${n.body}`.toLowerCase().includes(query.toLowerCase()));

// Folders under 博客/ are the menu's sections (like a course or a project); open ones are remembered.
// Only the first level counts: a deeper folder just keeps one post's files together
// (博客/thesis/starting-over/… is still in "thesis").
const folderOf = n => (n.path.split('/').length > 2 ? n.path.split('/')[1] : '');
const OPEN_KEY = 'thesis-web-blog-open';
// { folder: true | false } for folders I opened or closed by hand; others open when they hold the post I'm reading.
const folderState = () => { try { const v = JSON.parse(localStorage.getItem(OPEN_KEY) || '{}'); return v && !Array.isArray(v) ? v : {}; } catch (e) { return {}; } };
function toggleFolder(f, wasOpen) {
  const s = folderState(); s[f] = !wasOpen;
  try { localStorage.setItem(OPEN_KEY, JSON.stringify(s)); } catch (e) { /* private mode */ }
}
const CHEVRON = '<svg class="chev" width="12" height="12" viewBox="5 8 14 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';

function side(current) {
  const shown = posts().filter(matches);
  const groups = new Map();
  for (const n of shown) { const f = folderOf(n); if (!groups.has(f)) groups.set(f, []); groups.get(f).push(n); }
  const state = folderState(), searching = !!query || !!tag;
  const item = n => `<li${n === current ? ' class="on"' : ''}><a href="${href(n)}">${esc(titleOf(n))}</a></li>`;
  const folders = [...groups].filter(([f]) => f);
  return `<aside class="blog-side">
    <a class="blog-title" href="#/blog">raven’s blog</a>
    <input class="blog-search" id="blogQ" type="search" placeholder="搜索：" value="${esc(query)}">
    ${tag ? `<p class="blog-tags"><button class="tag on" data-tag="${esc(tag)}">#${esc(tag)} ×</button></p>` : ''}
    <ul class="blog-tree">
      ${folders.map(([f, list]) => {
        const isOpen = searching || (state[f] ?? list.includes(current));
        return `<li class="folder${isOpen ? ' open' : ''}"><button class="folder-title" data-folder="${esc(f)}" aria-expanded="${isOpen}">${CHEVRON}<span>${esc(trc(f))}</span></button>
          ${isOpen ? `<ul class="folder-items">${list.map(item).join('')}</ul>` : ''}</li>`;
      }).join('')}
      ${(groups.get('') || []).map(item).join('')}
      ${shown.length ? '' : '<li class="muted">没有找到</li>'}
    </ul>
    <div class="blog-foot">
      <span class="lang-switch" data-no-tr><button data-blog-lang="zh" class="${isEn() ? '' : 'on'}">中</button><button data-blog-lang="en" class="${isEn() ? 'on' : ''}">EN</button></span>
      ${themeSwitch()}
      <a href="#/map">进入 Marginalia →</a>
      ${viewOnly() ? '' : '<button class="mini" id="newPost">＋ 新文章</button>'}
    </div>
  </aside>`;
}

function postHtml(n) {
  const d = n.data, { file, v } = shownOf(n);
  const other = v && v.en && v.zh ? (v.en === file ? 'zh' : 'en') : null;
  if (editing?.path === file.path) return `<article class="blog-post editing">
    <input id="pTitle" class="p-title" value="${esc(editing.title)}" placeholder="标题" data-no-tr>
    <div class="p-meta"><input id="pDate" type="date" value="${esc(editing.date)}"><input id="pTags" value="${esc(editing.tags)}" placeholder="标签，用逗号分开" data-no-tr></div>
    <div class="hl-bar" id="hlBar" data-no-tr>${toolHtml()}<span class="hint">选中文字再点；Obsidian 里也能看到</span></div>
    <textarea id="pBody" spellcheck="false" data-no-tr placeholder="Markdown，和 Obsidian 里写法一样。图片可以用 ![[图片.png]]">${esc(editing.body)}</textarea>
    <div class="actions left"><button class="primary" id="pSave">保存</button><button id="pCancel">取消</button><span class="hint">⌘/Ctrl + S 保存</span></div>
  </article>`;
  const list = posts(), i = list.indexOf(n), newer = list[i - 1], older = list[i + 1];
  return `<article class="blog-post">
    <h1>${esc(titleOf(n))}</h1>
    <p class="p-date">${dateOf(n) ? `写于 ${esc(niceDate(dateOf(n)))}` : ''}${viewOnly() ? '' : ' · <button class="link" id="pEdit">编辑</button>'}${other ? ` · <button class="link p-lang" data-post-lang="${other}" data-no-tr title="${other === 'en' ? 'Read in English' : '读中文版'}">${other === 'en' ? 'English' : '中文'}</button>` : ''}</p>
    ${asList(d.tags).length ? `<p class="blog-tags">${asList(d.tags).map(t => `<button class="tag" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}</p>` : ''}
    <div class="markdown">${renderMarkdown(bodyOf(n)) || '<p class="muted">（还是空的）</p>'}</div>
    <nav class="p-pager">${older ? `<a href="${href(older)}">← ${esc(titleOf(older))}</a>` : '<span></span>'}${newer ? `<a href="${href(newer)}">${esc(titleOf(newer))} →</a>` : ''}</nav>
  </article>`;
}

function indexHtml() {
  const shown = posts().filter(matches);
  return `<article class="blog-post blog-index">
    <h1>${tag ? `#${esc(tag)}` : '所有文章'}</h1>
    <ul class="blog-list">${shown.map(n => {
      const text = bodyOf(n).replace(/!\[\[[^\]]*\]\]|!\[[^\]]*\]\([^)]*\)|[#>*_`\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
      return `<li><a href="${href(n)}">${esc(titleOf(n))}</a><span class="p-date">${esc(niceDate(dateOf(n)))}</span>
        ${text ? `<p>${esc(text.slice(0, 160))}${text.length > 160 ? '…' : ''}</p>` : ''}</li>`;
    }).join('') || `<li class="muted">${posts().length ? '没有符合的文章' : '还没有文章。'}</li>`}</ul>
  </article>`;
}

export function renderBlog(main, name) {
  document.body.classList.add('blog-mode');
  main.classList.add('wide');
  let post = name ? store.resolve(name) : null;
  // A link straight to "X.en" opens post X in English.
  if (post && isTranslationFile(post)) { postLang = post.name.match(PAIR)[1]; post = versions(post).main; }
  if (name && (!post || post.data.kind !== KIND.post)) {
    main.innerHTML = `<section class="blog">${side(null)}<article class="blog-post"><p class="muted">没有这篇文章。</p></article></section>`;
  } else {
    if (editing && editing.path !== (post && shownOf(post).file.path)) editing = null;
    main.innerHTML = `<section class="blog">${side(post)}${post ? postHtml(post) : indexHtml()}</section>`;
  }
  hydrate(main);
  bind(main, post);
}

function bind(main, post) {
  const q = main.querySelector('#blogQ');
  q.addEventListener('input', () => {
    query = q.value;
    const pos = q.selectionStart;
    renderBlog(main, post?.name || '');
    const again = main.querySelector('#blogQ'); again.focus(); again.setSelectionRange(pos, pos);
  });
  for (const b of main.querySelectorAll('[data-folder]')) b.addEventListener('click', () => { toggleFolder(b.dataset.folder, b.getAttribute('aria-expanded') === 'true'); renderBlog(main, post?.name || ''); });
  for (const b of main.querySelectorAll('[data-tag]')) b.addEventListener('click', () => {
    tag = tag === b.dataset.tag ? '' : b.dataset.tag;
    if (post) location.hash = '#/blog'; else renderBlog(main, '');
  });
  bindTheme(main);
  for (const b of main.querySelectorAll('[data-post-lang]')) b.addEventListener('click', () => { postLang = b.dataset.postLang; renderBlog(main, post.name); });
  for (const b of main.querySelectorAll('[data-blog-lang]')) b.addEventListener('click', () => {
    if (b.dataset.blogLang === lang()) return;
    postLang = null;
    setLang(b.dataset.blogLang);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  main.querySelector('#newPost')?.addEventListener('click', async () => {
    const folders = [...new Set(posts().map(folderOf).filter(Boolean))].sort();
    const res = await ask({ title: '新文章', submit: '开始写', fields: [
      { name: 'title', label: '标题', required: true, placeholder: '比如：Update 4 – 故事的方向' },
      { name: 'folder', label: '放在哪个目录', options: folders, value: folders.includes('thesis') ? 'thesis' : '' },
      { name: 'newFolder', label: '或者新建一个目录', placeholder: '比如：shared-minds' }] });
    if (!res?.title) return;
    const folder = (res.newFolder || res.folder).replace(/[\\:*?"<>|#^[\]]/g, ' ').replace(/\//g, '-').trim();
    try {
      const n = await store.create(store.uniquePath([FOLDER[KIND.post], folder].filter(Boolean).join('/'), res.title), { kind: KIND.post, title: res.title, date: today(), tags: [], created: today() }, '\n');
      editing = { path: n.path, title: res.title, date: today(), tags: '', body: '', base: n.body };
      location.hash = href(n);
    } catch (e) { toast(e.message, true); }
  });
  if (!post) return;
  // Reading: select words → highlighter bar (only on my own text, not a machine translation).
  const reading = main.querySelector('.blog-post:not(.editing) .markdown');
  if (reading && !viewOnly() && (shownOf(post).own || !isEn())) {
    const f = shownOf(post).file;
    bindReadingTools(reading, () => f.body, async body => {
      try {
        await store.update(f.path, data => ({ data, body }), { expectBody: f.body });
        renderBlog(main, post.name);
      } catch (err) { toast(err instanceof ConflictError ? '这篇文章在 Obsidian 里刚被改过，重新载入后再试' : err.message, true); }
    });
  }
  main.querySelector('#pEdit')?.addEventListener('click', () => {
    // Edit the version on screen (in a two-language post, that language's file).
    const f = shownOf(post).file, d = f.data;
    editing = { path: f.path, title: titleIn(f), origTitle: titleIn(f), date: dateOf(f) || dateOf(post) || today(), tags: asList(d.tags || post.data.tags).join(', '), body: f.body.replace(/^\n/, ''), base: f.body };
    renderBlog(main, post.name);
    main.querySelector('#pBody')?.focus();
  });
  const body = main.querySelector('#pBody');
  if (!body) return;
  const fit = () => { body.style.height = 'auto'; body.style.height = `${Math.max(360, body.scrollHeight + 4)}px`; };
  fit();
  for (const [id, key] of [['#pTitle', 'title'], ['#pDate', 'date'], ['#pTags', 'tags'], ['#pBody', 'body']]) main.querySelector(id).addEventListener('input', e => { editing[key] = e.target.value; if (key === 'body') fit(); });
  bindEditorTools(main.querySelector('#hlBar'), body, () => { editing.body = body.value; fit(); });
  const save = async (force = false) => {
    const e = editing;
    try {
      await store.update(e.path, data => {
        // Only write a title property when I changed it (a title taken from the heading stays in the heading).
        if (e.title.trim() && e.title.trim() !== e.origTitle) data.title = e.title.trim();
        data.date = e.date || data.date;
        data.tags = e.tags.split(/[,，]/).map(t => t.trim().replace(/^#/, '')).filter(Boolean);
        return { data, body: `\n${e.body.replace(/^\n/, '')}` };
      }, { expectBody: force ? null : e.base });
      editing = null;
      toast('已保存');
      renderBlog(main, post.name);
    } catch (err) {
      if (!(err instanceof ConflictError)) return toast(err.message, true);
      if (confirmTr('这篇文章在 Obsidian 里被改过了。确定：用这里的版本覆盖；取消：放弃这里的修改')) return save(true);
      editing = null; await store.reload();
    }
  };
  main.querySelector('#pSave').addEventListener('click', () => save());
  main.querySelector('#pCancel').addEventListener('click', () => { editing = null; renderBlog(main, post.name); });
  body.addEventListener('keydown', ev => { if ((ev.metaKey || ev.ctrlKey) && ev.key === 's') { ev.preventDefault(); save(); } });
}

export function leaveBlog(main) {
  if (!document.body.classList.contains('blog-mode')) return;
  document.body.classList.remove('blog-mode');
  main.classList.remove('wide');
}
