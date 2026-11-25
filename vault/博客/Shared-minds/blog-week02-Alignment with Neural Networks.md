# Week 2 · Alignment

## Reading
> **Ask**
> - Develop some sources for intuition and understanding of ANN mathematical workings. Anyvideo on [3Blue1Brown l](https://www.youtube.com/@3blue1brown)ike this one about  [Neural Networks](https://www.youtube.com/watch?v=aircAruvnKk) or this [Medium Article](https://mark-riedl.medium.com/the-intuition-behind-how-large-language-models-work-166cf2fb278a)
> 
> Or as a follow up to last week a podcast about [Can AI's be Conscious](https://samharris.org/episode/SE248203E32)
> 
> Periodicals [Things I Thing Are Awesome](https://arnicas.substack.com/) -AI Art News, [TLDR](https://itpima.web.app/smf26/alignment-with-neural-networks/TLDR) AI Tech and Biz News, [One Useful Thing](https://www.oneusefulthing.org/) - AI and Education or on the more tech bro side [Dwarkesh Podcast](https://www.dwarkesh.com/) or [Lex Fridman Podcast](https://lexfridman.com/podcast/), [Bens Bites Substack](https://www.bensbites.com/) about

## Writing
> **Ask**
>  This week we are looking at this new way of encoding our thought and capturing the world using neural networks. Can you explain AI to your parents? What analogies can you make to stuff they already know about. How is so new alien intelligence that it defies leveraging any of existing intuitions?
>   Last week we tried to take a look at your internal thinking. and now we want to know how well neural networks, originally inspired by our neural anatomy, actually work (align) as media for capturing and depicting our internal life? What do they offer as a medium for representing the external world.
>    Usually the word alignment in the context of AI is about safety, preserving humanity against being destroyed by well meaning people accidently setting AIs in a bad direction (eg prioritizing [paper clips](https://en.wikipedia.org/wiki/Instrumental_convergence)), bad actors using AI as a weapon for disinformation, hacking or worse, AIs. Or will sufficiently intelligent AIs have their own priorities that could diverge from ours? What do you think of the transhumanist perspective that might say that we should not begrudge our silicon based evolutionary descendants a go, we have had our day..

This week's exploration of neural networks made me rethink AI not merely as a tool, but as a strange alien medium that imitates human-like thinking.

If I tried to explain neural networks to my parents, I would use an everyday analogy of skill-building. Much like how humans gradually get better at cooking, cycling, or speaking a language through repeated practice and correction, neural networks adjust internal connection strengths after processing massive examples to produce stable outputs.

The analogy works at first, but it hides an assumption I keep questioning. We usually say AI only matches statistical patterns while humans have "real" inner life. But are human thoughts, emotions, and personalities really innate? I don't think so. We are not born with a complete self. Our emotions, preferences, and ways of thinking are shaped through years of learning, exposure, and experience. And biologically, all of this inner life is nothing more than the combined work of cells, neurons, and chemical signals. If human subjectivity emerges from a physical system, then I don't see a principled reason why it could never be simulated in another system. The barrier might be difficulty and ethics, not impossibility.

Of course, today's models are still far from this. They lack embodied, lived experience — they don't grow up, don't feel pain or joy, don't accumulate a life. But this is a limitation of current implementations, not proof of a permanent boundary. And if human minds are fluid and unpredictable, why couldn't future AI simulate at least a subset of human ways of thinking? Even mimicking the thinking style of one type of person seems possible in principle.

Last week I observed how jumpy and unstructured my own internal thinking can be. Right now neural networks turn everything into calculable patterns. As a medium for representing the external world they are remarkably powerful. For capturing human inner life today, they can only reproduce our outward expressions rather than the subjective feeling behind them. But I'm not convinced this gap is eternal — it might just be where we are right now.

In mainstream AI conversations, "alignment" mostly talks about safety risks: literal goal misinterpretation like the paperclip maximizer, misuse as disinformation weaponry, or potential future divergence of AI priorities from human values. The transhumanist idea of stepping aside for silicon-based descendants feels less absurd to me once I take my own argument seriously: if consciousness is in principle simulable, then silicon-based minds are not a fantasy — they are a question of engineering and ethics. And if an AI could genuinely develop its own wants and inner life, alignment stops being just "make it follow instructions" and becomes something much harder: how do we treat another form of subjectivity?

Still, I have to separate speculation from reality. Today's neural networks remain statistical simulation media. But I'm choosing to hold the question open: is subjective experience a permanent boundary for artificial systems, or just a very hard problem we haven't solved yet? I suspect it's the latter.

## Making

> **Ask**
>- Please put your github link for this class in your profile for this site which you can reach using the "My Dashboard" link in the upper right.
>- Try to get a feel for what ML can do. For this week you might try just learn to use the fetch command with the APIs to [explore various models in a service like Replicate](https://replicate.com/explore). The baby might want to get a little organized and be able to organize its thoughts by painting different parts of the screen with different kinds of thoughts. Does speaking help you capture you train of thought better. Does AI come up with the same associations as you? Please commit your code to a github repository and paste the link in your dashboard on this site.

I started this week's making with a simple question: does AI come up with the same associations as a person?

> Here's the link:[https://raven2950.github.io/Sharedminds_Raven_26fall/week02/](https://raven2950.github.io/Sharedminds_Raven_26fall/week02/)

I wanted to make something that could show the difference between an immediate human thought and a statistical machine response. The interaction is simple: human enters one word, writes down three associations that come to him naturally, and then ask AI to generate three associations for the same word.

At first, I imagined the associations as little sticky notes on a board, but that started to feel too organized and too much like a productivity tool.The idea is more about intuition, memory, and distance, and I like the idea that human's mind is a kind of stream, so I changed the visual direction into a dark water surface. Also, I wanna make the vibe feels like meditation so I use this black&white color.

I used `fetch()` to connect the page to the DeepSeek API. the model returns three associations, which are then placed next to my own. I also had to make the response more structured because sometimes the model returned only one combined sentence instead of three separate words.

The result is not really trying to prove whether AI thinks like a human. it is more like a small mirror. sometimes the associations overlap, and sometimes they feel completely unrelated. that difference is probably the most interesting part. the human answer feels connected to personal memory, while the ai answer feels more like a pattern gathered from many other people.