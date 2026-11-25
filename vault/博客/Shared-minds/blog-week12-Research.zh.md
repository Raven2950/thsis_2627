# Week 12 · 研究 Research

## Reading / Writing

> **Ask**
>
> **Final Project Proposal:** Decide on a project to do for the Final. Create a proposal addressing the following criteria
>
> - What is the project? What does it do, what form will it take?
> - Who is it for? Identify your users or audience
> - Why do you want to do it? Discuss your interest and motivation
> - How will you do it? Include a preliminary weekly schedule with benchmarks for prototypes and user tests.
> - Prior Art — Give Examples of related work done by other people that inspires you.
> - Do the very first step.

## My Writing

### 这是什么？

**《谁的声音？》（Whose Voice?）** 是一个在浏览器里玩的拼字侦探小游戏，大约 10 分钟。它是我毕设游戏《她留在外面的东西》（*What She Left Out*）核心机制的一个可玩测试。

在我的毕设里，玩家要从报纸、广告、家人发来的消息和主角以前的稿子里圈出、剪下字词，拼成句子，找回她忘掉的东西。我设计了两种拼法：

- **圈字（cutting out）：** 字留在原文里，不能移动，也不能换顺序，只能选择留下哪些。圈出来的东西是在*确认一个事实*：这句话本来就藏在原文里。
- **自由拼贴（free collage）：** 用剪刀把字剪下来，随意排列，还可以和别处的字混在一起。拼出来的东西是在*选择一种意义*：这句话在你拼出来之前并不存在。

我给这个游戏定的规则是：*事实由你拼出的东西确认，意义由你拼出的东西选择。* 第二种没有裁判。但我现在还不知道：这样好不好玩？没人提示的时候，玩家能不能找到该圈的字？一句没有标准答案的话，会让人觉得自由，还是只是空？

毕设的故事内容还在写，两周之内也写不好。所以这次 final，我保留**形式**，借用**内容**。文本来自一个大多数人都知道的故事：爱伦·坡的《莫格街凶杀案》（*The Murders in the Rue Morgue*，1841），常被称为第一部侦探小说。它已经进入公版，所以里面每一个字都可以被圈、被剪。

这个故事和这个机制合得有点过分。案情大部分是通过一篇报纸报道传达给读者的：《法庭公报》（*Gazette des Tribunaux*）上一长串证人的证词。每个证人都在凶案发生时听见了一个尖利的声音，每个人都说那是一种外语，而且每个人说的都*不一样*：法国人觉得是西班牙语，英国人觉得是德语，西班牙人觉得是英语，意大利人觉得是俄语。而且没有一个人会说自己猜的那门语言。答案在文中哪里都没有写出来，只有把这些猜测摆在一起时，它才会出现。

这正好就是一个圈字谜题。而且它悄悄地和我的毕设问的是同一个问题：*当没有人认得出来的时候，这是谁的声音？*

### 它看起来是什么样

一个案子，三间纸做的房间：

1. **证词（圈字）。** 一页印着证人证词的报纸。玩家圈出每个证人对那个声音的猜测。所有猜测都摆上桌之后，一个事实被锁定：*那不是人的声音。*
2. **现场（圈字）。** 警方关于密室的报告：钉死的窗户、断掉的钉子、避雷针。玩家圈出字词去填一个句子里的几个空，就像《金偶像案》（*The Case of the Golden Idol*）。这里有唯一的答案，锁定第二个事实：*它是从窗户进出的。*
3. **明天的头条（自由拼贴）。** 玩家从读过的所有文字里剪下词，拼出明天报纸的头条。这里**没有标准答案**。游戏会用句子 embedding（就是我上周做“借来的句子”时用的模型）判断这条头条更像哪一种*声音*，然后三个声音会回应你：
   - **杜潘（Dupin）**，冷静的推理者
   - **警察局长（The Prefect）**，他的警察已经抓错了人
   - **《公报》（The Gazette）**，只想要一个耸人听闻的故事

   唯一的限制是：头条不能和玩家已经锁定的事实矛盾。

这三个声音，是我毕设里内心声音（妈妈、坠落的天才、审问者）的测试版。如果这套能成立，把文本和声音换掉，同一个系统就会变成我的游戏。

视觉上是纸：新闻纸、红笔圈、剪刀和胶水。不要仪表盘，不要分数，不要进度条。

### 给谁的？

- **玩家：** 喜欢大量阅读的推理和叙事游戏的人，比如《金偶像案》、《奥伯拉丁的回归》（*Return of the Obra Dinn*）、《她的故事》（*Her Story*）、《极乐迪斯科》（*Disco Elysium*）。用一个有名的故事，他们不需要任何背景就能开始玩。
- **作为设计师的我。** 这是我毕设的试验台。我在这里问测试者的每一个问题，以后都得在 Unity 里回答，而且那时候代价会大得多。

### 为什么想做？

上周我写到，我想占据的那一层是*一种感受变成一条规则*的那一层，还写了*离我在做的东西近一点*。我的毕设已经有一个写在纸上的机制，也有一堆没解决的问题：圈字关卡怎么设计？玩家怎么知道该拿哪些字？选错了会怎样？自由拼贴在没有裁判的情况下怎么影响结局？之前我做过一版纸上原型，得到的反馈是太复杂了。我不想整个春天都在脑子里计划，我更想现在就做出最小的可玩版本，然后看人玩。

把形式和内容分开，对我也有帮助。如果用我自己的故事来测，我分不清大家的反应是冲着机制，还是冲着文字。用一个大家都知道的故事，机制就成了唯一的变量。

### 怎么做？

**技术：** HTML + JavaScript，在浏览器里运行。拼贴那一步，我需要在玩家*拼出句子的当下*就算出它的 embedding，因为每一条头条都是新的。上周的 Colab 是把所有向量提前算好的，在这里行不通。所以计划是用 **transformers.js** 在浏览器里直接跑同一个多语言 MiniLM 模型，不需要服务器，也不需要 Colab。

| 日期 | 节点 |
|---|---|
| 11/25 · Proof of concept | embedding 模型能在浏览器里跑起来。可以把字条拖成一句话，看到它离三个声音中的哪一个最近。不做美术。 |
| 11/26 – 12/01 · 原型 v1 | 三步都能用《莫格街》的真实文本从头玩到尾。写好三个声音的回应。纸质感的第一版。 |
| 12/02 · 用户测试 | 4–5 个玩家。问题：(1) 圈字的两步里，没人提示哪些字重要时，他们能自己*看出*答案吗？(2) 拼贴没有标准答案，感觉是自由还是失落？(3) 声音的回应会让他们想再拼一条头条吗？ |
| 12/03 – 12/08 · 原型 v2 | 根据测试结果修改。加声音和一些小细节（墨迹褪色、剪刀）。 |
| 12/09 · Final | 展示这个片段、测试的发现，以及它们会怎样改变我的毕设。 |

### Prior Art

- **《金偶像案》**（*The Case of the Golden Idol*，Color Gray Games，2022）。每个场景都要把找到的词拖进句子的空格里来破案。它是最接近我“圈字”模式的作品，只是它永远有裁判，而我的拼贴模式没有。
- **《奥伯拉丁的回归》**（*Return of the Obra Dinn*，Lucas Pope，2018）。推理结果每次只确认几个，让玩家信任自己的推理。
- **《她的故事》**（*Her Story*，Sam Barlow，2015）。故事只存在于你搜出来的碎片里，由玩家自己拼起来。
- **《极乐迪斯科》**（*Disco Elysium*，ZA/UM，2019）。会和你吵架的内心声音，是三个声音的原型。
- **Semantris**（Google，2018）和 **Semantle**（2022）。基于语义相似度的文字游戏。它们把距离显示成分数或排名；我想让距离变成一个*声音*回到玩家面前。
- **William S. Burroughs 的 cut-up 写作法**和 **Austin Kleon 的《Newspaper Blackout》**。用别人的字做出自己的话。

### 第一步

我写下了上面这个片段的设计，选好了文本，并开始了下面的技术研究：先让模型在浏览器里跑起来，因为其他所有东西都依赖它。

## Making

> **Ask**
>
> 1. Create a Google Notebook (formerly NotebookLM) and populate it with items that relate to your final project. You can use the "Export" button in the "Content" section of your "My Dashboard" to download all your writing responses from this class. Put the address of the chatbot or audio overview it creates in the NotebookLM field in the My Dashboard.
> 2. On the technical side, try going further with one of your projects, or research some of your technical gaps in your final proposal.

## My Making

### NotebookLM

*（链接待补。）*

我放进去的东西：

- 这门课我写的所有文字（从 My Dashboard 导出）
- 我的毕设博客：《Starting Over》、各个 exploration，以及关于《极乐迪斯科》的笔记
- 《莫格街凶杀案》全文
- 我对《金偶像案》的笔记
- 上周“借来的句子”的 notebook 和句子库

我想问它的问题是：*如果杜潘、警察局长和《公报》读到同一条头条，他们各自会说什么？* 它的回答可以当作三个声音的初稿。

### 技术空白：在浏览器里跑 embedding

“借来的句子”是在 Colab 里跑的，句子库是固定的，所以每个向量都可以提前算好。但在游戏里，玩家的头条在拼出来之前并不存在，所以必须当场、在浏览器里、不靠服务器算出它的 embedding。

我要用 transformers.js 测试的东西：

1. **能不能跑同一个模型？** 我需要 paraphrase-multilingual-MiniLM-L12-v2 的浏览器（ONNX）版本，这样结果才能和上周的 notebook 对得上。
2. **第一次加载要多久？** 模型要先下载完，才能算第一句话。如果很慢，可以让加载发生在第一个圈字步骤里，那时候还不需要 embedding。
3. **算一句话要多快？** 玩家把头条贴下去的那一刻，声音就应该回应。
4. **三个声音分得开吗？** 我会给每个声音写几句参考句，看测试头条是不是明显更靠近其中一个，还是全都落在中间，就像上周那个空着的中间。

*（结果待补。）*
