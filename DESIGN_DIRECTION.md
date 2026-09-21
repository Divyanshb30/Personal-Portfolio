# DESIGN_DIRECTION.md — the creative source of truth

> **This is the canonical creative authority for the project.** It supersedes the
> archived "Kinetic Noir" system ([`design.archive.md`](./design.archive.md)).
> Product truth lives in [`PRODUCT.md`](./PRODUCT.md); the build checklist in
> [`PREFLIGHT.md`](./PREFLIGHT.md). Priority order when decisions conflict:
> 1) the master creative brief · 2) this file · 3) reference principles ·
> 4) Taste/Impeccable critique · 5) feasibility/perf · 6) existing code.

---

## CURRENT DIRECTION (supersedes the palette sections below)

The build has since moved to the user's directed blueprint. What holds now:

- **A cinematic 3D film**, one continuous scroll timeline, around a morphing
  **particle entity** on a **material-driven near-black** world.
- **The orb is warm (orange/ember)** — the single chromatic element; a set of
  candidate looks lives at the `/orb-lab` route (final pick pending).
- **The entity is a performer, not a hero object** — it drifts across the frame
  per chapter (left / right / near / far), never always centred.
- **8 chapters:** IDENTITY → THINK → BUILD → STACK → JOURNEY → EXPLORE → NOW →
  HUMAN. Build shows projects as manifestations (not per-project chapters);
  Stack is capability-based (BUILD/INTELLIGENCE/RETRIEVAL/SYSTEMS/APPLICATIONS/
  INFRASTRUCTURE); Journey is the DTU-ERP / co-founder story; the profile is a
  long-run builder, not AI-only.
- **HUMAN finale:** the dust reconstructs, the **real GLB solidifies**, a slow
  360°, then "Let's talk."
- **DTU ERP** becomes a documentary-inside-the-film: real photos appear as rare
  memory fragments (never a gallery). Rule: **3D = imagination, photography =
  reality.** (Photos pending from the user.)

The dual-temperature "ember/xenon" system below is **retired**; sections 2–3
(cool palette, specific tokens) no longer bind. The narrative, systems, layering,
effects, performance and quality-bar sections still apply.

## 0. The one idea

**A cinematic observation chamber for a living intelligence.**

Not a portfolio with 3D added. A dark, warm, instrument-grade void you fall
*through*, where a single obsidian entity — thinking matter — evolves, and where
telemetry from real production systems surfaces as restrained light. You are
watching an intelligence *think, and be held to account* (budgets, human-in-the-
loop, audit). That accountability is what makes Divyansh's work trustworthy, and
it is the emotional core of the experience.

**The category default it refuses:** the cold-black, one-neon-accent, glowing-
edge "dark dev portfolio," and the generic card-grid résumé site. We refuse both.

---

## 1. The signature POV: a dual-temperature world

The single most original decision, and the through-line of the whole build.
Color is rationed to **two temperatures with narrative meaning**:

- **WARM = the human.** The person, the world, matter, trust. A warm near-black
  **obsidian** void (cooling volcanic glass, never pure black, never cold) with a
  molten **ember** core glowing from inside the entity.
- **COLD = the machine intelligence.** A single **xenon** blue-white filament,
  used *only* for the AI interface, live telemetry, the agent swarm, and data
  states. Precise, surgical, rare.

The scroll is a **temperature journey**: it opens warm (PERSON), *cools* as we
descend into the systems and machinery (THINKING → SYSTEMS → BUILDING), and
*reheats* as we return to the person (EXPLORATION → PERSON). Warm and cold almost
never share a frame; they meet only at the threshold where person meets machine.

> **Why this is not the "orange/teal" cliché:** the two temperatures are
> *narratively segregated*, not applied together to grade everything. Warmth owns
> the human half, cold owns the machine half. The drama comes from the 3D entity
> and world doing the chromatic work (Lusion), while the UI chrome stays
> achromatic and quiet. **Honest risk:** ember + blue-white can read as
> sci-fi if they bleed together — the discipline (segregation + rarity) is what
> prevents it, and it is enforced, not hoped for.

---

## 2. Color tokens

Warm-obsidian ground; two rationed accents. Never pure `#000`/`#fff`.

```
/* GROUND — warm near-black obsidian stack (depth via surface, not shadow) */
--void:        #0a0908   /* page canvas — warm near-black */
--void-deep:   #060504   /* recessed / deepest */
--obsidian:    #14110e   /* raised surface / entity base material */
--ash:         #1e1a16   /* hairline surfaces, faint panels */
--hair:        rgba(242,236,225,0.08)  /* hairlines */

/* TEXT — warm off-white stack */
--bone:        #f2ece1   /* primary text (warm off-white) */
--smoke:       #a89e8f   /* secondary text */
--faint:       #6b6155   /* tertiary / instrument labels at rest */

/* WARM accent — EMBER (person · world · matter · the one primary action) */
--ember:       #ff6a2b   /* molten core / warm signal */
--ember-deep:  #b83f14
--gold:        #ffb066   /* peak-energy highlight */

/* COLD accent — XENON (machine intelligence · AI · telemetry · data only) */
--xenon:       #9db8ff   /* cold blue-white filament */
--xenon-core:  #e6efff   /* hottest cold point */
```

**Locks:** ember is warm-side only (never on an AI/telemetry element); xenon is
machine-side only (never on the person/world). One radius language, instrument-
grade (sharp 2px details, 0 on inputs, pill only for the AI orb). No gradients on
UI; gradients live only inside 3D materials and the entity.

---

## 3. Typography

Three families, each with a point of view, none on Taste's banned-default list.
Hierarchy from **scale and space**, not weight soup (Dala/Auros principle).

- **Display — `Bricolage Grotesque`** (variable). Monumental, humanist-industrial.
  The person's name, scene titles, environmental typography. Tight negative
  tracking at large sizes; line-height ~0.9 for sculptural stacking (ORYZO).
- **Body/UI — `Hanken Grotesk`** (variable). Clean workhorse for readable copy.
- **Mono/Instrument — `Martian Mono`** (variable). Telemetry, HUD labels, agent
  readouts, coordinates. Wide-tracked uppercase. This is the "instrument voice."

Rules: display weights stay disciplined (no random bold+black mixing); mono
labels are short and tracked (`0.2em+`); body ≤ `65ch`; emphasis via italic/weight
of the *same* family, never a foreign face dropped into a headline.

---

## 4. The four systems (behavior spec)

### 01 — WORLD (never dead)
Persistent volumetric environment: fog + light shafts (custom shader), instanced
particle drift, distant procedural structures for parallax, envmap reflections.
Evolves on an idle clock even when foreground is minimal. Warm-side by default;
cools (fog tints, particle behavior) as the temperature journey descends.

### 02 — MORPHING ENTITY (the thread)
Seed: the existing metallic distort orb, re-authored with a custom shader
(fresnel rim + internal molten-core noise). It transforms across the full
vocabulary — deformation, topology, scale, rotation, material, particles,
internal structure, fluidity, fragmentation, reconstruction. Driven by **two
inputs**: scroll *progress* (its state along the arc) and scroll *velocity* (its
energy — calm and organic when still, fragmented and hot when thrashed). Feels
like a living system, not a loop. The ember core is its heartbeat.

### 03 — CHARACTER (selective)
The bookend: `CHARACTER → ENTITY → WORLD → ENTITY → CHARACTER`. Present in the
opening, a few major beats, and the finale (slow 360°). Absent for long stretches
while entity/world carry the story. Rendered so it belongs to the world's
material language — it can arrive through depth-map / thermal / wireframe imaging
before resolving. **Asset:** rigged GLB at `public/models/divyansh.glb` (drop-in
`useGLTF` slot); until it lands, the PNG portrait renders as a depth/scan
image-plane in the same slot so the sequence is never blocked.

### 04 — INTELLIGENCE (integrated)
A restrained cold **xenon** orb indicator that expands into a conversational
panel. Answers from `content.ts` about Divyansh, projects, experience, research,
architecture, skills, career, contact. A provider adapter lets a real LLM plug in
later (user supplies endpoint/key); until then it retrieves and composes from
content — never a dead box. **World-response hook:** asking about a project
emphasizes its scene and nudges the camera toward it. It is an interface *into*
the portfolio, not a widget on top of it.

---

## 5. Cinematic scroll — the timeline

One GSAP master timeline (ScrollTrigger + Lenis) orchestrating camera, entity,
world, lighting, particles, typography, HUD, and transitions as one continuous
film. Beats blend; they are not isolated section animations.

| Beat | Temp | Camera | Entity | Character |
|------|------|--------|--------|-----------|
| 01 PERSON | warm | establish, slow push-in | dormant/off | **present**, name reveal |
| 02 THINKING | warm→ | dolly through, close-up | wakes, organic breathing | dissolves → entity |
| 03 SYSTEMS | cools | orbital, pull-back | fragments into agent swarm | absent |
| 04 BUILDING | cold | object reveals, push-through | reconstructs per project | absent |
| 05 EXPLORATION | warming | wide, drifting | peak topology range | brief glimpse |
| 06 PERSON | warm | push-in → **360°** | recondenses, calm | **returns**, finale |

Camera vocabulary in play: macro, extreme close-up, dolly, orbital, push-in,
pull-back, perspective shift, object reveal, push-through, final 360°.

---

## 6. Spatial layering
Every scene composed in depth:
`BACKGROUND → ATMOSPHERE → ENVIRONMENT → SECONDARY OBJECTS → ENTITY/CHARACTER → FOREGROUND → TYPOGRAPHY → HUD`.
Layers move at different rates (parallax). Foreground occasionally passes in front
of the subject. Typography sometimes lives *in* the 3D space, not only as HTML.

## 7. Experimental imaging (punctuation)
Used at transitions/reveals only, never always-on. Palette of techniques:
thermal, pixel-sort, scanlines, chromatic aberration, controlled datamosh,
wireframe reveal, X-ray, depth-map distortion, edge detection, particle
disintegration/reconstruction, film grain, glitch typography. **Contrast is the
point:** long clean cinematic passages punctuated by brief high-energy digital
transformations.

## 8. Motion & pacing
Dials: VARIANCE 8 / MOTION 9 (motivated) / DENSITY 3. Every animation justifiable
in one sentence. Expensive effects bounded. `prefers-reduced-motion` collapses to
a calm, legible, near-static render. Pace like a studio: dense beats earn quiet
ones; the film ends anchored on a real close (contact + résumé).

## 9. Interface restraint
The interface recedes so the world leads (Experience mode). Instrument-grade HUD:
thin tracked mono labels, telemetry readouts, hairlines. No card-grid slop, no
scroll cues, no decorative dots/eyebrow-on-every-section, no version stamps.
Real, readable content stays in accessible DOM for a11y + SEO.

## 10. Performance architecture
Device-aware tiers (`PerformanceMonitor` + `AdaptiveDpr`); DPR capped; instanced
particles; bounded shader cost; lazy/progressive scene loading + `Preload`; GLB
draco/meshopt when supplied. Canvas is `ssr:false`; content reachable without
WebGL. Targets: LCP < 2.5s, INP < 200ms, CLS < 0.1. Single locked dark theme.

## 11. Quality bar (must pass before "done")
World not webpage · background always alive · entity feels alive not looped ·
character special because selective · camera tells a story · real depth/layering ·
AI integrated into the world · effects purposeful · type subordinate when right ·
genuine moments of surprise · coherent not a demo-pile · premium and art-directed.

---

## 12. DIRECTION CONTRACT (Impeccable — development-only)

**THESIS:** A cinematic observation chamber for a living intelligence you watch
think and be held to account; refuses the cold-black/one-neon dev-portfolio and
the card-grid résumé.

**OWN-WORLD:** Warm near-black obsidian void; depth by surface-stack, not shadow.
Dual-temperature accents — molten **ember** (person/world/matter) vs cold
**xenon** blue-white (machine intelligence), narratively segregated and rationed.
Bricolage Grotesque display · Hanken Grotesk body · Martian Mono instrument. One
persistent WebGL canvas doing all spatial work; achromatic instrument HUD in DOM.

**STORY:** The visitor understands Divyansh builds intelligence that is
trustworthy in production; believes it because they watch a living system think,
fragment into an accountable agent swarm, and reconstruct; and can reach the
work, the résumé, and contact, and interrogate it all via the integrated AI.

**FIRST VIEWPORT:** Warm obsidian void, volumetric fog and drifting particles
alive from frame one. The character (Divyansh) established center-depth via the
GLB/portrait slot, the monumental name in Bricolage framing him, a thin xenon AI
orb resting at the edge, instrument labels in Martian Mono at the corners. No
CTA-hero shell; the world is the thesis. Primary action (enter/scroll into the
film, résumé, AI) reachable without hunting.

**FORM:** Continuous scroll-driven cinematic film (WebGL + GSAP timeline), not a
stacked-section page. Signature interaction: the morphing entity that answers to
scroll progress + velocity, and the AI that reshapes the world in response to
questions. Brief-pinned direction (code-led); concept roll intentionally not run
per new-work.md ("a brief-pinned direction beats the roll").

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance.
