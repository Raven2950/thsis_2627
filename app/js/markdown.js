// Render a note body: Markdown + Obsidian wikilinks and callouts.
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const noteHref = name => `#/open/${encodeURIComponent(name)}`;

const CALLOUT_LABEL = { ai: 'AI', quote: '引用', note: '笔记', question: '问题' };

export function renderMarkdown(src) {
  // ![[x.png]] shows the image; ![[附件/x.pdf]] becomes a link the page opens from the vault.
  const withEmbeds = src.replace(/!\[\[([^\]|#]+)(?:\|([^\]]*))?\]\]/g, (_, raw, opt) => {
    const target = raw.trim(), name = target.split('/').pop();
    const width = /^\s*(\d+)(?:x\d+)?\s*$/.exec(opt || '')?.[1];          // ![[x.png|300]] = 300px wide
    return /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(target)
      ? `<img class="vault-img" data-vault-src="${esc(target)}" alt="${esc(name)}"${width ? ` style="width:${width}px"` : ''}>`
      : `<a href="#" class="attach-link" data-attach="${esc(target)}">📎 ${esc(name)}</a>`;
  });
  const withLinks = withEmbeds.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g,
    (_, target, alias) => `[${(alias || target).replace(/[[\]]/g, '')}](${noteHref(target.trim())})`);
  const el = document.createElement('div');
  el.innerHTML = DOMPurify.sanitize(marked.parse(withLinks));
  // ![alt](Pasted%20image.png): a standard Markdown image pointing into the vault, not the web.
  for (const img of el.querySelectorAll('img[src]')) {
    const src = img.getAttribute('src');
    if (/^(https?:|data:|blob:|\/\/)/i.test(src)) continue;
    let path = src;
    try { path = decodeURIComponent(src); } catch (e) { /* keep as written */ }
    img.removeAttribute('src');
    img.dataset.vaultSrc = path.replace(/^\.?\//, '');
    img.classList.add('vault-img');
  }
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
