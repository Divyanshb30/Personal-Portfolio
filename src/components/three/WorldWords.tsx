"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { entityVert, entityFrag } from "./shaders/entityShaders";
import { word, randoms } from "@/lib/targets";
import { film } from "@/lib/scroll";

/**
 * Typography as environmental particles. Each word is a point cloud (same shader
 * as the entity) that forms as its chapter arrives and disperses as the camera
 * moves on — type that dissolves into the same field, never an HTML heading.
 */
function WordCloud({
  text,
  from,
  to,
  position,
  size = 6,
  count = 6000,
}: {
  text: string;
  from: number;
  to: number;
  position: [number, number, number];
  size?: number;
  count?: number;
}) {
  const pts = useMemo(() => word(count, text, size), [text, size, count]);
  const rnd = useMemo(() => randoms(count), [count]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    g.setAttribute("aTo", new THREE.BufferAttribute(pts, 3));
    g.setAttribute("aRandom", new THREE.BufferAttribute(rnd, 3));
    return g;
  }, [pts, rnd]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: entityVert,
        fragmentShader: entityFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uMorph: { value: 1 },
          uScatter: { value: 1 },
          uEnergy: { value: 0 },
          uSize: { value: 1.1 },
          uPointer: { value: new THREE.Vector3() },
          uPointerForce: { value: 0.25 },
          uColor: { value: new THREE.Color("#c3ccdf") },
          uColorHot: { value: new THREE.Color("#e8eefc") },
          uOpacity: { value: 0 },
        },
      }),
    []
  );

  useFrame(() => {
    const p = film.progress;
    const mid = (from + to) / 2;
    // 0 outside the window, 1 at its centre
    const inWin = 1 - Math.min(1, Math.abs(p - mid) / ((to - from) / 2));
    const w = Math.max(0, inWin);
    const win = w * w * (3 - 2 * w);
    material.uniforms.uTime.value = performance.now() / 1000;
    material.uniforms.uOpacity.value = win * 0.95;
    material.uniforms.uScatter.value = (1 - win) * 1.3 + film.energy * 0.4 + 0.02;
    material.uniforms.uEnergy.value = film.energy;
    material.uniforms.uPointer.value.set(film.px * 2, -film.py * 1.4, 0);
  });

  const ref = useRef<THREE.Points>(null);
  return <points ref={ref} geometry={geometry} material={material} position={position} raycast={() => null} />;
}

export default function WorldWords({ tier = 2 }: { tier?: number }) {
  const count = tier >= 2 ? 5200 : 2200;
  // chapter word, positioned opposite the orb's drift for composition
  return (
    <>
      <WordCloud text="THINK" from={0.11} to={0.21} position={[1.5, 0.3, -1]} size={5} count={count} />
      {/* BUILD word removed — the project universe itself carries the chapter */}
      <WordCloud text="STACK" from={0.38} to={0.48} position={[0, 1.4, -1.4]} size={4.6} count={count} />
      <WordCloud text="JOURNEY" from={0.52} to={0.63} position={[1.3, -0.3, -1]} size={4} count={count} />
      <WordCloud text="EXPLORE" from={0.67} to={0.77} position={[-1.4, 0.3, -1]} size={4} count={count} />
      <WordCloud text="NOW" from={0.81} to={0.9} position={[1.6, 0.2, -1]} size={5.4} count={count} />
    </>
  );
}
