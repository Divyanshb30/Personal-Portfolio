"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { MeshSurfaceSampler } from "three-stdlib";
import { sphere } from "@/lib/targets";

const URL = "/models/divyansh.glb";

/**
 * Loads the (draco-compressed) character GLB and samples its surface into a
 * point cloud — the "human" target the entity forms from and disintegrates into.
 * Suspends until loaded, so the entity always has it on first render.
 */
export function useHumanTarget(count: number): Float32Array {
  const { scene } = useGLTF(URL, true) as unknown as { scene: THREE.Group };

  return useMemo(() => {
    scene.updateWorldMatrix(true, true);
    let best: THREE.Mesh | null = null;
    let bestCount = 0;
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.geometry?.attributes?.position) {
        const c = m.geometry.attributes.position.count;
        if (c > bestCount) {
          bestCount = c;
          best = m;
        }
      }
    });
    if (!best) return sphere(count, 1.55);

    const mesh = best as THREE.Mesh;
    const sampler = new MeshSurfaceSampler(mesh).build();
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const scale = 2.9 / (size.y || 1);

    const arr = new Float32Array(count * 3);
    const p = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      sampler.sample(p);
      p.applyMatrix4(mesh.matrixWorld).sub(center).multiplyScalar(scale);
      arr[i * 3] = p.x;
      arr[i * 3 + 1] = p.y;
      arr[i * 3 + 2] = p.z;
    }
    return arr;
  }, [scene, count]);
}

useGLTF.preload(URL, true);
