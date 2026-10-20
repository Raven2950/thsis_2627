---
kind: 材料
title:
creator:
year:
url:
type: My Reflection
why:
status: 读过
importance: 核心
roles: []
voice:
concepts: []
questions: []
parent:
summary:
from_ai: []
from_source: []
confirmed: []
created: {'[object Object]': null}
read: 2026-10-20
---

### Exploration 1 Reflection: Experiencing VoiceOver and Alt Text

#### Background

Following my advisor’s feedback, I have been focusing more closely on digital accessibility, alt text, and the possibility that alt text might communicate an experience rather than simply identify an image. I wanted to begin by experiencing existing assistive technology before creating my own descriptions. For this exploration, I used VoiceOver on a Mac with Safari to browse several webpages and compare what I could see visually with what VoiceOver actually announced.

My initial question was:

> When images on a webpage are translated into language through VoiceOver, what information becomes available, and what information is lost?

I also became interested in a more specific question: for abstract artworks or images that invite multiple interpretations, do conventional alt-text principles compress the openness, emotion, and sensory qualities of the image?

#### What I did

I used VoiceOver to browse the W3C Web Accessibility Initiative’s image accessibility tutorial(https://www.w3.org/WAI/tutorials/images/informative/), The Creative Independent’s interview with visual artist Rachel Eulena Williams(https://thecreativeindependent.com/people/visual-artist-rachel-eulena-williams-on-making-work-for-yourself-and-the-freedom-of-play/), and a Game Developer blog page(https://www.gamedeveloper.com/keyword/blogs). I used the VoiceOver Rotor to navigate through the images on each webpage. I listened to the descriptions while also looking at the corresponding visual content.

I documented the experience through screenshots and notes about how VoiceOver identified images, links, and the larger webpage structure. Some of the descriptions I encountered included:
- “Dog with a bell attached to its collar” followed by “image” on the W3C page;![[IMG_1914.jpg|285]]
- “Push the cap down and turn it counter-clockwise (from right to left)” for the bottle-cap image;
- ![[IMG_1916.jpg|282]]
- “We’re family-friendly” for a photograph of a family;
- ![[IMG_1917.jpg|280]]
- “The Doom Slayer stares at the camera,” “A character portrait next to a note and magnifying glass,” and “A graphic with the word ‘play’ in the center” on the Game Developer page;
- ![[IMG_1918.jpg|217]]![[IMG_1919.jpg|215]]![[IMG_1920.jpg|206]]
- artwork titles, artist identities, materials, dimensions, or article titles on The Creative Independent page, rather than complete descriptions of color, form, composition, or material experience.
- ![[IMG_1921.jpg|293]]![[IMG_1922.jpg|295]]

#### What I learned

#### 1. Alt text usually describes the role of an image, not the entire image itself

The W3C examples helped me understand that alt text is not necessarily meant to describe every visible detail. Instead, it is shaped by the purpose of the image in its context. For example, the text next to the dog image already explains why guide dogs wear bells, so the alt text only adds that the dog has a bell attached to its collar. The bottle-cap image communicates an action, so its alt text becomes an instruction. The family photograph is not described through the number of people, their clothes, or the grass around them. Instead, it is described through the impression the image is intended to create: “We’re family-friendly.”

This showed me that “accuracy” can have several meanings:

- visual accuracy: the description corresponds to what can be seen;
- contextual accuracy: the description explains why the image is present on the page;
- functional accuracy: the description explains what the image, button, or link does.

The W3C principles mainly aim to make sure users have access to the information necessary to understand the content. They do not require alt text to reproduce the entire visual experience.

#### 2. What VoiceOver reads depends on the choices made by the webpage author

Before this experiment, I assumed that VoiceOver would somehow “understand” the image. I now understand that VoiceOver mostly reads text that has already been provided in the webpage’s code. When an image has alt text, VoiceOver generally reads that text. When an image has an empty alt attribute, it may be skipped. When an image lacks useful alt text, VoiceOver may announce only that it is an image, read a filename or link label, or provide an incomplete description.

VoiceOver is therefore not a neutral image translator. It amplifies and delivers the choices already made by the webpage author: what deserves to be spoken, what can be left out, and from which perspective the user is encouraged to understand the image.

#### 3. Some alt text felt inaccurate or insufficient

On the Game Developer page, some descriptions were relatively easy to understand. “The Doom Slayer stares at the camera” provides a subject, an action, and a direction of attention. “A graphic with the word ‘play’ in the center” identifies the important text within the image. These descriptions are short, but they allow me to form a basic mental image.

The descriptions of artworks were different. A title, date, material, or dimension may identify an artwork without allowing me to imagine its visual structure. If the only description of an abstract artwork is its title or “acrylic on canvas and cotton rope,” I may know which artwork it is, but I may not know its color, shape, surface, weight, or spatial relationships.

This does not necessarily mean that the title and material information are wrong. For an art website, they may be the most important contextual information. The question is whether the user loses important aspects of the artwork when those are the only available descriptions.

I am beginning to distinguish between something being “wrong” and something being “limited.” Some alt text is not visually inaccurate; it simply offers only one possible entry point into the image.

### A central tension

I began to feel that common alt-text principles—clarity, brevity, objectivity, and communication of essential information—can become limiting when applied to abstract art or images that are meant to be felt and interpreted.

If I followed a conventional approach, I might describe an abstract artwork like this:

> An abstract artwork made with acrylic paint on canvas and cotton rope.

This sentence is clear, concise, and potentially accurate. However, it leaves out many things the image can communicate: the tension between colors, the tactile quality of the materials, the direction and weight created by the rope, and the uncertainty or emotion I experience while looking at the work.

If I use more poetic language, I might write:

> Color and rope pull against each other, as if a painting is trying to become a hanging object.

This may be closer to my experience of viewing the artwork, but it is also more subjective. It offers one interpretation and could cause the listener to mistake my reading for an objective description.

This creates a real tension between conventional alt text and the idea of “alt text as poetry”:

- the clearer the description becomes, the easier it may be to use, but the more it may narrow the space for imagination;
- the more poetic the language becomes, the more it may communicate atmosphere, but the less immediately clear it may be;
- the more objective the description becomes, the more it may follow accessibility conventions, but the less it may communicate the experience of looking;
- the more subjective the description becomes, the closer it may come to an artistic experience, but the more it may impose the describer’s interpretation.

I do not currently think this means that accessibility principles are wrong. Instead, I think they address one problem—the need to provide a basic point of access—without fully addressing another problem: how to communicate the openness, emotion, and sensory experience of an artwork.

### Did this exploration answer my question?

It answered part of my question. I now have a clearer understanding of how VoiceOver reads webpages, and I understand that alt text is usually not a complete replacement for an image. It is a contextual selection of information.

However, the experiment did not resolve the more difficult question: **if an image’s value lies in ambiguity, emotion, and openness, should all of that be compressed into a single alt-text sentence?**

At this point, I am more interested in thinking of alt text as an entry point rather than a complete replacement for an image. A possible design direction would be to provide layered descriptions:

1. a short basic description that identifies the image or its function;
2. a more detailed visual description of color, form, material, and spatial relationships;
3. an optional poetic or experiential description that communicates feeling, rhythm, and interpretation.

This layered approach might allow clarity and poetry to coexist instead of forcing one sentence to perform every function.

#### Questions for my advisor, resident, and peers

- What do you think the most important task of alt text is: identification, explanation, function, or experience?
- For an abstract artwork, would you rather hear a visual description, contextual information, or an experiential description first?
- Does poetic alt text create more space for imagination, or does it make the image harder to understand?
- If an artwork offered both a conventional description and a poetic description, would you want to choose which one to hear?

### Exploration 2：同一组抽象艺术作品的三种描述

#### Exploration Goal

I selected the interview page of visual artist Rachel Eulena Williams published on _The Creative Independent_. For several artworks on this page, I attempt to write three distinct types of descriptions:
1. **Standard / context-oriented alt text**: Following common accessibility writing principles, prioritizing artwork identity, materials, and basic visual information.
2. **Detailed visual description**: Adding comprehensive information about color, shape, composition, texture and spatial relationships.
3. **Poetic / experiential description**: Beyond listing “what is there”, capturing the rhythm, tactile sensation, emotion and imagination evoked while viewing the work.

BUT:

> What different mental images will three distinct descriptions of an abstract artwork evoke in listeners? Do standard alt‑text descriptions discard certain experiential qualities that the artwork itself conveys? Can poetic descriptions preserve these experiences while still remaining accessible?

#### Research Materials
 [The Creative Independent — Rachel Eulena Williams](https://thecreativeindependent.com/people/visual-artist-rachel-eulena-williams-on-making-work-for-yourself-and-the-freedom-of-play/)
Image captions and image links on web pages mostly display artwork titles, creation years, materials, dimensions, or article‑related information. They deliver identity and contextual background for artworks, yet do not always offer a complete visual description.
#### Test 1: Constant Phases

![[Pasted image 20261020170635.png|334]]
_Constant Phases_, 2018. Acrylic on canvas and cotton rope 67 x 54 in. Courtesy the Artist and Ceysson & Bénétière Gallery.

### Version A — Standard/contextual alt text

> *Constant Phases*, 2018, an abstract work made with acrylic on canvas and cotton rope, measuring 67 by 54 inches.

### Version B — Detailed visual description

> An abstract mixed-media artwork composed of several overlapping circular and oval canvas forms. The forms contain dark, pale, and mottled painted areas, while thin cotton ropes extend between them and hang downward. The separate pieces create an irregular vertical composition that moves between a flat painting and a suspended sculptural object.

### Version C — Poetic/experiential description

> The painting refuses to stay flat. Its rounded fragments hover like partial moons, connected by thin lines that keep pulling the composition apart and back together. The ropes make the image feel unfinished, suspended, and still becoming.

### Comparison

The standard version tells me what the artwork is, what materials it uses, and its dimensions, yet it barely allows me to imagine the work’s shape and spatial structure. The detailed version helps me build a relatively concrete mental visual image and captures the work’s status as something situated between painting and sculpture. The poetic version does not supply all verifiable details, but it conveys the perceptual experience of “hanging”, “unfinished”, and “constantly taking form”.

The poetic version also raises a concern: phrases such as “partial moons” and “still becoming” represent my interpretation, not objectively verifiable facts about the artwork itself. If listeners encounter only this version, they may mistake my subjective reading for the inherent meaning of the work.

#### Test 2: Space Flower

![[Pasted image 20261020170918.png|319]]
_Space Flower_, 2018. Acrylic on canvas and cotton rope, 33 x 30 in. Courtesy the Artist and Ceysson & Bénétière Gallery.
### Version A — Standard/contextual alt text

> *Space Flower*, 2018, an abstract artwork made with acrylic on canvas and cotton rope, measuring 33 by 30 inches.

### Version B — Detailed visual description

> An abstract mixed-media artwork in which painted canvas forms and cotton ropes create a loose, flower-like arrangement. Curved and irregular shapes overlap across the surface, and the ropes extend across and beyond the painted areas, adding lines, texture, and a sense of relief.

### Version C — Poetic/experiential description

> A flower that has escaped the flatness of the canvas. Color gathers, opens, and tangles with rope, making a form that seems to grow sideways into the space around it.

### Comparison

The standard version preserves the artwork’s identity and materials, yet the title “Space Flower” already carries an interpretive slant. The detailed version translates the term “flower” into shapes and structures, rather than assuming the work literally depicts a flower. The poetic version frames the work as a form growing out of a flat plane into space; however, this language also primes listeners to understand the piece as a narrative of “growth” or “escaping the plane”.

This example makes me realise that an artwork’s title can itself function as a form of alt text. While titles help users identify artworks, they may also pre‑determine how users visualise them.

#### Test 3: Sea of abbreviation
![[Pasted image 20261020171311.png|325]]
_Sea of abbreviation_, 2018. Acrylic on canvas and cotton rope, 40 x 60 in. Courtesy the Artist and Ceysson & Bénétière Gallery.
### Version A — Standard/contextual alt text

> *Sea of abbreviation*, 2018, an abstract work made with acrylic on canvas and cotton rope, measuring 40 by 60 inches.

### Version B — Detailed visual description

> A wide abstract composition made from painted canvas and cotton rope. The work combines irregular painted forms with lines and rope elements that cross, overlap, and extend across the surface. Its horizontal format and layered marks create a sense of movement between a painting and a constructed object.

### Version C — Poetic/experiential description

> A field of interrupted signals. Shapes begin to speak, break apart, and leave threads of sound behind them. The canvas feels less like a picture of a sea than a place where fragments keep drifting into one another.

### Comparison

The standard version primarily informs me of the artwork’s title, materials, and dimensions. The detailed version adds context about the horizontal composition and relationships between lines and materials, yet still strives to avoid interpreting the work’s meaning. Influenced by the artwork’s title and discussions of language, sound, and rhythm from the artist’s interviews, the poetic version reads “abbreviation” as an interrupted signal or fragmented language.

This version lays bare the subjectivity of the person writing the description. It may offer a richer point of entry for some listeners, yet it could also completely alter how they understand the artwork.

#### Test 4: Patterns of distance together
![[Pasted image 20261020171420.png|311]]
_Patterns of distance together_, 2019. Acrylic, dye, canvas and rope on wood panels, 58 x 52 in. Courtesy the Artist and Cooper Cole Gallery.
### Version A — Standard/contextual alt text

> *Patterns of distance together*, 2019, an abstract mixed-media artwork made with acrylic, dye, canvas, and rope on wood panels, measuring 58 by 52 inches.

### Version B — Detailed visual description

> An abstract composition assembled from painted and dyed canvas elements attached to wood panels. Painted areas, fabric surfaces, and rope lines create overlapping patterns and distances across the work. The material elements extend the image beyond a single flat surface.

### Version C — Poetic/experiential description

> Distance does not separate these forms completely. It becomes a pattern: something stretched, tied, and held between pieces. The work feels like a map of things trying to remain connected while still staying apart.

### Comparison

The standard version aligns most closely with catalogue information for artworks. The detailed version emphasises materials and spatial structure; however, since I did not have access to sufficient specific information on the page, it remains a relatively conservative description. Responding directly to the artwork’s title, the poetic version interprets “distance” as a form of relationship and tension.

This also exposes a risk: when visual information is scarce, poetic descriptions can easily slip from “description” into “interpretation”. Rather than informing users what the artwork is, they may instead tell users what I believe the work could mean.

#### General Comparison

| Type                | What it provides                                                          | What may be sacrificed                                                        |
| ------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Standard            | artwork identity, materials, year of creation, dimensions, basic function | colour, shape, spatial sense, emotion and viewing experience                  |
| Detailed Visual     | composition, materiality, shape, spatial relationships                    | brevity, yet it may fail to fully convey the feel of the artwork              |
| Poetic/Experientail | atmosphere, rhythm, tactile quality, open‑ended interpretation            | objectivity, and risks imposing the describer’s interpretation upon listeners |

#### What I Find

#### 1. Accuracy is not the only standard

From this test, I found that a piece of alt text can be accurate in one sense yet incomplete in another. For instance, artwork titles and material information may be accurate and useful in an art-website context, yet they may not help listeners visualise the work’s colours, shapes, textures, or spatial relationships.

For this reason, I now think about accuracy in three layers:

- **Factual accuracy**: There are no errors in the title, creation year, materials, dimensions, or observable visual elements.
- **Contextual accuracy**: The description matches how the image is being used on the webpage.
- **Experiential accuracy**: The description communicates something about the emotion, rhythm, tactile quality, or spatial experience of encountering the artwork.

Conventional alt text usually prioritises the first two forms of accuracy, while my interest is increasingly focused on the third.

#### 2. A detailed description is not automatically better, but it can provide greater access

A detailed description cannot completely replace the visual experience of an image. However, for people who cannot see the image and rely on alt text or image descriptions to access visual information, additional detail can provide a more substantial entry point into the work.

The important question is therefore not whether a description is long or short, but what kind of information it provides and how clearly it distinguishes observation from interpretation. A useful detailed description can communicate colours, shapes, materials, composition, and spatial relationships without claiming to explain the artwork’s one true meaning.

For abstract art, a short description may leave out so much visual information that the listener cannot form a meaningful understanding of the work. At the same time, a detailed description still involves selection: it directs attention toward certain forms, colours, or relationships while leaving out others. This does not mean that information should be reduced in order to preserve ambiguity. Instead, it suggests that a detailed visual description and a more open-ended or poetic interpretation might serve different purposes and could be offered as separate layers.

#### 3. Poetic description is not neutral

Poetic descriptions can communicate things that a conventional alt text may not, such as suspension, rhythm, tension, material weight, or a sense of something still coming into being. However, they inevitably include the describer’s interpretation.

For this reason, I do not want to treat poetic alt text as simply a “better” form of alt text. It may function as an additional experiential layer, but it should not present one subjective interpretation as the only objective translation of the image. A possible approach would be to provide a clear visual description first, followed by an explicitly labelled poetic or interpretive description. This could allow poetic language to expand access without replacing essential visual information.

#### 4. Perhaps Alt Text Should Not Exist in Only One Single Version

This test led me to consider a layered alt‑text system:

1. **Base Layer**: Briefly state what the image is, what the artwork is, or its function on the page;
2. **Visual Layer**: Describe colours, shapes, materiality, composition, and spatial relationships;
3. **Experiential Layer**: Offer poetic, emotional or open‑ended descriptions, and explicitly note that this is an interpretation rather than factual information;
4. **Contextual Layer**: Provide information about the artist, artwork history, title, and related text.

This structure may be more reasonable than demanding a single text passage to fulfil all tasks at once. It does not require abandoning essential accessibility information, nor does it force abstract art into a single, closed‑off interpretation.

## Limitations of This Test

These descriptions are primarily my observations of the artworks as a sighted user, and they do not represent the lived experiences of blind or low‑vision users. No formal user research was conducted, so I cannot judge which version would be most helpful for real screen‑reader users.

In addition, the artwork images on the web page were small, and some details could not be fully verified. For this reason, both the detailed and poetic versions should be regarded as experimental drafts, not authoritative accounts of the artworks.

## Next Steps

Moving forward, I would like to build a small layered page for one of the artworks, for instance, _Constant Phases_: ‑ The first layer contains standard alt text; ‑ The second layer is an expandable detailed visual description; ‑ The third layer is an optional poetic audio description that users can play.

I then plan to invite several peers to listen to only one version each. I will document the mental imagery they form and compare whether different descriptions produce distinct mental “artworks”.

I am particularly curious about the following question:

> When descriptions are clearly labelled “this is a factual description” or “this is a poetic interpretation”, do listeners feel they are given more choices and room for their own interpretation?



