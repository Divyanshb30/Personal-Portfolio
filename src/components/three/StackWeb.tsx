"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { stack, techProjects } from "@/lib/content";
import { film } from "@/lib/scroll";
import { orb } from "@/lib/orb";

/**
 * STACK — one living technological web. Every technology present at once in real
 * 3-D depth, clustered by capability (regions of one web, not sections). Nodes
 * breathe/pulse; edges are faint; the orb navigates and, on proximity, activates
 * a node and reveals the projects that use it ("USED IN N PROJECTS"). Ends with a
 * synchronized activation wave. Replaces the old Constellation.
 */

// capability cluster centers — asymmetric, in depth (rule 21)
const CLUSTERS: Record<string, [number, number, number]> = {
  BUILD: [-2.6, 0.6, 0.6],
  INTELLIGENCE: [0.2, 2.2, -1.2],
  RETRIEVAL: [2.6, 0.9, -0.4],
  SYSTEMS: [-1.9, -1.9, -0.8],
  APPLICATIONS: [2.2, -1.7, 0.7],
  INFRASTRUCTURE: [-0.2, -0.4, -2.6],
};
// cross-cluster links (a loose web, not a grid)
const LINKS: [string, string][] = [
  ["BUILD", "INTELLIGENCE"],
  ["INTELLIGENCE", "RETRIEVAL"],
  ["RETRIEVAL", "SYSTEMS"],
  ["SYSTEMS", "APPLICATIONS"],
  ["APPLICATIONS", "INFRASTRUCTURE"],
  ["INFRASTRUCTURE", "BUILD"],
  ["INTELLIGENCE", "SYSTEMS"],
];

type Node = { name: string; pos: THREE.Vector3; projects: number };

const nodeVert = /* glsl */ `
  uniform float uTime; uniform vec3 uOrb; uniform float uWave;
  attribute vec3 aRandom; attribute float aWave;
  varying float vAct;
  void main(){
    vec3 p = position + sin(uTime * 0.5 + aRandom * 6.283) * 0.035;
    float d = distance(p, uOrb);
    float near = smoothstep(2.2, 0.0, d);
    float wv = smoothstep(0.0, 0.12, uWave - aWave) * (1.0 - smoothstep(0.12, 0.4, uWave - aWave));
    vAct = max(near, wv);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (2.2 + vAct * 5.0) * (14.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const nodeFrag = /* glsl */ `
  uniform float uWindow; uniform vec3 uColor; uniform vec3 uHot;
  varying float vAct;
  void main(){
    vec2 uv = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(uv));
    if (a < 0.01) discard;
    vec3 col = mix(uColor, uHot, vAct);
    gl_FragColor = vec4(col, a * uWindow * (0.32 + vAct * 0.68));
  }
`;

export default function StackWeb() {
  const group = useRef<THREE.Group>(null);
  const [active, setActive] = useState<Node | null>(null);
  const activeName = useRef<string | null>(null);

  const { nodes, nodeGeo, nodeMat, lineGeo, lineMat, maxR } = useMemo(() => {
    const nodes: Node[] = [];
    const positions: number[] = [];
    const randoms: number[] = [];
    const waves: number[] = [];
    let maxR = 1;
    stack.forEach((cap) => {
      const c = CLUSTERS[cap.cap] ?? [0, 0, 0];
      cap.items.forEach((name, i) => {
        const a = (i / cap.items.length) * Math.PI * 2;
        const r = 0.55 + (i % 2) * 0.35;
        const pos = new THREE.Vector3(
          c[0] + Math.cos(a) * r,
          c[1] + Math.sin(a) * r * 0.85,
          c[2] + (Math.random() - 0.5) * 0.7
        );
        nodes.push({ name, pos, projects: (techProjects[name] ?? []).length });
        positions.push(pos.x, pos.y, pos.z);
        randoms.push(Math.random(), Math.random(), Math.random());
        maxR = Math.max(maxR, pos.length());
      });
    });
    // wave order by distance from centre (radiates outward)
    for (const n of nodes) waves.push(n.pos.length() / maxR);

    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    nodeGeo.setAttribute("aRandom", new THREE.Float32BufferAttribute(randoms, 3));
    nodeGeo.setAttribute("aWave", new THREE.Float32BufferAttribute(waves, 1));

    const nodeMat = new THREE.ShaderMaterial({
      vertexShader: nodeVert,
      fragmentShader: nodeFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uOrb: { value: new THREE.Vector3(99, 99, 99) },
        uWave: { value: -1 },
        uWindow: { value: 0 },
        uColor: { value: new THREE.Color("#8f99b4") },
        uHot: { value: new THREE.Color("#eef3ff") },
      },
    });

    // edges: within-cluster spokes + cross-cluster links
    const lines: number[] = [];
    stack.forEach((cap) => {
      const c = CLUSTERS[cap.cap] ?? [0, 0, 0];
      nodes
        .filter((n) => (techProjects[n.name] !== undefined || true) && cap.items.includes(n.name))
        .forEach((n) => lines.push(c[0], c[1], c[2], n.pos.x, n.pos.y, n.pos.z));
    });
    LINKS.forEach(([a, b]) => {
      const ca = CLUSTERS[a], cb = CLUSTERS[b];
      if (ca && cb) lines.push(ca[0], ca[1], ca[2], cb[0], cb[1], cb[2]);
    });
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: "#454d60", transparent: true, opacity: 0 });

    return { nodes, nodeGeo, nodeMat, lineGeo, lineMat, maxR };
  }, []);

  useFrame((_, delta) => {
    const p = film.progress;
    const win =
      THREE.MathUtils.smoothstep(p, 0.375, 0.42) * (1 - THREE.MathUtils.smoothstep(p, 0.52, 0.56));
    nodeMat.uniforms.uTime.value = performance.now() / 1000;
    nodeMat.uniforms.uWindow.value = win;
    nodeMat.uniforms.uOrb.value.copy(orb.pos);
    lineMat.opacity = win * 0.16;

    // final synchronized wave near the end of STACK
    const waveP = THREE.MathUtils.smoothstep(p, 0.5, 0.55);
    nodeMat.uniforms.uWave.value = waveP > 0 ? waveP * 1.4 : -1;

    if (group.current) group.current.visible = win > 0.001;

    // nearest node to the orb -> contextual label (throttled to changes)
    if (win > 0.2) {
      let near: Node | null = null;
      let nd = 2.0;
      for (const n of nodes) {
        const d = orb.pos.distanceTo(n.pos);
        if (d < nd) { nd = d; near = n; }
      }
      const name = near?.name ?? null;
      if (name !== activeName.current) {
        activeName.current = name;
        setActive(near);
      }
    } else if (activeName.current) {
      activeName.current = null;
      setActive(null);
    }
    void delta;
    void maxR;
  });

  return (
    <group ref={group} visible={false}>
      <points geometry={nodeGeo} material={nodeMat} raycast={() => null} />
      <lineSegments geometry={lineGeo} material={lineMat} raycast={() => null} />
      {active && (
        <group position={[active.pos.x, active.pos.y + 0.4, active.pos.z]}>
          <Billboard>
            <Text fontSize={0.24} color="#eef3ff" anchorX="center" anchorY="middle" letterSpacing={0.02}>
              {active.name}
            </Text>
            {active.projects > 0 && (
              <Text position={[0, -0.28, 0]} fontSize={0.1} color="#9aa4bd" anchorX="center" anchorY="middle" letterSpacing={0.24}>
                {`USED IN ${active.projects} PROJECT${active.projects > 1 ? "S" : ""}`}
              </Text>
            )}
          </Billboard>
        </group>
      )}
    </group>
  );
}
