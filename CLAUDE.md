# ГРАНЬ — granite tables site

Single-page marketing site (Russian copy). Vite + vanilla JS + Three.js + GSAP/Lenis. No framework.

- `index.html` is a list of `<include src="x.html" />`; partials live in `src/sections/`
  (each section = `x.html` + `x.css`). Expanded by the `htmlPartials` plugin in `vite.config.js`.
- Global design tokens: `src/styles/tokens.css`. CSS entry: `src/styles/main.css` (@import order matters).
- All data/copy that changes often (contacts, collection, hero table): `src/config/content.js`.
- 3D: `src/gl/table.js` (procedural slab: organic | rect), `stone.js` (granite shader + palettes),
  `hero.js` (outdoor hero: composer → ripples → OutputPass, annotation anchors), `garden.js`
  (Sky, sun, gravel with lens defocus, out-of-focus garden layers), `ripples.js` (GPU wave sim),
  `swatch.js` (stone viewer in «Камни»), `stills.js` (collection renders).
- Stones: palette key in `STONES` (stone.js) must match `STONE_INFO` (content.js).
- Hero env map is assigned per material (not `scene.environment`, which would wash out sun shadows
  on the gravel because per-material envMapIntensity is ignored with scene.environment).
- Placeholders are marked `REPLACE_ME`. Editing guide for humans: `docs/EDITING.md`. Concept: `docs/CONCEPT.md`.
- Breakpoints: 1180 / 960 / 560px. Respect `prefers-reduced-motion` (class `motion-reduced` on <html>).
- Verify with `npm run build`; UI copy stays Russian, code comments English.
