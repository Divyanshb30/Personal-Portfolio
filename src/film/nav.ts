import type { Place } from "./layout";

// The one running film registers itself here, so UI outside the canvas (the section rail,
// the Ask assistant) can move the visitor through the world.
let go: ((p: Place) => void) | null = null;
export const registerNav = (fn: ((p: Place) => void) | null) => {
  go = fn;
};
export const goTo = (p: Place) => go?.(p);
