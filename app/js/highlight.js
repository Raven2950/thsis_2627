// Highlighter and text colour for blog posts, written in a form Obsidian also understands:
//   ==text==                                   yellow highlight (Obsidian's own syntax)
//   <mark style="background: #b8f5c0">text</mark>   other highlight colours
//   <span style="color: #d93a3a">text</span>        coloured text
// Two ways in: the toolbar above the editor, and selecting text while reading a post.
import { toast } from './ui.js';

export const MARKS = [
  { name: '黄', bg: '#fff38a' }, { name: '绿', bg: '#b8f5c0' }, { name: '粉', bg: '#ffc6e5' }, { name: '蓝', bg: '#bfe3ff' },
];
export const INKS = [
  { name: '红', color: '#d93a3a' }, { name: '蓝', color: '#2f6fde' }, { name: '绿', color: '#2e9a4f' }, { name: '橙', color: '#e07b00' }, { name: '灰', color: '#8a8a8a' },
];

const wrapMark = (t, i) => (i === 0 ? `==${t}==` : `<mark style="background: ${MARKS[i].bg}">${t}</mark>`);
const wrapInk = (t, i) => `<span style="color: ${INKS[i].color}">${t}</span>`;
// Remove highlight / colour markup from a piece of text.
export const unwrap = t => t
  .replace(/==(?=\S)([\s\S]*?\S)==/g, '$1')
  .replace(/<mark(?:\s[^>]*)?>([\s\S]*?)<\/mark>/g, '$1')
  .replace(/<span style="color:[^"]*">([\s\S]*?)<\/span>/g, '$1');

// The buttons (also used as the floating bar when reading).
export function toolHtml() {
  return `<span class="hl-group" title="荧光笔">${MARKS.map((m, i) => `<button type="button" class="hl-swatch" data-hl-mark="${i}" style="background:${m.bg}" title="${m.name}色荧光笔${i === 0 ? '（⌘/Ctrl + Shift + H）' : ''}"></button>`).join('')}</span>
    <span class="hl-group" title="字的颜色">${INKS.map((c, i) => `<button type="button" class="hl-ink" data-hl-ink="${i}" style="color:${c.color}" title="${c.name}色的字">A</button>`).join('')}</span>
    <button type="button" class="hl-clear" data-hl-clear title="去掉选中部分的荧光笔和颜色">清除</button>`;
}

function apply(btn, text) {
  if (btn.dataset.hlMark) return wrapMark(unwrap(text), +btn.dataset.hlMark);
  if (btn.dataset.hlInk) return wrapInk(unwrap(text), +btn.dataset.hlInk);
  return unwrap(text);
}

// Editor: the toolbar wraps whatever is selected in the textarea.
export function bindEditorTools(bar, textarea, onChange) {
  const run = btn => {
    const { selectionStart: a, selectionEnd: b, value } = textarea;
    if (a === b) return toast('先选中要标记的文字');
    if (/<[^>]*$|^[^<]*>/.test(value.slice(a, b))) return toast('选中的范围切到了标记的一半，多选或少选一点', true);
    const out = apply(btn, value.slice(a, b));
    textarea.focus();
    textarea.setRangeText(out, a, b, 'select');
    onChange();
  };
  for (const btn of bar.querySelectorAll('button')) {
    btn.addEventListener('mousedown', e => e.preventDefault());   // keep the selection
    btn.addEventListener('click', () => run(btn));
  }
  textarea.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'h') { e.preventDefault(); run(bar.querySelector('[data-hl-mark="0"]')); }
  });
}

// Reading: select some text in the post and a small bar appears. The selection is found in the
// Markdown source by its exact words; if they appear more than once (or span formatting), use the editor.
let bar = null;
const close = () => { bar?.remove(); bar = null; };
document.addEventListener('mousedown', e => { if (bar && !bar.contains(e.target)) close(); });
export function bindReadingTools(article, getSource, save) {
  const find = (src, text) => {
    const at = src.indexOf(text);
    return at >= 0 && src.indexOf(text, at + 1) < 0 ? at : -1;
  };
  article.addEventListener('mouseup', () => setTimeout(() => {
    const sel = getSelection(), text = sel.toString().trim();
    close();
    if (!text || sel.rangeCount === 0 || !article.contains(sel.anchorNode)) return;
    const r = sel.getRangeAt(0).getBoundingClientRect();
    bar = document.createElement('div');
    bar.className = 'hl-float';
    bar.innerHTML = toolHtml();
    document.body.append(bar);
    bar.style.left = `${Math.max(8, Math.min(innerWidth - bar.offsetWidth - 8, r.left + r.width / 2 - bar.offsetWidth / 2))}px`;
    bar.style.top = `${r.top + scrollY - bar.offsetHeight - 8}px`;
    for (const btn of bar.querySelectorAll('button')) {
      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('click', async () => {
        const src = getSource();
        // The words may already carry a highlight: then the marked-up span is what gets replaced.
        let at = find(src, text), len = text.length;
        if (at < 0) {
          const re = new RegExp(`(==|<mark[^>]*>|<span style="color:[^"]*">)${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(==|</mark>|</span>)`, 'g');
          const hits = [...src.matchAll(re)];
          if (hits.length === 1) { at = hits[0].index; len = hits[0][0].length; }
        }
        close();
        if (at < 0) return toast('这段文字在原文里找不到唯一的一处（可能出现了几次，或者跨了格式），请点“编辑”在编辑器里标', true);
        await save(src.slice(0, at) + apply(btn, src.slice(at, at + len)) + src.slice(at + len));
      });
    }
  }, 0));
  return close;
}
