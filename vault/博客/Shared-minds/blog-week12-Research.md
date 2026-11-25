# Week 12 · Research

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

### What is it?

**Whose Voice?** is a short browser game, about 10 minutes long, built on one unsolved case. You collect words from what people said, piece them into your own version of the truth, and the game never tells you whether you are right. Instead, it reads *how* you put the truth together, gives you a personality type, and shows you where your truth sits among everyone else's.

It is also a playable test of the core mechanic of my thesis game, *What She Left Out*, where the main character recovers what she has forgotten by circling and cutting words out of newspapers, family messages and her own old drafts, and can't tell which words were ever hers.

**The case.** The text is Ryūnosuke Akutagawa's *In a Grove* (藪の中, 1922), the story that Kurosawa's *Rashomon* is based on. A samurai is found dead in a bamboo grove. Seven people give statements. Three of them, the bandit, the wife, and the dead man speaking through a medium, each say a different person killed him, and the story never says who is right. The original Japanese is in the public domain, so I translate the lines I use myself.

**How it plays.**

1. **One goal.** The magistrate wants one sentence from you: who killed him, with what, and why. Nobody will tell you if you're right.
2. **Words are doors.** The game opens on a full-screen picture of the bamboo grove, with bamboo leaves falling. Four glowing words sit inside the picture: *the body* on the ground, *the bandit* among the stalks, *the wife* to the side, *the dead man* up in the mist. Click one and the word swells and blurs, the grove fades, and that person's picture slowly comes in. This idea comes from a classmate's project, *Words Hold Worlds*, where a word from a novel opens into its own world.
3. **One line at a time.** Each scene is a picture with subtitles. Only one short line is on screen at once, and you tap to hear the next. Each person says three lines.
4. **Collect words.** Gold words in the subtitles can be picked up. They fly down into your pocket as paper slips: *rope*, *comb*, *dagger*, *shame*, *contempt*, *jealousy*, *someone*. When you pick up “I”, the slip carries the speaker's name, so you always keep track of whose words you are holding.
5. **Piece together the truth.** Back in the grove, you open the magistrate's sentence (*The samurai died by the hand of ___, with the ___, because of ___.*) and fill it with your slips, in any combination you want. Then you hand it in. The magistrate takes it and says nothing. There is no right answer and no score.
6. **A type, not a verdict.** The game reads how you built your sentence and gives you a type similar to an MBTI type, with a portrait of someone in the story (*The Medium*, *The Magistrate*, *Tajōmaru*, *The Woodcutter*). It also shows a bar of whose voices your truth is made of: for example, 67% the wife, 33% the dead man.
7. **A shared map.** Your sentence is turned into an embedding and placed on a map with everyone else's. You can read the truth of the stranger closest to you, and of the one farthest away.

**How the four letters are read from play:**

| | Read from |
|---|---|
| **E / I** | Whose words you trust: statements said out loud to the magistrate (the bandit, the woodcutter), or private ones (the wife's confession at a temple, the dead man through a medium) |
| **S / N** | Whether your sentence is built from things (*rope*, *dagger*, *chest*) or from feelings and unknowns (*shame*, *contempt*, *someone*) |
| **T / F** | Whether your “why” is a cause (*a fight*, *the sword*) or a feeling (*jealousy*, *contempt*) |
| **J / P** | Whether you handed in your sentence before opening every door, and whether you left the killer open (*someone*) |

It's a personality quiz for fun, the kind people screenshot and send to friends. But it is built on the question my thesis keeps asking: when you put a truth together out of other people's words, whose truth is it?

### What changed, and why

My first plan used Edgar Allan Poe's *The Murders in the Rue Morgue*. I built two prototypes of its first puzzle, and I was the first playtester:

- **Version 1** was a newspaper page with six witness statements and a case sheet to fill in. It felt like a reading comprehension test.
- **Version 2** let the player hear the strange voice first, climb the stairs one witness at a time, and watch circled words turn into arrows on a map. It was more fun, but I still had to read a lot. Every click told me right or wrong, so there was no feeling of reasoning. I never knew *why* I was circling, so I didn't feel like a detective. And it wasn't what I meant by my own mechanic: I never pieced anything together.

What I learned:

- **Words should come to you.** No more than one or two sentences on screen at once.
- **Judge the whole sentence, not each click.** Checking every pick gives the answer away.
- **Give the player a reason** before giving them a task.
- **The case has to stay open.** *Rue Morgue* has one famous answer (it was an orangutan), so everyone's truth would end up in the same place, and there would be nothing to read about the player. *In a Grove* has no answer, which is exactly what the “no judge” half of my mechanic needs.

Then I switched to *In a Grove*:

- **Version 3** had the new structure (doors, slips, the sentence, the type) but was still all text on a dark page. It was the right game, but it looked like a document, and I didn't want to look at it.
- **Version 4** is the current slice. Every scene is a picture, made with FLUX schnell through the ITP Replicate proxy we used in class, all in one woodblock-print style. The words sit inside the grove picture, subtitles come one line at a time, and picked-up words fly into the pocket. It's still very simple, but it is the first version that feels like the thing I mean.

### Who is it for?

- **Players** who like short narrative and mystery games (*The Case of the Golden Idol*, *Her Story*) and people who love personality quizzes. A ten-minute game with a shareable type at the end is something people will send to friends.
- **My classmates**, who will be the first players on the shared map.
- **Me, as a designer.** Every question I ask here is one my thesis would otherwise have to answer later in Unity, with much more at stake.

### Why do I want to do it?

In week 11 I wrote that the level I want to own is where *a feeling becomes a rule*, and that I want to *stay close to what I'm making*. My thesis has a mechanic on paper and many open questions. This project lets me test them now, with a story people already find gripping, and without waiting for my own story to be written.

It also brings my thesis closer to what this class is about. In week 5 I wrote that I don't want one story to win, and I don't want to average all the stories, because some experiences disappear in the middle. I'd rather have many stories with visible connections between them. The shared map is that: the same words and the same evidence, and many different truths, side by side. It is shared minds in the most literal way: every truth on the map is made of the same seven people's words.

And I just like personality quizzes.

### How will I do it?

**Tech:** HTML and JavaScript in the browser. The pictures are generated ahead of time with **FLUX schnell through the ITP Replicate proxy**, in one shared style, so every player sees the same world. **transformers.js** runs the multilingual MiniLM embedding model in the browser, so every new sentence can be placed on the map the moment it's made. **Firebase** stores everyone's sentences and types for the shared map. The personality reading uses simple rules on the slips you use. The embedding handles the map and finds your nearest stranger.

| Date | Benchmark |
|---|---|
| 11/25 · Proof of concept | A playable slice: four doors, collecting slips, building the sentence, the type card, and a map with sample answers. No backend yet. |
| 11/26 – 12/01 · Prototype v1 | Embeddings running in the browser. Firebase stores real answers. The door transitions, and the type descriptions written for all four temperaments. |
| 12/02 · User testing | 5–6 classmates play, all on the same shared map. Questions: (1) Do they understand why they are collecting words? (2) Does having no right answer feel freeing, or like a letdown? (3) Does their type feel “accurate” enough to share? (4) Do they read the strangers' truths on the map? |
| 12/03 – 12/08 · Prototype v2 | Fix what testing shows. Sound for each scene, polish the slips and the map. |
| 12/09 · Final | Present the game, the map of the class's truths, and what this means for my thesis. |

### Prior Art

- **Akutagawa's *In a Grove*** (1922) and **Kurosawa's *Rashomon*** (1950). The source text, and the reason “the Rashomon effect” is a phrase.
- ***Words Hold Worlds*** by a classmate in this class. Words in a passage open into their own scenes. This is where my “words are doors” came from.
- ***The Case of the Golden Idol*** (Color Gray Games, 2022). You collect words from a scene and drag them into sentences. The closest thing to my mechanic, except it always has a judge, and mine doesn't.
- ***Her Story*** (Sam Barlow, 2015). The story only exists in the fragments you find. The player assembles it.
- **Personality quizzes** like 16Personalities and BuzzFeed quizzes. The pleasure of being told who you are, and sharing it.
- **The Rorschach test.** An ambiguous picture, where what you see says something about you. *In a Grove* works the same way.
- **Semantris** (Google, 2018). A word game built on semantic similarity.
- **William S. Burroughs' cut-up technique** and **Austin Kleon's *Newspaper Blackout***. Making your own words out of someone else's.

### The very first step

I built and tested two prototypes with *Rue Morgue*, wrote down why they didn't work, switched to *In a Grove*, and built a first playable slice: four doors in a picture of the grove, one subtitle at a time, slips that fly into your pocket, the magistrate's sentence, a type card with a portrait, and a map with sample answers.

**Play it:** https://raven2950.github.io/Sharedminds_Raven_26fall/final/
**Code:** https://github.com/Raven2950/Sharedminds_Raven_26fall/tree/main/final

## Making

> **Ask**
>
> 1. Create a Google Notebook (formerly NotebookLM) and populate it with items that relate to your final project. You can use the "Export" button in the "Content" section of your "My Dashboard" to download all your writing responses from this class. Put the address of the chatbot or audio overview it creates in the NotebookLM field in the My Dashboard.
> 2. On the technical side, try going further with one of your projects, or research some of your technical gaps in your final proposal.

## My Making

### NotebookLM

https://notebook.google.com/notebook/3f9522d1-7bd8-4006-aaa4-ea4ab5c7238e

What I'm putting in:

- All my blog posts for this class (weeks 1–7 and 9–12), one file per week
- My thesis posts: *Starting Over*, *Exploration 7: Gameplay*, and my notes on *Disco Elysium*
- *In a Grove* (the original text)
- *In a Grove* (an English translation)

### Technical gaps

1. **Embeddings in the browser.** The player's sentence doesn't exist until they make it, so it has to be embedded on the spot. I'm testing whether transformers.js can run the same multilingual MiniLM model I used in Borrowed Sentences, how long the first load takes, and how fast one sentence is.
2. **A shared map.** Firebase for storing everyone's sentences, and a way to place hundreds of sentences in 2D (UMAP, or simply projecting onto the four type axes).
3. **Reading a type from a sentence.** Which slips count as “things” or “feelings”, “out loud” or “private”, and whether the results feel believable to players. This one will be tested with people, not code.
