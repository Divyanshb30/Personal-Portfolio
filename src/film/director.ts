import * as THREE from "three";
import { V, clamp, lerp, smoother } from "./math";
import { FIG_X, O1, OS, PC, PJ, SF } from "./layout";

export type Key = { s: number; name: string; pos: THREE.Vector3; tgt: THREE.Vector3; fov: number; roll?: number };
export type Shot = { pos: THREE.Vector3; tgt: THREE.Vector3; fov: number; roll: number; name: string };

/**
 * The first half of the film (Arrival → Stack), as camera setups on its own 0..1 clock.
 * Scroll moves between setups with easing, so every shot settles like a cut that never cuts.
 */
export function firstHalfKeys(): Key[] {
  const keys: Key[] = [
    { s: 0.0, name: "Arrival · establishing", pos: V(0, 0.1, 7.4), tgt: V(0, 0.05, 0), fov: 30 },
    { s: 0.0225, name: "Arrival · slow push in", pos: V(0.35, -0.15, 6.3), tgt: V(0.6, 0.12, 0), fov: 31 },
    { s: 0.054, name: "Arc around him as it leaves", pos: V(FIG_X + 4.1, 0.25, 4.3), tgt: V(FIG_X + 1.0, 0.6, 0.6), fov: 36, roll: 0.03 },
    { s: 0.0855, name: "The orb, close", pos: O1.clone().add(V(0.9, 0.2, 5.0)), tgt: O1.clone(), fov: 32 },
    { s: 0.1125, name: "Orbit the orb", pos: O1.clone().add(V(-3.5, 0.8, 3.3)), tgt: O1.clone(), fov: 32, roll: -0.03 },
    { s: 0.1935, name: "It flies, and lays out how he thinks", pos: V(14.0, 2.2, -0.8), tgt: V(9.6, 0.9, -7.0), fov: 46, roll: -0.05 },
    { s: 0.27, name: "Crane back · the planet forms", pos: PC.clone().add(V(-2.5, 3.8, 13.5)), tgt: PC.clone(), fov: 40 },
    { s: 0.3015, name: "Think", pos: PC.clone().add(V(-4.6, 0.6, 11.5)), tgt: PC.clone().add(V(-3.3, 0, 0)), fov: 34 },
    { s: 0.345, name: "Think · hold", pos: PC.clone().add(V(-4.4, 0.55, 10.9)), tgt: PC.clone().add(V(-3.2, 0, 0)), fov: 34 },
    { s: 0.47, name: "The planet rises into the work", pos: PC.clone().add(V(-3, 1.2, 12)), tgt: PC.clone().add(V(0, 7, -6)), fov: 44 },
    { s: 0.52, name: "The work · wide, from below", pos: PJ.clone().add(V(-0.2, -4.6, 14.2)), tgt: PJ.clone().add(V(-0.2, 2.3, 0)), fov: 52 },
    { s: 0.575, name: "The work · pick one", pos: PJ.clone().add(V(-0.4, -4.4, 13.8)), tgt: PJ.clone().add(V(-0.2, 2.3, 0)), fov: 52 },
    { s: 0.745, name: "Roots drop · tilt down", pos: PJ.clone().add(V(4, 1, 13)), tgt: PJ.clone().add(V(2, -9, -2)), fov: 50 },
    { s: 0.8, name: "Dive with the orb", pos: SF.clone().add(V(1, 9, 9)), tgt: SF.clone().add(V(0, 0, -1)), fov: 48, roll: -0.04 },
    { s: 0.845, name: "Overhead · what it runs on", pos: SF.clone().add(V(0.3, 13, 3.5)), tgt: SF.clone().add(V(0, 0, -0.5)), fov: 50 },
    { s: 0.9, name: "Crane down through the layers", pos: SF.clone().add(V(0.4, 8.2, 11.2)), tgt: SF.clone().add(V(0, -0.3, -0.4)), fov: 50 },
    { s: 0.955, name: "Track across the names", pos: SF.clone().add(V(-2.4, 5.8, 12.4)), tgt: SF.clone().add(V(0.2, -0.3, 0)), fov: 50, roll: 0.02 },
    { s: 1.0, name: "Stack · hold", pos: SF.clone().add(V(1.2, 5.4, 12.6)), tgt: SF.clone().add(V(0.3, -0.3, 0)), fov: 50 },
  ];
  for (const k of keys) k.s *= OS;
  return keys;
}

export class Director {
  private keys: Key[];
  private posCurve: THREE.CatmullRomCurve3;
  private tgtCurve: THREE.CatmullRomCurve3;
  constructor(keys: Key[]) {
    this.keys = [...keys].sort((a, b) => a.s - b.s);
    this.posCurve = new THREE.CatmullRomCurve3(this.keys.map((k) => k.pos), false, "centripetal");
    this.tgtCurve = new THREE.CatmullRomCurve3(this.keys.map((k) => k.tgt), false, "centripetal");
  }
  shot(t: number): Shot {
    const K = this.keys;
    let i = 0;
    while (i < K.length - 2 && t > K[i + 1].s) i++;
    const a = K[i], b = K[i + 1], u = smoother(clamp((t - a.s) / (b.s - a.s), 0, 1)), q = (i + u) / (K.length - 1);
    return { pos: this.posCurve.getPoint(q), tgt: this.tgtCurve.getPoint(q), fov: lerp(a.fov, b.fov, u), roll: lerp(a.roll || 0, b.roll || 0, u), name: u < 0.5 ? a.name : b.name };
  }
  get end() {
    return this.keys[this.keys.length - 1].s;
  }
}
