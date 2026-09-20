"use client";

import { Sparkles } from "@react-three/drei";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { film } from "@/lib/scroll";

/**
 * The world's atmosphere: two drifting dust bands (MICRO motion — always alive)
 * plus a few faint distant structures for parallax depth (secondary objects,
 * near-black, felt more than seen). Material-driven near-black: cool white light.
 */
export default function Atmosphere({ tier = 2 }: { tier?: number }) {
  const near = useRef<THREE.Group>(null);
  const far = useRef<THREE.Group>(null);
  const structs = useRef<THREE.Group>(null);
  const d = tier >= 2 ? 1 : 0.55;

  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#0b0b0e", roughness: 0.85, metalness: 0.4, flatShading: true }),
    []
  );
  const ring = useMemo(() => new THREE.TorusGeometry(1, 0.02, 12, 80), []);
  const slab = useMemo(() => new THREE.BoxGeometry(1, 1.6, 0.04), []);

  useFrame((_, delta) => {
    const p = film.progress;
    if (near.current) {
      near.current.position.z = 2 + p * 4;
      near.current.rotation.y += delta * 0.01;
    }
    if (far.current) far.current.position.z = -8 + p * 3;
    if (structs.current) {
      structs.current.position.y = p * -3;
      structs.current.rotation.y += delta * 0.006;
      structs.current.children.forEach((c, i) => (c.rotation.z += delta * (0.01 + i * 0.004)));
    }
  });

  return (
    <>
      <group ref={near} />
      <group ref={far}>
        <Sparkles count={Math.round(70 * d)} scale={[34, 22, 14]} size={0.7} speed={0.04} opacity={0.08} noise={0.5} color="#8f95a8" />
      </group>
      <group ref={structs}>
        <mesh geometry={ring} material={mat} position={[-11, 4, -18]} scale={5} />
        <mesh geometry={ring} material={mat} position={[12, -5, -22]} scale={7} rotation={[1, 0.4, 0]} />
        <mesh geometry={slab} material={mat} position={[9, 5, -15]} scale={4} />
        <mesh geometry={slab} material={mat} position={[-13, -6, -26]} scale={6} rotation={[0, 0.6, 0.3]} />
      </group>
    </>
  );
}
