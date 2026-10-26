import { esc } from './markdown.js';

export function toast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show${isError ? ' error' : ''}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.className = 'toast'), isError ? 6000 : 2500);
}

// A small form in a <dialog>. fields: [{ name, label, required, placeholder, value, multiline, options }]
// Resolves to { name: value } or null when cancelled.
export function ask({ title, fields, submit = '确定', note = '' }) {
  return new Promise(resolve => {
    const dlg = document.createElement('dialog');
    dlg.className = 'ask';
    dlg.innerHTML = `<form method="dialog">
      <h2>${esc(title)}</h2>
      ${note ? `<p class="hint">${esc(note)}</p>` : ''}
      ${fields.map(f => `<label>${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ''}
        ${f.options
          ? `<select name="${f.name}">${['', ...f.options].map(o => `<option${o === f.value ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`
          : f.multiline
            ? `<textarea name="${f.name}" rows="3" placeholder="${esc(f.placeholder || '')}"${f.required ? ' required' : ''}>${esc(f.value || '')}</textarea>`
            : `<input name="${f.name}" placeholder="${esc(f.placeholder || '')}" value="${esc(f.value || '')}"${f.required ? ' required' : ''}>`}
      </label>`).join('')}
      <div class="actions"><button value="cancel" formnovalidate>取消</button><button class="primary" value="ok">${esc(submit)}</button></div>
    </form>`;
    document.body.append(dlg);
    dlg.addEventListener('close', () => {
      const ok = dlg.returnValue === 'ok';
      const out = ok ? Object.fromEntries(fields.map(f => [f.name, dlg.querySelector(`[name="${f.name}"]`).value.trim()])) : null;
      dlg.remove();
      resolve(out);
    });
    dlg.showModal();
  });
}

export const ADD = '__add__';

// <select> whose last option is "＋ 新增…"; unknown current values are kept as options.
export function selectHtml(attrs, choices, value, disabled) {
  const vals = [...new Set([...choices, value].filter(Boolean))];
  return `<select ${attrs}${disabled ? ' disabled' : ''}>
    <option value="">—</option>
    ${vals.map(v => `<option${v === value ? ' selected' : ''}>${esc(v)}</option>`).join('')}
    <option value="${ADD}">＋ 新增…</option></select>`;
}

// Wire a selectHtml element. onPick(value, isNew) runs with the chosen or newly typed value.
export function bindSelect(el, label, onPick) {
  const before = el.value;
  el.addEventListener('focus', () => (el.dataset.prev = el.value));
  el.addEventListener('change', async () => {
    if (el.value !== ADD) return onPick(el.value, false);
    const res = await ask({ title: `新增「${label}」选项`, fields: [{ name: 'v', label: '名称', required: true }] });
    if (!res?.v) { el.value = el.dataset.prev ?? before; return; }
    onPick(res.v, true);
  });
}

// A short, clear chime for timers (no audio files needed).
export function chime(times = 2) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * 0.35;
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.start(t); o.stop(t + 0.32);
    }
  } catch (e) { /* no audio */ }
}
export const mmss = s => `${String(Math.floor(Math.max(0, s) / 60)).padStart(2, '0')}:${String(Math.max(0, Math.round(s)) % 60).padStart(2, '0')}`;
