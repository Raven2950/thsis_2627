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

let query = '', tag = '', editing = null;     // editing: { path, title, date, tags, body, base }

const posts = () => store.byKind(KIND.post)
  .sort((a, b) => String(b.data.date || b.data.created || '').localeCompare(String(a.data.date || a.data.created || '')));
const titleOf = n => trc(n.data.title || n.name);
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

function side(current) {
  const all = posts(), shown = all.filter(matches);
  const tags = [...new Set(all.flatMap(n => asList(n.data.tags).map(String)))].sort();
  return `<aside class="blog-side">
    <a class="blog-title" href="#/blog">raven’s thesis blog</a>
    <input class="blog-search" id="blogQ" type="search" placeholder="搜索：" value="${esc(query)}" data-no-tr>
    ${tags.length ? `<p class="blog-tags">${tags.map(t => `<button class="tag${t === tag ? ' on' : ''}" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}</p>` : ''}
    <ul class="blog-menu">${shown.map(n => `<li${n === current ? ' class="on"' : ''}><a href="${href(n)}">${esc(titleOf(n))}</a><span>${esc(dateOf(n))}</span></li>`).join('') || '<li class="muted">没有找到</li>'}</ul>
    <div class="blog-foot">
      <span class="lang-switch" data-no-tr><button data-blog-lang="zh" class="${isEn() ? '' : 'on'}">中</button><button data-blog-lang="en" class="${isEn() ? 'on' : ''}">EN</button></span>
      <a href="#/map">进入 Thesis Web →</a>
      ${viewOnly() ? '' : '<button class="mini" id="newPost">＋ 新文章</button>'}
    </div>
  </aside>`;
}

function postHtml(n) {
  const d = n.data;
  if (editing?.path === n.path) return `<article class="blog-post editing">
    <input id="pTitle" class="p-title" value="${esc(editing.title)}" placeholder="标题" data-no-tr>
    <div class="p-meta"><input id="pDate" type="date" value="${esc(editing.date)}"><input id="pTags" value="${esc(editing.tags)}" placeholder="标签，用逗号分开" data-no-tr></div>
    <textarea id="pBody" spellcheck="false" data-no-tr placeholder="Markdown，和 Obsidian 里写法一样。图片可以用 ![[图片.png]]">${esc(editing.body)}</textarea>
    <div class="actions left"><button class="primary" id="pSave">保存</button><button id="pCancel">取消</button><span class="hint">⌘/Ctrl + S 保存</span></div>
  </article>`;
  const list = posts(), i = list.indexOf(n), newer = list[i - 1], older = list[i + 1];
  return `<article class="blog-post">
    <h1>${esc(titleOf(n))}</h1>
    <p class="p-date">${dateOf(n) ? `写于 ${esc(niceDate(dateOf(n)))}` : ''}${viewOnly() ? '' : ' · <button class="link" id="pEdit">编辑</button>'}</p>
    ${asList(d.tags).length ? `<p class="blog-tags">${asList(d.tags).map(t => `<button class="tag" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}</p>` : ''}
    <div class="markdown">${renderMarkdown(trc(n.body)) || '<p class="muted">（还是空的）</p>'}</div>
    <nav class="p-pager">${older ? `<a href="${href(older)}">← ${esc(titleOf(older))}</a>` : '<span></span>'}${newer ? `<a href="${href(newer)}">${esc(titleOf(newer))} →</a>` : ''}</nav>
  </article>`;
}

function indexHtml() {
  const shown = posts().filter(matches);
  return `<article class="blog-post blog-index">
    <h1>${tag ? `#${esc(tag)}` : '所有文章'}</h1>
    <ul class="blog-list">${shown.map(n => {
      const text = trc(n.body).replace(/!\[\[[^\]]*\]\]|!\[[^\]]*\]\([^)]*\)|[#>*_`\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
      return `<li><a href="${href(n)}">${esc(titleOf(n))}</a><span class="p-date">${esc(niceDate(dateOf(n)))}</span>
        ${text ? `<p>${esc(text.slice(0, 160))}${text.length > 160 ? '…' : ''}</p>` : ''}</li>`;
    }).join('') || `<li class="muted">${posts().length ? '没有符合的文章' : '还没有文章。'}</li>`}</ul>
  </article>`;
}

export function renderBlog(main, name) {
  document.body.classList.add('blog-mode');
  main.classList.add('wide');
  const post = name ? store.resolve(name) : null;
  if (name && (!post || post.data.kind !== KIND.post)) {
    main.innerHTML = `<section class="blog">${side(null)}<article class="blog-post"><p class="muted">没有这篇文章。</p></article></section>`;
  } else {
    if (editing && editing.path !== post?.path) editing = null;
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
  for (const b of main.querySelectorAll('[data-tag]')) b.addEventListener('click', () => {
    tag = tag === b.dataset.tag ? '' : b.dataset.tag;
    if (post) location.hash = '#/blog'; else renderBlog(main, '');
  });
  for (const b of main.querySelectorAll('[data-blog-lang]')) b.addEventListener('click', () => {
    if (b.dataset.blogLang === lang()) return;
    setLang(b.dataset.blogLang);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  main.querySelector('#newPost')?.addEventListener('click', async () => {
    const res = await ask({ title: '新文章', submit: '开始写', fields: [{ name: 'title', label: '标题', required: true, placeholder: '比如：Update 4 – 故事的方向' }] });
    if (!res?.title) return;
    try {
      const n = await store.create(store.uniquePath(FOLDER[KIND.post], res.title), { kind: KIND.post, title: res.title, date: today(), tags: [], created: today() }, '\n');
      editing = { path: n.path, title: res.title, date: today(), tags: '', body: '', base: n.body };
      location.hash = href(n);
    } catch (e) { toast(e.message, true); }
  });
  if (!post) return;
  main.querySelector('#pEdit')?.addEventListener('click', () => {
    const d = post.data;
    editing = { path: post.path, title: d.title || post.name, date: dateOf(post) || today(), tags: asList(d.tags).join(', '), body: post.body.replace(/^\n/, ''), base: post.body };
    renderBlog(main, post.name);
    main.querySelector('#pBody')?.focus();
  });
  const body = main.querySelector('#pBody');
  if (!body) return;
  const fit = () => { body.style.height = 'auto'; body.style.height = `${Math.max(360, body.scrollHeight + 4)}px`; };
  fit();
  for (const [id, key] of [['#pTitle', 'title'], ['#pDate', 'date'], ['#pTags', 'tags'], ['#pBody', 'body']]) main.querySelector(id).addEventListener('input', e => { editing[key] = e.target.value; if (key === 'body') fit(); });
  const save = async (force = false) => {
    const e = editing;
    try {
      await store.update(e.path, data => {
        data.title = e.title.trim() || data.title;
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
