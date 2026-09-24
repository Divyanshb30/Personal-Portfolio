import * as THREE from "three";
import { V, invSmooth } from "./math";

// ---------------- where everything sits in the one continuous world ----------------
export const FIG_X = 1.45; // his figure, right of the name
export const O1 = V(FIG_X + 1.75, 0.55, 1.1); // the orb, beside him
export const ORB_R = 0.78;
export const PC = V(15, 0.6, -13); // the Think planet
export const PL_R = 2.25;
export const toPlanet = PC.clone().sub(O1).normalize();
export const ARC = V(-toPlanet.z, 0, toPlanet.x).multiplyScalar(-2.2); // the flight bows toward the camera
export const planetRot = new THREE.Euler(0.3, 0.8, 0.1);
export const PLANET_UP = V(0, 1, 0).applyQuaternion(new THREE.Quaternion().setFromEuler(planetRot).invert());
const tilt = new THREE.Matrix4().makeRotationX(0.28).multiply(new THREE.Matrix4().makeRotationZ(-0.1));
export const orbitAt = (a: number) => V(Math.cos(a) * 4.6, 0, Math.sin(a) * 4.6).applyMatrix4(tilt).add(PC);

export const PJ = PC.clone().add(V(0, 9.5, -9)); // the projects sky
export const SF = PC.clone().add(V(1, -17, -5)); // the stack field
export const DIVE = SF.clone().add(V(0, 4.5, 0));
export const JO = SF.clone().add(V(0, -12, -8)); // the river's source

// ---------------- the timeline ----------------
// GG: 0..1 across the site. The first half (G) runs Arrival→Stack; s is Arrival+Think.
export const OS = 0.5;
export const A_SPAN = 0.45;
export const FL0 = 0.28, FL1 = 0.58; // the flight into Think, in s
export const FRAC = [0.2, 0.4, 0.6, 0.8]; // where the flight sheds each moon
export const BUD = FRAC.map((a) => O1.clone().lerp(PC, a).addScaledVector(ARC, Math.sin(Math.PI * a)).add(V(0, 1.2 * Math.sin(Math.PI * a), 0)));
export const SBUD = FRAC.map((a) => FL0 + (FL1 - FL0) * invSmooth(a));
export const JS0 = 0.525, JS1 = 0.8;
export const JG = (x: number) => JS0 + (JS1 - JS0) * x; // journey-local → film time

// scroll → film time: two dead stretches pass in a breath (the hold after Think, and after the Projects hold)
const SKN: [number, number][] = [[0, 0], [0.1725, 0.1725], [0.1785, 0.229], [0.2495, 0.3], [0.2555, 0.3625], [0.893, 1]];
export const filmT = (u: number) => {
  u = Math.min(1, Math.max(0, u)) * 0.893;
  for (let k = 1; k < SKN.length; k++)
    if (u <= SKN[k][0]) {
      const [a0, b0] = SKN[k - 1], [a1, b1] = SKN[k];
      return b0 + ((b1 - b0) * (u - a0)) / (a1 - a0);
    }
  return 1;
};
/** film time → scroll fraction (for nav jumps) */
export const scrollFor = (t: number) => {
  for (let k = 1; k < SKN.length; k++)
    if (t <= SKN[k][1]) {
      const [a0, b0] = SKN[k - 1], [a1, b1] = SKN[k];
      return (a0 + ((a1 - a0) * (t - b0)) / (b1 - b0)) / 0.893;
    }
  return 1;
};

export const PLACES = ["Arrival", "Think", "Projects", "Stack", "Journey", "Horizon", "Contact"] as const;
export type Place = (typeof PLACES)[number];
/** where each section settles, in film time */
export const PLACE_AT: Record<Place, number> = {
  Arrival: 0,
  Think: 0.155,
  Projects: 0.28,
  Stack: 0.49,
  Journey: 0.53,
  Horizon: 0.88,
  Contact: 0.99,
};
export const placeAt = (GG: number, G: number): Place =>
  GG >= 0.905 ? "Contact" : GG >= 0.8 ? "Horizon" : GG >= 0.512 ? "Journey" : G < 0.126 ? "Arrival" : G < 0.465 ? "Think" : G < 0.745 ? "Projects" : "Stack";
