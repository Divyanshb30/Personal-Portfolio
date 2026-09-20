# ARCHIVED — "Kinetic Noir" (superseded)

> This file records the **previous** visual system so the reset is explicit and
> reversible. It is **no longer the source of truth.** The new creative source of
> truth is [`DESIGN_DIRECTION.md`](./DESIGN_DIRECTION.md). Do not make new visual
> decisions from this file.
>
> Archived: 2026-09-21 as part of the CREATIVE RESET.

The project had no standalone `design.md`; the incumbent "Kinetic Noir" system
lived in `src/app/globals.css` (`@theme` tokens) and the first-contact hero. It
was a competent dark developer-portfolio look. It is retired because the new
direction rebuilds the visual experience from first principles as a cinematic
3D identity world, not a decorated webpage.

## Retired tokens (from globals.css)

```
--color-base:      #08080a   /* cold near-black canvas */
--color-surface:   #101015
--color-raised:    #1a1a20
--color-ink:       #f4f4f3
--color-muted:     #8b8b95
--color-faint:     #575760
--color-hair:      #26262e
--color-ember:     #3d5afe   /* an indigo, confusingly named "ember" */
--color-ember-deep:#2a3ed0
--color-sage:      #7f9cff
fonts: Archivo (display) · Space Grotesk (body) · JetBrains Mono (mono)
```

## Why it was reset

- **Cold, generic palette.** Cold near-black + indigo is the default "dark dev
  portfolio" register the new direction explicitly refuses.
- **Webpage-first.** A 3D orb decorated a conventional hero + sections layout.
  The new direction inverts this: the world leads, the interface recedes.
- **Default type stack.** Archivo / Space Grotesk / JetBrains Mono are
  training-data defaults with no point of view.

## What was preserved (engineering infrastructure, re-skinned)

- Next.js 16 + React 19 + R3F + drei + postprocessing + GSAP/ScrollTrigger +
  Lenis + Framer Motion + Tailwind 4.
- `src/lib/content.ts` — real portfolio facts (single source of content truth).
- Lenis smooth-scroll provider, custom cursor, film-grain overlay.
- The distorting metallic "Matter" mesh — reconceived as the **Morphing Entity**.
