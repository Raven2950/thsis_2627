// The one place that talks to a language model. Swap providers in 设置; nothing else changes.
// Settings (incl. tokens / keys) live in this browser's localStorage only, never in the vault.
import { isEn } from './i18n.js';

const KEY = 'thesis-web-ai';
const PROXY = 'https://itp-ima-replicate-proxy.web.app/api/create_n_get';

export const PROXY_MODELS = [
  { id: 'anthropic/claude-4.5-haiku', name: 'Claude Haiku 4.5（快）' },
  { id: 'anthropic/claude-4.5-sonnet', name: 'Claude Sonnet 4.5（更细）' },
  { id: 'openai/gpt-5', name: 'GPT-5' },
  { id: 'openai/gpt-4.1', name: 'GPT-4.1' },
];
export const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
];

const DEFAULTS = { provider: 'proxy', proxyModel: PROXY_MODELS[0].id, proxyToken: '', geminiModel: GEMINI_MODELS[0].id, geminiKey: '' };

export function getSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { return { ...DEFAULTS }; }
}
export function saveSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...getSettings(), ...s })); } catch (e) { /* private mode */ }
}

export const modelLabel = () => {
  const s = getSettings();
  return s.provider === 'gemini' ? s.geminiModel : (PROXY_MODELS.find(m => m.id === s.proxyModel)?.name || s.proxyModel);
};

// The most recent request, for the "request json" disclosure.
export let lastRequest = null;

async function viaProxy({ system, prompt, temperature, maxTokens }, s) {
  const order = [s.proxyModel, ...PROXY_MODELS.map(m => m.id).filter(id => id !== s.proxyModel)];
  let lastErr;
  for (const model of order) {
    const body = { model, input: { system_prompt: system, prompt, temperature, max_tokens: maxTokens } };
    lastRequest = { provider: 'ITP proxy', url: PROXY, body };
    try {
      const res = await fetch(PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(s.proxyToken ? { Authorization: `Bearer ${s.proxyToken}` } : {}) },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || data.detail || `代理返回 ${res.status}`);
      const text = Array.isArray(data.output) ? data.output.join('') : String(data.output ?? '');
      if (text.trim()) return { text, model };
      throw new Error('模型没有返回内容');
    } catch (e) { lastErr = e; }
  }
  throw new Error(`AI 请求失败：${lastErr?.message || '没有模型回应'}。如果是次数用完，可以在「设置」里填 NYU token。`);
}

async function viaGemini({ system, prompt, temperature, maxTokens, json }, s) {
  if (!s.geminiKey) throw new Error('还没有填 Gemini API key（设置页）');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${s.geminiModel}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens: maxTokens, ...(json ? { responseMimeType: 'application/json' } : {}) },
  };
  lastRequest = { provider: 'Gemini', url, body };
  const res = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': s.geminiKey },
    body: JSON.stringify(body), signal: AbortSignal.timeout(90000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gemini：${data.error?.message || res.status}`);
  return { text: (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join(''), model: s.geminiModel };
}

export async function complete({ system, prompt, temperature = 0.4, maxTokens = 2048, json = false }) {
  const s = getSettings();
  // In English mode what AI writes for me (summaries, reasons, names) should be English too.
  if (isEn()) system = `${system || ''}\n\nThe user is working in English: write every free-text value you produce (summaries, reasons, names, guides, questions) in English. Values that must be picked from a given list stay exactly as listed, in their original language.`;
  const opts = { system, prompt, temperature, maxTokens, json };
  return s.provider === 'gemini' ? viaGemini(opts, s) : viaProxy(opts, s);
}

// Pull the first JSON object/array out of a reply that may be wrapped in ``` fences or prose.
export function extractJSON(text) {
  const t = text.replace(/```(?:json)?/gi, '');
  for (const [open, close] of [['{', '}'], ['[', ']']]) {
    const a = t.indexOf(open);
    if (a < 0) continue;
    for (let b = t.lastIndexOf(close); b > a; b = t.lastIndexOf(close, b - 1)) {
      try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { /* shorter */ }
    }
  }
  return null;
}

export async function completeJSON(opts) {
  const res = await complete({ ...opts, json: true });
  const data = extractJSON(res.text);
  if (data == null) throw new Error('AI 的回复不是有效的 JSON，再试一次或换个模型');
  return { data, model: res.model };
}
