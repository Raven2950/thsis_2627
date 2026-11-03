// ◆ star = I read the description and plan to read it. rating = 1–5 stars once I've read it (like Douban);
// 4 or more counts as "liked" (want to develop it). Older notes may still carry like: true.
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
  return `<span class="marks">${btn('star', '◆', '◇', '计划读')}</span>`;
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
  for (const b of root.querySelectorAll('[data-rate]')) b.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    setRating(b.dataset.path, Number(b.dataset.rate));
  });
  for (const b of root.querySelectorAll('[data-mark]')) b.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    toggleMark(b.dataset.path, b.dataset.mark);
  });
}

export const liked = d => Number(d.rating) >= 4 || d.like === true;

// Five stars, always visible. Clicking the current score clears it.
export function ratingHtml(n) {
  const r = Math.max(0, Math.min(5, Number(n.data.rating) || 0));
  if (viewOnly()) return r ? `<span class="rating ro" title="${r} / 5">${'★'.repeat(r)}${'☆'.repeat(5 - r)}</span>` : '<span class="rating ro muted">—</span>';
  return `<span class="rating" role="radiogroup" aria-label="评分">${[1, 2, 3, 4, 5].map(i =>
    `<button class="${i <= r ? 'on' : ''}" data-rate="${i}" data-path="${esc(n.path)}" role="radio" aria-checked="${i === r}" title="${i} 星">${i <= r ? '★' : '☆'}</button>`).join('')}</span>`;
}
export const setRating = (path, v) => store.update(path, d => {
  d.rating = Number(d.rating) === v ? null : v;
  if (d.rating && d.like) delete d.like;
}).catch(e => toast(e.message, true));
