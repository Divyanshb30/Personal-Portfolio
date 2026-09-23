// Director — the BUILD interaction state (which project is focused). The 3D reads
// the mutable `director` object each frame (no re-render); the DOM project-world
// subscribes via useSelected(). Also parks/unparks Lenis when a world opens.

import { useSyncExternalStore } from "react";
import * as THREE from "three";
import { film } from "./scroll";

export type Mode = "film" | "project";

/** Where a focused project's structure settles so it frames right of the DOM panel. */
export const FOCUS_POS = new THREE.Vector3(1.5, 0.15, 1.4);

export const director = {
  mode: "film" as Mode,
  /** project id, or null in film mode */
  selected: null as string | null,
  /** id the orb is currently near/hovering (for brightening), or null */
  hovered: null as string | null,
  /** current flow stage inside a project world (orb-guided) */
  flowStage: 0,
};

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

/** Enter a project world (or null to exit back to the universe). */
export function selectProject(id: string | null) {
  director.selected = id;
  director.mode = id ? "project" : "film";
  director.flowStage = 0;
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
