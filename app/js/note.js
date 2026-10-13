// Markdown note <-> { data, body }. Frontmatter is YAML, read with the JSON schema so that
// Obsidian dates like `created: 2026-10-12` stay plain strings.
import yaml from 'js-yaml';

const FM = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

export function parseNote(text) {
  const m = text.match(FM);
  if (!m) return { data: {}, body: text };
  let data = {};
  try { data = yaml.load(m[1], { schema: yaml.JSON_SCHEMA }) || {}; } catch (e) { data = { _yamlError: e.message }; }
  return { data, body: text.slice(m[0].length) };
}

export function serializeNote(data, body) {
  const clean = Object.fromEntries(Object.entries(data).filter(([k]) => !k.startsWith('_')));
  const fm = yaml.dump(clean, { schema: yaml.JSON_SCHEMA, lineWidth: -1, flowLevel: 1 }).replace(/: null$/gm, ':');
  return `---\n${fm}---\n${body.startsWith('\n') ? '' : '\n'}${body}`;
}

// "[[Target|Alias]]" or "[[Target#Heading]]" -> "Target"; plain strings pass through.
export function linkTarget(v) {
  if (typeof v !== 'string') return '';
  const m = v.match(/^\s*\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]\s*$/);
  return (m ? m[1] : v).trim();
}

export const toLink = name => `[[${name}]]`;

export function asList(v) {
  if (v == null || v === '') return [];
  return Array.isArray(v) ? v.filter(x => x != null && x !== '') : [v];
}
