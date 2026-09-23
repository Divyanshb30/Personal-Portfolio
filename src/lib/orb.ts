// The Orb Behavior Engine — the orb is a living physical body, not a lerp.
// One spring-damped mass with intentional under-damping (overshoot), continuous
// micro-drift (never mathematically still), and a scroll "kick" so it responds
// to the viewer. The morph SHAPE still advances by scroll; this drives MOTION.

import * as THREE from "three";
import { film } from "./scroll";

export const orb = {
  pos: new THREE.Vector3(0, 0, 0),
  vel: new THREE.Vector3(0, 0, 0),
  /** where the orb wants to be — set each frame by the director (beat / interaction) */
  target: new THREE.Vector3(0, 0, 0),
  /** 0..1 from the orb's own speed — feeds particle agitation */
  energy: 0,
  /** BUILD: the orb notices and investigates nearby projects */
  buildActive: false,
  neighbors: [] as { id: string; pos: THREE.Vector3 }[],
  /** 0..1 how drawn-in the orb is to the nearest project */
  curiosity: 0,
  /** id of the project the orb is currently investigating, or null */
  focusId: null as string | null,
};

const _f = new THREE.Vector3();
const _drift = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _f2 = new THREE.Vector3();
const _tan = new THREE.Vector3();

// cheap smooth pseudo-noise for drift (never repeats to a dead pose)
function n(x: number) {
  return Math.sin(x * 1.7) + Math.sin(x * 0.9 + 1.3) * 0.6 + Math.sin(x * 2.3 + 4.1) * 0.35;
}

// Under-damped: critical damping = 2*sqrt(STIFF) ≈ 7.5, DAMP < that → overshoots ~8%.
const STIFF = 15;
const DAMP = 4.6;
const DRIFT = 0.55;
const MAX_SPEED = 9;

/** Integrate one frame. Call once per frame after setting orb.target. */
export function stepOrb(delta: number, time: number) {
  const dt = Math.min(delta, 0.05);

  // spring toward target + damping
  _f.copy(orb.target).sub(orb.pos).multiplyScalar(STIFF);
  _f.addScaledVector(orb.vel, -DAMP);

  // micro-drift — the orb is always subtly alive
  _drift.set(
    n(orb.pos.x * 0.6 + time * 0.7),
    n(orb.pos.y * 0.6 + time * 0.8 + 11.0),
    n(orb.pos.z * 0.6 + time * 0.6 + 23.0)
  ).multiplyScalar(DRIFT);
  _f.add(_drift);

  orb.vel.addScaledVector(_f, dt);

  // BUILD — environmental steering: notice the nearest project, curve toward an
  // orbit around it (investigate), never a hard fly-to. This is the curiosity.
  if (orb.buildActive && orb.neighbors.length) {
    let nearest: { id: string; pos: THREE.Vector3 } | null = null;
    let nd = Infinity;
    for (const n of orb.neighbors) {
      const d = orb.pos.distanceTo(n.pos);
      if (d < nd) { nd = d; nearest = n; }
    }
    if (nearest && nd < 3.4) {
      const attract = 1 - nd / 3.4;
      orb.curiosity += (attract - orb.curiosity) * 0.05;
      orb.focusId = attract > 0.55 ? nearest.id : null;
      _dir.copy(nearest.pos).sub(orb.pos);
      const dist = _dir.length() + 1e-4;
      _dir.divideScalar(dist);
      const shell = 1.25; // orbit radius — settle around, not into
      _f2.copy(_dir).multiplyScalar((dist - shell) * 5.5 * attract);
      _tan.set(-_dir.y, _dir.x, 0).multiplyScalar(2.6 * attract); // tangential = orbit
      orb.vel.addScaledVector(_f2, dt).addScaledVector(_tan, dt);
    } else {
      orb.curiosity += (0 - orb.curiosity) * 0.03;
      orb.focusId = null;
    }
  } else {
    orb.focusId = null;
  }

  // scroll kick — a fast scroll makes the orb lurch, then recover
  const kick = film.velocity * 0.0018;
  orb.vel.x += Math.sin(time * 1.3) * kick;
  orb.vel.y += -kick * 0.6;

  if (orb.vel.lengthSq() > MAX_SPEED * MAX_SPEED) orb.vel.setLength(MAX_SPEED);
  orb.pos.addScaledVector(orb.vel, dt);

  orb.energy = Math.min(orb.vel.length() / 3, 1);
}

/** Give the orb a directional impulse (e.g. "shoots forward" into BUILD). */
export function kickOrb(x: number, y: number, z: number) {
  orb.vel.add(_f.set(x, y, z));
}
