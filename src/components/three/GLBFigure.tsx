"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { film } from "@/lib/scroll";

const URL = "/models/divyansh.glb";

/**
 * The finale (HUMAN): the real solid figure cross-fades in as the dust entity
 * fades out, then rotates slowly (the 360°). Centered at origin so it overlaps
 * the reconstructing particle human.
 */
export default function GLBFigure() {
  const { scene } = useGLTF(URL, true) as unknown as { scene: THREE.Group };

  const fig = useMemo(() => {
    const s = scene.clone(true);
    const box = new THREE.Box3().setFromObject(s);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 2.9 / (size.y || 1);
    s.scale.setScalar(scale);
    s.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    const mats: THREE.MeshStandardMaterial[] = [];
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        const mat = (m.material as THREE.MeshStandardMaterial).clone();
        mat.transparent = true;
        mat.opacity = 0;
        m.material = mat;
        mats.push(mat);
      }
    });
    return { s, mats };
  }, [scene]);

  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const p = film.progress;
    const vis = THREE.MathUtils.smoothstep(p, 0.95, 0.99);
    for (const m of fig.mats) m.opacity = vis;
    if (group.current) {
      group.current.visible = vis > 0.001;
      const spin = THREE.MathUtils.smoothstep(p, 0.95, 1.0);
      group.current.rotation.y += delta * 0.28 * spin;
    }
  });

  return (
    <group ref={group} visible={false}>
      <primitive object={fig.s} />
    </group>
  );
}

useGLTF.preload(URL, true);
