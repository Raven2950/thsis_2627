// Typed links with a reason, kept in the note body so Obsidian shows them too:
//
//   ## 关联
//
//   - 启发 → [[OpenAAC]]：为什么相关
//   - 反驳/张力 → [[RNIB - Sight Loss and Technology]]：〔AI〕AI 写的理由
//
// "〔AI〕" marks a reason the AI wrote (kept from the inbox).

const HEADING = '## 关联';
const LINE = /^\s*[-*]\s+(.+?)\s*(?:→|->)\s*\[\[([^\]|#]+)(?:[^\]]*)\]\](?:\s*[：:]\s*(.*))?$/;
const AI_MARK = '〔AI〕';

function section(body) {
  const lines = body.split('\n');
  const start = lines.findIndex(l => l.trim() === HEADING);
  if (start < 0) return { lines, start: -1, end: -1 };
  let end = lines.findIndex((l, i) => i > start && /^#{1,2}\s/.test(l));
  if (end < 0) end = lines.length;
  return { lines, start, end };
}

export function parseLinks(body) {
  const { lines, start, end } = section(body);
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < end; i++) {
    const m = lines[i].match(LINE);
    if (!m) continue;
    const reason = (m[3] || '').trim();
    out.push({ type: m[1].trim(), target: m[2].trim(), reason: reason.replace(AI_MARK, '').trim(), ai: reason.startsWith(AI_MARK), line: i });
  }
  return out;
}

const format = ({ type, target, reason, ai }) => `- ${type} → [[${target}]]：${ai ? AI_MARK : ''}${reason || ''}`;

export function addLinkToBody(body, link) {
  const { lines, start, end } = section(body);
  if (start < 0) return `${body.replace(/\s*$/, '')}\n\n${HEADING}\n\n${format(link)}\n`;
  let at = end;
  while (at > start + 1 && !lines[at - 1].trim()) at--;      // after the last non-empty line
  lines.splice(at, 0, ...(at === start + 1 ? ['', format(link)] : [format(link)]));
  return lines.join('\n');
}

export function removeLinkFromBody(body, link) {
  const lines = body.split('\n');
  const i = parseLinks(body).find(l => l.target === link.target && l.type === link.type && l.reason === link.reason)?.line;
  if (i == null) return body;
  lines.splice(i, 1);
  return lines.join('\n');
}
