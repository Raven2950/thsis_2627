// Chinese / English. The page is written in Chinese; in English mode every Chinese text node and
// attribute is swapped as it appears: interface text from UI below (or RULES for text with numbers in
// it), my own writing from the vault's translations (_系统/译文.json, see translate.js). Both
// languages can edit: store.js keeps the Chinese original when an untouched English value is saved.
import { store } from './store.js';

const KEY = 'thesis-web-lang';
const CJK = /[㐀-鿿]/;

export function lang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'en' || q === 'zh') return q;
  try { const s = localStorage.getItem(KEY); if (s === 'en' || s === 'zh') return s; } catch (e) { /* private mode */ }
  return store.vault?.published || store.vault?.demo ? 'en' : 'zh';      // visitors read English, I work in Chinese
}
export const isEn = () => lang() === 'en';
export const viewOnly = () => !store.vault || store.vault.readOnly;
// Native confirm() boxes never pass through the DOM, so translate their text here.
export const confirmTr = msg => confirm(tr(msg));
export function setLang(l) { try { localStorage.setItem(KEY, l); } catch (e) { /* private mode */ } }

// My writing in English, when a translation exists (bodies and sticky notes are looked up whole).
export const trc = s => (isEn() && typeof s === 'string' && store.translation(s)) || s;

/* ---------- interface text ---------- */
const UI = {
  // navigation, header, welcome
  '列表': 'List', '地图': 'Map', '缺口': 'Gaps', '收件箱': 'Inbox', '选项': 'Options', '设置': 'Settings',
  '只读': 'Read-only', '演示模式': 'Demo', '重新载入': 'Reload', '只读 · 发布版': 'Published · read-only', '打开我的库': 'Open my vault',
  '库文件夹': 'Vault folder', '修改只保存在这个页面里，刷新就没了': 'Changes live only in this page and vanish on reload',
  '这是发布出来的只读版本': 'This is the published, read-only version', '作者用：打开自己电脑上的库来编辑': 'For the author: open the vault on this computer to edit',
  '重新读取库里的文件': 'Read the vault files again', '打开你的 thesis 库': 'Open your thesis vault',
  '选择 Obsidian 里那个库的文件夹。网页直接读写里面的 .md 笔记，不会另存一份数据。': 'Choose the Obsidian vault folder. The page reads and writes its .md notes directly; nothing is stored elsewhere.',
  '只看发布版': 'View the published version', '选择库文件夹…': 'Choose vault folder…', '以只读方式打开文件夹…': 'Open a folder read-only…',
  '当前浏览器不支持写入本地文件夹。要编辑，请用 Chrome 打开。': 'This browser cannot write to local folders. Use Chrome to edit.',
  '已重新载入': 'Reloaded', '英文版只用来看；要编辑请切到「中」': 'English is for reading; switch to 中 to edit',
  '把我写的中文内容翻成英文，存进库里；只翻新的': 'Translate my Chinese writing into English and save it in the vault (only what is new)',
  '正文按原来写的语言编辑，保存不会把译文写进笔记': 'Notes are edited in the language they were written in, so saving never writes the translation into the note',
  '试一试': 'Try it', '🧠 来自头脑风暴': '🧠 From a brainstorm', '头脑风暴记录': 'Brainstorm records', '在这个页面里试用：可以随便改，刷新就恢复原样': 'Try it in this page: change anything; a reload puts it back',
  '已核对': 'Verified', '查不到': 'Not found', '无法自动核对': 'Cannot be checked automatically', '核对服务没响应': 'Checking service did not respond',
  'Claude（找资料并核对）': 'Claude (found and checked)', '说明': 'About',
  '，在 Obsidian 里改也可以。 改名会同时更新所有用到旧名字的笔记；删除只是从菜单里移除，已经用了它的笔记保持不变。':
    '; you can edit them in Obsidian too. Renaming updates every note that uses the old name; removing only takes it off the menu, and notes that use it stay as they are.',
  '不登录也能用，但次数很少。用 nyu.edu 登录后每天 500 次。 token 在': 'Works without signing in, but with very few requests. Sign in with nyu.edu for 500 a day. Get the token at the bottom of the',
  '代理页面': 'proxy page', '底部获取，最快 1 小时过期。': '; it can expire in as little as an hour.',

  // fields and vocabulary
  '标题': 'Title', '作者/机构': 'Author / org', '年份': 'Year', '链接': 'Link', '类型': 'Type', '为什么存它': 'Why I saved it',
  '状态': 'Status', '重要性': 'Importance', '角色': 'Role', '声音来源': 'Voice', '概念': 'Concepts', '研究问题': 'Research questions',
  '所属合集': 'Part of', '简介': 'Summary', '收录': 'Save', '读完': 'Finished', '概念状态': 'Concept status', '关联类型': 'Link type', '附件': 'Attachment',
  '材料': 'Materials', '方向': 'Direction', '词表': 'Vocabulary',
  '报告': 'Report', '论文': 'Paper', '书': 'Book', '文章': 'Article', '组织/资源库': 'Organization / resource', '产品/App': 'Product / app',
  '产品合集': 'Product collection', '展览': 'Exhibition', '艺术作品': 'Artwork', '视频': 'Video', '代码作品': 'Code project',
  'AI 技术': 'AI technology', '我的项目': 'My project', '田野记录': 'Field notes', '想法': 'Idea',
  '想读': 'To read', '在读': 'Reading', '读过': 'Read', '用过': 'Used', '放弃': 'Dropped',
  '核心': 'Core', '相关': 'Related', '背景': 'Background',
  '理论框架': 'Theory', '先例案例': 'Precedent', '方法': 'Method', '技术工具': 'Technical tool', '批评或反例': 'Critique / counterexample',
  '灵感': 'Inspiration', '一手声音': 'First-hand voice',
  '当事人自述': 'Lived experience', '机构代言': 'Institutional', '研究者观察': 'Researcher', '设计师视角': 'Designer', '产品方宣传': 'Vendor',
  '萌芽': 'Emerging', '稳定': 'Settled', '开放': 'Open',
  '引用/延伸': 'Builds on', '反驳/张力': 'In tension with', '方法借用': 'Borrows method', '启发': 'Inspired by',
  '我': 'Me', '原文': 'Source', '已确认': 'Confirmed', '未确认': 'Not checked',

  // list
  '把 PDF、图片或链接拖进窗口就能收录': 'Drop a PDF, image or link into the window to save it',
  '从文件收录…': 'Save from file…', '＋ 新材料': '+ New material', '搜索标题、作者、为什么、正文…': 'Search titles, authors, why, notes…',
  '全部类型': 'All types', '全部状态': 'All statuses', '全部角色': 'All roles', '全部重要性': 'Any importance',
  '只看没写「为什么」的': 'Only those without a “why”', '没有符合筛选的材料': 'Nothing matches these filters', '还没写': 'Not written yet',
  '收录新材料': 'Save new material', '一句话：当时为什么觉得它重要？': 'One sentence: why did it matter to you?',

  // dialogs
  '取消': 'Cancel', '确定': 'OK', '名称': 'Name', '＋ 新增…': '+ Add…', '跳过': 'Skip',

  // detail
  '← 材料': '← Materials', '在 Obsidian 中打开 ↗': 'Open in Obsidian ↗',
  '一句话：当时我为什么觉得它重要？以后会忘的就是这句。': 'One sentence: why did this matter to me? This is what I will forget.',
  '在论文里的角色': 'Role in the thesis', '新增一个角色选项': 'Add a role', '资料信息': 'About the source', '打开 ↗': 'Open ↗',
  '确认': 'Confirm', '我核对过，这个值没问题': 'I checked this value', '收录 / 读完': 'Saved / finished',
  '添加概念，回车（没有的会新建）': 'Add a concept, press Enter (new ones are created)', '挂到研究问题…': 'Attach to a research question…',
  '选择所属合集…': 'Choose a collection…', '移除': 'Remove', '库里还没有这篇笔记': 'No such note in the vault yet', '合集里的条目': 'In this collection',
  'Markdown，和 Obsidian 里写法一样。⌘/Ctrl + S 保存': 'Markdown, as in Obsidian. ⌘/Ctrl + S to save', '保存正文': 'Save notes', '编辑正文': 'Edit notes',
  '（正文是空的）': '(No notes yet)', '链接到这里的笔记': 'Linked from', '补全信息': 'Fill in details', '建议概念': 'Suggest concepts',
  '建议关联': 'Suggest links', '帮我回忆': 'Help me remember', '找类似的': 'Find similar', '回忆（AI，没有保存）': 'Recall (AI, not saved)',
  '关闭': 'Close', '存进正文': 'Add to notes', '关联': 'Connections', '自动': 'Auto', '还没有关联': 'No connections yet',
  '连到哪份材料…': 'Connect to which material…', '理由（必填）：它们具体怎么相关？': 'Reason (required): how exactly are they related?',
  '添加': 'Add', '删除这条关联': 'Delete this connection', '附件只在作者自己的电脑上': 'The attachment stays on the author’s computer',
  '新窗口打开': 'Open in new window', '预览': 'Preview', '收起预览': 'Hide preview', 'PDF 预览': 'PDF preview', '附件预览': 'Attachment preview',
  '问题': 'Question', '我的一句话定义': 'My one-line definition', '库里没有这篇笔记。': 'There is no such note in the vault.',
  '已保存到笔记': 'Saved to the note', '正文已保存': 'Notes saved', '笔记': 'Note', '引用': 'Quote',
  '先选一份库里已有的材料': 'Pick a material that is already in the vault', '写一句理由：以后会忘的就是这个': 'Write a reason: it is what you will forget',
  '选一个关联类型': 'Choose a link type', 'AI 没有新的建议': 'No new suggestions from AI',

  // map
  'AI 整理': 'AI organize', '重新排布': 'Re-layout', '取消所有固定，重新自动排布': 'Unpin everything and lay out again',
  '＋ 关键词': '+ Keyword', '＋ 便利贴': '+ Sticky note', '适应窗口': 'Fit', '撤销': 'Undo', '共享材料连线': 'Shared-material lines',
  '关键词地图': 'Keyword map', '全部接受并整理': 'Accept all and organize', '接受中…': 'Accepting…',
  '让 AI 再找些关键词': 'Ask AI for more keywords', '让 AI 总结关键词': 'Ask AI to summarize keywords', 'AI 正在读你的材料…': 'AI is reading your materials…',
  'AI 整理中…': 'AI is organizing…', '分组': 'Groups', '改名': 'Rename', '换颜色': 'Change color', '隐藏的关键词': 'Hidden keywords', '操作说明': 'How it works',
  '位置由工具自动排：共享材料越多的关键词靠得越近，同组的聚在一起': 'The layout is automatic: keywords that share more materials sit closer, and groups cluster together',
  '拖动关键词 = 把它固定在那里；「重新排布」取消所有固定': 'Dragging a keyword pins it; “Re-layout” unpins everything',
  '双击空白处 = 便利贴；把便利贴上的小圆点拖到关键词上，它就会跟着那个关键词走': 'Double-click empty space for a sticky note; drag its dot onto a keyword and it follows that keyword',
  '拖关键词上的小圆点到另一个关键词 = 自己画箭头（AI 整理时不会被覆盖）': 'Drag a keyword’s dot to another keyword to draw your own arrow (AI organize keeps it)',
  '拖空白处移动画布，⌘/Ctrl + 滚轮缩放，Delete 删除选中，⌘Z 撤销': 'Drag empty space to pan, ⌘/Ctrl + scroll to zoom, Delete removes, ⌘Z undoes',
  '点线 = 共享材料；红虚线 = 还没有材料（缺口）': 'Dotted line = shared materials; red dashed = no materials yet (a gap)',
  '分组 ': 'Group ', '（不分组）': '(No group)', '＋ 新分组…': '+ New group…', '还没有材料（缺口）': 'No materials yet (a gap)',
  '把一份材料标到这个关键词…': 'Tag a material with this keyword…', '打开概念页': 'Open concept page', '为它推荐材料': 'Recommend materials',
  '取消固定': 'Unpin', '在地图上隐藏': 'Hide from map', '去掉这个关键词': 'Remove this keyword',
  '同时属于它们的材料': 'Materials in all of them', '没有：这是一个交叉处的缺口': 'None: a gap where they meet', '围绕它们推荐': 'Recommend around these',
  'AI 画的关系': 'Relation drawn by AI', '箭头': 'Arrow', '标签，比如：导致 / 张力 / 前提': 'Label, e.g. causes / tension / precondition',
  '双向': 'Both ways', '没有箭头（只是线）': 'No arrowhead (just a line)', '保留（以后 AI 整理不会删掉它）': 'Keep (AI organize will leave it)',
  '删除': 'Delete', '自定义颜色': 'Custom color', '默认颜色': 'Default color', '双击写点什么': 'Double-click to write',
  '拖到另一个关键词上，画一条箭头': 'Drag onto another keyword to draw an arrow', '拖到关键词上：便利贴会跟着它走': 'Drag onto a keyword: the note follows it',
  '拖动改变大小': 'Drag to resize', '接受这个关键词': 'Accept this keyword', '不要': 'Reject', '新关键词': 'New keyword', '关键词': 'Keyword',
  '比如：独立 vs 依赖': 'e.g. independence vs. dependence', '分组改名': 'Rename group', '组名': 'Group name', '新分组': 'New group',
  'AI 没有新的关键词': 'No new keywords from AI', '这条关系现在是你的了': 'This relation is yours now', '地图上至少要有两个关键词': 'The map needs at least two keywords',

  // gaps
  '按材料数量统计：0 = 空，1 = 薄，2–3 = 中，4 份以上 = 厚。“推荐”会针对这个缺口去找新材料。':
    'Counted by number of materials: 0 = empty, 1 = thin, 2–3 = some, 4+ = thick. “Recommend” looks for new material for that gap.',
  '类型分布': 'Types', '整理状况': 'Housekeeping', '结构之外的缺口': 'Gaps beyond the counts', '推荐': 'Recommend',
  '空': 'empty', '薄': 'thin', '中': 'some', '厚': 'thick', '没有': 'None',
  '还没写「为什么存它」': 'No “why I saved it” yet', '没有概念': 'No concepts', '没挂到研究问题': 'Not linked to a research question',
  '有 AI 内容待确认': 'Has unchecked AI content', '想读但还没读': 'Still to read',
  '还没有概念。在材料详情页添加概念，或者让 AI 建议。': 'No concepts yet. Add some on a material’s page, or ask AI to suggest them.',
  '计数看不出来的东西，比如覆盖了哪些障碍类型、是不是全是“说明现状”的材料。': 'What counting cannot show, such as which disabilities are covered, or whether everything just describes the status quo.',
  '让 AI 看看': 'Ask AI', '再看一次': 'Ask again', '分析中…': 'Analyzing…', '按这个推荐': 'Recommend for this',

  // inbox
  'AI 的产出都先放在这里，keep 之后才会写进笔记。橙色虚线 = AI 说的；蓝色 = 从 Open Library / Crossref 查到的。':
    'Everything AI produces waits here; only what you keep is written to your notes. Orange dashed = said by AI; blue = found in Open Library / Crossref.',
  '建议关键词': 'Suggested keywords', '推荐材料': 'Recommended materials', '全部 cancel': 'Cancel all', '字段': 'Field', '现在': 'Now', '建议': 'Suggested',
  '收入后会连到：': 'Keeping it connects to:', '为什么推荐：': 'Why recommended: ', '已有 ✓': 'exists ✓', '新概念': 'new concept', '（新概念）': '(new concept)',
  '还没有材料': 'no materials yet', '已写进笔记': 'Written to the note', '至少勾一个字段，或者点 cancel': 'Tick at least one field, or cancel',
  '为什么存它（用你自己的话）': 'Why I saved it (in your own words)', '导读（读之前看）': 'Reading guide (read first)',
  '空的。可以在材料详情页让 AI 补全信息、建议概念或关联，或者在「地图」上让 AI 总结关键词、选关键词点「推荐」。':
    'Empty. On a material’s page ask AI to fill in details or suggest concepts and links, or on the Map ask AI to summarize keywords or recommend.',

  // options
  '＋ 新增': '+ Add', '上移': 'Move up', '下移': 'Move down', '新名称': 'New name',
  '下拉菜单里的选项。保存在库里的': 'The options in the dropdown menus. Stored in the vault at', '，在 Obsidian 里改也可以。': '; you can edit them in Obsidian too.',
  '改名会同时更新所有用到旧名字的笔记；删除只是从菜单里移除，已经用了它的笔记保持不变。': 'Renaming updates every note using the old name; deleting only removes it from the menu.',

  // settings
  'AI 服务': 'AI service', 'ITP/IMA 课程代理': 'ITP/IMA course proxy', '模型': 'Model', 'NYU token（可选）': 'NYU token (optional)',
  '粘贴 token': 'Paste token', '（用你自己的 API key）': '(with your own API key)', '测试一下': 'Test', '请求中…': 'Requesting…', '已保存': 'Saved',
  '这些设置只保存在这个浏览器里，不会写进库，也不会跟着库同步到别的设备。': 'These settings live only in this browser: never in the vault, never synced.',
  'Claude Haiku 4.5（快）': 'Claude Haiku 4.5 (fast)', 'Claude Sonnet 4.5（更细）': 'Claude Sonnet 4.5 (more careful)',

  // capture
  '松手就收录': 'Drop to save', 'PDF、图片或链接 · 文件会存进库里的 附件/': 'PDF, image or link · files go to 附件/ in the vault',
  '正在读取 PDF…': 'Reading the PDF…', '正在让 AI 认一认这个链接…': 'Asking AI what this link is…', '正在去 Crossref / Open Library 核对…': 'Checking Crossref / Open Library…',
  '一句话：现在为什么觉得它重要？以后会忘的就是这句。': 'One sentence: why does it matter now? This is what you will forget.',
  'AI 填的内容标了「AI」，你没改就会记成 AI 说的。可以改任何一栏。': 'Fields AI filled are marked “AI”; untouched, they are saved as AI’s words. Edit any field.',
  '图片：填一下标题和为什么就好。': 'Image: a title and a why are enough.', '这个 PDF 读不出文字（可能是扫描件），请手动填写。': 'No text in this PDF (a scan?). Fill it in by hand.',
  '要先写「为什么存它」': 'Write “why I saved it” first',

  // recommend
  '推荐新材料': 'Recommend new material', '补充说明（可选）': 'Extra notes (optional)', '数量': 'How many', '知名 ↔ 冷门': 'Well known ↔ obscure',
  '离核心问题 近 ↔ 远': 'Close to ↔ far from the core question', '只要这些类型（不选 = 不限）': 'Only these types (none = any)', '围绕：': 'Around:',
  '（没选东西，会根据整个研究方向推荐）': '(Nothing selected: based on the whole research direction)',

  // reading plan, stars and likes
  '计划': 'Plan', '阅读计划': 'Reading plan', '计划读': 'Plan to read', '读完觉得很好，想继续发展': 'Read it, loved it, want to build on it',
  '接下来要读': 'Up next', '阅读计划 →': 'Reading plan →', '只看 ⭐': 'Only ⭐', '只看 ♥': 'Only ♥', '排序': 'Sort',
  '最新收录': 'Newest', '⭐ 优先': '⭐ first', '♥ 优先': '♥ first', '按标题': 'By title', '计划哪天读': 'Plan to read on', '读完': 'Done',
  '标成读过': 'Mark as read', '今天和之前': 'Today and overdue', '这一周': 'This week', '以后': 'Later', '还没排日期': 'Not scheduled',
  '♥ 喜欢的': '♥ Liked', '最近读完': 'Recently read', '读完觉得好的，点 ♡。': 'When something is great after reading, tap ♡.',
  '还没有 ⭐ 的材料。在「列表」或材料页点 ☆，就会出现在这里。': 'Nothing starred yet. Tap ☆ in the list or on a material to plan it.',
  '⭐ 计划读的材料按日期排在这里；给它填个日期就进日程，点「读完」就从计划里移走。♥ 是读完觉得很好、想继续发展的。':
    '⭐ starred materials, by the day planned; add a date to schedule one, “Done” takes it off. ♥ marks what I read and want to build on.',
  // map additions
  '主题气泡': 'Theme bubble', '我的主题': 'My themes', '＋ 新建主题气泡': '+ New theme bubble', '新建主题气泡': 'New theme bubble', '主题名': 'Theme',
  '这个主题是什么、为什么值得发展': 'What this theme is and why it is worth developing', '删除气泡': 'Delete bubble', '气泡改名': 'Rename bubble',
  '比如：描述里的想象空间': 'e.g. room for imagination in description', '便利贴': 'Sticky note', '编辑文字': 'Edit text', '也可以双击便利贴编辑。': 'Or double-click the note.',
  '打开材料页': 'Open material', '＋ 连一张便利贴': '+ Attach a sticky note', '⭐ 计划读': '⭐ Plan to read', '☆ 计划读': '☆ Plan to read', '♥ 喜欢': '♥ Liked', '♡ 喜欢': '♡ Like',
  '看了描述觉得有用，计划读': 'Looks useful: plan to read', '读完觉得写得很好，想继续发展': 'Read it, loved it, want to build on it',
  '上图': 'Add to map', '在图上': 'on map', '把这份材料从关键词引到地图上': 'Lead this material out of the keyword onto the map',
  '从地图上移除': 'Remove from map', '实线': 'Solid', '虚线': 'Dashed', '点线': 'Dotted', '细': 'Thin', '粗': 'Thick',
  '双击打开这份材料': 'Double-click to open', '拖到关键词或便利贴上，画一条线': 'Drag onto a keyword or note to draw a line',
  '选中关键词，在材料列表里点「上图」，把一份材料从关键词引到地图上': 'Select a keyword and use “Add to map” on one of its materials to lead it onto the map',
  'shift 多选几个节点，点「新建主题气泡」，圈出你想发展的方向': 'Shift-select several nodes and use “New theme bubble” to circle a direction to develop',
  // focus reading
  '开始专注读': 'Start focused reading', '开始读': 'Start reading', '← 退出专注': '← Leave focus', '读多久': 'Read for', '分钟': 'min', '开始': 'Start',
  '这次只做这几步': 'Just these steps', '＋ 加一步': '+ Add a step', '加一步': 'Add a step', '一个小步骤': 'A small step', '比如：看完第二节的图': 'e.g. look at the figures in section 2',
  '随手记': 'Quick notes', '存进「我得到了什么」': 'saved to “What I took away”', '粘贴一句原文': 'Paste a sentence from the source',
  '出处：页码 / 段落 / 时间点': 'Where: page / paragraph / timestamp', '你的反应：它让你想到什么？': 'Your reaction: what does it make you think of?',
  '存下这一条': 'Save this', '我想玩了': 'I need a break', '读完了': 'Finished', '时间到了': 'Time’s up', '接下来？': 'What next?',
  '再读 5 分钟': '5 more minutes', '再读 10 分钟': '10 more minutes', '休息一下（先记下读到哪）': 'Take a break (note where I am)', '结束': 'Stop',
  '先停在这里': 'Stopping here', '记下来，去休息': 'Save and take a break', '写半句就好，下次打开会从这里提醒你。': 'Half a sentence is enough; next time it reminds you.',
  '读到哪了': 'Where I got to', '脑子里在想什么': 'What I was thinking', '比如：第 3 节 / 第 12 页 / 视频 5:30': 'e.g. section 3 / page 12 / video 5:30',
  '一个没想完的念头也可以': 'An unfinished thought is fine', '打开原文（新窗口）': 'Open the source (new window)',
  '把原文窗口和这个页面并排放，读的时候右边一直在。': 'Put the source window next to this page; the panel stays on the right.',
  '这份材料没有链接或附件。': 'This material has no link or attachment.', '先写点什么': 'Write something first', '存进「我得到了什么」了': 'Saved to “What I took away”',
  '这次专注结束了，干得好。': 'Focus session done. Nice work.', '记下了。休息一下，下次从这里接着来。': 'Noted. Take a break; pick up here next time.', '读完一份！': 'One more read!',
  '找不到这份材料。': 'Material not found.', '先读开头或摘要，弄清它在讲什么': 'Read the opening or abstract to see what it is about',
  '找一句让你有反应的话，复制到右边': 'Find one sentence you react to and copy it to the right', '写一句你自己的反应': 'Write one sentence of your own reaction',
  '这 7 天还没有专注阅读的记录。从下面挑一份，点「开始读」。': 'No focused reading in the last 7 days yet. Pick one below and press “Start reading”.',
  // ideas
  '想法': 'Ideas', '＋ 新想法': '+ New idea', '新想法': 'New idea', '开始头脑风暴': 'Start a brainstorm', '灵感碰撞': 'Collision',
  '两份平时不会放在一起的材料。它们放在一起，你想到什么？没感觉就换一组。': 'Two materials you would not usually put together. What comes to mind? If nothing, try another pair.',
  '一句话写下冒出来的想法': 'One sentence for whatever comes to mind', '存成想法卡': 'Save as idea card', '换一组': 'Another pair', '存成想法卡了': 'Saved as an idea card',
  '种子': 'Seed', '发展中': 'Developing', '放下了': 'Set aside', '为谁：': 'For whom: ', '下一步：': 'Next: ', '往回挪': 'Move back', '往前推': 'Move forward',
  '放到地图': 'Put on map', '以它开始头脑风暴': 'Brainstorm from it', '放到地图上了': 'Put on the map', '它已经在地图上了': 'Already on the map',
  '还没有想法。碰撞一下，或者开始一次头脑风暴。': 'No ideas yet. Try a collision, or start a brainstorm.', '先写一句想法': 'Write the idea first',
  '一句话的想法': 'The idea in one sentence', '为谁、解决什么问题': 'For whom, solving what', '来自哪些材料（可选，用逗号分开）': 'From which materials (optional, comma-separated)',
  '存下': 'Save', '阶段': 'Stage', '下一步': 'Next step', '比如：画故事板 / 找两个人聊聊': 'e.g. draw a storyboard / talk to two people',
  '先用一句话写下这个想法': 'Write the idea in one sentence first', '💡 想法 · 种子': '💡 Idea · seed', '双击打开这张想法卡': 'Double-click to open this idea',
  // brainstorm
  '头脑风暴': 'Brainstorm', '你在本子上写，这一页负责带节奏：每一轮做什么、做多久，到点会明确提醒。': 'You write in your notebook; this page keeps the rhythm: what to do each round, for how long, with a clear stop.',
  '1. 从哪里开始？': '1. Where to start?', '一个问题或一个念头，比如：alt text 能不能留出想象的空间？': 'A question or a thought, e.g. can alt text leave room for imagination?',
  '从一张想法卡开始…': 'Start from an idea card…', '从一个关键词开始…': 'Start from a keyword…', '从我 ⭐/♥ 的材料里随机挑一个': 'Pick one of my ⭐/♥ materials at random',
  '2. 轮次': '2. Rounds', '（可以调时长、关掉某一轮；会记住你的设置）': '(change times or turn rounds off; your settings are remembered)', '恢复默认': 'Reset',
  '先求多': 'Go for quantity', '换个角度': 'Change the angle', '强行连接': 'Forced connection', '快速画 8 格': 'Crazy 8s', '选出 1–2 个': 'Pick 1–2',
  '写下至少 10 个联想。不要评价，越怪越好。': 'Write at least 10 associations. No judging; the stranger the better.',
  '每看到一个提示，就再写 2–3 个想法。没感觉就点「换一个」。': 'For each prompt, write 2–3 more ideas. Nothing? Press “Another”.',
  '这份材料和你的问题有什么关系？想到什么都写下来，牵强也没关系。': 'How does this material relate to your question? Write anything, however far-fetched.',
  '把纸折成 8 格，每格 1 分钟，画一个方案草图。听到提示音就换下一格。': 'Fold the paper into 8; one minute per box, one sketch each. Move on at each chime.',
  '圈出最想继续的 1–2 个，用一句话写下来。': 'Circle the 1–2 you most want to pursue; write each in one sentence.',
  '换一个': 'Another', '换一张': 'Another card', '跳到下一轮': 'Skip to next round', '提前结束，去存档': 'Finish early and save', '再给 2 分钟': '2 more minutes',
  '结束，去存档': 'Finish and save', '存下这次头脑风暴': 'Save this brainstorm', '本子的照片': 'Notebook photos', '选择照片': 'Choose photos',
  '会自动压缩，并去掉拍摄地点': 'shrunk automatically, location removed', '（可选：几个关键词就行）': '(optional: a few keywords are enough)',
  '你圈出的想法': 'Ideas you circled', '（每一条会变成一张想法卡）': '(each becomes an idea card)', '存档': 'Save', '不存了': 'Discard',
  '先写一个起点：一个问题或一个念头': 'Write a starting point first: a question or a thought', '至少留一轮': 'Keep at least one round',
  '发布版里不能做头脑风暴。': 'Brainstorming is not available on the published site.', '存好了': 'Saved',
  '如果是给小孩用呢？': 'What if it were for children?', '如果反过来做呢？': 'What if you did the opposite?', '最极端的使用者是谁？他需要什么？': 'Who is the most extreme user? What do they need?',
  '如果完全没有屏幕呢？': 'What if there were no screen at all?', '如果必须在 30 秒内完成呢？': 'What if it had to happen in 30 seconds?',
  '如果它是一件艺术作品，而不是一个产品呢？': 'What if it were an artwork, not a product?', '如果由当事人自己来做呢？': 'What if the people affected made it themselves?',
  '如果免费？如果很贵？': 'What if it were free? Very expensive?', '十年后它会是什么样？': 'What would it be in ten years?', '最糟糕的版本是什么？': 'What is the worst version?',
  '如果要两个人一起用呢？': 'What if two people had to use it together?', '如果只能用声音呢？': 'What if it could only use sound?',
  '把问题缩小到一个具体的人、一个具体的时刻呢？': 'What if you narrowed it to one person, one moment?',
  // translation control
  '更新英文版': 'Update English',
};

// Interface text with numbers or names inside. Each match is rebuilt in English; captured names go
// through the same lookup, so a keyword or vocabulary value inside is translated too.
const RULES = [
  [/^有 (\d+) 份材料还没写「为什么存它」。$/, n => `${n} material${n === '1' ? '' : 's'} without a “why I saved it”.`],
  [/^(\d+) 待确认$/, n => `${n} to check`],
  [/^还有 (\d+) 个字段来自 AI 或原文、等我确认$/, n => `${n} field(s) from AI or the source still to check`],
  [/^收件箱里有 (\d+) 条关于它的建议 →$/, n => `${n} suggestion(s) in the inbox →`],
  [/^(.+) →$/, t => `${tr(t)} →`],
  [/^← (.+)$/, t => `← ${tr(t)}`],
  [/^共享概念：(.+)$/, t => `Shared concepts: ${splitList(t)}`],
  [/^共享材料：(.+)$/, t => `Shared materials: ${t.split('、').map(tr).join(', ')}`],
  [/^(.+)（反向）：(.*)$/, (t, r) => `${tr(t)} (reverse): ${tr(r)}`],
  [/^还没有材料挂到这个(.+)下。$/, k => `No materials are attached to this ${tr(k).toLowerCase()} yet.`],
  [/^(\d+) 个关键词 · (\d+) 组(?: · 上次整理 (\S+))?$/, (k, g, d) => `${k} keywords · ${g} groups${d ? ` · organized ${d}` : ''}`],
  [/^AI 建议了 (\d+) 个关键词（橙色虚线）$/, n => `AI suggested ${n} keywords (orange dashed)`],
  [/^(\d+) 个关键词还没分组，点上面的「AI 整理」$/, n => `${n} keyword(s) not grouped yet: use “AI organize” above`],
  [/^已选 (\d+) 个关键词$/, n => `${n} keywords selected`],
  [/^已选 (\d+) 个$/, n => `${n} selected`],
  [/^显示 (.+)$/, t => `Show ${tr(t)}`],
  [/^颜色 (\d)$/, n => `Color ${n}`],
  [/^数字 = 关键词下的材料数 · 点关键词看材料$/, () => 'Numbers = materials per keyword · click a keyword to see them'],
  [/^数字 = 关键词下的材料数 · 拖动关键词会把它固定$/, () => 'Numbers = materials per keyword · dragging a keyword pins it'],
  [/^继续使用「(.+)」$/, t => `Continue with “${t}”`],
  [/^新增「(.+)」选项$/, t => `Add a “${tr(t)}” option`],
  [/^（图片 (.+) 不在这里）$/, t => `(Image ${t} is not here)`],
  [/^想要能在论文里充当「(.+)」的材料$/, t => `Material that can serve as “${tr(t)}” in the thesis`],
  [/^想要声音来源是「(.+)」的材料$/, t => `Material whose voice is “${tr(t)}”`],
  [/^更新英文版（(\d+)）$/, n => `Update English (${n})`],
  [/^计划 (\S+)$/, d => `Planned ${d}`],
  [/^上次停在：(.+)$/, t => `Last stopped at: ${tr(t)}`],
  [/^你已经专心读了 (\d+) 分钟。接下来？$/, n => `You have read with focus for ${n} minutes. What next?`],
  [/^这 7 天：专心读了 (\d+) 分钟，读了 (\d+) 份材料$/, (m, n) => `Last 7 days: ${m} minutes of focused reading, ${n} materials`],
  [/^先读：(.+)$/, t => `Read first: ${t}`],
  [/^第 (\d+) \/ (\d+) 轮$/, (a, b) => `Round ${a} of ${b}`],
  [/^起点：(.+)$/, t => `Starting point: ${t}`],
  [/^「(.+)」时间到$/, t => `Time’s up for “${tr(t)}”`],
  [/^下一轮：(.+)$/, t => `Next: ${tr(t)}`],
  [/^开始（共 (\d+) 分钟）$/, n => `Start (${n} min total)`],
  [/^(.+) · (\d+) 个想法 · (\d+) 张照片$/, (d, i, p) => `${d} · ${i} idea${i === '1' ? '' : 's'} · ${p} photo${p === '1' ? '' : 's'}`],
  [/^想法 (\d)：一句话$/, n => `Idea ${n}: one sentence`],
  [/^💡 想法 · (.+)$/, t => `💡 Idea · ${tr(t)}`],
  [/^关于「(.+)」，我能做什么？$/, t => `What could I make around “${tr(t)}”?`],
  [/^◎ (.+)$/, t => `◎ ${tr(t)}`],
  [/^(\d+) 个节点。选中一个节点后可以在面板里把它加进或移出气泡。$/, n => `${n} nodes. Select a node to add it to or remove it from the bubble.`],
  [/^(建议关键词|补全信息|建议概念|建议关联|推荐材料) · (.*)$/, (k, rest) => `${tr(k)} · ${rest}`],
  [/^(原文|我|AI) ✓$/, t => `${tr(t)} ✓`],
  [/^✓ (.+)$/, t => `✓ ${tr(t)}`],
  // Lists the page joins itself: "OpenAAC · 组织/资源库", "概念A、概念B".
  [/^(.+? · .+)$/, t => t.split(' · ').map(tr).join(' · ')],
  [/^([^、]+、.+)$/, t => splitList(t)],
  // Tooltips listing several titles, one per line.
  [/^([^\n]+\n[\s\S]+)$/, t => t.split('\n').map(tr).join('\n')],
];

// "概念A、概念B" — but a single name may contain 、 itself (培训、支持与社群).
function splitList(t) {
  const own = store.translation(t);
  if (own) return own;
  const parts = t.split('、'), out = [];
  for (let i = 0; i < parts.length; i++) {
    let j = parts.length;
    for (; j > i + 1; j--) if (store.translation(parts.slice(i, j).join('、'))) break;
    out.push(tr(parts.slice(i, j).join('、'))); i = j - 1;
  }
  return out.join(', ');
}

export function tr(text) {
  if (typeof text !== 'string' || !CJK.test(text)) return text;
  const own = store.translation(text);
  if (own) return own;
  if (UI[text]) return UI[text];
  const flat = text.replace(/\s+/g, ' ');
  if (UI[flat]) return UI[flat];
  for (const [re, fn] of RULES) { const m = text.match(re); if (m) return fn(...m.slice(1)); }
  return text;
}
function swap(s) {
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!m[2] || !CJK.test(m[2])) return null;
  const out = tr(m[2]);
  return out === m[2] ? null : m[1] + out + m[3];
}

/* ---------- the DOM pass ---------- */
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt', 'value'];
const changed = new Set();   // [node, attr|null, original] so Chinese can be put back

function translateNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (node.parentElement?.closest('[data-no-tr], input[type="search"], script, style')) return;
    const out = swap(node.data);
    if (out == null) return;
    // An <option> without a value takes its value from its text: pin the Chinese value first,
    // so choosing "To read" still saves 想读.
    const opt = node.parentElement;
    if (opt?.tagName === 'OPTION' && !opt.hasAttribute('value')) opt.setAttribute('value', opt.textContent);
    changed.add([node, null, node.data]); node.data = out;
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE || node.closest('[data-no-tr]')) return;
  const els = [node, ...node.querySelectorAll('*')];
  for (const el of els) {
    if (el !== node && el.closest('[data-no-tr]')) continue;
    for (const a of ATTRS) {
      if (!el.hasAttribute(a) || (a === 'value' && !(el.tagName === 'INPUT' && el.type !== 'search' && el.type !== 'color'))) continue;
      const out = swap(el.getAttribute(a));
      if (out != null) { changed.add([el, a, el.getAttribute(a)]); el.setAttribute(a, out); if (a === 'value') el.value = out; }
    }
    if (el.tagName === 'TEXTAREA') {
      const out = swap(el.value);
      if (out != null) { changed.add([el, 'textarea', el.value]); el.value = out; }
    }
  }
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) translateNode(t);
}

const observer = new MutationObserver(records => {
  for (const r of records) {
    if (r.type === 'characterData') translateNode(r.target);
    else for (const n of r.addedNodes) translateNode(n);
  }
});
let active = false;

// Called on every render: switch the pass on or off to match the language.
export function applyLang() {
  const en = isEn();
  document.documentElement.lang = en ? 'en' : 'zh-CN';
  if (en && !active) {
    active = true;
    translateNode(document.body);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  } else if (!en && active) {
    active = false;
    observer.disconnect();
    for (const [node, attr, orig] of changed) {
      if (!node.isConnected) continue;
      if (attr == null) node.data = orig;
      else if (attr === 'textarea') node.value = orig;
      else { node.setAttribute(attr, orig); if (attr === 'value') node.value = orig; }
    }
  }
  if (!en) changed.clear();
}
