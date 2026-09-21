"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { film } from "@/lib/scroll";

const URL = "/models/divyansh.glb";

/**
 * The real, solid character — appears ONLY at the very end (HUMAN). As the dust
 * reconstructs the figure, the actual GLB fades in over it (particles → real
 * human), then a slow scroll-driven 360°. Invisible and idle the rest of the film.
 */
export default function CharacterFigure() {
  const { scene } = useGLTF(URL, true) as unknown as { scene: THREE.Group };

  // clone + normalize to ~height 2.9, centred — matches the dust figure
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const s = 2.9 / (size.y || 1);
    clone.scale.setScalar(s);
    clone.position.set(-center.x * s, -center.y * s, -center.z * s);
    clone.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.transparent = true;
          mat.opacity = 0;
          mat.depthWrite = false;
        }
      }
    });
    return clone;
  }, [scene]);

  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    const p = film.progress;
    const vis = THREE.MathUtils.smoothstep(p, 0.955, 0.99); // fade in over the reconstruction
    if (group.current) {
      group.current.visible = vis > 0.002;
      // scroll-driven 360 across the last stretch + a touch of idle drift
      const spin = THREE.MathUtils.smoothstep(p, 0.955, 1.0) * Math.PI * 2;
      group.current.rotation.y = spin + Math.sin(performance.now() / 4000) * 0.05;
    }
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat) mat.opacity = vis;
      }
    });
  });

  return (
    <group ref={group} position={[0, -0.1, 0]} visible={false}>
      {/* finale key + rim so the figure reads out of the dark */}
      <directionalLight position={[3, 4, 5]} intensity={2.2} color="#fff2e6" />
      <directionalLight position={[-4, 1, -3]} intensity={1.2} color="#9db8ff" />
      <primitive object={model} />
    </group>
  );
}
