# Thesis Web

个人 thesis 材料仓库。数据就是 `vault/` 里的 Obsidian 笔记，`app/` 是读写这些笔记的网页工具。

## 运行

```bash
python3 -m http.server 5173
```

在项目根目录运行。用 Chrome 打开 http://localhost:5173/app/ ，选择 `vault/` 文件夹。Safari 只能以只读方式打开。

- 演示模式：http://localhost:5173/app/?demo 直接读取 `vault/`，所有修改只留在页面内存里，刷新就没了。适合课堂展示，也用于自动测试。
- 安装成 App：用 Chrome 打开后，点地址栏右侧的“安装”图标。

## 发布（GitHub Pages）

网站地址：https://raven2950.github.io/thsis_2627/

- 访客打开看到的是只读发布版，默认进入关键词地图。
- 你自己用的时候，点右上角「打开我的库」，选电脑上的 `vault/` 文件夹，就是可以编辑的完整版，不需要再开本地服务器。
- 要更新网站，在 Finder 里双击 `发布.command`。它会提交改动并推送，GitHub Action（`.github/workflows/pages.yml`，构建脚本在 `scripts/build-site.sh`）大约一分钟后重新发布。
- 不会上传、也不会发布的内容：`vault/附件/`、所有 PDF、`vault/私密/`。仓库是公开的，其余内容在 GitHub 上都能被看到。

## 中英双语

- 右上角「中 / EN」切换。访客默认看到英文；你在自己的库里默认是中文。网址后面加 `?lang=en` 或 `?lang=zh` 可以强制指定语言。
- 界面文字的翻译写在 `app/js/i18n.js` 的对照表里，不经过 AI。
- 你写的内容只做中译英：点「更新英文版（N）」，只翻译还没有英文的段落，几段合成一次请求，结果存进 `vault/_系统/译文.json`，跟着网站一起发布。访客看英文时直接读这份译文，不会调用 AI。
- 英文模式只用来看；要编辑请切回「中」。

## 笔记约定

每篇笔记用 `kind` 属性区分类型：`材料`、`概念`、`研究问题`、`方向`。文件放在哪个文件夹不影响识别。

材料笔记的属性（模板见 `vault/_模板/材料模板.md`）：

| 属性 | 说明 |
|---|---|
| `why` | 为什么存它，一句话，必填 |
| `type` `status` `importance` `roles` `voice` | 我自己的判断 |
| `concepts` `questions` `parent` | 用 `[[双链]]` 指向概念、研究问题、所属合集 |
| `summary` | 简介 |
| `from_ai` / `from_source` | 列出哪些字段来自 AI / 原文；没列出的字段默认是我写的 |
| `confirmed` | 列出我已经核对过的字段 |

关键词地图存在 `vault/关键词地图.canvas`（Obsidian 的 Canvas 格式）。关键词节点指向 `概念/` 里的概念笔记，便利贴是文本卡片，箭头是 Canvas 的连线。在 Obsidian 里也能打开和编辑这张地图。

地图的整理信息存在 `vault/_系统/地图整理.json`：分组、哪些箭头是 AI 画的、固定或隐藏了哪些关键词。地图布局由力导向模拟自动完成（d3-force）：共享材料越多的关键词越靠近，同组的关键词聚在一起，组与组之间互相排开。「AI 整理」会重新分组，并重画 AI 的关系箭头；你自己画的箭头、拖动后固定的位置、写的便利贴都不会被覆盖。

AI 的建议在 keep 之前存放在 `vault/_系统/收件箱.json`。AI 的设置（服务、token、key）只保存在浏览器里，不会写进库。

下拉菜单的选项保存在 `vault/_系统/词表.md`，可以在网页的「选项」页里改，也可以在 Obsidian 里直接改。`_模板/` 文件夹里的笔记会被网页忽略。

收录文件：把 PDF、图片或链接拖进网页窗口，或者直接粘贴，或者在列表页点「从文件收录…」。PDF 的文字在浏览器本地读取（pdf.js），AI 根据这些文字认出标题、作者和类型，书和论文再去 Crossref / Open Library 核对。填写「为什么存它」后点收录：文件存进 `vault/附件/`，同时生成一篇材料笔记，用 `file` 属性和正文里的 `![[…]]` 链接这个文件。

正文约定：
- `> [!ai]` callout：AI 写的内容
- `## 关联`：手动连线，每行格式为 `- 类型 → [[目标]]：理由`。理由以 `〔AI〕` 开头的，是从收件箱 keep 进来的 AI 建议
- `## 我得到了什么`：我的摘录和理解
- `## 待解决的问题`：以后可能升级成研究问题

## 代码结构

```
app/js/
  vault.js   读写本地文件夹（File System Access API；Safari 用只读回退）
  note.js    frontmatter 解析/写回
  store.js   内存索引，编辑时先读盘再改再写回
  model.js   字段词表、来源标记
  links.js   ## 关联 段落的解析和写回
  ai.js      AI 调用封装（课程代理 / Gemini）
  verify.js  Open Library / Crossref 核对
  tasks.js   补全、建议概念、建议关联、回忆、推荐、AI 缺口分析
  inbox.js   keep / cancel，以及 keep 之前的预览
  i18n.js    中英切换：界面对照表，加上英文模式下的 DOM 替换
  translate.js 把我写的中文内容翻成英文，只翻新的
  gaps.js    缺口计数（纯前端）
  pdftext.js 在浏览器里读 PDF 的文字和元数据
  views/     capture（拖入收录）, list, detail, map（关键词白板）, inbox, gaps, recommend, options, settings
sw.js        离线缓存（PWA）
```
