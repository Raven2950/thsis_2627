---
kind: 博客
title: "Exploration 6: Premise (First Draft)"
date: 2026-11-07
tags: [thesis, exploration, premise]
created: 2026-11-07
---

I've gone back to the most basic question: **what game am I actually making?** If I sum up the setting in one sentence, what is it? What will players feel when they finish?

This post is my first draft of an answer.

## The question: what kind of game is my game, first of all?

![[p60-我到底要做一个什么游戏.jpg|360]]

Take 银松镇 (Yinsong Town) as an example: first of all, it's a **detective mystery game**. Its world may say much more underneath, but not everyone will pick up on what's underneath. Everyone can pick up on the surface.

So besides expressing my own confusion, my game needs something more concrete, more solid, more direct. My confusion about the meaning of life is vague in itself, but I don't want my game to be hollow, stream-of-consciousness, a castle in the air.

**I don't want to make "illogical murmuring."**

## Why does it feel like "illogical murmuring" right now?

Because right now there is only an underneath, and no surface.

Disco Elysium is also a detective game first: there's a body, and a case to crack in a few days.

- **The surface events have answers.** The murder does get solved in the end. It's logical, and at every step the player knows what they're doing.
- **The questions underneath have no answers.** Who am I, why did I lose my memory, is there any hope left for this world: these stay open.

So:

- **"Vagueness" can be the protagonist's state, but not the game's structure.** The vague feeling should come from the protagonist's understanding of what's happening, not from the player not knowing what to do.
- The protagonist wants a clear answer. So **give the protagonist something concrete, with an answer, to chase**, while he never gets the answer he actually wants.

> <span style="color: #d93a3a">This is a [genre] game: [what kind of person] must [do something specific], but [obstacle].</span>

## An idea: a person who forgets everything when he wakes up the next day

![[p61-便利贴-失忆的人.jpg|290]]

**The sticky note, as written**

- A person who wakes up the next day having forgotten everything about himself.
- What the player does: help the protagonist record his memories → go to more places to interpret his memories.
- For example: the more the player helps the next-day protagonist remember, the longer his forgetting interval becomes (from one day to two or three days, say) → the player can explore more places.
- Memory span: designer > player > protagonist.
- In the end, find the source of the protagonist's amnesia.
- Choice: return to memory and embrace the pain / keep forgetting / something else.

The idea comes from *Before I Go to Sleep*: the heroine wakes every day with no memory of her past and pieces herself back together, day by day, through a diary she writes in secret. What I roughly remember: the diary is hidden in the wardrobe, a doctor calls each morning to tell her where it is, and the first page says "Don't trust Ben." I may have the details wrong.
The other is *The Equation of Love and Death* (*Li Mi's Conjecture*). Li Mi keeps searching for someone who is absent; all she has are fragments, so all she can do is guess. That's the feeling I want: someone who can only approach the answer through fragments and guesses.

- **Finally there's a surface.** It's clear what the player does each day and what counts as progress: remember a bit more, go a bit further.
- **"Vagueness" becomes a mechanic, not the structure.** Fog rolls in for the protagonist every day, but the rules of the game are clear.
- **"Memory space" has potential.** The player knows more than the protagonist, and that creates tension: you watch him make the same mistakes every day, knowing what he doesn't. Only a game can do this.
- **The scope is right.** Each day starts over, so the same set of places can be reused, with new ones unlocked gradually.
- **It fits my material without being my own experience.** In my memory lists I wrote "after college everything has been in a brain fog" and "now everything is like being nearsighted." Waking each day having forgotten yourself pushes that feeling to the extreme.


- **It's very close to existing work.** Disco Elysium has already done amnesia; "forgets everything each morning" is common in film (*Memento*, *50 First Dates*, *Before I Go to Sleep*). The closest game is *Outer Wilds*: a 22-minute loop where the characters keep nothing and knowledge lives only in the player's head. I need an angle none of them have.
- **The ending can easily fall into cliché.** "Trauma causes amnesia → choose to remember and embrace the pain" is very common. One possible direction: the protagonist chose his own amnesia; at some point he made himself forget, on purpose, for some reason. Then the final choice becomes "why did he do it back then, and does he still agree now?"

## The core design problem: the player remembers, the protagonist doesn't

My idea: **the player plays some kind of ghost-like presence that can't talk to the protagonist and can only leave evidence or written traces**, and for some reason can't simply write everything down.

But here's the problem: for the protagonist to explore and find more memories, it seems the player has to control him. **How can the player not forget, remember everything the protagonist went through the day before, and control him, while the protagonist still stays amnesiac?**

I think "the player finding ways to make the protagonist remember more" is an interesting way to play in itself, so this problem has to be solved.

### Approach: separate "who controls the body" from "who knows things"

**Option 1: two phases, day and night**
- **Day: the player controls the protagonist.** But what he can do is limited by what he knows today.
  - The player knows the safe's code, but if the protagonist hasn't read the paper with the code on it today, he can't enter it.
  - Some dialogue options are greyed out, and an inner voice says "you don't know this."
  - The player watches him walk into a place the player has known since yesterday is a trap, and can't stop him.
- **Night: the protagonist is asleep and the player becomes the ghost.** It can't speak, only leave traces for him to find the next morning.

The loop is: **discover by day → leave traces at night → he reads them the next day → he can do more → he gets further.**

**Option 2: the player doesn't control the protagonist directly, only influences him**

The protagonist acts on his own; the player can only guide him by moving objects and leaving clues. More ghost-like, but the player has less control and gets impatient easily. Maybe only for certain passages.

### Why can't the ghost just write everything down?

These limits are the gameplay itself; I could pick one or two:
1. **What can be left each night is limited.** For example, only twenty characters, or only three objects moved. The player has to decide what to make him remember tonight; choosing is control.
2. **Only things already in the world can be used.** The ghost has no pen. It can only circle words in a newspaper, open a book to a certain page, move a photo somewhere else. The clues are fragments, and the protagonist has to guess, just like Li Mi's conjecture.
3. **The protagonist's morning is short.** Leave too much and he can't read it all, or reads it and can't remember it.
4. **The protagonist has to believe the traces.** He'll wonder who left them. If the traces contradict what he sees, he stops believing them.

### How does "making him remember more" become a mechanic?

One possibility: **only memories that connect can be kept.** An isolated fact is gone by the next day; but if a few clues confirm each other and form a story that makes sense, that memory lasts longer.

So what the player works toward is **helping him piece the fragments into a self that makes sense**. A question stays underneath: is the "self" he pieces together real, or just a conjecture that makes sense?

### Who is the ghost?

Undecided for now, but it may be the answer to the ending's mystery. A few possibilities:

- someone who is already gone, like Fang Wen, whom Li Mi is searching for;
- the protagonist's past self;
- the part of the protagonist that will never forget.

## Thinking further: how the ghost expresses itself, and who it is

![[p61-鬼的表达.jpg|360]]

**The notes, as written**

- How to design the hints?
  - circling words
  - → cut-out words pasted together
  - writing directly
- How to limit the ghost's expression?
  - maybe: it can only use tools left out, because a ghost isn't strong enough.
  - so: how it can record things on a given night depends on what the protagonist left out during the day.
  - → the newspaper changes; the pen may be put away, so it can't always write directly.
- Who is "I," and who is "the ghost"?
  - → Cyberpunk 2077, the swap between Johnny Silverhand and V.
  - In certain places the ghost can fully control the protagonist during the day, and isn't limited by memory there.


- **Circling words**: the most limited. Only words that already exist can be used, and what you want to say may not be there.
- **Cut-out collage**: words can be combined, but it needs scissors and enough material, like a ransom note.
- **Writing directly**: the most freedom, but it needs a pen.
These can differ from night to night (depending on which tools are around that night), or unlock as the game goes on. The player feels very directly "how much can I say tonight."

"Tools depend on what was left out during the day" is the rule that locks day and night together:
- While controlling the protagonist by day, you already have to prepare for the night: spread the newspaper open, leave the pen on the desk, open a book to a certain page.
- Every action during the day means two things: the protagonist is doing something, and I'm leaving tools for myself tonight.
- **The newspaper changes every day**, so the words available each night are different. If tonight's paper doesn't contain the word "don't," you can't say "don't trust." The world itself limits what I can say, and the newspaper's content can push the world and story forward along the way.

What I need to think through: if the player controls the protagonist by day, won't the player just leave the pen on the desk every day? Something has to break that, for example:
- the protagonist has his own habits and tidies up automatically at night; the player can only go against his habits at certain moments;
- someone else (the person looking after him, or the presence that "erases traces") takes things away every night;
- the protagonist distrusts things that appear in odd places and puts them away.
**Who takes the pen away, and why**, could become a storyline.

### The Silverhand–V swap: the ghost might share a body with the protagonist

If the ghost can fully control the protagonist in certain places, then it's not just "a presence outside," but more like **another consciousness sharing a body with the protagonist**.
- **It connects to the "split self."** The protagonist and the ghost might be two parts of the same person: one forgets, one doesn't.
- **It's a release valve.** Normally I'm always held back by "I know but he doesn't," and in these places I can finally use my own knowledge directly. But because it feels so good, it needs a cost, for example:
  - the protagonist wakes up somewhere unfamiliar, is frightened, and trusts the traces less;
  - being taken over damages the protagonist's body and mind;
  - each takeover makes the protagonist more dependent on the ghost, or more resistant to it.
- **Why are "certain places" special?** Ideally they're tied to the source of the amnesia, for example places connected to what happened in the past, so the ghost is stronger there.
- **The ending gets sharper.** Not just "should he remember," but "who is left in the end." This is very close to Cyberpunk's ending, so I need to be careful: my version should land on "memory," not on "who owns the body."

### After this round
**What's clearer now:**
- The ghost's expression is limited by tools: circling words, cutting out words, writing;
- the tools depend on what the protagonist left out during the day.
- Playing as a ghost trying every way to leave traces and get the protagonist to trust you should be a way of playing with room to develop

**New questions:**
1. Who takes the protagonist's things away every night, and why?
2. Where are the "certain places" where the ghost can take over completely, and why there?
3. What is the cost of taking over?
4. Is the ghost another part of the protagonist himself?

## The setting in one sentence (draft)

> This is an exploration game built around leaving traces: a person who forgets himself every time he wakes up gets a little further each day, guided by the limited clues left each night by a presence that cannot speak to him, to find out why he forgets.

**What the player feels (draft):**

> At first you just want to help him remember more; then you realise that what you make him remember shapes who he becomes; in the end you have to decide whether he should remember everything.

## Still undecided

1. Is splitting day and night the way I want to go?
2. Which is the main limit on the ghost's traces: number of words, objects, or credibility?
3. Who is the ghost?
4. What exactly is the "thing with an answer" the protagonist is chasing?
5. What is the source of the amnesia, and how many choices does the ending give?
