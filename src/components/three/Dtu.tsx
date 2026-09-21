"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { film } from "@/lib/scroll";

/**
 * DTU ERP as a documentary (inside JOURNEY): one tiny problem that keeps
 * revealing bigger ones until it becomes a departmental ecosystem, then fills
 * with 2,000+ people. Recreates the evolution, not the artifact. The stage
 * captions live in the DOM (Overlay journey beat); this is the growing world.
 *
 * Local progress d spans the journey window (~0.50–0.66):
 *   d 0.0–0.6  the ecosystem branches out (nodes reveal in order)
 *   d 0.45–1.0 people stream in (2,000+ user particles)
 */
function sprite(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.5, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// the ecosystem's growth order (accreditation is the seed)
const BRANCHES = ["ACCREDITATION", "DOCUMENTS", "STUDENTS", "FACULTY", "RESEARCH", "COMMUNITY"];

export default function Dtu({ tier = 2 }: { tier?: number }) {
  const group = useRef<THREE.Group>(null);

  const built = useMemo(() => {
    const nodePos: number[] = [];
    const nodeOrder: number[] = [];
    const lines: number[] = [];
    const root = new THREE.Vector3(0, 0.1, 0);
    nodePos.push(root.x, root.y, root.z);
    nodeOrder.push(0);
    BRANCHES.forEach((_, bi) => {
      if (bi === 0) return; // accreditation is the root
      const ang = (bi / (BRANCHES.length - 1)) * Math.PI * 2;
      const c = new THREE.Vector3(Math.cos(ang) * 1.9, Math.sin(ang) * 1.3, (Math.random() - 0.5) * 0.6);
      const order = bi / BRANCHES.length;
      nodePos.push(c.x, c.y, c.z);
      nodeOrder.push(order);
      lines.push(root.x, root.y, root.z, c.x, c.y, c.z, order);
      // sub-nodes hanging off each branch
      for (let s = 0; s < 3; s++) {
        const sa = ang + (s - 1) * 0.5;
        const sp = new THREE.Vector3(c.x + Math.cos(sa) * 0.7, c.y + Math.sin(sa) * 0.6, c.z + (Math.random() - 0.5) * 0.5);
        nodePos.push(sp.x, sp.y, sp.z);
        nodeOrder.push(order + 0.05);
        lines.push(c.x, c.y, c.z, sp.x, sp.y, sp.z, order + 0.05);
      }
    });

    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.Float32BufferAttribute(nodePos, 3));
    nodeGeo.setAttribute("aOrder", new THREE.Float32BufferAttribute(nodeOrder, 1));

    // line geometry with a per-vertex order (both endpoints share the segment order)
    const linePos: number[] = [];
    const lineOrder: number[] = [];
    for (let i = 0; i < lines.length; i += 7) {
      linePos.push(lines[i], lines[i + 1], lines[i + 2], lines[i + 3], lines[i + 4], lines[i + 5]);
      lineOrder.push(lines[i + 6], lines[i + 6]);
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
    lineGeo.setAttribute("aOrder", new THREE.Float32BufferAttribute(lineOrder, 1));

    // people cloud — 2,000+ users
    const n = tier >= 2 ? 2200 : 900;
    const people = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 3.4 * Math.cbrt(Math.random());
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      people[i * 3] = r * Math.sin(ph) * Math.cos(th);
      people[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.7;
      people[i * 3 + 2] = r * Math.cos(ph);
    }
    const peopleGeo = new THREE.BufferGeometry();
    peopleGeo.setAttribute("position", new THREE.Float32BufferAttribute(people, 3));

    const tex = sprite();
    const revealVert = /* glsl */ `
      attribute float aOrder; uniform float uReveal; varying float vOn;
      void main(){ vOn = step(aOrder, uReveal); vec4 mv = modelViewMatrix*vec4(position,1.0);
        gl_PointSize = 0.18 * (300.0/-mv.z); gl_Position = projectionMatrix*mv; }`;
    const revealFrag = /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity; varying float vOn;
      void main(){ vec2 uv=gl_PointCoord-0.5; float a=smoothstep(0.5,0.0,length(uv));
        if(a<0.01||vOn<0.5) discard; gl_FragColor=vec4(uColor,a*uOpacity); }`;
    const nodeMat = new THREE.ShaderMaterial({
      vertexShader: revealVert, fragmentShader: revealFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uReveal: { value: 0 }, uColor: { value: new THREE.Color("#c6d0e6") }, uOpacity: { value: 0 } },
    });
    const lineMat = new THREE.ShaderMaterial({
      vertexShader: `attribute float aOrder; uniform float uReveal; varying float vOn;
        void main(){ vOn=step(aOrder,uReveal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying float vOn;
        void main(){ if(vOn<0.5) discard; gl_FragColor=vec4(uColor,uOpacity);}`,
      transparent: true, uniforms: { uReveal: { value: 0 }, uColor: { value: new THREE.Color("#5a6478") }, uOpacity: { value: 0 } },
    });
    const peopleMat = new THREE.PointsMaterial({ size: 0.05, map: tex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color("#d7c2a6") });

    return { nodeGeo, lineGeo, peopleGeo, nodeMat, lineMat, peopleMat };
  }, [tier]);

  useFrame((_, delta) => {
    const p = film.progress;
    const d = THREE.MathUtils.clamp((p - 0.5) / 0.15, 0, 1);
    const win = THREE.MathUtils.smoothstep(p, 0.5, 0.53) * (1 - THREE.MathUtils.smoothstep(p, 0.63, 0.66));
    const reveal = THREE.MathUtils.smoothstep(d, 0.0, 0.7);
    const people = THREE.MathUtils.smoothstep(d, 0.45, 1.0);

    built.nodeMat.uniforms.uReveal.value = reveal;
    built.nodeMat.uniforms.uOpacity.value = win * 0.95;
    built.lineMat.uniforms.uReveal.value = reveal;
    built.lineMat.uniforms.uOpacity.value = win * 0.28;
    built.peopleMat.opacity = win * people * 0.7;

    if (group.current) {
      group.current.visible = win > 0.001;
      group.current.rotation.y += delta * 0.06;
    }
  });

  return (
    <group ref={group} visible={false} position={[0.4, 0.2, 0]}>
      <lineSegments geometry={built.lineGeo} material={built.lineMat} raycast={() => null} />
      <points geometry={built.nodeGeo} material={built.nodeMat} raycast={() => null} />
      <points geometry={built.peopleGeo} material={built.peopleMat} raycast={() => null} />
    </group>
  );
}
