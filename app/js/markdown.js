// Render a note body: Markdown + Obsidian wikilinks and callouts.
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const noteHref = name => `#/open/${encodeURIComponent(name)}`;

const CALLOUT_LABEL = { ai: 'AI', quote: '引用', note: '笔记', question: '问题' };

export function renderMarkdown(src) {
  // ![[x.png]] shows the image; ![[附件/x.pdf]] becomes a link the page opens from the vault.
  const withEmbeds = src.replace(/!\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]/g, (_, raw) => {
    const target = raw.trim(), name = target.split('/').pop();
    return /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(target)
      ? `<img class="vault-img" data-vault-src="${esc(target)}" alt="${esc(name)}">`
      : `<a href="#" class="attach-link" data-attach="${esc(target)}">📎 ${esc(name)}</a>`;
  });
  const withLinks = withEmbeds.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g,
    (_, target, alias) => `[${(alias || target).replace(/[[\]]/g, '')}](${noteHref(target.trim())})`);
  const el = document.createElement('div');
  el.innerHTML = DOMPurify.sanitize(marked.parse(withLinks));
  // > [!ai] Title  ->  <div class="callout callout-ai">
  for (const bq of el.querySelectorAll('blockquote')) {
    const first = bq.querySelector('p');
    const m = first?.innerHTML.match(/^\[!([\w-]+)\][+-]?\s*([^\n<]*)(?:\n|<br>)?/);
    if (!m) continue;
    const type = m[1].toLowerCase();
    first.innerHTML = first.innerHTML.slice(m[0].length);
    if (!first.textContent.trim()) first.remove();
    const box = document.createElement('div');
    box.className = `callout callout-${type}`;
    box.innerHTML = `<div class="callout-title">${esc(m[2] || CALLOUT_LABEL[type] || type)}</div>`;
    box.append(...bq.childNodes);
    bq.replaceWith(box);
  }
  for (const a of el.querySelectorAll('a[href^="http"]')) { a.target = '_blank'; a.rel = 'noopener'; }
  return el.innerHTML;
}
