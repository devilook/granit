# ГРАНЬ — creative direction

Working brand name: **ГРАНЬ** (facet / edge / the border between two states).
It shares a root with *гранит*, and it names the product's whole idea: one perfect
plane and, right under it, a broken mountain. Replace it if the client has a name.

> **v2 (current).** After client feedback the hero moved from the full-screen
> «Горизонт» reveal to a calmer object shot: a dark rounded stone card on a
> light paper page, a floating pill nav, annotations pinned to the 3D table by
> dotted leaders, and small-amplitude pointer motion (the light travels further
> than the stone). The slab became free-form (organic outline) with faceted
> split sides, as in the workshop photos, plus a second line, «Классика»
> (polished rectangle on X-trestles). The reasoning below is the v1 record;
> the motion principles and the «ровный верх / колотый низ» motif still apply.

---

## Step 1 — Three hero concepts, and the argument

### A. «Монолит» — the object in the void

- **Interaction:** the table floats in near-black space; the mouse orbits it
  (yaw ±35°, pitch ±25°) with heavy inertia.
- **How the table is shown:** a product-viewer orbit. Pitch down to see the underside.
  A key light follows the cursor.
- **Emotion:** reverence, museum plinth, "object of desire".
- **Risks:** this is exactly what every 3D configurator does. The orbit has no
  *meaning*: the user turns a thing, sees a thing. The void kills the context
  (garden, terrace), and at most angles the raw underside is just a dark blob.
  The user isn't guided to the brand's idea, so they won't find it.

### B. «Сад» — the layered diorama

- **Interaction:** 4–5 photographic planes (foreground gravel, table, olive tree,
  hedge, sky) shift in parallax against the cursor; CSS 3D + JS.
- **How the table is shown:** one hero photograph, cut into layers; a light-sweep
  overlay (blend-mode gradient) follows the cursor.
- **Emotion:** warm southern evening, lifestyle, "this could be my terrace".
- **Risks:** it lives or dies on photography that doesn't exist yet. With placeholders
  it looks like a template. Parallax layers are the most over-used trick of 2015–2020.
  And it **cannot show the underside**: a flat photo has one angle. The core brand
  idea is invisible. The light sweep is fake, a gradient over a JPEG, and it reads as fake.

### C. «Горизонт» — the line between polish and split

- **Interaction:** the camera sits almost at the height of the tabletop. The plane of the
  polished top becomes a **horizon line** across the screen. Mouse **Y** moves your eye
  *through that horizon*: up and you look down onto the mirror-calm polished top, with light
  sliding across it; down and you sink below the slab and look up into the raw,
  chiselled, torn underside. Mouse **X** walks you slowly along the length of the table,
  and a long bar of light sweeps across the stone with you.
- **How the table is shown:** a real 3D slab in a dim garden: a polished top, a thin
  polished edge band, then broken stone. A side gauge, «Полировка ↔ Скол», shows
  where your eye is.
- **Emotion:** the brand thesis becomes a physical gesture. «Сверху — тишина.
  Снизу — гора.» You *feel* the contrast instead of reading it.
- **Risks:** (1) The edge-on midpoint can collapse into a thin line, so the camera must
  never sit exactly on the plane. The pitch range is asymmetric and always shows one face.
  (2) Users may not discover the vertical axis, so there's a hint, an idle drift that
  dips below by itself, and the gauge. (3) It needs a convincing stone shader, or the
  whole thing looks like a grey box. (4) Mobile has no hover, so it needs auto-drift
  and an optional gyroscope.

### The argument

**Against A:** it's competent and forgettable. An orbit is a tool, not an idea.
Nothing in it is about *this* product. Swap the table for a sofa and the site still works,
and that's the definition of template energy. It also wastes the one thing we have that
competitors don't: the split underside. In A it's merely *reachable*, not *staged*.

**Against B:** it's the most "beautiful on day one" option, if a photographer had
shot layered plates. They didn't. It also fails the brief literally: the brief asks the user
to see the polished top **and** the raw underside, and a photo can't do that. Its light
sweep would be a lie.

**For C, honestly:** it's the riskiest to build. The stone must look like stone,
and the edge-on moment must be designed, not left to chance. But it's the only concept
where the *interaction is the brand*. The single most important line (flat top / broken
bottom) literally becomes the horizon of the screen, and the cursor crosses it. It also
solves the asset problem: the table is generated, so the site looks finished before
a single photo is taken. Each table in the collection gets its own seed, so **no two stones
are the same**, which is the brand promise, made true in code.

**Decision: C, «Горизонт»**, stealing the best of the others:
- from A, the weight: a slightly under-damped spring, slow and heavy, so you're *holding*
  800 kg, not dragging a cursor;
- from B, the depth: a darkened garden plate and an oversized wordmark in parallax
  behind the WebGL layer, so the scene sits in a place, not a void.

What was cut and why:
- **Foreground stone layer** (from B): without depth-of-field it reads as clutter in
  front of the hero. Real DOF in post-processing costs too much on mobile. Cut.
- **Post-processing (bloom, SSAO):** the polished top already reads through env
  reflections plus a rect-area light. Bloom pushes it toward "gamer". Cut.
- **Drag-to-orbit on mobile:** vertical drag fights page scroll. Replaced by
  auto-drift plus an opt-in gyroscope.

### Tech choice: WebGL, vanilla Three.js + GSAP + Lenis on Vite

WebGL is genuinely justified here: the reveal of the underside needs real geometry,
and the light sweep needs real specular. Both are impossible to fake well with layered
images.

Why **not Next.js + React Three Fiber** (the brief's preference), argued honestly:
this is one page with no routing, no CMS and no server data yet. R3F adds a React
reconciler and roughly 140 kB of runtime to drive a scene with one table in it. Vanilla
Three keeps the bundle and LCP smaller and the render loop under full control (pause offscreen,
DPR caps). The code is split into framework-free modules (`src/gl/*`, `src/ui/*`).
When we add functions (CRM, API routes for leads, a CMS for the collection),
moving it into Next.js is mechanical: `createHero(canvas)` becomes a `useEffect`.

---

## Step 2 — Design system

### The idea, everywhere: «ровный верх / колотый низ» (flat top / broken bottom)

Every major surface on the site has a **perfectly straight top edge and a torn bottom
edge**:
- collection cards, images and the footer wordmark are clipped with a generated broken
  polygon on the bottom only (`data-torn`, seeded, so every edge is unique, like the stone);
- section dividers are a hairline with a broken "split" line drawn under it, on scroll;
- type follows it too: headlines set calm and straight (roman); the second line
  breaks into *italic*, the "raw" voice;
- in the collection, hover takes you from the polished top to the underside.

### Colour tokens

| Token | Value | Use |
|---|---|---|
| `--c-bg` | `#0d0d0c` | graphite, near-black, warm |
| `--c-bg-2` | `#121211` | alternate section |
| `--c-surface` | `#191816` | cards, inputs |
| `--c-line` | `rgba(232,226,214,.12)` | hairlines |
| `--c-text` | `#e8e2d6` | bone white, never pure #fff |
| `--c-text-dim` | `#9a958b` | body secondary |
| `--c-text-faint` | `#5f5b54` | labels, meta |
| `--c-stone-grey` | `#7d7a74` | |
| `--c-stone-sand` | `#b7ab97` | |
| `--c-stone-green` | `#2f3a33` | Verde granite |
| `--c-metal` | `#2b2c2d` | matte steel |
| `--c-accent` | `#c2a27a` | warm sand / brass, the *only* accent |

No gradients as decoration. The only gradients are light falloff (vignettes),
the way a photographer would use them.

### Typography

- Display: **Cormorant Garamond** 300 / 300 italic (Cyrillic). It's high-contrast
  and editorial.
- Text and UI: **Manrope** 300–500 (Cyrillic). It's a calm, refined grotesque.
- Labels: Manrope 500, uppercase, letter-spacing .22em, 0.72rem.

| Step | Size (fluid) | Line-height |
|---|---|---|
| hero | `clamp(3.1rem, 8.4vw, 9.6rem)` | .92 |
| d1 | `clamp(2.5rem, 5.6vw, 6rem)` | .98 |
| d2 | `clamp(2rem, 3.6vw, 3.9rem)` | 1.05 |
| d3 | `clamp(1.45rem, 2.1vw, 2.2rem)` | 1.2 |
| body | `clamp(1rem, .95rem + .2vw, 1.125rem)` | 1.65 |
| small | `.875rem` | 1.5 |
| label | `.72rem` | 1 |

### Spacing and grid

- 8-pt base scale (`--s-1` … `--s-10`: 0.5 → 12 rem).
- Section padding: `clamp(6rem, 14vw, 14rem)`. The negative space is the luxury.
- 12-column grid, gutter `clamp(16px, 2vw, 32px)`, side margin `clamp(20px, 5vw, 80px)`.
- Text never spans more than 7 columns. Body copy is capped at 34ch.

### Motion principles

- **Mass.** Nothing starts fast. The stone accelerates slowly and settles for a long time.
  - `--ease-heavy: cubic-bezier(.76, 0, .18, 1)`: moves, scroll-to, page-level transitions
  - `--ease-settle: cubic-bezier(.16, 1, .3, 1)`: reveals, hovers (long tail)
- Durations: `.8s` (UI), `1.2s` (reveal), `1.6s` (hover zoom, image swap), `2.8s` (hero intro).
- Reveals: fade plus a 28 px rise, 120 ms stagger, triggered once.
- Hero: a spring with stiffness 7, damping 4.4 (slightly under-damped: the weight overshoots by a hair
  and settles). Light follows the same spring, so the light has weight too.
- Scroll: Lenis, duration 1.4. The collection scrubs with an extra 1.2 s lag (inertia).
- Cursor: a 6 px dot plus a 38 px ring, the ring lerped at 0.14 per frame; magnetic pull of 25 % on CTAs.
- `prefers-reduced-motion`: no Lenis, no pin, no cursor, no spring. The hero renders **one**
  composed static frame, and all content is visible immediately.
