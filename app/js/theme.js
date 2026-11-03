// Light / dark. Follows the system until I pick one; the pick is remembered in this browser.
// index.html applies the saved choice before the first paint, so the page doesn't flash.
const KEY = 'marginalia-theme';
const saved = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
export const isDark = () => (saved() || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';

export function themeSwitch() {
  const dark = isDark();
  return `<span class="lang-switch theme-switch" role="group" aria-label="日间 / 夜间">
    <button data-theme-set="light" class="${dark ? '' : 'on'}" aria-pressed="${!dark}" title="日间模式">☀</button><button data-theme-set="dark" class="${dark ? 'on' : ''}" aria-pressed="${dark}" title="夜间模式">☾</button></span>`;
}
export function bindTheme(root) {
  for (const b of root.querySelectorAll('[data-theme-set]')) b.addEventListener('click', () => {
    const t = b.dataset.themeSet;
    try { localStorage.setItem(KEY, t); } catch (e) { /* private mode */ }
    document.documentElement.dataset.theme = t;
    for (const x of document.querySelectorAll('[data-theme-set]')) { const on = x.dataset.themeSet === t; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }
  });
}
