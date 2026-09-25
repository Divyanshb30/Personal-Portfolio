import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Ctx, U } from "./ctx";
import { R, fbm, noise, V } from "./math";
import { DUST_FRAG, GLSL_FN, STIR_GLSL } from "./glsl";

/** A painted panorama: continuous gradients give the liquid metal smooth, flowing reflections. */
export function environment(renderer: THREE.WebGLRenderer) {
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 1024;
  const g = c.getContext("2d")!;
  const v = g.createLinearGradient(0, 0, 0, 1024);
  v.addColorStop(0.0, "#0a0c12");
  v.addColorStop(0.32, "#1a1d27");
  v.addColorStop(0.47, "#6b4a36");
  v.addColorStop(0.5, "#f2b27a");
  v.addColorStop(0.53, "#7a3a18");
  v.addColorStop(0.7, "#1a0a05");
  v.addColorStop(1.0, "#050304");
  g.fillStyle = v;
  g.fillRect(0, 0, 2048, 1024);
  const pool = (x: number, y: number, rx: number, ry: number, col: string, a: number) => {
    g.save();
    g.translate(x, y);
    g.scale(1, ry / rx);
    const r = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    r.addColorStop(0, col.replace("A", String(a)));
    r.addColorStop(1, col.replace("A", "0"));
    g.fillStyle = r;
    g.beginPath();
    g.arc(0, 0, rx, 0, 6.3);
    g.fill();
    g.restore();
  };
  g.globalCompositeOperation = "lighter";
  pool(560, 300, 420, 230, "rgba(255,210,160,A)", 0.95);
  pool(1500, 420, 300, 260, "rgba(170,190,255,A)", 0.55);
  pool(1020, 180, 520, 110, "rgba(255,240,225,A)", 0.35);
  pool(300, 760, 500, 120, "rgba(255,110,40,A)", 0.4);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(tex).texture;
  pm.dispose();
  tex.dispose();
  return env;
}

type Vec3Like = { x: number; y: number; z: number };

/** Drifting dust: soft grains that sway, part around the cursor and blur away from the focal plane. */
export function points(
  ctx: Ctx,
  n: number,
  place: (i: number) => Vec3Like,
  colFn: (i: number) => number[],
  sizeFn: (i: number) => number,
  drift = 1
) {
  n = Math.max(1, Math.round(n * ctx.quality));
  const p = new Float32Array(n * 3),
    c = new Float32Array(n * 3),
    s = new Float32Array(n),
    sd = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const q = place(i);
    p[i * 3] = q.x;
    p[i * 3 + 1] = q.y;
    p[i * 3 + 2] = q.z;
    c.set(colFn(i), i * 3);
    s[i] = sizeFn(i);
    sd[i] = R();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(p, 3));
  g.setAttribute("aColor", new THREE.BufferAttribute(c, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(s, 1));
  g.setAttribute("aSeed", new THREE.BufferAttribute(sd, 1));
  const uniforms = { uTime: ctx.u.TIME, uScale: ctx.u.SCALE, uFocus: ctx.u.FOCUS, uDrift: { value: drift }, uGain: { value: 1 }, ...ctx.u.CUR };
  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms,
    vertexShader: /* glsl */ `
      attribute float aSize, aSeed; attribute vec3 aColor; uniform float uTime, uScale, uFocus, uDrift, uGain; varying vec3 vC; varying float vCoc;
      ${STIR_GLSL}
      void main(){
        vec3 q = position; q += uDrift * vec3(sin(uTime * 0.13 + aSeed * 40.0) * 0.35, cos(uTime * 0.11 + aSeed * 23.0) * 0.25, sin(uTime * 0.09 + aSeed * 11.0) * 0.3);
        vec4 mv = modelViewMatrix * vec4(q, 1.0); float d = -mv.z; stir(mv, d * 0.7 * uDrift, 14.0);
        float coc = clamp(abs(d - uFocus) * 0.05, 0.0, 1.0);
        gl_PointSize = min(aSize * (260.0 * uScale / d) * (1.0 + coc * 3.0), 90.0); vCoc = coc;
        vC = aColor * mix(1.0, 0.25, coc) * exp(-max(d - 24.0, 0.0) * 0.03) * uGain;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: DUST_FRAG,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  ctx.scene.add(pts);
  return { pts, gain: uniforms.uGain };
}

let glowTexture: THREE.CanvasTexture | null = null;
export function glowTex() {
  if (glowTexture) return glowTexture;
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const g = cv.getContext("2d")!;
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.2, "rgba(255,255,255,.4)");
  gr.addColorStop(0.5, "rgba(255,255,255,.08)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  glowTexture = new THREE.CanvasTexture(cv);
  return glowTexture;
}

export function sprite(ctx: Ctx, col: number, size: number, pos: THREE.Vector3, op: number, parent: THREE.Object3D = ctx.scene) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: op }));
  s.scale.set(size, size, 1);
  s.position.copy(pos);
  parent.add(s);
  return s;
}

/** The Blob Mixer body: an icosphere pushed into soft lobes, with a faint ripple. */
export function blobGeometry(seed: number, amp = 0.17, freq = 0.78, detail = 64) {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  g = mergeVertices(g);
  const p = g.attributes.position as THREE.BufferAttribute,
    v = V();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    v.multiplyScalar(1 + fbm(v.x * freq + seed, v.y * freq + seed * 0.7, v.z * freq - seed) * amp * 2 + noise(v.x * 2.6 + seed, v.y * 2.6, v.z * 2.6) * 0.012);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

export const molten = () =>
  new THREE.MeshPhysicalMaterial({ color: 0xe0874e, metalness: 1, roughness: 0.07, iridescence: 0.55, iridescenceIOR: 1.4, iridescenceThicknessRange: [180, 520], clearcoat: 1, clearcoatRoughness: 0.04 });
export const glass = () =>
  new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.04, transmission: 1, thickness: 0.45, ior: 1.33, attenuationColor: new THREE.Color(0xffe2c8), attenuationDistance: 3, clearcoat: 1, clearcoatRoughness: 0.03 });
export const blackRim = () => {
  const m = new THREE.MeshPhysicalMaterial({ color: 0x030304, metalness: 0, roughness: 0.85, envMapIntensity: 0.18 });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
      vec3 vd = normalize(vViewPosition); float fr = pow(1.0 - abs(dot(normal, vd)), 3.2); totalEmissiveRadiance += vec3(1.0, 0.46, 0.16) * fr * 1.8;
      `
    );
  };
  return m;
};
export const banded = () => {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.05, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = "varying vec3 vPos;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvPos = position;\n");
    sh.fragmentShader =
      "varying vec3 vPos;\n" +
      GLSL_FN +
      sh.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float b = sin(vPos.y * 15.0 + fbm(vPos * 2.8) * 5.0); diffuseColor.rgb *= mix(vec3(0.28, 0.12, 0.05), vec3(1.0, 0.74, 0.48), 0.5 + 0.5 * b);
        `
      );
  };
  return m;
};

export type LivingU = { uReveal: U<number>; uDir: U<THREE.Vector3>; uPoke: U<THREE.Vector3>; uPokeAmt: U<number>; uTime: U<number> };

/** A skin that condenses out of its dust (and loosens back into it) from one side, and bulges under the cursor. */
export function livingSkin(ctx: Ctx, mat: THREE.MeshPhysicalMaterial, dir: THREE.Vector3) {
  const u: LivingU = { uReveal: { value: 0 }, uDir: { value: dir.clone() }, uPoke: { value: V(0, 0, 1) }, uPokeAmt: { value: 0 }, uTime: ctx.u.TIME };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader =
      "varying vec3 vPos; uniform vec3 uPoke; uniform float uPokeAmt, uTime;\n" +
      sh.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vPos = position; float k = pow(max(dot(normalize(position), uPoke), 0.0), 60.0);
        transformed += normal * uPokeAmt * k * (0.075 + 0.02 * sin(uTime * 11.0 - k * 5.0));
        `
      );
    sh.fragmentShader =
      "varying vec3 vPos; uniform float uReveal; uniform vec3 uDir;\n" +
      GLSL_FN +
      sh.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float n = fbm(vPos * 2.3) * 0.8 + (dot(normalize(vPos), uDir) * 0.5 + 0.5) * 0.4; float th = uReveal * 1.25 - 0.1; if (n > th) discard;
        totalEmissiveRadiance += vec3(1.0, 0.55, 0.25) * smoothstep(th - 0.015, th, n) * 0.3;
        `
      );
  };
  return { mat, u };
}

// reused every frame, so the poke makes no garbage
const pokeAt = new THREE.Vector2(), pokeBall = new THREE.Sphere();

/** Jelly: the body bulges toward the cursor where the pointer meets it. */
export function poke(
  ctx: Ctx,
  mesh: THREE.Mesh,
  u: LivingU,
  radius: number,
  mouse: { x: number; y: number },
  dt: number,
  ray: THREE.Raycaster,
  tmp: THREE.Vector3,
  tmp2: THREE.Vector3,
  inv: THREE.Matrix4
) {
  if (!mesh.visible) return;
  ray.setFromCamera(pokeAt.set(mouse.x, mouse.y), ctx.camera);
  const hit = ray.ray.intersectSphere(pokeBall.set(mesh.position, radius * 1.02), tmp2);
  const cp = hit ? tmp.copy(hit) : ray.ray.closestPointToPoint(mesh.position, tmp);
  const miss = hit ? 0 : cp.distanceTo(mesh.position) / radius;
  const t = Math.min(1, Math.max(0, (miss - 1.25) / (0.95 - 1.25)));
  const want = ctx.u.CUR.uActive.value * t * t * (3 - 2 * t) * (0.7 + Math.min(1, ctx.u.CUR.uStir.value) * 0.6);
  u.uPokeAmt.value += (want - u.uPokeAmt.value) * (1 - Math.exp(-dt * 6));
  inv.copy(mesh.matrixWorld).invert();
  u.uPoke.value.copy(cp).applyMatrix4(inv).normalize();
}
