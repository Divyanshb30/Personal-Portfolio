# PREFLIGHT — everything to go over before building

> The gate before implementation. Nothing gets built on an unchecked assumption.
> Companion to [`DESIGN_DIRECTION.md`](./DESIGN_DIRECTION.md) (written after this
> list is agreed). Status legend: `[x]` verified/decided · `[ ]` to confirm.

---

## A. TOOL-LEVERAGE MATRIX (each brief tool → concrete job)

All packages verified installed (see `package.json`). No tool is decorative; each
owns a job it is genuinely best at. **Rule: WebGL owns anything spatial; DOM/CSS
owns typography + interface; Motion glues interaction; GSAP owns the timeline.**

| Tool | Installed | What it actually does here | Not used for |
|------|:---------:|----------------------------|--------------|
| **Three.js / WebGL** | `0.186` | The world, entity, character, particles, fog, volumetrics — all real 3D | Faking with CSS |
| **React Three Fiber** | `9.7` | Declarative scene graph; one persistent `<Canvas>` across the whole scroll | Per-section canvases |
| **Drei** | `10.7` | `Environment`/`Lightformer` (studio light fields), `useGLTF` (character), `Float`, `MeshDistortMaterial`, `shaderMaterial` (custom), `AdaptiveDpr`/`PerformanceMonitor`, `Preload`, `Instances` | Reinventing helpers |
| **Custom shaders (GLSL)** | via drei `shaderMaterial` | Entity surface (fresnel + molten-core noise), volumetric fog, particle fields, depth-map/scan/thermal imaging on the character, dissolve/reconstruct | Where a stock material suffices |
| **postprocessing / @react-three/postprocessing** | `6.39` / `3.1` | Bloom (ember/xenon glow), Vignette, Noise, ChromaticAberration + Glitch (punctuation only), DepthOfField (dolly focus), SelectiveBloom for the core | Constant heavy stacking |
| **GSAP + ScrollTrigger** | `3.15` | The master cinematic timeline: camera path, scene beats, entity state, typography reveals, HUD, scene-to-scene transitions | Scattered per-element tweens |
| **Motion (framer-motion)** | `13.4` | Interface/interaction primitives: HUD reveals, chat panel spring, nav, `whileInView`, magnetic hovers via `useMotionValue` (never `useState` for continuous values) | Fighting GSAP over scroll frames |
| **Lenis** | `1.3` | Smooth-scroll driving ScrollTrigger; the "film transport" feel | — |
| **DOM + CSS + Tailwind v4** | `4` | All readable typography, the instrument HUD, chat UI, nav, links, accessible content | Anything that belongs in 3D space |

**Isolation rule (both skills):** GSAP/Three live in their own leaf components;
Motion never shares a component tree with them (they fight over frames).

---

## B. FOUR CORE SYSTEMS (must all exist and persist)

### 01 — WORLD (never a dead background)
- [ ] One persistent, continuously-evolving cinematic 3D environment
- [ ] Volumetric light + fog (custom shader / fog + light shafts)
- [ ] Particle fields (instanced, GPU-friendly) — atmospheric drift
- [ ] Procedural / distant structures for parallax depth
- [ ] Reflections / envmap so surfaces read as real material
- [ ] Evolves even when foreground content is minimal (idle life)

### 02 — MORPHING ENTITY (the visual thread)
- [ ] One persistent abstract entity — seed = the existing metallic "Matter" orb
- [ ] Transforms: deformation · topology · scale · rotation · material · particles · internal structure · fluidity · fragmentation · reconstruction
- [ ] Responds to **scroll progress** (state) AND **scroll velocity** (energy)
- [ ] Calm/organic ↔ energetic/fragmented range; feels alive, not looped
- [ ] Molten ember core (warm) that cools/heats with energy

### 03 — CHARACTER (selective, not always visible)
- [ ] Appears in: **opening**, selected major beats, **finale** — bookend
- [ ] `CHARACTER → ENTITY → WORLD → ENTITY → CHARACTER`
- [ ] Disappears for long stretches (entity/world carry it)
- [ ] Finale culminates in slow cinematic 360° rotation
- [ ] **Asset:** user provides rigged GLB → drop-in loader slot; PNG-portrait depth/scan plane as graceful fallback until it lands
- [ ] Character can be rendered through experimental imaging (depth/thermal/wireframe) so it fits the world's material language

### 04 — INTELLIGENCE (portfolio AI, integrated not bolted-on)
- [ ] Restrained floating AI/orb indicator (cold xenon) → expands to conversational panel
- [ ] Answers about: Divyansh · projects · experience · AI/LLM work · research · architecture · skills · career · contact
- [ ] Answers from actual portfolio content (`content.ts`)
- [ ] Provider adapter for a real LLM (user wires endpoint/key later); degrades gracefully, never a dead box
- [ ] World-response hook: asking about a project → emphasize its scene / camera nudges toward it
- [ ] Feels like an interface *into* the portfolio, not an external widget

---

## C. CINEMATIC SCROLL — the 6-beat narrative timeline
`PERSON → THINKING → SYSTEMS → BUILDING → EXPLORATION → PERSON`

- [ ] **01 PERSON (warm):** character established, name, who this is
- [ ] **02 THINKING:** character dissolves into the entity; "thinking matter" comes alive
- [ ] **03 SYSTEMS (cools):** the 5-agent platform as a constellation/swarm; telemetry HUD; flagship
- [ ] **04 BUILDING:** projects as objects revealed in depth (IntelliCode, Loan Risk, Transformer); research/ERP journey
- [ ] **05 EXPLORATION:** skills, proof, the wider field; entity at peak topology range
- [ ] **06 PERSON (reheats):** character returns, finale 360°, contact + résumé
- [ ] Continuous transitions between beats (not isolated section animations)
- [ ] Camera as storyteller: macro, extreme close-up, dolly, orbital, push-in, pull-back, perspective shift, object reveal, push-through, final 360°

---

## D. SPATIAL LAYERING (every scene has depth)
`BACKGROUND → ATMOSPHERE → ENVIRONMENT → SECONDARY OBJECTS → ENTITY/CHARACTER → FOREGROUND → TYPOGRAPHY → HUD`
- [ ] Elements at different depths move at different rates (parallax)
- [ ] Foreground objects occasionally pass in front of the subject
- [ ] Typography sometimes behaves as an environmental object, not just HTML

---

## E. EXPERIMENTAL IMAGING (punctuation, not constant)
Reserved as narrative punctuation; contrast clean cinematic moments against occasional high-energy digital transformations.
- [ ] Candidates: thermal/infrared, pixel-sort, scanlines, chromatic aberration, controlled datamosh, wireframe reveal, X-ray, depth-map distortion, edge detection, particle disintegration/reconstruction, digital noise, film grain, glitch typography
- [ ] Applied at transitions/reveals only — never always-on

---

## F. DESIGN LANGUAGE (the synthesis — original, not copied)
- [ ] **POV:** a cinematic observation chamber for a living intelligence you can watch *think and be held to account*
- [ ] **Dual-temperature system (original signature):** WARM = person/world/matter (obsidian + molten **ember**); COLD = machine intelligence (a single **xenon** blue-white filament, AI/HUD/data only). The scroll is a temperature journey (warm → cools through the systems → reheats at the return)
- [ ] **Palette (rationed):** warm near-black obsidian void (not pure black, not cold), warm off-white text, one warm accent (ember/gold), one cold accent (xenon). Drama comes from the 3D content (Lusion principle), UI chrome stays achromatic
- [ ] **Type (3 families, POV, non-default):** Bricolage Grotesque (monumental display) · Hanken Grotesk (body/UI) · Martian Mono (instrument/telemetry labels). Avoids Taste's banned defaults (Inter, Space Grotesk/Mono, DM, etc.)
- [ ] **Refuses:** cold-black + one-neon + glowing-edge cliché (differentiated by warmth + bipolar temperature + object-led drama); AI-purple; generic dev-portfolio card grids

---

## G. REFERENCE SYNTHESIS (principles only — no palettes/branding copied)
- [ ] **Auros →** surface-stack depth over shadows; instrument-grade tracked labels; luminous data-orb. *Reject:* teal fintech palette.
- [ ] **Dala →** the void IS the design; scale-not-weight hierarchy; particle constellation as living brand (maps to agent swarm). *Reject:* violet+amber, floating team cards.
- [ ] **Lusion →** UI defers ALL drama to 3D; achromatic quiet chrome; gallery-object framing. *Reject:* lavender light theme, pill language.
- [ ] **ORYZO →** object-as-museum-artifact; 100vh cinematic pacing; rare accent earns rarity; seamless dark-on-dark transitions; sculptural tight-leading display. *Reject:* warm-walnut palette, uppercase-everything.
- [ ] **Cross-reference (not a merge):** object presentation = Lusion+ORYZO · atmosphere = Dala+Auros · type/negative-space = Dala+ORYZO · instrument HUD = Auros · transitions/pacing = ORYZO.
- [ ] **Final test:** strip all reference branding/colors → does this still feel like its own thing? Must be **yes**.

---

## H. TASTE + IMPECCABLE GUARDRAILS (the critique floor)
- [ ] Motion motivated (each animation justifiable in one sentence)
- [ ] `prefers-reduced-motion` collapses everything heavy to static
- [ ] No `window.addEventListener('scroll')` / scroll in React state — Lenis/ScrollTrigger/`useScroll`; 3D reads scroll inside the R3F frame loop
- [ ] Continuous pointer values via `useMotionValue`, never `useState`
- [ ] No pure `#000` / `#fff`; no AI-purple; one warm + one cold accent, locked
- [ ] One corner-radius system; instrument-grade, not rounded-card slop
- [ ] Fonts via `next/font`; non-default faces
- [ ] Em-dash discipline in **authored chrome**; **preserve real content voice in `content.ts`** (product truth, not restyled)
- [ ] Grain only on fixed `pointer-events-none` layer (already correct)
- [ ] **Deliberate exception:** bespoke reticle cursor kept as an Experience-mode choice (desktop-only, hidden on touch, reduced-motion safe) — overrides Taste's default cursor ban with stated reason
- [ ] Impeccable: direction contract recorded before code; finish-review discipline at the end

---

## I. PERFORMANCE & ACCESSIBILITY (designed in, not bolted on)
- [ ] Device-aware quality tiers (drei `PerformanceMonitor` + `AdaptiveDpr`); mobile simplification
- [ ] Instanced particles; bounded shader cost; DPR cap
- [ ] Lazy/progressive scene loading; `Preload`; GLB draco/meshopt when supplied
- [ ] Canvas is `ssr:false` dynamic (Next); content still reachable without WebGL
- [ ] Reduced-motion path renders a calm, legible, static-ish version
- [ ] Keep real content in accessible DOM (SEO + a11y), not locked inside the canvas
- [ ] Targets: LCP < 2.5s, INP < 200ms, CLS < 0.1; test both light-less dark theme only (single locked theme)

---

## J. ASSETS & OPEN GAPS
- [x] Content: `src/lib/content.ts` (real, canonical) — preserve
- [x] Résumés: `public/resume/*.pdf` (IN/UAE/UK/EU)
- [ ] **Character GLB** — user provides → target path `public/models/divyansh.glb` (rigged; draco/meshopt preferred). Fallback: PNG portrait depth-plane
- [ ] **LLM endpoint/key** — user provides later → provider adapter + `/api` route stub; graceful fallback answers from `content.ts` meanwhile
- [ ] `content.ts` TODOs (hobbies, extra certs/awards) — user to fill; render honestly or omit, never fabricate

## K. STACK DEVIATION (confirm)
- [x] Brief says Vite; repo is **Next.js 16**. Keeping Next.js — every required capability is present; switching = pointless rewrite of working infra (brief: "preserve useful engineering infrastructure"). Flagged for the record.

---

## L. QUALITY BAR (must pass before "done")
- [ ] Feels like a **world**, not a webpage
- [ ] Background continuously interesting
- [ ] Entity feels **alive** (not a loop)
- [ ] Character feels special because it's selective
- [ ] Camera tells a story
- [ ] Real depth and layering
- [ ] AI feels integrated into the world
- [ ] Effects purposeful, not decorative
- [ ] Typography subordinate where appropriate
- [ ] Moments of genuine visual surprise
- [ ] Coherent, not a pile of WebGL demos
- [ ] Premium and art-directed, not a generic portfolio

---

## M. BUILD PHASES (depth-first — user's choice)
1. **Foundation:** reset tokens (warm obsidian dual-temperature), fonts, single persistent `<Canvas>` architecture, GSAP master-timeline scaffold, perf tiers, reduced-motion path
2. **World + Entity:** volumetric world shader, evolving entity (scroll progress+velocity), particles/fog, postprocessing grade
3. **Opening sequence (PERSON→THINKING):** character GLB slot + fallback, name/typography reveal, dissolve-to-entity transition, camera beat 01→02
4. **Intelligence:** xenon indicator → chat panel, content retrieval + provider adapter, world-response hook
5. **Critique + refine:** Impeccable finish-review discipline + Taste pre-flight; fix batch
6. **Then extend** scene by scene (SYSTEMS → BUILDING → EXPLORATION → finale)
