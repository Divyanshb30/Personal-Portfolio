import * as THREE from "three";

export type U<T> = { value: T };

/** Uniforms shared by every material in the film. */
export type Shared = {
  TIME: U<number>;
  SCALE: U<number>;
  FOCUS: U<number>;
  CUR: {
    uMouse: U<THREE.Vector2>;
    uStir: U<number>;
    uActive: U<number>;
    uAspect: U<number>;
    /** the soft dent the cursor presses into his figure: width (NDC-y) and strength */
    uDentR: U<number>;
    uDentAmt: U<number>;
  };
  TURN: { uYaw: U<number>; uPitch: U<number> };
};

/** Everything a section needs to build itself and to update each frame. */
export type Ctx = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** the director's shot without the cursor's sway: for laying out words that must not jump as the cursor moves */
  base: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  u: Shared;
  /** the overlay root (text blocks are found in it by data-block) */
  root: HTMLElement;
  labels: HTMLElement;
  /** 1 on desktop, lower on small or weak devices: particle counts scale with it. */
  quality: number;
  W: number;
  H: number;
  /** compile something's shaders ahead of time, as the film draws them (set once the film's buffers exist) */
  warm?: (o: THREE.Object3D) => void;
};

/** Per-frame state handed to every section. */
export type Frame = {
  dt: number;
  time: number;
  /** film time across the whole site, 0..1 */
  GG: number;
  /** film time across the first half (Arrival→Stack), 0..1 */
  G: number;
  /** film time across Arrival + Think, 0..1 */
  s: number;
  cam: { x: number; y: number; vx: number; vy: number };
  mouse: { x: number; y: number };
  calm: number;
  fixed: boolean;
};

export type Section = {
  update(f: Frame): void;
  /** optional: adjust the directed shot before the camera is placed */
  shot?(f: Frame, sh: import("./director").Shot): void;
  /** optional: remove listeners the section added outside the scene */
  dispose?(): void;
};

/** A text block rendered by React, found by data-block. */
export function block(ctx: Ctx, name: string) {
  const b = ctx.root.querySelector<HTMLElement>(`[data-block="${name}"]`);
  if (!b) throw new Error(`film: missing block ${name}`);
  return b;
}

export function makeShared(W: number, H: number, pixelRatio: number): Shared {
  return {
    TIME: { value: 0 },
    SCALE: { value: (pixelRatio * H) / 900 },
    FOCUS: { value: 7 },
    CUR: {
      uMouse: { value: new THREE.Vector2(0, 0) },
      uStir: { value: 0 },
      uActive: { value: 0 },
      uAspect: { value: W / H },
      uDentR: { value: 0.055 },
      uDentAmt: { value: 0 },
    },
    TURN: { uYaw: { value: 0 }, uPitch: { value: 0 } },
  };
}

/** Create a DOM element inside the film's label layer. */
export function el(ctx: Ctx, cls: string, html: string) {
  const d = document.createElement("div");
  d.className = cls;
  d.innerHTML = html;
  ctx.labels.appendChild(d);
  return d;
}

/** Project a world point to CSS pixels; z > 1 means behind the camera. */
export function toScreen(ctx: Ctx, v: THREE.Vector3, out = new THREE.Vector3()) {
  out.copy(v).project(ctx.camera);
  return { x: (out.x * 0.5 + 0.5) * ctx.W, y: (-out.y * 0.5 + 0.5) * ctx.H, z: out.z };
}
