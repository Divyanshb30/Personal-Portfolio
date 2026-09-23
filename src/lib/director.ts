// Director — the BUILD interaction state (which project is focused). The 3D reads
// the mutable `director` object each frame (no re-render); the DOM project-world
// subscribes via useSelected(). Also parks/unparks Lenis when a world opens.

import { useSyncExternalStore } from "react";
import { film } from "./scroll";

export type Mode = "film" | "project";

export const director = {
  mode: "film" as Mode,
  /** project id, or null in film mode */
  selected: null as string | null,
  /** id the orb is currently near/hovering (for brightening), or null */
  hovered: null as string | null,
};

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

/** Enter a project world (or null to exit back to the universe). */
export function selectProject(id: string | null) {
  director.selected = id;
  director.mode = id ? "project" : "film";
  // park the film scroll while a world is open; resume on exit
  try {
    if (id) film.lenis?.stop();
    else film.lenis?.start();
  } catch {
    /* lenis may be absent under reduced motion */
  }
  emit();
}

export function setHovered(id: string | null) {
  director.hovered = id;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** React hook for the DOM layer — the currently selected project id. */
export function useSelected(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => director.selected,
    () => null
  );
}
