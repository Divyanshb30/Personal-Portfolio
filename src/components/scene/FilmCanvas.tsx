"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import World from "@/components/three/World";

/** One persistent WebGL canvas behind the whole film. Fixed, pointer-transparent. */
export default function FilmCanvas() {
  const { tier, reduce, dpr } = useMemo(() => {
    if (typeof window === "undefined") return { tier: 2, reduce: false, dpr: [1, 1.6] as [number, number] };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 768px)").matches;
    const cores = navigator.hardwareConcurrency ?? 4;
    const weak = mobile || cores <= 4;
    return {
      tier: weak ? 1 : 2,
      reduce,
      dpr: (weak ? [1, 1.3] : [1, 1.8]) as [number, number],
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        dpr={dpr}
        camera={{ position: [0, 0.35, 9.2], fov: 42 }}
        gl={{
          antialias: tier >= 2,
          alpha: false,
          powerPreference: "high-performance",
          toneMapping: THREE.NeutralToneMapping,
          toneMappingExposure: 1,
        }}
      >
        <Suspense fallback={null}>
          <World tier={tier} reduce={reduce} />
        </Suspense>
      </Canvas>
    </div>
  );
}
