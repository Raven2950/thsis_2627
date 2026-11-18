---
kind: 博客
title: "Exploration 7: How Does the Player Actually Play?"
date: 2026-11-15
tags: [thesis, exploration, gameplay]
created: 2026-11-15
---
The last post, [[blog-Exploration6-Premise|Exploration 6]], laid out a first premise: a person who forgets herself every time she wakes up, and a "ghost" that can only leave traces. But after writing it, the setup felt a bit convoluted, and I wasn't really sure myself how the player was supposed to play.
This post records how I've been weighing and revising the gameplay over the past few days.

## Version 1: the player is the ghost (dropped)

The first idea was: **the player plays the ghost**.

- During the day the protagonist mostly acts on her own; the player can only control her for a while during her free time.
- At night the player becomes the ghost and uses whatever is left on the desk (the newspaper, a book, a pen) to leave her traces.
- She forgets again every night; only memories that connect to each other are kept.

To test it, we wrote a paper prototype with six rules: five phases in a day, action points, trace points, tidying up before bed, recognising things and giving them colour, keeping linked memories for a number of days...

Running through it showed two problems:

1. **It's too complicated.**
2. **During the day you can only watch, and that doesn't feel good.** I thought of Cyberpunk 2077: the player plays V, not Johnny Silverhand. Silverhand is another person living in V's head; he talks, argues, and sometimes takes over the body, but the player is always V.

So the "player is the ghost" setup had to change.

## Version 2: the player is her

![[笔记-失忆与圈字.jpg|420]]

**The notes, as written**
- Circling words points to "ferry" → unlocks a new place to explore ✓
- [Amnesia] → circling words is for digging up what was forgotten
- The player entering and controlling the protagonist ≈ an amnesiac state
  - At this point, everything the player knows is in-game information
- So the "ghost" character could be what gives the newspaper / scattered words
  - The player pieces together a message to unlock forgotten memories
- But: how do we reset?

**When the player first enters the game they know nothing, and that is amnesia in itself.** There's no need for an extra mechanic to "make the player forget too": what the player knows is what she knows.

So the roles become:

- **The player**: controls the protagonist the whole time.
- **The ghost**: a character the player doesn't control. It gives her newspapers and scattered words that can be used to unlock new clues and the like.
- **Circling / assembling words**: the player uses these words to piece together messages and unlock forgotten things. For example, putting together "ferry" opens up a new place.

## How to "reset": not every day

If what the player knows = what she knows, then a daily reset causes a problem: she forgets, the player doesn't, and the player just has to do the same things over again. It becomes repetitive work.

So I decided:

- **Normally nothing resets; progress keeps accumulating.** "Each day" is just the rhythm. Every day brings new words, pointing to new things.
- **A reset is a story event that happens only two or three times in the whole game, something like a major branching point or a node that steers toward an ending.** For example, after a big fight with her family, she puts everything away herself and blacks out her notebook, and the next day everything is back to the way it was.
- Forgetting isn't a timer; it's how she copes with other people's expectations. And only in these few moments does "the player remembers, she doesn't" happen, on purpose.

## A worry: will this become an ordinary "finding yourself" game?

Once there's no daily reset, I started to worry: does this drift further and further from the feeling of *Before I Go to Sleep*? Does it become a find-yourself detective story with nothing new in it?

So I went back to analyse *Before I Go to Sleep* and found that what makes the novel/film gripping is really three layers:

1. **Resetting every day**: she starts from zero every morning;
2. **Finding herself only through writing**: the diary is her only link to the past;
3. **Not knowing whether to trust that writing**: the first page of the diary says "Don't trust Ben," but whoever wrote the diary might be wrong too.

The key is layer 3. Layer 1 is the hardest to turn into gameplay, so it can be reduced to story events; layers 2 and 3 stay.
This might be where the new idea lies: **she can only come to know herself through words other people give her. The newspaper, the ads, what her family says: none of it is her own language. It's like in East Asian families, where even to describe "who I am," people use the words others expect of them.**

And **the ghost isn't the only one giving her words.** Some words come from her past self, some from her family or the world around her, and **the two kinds are completely indistinguishable**. I actually think that's good: what the player does is no longer "find her true self," but pick, from these words of unknown origin, which ones to piece her together from.

## Visual references: circling, collage, blacking out

![[拼贴视觉参考.webp|560]]

I collected some visual references for assembling words, circling words, and collage (clearer images are on the [mood board](https://raven2950.github.io/thsis_2627/app/#/board/Board001)). Two of them could almost become gameplay directly:

- **"Is life meaningful? If so, write down the interval on which the function f(life) is monotonically increasing. Solution: [birth, death)"** (人生是有意义的吗？若是，请直接写出函数 f(人生) 的单调增区间。解：[生，死))
	- It asks about life using the words of a maths problem. Whatever words you have at hand, that's what the things you say will sound like.
- **The green one**: a few characters are cut out of an ordinary passage, and the removed characters together read "I will not forget what I love" (我不会忘记我的热爱). The answer was hidden in the text all along.

The blacked-out handwritten page also made me think of a third verb: **blacking out**. Circling makes something visible; blacking it out seals it away.

## Two uses for collage

I've decided collage should do two things:

- **Early on, it's mainly for puzzles.** For example, assembling "ferry" unlocks a new place; getting it right moves the investigation forward.
- **Later, some collages affect where the story goes and how it ends.** What you assemble decides who she becomes.

This shift is also her shift: **early on the player is looking for "the right words," like her recovering what was forgotten; later the player is choosing "which words to keep," like her starting to decide who she is.**

### Cutting out vs free collage

The two uses match two ways of assembling words. Take the same piece of text, say a text message from her family:

> 周六别去江边了，要下雨。渡轮停了，你那些本子我先帮你收起来。
> (Don't go to the riverside on Saturday, it's going to rain. The ferry's stopped. I'll put those notebooks of yours away for you.)

| | Cutting out | Free collage |
|---|---|---|
| How it works | The words stay in the original text; they can't move or change order. You only decide which ones to keep | Cut words out with scissors; arrange them however you like, and mix them with words from elsewhere |
| Example | Pick out `周六` (Saturday) `江边` (riverside) `渡轮` (ferry) `本子` (notebooks) | Combine `本子` `渡轮` with `在` (at) `等` (wait) from the newspaper: "notebooks / at / ferry / wait" |
| The sentence | Was hidden in the original all along; the player "sees" it | Didn't exist before; the player "writes" it |
| Use | **Early puzzles**: the designer hides the answer; there's only one correct reading | **Later choices**: no right answer; affects the story and ending |

**Scissors could be a tool she only gets partway through.** At first she can only find what already exists in other people's words; once she has scissors, she can take those words apart and make them into her own.

## Reference: The Case of the Golden Idol

I watched an introduction to *The Case of the Golden Idol*: each level is a frozen scene; the player collects words from the scene and fills them into the blanks of sentences to reconstruct what happened. It's a good reference for the early "cutting-out puzzles": how words are collected, how right and wrong are judged, how red herrings are added.

It also reminded me of something from classic (honkaku) detective fiction: **you can piece together a completely different story that is well-reasoned but doesn't match the truth.** Our different endings (HE, TE, BE) are also all "well-reasoned"; it's hard to say which is true and which is false.

The difference is that in Golden Idol there is only one truth; the stories that "fit together but are wrong" are traps, and the system marks you wrong. Our ending layer **has no judge**. So the two layers can combine into one rule:

> **Facts are confirmed by what you assemble; meaning is chosen by what you assemble.**

- Early cutting-out **confirms facts**. For example, "she didn't go to university that year": once confirmed, it's locked in.
- Later free collage **chooses meaning**. The same fact can be assembled into "she was forced," or "she chose security," or "she was afraid."
- The only constraint: **it can't contradict facts that are already locked in**. So every ending is well-reasoned.
"Which ending is true," like "who gave her those words," never has an answer.

## Decided so far

1. The player **controls the protagonist**; the ghost is a character.
2. The player knows nothing on entering the game, and that is the amnesiac state.
3. **No daily reset**; resets are a few story events, caused by her.
4. More than one source gives her words, and they are **completely indistinguishable**.
5. Collage has two uses: **cutting-out puzzles early on, free collage later affecting the story and ending**. Scissors are a tool she gets partway through.
6. Facts are confirmed by what you assemble; meaning is chosen by what you assemble.

## Not yet worked out

1. **The story**: who the protagonist is, what happened, and what the surface "event with an answer" is, are all undecided.
2. **How a cutting-out level actually works**: what text is given? How does the player know which words to pick out? What happens if they pick wrong?
3. **Who is the ghost?** Her past self, or another self she imagined?
4. **How does free collage affect the ending?** Does every collage add up, or only a few key moments?
