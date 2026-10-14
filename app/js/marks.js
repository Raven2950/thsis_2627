// ⭐ star = I read the description and plan to read it. ♥ like = I read it and want to develop it.
// plan = the day I mean to read it. All three are plain properties on the material note.
import { store } from './store.js';
import { viewOnly } from './i18n.js';
import { esc } from './markdown.js';
import { toast } from './ui.js';
import { today } from './model.js';

export const DONE = ['读过', '用过', '放弃'];

export function marksHtml(n) {
  const d = n.data, ro = viewOnly();
  const btn = (key, on, off, title) => ro
    ? (d[key] ? `<span class="mark on" title="${title}">${on}</span>` : '')
    : `<button class="mark${d[key] ? ' on' : ''}" data-mark="${key}" data-path="${esc(n.path)}" title="${title}">${d[key] ? on : off}</button>`;
  return `<span class="marks">${btn('star', '⭐', '☆', '计划读')}${btn('like', '♥', '♡', '读完觉得很好，想继续发展')}</span>`;
}

export function toggleMark(path, key) {
  return store.update(path, d => {
    d[key] = d[key] ? null : true;
    if (key === 'star' && d.star && !d.plan) d.plan = null;
  }).catch(e => toast(e.message, true));
}
export const setPlan = (path, date) => store.update(path, d => { d.plan = date || null; if (date) d.star = true; }).catch(e => toast(e.message, true));
export const markRead = path => store.update(path, d => { d.status = '读过'; d.read = d.read || today(); }).catch(e => toast(e.message, true));

// Starred materials not read yet, by planned day (undated last).
export function queue() {
  return store.items().filter(n => n.data.star && !DONE.includes(n.data.status))
    .sort((a, b) => String(a.data.plan || '9999').localeCompare(String(b.data.plan || '9999')) || String(a.data.title || a.name).localeCompare(String(b.data.title || b.name)));
}

export function bindMarks(root) {
  for (const b of root.querySelectorAll('[data-mark]')) b.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    toggleMark(b.dataset.path, b.dataset.mark);
  });
}
