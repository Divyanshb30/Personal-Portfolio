"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { entityVert, entityFrag } from "./shaders/entityShaders";
import { sphere, network, clusters3, randoms, word } from "@/lib/targets";
import { film, journeyDepth } from "@/lib/scroll";
import { orb, stepOrb } from "@/lib/orb";
import { director, FOCUS_POS } from "@/lib/director";
import { builds } from "@/lib/content";

/**
 * The Morphing Entity (particle representation). It morphs between point-cloud
 * targets along the film's score; every transition disperses then reforms
 * (disintegration built in). It forms out of dust at Arrival and reacts to the
 * pointer. Behavior is a vocabulary of targets, not an intensity meter.
 */

// The score: progress -> target name. Crossing a keyframe triggers a morph.
// Mapped to the 8 chapters (identity·think·build·stack·journey·explore·now·human).
const SCORE: { at: number; name: string }[] = [
  { at: 0.0, name: "human" }, // identity — forms from dust
  { at: 0.09, name: "sphere" }, // disintegration: human -> orb
  { at: 0.16, name: "network" }, // think — neural / concepts
  { at: 0.28, name: "core" }, // build — compact orb carrier wandering the universe
  { at: 0.42, name: "core" }, // stack — compact orb navigating the tech web
  { at: 0.57, name: "sphere" }, // journey — calm orb travels the timeline
  { at: 0.71, name: "network" }, // explore — broad, fluid
  { at: 0.85, name: "core" }, // now — condensed, present
  { at: 0.95, name: "human" }, // human — reconstruct
];

// Composition: the orb is a performer, not a hero object — it drifts across the
// frame per chapter (left / right / near / far), never always centered.
const COMPOSE: { at: number; p: [number, number, number] }[] = [
  { at: 0.0, p: [0, 0, 0] }, // identity — centre
  { at: 0.14, p: [-1.9, 0.2, 0] }, // think — left
  { at: 0.28, p: [0, 0.1, 0.4] }, // build — the orb wanders among the projects
  { at: 0.42, p: [0, 0.4, -1.2] }, // stack — centre, pushed back (dive under)
  { at: 0.57, p: [-1.5, -0.3, 0.4] }, // journey — left, near
  { at: 0.71, p: [2.0, 0.4, -0.6] }, // explore — right, drifting
  { at: 0.85, p: [-0.7, 0.0, 0.6] }, // now — slightly left, close
  { at: 1.0, p: [0, 0, 0] }, // human — centre
];

const MORPH_DURATION = 1.5;

function composeAt(p: number, out: THREE.Vector3) {
  let a = COMPOSE[0];
  let b = COMPOSE[COMPOSE.length - 1];
  for (let i = 0; i < COMPOSE.length - 1; i++) {
    if (p >= COMPOSE[i].at && p <= COMPOSE[i + 1].at) {
      a = COMPOSE[i];
      b = COMPOSE[i + 1];
      break;
    }
  }
  const span = b.at - a.at || 1;
  let t = (p - a.at) / span;
  t = t * t * (3 - 2 * t);
  out.set(
    THREE.MathUtils.lerp(a.p[0], b.p[0], t),
    THREE.MathUtils.lerp(a.p[1], b.p[1], t),
    THREE.MathUtils.lerp(a.p[2], b.p[2], t)
  );
}

const tmpCompose = new THREE.Vector3();

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
          uColor: { value: new THREE.Color("#c85f2b") },
          uColorHot: { value: new THREE.Color("#ffab5e") },
          uOpacity: { value: 0.72 },
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
    // the orb's own motion agitates its particles (overshoot/lurch = scatter)
    const energy = Math.max(film.energy, orb.energy);
    const scatter = arrival + hump + energy * 0.45 + idle;

    // finale: the dust entity fades as the solid human takes over
    const fade = 1 - THREE.MathUtils.smoothstep(p, 0.95, 0.995);
    // JOURNEY: the orb BECOMES the camera POV — the visible dust dissolves so the
    // world goes black and only the memory corridor remains.
    const drift = 1 - journeyDepth(p);

    material.uniforms.uTime.value = t;
    material.uniforms.uMorph.value = s.morph;
    material.uniforms.uScatter.value = scatter;
    material.uniforms.uEnergy.value = energy;
    material.uniforms.uOpacity.value = 0.72 * fade * drift;
    material.uniforms.uPointer.value.set(film.px * 3.4, -film.py * 2.1, 0);

    // MOTION: the orb is a living body — the target is set by the beat / by BUILD
    // wander / by a selected project; the physics engine moves it there with life.
    const inBuild = p > 0.24 && p < 0.4;
    if (director.selected) {
      // inside a project world — the orb GUIDES the flow: it descends through the
      // focused structure (at FOCUS_POS) as the flow stages advance.
      const b = builds.find((x) => x.id === director.selected);
      const total = b ? b.flow.length : 1;
      const stage = Math.min(director.flowStage, total - 1);
      const yOff = (0.5 - (total > 1 ? stage / (total - 1) : 0)) * 1.8;
      orb.target.set(FOCUS_POS.x - 0.5, FOCUS_POS.y + yOff, FOCUS_POS.z + 0.6);
      orb.buildActive = false;
    } else if (inBuild) {
      // wander among the projects; curiosity/physics curve it toward nearby ones
      orb.buildActive = true;
      orb.target.set(
        Math.sin(t * 0.17) * 1.9,
        Math.cos(t * 0.13) * 1.1 + 0.15,
        0.4 + Math.sin(t * 0.1) * 0.7
      );
    } else if (p > 0.37 && p < 0.56) {
      // STACK — the orb navigates the technology web (wider volume, with depth)
      orb.buildActive = false;
      orb.target.set(
        Math.sin(t * 0.13) * 2.3,
        Math.cos(t * 0.11) * 1.6 + 0.3,
        -0.8 + Math.sin(t * 0.09) * 1.9
      );
    } else {
      orb.buildActive = false;
      composeAt(p, tmpCompose);
      orb.target.copy(tmpCompose);
    }
    stepOrb(delta, t);
    if (points.current) {
      points.current.position.copy(orb.pos);
      points.current.rotation.y += delta * (0.02 + energy * 0.14);
    }
  });

  return <points ref={points} geometry={geometry} material={material} raycast={() => null} />;
}
