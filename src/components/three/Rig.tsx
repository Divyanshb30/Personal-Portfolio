"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { film } from "@/lib/scroll";

/** Camera as storytelling device — one continuous path over the 8 chapters. */
type Key = { at: number; pos: [number, number, number]; look: [number, number, number] };

// Every keyframe looks at (roughly) the entity's centre so the subject stays
// framed; bounded zoom keeps the composition solid while still pushing/orbiting.
const PATH: Key[] = [
  { at: 0.0, pos: [0, 0.3, 9.0], look: [0, 0.1, 0] }, // arrival — far, approaching
  { at: 0.08, pos: [0, 0.2, 5.6], look: [0, 0.15, 0] }, // push in
  { at: 0.16, pos: [0, 0.0, 6.2], look: [0, 0, 0] }, // settle on the orb
  { at: 0.26, pos: [2.2, 0.5, 5.6], look: [0, 0, 0] }, // mind — orbit right
  { at: 0.36, pos: [-2.2, -0.3, 5.4], look: [0, 0, 0] }, // orbit left
  { at: 0.5, pos: [2.6, 0.6, 6.0], look: [0, 0, 0] }, // system
  { at: 0.62, pos: [0, 0.4, 7.4], look: [0, 0, 0] }, // work — pull back
  { at: 0.74, pos: [1.4, 0.0, 4.8], look: [0, 0, 0] }, // deep-dive — closer
  { at: 0.84, pos: [-1.6, 0.5, 6.4], look: [0, 0.05, 0] }, // exploration
  { at: 0.93, pos: [0, 0.2, 8.4], look: [0, 0.1, 0] }, // return — far
  { at: 1.0, pos: [0, 0, 6.2], look: [0, 0, 0] }, // contact
];

const tmpPos = new THREE.Vector3();
const tmpLook = new THREE.Vector3();

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
    state.camera.position.lerp(tmpPos, k);

    sample(p, tmpLook, "look");
    look.current.lerp(tmpLook, k);
    state.camera.lookAt(look.current);
  });

  return null;
}
