# Divyansh Bansal: portfolio

One continuous, scroll-directed film in three.js. There are no pages: the scroll position is the film's clock, and a camera director moves through a single world. An ember being carries the story, and it changes form in each section: his dust figure → the orb → a planet → constellations → layers of tools → a river through his years → a sun → the orb again.

| Section  | What happens |
| -------- | ------------ |
| Arrival  | His figure, made of ember dust. The cursor presses a soft dent into it, and his head turns toward you. A small orb waits by his head: curious about the cursor, shy of a sudden one, it reacts when clicked and wanders over to look at him when you go quiet. |
| Think    | The orb flies as a comet and sheds four moons: Question, Understand, Iterate, Build. |
| Build    | Five named constellations, one per project, the featured Amdocs work biggest and in the middle. Hover brightens one; a click flies the camera to it and opens its story (the featured one also tells the rest of the Amdocs work). Esc, ✕ or a scroll closes it. |
| Stack    | Every tool as a name in depth, laid out so that no two collide, over a veil that dims the river below. Databricks leads, with the certifications under it. |
| Journey  | The river of his years, with his photos suspended beside it, their edges torn like old memories and shedding a little dust, each in its own drift of amber dust. The orb rides it on a route of its own and opens two of the memories. |
| Now      | A sun rising over the limb of a dark world: still building. |
| Contact  | "Let's talk" comes in and the page ends there. The orb then forms on its own clock, and scrolling back up returns it to the light. |

The cursor drives a spring camera with parallax. The whole film is under 30 screens, with the work in view about 5 screens in (the pacing is the `SKN` knots in `layout.ts`).

For anyone short on time, the bar in the top right goes straight to the Work, the Résumé or Contact, with a quick cut. The section rail on the right jumps behind the loading screen, which rotates through its lines (`LOADING_LINES` in `data.ts`). Any section can be linked to: `/#work`, `/#think`, `/#stack`, `/#journey`, `/#now`, `/#contact`. The address follows the visitor as they scroll.

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
src/components/film/FilmStage.tsx   mounts the canvas, the text blocks, the section rail, the bar and the deep links
src/app/                            the page, the DB monogram icons, and the share image (a real frame of the film)
```

The text blocks are React markup. The engine finds them by `data-block` and only drives their opacity and position.

## Editing content

All of the words are in `src/film/data.ts`, with facts taken from the résumé:

- Each project's `problem`, `built` and `outcome` fields, and its `links`. They are written from the résumé. A project's `also` holds more work from the same place, told at the end of its story.
- `STACK` holds the tools: each group's capability, lead name, tools, place in the field, and optional small print under the lead.
- Journey photos are in `public/photos`. Each memory's `photo` is `[src, cropX, cropY, cropW, cropH]`, and a memory with `photo: null` shows a "photo coming" card.
- Photos get only a light editorial grade and skip the bloom and filmic tone mapping (see `src/film/post.ts`), so they stay true to the originals. The cinematic feel comes from the dust and depth around them.
- To add a photo that isn't tied to a year, put it in `public/photos` and add it to `LOOSE_PHOTOS` in `data.ts`. It will drift through the Journey, small and dim. It finds a spot by itself, or you can place it with `d` (how far down the river), `bank` (across it) and `h` (height).

Résumés are in `public/resume`. The dust figure is `public/models/divyansh.glb` (Draco-compressed; the decoder is served from `public/draco`).

## Phones, tablets and every other screen

The film knows what kind of screen it is on (`src/film/device.ts`): portrait, a phone held upright, a phone on its side, a touch screen. A wide frame with a mouse gets the film exactly as composed; the rest adapts from it.

- **The vertical cut.** On a portrait screen the camera plays a second shot list (each shot's `tall` pose in `director.ts`, `horizon.ts`, `contact.ts`, and a step back on the river in `journey.ts`), with a lens shift along the film (`LIFT` in `layout.ts`) that lifts the subject clear of words set below it, or under words set above it. His figure stands over his name, the planet under its words, the orb over "Let's talk".
- **The work as a column.** In the vertical cut the five constellations stand in a column, the featured Amdocs work first (each project's `tall` in `data.ts`), with each name beside its constellation; the camera goes down it as you scroll. A tap opens the nearest, and its story rises from the bottom as a sheet (a drag down, a tap above it, Esc or a scroll puts it away).
- **The thumb's reach.** On a phone the chrome moves to the bottom: a dock with where you are and how far, and a chapters sheet (`ChapterSheet.tsx`) that cuts to any section. The top keeps the name and Work · Résumé · Contact. Every control is at least 44px for a finger, and nothing sits under the notch or the home bar.
- **Touch and tilt.** A finger pokes (a dent, a stir, a tap on the orb) and lets go when it lifts. The camera's handheld sway comes from tilting the device instead of the cursor, and his head turns with it (on iOS the landing's hint asks for it with a tap); without tilt, a slow drift keeps the world alive.
- **The stack on a phone** keeps every name readable and shows the ones that fit; a tapped lead brings its group forward.
- **Steady on a phone.** The canvas is as tall as the largest viewport, so the toolbar coming and going never resizes the film, and turning the phone keeps your place in it. If the GPU drops the film (a phone does, to a page left in the background) it says so and offers a reload. Where WebGL can't run at all, the whole story shows as a quiet page of its own.

To look at any moment on any screen, use `?s=<0..1>` with the browser's device mode.

## Performance

Particle counts scale with a quality tier (desktop 1, weaker CPUs 0.7, phones 0.45). The film holds an even frame rate by stepping its resolution down when frames run late and back up after a quiet spell; a phone starts a step softer. A `prefers-reduced-motion` setting calms the camera, and turns off tilt and the drift.
