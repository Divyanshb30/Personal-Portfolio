# Divyansh Bansal: portfolio

One continuous, scroll-directed film in three.js. There are no pages: the scroll position is the film's clock, and a camera director moves through a single world. An ember being carries the story, and it changes form in each section: his dust figure → the orb → a planet → constellations → layers of tools → a river through his years → a sun → the orb again.

| Section  | What happens |
| -------- | ------------ |
| Arrival  | His figure, made of ember dust. The cursor clears a small circle in it, and his head turns toward you. |
| Think    | The orb flies as a comet and sheds four moons: Question, Understand, Iterate, Build. |
| Build    | Four named constellations, one per project. Hover brightens one; a click flies the camera to it and opens its story. Esc, ✕ or a scroll closes it. |
| Stack    | Every tool as a name in depth, laid out so that no two collide, over a veil that dims the river below. |
| Journey  | The river of his years, with his photos suspended beside it, each in its own drift of amber dust. The orb rides it on a route of its own and opens two of the memories. |
| Now      | A sun rising over the limb of a dark world: still building. |
| Contact  | "Let's talk" comes in and the page ends there. The orb then forms on its own clock, and scrolling back up returns it to the light. |

The cursor drives a spring camera with parallax. The Ask pill (top right) answers questions about his work and can take you to any section.

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000. For a production build, run `npm run build` and then `npm start`.

The `?s=<0..1>` URL parameter freezes the film at a given moment, which is useful for reviewing a single shot (for example, `?s=0.3` is Build).

## Where things live

```
src/film/
  Film.ts          the engine: renderer, the scroll clock, the cursor spring camera, post-processing
  director.ts      the shot list for the first half, and the Director that eases between setups
  layout.ts        where everything sits in the world, the timeline, and scroll → film-time knots
  data.ts          everything the film says (projects, stack, memories, résumés)
  orb.ts           the small glass orb: one body (spring, squash and stretch, gaze, cursor, sparks) that Projects, Stack and Journey take turns to direct
  ctx.ts glsl.ts helpers.ts math.ts figure.ts nav.ts
  sections/        one module per section; each builds its part of the world and updates it every frame
                   (ambient.ts holds the small things that happen on their own)
src/components/film/FilmStage.tsx   mounts the canvas, the text blocks, the section rail
src/components/ui/Intelligence.tsx  the Ask assistant
```

The text blocks are React markup. The engine finds them by `data-block` and only drives their opacity and position.

## Editing content

All of the words are in `src/film/data.ts`, with facts taken from the résumé:

- Each project's `problem`, `built` and `outcome` fields, and its `links`. They are written from the résumé.
- Journey photos are in `public/photos`. Each memory's `photo` is `[src, cropX, cropY, cropW, cropH]`, and a memory with `photo: null` shows a "photo coming" card.
- Photos get only a light editorial grade and skip the bloom and filmic tone mapping (see `src/film/post.ts`), so they stay true to the originals. The cinematic feel comes from the dust and depth around them.
- To add a photo that isn't tied to a year, put it in `public/photos` and add it to `LOOSE_PHOTOS` in `data.ts`. It will drift through the Journey, small and dim.

Résumés are in `public/resume`. The dust figure is `public/models/divyansh.glb` (Draco-compressed; the decoder is served from `public/draco`).

## Performance

Particle counts scale with a quality tier (desktop 1, weaker CPUs 0.7, phones 0.45). If the first few seconds render slowly, the film drops to 1× resolution. A `prefers-reduced-motion` setting calms the cursor camera.
