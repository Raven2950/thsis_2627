// Vocabulary of the vault. Values are Chinese because they are what the user types in Obsidian.
// The option lists live in the vault (_系统/词表.md) and can be edited there or on the 选项 page;
// these are only the defaults. An unknown value in a note is kept and shown as-is.

export const KIND = { item: '材料', concept: '概念', question: '研究问题', direction: '方向', vocab: '词表' };

// Where new notes of each kind are created.
export const FOLDER = { 材料: '材料', 概念: '概念', 研究问题: '研究问题' };

export const DEFAULT_VOCAB = {
  type: ['报告', '论文', '书', '文章', '组织/资源库', '产品/App', '产品合集', '展览', '艺术作品',
    '视频', '代码作品', 'AI 技术', '我的项目', '田野记录', '想法'],
  status: ['想读', '在读', '读过', '用过', '放弃'],
  importance: ['核心', '相关', '背景'],
  roles: ['理论框架', '先例案例', '方法', '技术工具', '批评或反例', '灵感', '一手声音'],
  voice: ['当事人自述', '机构代言', '研究者观察', '设计师视角', '产品方宣传'],
  concept_status: ['萌芽', '稳定', '放弃'],
  link_type: ['引用/延伸', '反驳/张力', '方法借用', '启发', '相关'],
};

export const FIELD_LABEL = {
  title: '标题', creator: '作者/机构', year: '年份', url: '链接', type: '类型', why: '为什么存它',
  status: '状态', importance: '重要性', roles: '角色', voice: '声音来源', concepts: '概念',
  questions: '研究问题', parent: '所属合集', summary: '简介', created: '收录', read: '读完',
  concept_status: '概念状态', link_type: '关联类型', file: '附件',
};

// Where a field's value came from. Fields not listed in from_ai / from_source were written by me.
export function originOf(data, field) {
  const has = key => Array.isArray(data[key]) && data[key].includes(field);
  const origin = has('from_ai') ? 'ai' : has('from_source') ? 'source' : 'me';
  return { origin, confirmed: origin === 'me' || has('confirmed') };
}

export const isEmpty = v => v == null || v === '' || (Array.isArray(v) && v.length === 0);

// Fields that came from AI or a source and still wait for me to check them.
export function unconfirmed(data) {
  return [...new Set([...(data.from_ai || []), ...(data.from_source || [])])]
    .filter(f => !isEmpty(data[f]) && !(data.confirmed || []).includes(f));
}

export const today = () => new Date().toISOString().slice(0, 10);

// Obsidian forbids these in file names; ":" becomes " -" so "Scope: X" reads naturally.
export const safeFileName = s => String(s).replace(/:/g, ' -').replace(/[*"\\/<>|?#^[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
