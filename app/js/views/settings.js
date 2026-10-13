// AI provider settings. Stored only in this browser.
import { getSettings, saveSettings, PROXY_MODELS, GEMINI_MODELS, complete } from '../ai.js';
import { esc } from '../markdown.js';
import { toast } from '../ui.js';

export function renderSettings(main) {
  const s = getSettings();
  const opts = (list, v) => list.map(m => `<option value="${m.id}"${m.id === v ? ' selected' : ''}>${esc(m.name)}</option>`).join('');
  main.innerHTML = `
    <section class="settings-view">
      <h1>设置</h1>
      <p class="hint">这些设置只保存在这个浏览器里，不会写进库，也不会跟着库同步到别的设备。</p>
      <div class="vocab">
        <h2>AI 服务</h2>
        <label class="row"><input type="radio" name="provider" value="proxy"${s.provider === 'proxy' ? ' checked' : ''}>
          <span><b>ITP/IMA 课程代理</b>（Replicate）<br><span class="hint">不登录也能用，但次数很少。用 nyu.edu 登录后每天 500 次。
          token 在 <a href="https://itp-ima-replicate-proxy.web.app/" target="_blank" rel="noopener">代理页面</a> 底部获取，最快 1 小时过期。</span></span></label>
        <div class="sub-settings">
          <label>模型 <select id="proxyModel">${opts(PROXY_MODELS, s.proxyModel)}</select></label>
          <label>NYU token（可选） <input id="proxyToken" type="password" value="${esc(s.proxyToken)}" placeholder="粘贴 token" autocomplete="off"></label>
        </div>
        <label class="row"><input type="radio" name="provider" value="gemini"${s.provider === 'gemini' ? ' checked' : ''}>
          <span><b>Google Gemini</b>（用你自己的 API key）</span></label>
        <div class="sub-settings">
          <label>模型 <select id="geminiModel">${opts(GEMINI_MODELS, s.geminiModel)}</select></label>
          <label>API key <input id="geminiKey" type="password" value="${esc(s.geminiKey)}" placeholder="AIza…" autocomplete="off"></label>
        </div>
        <div class="actions"><button id="testAi">测试一下</button> <span id="testOut" class="hint"></span></div>
      </div>
    </section>`;

  const save = () => {
    saveSettings({
      provider: main.querySelector('[name=provider]:checked').value,
      proxyModel: main.querySelector('#proxyModel').value, proxyToken: main.querySelector('#proxyToken').value.trim(),
      geminiModel: main.querySelector('#geminiModel').value, geminiKey: main.querySelector('#geminiKey').value.trim(),
    });
  };
  for (const el of main.querySelectorAll('input, select')) el.addEventListener('change', () => { save(); toast('已保存'); });
  main.querySelector('#testAi').addEventListener('click', async () => {
    save();
    const out = main.querySelector('#testOut');
    out.textContent = '请求中…';
    try {
      const { text, model } = await complete({ system: 'Reply in one short Chinese sentence.', prompt: '用一句话打个招呼。', maxTokens: 2048 });
      out.textContent = `✓ ${model}：${text.trim().slice(0, 80)}`;
    } catch (e) { out.textContent = `✗ ${e.message}`; }
  });
}
