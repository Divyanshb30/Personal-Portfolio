"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { sigVert, sigFrag } from "./shaders/signatureShaders";
import { randoms } from "@/lib/targets";
import { builds } from "@/lib/content";
import { film, journeyDepth } from "@/lib/scroll";
import { orb } from "@/lib/orb";
import { director, selectProject, setHovered, FOCUS_POS } from "@/lib/director";

/**
 * BUILD — the project universe. Five small, asymmetric, ALIVE artifacts scattered
 * in depth around the wandering orb. Each has a distinct signature motion. The
 * orb notices them (curiosity); proximity/hover grade them idle→aware→focused;
 * related projects brighten; clicking dives into the project world. The orb stays
 * the primary entity — these are mysterious artifacts, not a menu.
 */

type Kind = 0 | 1 | 2 | 3 | 4; // chain, attention, streams, field, ecosystem
const rand = (a: number, b: number) => a + Math.random() * (b - a);

// asymmetric layout: varied x / y / z-depth / scale (rules 3, 4)
const SIG: Record<string, { kind: Kind; pos: [number, number, number]; scale: number; count: number }> = {
  gpt: { kind: 1, pos: [-1.3, 2.0, -1.4], scale: 0.62, count: 1.0 }, // attention, high mid-depth
  dtu: { kind: 4, pos: [-2.9, 0.1, 0.9], scale: 0.64, count: 0.7 }, // ecosystem, near-left
  agentic: { kind: 0, pos: [1.8, -0.5, -0.8], scale: 0.62, count: 0.6 }, // chain, low-center deeper
  loan: { kind: 2, pos: [-3.3, -1.9, -2.3], scale: 0.5, count: 0.7 }, // streams, far-left small
  rag: { kind: 3, pos: [3.0, 1.2, -2.6], scale: 0.82, count: 1.2 }, // field, far-right large/faint
};

function shape(kind: Kind, n: number): Float32Array {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0, z = 0;
    if (kind === 0) {
      const t = i / (n - 1);
      x = (t - 0.5) * 2.2;
      y = Math.sin(t * Math.PI) * 0.12 + rand(-0.06, 0.06);
      z = rand(-0.06, 0.06);
    } else if (kind === 1) {
      const cols = Math.ceil(Math.sqrt(n));
      x = ((i % cols) / (cols - 1) - 0.5) * 2.0;
      y = (Math.floor(i / cols) / (cols - 1) - 0.5) * 2.0;
      z = rand(-0.15, 0.15);
    } else if (kind === 2) {
      const lanes = 5;
      const lane = i % lanes;
      x = rand(-1.15, 1.15);
      y = (lane / (lanes - 1) - 0.5) * 1.5 + (Math.random() < 0.06 ? rand(-0.5, 0.5) : 0);
      z = rand(-0.1, 0.1);
    } else if (kind === 3) {
      const r = Math.cbrt(Math.random()) * 1.2;
      const th = Math.random() * Math.PI * 2;
      x = Math.cos(th) * r;
      y = Math.sin(th) * r * 0.85;
      z = rand(-0.25, 0.25);
    } else {
      const nodes = 6;
      const na = ((i % nodes) / nodes) * Math.PI * 2;
      x = Math.cos(na) * 0.9 + rand(-0.26, 0.26);
      y = Math.sin(na) * 0.9 + rand(-0.26, 0.26);
      z = rand(-0.2, 0.2);
    }
    a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
  }
  return a;
}

function Signature({
  id, kind, pos, scale, count, title, rel, windowRef,
}: {
  id: string; kind: Kind; pos: [number, number, number]; scale: number; count: number;
  title: string; rel: string[]; windowRef: { v: number };
}) {
  const [hover, setHover] = useState(false);
  const outer = useRef<THREE.Group>(null);
  const worldPos = useMemo(() => new THREE.Vector3(...pos), [pos]);
  const focusOffset = useMemo(() => FOCUS_POS.clone().sub(worldPos), [worldPos]);
  const localOrb = useRef(new THREE.Vector3());

  const geometry = useMemo(() => {
    const s = shape(kind, count);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(s, 3));
    g.setAttribute("aRandom", new THREE.BufferAttribute(randoms(count), 3));
    return g;
  }, [kind, count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: sigVert,
        fragmentShader: sigFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        uniforms: {
          uTime: { value: 0 },
          uActivity: { value: 0 },
          uSize: { value: 1.7 },
          uKind: { value: kind },
          uOrbLocal: { value: new THREE.Vector3() },
          uColor: { value: new THREE.Color("#8f99b4") },
          uColorHot: { value: new THREE.Color("#eef3ff") },
          uOpacity: { value: 0 },
        },
      }),
    [kind]
  );

  const titleRef = useRef<THREE.Group>(null);
  const openRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const win = windowRef.v;
    const selected = director.selected;
    const focus = selected === id;
    const otherSelected = !!selected && !focus;

    // proximity: the orb near, or the orb investigating this one, or pointer hover
    const d = orb.pos.distanceTo(worldPos);
    const near = THREE.MathUtils.smoothstep(3.0 - d, 0, 3.0);
    const investigated = orb.focusId === id ? 0.6 : 0;
    // related projects brighten when a sibling is focused
    const focusedOther = director.hovered && director.hovered !== id;
    const relatedBoost = focusedOther && rel.includes(director.hovered as string) ? 0.35 : 0;
    let intensity = Math.min(1, Math.max(near, investigated, hover ? 1 : 0) + relatedBoost);
    if (focus) intensity = 1;

    let opacity = win * (0.34 + intensity * 0.62);
    if (focus) opacity = 1;
    else if (otherSelected) opacity = 0.05;

    material.uniforms.uTime.value = performance.now() / 1000;
    material.uniforms.uActivity.value = intensity;
    material.uniforms.uOpacity.value = opacity;
    localOrb.current.copy(orb.pos).sub(worldPos).divideScalar(scale);
    material.uniforms.uOrbLocal.value.copy(localOrb.current);

    if (outer.current) {
      const k = 1 - Math.pow(0.002, 1 / 60);
      const s = focus ? 2.4 : scale * (1 + (hover ? 0.12 : 0) + intensity * 0.06);
      outer.current.scale.x += (s - outer.current.scale.x) * k;
      outer.current.scale.y += (s - outer.current.scale.y) * k;
      outer.current.scale.z += (s - outer.current.scale.z) * k;
      // focus: dive to a consistent framing spot; exit: contract back to its place
      const tx = focus ? focusOffset.x : 0;
      const ty = focus ? focusOffset.y : 0;
      const tz = focus ? focusOffset.z : 0;
      outer.current.position.x += (tx - outer.current.position.x) * k;
      outer.current.position.y += (ty - outer.current.position.y) * k;
      outer.current.position.z += (tz - outer.current.position.z) * k;
      outer.current.visible = win > 0.001 || focus;
      outer.current.rotation.y += 0.0015 + intensity * 0.004;
    }
    // AWARE: title clarifies; FOCUSED: OPEN cue. Hidden in the focused world (DOM shows it).
    // Gate by `win` too — titles belong to BUILD; without this they leak whenever the
    // orb drifts near a signature in a later chapter (e.g. at the JOURNEY threshold).
    if (titleRef.current) titleRef.current.visible = !focus && intensity > 0.34 && win > 0.05;
    if (openRef.current) openRef.current.visible = !focus && intensity > 0.7 && win > 0.05;

    // report which project the orb is investigating (for relationships / brightening)
    if (near > 0.62 && !selected) setHovered(id);
    else if (director.hovered === id && !hover && near <= 0.62) setHovered(null);
  });

  return (
    <group position={pos}>
      <group ref={outer} scale={scale} visible={false}>
        <points geometry={geometry} material={material} raycast={() => null} />
      </group>

      {/* hit-proxy — hover + dive-click, only active in BUILD */}
      <mesh
        onPointerOver={(e) => {
          if (windowRef.v < 0.25 && director.selected !== id) return;
          e.stopPropagation();
          setHover(true);
          setHovered(id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          if (windowRef.v < 0.25) return;
          e.stopPropagation();
          orb.vel.addScaledVector(worldPos.clone().sub(orb.pos).normalize(), 4); // dive kick
          selectProject(id);
        }}
      >
        <sphereGeometry args={[1.4 * scale + 0.4, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <group ref={titleRef} visible={false} position={[0, scale * 1.6 + 0.5, 0]}>
        <Billboard>
          <Text fontSize={0.28} color="#eef3ff" anchorX="center" anchorY="middle" letterSpacing={0.02}>
            {title}
          </Text>
        </Billboard>
      </group>
      <group ref={openRef} visible={false} position={[0, scale * 1.6 + 0.18, 0]}>
        <Billboard>
          <Text fontSize={0.11} color="#9aa4bd" anchorX="center" anchorY="middle" letterSpacing={0.28}>
            OPEN
          </Text>
        </Billboard>
      </group>
    </group>
  );
}

// relationship flow — faint points streaming from a focused project to a relative
const flowVert = /* glsl */ `
  attribute float aT; uniform vec3 uFrom; uniform vec3 uTo; uniform float uT;
  void main(){ float t = fract(aT + uT); vec3 p = mix(uFrom, uTo, t);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = 2.4 * (14.0 / -mv.z); gl_Position = projectionMatrix * mv; }
`;
const flowFrag = /* glsl */ `
  uniform float uOpacity; uniform vec3 uColor;
  void main(){ vec2 uv = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(uv));
    if (a < 0.01) discard; gl_FragColor = vec4(uColor, a * uOpacity); }
`;

function Flow({ from, to, activeId }: { from: THREE.Vector3; to: THREE.Vector3; activeId: string }) {
  const N = 18;
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const aT = new Float32Array(N);
    for (let i = 0; i < N; i++) aT[i] = i / N;
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute("aT", new THREE.BufferAttribute(aT, 1));
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: flowVert,
        fragmentShader: flowFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uFrom: { value: from },
          uTo: { value: to },
          uT: { value: 0 },
          uOpacity: { value: 0 },
          uColor: { value: new THREE.Color("#c6d0e6") },
        },
      }),
    [from, to]
  );
  useFrame((_, d) => {
    mat.uniforms.uT.value += d * 0.22;
    const active = director.hovered === activeId || director.selected === activeId;
    mat.uniforms.uOpacity.value += ((active ? 0.55 : 0) - mat.uniforms.uOpacity.value) * 0.08;
  });
  return <points geometry={geo} material={mat} raycast={() => null} />;
}

export default function ProjectUniverse({ tier = 2 }: { tier?: number }) {
  const base = tier >= 2 ? 1300 : 650;
  const windowRef = useRef({ v: 0 });
  const root = useRef<THREE.Group>(null);

  // give the orb the projects to notice (curiosity steering)
  useEffect(() => {
    orb.neighbors = builds
      .filter((b) => SIG[b.id as string])
      .map((b) => ({ id: b.id as string, pos: new THREE.Vector3(...SIG[b.id as string].pos) }));
    return () => {
      orb.neighbors = [];
    };
  }, []);

  useFrame(() => {
    const p = film.progress;
    windowRef.current.v =
      THREE.MathUtils.smoothstep(p, 0.23, 0.26) * (1 - THREE.MathUtils.smoothstep(p, 0.36, 0.4));
    // during the JOURNEY drift the camera looks into the origin region — hide the
    // whole universe (its titles show on orb-proximity regardless of the window).
    if (root.current) root.current.visible = journeyDepth(p) < 0.02;
  });

  // relationship connections: from each project to its related work
  const connections = useMemo(() => {
    const out: { from: THREE.Vector3; to: THREE.Vector3; activeId: string; key: string }[] = [];
    for (const b of builds) {
      const s = SIG[b.id as string];
      if (!s) continue;
      for (const r of (b.rel as string[]) ?? []) {
        const t = SIG[r];
        if (!t) continue;
        out.push({
          from: new THREE.Vector3(...s.pos),
          to: new THREE.Vector3(...t.pos),
          activeId: b.id as string,
          key: `${b.id}-${r}`,
        });
      }
    }
    return out;
  }, []);

  return (
    <group ref={root}>
      {builds.map((b) => {
        const sig = SIG[b.id as string];
        if (!sig) return null;
        return (
          <Signature
            key={b.id}
            id={b.id as string}
            kind={sig.kind}
            pos={sig.pos}
            scale={sig.scale}
            count={Math.round(base * sig.count)}
            title={b.title}
            rel={(b.rel as string[]) ?? []}
            windowRef={windowRef.current}
          />
        );
      })}
      {connections.map((c) => (
        <Flow key={c.key} from={c.from} to={c.to} activeId={c.activeId} />
      ))}
    </group>
  );
}
