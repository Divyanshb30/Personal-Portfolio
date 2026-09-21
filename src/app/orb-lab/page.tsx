"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { Text } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { entityVert, entityFrag } from "@/components/three/shaders/entityShaders";
import { sphere, randoms } from "@/lib/targets";

type Variant = {
  id: string;
  name: string;
  color: string;
  hot: string;
  blending: THREE.Blending;
  opacity: number;
  size: number;
  count: number;
  pos: [number, number];
};

// 01 is the early orange + white-glow version you referenced. One shared bloom
// pass; the glow differences come from additive vs normal blending + opacity.
const VARIANTS: Variant[] = [
  { id: "01", name: "EMBER GLOW", color: "#c85f2b", hot: "#ffe0b0", blending: THREE.AdditiveBlending, opacity: 0.5, size: 1.7, count: 16000, pos: [-3.7, 2.1] },
  { id: "02", name: "EMBER DUST", color: "#c85f2b", hot: "#ffab5e", blending: THREE.NormalBlending, opacity: 0.85, size: 1.5, count: 18000, pos: [0, 2.1] },
  { id: "03", name: "MOLTEN CORE", color: "#a83612", hot: "#ffcf70", blending: THREE.AdditiveBlending, opacity: 0.38, size: 1.6, count: 18000, pos: [3.7, 2.1] },
  { id: "04", name: "SOLAR", color: "#ff7a2e", hot: "#fff0d6", blending: THREE.AdditiveBlending, opacity: 0.44, size: 1.8, count: 16000, pos: [-3.7, -2.3] },
  { id: "05", name: "SPARSE EMBER", color: "#cf6a2e", hot: "#ffb066", blending: THREE.NormalBlending, opacity: 0.95, size: 2.6, count: 7000, pos: [0, -2.3] },
  { id: "06", name: "COOL SIGNAL", color: "#9ba3b8", hot: "#dbe2f4", blending: THREE.NormalBlending, opacity: 0.85, size: 1.5, count: 18000, pos: [3.7, -2.3] },
];

function Orb({ v }: { v: Variant }) {
  const pts = useMemo(() => sphere(v.count, 1.2), [v.count]);
  const rnd = useMemo(() => randoms(v.count), [v.count]);
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
        blending: v.blending,
        uniforms: {
          uTime: { value: 0 },
          uMorph: { value: 1 },
          uScatter: { value: 0.06 },
          uEnergy: { value: 0 },
          uSize: { value: v.size },
          uPointer: { value: new THREE.Vector3(99, 99, 0) },
          uPointerForce: { value: 0 },
          uColor: { value: new THREE.Color(v.color) },
          uColorHot: { value: new THREE.Color(v.hot) },
          uOpacity: { value: v.opacity },
        },
      }),
    [v]
  );
  const ref = useRef<THREE.Points>(null);
  useFrame((s, dt) => {
    material.uniforms.uTime.value = s.clock.elapsedTime;
    if (ref.current) ref.current.rotation.y += dt * 0.3;
  });
  return (
    <group position={[v.pos[0], v.pos[1], 0]}>
      <points ref={ref} geometry={geometry} material={material} />
      <Text position={[0, -1.65, 0]} fontSize={0.2} color="#cfcfcf" anchorX="center" anchorY="middle" letterSpacing={0.12}>
        {v.id + "  " + v.name}
      </Text>
    </group>
  );
}

export default function OrbLab() {
  return (
    <main className="relative min-h-[100dvh] bg-[#060608]">
      <div className="pointer-events-none absolute left-6 top-6 z-10 md:left-10 md:top-8">
        <h1 className="font-mono text-[12px] uppercase tracking-[0.3em] text-white/70">Orb lab — pick a version</h1>
        <p className="mt-2 max-w-[52ch] text-[12.5px] leading-relaxed text-white/45">
          Six treatments of the entity, in the production shader. Tell me a number and I&rsquo;ll make it the orb.
        </p>
      </div>
      <div className="h-[100dvh] w-full">
        <Canvas dpr={[1, 1.7]} camera={{ position: [0, 0, 12], fov: 44 }} gl={{ alpha: false, toneMapping: THREE.NeutralToneMapping }}>
          <color attach="background" args={["#060608"]} />
          {VARIANTS.map((v) => (
            <Orb key={v.id} v={v} />
          ))}
          <EffectComposer>
            <Bloom intensity={1.05} luminanceThreshold={0.32} luminanceSmoothing={0.88} mipmapBlur radius={0.7} />
            <Vignette offset={0.35} darkness={0.85} />
          </EffectComposer>
        </Canvas>
      </div>
    </main>
  );
}
