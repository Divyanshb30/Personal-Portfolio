"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { film, journeyDepth, journeyLocal } from "@/lib/scroll";
import { journey as journeyData, research } from "@/lib/content";

/**
 * JOURNEY — the orb-POV memory drift.
 *
 * The camera (Rig) becomes the orb and eases to a near-still drift station looking
 * down −Z into the dark. This corridor of memories streams PAST it as you scroll:
 * each memory sweeps DISCOVER (barely visible ahead) → ARRIVE (emerges, sharpens,
 * light spills) → PASS (drifts behind). Motion is relative — moving the memories
 * toward the camera is the same as flying forward, but keeps the global camera
 * path continuous across the neighbouring chapters.
 *
 * Rule of the world: 3D = imagination, photography = reality. The photo textures
 * are procedural filmic stand-ins today; drop a real image path into a memory's
 * `img` and it loads that instead — no other change needed.
 */

// The corridor geometry. Memories are strung down −Z; the whole line translates
// toward +Z (past the camera) as `travel` grows over the journey window.
const SPACING = 8;
// The memories hang OFF TO THE SIDES of the drift path (never on the camera's
// axis) and slide past like scenery out a window — you pass BY them, they never
// pass through you. Rig eases the camera to a drift station at z = 3; arrivals
// are computed against the live camera z. START/END are tuned so the five
// memories draw abreast at progress ≈ 0.530 · 0.555 · 0.579 · 0.604 · 0.629 —
// after the entry blackout settles and before the exit hands off to EXPLORE.
const TRAVEL_START = -13.5;
const TRAVEL_END = 36.5;
// how far off-axis (world units) a memory sits — left/right of the flight path
const SIDE = 2.1;

/** Where the corridor sits at drift-progress d (0..1). Slight lurch at entry. */
function travelAt(d: number): number {
  const e = d < 0.12 ? d * (2 - d / 0.12) * 0.5 : d; // gentle accelerate-in
  return THREE.MathUtils.lerp(TRAVEL_START, TRAVEL_END, e);
}

type Memory = {
  year: string;
  title: string;
  note: string;
  doc?: boolean;
  img?: string;
};

// Built from the single source of truth. The 2023 station is the published
// research — rendered as a document you pass THROUGH, not a photo.
const MEMORIES: Memory[] = journeyData.map((j) =>
  j.year === "2023"
    ? {
        year: j.year,
        title: research.title,
        note: `${research.venue} · ${research.publisher} · DOI ${research.doi}`,
        doc: true,
      }
    : { year: j.year, title: j.title, note: j.note }
);

// ---------- procedural textures (canvas; cheap, swap-able) ----------

function photoTexture(m: Memory, i: number): THREE.Texture {
  const w = 640;
  const h = 420;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  // warm filmic ground, brighter for the more recent (complex) memories
  const warmth = 0.35 + (i / (MEMORIES.length - 1)) * 0.45;
  const g = ctx.createRadialGradient(w * 0.42, h * 0.44, 40, w * 0.5, h * 0.5, w * 0.7);
  g.addColorStop(0, `rgba(${Math.round(60 * warmth + 20)}, ${Math.round(44 * warmth + 16)}, ${Math.round(34 * warmth + 14)}, 1)`);
  g.addColorStop(1, "#0a0806");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // faint structural bands — a suggestion of a scene, not a picture
  ctx.globalAlpha = 0.06 + warmth * 0.05;
  ctx.fillStyle = "#f2ece1";
  for (let k = 0; k < 5 + i * 3; k++) {
    const bx = Math.random() * w;
    ctx.fillRect(bx, 0, 1, h);
  }
  ctx.globalAlpha = 1;
  // ghost year, large, low-contrast — reads as a memory index
  ctx.fillStyle = "rgba(242,236,225,0.10)";
  ctx.font = "800 220px 'Bricolage Grotesque', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(m.year, w / 2, h / 2 + 10);
  // grain
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  for (let p = 0; p < d.length; p += 4) {
    const n = (Math.random() - 0.5) * 18;
    d[p] += n;
    d[p + 1] += n;
    d[p + 2] += n;
  }
  ctx.putImageData(id, 0, 0);
  // thin frame so it reads as a fragment
  ctx.strokeStyle = "rgba(242,236,225,0.14)";
  ctx.lineWidth = 1;
  ctx.strokeRect(6, 6, w - 12, h - 12);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function docTexture(m: Memory): THREE.Texture {
  const w = 520;
  const h = 700;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  // a physical sheet floating in the dark
  ctx.fillStyle = "#e9e5da";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#0c0b0a";
  ctx.font = "700 24px 'Bricolage Grotesque', Georgia, serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  wrap(ctx, m.title, 46, 60, w - 92, 30);
  ctx.fillStyle = "#5b5750";
  ctx.font = "500 15px 'Martian Mono', monospace";
  ctx.fillText(`${research.venue} · ${research.publisher}`, 46, 210);
  ctx.fillText(`DOI ${research.doi}`, 46, 234);
  // faux figure + equation fragments
  ctx.strokeStyle = "rgba(12,11,10,0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(46, 280, w - 92, 150);
  ctx.beginPath();
  for (let x = 0; x <= w - 92; x += 8) {
    const y = 355 + Math.sin(x * 0.05) * 45 * Math.exp(-x / 300);
    if (x === 0) ctx.moveTo(46 + x, y);
    else ctx.lineTo(46 + x, y);
  }
  ctx.stroke();
  ctx.fillStyle = "#3a3833";
  ctx.font = "italic 500 16px Georgia, serif";
  ctx.fillText("softmax(QKᵀ/√dₖ)V", 46, 470);
  ctx.fillStyle = "#6b675f";
  ctx.font = "400 12px 'Martian Mono', monospace";
  for (let ln = 0; ln < 9; ln++) {
    ctx.fillText("▪ " + "—".repeat(28 + ((ln * 5) % 11)), 46, 508 + ln * 20);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), x, yy);
      line = word + " ";
      yy += lh;
    } else line = test;
  }
  ctx.fillText(line.trim(), x, yy);
}

function captionTexture(m: Memory): THREE.Texture {
  const w = 1024;
  const h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  // year — mono eyebrow
  ctx.fillStyle = "rgba(143,143,150,0.95)";
  ctx.font = "500 30px 'Martian Mono', monospace";
  ctx.fillText(m.year, w / 2, 20);
  // title — display
  ctx.fillStyle = "#ececee";
  ctx.font = `${m.doc ? "700 46px" : "600 58px"} 'Bricolage Grotesque', Arial, sans-serif`;
  wrapCentered(ctx, m.title, w / 2, 72, w - 90, 62);
  // note — body, faint (narrow column so it never runs to the frame edge)
  ctx.fillStyle = "rgba(120,120,128,0.9)";
  ctx.font = "400 27px 'Hanken Grotesk', Arial, sans-serif";
  wrapCentered(ctx, m.note, w / 2, m.doc ? 250 : 320, w - 360, 36);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function wrapCentered(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, maxW: number, lh: number) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), cx, yy);
      line = word + " ";
      yy += lh;
    } else line = test;
  }
  ctx.fillText(line.trim(), cx, yy);
}

function glowTexture(): THREE.Texture {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,171,94,0.55)");
  g.addColorStop(0.4, "rgba(200,95,43,0.18)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}

// ---------- photo / doc plane shader (arrival-driven fake DOF) ----------

const memVert = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;
const memFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex; uniform float uOpacity; uniform float uBlur; uniform float uTime; uniform float uVig;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  void main(){
    float b = uBlur;
    vec3 col = texture2D(uTex, vUv).rgb * 0.28;
    col += texture2D(uTex, vUv+vec2(b,0.0)).rgb*0.12;
    col += texture2D(uTex, vUv+vec2(-b,0.0)).rgb*0.12;
    col += texture2D(uTex, vUv+vec2(0.0,b)).rgb*0.12;
    col += texture2D(uTex, vUv+vec2(0.0,-b)).rgb*0.12;
    col += texture2D(uTex, vUv+vec2(b,b)).rgb*0.06;
    col += texture2D(uTex, vUv+vec2(-b,-b)).rgb*0.06;
    col += texture2D(uTex, vUv+vec2(b,-b)).rgb*0.06;
    col += texture2D(uTex, vUv+vec2(-b,b)).rgb*0.06;
    col += (hash(vUv*vec2(900.0,600.0)+uTime)-0.5)*0.04;
    // vignette so the rectangle melts into the void (widen with uVig for doc pass)
    float edge = smoothstep(0.52 + uVig, 0.22, distance(vUv, vec2(0.5)));
    gl_FragColor = vec4(col, edge * uOpacity);
  }
`;

/**
 * Readability from the signed gap (worldZ − cameraZ). Peaks while the memory is
 * ahead-and-to-the-side (≈7 units ahead), then fades as it slides out to the
 * frame edge and past — it never reaches the camera's own depth, so you glide by
 * it rather than into it.
 */
function arrivalFromGap(gap: number): number {
  const appear = THREE.MathUtils.smoothstep(gap, -14, -9);
  const depart = 1 - THREE.MathUtils.smoothstep(gap, -8, -5);
  return appear * depart;
}

function MemoryPlane({ m, i, n, reduce }: { m: Memory; i: number; n: number; reduce: boolean }) {
  const camera = useThree((s) => s.camera);
  const localZ = -SPACING * i;
  const t01 = i / (n - 1);

  // composition: memories alternate LEFT / RIGHT of the flight path so you drift
  // between them. Older → smaller/further out; recent → larger, a little closer in.
  const side = i % 2 ? 1 : -1; // DTU(0) left, Building(1) right, …
  const scale = THREE.MathUtils.lerp(0.9, 1.28, t01);
  const xSide = side * THREE.MathUtils.lerp(SIDE + 0.5, SIDE - 0.4, t01);
  const ySide = side * 0.22 + (i % 2 ? -0.1 : 0.06);

  const photoTex = useMemo(() => {
    if (m.img) {
      const t = new THREE.TextureLoader().load(m.img);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }
    return m.doc ? docTexture(m) : photoTexture(m, i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const capTex = useMemo(() => captionTexture(m), [m]);
  const glowTex = useMemo(() => glowTexture(), []);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: memVert,
        fragmentShader: memFrag,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          uTex: { value: photoTex },
          uOpacity: { value: 0 },
          uBlur: { value: 0.02 },
          uTime: { value: 0 },
          uVig: { value: 0 },
        },
      }),
    [photoTex]
  );
  const capMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: capTex, transparent: true, opacity: 0, depthWrite: false }),
    [capTex]
  );
  const glowMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
    [glowTex]
  );

  const group = useRef<THREE.Group>(null);
  const photoRef = useRef<THREE.Mesh>(null);

  const [pw, ph] = m.doc ? [1.5, 2.02] : [2.5, 1.64];

  useFrame(() => {
    const p = film.progress;
    const t = performance.now() / 1000;
    mat.uniforms.uTime.value = t;

    let vis: number;
    if (reduce) {
      // no travel — sequential fade in place, still off to the sides
      const d = journeyLocal(p);
      const center = (i + 0.5) / n;
      vis = 1 - Math.min(1, Math.abs(d - center) / (0.5 / n));
      vis = Math.max(0, vis * vis * (3 - 2 * vis));
    } else {
      const worldZ = localZ + travelAt(journeyLocal(p));
      if (group.current) group.current.position.z = worldZ;
      vis = arrivalFromGap(worldZ - camera.position.z);
    }

    const g = group.current;
    if (g) {
      const on = vis > 0.002;
      g.visible = on;
      if (!on) return;
      // billboard to face the camera so the memory reads as it slides past
      if (!reduce) g.lookAt(camera.position);
    }

    mat.uniforms.uOpacity.value = vis;
    mat.uniforms.uBlur.value = (1 - vis) * 0.02;
    // caption settles once the image is sharp; the self-labelled paper needs none
    capMat.opacity = m.doc ? 0 : Math.max(0, vis * vis);
    glowMat.opacity = vis * 0.5;
  });

  return (
    <group ref={group} position={[xSide, ySide, localZ]} scale={scale}>
      <mesh material={glowMat} position={[0, 0, -0.05]} scale={[pw * 2.1, ph * 2.1, 1]} raycast={() => null}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh ref={photoRef} material={mat} raycast={() => null}>
        <planeGeometry args={[pw, ph]} />
      </mesh>
      {/* caption seated in the photo's lower third, kept within the photo's width */}
      <mesh material={capMat} position={[0, -ph * 0.28, 0.03]} scale={[pw * 0.96, pw * 0.48, 1]} raycast={() => null}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  );
}

export default function Journey({ reduce = false }: { reduce?: boolean }) {
  const dust = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  useFrame(() => {
    const p = film.progress;
    const jd = journeyDepth(p);

    // The camera GLANCES toward whichever memory is drawing abreast — your gaze
    // follows the scenery sliding past on the left/right. Weighted mean of each
    // memory's side by its readability → −1 (left) … +1 (right). Rig applies it.
    let glance = 0;
    if (!reduce && jd > 0.01) {
      const travel = travelAt(journeyLocal(p));
      let wsum = 0;
      for (let i = 0; i < MEMORIES.length; i++) {
        const rd = arrivalFromGap(-SPACING * i + travel - camera.position.z);
        glance += (i % 2 ? 1 : -1) * rd;
        wsum += rd;
      }
      if (wsum > 0.001) glance /= wsum;
    }
    film.journeyGlanceX += (glance * jd - film.journeyGlanceX) * 0.09;

    const g = dust.current;
    if (g) {
      g.visible = jd > 0.01;
      if (!reduce) g.position.z = travelAt(journeyLocal(p));
    }
  });

  return (
    <>
      {MEMORIES.map((m, i) => (
        <MemoryPlane key={m.year} m={m} i={i} n={MEMORIES.length} reduce={reduce} />
      ))}
      {/* tiny particles the drift reveals in the dark */}
      <group ref={dust} visible={false}>
        <Sparkles count={reduce ? 30 : 80} scale={[9, 6, 40]} position={[0, 0, -16]} size={1.1} speed={0.05} opacity={0.35} noise={0.6} color="#e8c9a6" />
      </group>
    </>
  );
}
