// Drop a PDF / image / link anywhere (or paste one) → a capture form. While I write "why I saved it",
// the tool reads the file, asks AI what it is and checks it against Crossref / Open Library.
// Nothing is written until I press 收录: then the file goes to 附件/ and a 材料 note links to it.
import { store } from '../store.js';
import { KIND, FOLDER, FIELD_LABEL, today, isEmpty } from '../model.js';
import { esc } from '../markdown.js';
import { toast } from '../ui.js';
import { readPdf } from '../pdftext.js';
import { identify } from '../tasks.js';
import { verify, VERIFY_LABEL } from '../verify.js';

const FIELDS = ['title', 'creator', 'year', 'type', 'url', 'summary'];
const ORIGIN_LABEL = { source: '原文', ai: 'AI' };
const queue = [];
let running = false;

const isUrl = s => /^https?:\/\/\S+$/i.test(String(s || '').trim());
const stem = name => name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim();

export function capture(jobs) {
  if (!store.vault || store.vault.readOnly) return toast('只读模式下不能收录，请用 Chrome 打开库', true);
  queue.push(...jobs);
  if (!running) next();
}
export const captureFiles = files => capture([...files].map(file => ({ file })));
export const captureUrl = url => capture([{ url: url.trim() }]);

async function next() {
  const job = queue.shift();
  if (!job) { running = false; return; }
  running = true;
  try { await openForm(job); } catch (e) { toast(e.message, true); }
  next();
}

function openForm(job) {
  return new Promise(resolve => {
    const file = job.file;
    const isPdf = file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name));
    const isImage = file && file.type.startsWith('image/');
    const state = { values: { title: file ? stem(file.name) : '', url: job.url || '' }, origins: {}, touched: new Set() };
    const remaining = queue.length;

    const dlg = document.createElement('dialog');
    dlg.className = 'ask capture';
    dlg.innerHTML = `<form method="dialog">
      <h2>收录${file ? `：${esc(file.name)}` : '链接'}</h2>
      <p class="hint" id="capStatus">${isPdf ? '正在读取 PDF…' : job.url ? '正在让 AI 认一认这个链接…' : ''}</p>
      <label>为什么存它 <span class="req">*</span>
        <textarea name="why" rows="2" required placeholder="一句话：现在为什么觉得它重要？以后会忘的就是这句。"></textarea></label>
      <div class="cap-grid">
        ${FIELDS.map(f => `<label class="${f === 'summary' || f === 'title' ? 'wide' : ''}">${FIELD_LABEL[f]} <span class="badge" data-badge="${f}" hidden></span>
          ${f === 'type'
            ? `<select name="type"><option value=""></option>${store.vocab('type').map(t => `<option>${esc(t)}</option>`).join('')}</select>`
            : f === 'summary' ? '<textarea name="summary" rows="3"></textarea>' : `<input name="${f}">`}</label>`).join('')}
      </div>
      ${file ? `<p class="hint">文件会存到库里的 <code>附件/</code>，笔记里会链接它${isPdf ? '，在 Obsidian 里能直接看' : ''}。</p>` : ''}
      <div class="actions">${remaining ? `<span class="hint">后面还有 ${remaining} 个</span>` : ''}
        <button value="cancel" formnovalidate>跳过</button><button class="primary" value="ok">收录</button></div>
    </form>`;
    document.body.append(dlg);
    const field = f => dlg.querySelector(`[name="${f}"]`);

    const paint = () => {
      for (const f of FIELDS) {
        const el = field(f);
        if (!state.touched.has(f) && state.values[f] != null) el.value = state.values[f];
        const badge = dlg.querySelector(`[data-badge="${f}"]`), o = state.touched.has(f) ? null : state.origins[f];
        badge.hidden = !o || isEmpty(el.value);
        if (o) { badge.textContent = ORIGIN_LABEL[o]; badge.className = `badge ${o}`; }
      }
    };
    const set = (values, origin) => {
      for (const [f, v] of Object.entries(values)) {
        if (!FIELDS.includes(f) || isEmpty(v) || state.touched.has(f)) continue;
        state.values[f] = f === 'type' && !store.vocab('type').includes(v) ? state.values.type : v;
        state.origins[f] = origin;
      }
      paint();
    };
    const status = t => { const el = dlg.querySelector('#capStatus'); if (el) el.textContent = t; };

    for (const f of FIELDS) field(f).addEventListener('input', () => { state.touched.add(f); paint(); });
    paint();
    dlg.showModal();
    field('why').focus();

    // Work out what this is while I type.
    (async () => {
      try {
        let text = '';
        if (isPdf) {
          const pdf = await readPdf(file);
          text = pdf.text;
          set({ title: pdf.title, creator: pdf.author }, 'source');
          status(text ? `读到 ${pdf.pages} 页，AI 正在认这是什么…` : '这个 PDF 读不出文字（可能是扫描件），请手动填写。');
        }
        if (text || job.url) {
          const ai = await identify({ text, fileName: file?.name, url: job.url });
          // From the document's own text the title/author are the source's words; from a bare link they are AI's guess.
          const fromDoc = !!text;
          set({ title: ai.title, creator: ai.creator, year: ai.year }, fromDoc ? 'source' : 'ai');
          set({ type: ai.type, summary: ai.summary }, 'ai');
          const title = field('title').value, creator = field('creator').value, type = field('type').value;
          if (['书', '论文'].includes(type) || (!type && isPdf)) {
            status('正在去 Crossref / Open Library 核对…');
            const v = await verify({ title, creator, type: type || '论文' }).catch(() => ({ status: 'unavailable' }));
            if (v.status === 'verified') {
              set(Object.fromEntries(Object.entries(v.fields).filter(([f]) => f !== 'title' || !state.values.title)), 'source');
              set({ url: v.fields.url }, 'source');
            }
            status(`${VERIFY_LABEL[v.status]}${v.by ? `（${v.by}）` : ''}。可以改任何一栏，改过的就算你写的。`);
          } else status('AI 填的内容标了「AI」，你没改就会记成 AI 说的。可以改任何一栏。');
        } else if (isImage) status('图片：填一下标题和为什么就好。');
      } catch (e) { status(`自动识别没成功：${e.message}。可以手动填写。`); }
    })();

    dlg.addEventListener('close', async () => {
      const ok = dlg.returnValue === 'ok';
      const values = Object.fromEntries([...FIELDS, 'why'].map(f => [f, field(f).value.trim()]));
      dlg.remove();
      if (!ok) return resolve();
      try {
        const note = await save(job, values, state);
        toast(`已收录「${note.data.title}」`);
        location.hash = `#/item/${encodeURIComponent(note.path)}`;
      } catch (e) { toast(e.message, true); }
      resolve();
    });
  });
}

async function save(job, v, state) {
  if (!v.why) throw new Error('要先写「为什么存它」');
  let attachment = null;
  if (job.file) {
    attachment = await store.attachmentPath(job.file.name);
    await store.writeFile(attachment, job.file);
  }
  const origin = f => (state.touched.has(f) ? null : state.origins[f]);
  const filled = FIELDS.filter(f => !isEmpty(v[f]));
  const title = v.title || (job.file ? stem(job.file.name) : v.url) || '未命名';
  const data = {
    kind: KIND.item, title, creator: v.creator || null, year: v.year ? (Number(v.year) || v.year) : null, url: v.url || null,
    type: v.type || null, why: v.why, status: store.vocab('status')[0] || null, importance: null,
    roles: [], voice: null, concepts: [], questions: [], parent: null, summary: v.summary || null,
    file: attachment ? `[[${attachment}]]` : null,
    from_ai: filled.filter(f => origin(f) === 'ai'), from_source: filled.filter(f => origin(f) === 'source'),
    confirmed: [], created: today(), read: null,
  };
  const body = `\n${attachment ? `![[${attachment}]]\n\n` : ''}## 我得到了什么\n\n\n## 待解决的问题\n\n- \n`;
  return store.create(store.uniquePath(FOLDER[KIND.item], title), data, body);
}

/* ---------- drop zone + paste, anywhere in the app ---------- */
export function installCapture() {
  const overlay = document.createElement('div');
  overlay.className = 'drop-overlay';
  overlay.innerHTML = '<div><b>松手就收录</b><span>PDF、图片或链接 · 文件会存进库里的 附件/</span></div>';
  document.body.append(overlay);
  let depth = 0;
  const carries = e => [...(e.dataTransfer?.types || [])].some(t => t === 'Files' || t === 'text/uri-list');
  const show = on => overlay.classList.toggle('show', on);

  const own = e => e.target?.closest?.('[data-own-drop]');
  window.addEventListener('dragenter', e => { if (!carries(e) || own(e) || !store.vault || store.vault.readOnly) return; depth++; show(true); });
  window.addEventListener('drop', () => { depth = 0; show(false); }, true);
  window.addEventListener('dragleave', () => { if (depth && --depth === 0) show(false); });
  window.addEventListener('dragover', e => { if (carries(e) && store.vault && !store.vault.readOnly) e.preventDefault(); });
  window.addEventListener('drop', e => {
    if (!carries(e) || own(e)) return;
    e.preventDefault(); depth = 0; show(false);
    if (e.dataTransfer.files.length) return captureFiles(e.dataTransfer.files);
    const url = (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')).split('\n').find(isUrl);
    if (url) captureUrl(url);
  });
  // ⌘V a file or a link while not typing somewhere.
  document.addEventListener('paste', e => {
    if (e.target.closest?.('input, textarea, select, [contenteditable], dialog') || !store.vault || store.vault.readOnly) return;
    if (e.clipboardData.files.length) { e.preventDefault(); return captureFiles(e.clipboardData.files); }
    const text = e.clipboardData.getData('text/plain').trim();
    if (isUrl(text)) { e.preventDefault(); captureUrl(text); }
  });
}

// A file picker for when dragging is awkward.
export function pickAndCapture() {
  const input = Object.assign(document.createElement('input'), { type: 'file', multiple: true, accept: '.pdf,application/pdf,image/*' });
  input.onchange = () => input.files.length && captureFiles(input.files);
  input.click();
}
