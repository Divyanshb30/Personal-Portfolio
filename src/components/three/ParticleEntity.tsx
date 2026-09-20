"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { entityVert, entityFrag } from "./shaders/entityShaders";
import { sphere, network, clusters3, randoms, word } from "@/lib/targets";
import { film } from "@/lib/scroll";

/**
 * The Morphing Entity (particle representation). It morphs between point-cloud
 * targets along the film's score; every transition disperses then reforms
 * (disintegration built in). It forms out of dust at Arrival and reacts to the
 * pointer. Behavior is a vocabulary of targets, not an intensity meter.
 */

// The score: progress -> target name. Crossing a keyframe triggers a morph.
const SCORE: { at: number; name: string }[] = [
  { at: 0.0, name: "human" }, // 01 arrival — forms from dust
  { at: 0.1, name: "sphere" }, // E01 disintegration: human -> orb
  { at: 0.2, name: "network" }, // 02 mind — neural cloud
  { at: 0.34, name: "clusters3" }, // 03 system — agentic split (E03)
  { at: 0.46, name: "network" }, // 03 architecture
  { at: 0.6, name: "core" }, // 04 work — pulled together
  { at: 0.72, name: "sphere" }, // 05 deep-dive calm
  { at: 0.82, name: "network" }, // 06 exploration
  { at: 0.92, name: "human" }, // 07 return — reconstruct
];

const MORPH_DURATION = 1.5;

export default function ParticleEntity({
  count = 30000,
  human,
}: {
  count?: number;
  human: Float32Array;
}) {
  const targets = useMemo<Record<string, Float32Array>>(() => {
    return {
      human,
      sphere: sphere(count, 1.55),
      network: network(count),
      clusters3: clusters3(count),
      core: sphere(count, 0.7),
      thinking: word(count, "THINKING", 6),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, human]);

  const aRandom = useMemo(() => randoms(count), [count]);

  // geometry: position = FROM target, aTo = TO target
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(human), 3));
    // start FROM and TO both on the human so arrival shows the figure forming
    g.setAttribute("aTo", new THREE.BufferAttribute(new Float32Array(human), 3));
    g.setAttribute("aRandom", new THREE.BufferAttribute(aRandom, 3));
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [human, aRandom]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: entityVert,
        fragmentShader: entityFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        uniforms: {
          uTime: { value: 0 },
          uMorph: { value: 1 },
          uScatter: { value: 0 },
          uEnergy: { value: 0 },
          uSize: { value: 1.35 },
          uPointer: { value: new THREE.Vector3() },
          uPointerForce: { value: 0.28 },
          uColor: { value: new THREE.Color("#9ba3b8") },
          uColorHot: { value: new THREE.Color("#d2daed") },
          uOpacity: { value: 0.7 },
        },
      }),
    []
  );

  const state = useRef({ idx: 0, morph: 1, scratch: new Float32Array(count * 3) });
  const points = useRef<THREE.Points>(null);

  function startTransition(name: string) {
    const g = geometry;
    const pos = g.attributes.position.array as Float32Array;
    const to = g.attributes.aTo.array as Float32Array;
    const scratch = state.current.scratch;
    const m = THREE.MathUtils.smoothstep(state.current.morph, 0, 1);
    // bake current resolved positions into the new FROM
    for (let i = 0; i < pos.length; i++) scratch[i] = pos[i] + (to[i] - pos[i]) * m;
    pos.set(scratch);
    to.set(targets[name] ?? targets.sphere);
    g.attributes.position.needsUpdate = true;
    g.attributes.aTo.needsUpdate = true;
    state.current.morph = 0;
  }

  useFrame((_, delta) => {
    const p = film.progress;
    const t = performance.now() / 1000;
    const s = state.current;

    // which score entry are we in
    let idx = 0;
    for (let i = 0; i < SCORE.length; i++) if (p >= SCORE[i].at) idx = i;
    if (idx !== s.idx) {
      s.idx = idx;
      startTransition(SCORE[idx].name);
    }

    // advance morph
    if (s.morph < 1) s.morph = Math.min(1, s.morph + delta / MORPH_DURATION);

    // scatter: arrival dust + transition hump + energy
    const arrival = THREE.MathUtils.smoothstep(0.055 - p, 0, 0.055) * 0.4;
    const hump = Math.sin(Math.PI * s.morph) * 0.4;
    const idle = 0.03;
    const scatter = arrival + hump + film.energy * 0.4 + idle;

    material.uniforms.uTime.value = t;
    material.uniforms.uMorph.value = s.morph;
    material.uniforms.uScatter.value = scatter;
    material.uniforms.uEnergy.value = film.energy;
    material.uniforms.uPointer.value.set(film.px * 3.4, -film.py * 2.1, 0);

    // gentle life
    if (points.current) {
      points.current.rotation.y += delta * (0.02 + film.energy * 0.12);
      points.current.position.y = Math.sin(t * 0.4) * 0.05;
    }
  });

  return <points ref={points} geometry={geometry} material={material} />;
}
