// Manage the option lists behind every dropdown. Stored in the vault (_系统/词表.md).
import { store } from '../store.js';
import { DEFAULT_VOCAB, FIELD_LABEL } from '../model.js';
import { esc } from '../markdown.js';
import { ask, toast } from '../ui.js';
import { tr, confirmTr } from '../i18n.js';

export function renderOptions(main) {
  const ro = store.vault.readOnly;
  const vocabNote = store.vocabNote();
  main.innerHTML = `
    <section class="options-view">
      <h1>选项</h1>
      <p class="hint">下拉菜单里的选项。保存在库里的 <code>${esc(vocabNote?.path || '_系统/词表.md')}</code>，在 Obsidian 里改也可以。
        改名会同时更新所有用到旧名字的笔记；删除只是从菜单里移除，已经用了它的笔记保持不变。</p>
      ${Object.keys(DEFAULT_VOCAB).map(field => `
        <div class="vocab" data-field="${field}">
          <h2>${esc(FIELD_LABEL[field] || field)}</h2>
          <ul>${store.vocab(field).map((v, i, all) => `<li>
            <span class="v">${esc(v)}</span><span class="muted">${store.usage(field, v) || ''}</span>
            ${ro ? '' : `<span class="ops">
              <button class="mini" data-op="up" data-v="${esc(v)}"${i === 0 ? ' disabled' : ''} title="上移">↑</button>
              <button class="mini" data-op="down" data-v="${esc(v)}"${i === all.length - 1 ? ' disabled' : ''} title="下移">↓</button>
              <button class="mini" data-op="rename" data-v="${esc(v)}">改名</button>
              <button class="mini" data-op="remove" data-v="${esc(v)}">删除</button></span>`}
          </li>`).join('')}</ul>
          ${ro ? '' : '<button class="mini add" data-op="add">＋ 新增</button>'}
        </div>`).join('')}
    </section>`;

  for (const b of main.querySelectorAll('[data-op]')) b.addEventListener('click', async () => {
    const field = b.closest('[data-field]').dataset.field, v = b.dataset.v, label = FIELD_LABEL[field] || field;
    try {
      if (b.dataset.op === 'up' || b.dataset.op === 'down') return await store.moveVocab(field, v, b.dataset.op === 'up' ? -1 : 1);
      if (b.dataset.op === 'add') {
        const res = await ask({ title: `新增「${label}」选项`, fields: [{ name: 'v', label: '名称', required: true }] });
        if (res?.v) await store.addVocab(field, res.v);
      }
      if (b.dataset.op === 'rename') {
        const n = store.usage(field, v);
        const res = await ask({ title: `改名：${v}`, fields: [{ name: 'v', label: '新名称', required: true, value: v }],
          note: n ? `有 ${n} 篇笔记用到它，会一起改掉。` : '' });
        if (res?.v && res.v !== v && res.v !== tr(v)) toast(`已改名，更新了 ${await store.renameVocab(field, v, res.v)} 篇笔记`);
      }
      if (b.dataset.op === 'remove') {
        const n = store.usage(field, v);
        if (confirmTr(`从菜单里删除「${v}」？${n ? `\n还有 ${n} 篇笔记在用它，它们不会被改动。` : ''}`)) await store.removeVocab(field, v);
      }
    } catch (e) { toast(e.message, true); }
  });
}
