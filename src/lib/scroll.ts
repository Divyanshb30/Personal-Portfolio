// The film signal. One module-level store read inside the R3F frame loop and
// GSAP — never React state for continuous values (Taste 3.B / 5.D).
// Also the director: chapter registry + goTo() the AI uses to navigate the world.

import type Lenis from "lenis";

export const CHAPTERS = [
  "identity",
  "think",
  "build",
  "stack",
  "journey",
  "explore",
  "now",
  "human",
] as const;
export type Chapter = (typeof CHAPTERS)[number];

// Display labels for the nav / in-world typography.
export const CHAPTER_LABEL: Record<Chapter, string> = {
  identity: "Identity",
  think: "Think",
  build: "Build",
  stack: "Stack",
  journey: "Journey",
  explore: "Explore",
  now: "Now",
  human: "Human",
};

export const film = {
  /** 0..1 progress over the whole film */
  progress: 0,
  /** signed scroll velocity from Lenis */
  velocity: 0,
  /** smoothed unsigned energy ~0..1 — drives entity agitation + effects */
  energy: 0,
  /** normalized pointer, -1..1 */
  px: 0,
  py: 0,
  /** is the pointer over the window */
  pInside: false,
  /** timestamps (ms) of last scroll / pointer move — for idle detection */
  tScroll: 0,
  tPointer: 0,
  /** lenis handle for programmatic navigation (set by the provider) */
  lenis: null as Lenis | null,
  /** JOURNEY: signed glance (−1 left … +1 right) toward the passing memory */
  journeyGlanceX: 0,
};

// JOURNEY — the orb-POV memory drift. The camera becomes the orb and the memory
// corridor streams past. Window in film.progress; kept in sync with the scroll
// section heights + neighbour chapters (stack ends ~0.49, explore begins ~0.67).
export const JOURNEY = { start: 0.505, end: 0.66 } as const;

/**
 * How deep in the drift we are, 0..1. Fast ramp at entry (the world goes BLACK),
 * hold through the middle, fast ramp back out. Everything that must dissolve for
 * the POV (the dust orb, the chapter word) multiplies its opacity by (1 - this).
 */
export function journeyDepth(p: number): number {
  const { start, end } = JOURNEY;
  if (p <= start || p >= end) return 0;
  const t = (p - start) / (end - start);
  const w = Math.min(1, Math.min(t / 0.07, (1 - t) / 0.07));
  return w * w * (3 - 2 * w);
}

/** Position within the journey window, 0..1 — drives the corridor's travel. */
export function journeyLocal(p: number): number {
  const { start, end } = JOURNEY;
  return Math.max(0, Math.min(1, (p - start) / (end - start)));
}

/** Center progress of a chapter (arrival = 0 … contact = 1). */
export function chapterProgress(c: Chapter): number {
  const i = CHAPTERS.indexOf(c);
  return i / (CHAPTERS.length - 1);
}

/** Which chapter the given progress falls in. */
export function chapterAt(p: number): Chapter {
  const i = Math.round(p * (CHAPTERS.length - 1));
  return CHAPTERS[Math.max(0, Math.min(CHAPTERS.length - 1, i))];
}

/** Seamlessly move the film to a chapter (used by the AI navigator). */
export function goTo(c: Chapter) {
  if (typeof document === "undefined") return;
  const target =
    chapterProgress(c) *
    (document.documentElement.scrollHeight - window.innerHeight);
  if (film.lenis) film.lenis.scrollTo(target, { duration: 1.6 });
  else window.scrollTo({ top: target, behavior: "smooth" });
}

export function updateScroll(progress: number, velocity: number) {
  film.progress = progress;
  film.velocity = velocity;
  film.tScroll = performance.now();
}

export function setPointer(x: number, y: number, inside: boolean) {
  film.px = x;
  film.py = y;
  film.pInside = inside;
  film.tPointer = performance.now();
}

/** True when the visitor has stopped scrolling for `ms`. */
export function scrollIdle(ms = 700): boolean {
  return performance.now() - film.tScroll > ms;
}

/** Frame-rate-independent energy decay toward the instantaneous velocity. */
export function decayEnergy(delta: number) {
  const target = Math.min(Math.abs(film.velocity) / 40, 1);
  const k = 1 - Math.pow(0.0015, delta);
  film.energy += (target - film.energy) * k;
}
