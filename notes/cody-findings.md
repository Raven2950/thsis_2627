# 阶段 0 调研笔记（2026-10-12）

## ITP/IMA Replicate 代理
- 地址：`POST https://itp-ima-replicate-proxy.web.app/api/create_n_get`
- 请求体：`{ model: "<owner/name>", input: { ...模型参数 } }`
- 鉴权：便宜的模型**不登录也能用**，但次数很少；用 nyu.edu 登录拿 token（`Authorization: Bearer <token>`）后每天 500 次，token 最快 1 小时过期。
- 代理替你藏 key、解决 CORS、由学校付费 → 前端代码里**没有任何密钥**，可以公开部署。
- 返回：`{ output: ... }`。LLM 的 output 是字符串片段数组，需要 `join("")`。

## Cody 的 Research Web
- 单页，整个应用是一个约 73KB 的内联 `<script>`，没有用框架和图形库（Canvas/DOM 手写布局，含 organic 力导向）。
- **数据来自 Obsidian**：
  - 启动时读取三个静态 JSON：`seed.json`（书目元数据）、`library.json`（预先构建好的图）、`vault-canvas.json`。
  - `vault-canvas.json` 就是他 Obsidian 库里 “Books Read” 这张 **Canvas 文件（JSON Canvas 格式）** 的拷贝：节点文本形如 `# [[Five Dialogues_C|Five Dialogues]]\n*Plato*`，主题节点是标题文字，edges 为连线。
  - 书目来自他的 `Books.base`（Obsidian Bases），主题来自每篇笔记 frontmatter 的 tags。
  - 结论：他是**离线导出 → 静态部署**的单向流程。网页不会回写 Obsidian，在网页里 keep 的书只存在浏览器里。
- 存储：`localStorage["sm3-books-v1"]` 存整张图快照（nodes 含 x/y/w/h/color），`sm3-books-v1-tune` 存参数。
- AI 调用：
  ```js
  fetch(PROXY, { method: "POST", body: JSON.stringify({ model, input: {
    system_prompt: "You recommend books for an artist-engineer. Reply with only JSON.",
    prompt, temperature: tune.wildness, max_tokens } }) })
  ```
  - 模型列表：`anthropic/claude-4.5-haiku`、`anthropic/claude-4.5-sonnet`、`openai/gpt-5`、`openai/gpt-4.1`、`meta/meta-llama-3-70b-instruct`。
  - 所选模型失败时自动依次换下一个模型；从回复文本里容错地抠出 JSON 数组。
  - wildness 直接对应 temperature。
- 核对：`openlibrary.org/search.json?title=&author=`，要求标题和第一作者姓氏都匹配，并且有合法 ISBN 才算真书；同时取回 subjects 作为“第二意见”。并发控制在每次 3 本。

## 对我们的启发
1. AI 模块可以直接照这个格式写，配上“模型降级 + 容错解析 JSON”。
2. 核对逻辑可以照搬，论文再加一路 Crossref。
3. Obsidian 结合是可行的，而且我们可以比他更进一步：**双向读写**（见计划）。
