"use client";

import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { film } from "@/lib/scroll";

/**
 * The grade. Bloom lifts the luminous entity; chromatic aberration is
 * PUNCTUATION — near-zero at rest, opens with scroll velocity (signal breakup),
 * then settles. Never an always-on filter.
 */
export default function Post({ tier = 2 }: { tier?: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ca = useRef<any>(null);
  const offset = useRef(new THREE.Vector2(0, 0));

  useFrame(() => {
    const e = film.energy;
    const amt = 0.0004 + e * e * 0.006;
    offset.current.set(amt, amt * 0.6);
    if (ca.current) ca.current.offset = offset.current;
  });

  return (
    <EffectComposer multisampling={tier >= 2 ? 2 : 0}>
      <Bloom intensity={0.4} luminanceThreshold={0.72} luminanceSmoothing={0.85} mipmapBlur radius={0.55} />
      <ChromaticAberration ref={ca} offset={offset.current} radialModulation={false} modulationOffset={0} blendFunction={BlendFunction.NORMAL} />
      <Vignette offset={0.3} darkness={0.98} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.18} />
    </EffectComposer>
  );
}
