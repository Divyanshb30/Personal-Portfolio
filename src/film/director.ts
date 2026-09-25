import * as THREE from "three";
import { V, clamp, lerp } from "./math";
import { FIG_X, O1, OS, PC, PJ, SF } from "./layout";

export type Key = {
  s: number;
  name: string;
  pos: THREE.Vector3;
  tgt: THREE.Vector3;
  fov: number;
  roll?: number;
  /** how the camera meets this pose: 1 comes to rest, 0.5 slows to half speed, 0 (the default) glides through */
  settle?: number;
  /** the pose in the film's vertical cut (a portrait screen), where it differs */
  tall?: Partial<Pick<Key, "s" | "pos" | "tgt" | "fov" | "roll" | "settle">>;
  /** a pose that exists in only one of the cuts */
  only?: "wide" | "tall";
};
export type Shot = { pos: THREE.Vector3; tgt: THREE.Vector3; fov: number; roll: number; name: string };

/**
 * The first half of the film (Arrival → Stack), as camera setups on its own 0..1 clock.
 * Scroll glides the camera through the setups; it comes to rest only where a setup asks to (settle).
 */
export function firstHalfKeys(): Key[] {
  // (tall: the vertical cut. His figure and the orb are framed centred and high, over his name; the
  // planet low, under its words, pulled back so the moons' whole orbit fits; the stack is seen from
  // its end, so its long side runs up the screen)
  const keys: Key[] = [
    { s: 0.0, name: "Arrival · establishing", pos: V(0, 0.1, 7.4), tgt: V(0, 0.05, 0), fov: 30, tall: { pos: V(FIG_X, 0.2, 6.0), tgt: V(FIG_X, 0.1, 0) } },
    { s: 0.0225, name: "Arrival · slow push in", pos: V(0.35, -0.15, 6.3), tgt: V(0.6, 0.12, 0), fov: 31, tall: { pos: V(FIG_X + 0.15, 0, 5.3), tgt: V(FIG_X + 0.1, 0.15, 0) } },
    { s: 0.054, name: "Arc around him as it leaves", pos: V(FIG_X + 4.1, 0.25, 4.3), tgt: V(FIG_X + 1.0, 0.6, 0.6), fov: 36, roll: 0.03, tall: { pos: V(FIG_X + 4.6, 0.35, 5.6) } },
    { s: 0.0855, name: "The orb, close", pos: O1.clone().add(V(0.9, 0.2, 5.0)), tgt: O1.clone(), fov: 32, tall: { pos: O1.clone().add(V(0.9, 0.2, 5.8)) } },
    { s: 0.1125, name: "Orbit the orb", pos: O1.clone().add(V(-3.5, 0.8, 3.3)), tgt: O1.clone(), fov: 32, roll: -0.03, tall: { pos: O1.clone().add(V(-4.0, 0.9, 3.9)) } },
    { s: 0.1935, name: "It flies, and lays out how he thinks", pos: V(14.0, 2.2, -0.8), tgt: V(9.6, 0.9, -7.0), fov: 46, roll: -0.05 },
    { s: 0.27, name: "Crane back · the planet forms", pos: PC.clone().add(V(-2.5, 3.8, 13.5)), tgt: PC.clone(), fov: 40, tall: { pos: PC.clone().add(V(-2.5, 4.2, 16.5)) } },
    { s: 0.3015, name: "Think", pos: PC.clone().add(V(-4.6, 0.6, 11.5)), tgt: PC.clone().add(V(-3.3, 0, 0)), fov: 34, tall: { pos: PC.clone().add(V(-1.8, 1.1, 17)), tgt: PC.clone().add(V(0, 0.3, 0)) } },
    { s: 0.345, name: "Think · hold", pos: PC.clone().add(V(-4.4, 0.55, 10.9)), tgt: PC.clone().add(V(-3.2, 0, 0)), fov: 34, settle: 1, tall: { pos: PC.clone().add(V(-1.6, 1.0, 16.4)), tgt: PC.clone().add(V(0, 0.3, 0)) } },
    { s: 0.47, name: "The planet rises into the work", pos: PC.clone().add(V(-3, 1.2, 12)), tgt: PC.clone().add(V(0, 7, -6)), fov: 44 },
    { s: 0.52, name: "The work · wide, from below", pos: PJ.clone().add(V(-0.2, -4.6, 14.2)), tgt: PJ.clone().add(V(-0.2, 2.3, 0)), fov: 52 },
    { s: 0.575, name: "The work · pick one", pos: PJ.clone().add(V(-0.4, -4.4, 13.8)), tgt: PJ.clone().add(V(-0.2, 2.3, 0)), fov: 52, settle: 1 },
    { s: 0.745, name: "Roots drop · tilt down", pos: PJ.clone().add(V(4, 1, 13)), tgt: PJ.clone().add(V(2, -9, -2)), fov: 50 },
    { s: 0.8, name: "Dive with the orb", pos: SF.clone().add(V(1, 9, 9)), tgt: SF.clone().add(V(0, 0, -1)), fov: 48, roll: -0.04, tall: { pos: SF.clone().add(V(9, 10, 2)), tgt: SF.clone().add(V(-1, 0, 0)), fov: 44 } },
    { s: 0.845, name: "Overhead · what it runs on", pos: SF.clone().add(V(0.3, 13, 3.5)), tgt: SF.clone().add(V(0, 0, -0.5)), fov: 50, tall: { pos: SF.clone().add(V(5, 15, 0.4)), tgt: SF.clone().add(V(-0.5, 0, 0)), fov: 40 } },
    { s: 0.9, name: "Crane down through the layers", pos: SF.clone().add(V(0.4, 8.2, 11.2)), tgt: SF.clone().add(V(0, -0.3, -0.4)), fov: 50, tall: { pos: SF.clone().add(V(11.5, 9.5, 0.6)), tgt: SF.clone().add(V(-0.6, -0.3, 0.2)), fov: 40 } },
    { s: 0.955, name: "Track across the names", pos: SF.clone().add(V(-2.4, 5.8, 12.4)), tgt: SF.clone().add(V(0.2, -0.3, 0)), fov: 50, roll: 0.02, tall: { pos: SF.clone().add(V(12.4, 7.6, -1.2)), tgt: SF.clone().add(V(-0.6, -0.3, 0.2)), fov: 40 } },
    { s: 1.0, name: "Stack · hold", pos: SF.clone().add(V(1.2, 5.4, 12.6)), tgt: SF.clone().add(V(0.3, -0.3, 0)), fov: 50, settle: 1, tall: { pos: SF.clone().add(V(12.6, 7.2, 1.0)), tgt: SF.clone().add(V(-0.6, -0.3, 0.2)), fov: 40 } },
  ];
  for (const k of keys) {
    k.s *= OS;
    if (k.tall?.s !== undefined) k.tall.s *= OS;
  }
  return keys;
}

/** The shot list for one cut of the film: the wide one as composed, or the vertical one for a portrait screen. */
export function cut(keys: Key[], tall: boolean): Key[] {
  return keys.filter((k) => !k.only || k.only === (tall ? "tall" : "wide")).map((k) => (tall && k.tall ? { ...k, ...k.tall } : k));
}

export class Director {
  private keys: Key[];
  private posCurve: THREE.CatmullRomCurve3;
  private tgtCurve: THREE.CatmullRomCurve3;
  /** the camera's pace through each pose, in poses per unit of film time */
  private pace: number[];
  constructor(keys: Key[]) {
    this.keys = [...keys].sort((a, b) => a.s - b.s);
    this.posCurve = new THREE.CatmullRomCurve3(this.keys.map((k) => k.pos), false, "centripetal");
    this.tgtCurve = new THREE.CatmullRomCurve3(this.keys.map((k) => k.tgt), false, "centripetal");
    // Through each pose the camera keeps the pace of the moves either side (their harmonic mean: a
    // pace that changes smoothly and never makes the camera overshoot or turn back), slowed by how
    // much the pose asks it to settle. It rests at the film's two ends.
    const K = this.keys, rate = (i: number) => 1 / Math.max(1e-6, K[i + 1].s - K[i].s);
    this.pace = K.map((k, i) => {
      if (i === 0 || i === K.length - 1) return 0;
      const a = rate(i - 1), b = rate(i);
      return ((2 * a * b) / (a + b)) * (1 - clamp(k.settle ?? 0, 0, 1));
    });
  }
  shot(t: number): Shot {
    const K = this.keys;
    let i = 0;
    while (i < K.length - 2 && t > K[i + 1].s) i++;
    const a = K[i], b = K[i + 1], h = Math.max(1e-6, b.s - a.s), u = clamp((t - a.s) / h, 0, 1);
    // a cubic Hermite from one pose to the next, leaving and arriving at each pose's own pace
    const u2 = u * u, u3 = u2 * u;
    const e = 3 * u2 - 2 * u3 + (u3 - 2 * u2 + u) * h * this.pace[i] + (u3 - u2) * h * this.pace[i + 1];
    const q = (i + e) / (K.length - 1);
    return { pos: this.posCurve.getPoint(q), tgt: this.tgtCurve.getPoint(q), fov: lerp(a.fov, b.fov, e), roll: lerp(a.roll || 0, b.roll || 0, e), name: e < 0.5 ? a.name : b.name };
  }
  get end() {
    return this.keys[this.keys.length - 1].s;
  }
}
