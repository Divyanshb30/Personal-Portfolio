"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { film, journeyDepth } from "@/lib/scroll";

/** Camera as storytelling device — one continuous path over the 8 chapters. */
type Key = { at: number; pos: [number, number, number]; look: [number, number, number] };

// The camera stays mostly frontal and looks at origin; the ENTITY's composition
// path (ParticleEntity COMPOSE) does the left/right drift so the orb reads
// off-centre without camera and orb fighting. Gentle push/pull + pointer
// parallax keep it cinematic.
const PATH: Key[] = [
  { at: 0.0, pos: [0, 0.3, 9.0], look: [0, 0.05, 0] }, // identity — far, approaching
  { at: 0.09, pos: [0, 0.15, 5.6], look: [0, 0.05, 0] }, // push in
  { at: 0.16, pos: [0, 0.0, 6.0], look: [0, 0, 0] }, // think
  { at: 0.28, pos: [0, 0.3, 6.8], look: [0, 0.1, 0] }, // build — reveal the universe
  { at: 0.42, pos: [0, 0.3, 8.2], look: [0, 0.1, 0] }, // stack — pull back to reveal the web
  { at: 0.57, pos: [-0.4, 0.0, 6.4], look: [0, 0, 0] }, // journey
  { at: 0.71, pos: [0.5, 0.25, 6.6], look: [0, 0.05, 0] }, // explore
  { at: 0.85, pos: [0, 0.0, 5.6], look: [0, 0, 0] }, // now — closer
  { at: 0.95, pos: [0, 0.1, 6.6], look: [0, 0.05, 0] }, // human — approach
  { at: 1.0, pos: [0, 0, 6.0], look: [0, 0, 0] }, // contact
];

const tmpPos = new THREE.Vector3();
const tmpLook = new THREE.Vector3();
const driftPos = new THREE.Vector3();
const driftLook = new THREE.Vector3();

function sample(p: number, out: THREE.Vector3, key: "pos" | "look") {
  let a = PATH[0];
  let b = PATH[PATH.length - 1];
  for (let i = 0; i < PATH.length - 1; i++) {
    if (p >= PATH[i].at && p <= PATH[i + 1].at) {
      a = PATH[i];
      b = PATH[i + 1];
      break;
    }
  }
  const span = b.at - a.at || 1;
  let t = (p - a.at) / span;
  t = t * t * (3 - 2 * t);
  out.set(
    THREE.MathUtils.lerp(a[key][0], b[key][0], t),
    THREE.MathUtils.lerp(a[key][1], b[key][1], t),
    THREE.MathUtils.lerp(a[key][2], b[key][2], t)
  );
}

export default function Rig() {
  const look = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const p = THREE.MathUtils.clamp(film.progress, 0, 1);
    const k = 1 - Math.pow(0.0025, delta);

    sample(p, tmpPos, "pos");
    tmpPos.x += film.px * 0.32; // living pointer parallax
    tmpPos.y += -film.py * 0.24;

    sample(p, tmpLook, "look");

    // JOURNEY — the camera becomes the orb: it eases to a near-still drift
    // station, looks down −Z into the dark, and gains inertial sway + roll so it
    // feels like BEING the orb (not a dolly). The memory corridor streams past.
    const jd = journeyDepth(p);
    let roll = 0;
    if (jd > 0.001) {
      const t = state.clock.elapsedTime;
      const glance = film.journeyGlanceX; // −1 left … +1 right
      driftPos.set(
        Math.sin(t * 0.19) * 0.18 + film.px * 0.55 + glance * 0.5, // lean toward it
        Math.cos(t * 0.16) * 0.12 - film.py * 0.42 + 0.05,
        3 // DRIFT_Z — must match Journey's corridor math
      );
      // look ahead down the corridor, turning the head toward the passing memory
      driftLook.set(film.px * 0.7 + glance * 1.15, -film.py * 0.55, 3 - 10);
      tmpPos.lerp(driftPos, jd);
      tmpLook.lerp(driftLook, jd);
      roll = (Math.sin(t * 0.23) * 0.03 - glance * 0.02) * jd; // slight bank into the turn
    }

    state.camera.position.lerp(tmpPos, k);
    look.current.lerp(tmpLook, k);
    state.camera.lookAt(look.current);
    state.camera.rotation.z = roll; // lookAt zeroes roll; re-apply after
  });

  return null;
}
