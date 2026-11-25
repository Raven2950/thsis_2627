# Week 2 · 对齐 Alignment

## Reading
> **Ask**
> - Develop some sources for intuition and understanding of ANN mathematical workings. Anyvideo on [3Blue1Brown l](https://www.youtube.com/@3blue1brown)ike this one about  [Neural Networks](https://www.youtube.com/watch?v=aircAruvnKk) or this [Medium Article](https://mark-riedl.medium.com/the-intuition-behind-how-large-language-models-work-166cf2fb278a)
> 
> Or as a follow up to last week a podcast about [Can AI's be Conscious](https://samharris.org/episode/SE248203E32)
> 
> Periodicals [Things I Thing Are Awesome](https://arnicas.substack.com/) -AI Art News, [TLDR](https://itpima.web.app/smf26/alignment-with-neural-networks/TLDR) AI Tech and Biz News, [One Useful Thing](https://www.oneusefulthing.org/) - AI and Education or on the more tech bro side [Dwarkesh Podcast](https://www.dwarkesh.com/) or [Lex Fridman Podcast](https://lexfridman.com/podcast/), [Bens Bites Substack](https://www.bensbites.com/) about

## Writing
> **Ask**
>  This week we are looking at this new way of encoding our thought and capturing the world using neural networks. Can you explain AI to your parents? What analogies can you make to stuff they already know about. How is so new alien intelligence that it defies leveraging any of existing intuitions?
>   Last week we tried to take a look at your internal thinking. and now we want to know how well neural networks, originally inspired by our neural anatomy, actually work (align) as media for capturing and depicting our internal life? What do they offer as a medium for representing the external world.
>    Usually the word alignment in the context of AI is about safety, preserving humanity against being destroyed by well meaning people accidently setting AIs in a bad direction (eg prioritizing [paper clips](https://en.wikipedia.org/wiki/Instrumental_convergence)), bad actors using AI as a weapon for disinformation, hacking or worse, AIs. Or will sufficiently intelligent AIs have their own priorities that could diverge from ours? What do you think of the transhumanist perspective that might say that we should not begrudge our silicon based evolutionary descendants a go, we have had our day..

这周对神经网络的探索，让我重新思考 AI：它不只是一个工具，更像是一种奇怪的、外星般的媒介，在模仿人类式的思考。

如果要向我父母解释神经网络，我会用一个日常的类比：练技能。就像人通过反复练习和纠错，慢慢学会做饭、骑车或者说一门外语一样，神经网络在处理海量例子之后，调整内部连接的强度，从而产生稳定的输出。

这个类比一开始是成立的，但它藏着一个我一直在质疑的假设。我们通常说 AI 只是在匹配统计规律，而人类拥有“真正的”内心生活。可人的思想、情感和性格真的是天生的吗？我不这么认为。我们并不是生下来就带着一个完整的自我。我们的情绪、偏好和思考方式，是在多年的学习、接触和经历中塑造出来的。而从生物学上说，所有这些内心生活，也不过是细胞、神经元和化学信号共同作用的结果。如果人的主体性是从一个物理系统里涌现出来的，那我看不出有什么原则性的理由，说它永远不可能在另一个系统里被模拟。障碍也许是难度和伦理，而不是“不可能”。

当然，今天的模型离这一步还很远。它们缺少具身的、活过的经验——它们不会长大，感受不到痛苦和快乐，也不会积累一段人生。但这是目前实现方式的局限，而不是一道永久边界的证明。而且如果人的心智本身就是流动的、不可预测的，为什么未来的 AI 不能至少模拟一部分人类的思考方式呢？哪怕只是模仿某一类人的思维风格，原则上也似乎是可能的。

上周我观察到自己的内心思考有多跳跃、多没有结构。而现在，神经网络把一切都变成可计算的规律。作为表现外部世界的媒介，它们非常强大；但在捕捉人的内心生活这件事上，它们今天只能复现我们外在的表达，而不是表达背后的主观感受。不过我并不确定这道鸿沟是永恒的——它可能只是我们现在所处的位置。

在主流的 AI 讨论里，“对齐”（alignment）大多在谈安全风险：像回形针最大化那样对目标的字面误解、被当作虚假信息武器的滥用，或者未来 AI 的优先级可能和人类价值分道扬镳。超人类主义说我们应该给硅基后代让路，这个想法在我认真对待自己的论点之后，就显得没那么荒谬了：如果意识在原则上是可以被模拟的，那硅基心智就不是幻想，而是一个工程和伦理问题。而如果一个 AI 真的能发展出自己的欲望和内心生活，对齐就不再只是“让它听指令”，而会变成一件难得多的事：我们该如何对待另一种形式的主体性？

不过，我还是要把猜想和现实分开。今天的神经网络仍然是统计模拟的媒介。但我选择让这个问题保持开放：主观体验对人工系统来说，究竟是一道永久的边界，还是只是一个我们还没解决的、非常难的问题？我猜是后者。

## Making

> **Ask**
>- Please put your github link for this class in your profile for this site which you can reach using the "My Dashboard" link in the upper right.
>- Try to get a feel for what ML can do. For this week you might try just learn to use the fetch command with the APIs to [explore various models in a service like Replicate](https://replicate.com/explore). The baby might want to get a little organized and be able to organize its thoughts by painting different parts of the screen with different kinds of thoughts. Does speaking help you capture you train of thought better. Does AI come up with the same associations as you? Please commit your code to a github repository and paste the link in your dashboard on this site.

这周的 making 我从一个简单的问题开始：AI 会和人产生一样的联想吗？

> 链接：[https://raven2950.github.io/Sharedminds_Raven_26fall/week02/](https://raven2950.github.io/Sharedminds_Raven_26fall/week02/)

我想做一个东西，能展示人脑中即时冒出的念头和机器的统计式回应之间的差别。交互很简单：人输入一个词，写下自然想到的三个联想，然后让 AI 对同一个词生成三个联想。

一开始，我把这些联想想象成白板上的便利贴，但这样太有条理了，太像一个效率工具。这个想法更关于直觉、记忆和距离，而我喜欢“人的心智是一条流”这个意象，所以把视觉方向改成了一片深色的水面。我也想让整体氛围像冥想，所以用了黑白配色。

我用 `fetch()` 把页面连到 DeepSeek 的 API。模型返回三个联想，放在我自己的联想旁边。我还得让返回结果更结构化，因为模型有时候会只返回一句合在一起的话，而不是三个分开的词。

这个结果并不是要证明 AI 会不会像人一样思考，它更像一面小镜子。有时候两边的联想会重叠，有时候又完全不相关。这种差别大概是最有意思的部分：人的回答和个人记忆连在一起，而 AI 的回答更像是从很多其他人那里收集来的规律。
