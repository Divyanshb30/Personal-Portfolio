"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { film } from "@/lib/scroll";
import { stack } from "@/lib/content";

/**
 * STACK — the machinery underneath. Capability-grouped tech nodes form a cold
 * constellation orbiting the warm orb: each capability is a cluster, nodes link
 * to their cluster centre and the centres link to the core. Fades in over the
 * stack chapter; the DOM legend names the capabilities.
 */
function roundSprite(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.5, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}

export default function Constellation() {
  const group = useRef<THREE.Group>(null);

  const { nodeGeo, lineGeo, nodeMat, lineMat } = useMemo(() => {
    const nodes: number[] = [];
    const lines: number[] = [];
    const ring = 3.1;
    const capCenters: THREE.Vector3[] = [];
    stack.forEach((cap, ci) => {
      const ang = (ci / stack.length) * Math.PI * 2;
      const cc = new THREE.Vector3(Math.cos(ang) * ring, (ci % 2 ? 0.7 : -0.7), Math.sin(ang) * ring - 0.5);
      capCenters.push(cc);
      lines.push(0, 0.2, 0, cc.x, cc.y, cc.z); // centre -> cluster
      cap.items.forEach((_, ii) => {
        const a = (ii / cap.items.length) * Math.PI * 2;
        const r = 0.5 + (ii % 2) * 0.25;
        const n = new THREE.Vector3(cc.x + Math.cos(a) * r, cc.y + Math.sin(a) * r * 0.8, cc.z + (Math.random() - 0.5) * 0.5);
        nodes.push(n.x, n.y, n.z);
        lines.push(cc.x, cc.y, cc.z, n.x, n.y, n.z); // cluster -> node
      });
    });
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.Float32BufferAttribute(nodes, 3));
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
    const nodeMat = new THREE.PointsMaterial({
      size: 0.16,
      map: roundSprite(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: new THREE.Color("#aebbd6"),
    });
    const lineMat = new THREE.LineBasicMaterial({ color: "#4a5164", transparent: true, opacity: 0 });
    return { nodeGeo, lineGeo, nodeMat, lineMat };
  }, []);

  useFrame((_, delta) => {
    const p = film.progress;
    // fade over the stack window
    const o = THREE.MathUtils.smoothstep(p, 0.37, 0.41) * (1 - THREE.MathUtils.smoothstep(p, 0.48, 0.51));
    nodeMat.opacity = o * 0.95;
    lineMat.opacity = o * 0.32;
    if (group.current) {
      group.current.visible = o > 0.001;
      group.current.rotation.y += delta * 0.05;
      group.current.position.y = 0.2;
    }
  });

  return (
    <group ref={group} visible={false}>
      <points geometry={nodeGeo} material={nodeMat} raycast={() => null} />
      <lineSegments geometry={lineGeo} material={lineMat} raycast={() => null} />
    </group>
  );
}
