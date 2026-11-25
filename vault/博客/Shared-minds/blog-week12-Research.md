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

**Whose Voice?** is a short word-piecing detective game that runs in the browser, about 10 minutes long. It is a playable test of the core mechanic of my thesis game, *What She Left Out*.

In my thesis, the player recovers what the main character has forgotten by circling and cutting words out of newspapers, ads, family messages and her own old drafts, and piecing them into sentences. I designed two ways of doing this:

- **Cutting out:** the words stay in the original text. You can't move them or change their order; you can only choose which ones to keep. What you circle *confirms a fact*: the sentence was hidden in the text all along.
- **Free collage:** you cut words out with scissors and arrange them however you like, mixed with words from other places. What you assemble *chooses a meaning*: the sentence didn't exist before you made it.

My rule for the game is: *facts are confirmed by what you assemble; meaning is chosen by what you assemble.* There is no judge for the second kind. But I don't yet know whether this is fun, whether players can find the right words without being told, or whether a sentence with no right answer feels free or just empty.

The story content of my thesis is still being written, and I can't write it well in two weeks. So for the final I'm keeping the **form** and borrowing the **content**. The text comes from a story most people already know: Edgar Allan Poe's *The Murders in the Rue Morgue* (1841), often called the first detective story. It is in the public domain, so every word of it can be circled and cut.

This story fits the mechanic almost too well. Most of the case reaches the reader as a newspaper report: a long list of witness statements printed in the *Gazette des Tribunaux*. Every witness heard a shrill voice during the murder, and every one of them says it was speaking a foreign language, a *different* one each time. A Frenchman thinks it was Spanish, an Englishman thinks German, a Spaniard thinks English, an Italian thinks Russian. And none of them speak the language they name. The answer is not stated anywhere; it only appears when you put the guesses side by side.

That is exactly a cutting-out puzzle. And quietly, it is the same question as my thesis: *whose voice is this, when nobody can recognise it?*

### What it looks like

One case, three rooms of paper:

1. **The testimonies (cutting out).** A newspaper page with the witness statements. The player circles each witness's guess about the voice. When all of them are on the table, a fact locks in: *the voice was not human.*
2. **The scene (cutting out).** The police report on the locked room: the nailed window, the broken nail, the lightning rod. The player circles words to fill a few blanks in a sentence, like *The Case of the Golden Idol*. There is one right answer, and it locks in a second fact: *it came in and out through the window.*
3. **Tomorrow's headline (free collage).** The player cuts words from everything they've read and pastes together a headline for tomorrow's paper. There is **no right answer** here. Instead, the game measures which *voice* the headline sounds like, using sentence embeddings (the same model I used for Borrowed Sentences last week), and three voices answer back:
   - **Dupin**, the cold reasoner
   - **The Prefect**, whose police have already arrested the wrong man
   - **The Gazette**, which only wants a sensational story

   The only rule is that a headline can't contradict a fact the player has already locked in.

The three voices are a test version of the inner voices in my thesis (Mom, the fallen prodigy, the interrogator). If this works, I can swap the text and the voices and the same system becomes my game.

The look is paper: newsprint, red pen circles, scissors and glue. No dashboards, no scores, no progress bars.

### Who is it for?

- **Players** who like reading-heavy deduction and narrative games: *The Case of the Golden Idol*, *Return of the Obra Dinn*, *Her Story*, *Disco Elysium*. Using a famous story means they don't need any background to start.
- **Me, as a designer.** This is a test bench for my thesis. Every question I ask playtesters here is a question I would otherwise have to answer later in Unity, with much more at stake.

### Why do I want to do it?

Last week I wrote that the level I want to own is where *a feeling becomes a rule*, and that I want to *stay close to what I'm making*. My thesis has a mechanic on paper and a lot of open questions: how does a cutting-out level work, how does the player know which words to take, what happens if they pick wrong, how can a free collage affect the ending without a judge? I tried one paper prototype before and the feedback was that it was too complicated. I don't want to spend the spring planning in my head. I'd rather build the smallest playable thing now and watch people play it.

Separating form from content also helps me. When I test with my own story, I can't tell whether people are reacting to the mechanic or to the writing. With a story they already know, the mechanic is the only variable.

### How will I do it?

**Tech:** HTML + JavaScript, running in the browser. For the collage step, I need to embed the player's sentence *as they make it*, because every headline is new. Last week's Colab notebook precomputed everything, which won't work here. So the plan is to run the same multilingual MiniLM model directly in the browser with **transformers.js**, with no server and no Colab.

| Date | Benchmark |
|---|---|
| 11/25 · Proof of concept | The embedding model runs in the browser. I can drag word slips into a sentence and see which of the three voices it is closest to. No art. |
| 11/26 – 12/01 · Prototype v1 | All three steps playable end to end with the real Rue Morgue text. The voices' responses are written. A first pass on the paper look. |
| 12/02 · User testing | 4–5 players. Questions: (1) In the cutting-out steps, can they *see* the answer without being told which words matter? (2) With no right answer in the collage, does it feel free or disappointing? (3) Do the voices' responses make them want to try another headline? |
| 12/03 – 12/08 · Prototype v2 | Fix what the playtest shows. Add sound and small touches (ink fading, scissors). |
| 12/09 · Final | Present the slice, the playtest findings, and what they change in my thesis. |

### Prior Art

- ***The Case of the Golden Idol*** (Color Gray Games, 2022). You solve each scene by dragging words you've found into blanks in a sentence. The closest thing to my cutting-out mode, except it always has a judge, and my collage mode doesn't.
- ***Return of the Obra Dinn*** (Lucas Pope, 2018). Deduction that you confirm a few answers at a time, so the player trusts their own reasoning.
- ***Her Story*** (Sam Barlow, 2015). The story only exists in the fragments you search up; the player assembles it themselves.
- ***Disco Elysium*** (ZA/UM, 2019). Inner voices that argue with you. The model for the three voices.
- **Semantris** (Google, 2018) and **Semantle** (2022). Word games built on semantic similarity. They show the distance as a score or rank; I want the distance to come back as a *voice*.
- **William S. Burroughs' cut-up technique** and **Austin Kleon's *Newspaper Blackout***. Making your own words out of someone else's.

### The very first step

I wrote down the slice above, picked the text, and started the technical research below: getting the model to run in the browser, since everything else depends on it.

## Making

> **Ask**
>
> 1. Create a Google Notebook (formerly NotebookLM) and populate it with items that relate to your final project. You can use the "Export" button in the "Content" section of your "My Dashboard" to download all your writing responses from this class. Put the address of the chatbot or audio overview it creates in the NotebookLM field in the My Dashboard.
> 2. On the technical side, try going further with one of your projects, or research some of your technical gaps in your final proposal.

## My Making

### NotebookLM

*(Link to be added.)*

What I'm putting in:

- All my writing for this class (exported from My Dashboard)
- My thesis posts: *Starting Over*, the explorations, and my notes on *Disco Elysium*
- The full text of *The Murders in the Rue Morgue*
- My notes on *The Case of the Golden Idol*
- Last week's Borrowed Sentences notebook and sentence pool

The question I want to ask it: *if Dupin, the Prefect and the Gazette all read the same headline, what would each of them say?* The answers can become first drafts for the voices.

### Technical gap: embeddings in the browser

Borrowed Sentences ran in Colab, and the sentence pool was fixed, so every vector could be computed ahead of time. In the game, the player's headline doesn't exist until they make it, so it has to be embedded on the spot, in the browser, without a server.

What I'm testing with transformers.js:

1. **Can it run the same model?** I need a browser (ONNX) version of paraphrase-multilingual-MiniLM-L12-v2, so the results match last week's notebook.
2. **How long does the first load take?** The model has to download before the first sentence can be embedded. If it's slow, the loading time could happen during the first cutting-out step, where no embedding is needed yet.
3. **How fast is one sentence?** The voices should answer as soon as the player pastes the headline down.
4. **Do the three voices separate?** I'll write a few reference sentences for each voice and check whether test headlines land clearly closer to one of them, or whether everything ends up in the middle, like last week's empty middle.

*(Results to be added.)*
