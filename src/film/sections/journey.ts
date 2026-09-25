import * as THREE from "three";
import type { Ctx, Frame } from "../ctx";
import type { Key } from "../director";
import { block, el } from "../ctx";
import { DUST_FRAG, GLSL_FN, STIR_GLSL, TORN, TORN_GLSL } from "../glsl";
import { points, sprite } from "../helpers";
import { COOL, R, TAU, UP, V, clamp, emberAt, gauss, lerp, rng, smooth } from "../math";
import { JG, JO, JS0, JS1 } from "../layout";
import { LOOSE_PHOTOS, MEMORIES } from "../data";
import { PHOTO_LAYER } from "../post";
import type { Orb } from "../orb";

type Frame3 = { T: THREE.Vector3; R: THREE.Vector3; U: THREE.Vector3 };

// the river's course, from the stack field down through his years to the light
const spine = new THREE.CatmullRomCurve3(
  [
    V(-44, 0, 0), V(-20, 0, 0), V(0, 0, 0), V(12, -0.5, -4), V(18, -1.5, -16), V(14, -3, -30), V(2, -4.5, -40), V(-12, -6, -50),
    V(-20, -7.5, -64), V(-16, -9, -80), V(-4, -10.5, -92), V(10, -12, -104), V(18, -13.5, -120), V(14, -15, -136), V(4, -16.5, -150), V(0, -18, -170),
  ].map((v) => v.add(JO)),
  false,
  "centripetal",
);
const RL = spine.getLength(), RNS = 4096, WAVE_U = 1.2, WAVE_R = 1.0;
export function rframe(d: number): Frame3 {
  const t = clamp(d / RL, 0, 1), T = spine.getTangentAt(t), Rt = T.clone().cross(UP).normalize(), U = Rt.clone().cross(T).normalize();
  return { T, R: Rt, U };
}
/** a point on the river's (waving) centre line, d units downstream */
export function river(d: number) {
  const t = clamp(d / RL, 0, 1), f = rframe(d);
  return spine.getPointAt(t).addScaledVector(f.U, WAVE_U * Math.sin(d * 0.33 + 0.6)).addScaledVector(f.R, WAVE_R * Math.cos(d * 0.21));
}
/** where the river pours into the light */
export const END = river(RL - 2);

// which way each memory's plate faces, in the river's frame at that point
const FACES: ((f: Frame3) => THREE.Vector3)[] = [
  (f) => f.T.clone().multiplyScalar(-0.75).addScaledVector(f.R, -0.65),
  (f) => f.U.clone().multiplyScalar(0.9).addScaledVector(f.R, 0.35).addScaledVector(f.T, -0.25),
  (f) => f.T.clone().multiplyScalar(-0.8).addScaledVector(f.R, -0.45).addScaledVector(f.U, -0.25),
  (f) => f.R.clone().multiplyScalar(-1),
  (f) => f.T.clone().multiplyScalar(-1).addScaledVector(f.R, -0.3),
];

/**
 * Photos are shown as photographs: a restrained editorial grade only (a touch warmer, slightly muted,
 * gentle contrast and highlight roll-off, lifted blacks, a little grain, a whisper of vignette). The
 * cinematic part is the space around them, never the picture itself.
 */
async function editorial(src: string, crop: [number, number, number, number], outW = 1400) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const [sx, sy, sw, sh] = crop, w = Math.min(outW, sw), h = Math.round((w * sh) / sw);
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const g = cv.getContext("2d", { willReadFrequently: true })!; // read back again later for the edge dust
  g.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h), px = d.data, rnd = rng(sw * 7 + sh);
  const tone = (c: number) => {
    c = 0.5 + (c - 0.5) * 1.06; // a gentle lift in contrast
    if (c > 0.85) c = 0.85 + (c - 0.85) * 0.62; // highlights roll off instead of clipping
    return 0.02 + clamp(c, 0, 1) * 0.975; // blacks lifted a hair
  };
  for (let i = 0; i < px.length; i += 4) {
    const x = (i / 4) % w, y = Math.floor(i / 4 / w);
    let r = (px[i] / 255) * 1.03, gg = px[i + 1] / 255, b = (px[i + 2] / 255) * 0.96; // warm white balance
    const L = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
    r = L + (r - L) * 0.88;
    gg = L + (gg - L) * 0.88;
    b = L + (b - L) * 0.88;
    const vig = 1 - 0.07 * smooth(0.38, 0.78, Math.hypot(x / w - 0.5, y / h - 0.5) * 1.3);
    const grain = (rnd() - 0.5) * (4 / 255);
    px[i] = clamp(tone(r) * vig + grain, 0, 1) * 255;
    px[i + 1] = clamp(tone(gg) * vig + grain, 0, 1) * 255;
    px[i + 2] = clamp(tone(b) * vig + grain, 0, 1) * 255;
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A quiet dark card that says a photo is on its way. */
function placeholder(ctx: Ctx, cap: string) {
  const w = 1024, h = 680, cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  const draw = () => {
    const g = cv.getContext("2d")!;
    const bg = g.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h / 2, w * 0.7);
    bg.addColorStop(0, "#1c1714");
    bg.addColorStop(1, "#0b0a09");
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    if (cap) {
      const mono = ctx.root.querySelector(".mono");
      g.fillStyle = "rgba(170,170,178,.8)";
      g.font = `500 24px ${mono ? getComputedStyle(mono).fontFamily : "monospace"}`;
      g.textAlign = "center";
      g.fillText(`Photo coming · ${cap}`.toUpperCase(), w / 2, h / 2);
    }
    t.needsUpdate = true;
  };
  draw();
  document.fonts?.ready.then(draw);
  return t;
}

/**
 * A photograph suspended in the river's space, its edges coming apart like an old memory (no frame,
 * no glow), drawn before the dust so the dust behind it is hidden and the dust in front of it drifts
 * across. It floats a little on its own.
 */
function plate(ctx: Ctx, tex: THREE.Texture, aspect: number, w: number, pos: THREE.Vector3, face: THREE.Vector3) {
  let wid = w, hgt = wid / aspect;
  if (hgt > 2.3) {
    hgt = 2.3;
    wid = hgt * aspect;
  }
  const g = new THREE.Group();
  g.position.copy(pos);
  g.lookAt(pos.clone().add(face));
  ctx.scene.add(g);
  if ("anisotropy" in tex) tex.anisotropy = ctx.renderer.capabilities.getMaxAnisotropy();
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0x000000, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  // the torn edge (the same one the photo mask in post.ts draws, so the grade follows it exactly)
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = ctx.u.TIME;
    sh.vertexShader =
      "varying vec2 vTornUv, vTornSize;\n" +
      sh.vertexShader.replace("#include <uv_vertex>", "#include <uv_vertex>\nvTornUv = uv; vTornSize = abs(position.xy) * 2.0;\n");
    sh.fragmentShader =
      "varying vec2 vTornUv, vTornSize; uniform float uTime;\n" +
      GLSL_FN +
      TORN_GLSL +
      sh.fragmentShader.replace("#include <alphamap_fragment>", "#include <alphamap_fragment>\ndiffuseColor.a *= torn(vTornUv, vTornSize, uTime);\n");
  };
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(wid, hgt), mat);
  mesh.renderOrder = -1;
  mesh.layers.enable(PHOTO_LAYER);
  // only the solid middle hides what is behind it; the torn edge lets the dust drift through
  const band = Math.min(wid, hgt) * TORN.width * 1.1;
  const solid = new THREE.Mesh(new THREE.PlaneGeometry(wid - 2 * band, hgt - 2 * band), new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide }));
  solid.position.z = -0.03; // just behind the picture, so the two never fight over depth
  g.add(solid, mesh);
  return { g, mat, wid, hgt, base: pos.clone(), quat: g.quaternion.clone(), seed: R() * TAU };
}
type Plate = ReturnType<typeof plate>;

/**
 * Dust coming off a photo's torn edge: specks in the photo's own colours peel away, drift out and then
 * downstream with the river, and fade. They loop on the GPU; their colours arrive with the photo.
 */
function shedding(ctx: Ctx, p: Plate, count: number, downstream: THREE.Vector3) {
  const n = Math.max(24, Math.round(count * ctx.quality)), still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const toLocal = p.quat.clone().invert();
  const u = {
    uTime: ctx.u.TIME,
    uScale: ctx.u.SCALE,
    uFocus: ctx.u.FOCUS,
    uGain: { value: 0 },
    uShed: { value: 0 },
    uPuff: { value: 0 },
    uStill: { value: still ? 1 : 0 },
    uSize: { value: new THREE.Vector2(p.wid, p.hgt) },
    uDown: { value: downstream.clone().applyQuaternion(toLocal) },
    uUp: { value: UP.clone().applyQuaternion(toLocal) },
  };
  const P = new Float32Array(n * 3), N = new Float32Array(n * 2), C = new Float32Array(n * 3), S = new Float32Array(n * 4);
  const r = rng(Math.round(p.wid * 1000 + p.hgt * 7)), short = Math.min(p.wid, p.hgt), perim = 2 * (p.wid + p.hgt);
  for (let i = 0; i < n; i++) {
    // somewhere in the torn band, mostly right at the edge; position holds the speck's uv on the photo
    const depth = Math.pow(r(), 1.6) * TORN.width * short;
    // which side it leaves from, weighted by length, and where along it: [uv x, uv y, outward x, outward y]
    let at = r() * perim, spot: [number, number, number, number];
    if (at < p.wid) spot = [at / p.wid, depth / p.hgt, 0, -1];
    else if ((at -= p.wid) < p.wid) spot = [at / p.wid, 1 - depth / p.hgt, 0, 1];
    else if ((at -= p.wid) < p.hgt) spot = [depth / p.wid, at / p.hgt, -1, 0];
    else spot = [1 - depth / p.wid, (at - p.hgt) / p.hgt, 1, 0];
    P.set([spot[0], spot[1], 0], i * 3);
    N.set([spot[2], spot[3]], i * 2);
    S.set([r(), r(), r(), r()], i * 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P, 3));
  g.setAttribute("aNorm", new THREE.BufferAttribute(N, 2));
  g.setAttribute("aCol", new THREE.BufferAttribute(C, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(S, 4));
  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: u,
    vertexShader: /* glsl */ `
      attribute vec2 aNorm; attribute vec3 aCol; attribute vec4 aSeed;
      uniform float uTime, uScale, uFocus, uGain, uShed, uPuff, uStill; uniform vec2 uSize; uniform vec3 uDown, uUp;
      varying vec3 vC; varying float vCoc;
      ${GLSL_FN}
      void main(){
        float t = fract(uTime / (4.0 + aSeed.y * 2.0) + aSeed.x);
        vec3 start = vec3((position.xy - 0.5) * uSize, 0.02);
        // off the edge, then downstream with the river, rising a little and toward the camera
        vec3 drift = vec3(aNorm * 0.32 * t * (1.0 + 1.6 * uPuff), 0.12 * t) + uDown * 1.35 * t * t + uUp * 0.22 * t
                   + flow(start * 1.3 + vec3(0.0, 0.0, uTime * 0.07 + aSeed.z * 9.0)) * 0.16 * t;
        vec4 mv = modelViewMatrix * vec4(start + drift * (1.0 - uStill), 1.0); float d = -mv.z;
        float coc = clamp(abs(d - uFocus) * 0.05, 0.0, 1.0);
        gl_PointSize = min((0.03 + aSeed.w * 0.04) * (260.0 * uScale / d) * (1.0 + coc * 3.0), 60.0); vCoc = coc;
        float a = step(aSeed.z, uShed) * smoothstep(0.0, 0.1, t) * (1.0 - smoothstep(0.45, 1.0, t)) * (1.0 + 1.2 * uPuff);
        vC = aCol * a * uGain * mix(1.0, 0.3, coc);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: DUST_FRAG,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  p.g.add(pts);
  let ready = 0;
  return {
    u,
    get ready() {
      return ready;
    },
    /** each speck takes the colour of the pixel it peeled from */
    colour(tex: THREE.Texture) {
      const cv = tex.image as HTMLCanvasElement, px = cv.getContext("2d")!.getImageData(0, 0, cv.width, cv.height).data;
      for (let i = 0; i < n; i++) {
        const x = Math.min(cv.width - 1, Math.floor(P[i * 3] * cv.width)), y = Math.min(cv.height - 1, Math.floor((1 - P[i * 3 + 1]) * cv.height));
        const k = (y * cv.width + x) * 4;
        C.set([0, 1, 2].map((j) => Math.pow(px[k + j] / 255, 2.2) * 1.2), i * 3);
      }
      g.attributes.aCol.needsUpdate = true;
      ready = 1;
    },
  };
}
type Shed = ReturnType<typeof shedding>;

const corner = new THREE.Vector3();
/** a photo's rectangle on screen, in CSS pixels, and whether it is in front of the camera */
function rectOf(p: Plate, camera: THREE.PerspectiveCamera, W: number, H: number) {
  let l = 1e9, t = 1e9, r = -1e9, b = -1e9, front = true;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    p.g.localToWorld(corner.set((sx * p.wid) / 2, (sy * p.hgt) / 2, 0)).project(camera);
    if (corner.z > 1) front = false;
    const x = (corner.x * 0.5 + 0.5) * W, y = (-corner.y * 0.5 + 0.5) * H;
    l = Math.min(l, x);
    r = Math.max(r, x);
    t = Math.min(t, y);
    b = Math.max(b, y);
  }
  return { l, t, r, b, front };
}

/** Amber dust around (mostly behind) a photo, and a faint far haze: the photo's own atmosphere. */
function surround(ctx: Ctx, p: Plate) {
  p.g.updateMatrixWorld(true);
  const m = p.g.matrixWorld, q = V();
  const dust = points(
    ctx,
    620,
    () => {
      const front = R() < 0.22;
      q.set((R() - 0.5) * p.wid * 1.7, (R() - 0.5) * p.hgt * 1.7, front ? 0.12 + R() * 0.7 : -0.15 - R() * 1.5);
      return q.clone().applyMatrix4(m);
    },
    () => emberAt(0.28 + R() * 0.5).map((v) => v * 0.34),
    () => 0.02 + R() * 0.04,
    0.45,
  );
  const behind = V(0, 0, -1).applyQuaternion(p.g.quaternion);
  const haze = sprite(ctx, 0xffb074, Math.max(p.wid, p.hgt) * 2.6, p.base.clone().addScaledVector(behind, 1.8), 0);
  return { dust, haze };
}

const orbitPt = (c: THREE.Vector3, off: THREE.Vector3, ang: number, lift = 0) => off.clone().applyAxisAngle(UP, ang).add(c).add(V(0, lift, 0));

/**
 * JOURNEY. The being's dust runs on as a river through his years. The camera rides it through a
 * directed shot list (establishing, crane, ride, overhead, swoop, track, orbit, pull back), and his
 * memories stand on its banks as photo plates that warm up when they are the subject.
 * The orb rides the river on a route of its own: ahead of you, far off, inside two of the memories,
 * once swept away by the current, and at the end into the light.
 */
export function buildJourney(ctx: Ctx, orb: Orb) {
  const riverU = {
    uTime: ctx.u.TIME,
    uL: { value: RL },
    uGain: { value: 1 },
    // the current can surge: extra flow (accumulated, so streaks never jump); near uSurgeD the streaks stretch and brighten a little
    uPhase: { value: 0 },
    uSurge: { value: 0 },
    uSurgeD: { value: 0 },
    tP: { value: null as THREE.DataTexture | null },
    tR: { value: null as THREE.DataTexture | null },
    tU: { value: null as THREE.DataTexture | null },
    ...ctx.u.CUR,
  };
  let stream: THREE.LineSegments;
  {
    // the river's course baked into textures, so every streak can flow along it on the GPU
    const rfr: Frame3[] = [];
    for (let i = 0; i < RNS; i++) rfr.push(rframe((i / (RNS - 1)) * RL));
    const texOf = (fn: (t: number, i: number) => THREE.Vector3) => {
      const a = new Float32Array(RNS * 4);
      for (let i = 0; i < RNS; i++) {
        const v = fn(i / (RNS - 1), i);
        a.set([v.x, v.y, v.z, 1], i * 4);
      }
      const t = new THREE.DataTexture(a, RNS, 1, THREE.RGBAFormat, THREE.FloatType);
      t.needsUpdate = true;
      return t;
    };
    riverU.tP.value = texOf((t) => spine.getPointAt(t));
    riverU.tR.value = texOf((_, i) => rfr[i].R);
    riverU.tU.value = texOf((_, i) => rfr[i].U);
    const n = Math.round(64000 * ctx.quality), r2 = rng(5);
    const P = new Float32Array(n * 6), A = new Float32Array(n * 2 * 4), C = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) {
      const d0 = r2(), side = gauss(r2) * 0.9, up = gauss(r2) * 0.68, len = (0.25 + r2() * 0.9) / RL, sd = r2();
      const col = r2() < 0.22 ? [0.72, 0.8, 1] : emberAt(0.08 + r2() * 0.55), k = 0.4 * (0.35 + r2() * 0.65);
      for (let e = 0; e < 2; e++) {
        const j = i * 2 + e;
        A.set([d0, side, up, sd], j * 4);
        P.set([e, len, 0], j * 3);
        C.set(col.map((q) => q * k), j * 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(P, 3));
    g.setAttribute("aP", new THREE.BufferAttribute(A, 4));
    g.setAttribute("aColor", new THREE.BufferAttribute(C, 3));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: riverU,
      vertexShader: /* glsl */ `
        uniform sampler2D tP, tR, tU; uniform float uTime, uL, uGain, uPhase, uSurge, uSurgeD; attribute vec4 aP; attribute vec3 aColor; varying vec3 vC;
        ${STIR_GLSL}
        vec3 at(sampler2D s, float t){ return texture2D(s, vec2(clamp(t, 0.0, 1.0), 0.5)).xyz; }
        void main(){
          float head = fract(aP.x + (uTime * (2.4 + aP.w * 1.6) + uPhase * (1.0 + aP.w)) / uL);
          float sg = uSurge * exp(-pow((head * uL - uSurgeD) / 10.0, 2.0)), len = position.y * (1.0 + sg * 0.35);
          float tt = head - (1.0 - position.x) * len, dd = tt * uL;
          vec3 R = at(tR, tt), U = at(tU, tt);
          float tw = dd * 0.08 + uTime * 0.05, s = aP.y * cos(tw) - aP.z * sin(tw) * 0.6, u = aP.z * cos(tw) + aP.y * sin(tw) * 0.35;
          vec3 p = at(tP, tt) + R * (s * (1.0 + 0.35 * sin(dd * 0.12)) + ${WAVE_R.toFixed(2)} * cos(dd * 0.21))
                 + U * (u + ${WAVE_U.toFixed(2)} * sin(dd * 0.33 + 0.6) + 0.12 * sin(dd * 0.9 + uTime * 0.4));
          vec4 mv = modelViewMatrix * vec4(p, 1.0); float d = -mv.z; float f = stir(mv, d, 9.0);
          float ok = step(len, head);
          vC = aColor * position.x * ok * smoothstep(0.5, 2.4, d) * exp(-max(d - 16.0, 0.0) * 0.035) * (1.0 + f * (0.25 + uStir * 0.45)) * (1.0 + sg * 0.25) * uGain;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vC;
        void main(){ gl_FragColor = vec4(vC, 1.0); }`,
    });
    stream = new THREE.LineSegments(g, m);
    stream.frustumCulled = false;
    ctx.scene.add(stream);
  }
  // dust drifting all along the river
  const riverDust = points(
    ctx,
    40000,
    () => {
      const d = R() * RL, f = rframe(d);
      return river(d).addScaledVector(f.R, gauss() * 9).addScaledVector(f.U, gauss() * 6).addScaledVector(f.T, gauss() * 3);
    },
    () => (R() < 0.7 ? emberAt(0.2 + R() * 0.6) : COOL).map((v) => v * 0.2),
    () => 0.025 + R() * 0.06,
  );

  // where a memory is filmed from, when its shot is set on the river rather than on the photo itself
  const rp0 = (d: number, side: number, up: number) => river(d).addScaledVector(rframe(d).R, side).addScaledVector(rframe(d).U, up);
  const HERO: (THREE.Vector3 | null)[] = [rp0(61, -0.4, 0.9), rp0(91.5, -4.8, 1.1), null, null, null];
  /** which way a photo at `at` faces: toward its hero shot (with a slight turn), or its set direction */
  const faceFor = (i: number, at: THREE.Vector3, f: Frame3) => {
    const h = HERO[i];
    if (!h) return FACES[i](f).normalize();
    return h.clone().sub(at).normalize().applyAxisAngle(UP, (i % 2 ? -1 : 1) * 0.08);
  };
  const load = (pl: Plate, photo: [string, number, number, number, number], outW?: number, shed?: Shed) => {
    const [src, ...crop] = photo;
    editorial(src, crop as [number, number, number, number], outW).then((t) => {
      t.anisotropy = ctx.renderer.capabilities.getMaxAnisotropy();
      pl.mat.map = t;
      pl.mat.needsUpdate = true;
      shed?.colour(t);
      // on the GPU now, and its shader ready, rather than the moment the river first shows it
      ctx.renderer.initTexture(t);
      ctx.warm?.(pl.g);
    }, console.error);
  };

  // his memories, suspended beside the river
  const plates = MEMORIES.map((m, i) => {
    const f = rframe(m.d), pos = river(m.d).addScaledVector(f.R, m.bank).addScaledVector(f.U, m.h);
    const aspect = m.photo ? m.photo[3] / m.photo[4] : 1024 / 680;
    const face = faceFor(i, pos, f);
    const p = plate(ctx, placeholder(ctx, m.photo ? "" : m.cap), aspect, m.w ?? 3.3, pos, face);
    const shed = shedding(ctx, p, 900, f.T);
    if (m.photo) load(p, m.photo, undefined, shed);
    let extra: Plate | null = null, shedX: Shed | null = null;
    if (m.extra) {
      const e = m.extra, fe = rframe(e.d);
      const at = river(e.d).addScaledVector(fe.R, e.bank).addScaledVector(fe.U, e.h);
      extra = plate(ctx, placeholder(ctx, ""), e.photo[3] / e.photo[4], e.w, at, faceFor(i, at, fe));
      shedX = shedding(ctx, extra, 500, fe.T);
      load(extra, e.photo, 900, shedX);
    }
    // (a span of years is set a size down, to fit where a single year does)
    const label = el(ctx, "mem", `<div class="yr${m.y.includes("→") ? " range" : ""}">${m.y}</div><div class="mono t">${m.t}</div>${m.k ? `<div class="k">${m.k}</div>` : ""}<div class="n">${m.n}</div>`);
    return { ...p, m, pos, face, extra, label, shed, shedX, env: surround(ctx, p), envX: extra ? surround(ctx, extra) : null, lx: NaN, ly: NaN };
  });

  // loose photos: any not tied to a year drift far off the banks, small and dim, like passing memories
  const loose = LOOSE_PHOTOS.map((lp, k) => {
    const photo = lp.photo;
    let d = lp.d ?? 50 + ((k + 0.5) * 150) / Math.max(1, LOOSE_PHOTOS.length);
    if (lp.d === undefined && MEMORIES.some((m) => Math.abs(m.d - d) < 7)) d += 8;
    const f = rframe(d), bank = lp.bank ?? (k % 2 ? 1 : -1) * (9 + R() * 4);
    const at = river(d).addScaledVector(f.R, bank).addScaledVector(f.U, lp.h ?? -0.5 + R() * 3.5);
    // placed by hand, it faces back across the river (where the camera travels); else, up the river
    const fb = rframe(d - 4);
    const face = (lp.bank !== undefined ? river(d - 4).addScaledVector(fb.R, -Math.sign(bank) * 10).addScaledVector(fb.U, 1) : river(d - 10).addScaledVector(rframe(d - 10).U, 1)).sub(at).normalize();
    const p = plate(ctx, placeholder(ctx, ""), photo[3] / photo[4], 1.2 + R() * 0.4, at, face);
    load(p, photo, 700);
    return p;
  });

  // the shots: sixteen setups on the journey's own clock
  const MP = plates.map((p) => p.pos), FF = (i: number) => plates[i].face.clone();
  const MID22 = plates[1].extra ? plates[1].pos.clone().lerp(plates[1].extra.base, 0.5) : plates[1].pos.clone();
  const keys: Key[] = [
    { s: 0.0, name: "Journey · establishing", pos: JO.clone().add(V(0, 0.4, 11.5)), tgt: JO.clone(), fov: 40 },
    { s: 0.055, name: "Journey · establishing", pos: JO.clone().add(V(1.6, 0.5, 10.8)), tgt: JO.clone().add(V(1.6, 0, 0)), fov: 40 },
    { s: 0.125, name: "Crane down, bank into the turn", pos: river(44).addScaledVector(rframe(44).U, 1.1).addScaledVector(rframe(44).T, -3), tgt: river(56).addScaledVector(rframe(56).U, 0.2), fov: 54, roll: -0.1 },
    { s: 0.19, name: "Ride the current", pos: river(52).addScaledVector(rframe(52).U, 1.0).addScaledVector(rframe(52).R, -0.6), tgt: MP[0].clone(), fov: 48, roll: -0.03 },
    { s: 0.25, name: "Pan past 2021", pos: river(61).addScaledVector(rframe(61).U, 0.9).addScaledVector(rframe(61).R, -0.4), tgt: MP[0].clone(), fov: 44, roll: 0.04, settle: 0.5 },
    { s: 0.3, name: "Ride the current", pos: river(70).addScaledVector(rframe(70).U, 1.3), tgt: river(84), fov: 50 },
    { s: 0.37, name: "Level with 2022", pos: rp0(88, -4.8, 1.1), tgt: MID22.clone(), fov: 42 },
    { s: 0.445, name: "Slow push in, 2022", pos: rp0(94.5, -4.85, 1.05), tgt: MID22.clone(), fov: 40, settle: 0.5 },
    { s: 0.505, name: "Swoop down, low angle on 2024", pos: MP[2].clone().addScaledVector(FF(2), 5).add(V(0, -1.9, 0)), tgt: MP[2].clone().add(V(0, 0.25, 0)), fov: 42, roll: 0.05 },
    { s: 0.585, name: "Slow push in", pos: MP[2].clone().addScaledVector(FF(2), 4.6).add(V(0, -0.9, 0)), tgt: MP[2].clone(), fov: 36, settle: 0.5 },
    { s: 0.655, name: "Track alongside, 2025", pos: river(158).addScaledVector(rframe(158).R, -11).add(V(0, 0.9, 0)), tgt: river(161), fov: 40 },
    { s: 0.755, name: "Track alongside, 2025", pos: river(172).addScaledVector(rframe(172).R, -11).add(V(0, 0.7, 0)), tgt: river(171), fov: 40, settle: 0.5 },
    { s: 0.815, name: "Orbit, Amdocs", pos: orbitPt(MP[4], FF(4).multiplyScalar(7.4), -0.9, 0.4), tgt: MP[4].clone(), fov: 38, settle: 0.5 },
    { s: 0.89, name: "Orbit, Amdocs", pos: orbitPt(MP[4], FF(4).multiplyScalar(6.8), 0.55, 1.1), tgt: MP[4].clone(), fov: 36 },
    { s: 0.955, name: "Pull back, toward the light", pos: river(196).add(V(0, 11, 0)).addScaledVector(rframe(196).T, -16), tgt: END.clone(), fov: 46 },
    { s: 1.0, name: "Toward the light", pos: river(214).add(V(0, 6, 0)).addScaledVector(rframe(214).T, -8), tgt: END.clone(), fov: 44 },
  ].map((k) => ({ ...k, s: JG(k.s) }));
  // the vertical cut: each setup a step further back, so a pair of photos fits a narrow frame (the lens
  // lift then raises them over their words)
  // (the far-bank track along 2025 is already wide: there it comes a little closer instead)
  for (const k of keys) k.tall = { pos: k.tgt.clone().add(k.pos.clone().sub(k.tgt).multiplyScalar(k.name.startsWith("Track alongside") ? 0.72 : 1.18)) };

  const title = block(ctx, "journey"), q1 = new THREE.Quaternion(), e1 = new THREE.Euler();

  // ---------------- the orb's own way down the river ----------------
  // Its route is scroll-driven (a second shot list, on the same journey clock as the camera's); the
  // current's joke runs on a clock of its own once reached. Positions sit in the river's frame.
  const S = 0.34, UPV = V(0, 1, 0);
  const at = V(), look = V(), o2 = V(), o3 = V();
  /** d units downstream, `side` across (toward the right bank), `up` above the centre line */
  const rp = (d: number, side: number, up: number, out: THREE.Vector3) => {
    const fr = rframe(d);
    return out.copy(river(d)).addScaledVector(fr.R, side).addScaledVector(fr.U, up);
  };
  const flash = MEMORIES.map(() => 0), inside = MEMORIES.map(() => 0);
  // the two memories it opens: it arrives first, touches the photo, the photo answers, it is drawn in
  const touches = [0, 2].map((i) => ({ i, a: MEMORIES[i].win[0], b: MEMORIES[i].win[1], face: FF(i), front: MP[i].clone().addScaledVector(FF(i), 0.75) }));
  const amdocsSide = FF(4).cross(UPV).normalize(), STOP = rp(215, -0.3, 1.6, V()), SPLASH = rp(45, 0.6, 0, V());
  const trig = { splash: false, shoot: false, flare: false };
  const current = { t: -1, done: false, boom: false };
  let phase = 0;

  /** Where the orb is inside a touch beat, or false outside it. */
  const touch = (T: (typeof touches)[number], j: number, time: number) => {
    const { a, b, i, face, front } = T;
    if (j < a - 0.016 || j > b + 0.008) return false;
    const reach = smooth(a - 0.016, a - 0.007, j), pull = smooth(a - 0.005, a + 0.003, j), out = smooth(b, b + 0.006, j);
    flash[i] = smooth(a - 0.009, a - 0.005, j) * (1 - smooth(a - 0.003, a + 0.006, j));
    inside[i] = pull * (1 - out);
    // to the surface, then through it; out again the way it went in
    at.copy(front).addScaledVector(face, -0.63 * reach - 0.2 * pull + 0.83 * out + 0.04 * Math.sin(time * 2.2) * (1 - reach));
    orb.drive({ at, size: S * (1 - pull * (1 - out)), look: MP[i], lookAmt: 0.9 * (1 - out), pin: Math.max(reach, pull) * (1 - out) });
    orb.feel(out > 0.05 ? "Coming back out" : pull > 0.5 ? "Inside a memory" : "Reaching");
    if (pull > 0.02 && pull < 0.98 && out === 0) orb.squash(0.55 * Math.sin(Math.PI * pull), face);
    return true;
  };

  /** The current: it surges, drags the orb off, the orb fights it, loses, bursts free, and looks back. */
  const currentGag = (e: number, d: number, time: number) => {
    const fr = rframe(d);
    const surge = smooth(0.5, 1.0, e) * (1 - smooth(3.15, 3.6, e));
    let dT = 1.5 * smooth(0.6, 1.3, e) + 1.4 * smooth(1.3, 2.4, e) + 6.5 * smooth(2.3, 2.95, e) ** 2;
    const dR = 2.2 * smooth(0.6, 1.3, e) + 0.6 * smooth(2.3, 2.9, e), dU = 3.2 * smooth(3.12, 3.35, e) + 0.12 * Math.sin(time * 2.1) * smooth(3.3, 3.6, e);
    for (const s0 of [1.35, 1.85]) {
      dT -= 0.9 * smooth(s0, s0 + 0.15, e) * (1 - smooth(s0 + 0.2, s0 + 0.45, e));
      if (e > s0 && e < s0 + 0.1) orb.squash(-0.3, fr.T);
      else if (e > s0 + 0.1 && e < s0 + 0.22) orb.squash(0.3, fr.T);
    }
    if (e > 2.9 && e < 3.05) orb.squash(-0.45, fr.U);
    else if (e > 3.05 && e < 3.15) orb.squash(0.7, fr.U);
    if (e >= 3.15 && !current.boom) {
      current.boom = true;
      orb.burst(orb.pos, 1.7);
      orb.kick(o2.copy(fr.U).multiplyScalar(9));
    }
    rp(d + dT, dR, 0.35 + dU, at);
    // it watches where it wants to go (upstream) while it struggles; after, a pause, then a look back at you
    const back = smooth(3.6, 3.75, e) * (1 - smooth(4.25, 4.4, e));
    rp(d - 10, 0, 1, look).lerp(ctx.camera.position, back);
    orb.drive({ at, size: S, look, lookAmt: e < 0.5 ? 0.3 : e < 2.9 ? 0.8 : e < 3.6 ? 0.2 : back, pin: e > 1.2 && e < 2.95 ? 0.45 : 0 });
    riverU.uSurgeD.value = d + dT;
    return surge;
  };

  /** Direct the orb for this frame (journey-local time j). */
  const steer = (f: Frame, j: number) => {
    const { time: t, dt } = f;
    flash.fill(0);
    inside.fill(0);
    let surge = 0;
    // one-shot moments re-arm when you scroll back above them
    if (j < 0.02) trig.splash = false;
    if (j < 0.28) trig.shoot = false;
    if (j < 0.96) trig.flare = false;
    if (j < 0.29) Object.assign(current, { t: -1, done: false, boom: false });
    if (current.t < 0 && !current.done && j >= 0.305 && j < 0.37 && !orb.still) current.t = 0;
    if (current.t >= 0) {
      current.t += dt * (j > 0.4 ? 4 : 1);
      if (current.t > 4.4 || j >= 0.45) Object.assign(current, { t: -1, done: true });
    }

    if (GGon(f.GG, j)) {
      if (j < 0.035) {
        // it drops from the stack into the river, and lands with a splash
        const u = smooth(-0.036, 0.032, j);
        orb.drive({ at: rp(45, 0.6, 7 * (1 - u * u), at), size: S, look: river(52), lookAmt: 0.4, pin: 0.5 });
        orb.feel("Splashing down");
        if (j >= 0.03 && !trig.splash) {
          trig.splash = true;
          orb.burst(SPLASH, 0.9);
        }
      } else if (j < touches[0].a - 0.016) {
        // ahead of you, riding the current; then it leaves the stream for the first memory, and gets there first
        const d = lerp(46, 57, smooth(0.035, 0.15, j)), w = smooth(0.148, 0.164, j);
        rp(d, 0.5 * Math.sin(t * 0.9), 0.35 + 0.18 * Math.sin(t * 1.7), at).lerp(touches[0].front, w);
        look.copy(river(d + 6)).lerp(MP[0], w);
        orb.drive({ at, size: S, look, lookAmt: 0.5 + 0.4 * w, free: w < 0.01 });
        orb.feel(w > 0.3 ? "Getting there first" : "Riding the current");
      } else if (touch(touches[0], j, t)) {
        // the first memory
      } else if (j < 0.305) {
        // out of 2021 and across your view, into the stream ahead
        rp(82, -1.2, 0.4, at);
        if (!trig.shoot) {
          trig.shoot = true;
          orb.kick(o2.copy(at).sub(orb.pos).normalize().multiplyScalar(11));
        }
        orb.drive({ at, size: S, free: true });
        orb.feel("Racing ahead");
      } else if (j < 0.37 || (current.t >= 0 && j < 0.45)) {
        // (once it has started, the current's joke keeps the orb until it's told: past 0.40 it hurries)
        const d = lerp(82, 94, smooth(0.3, 0.37, j));
        if (current.t >= 0) {
          surge = currentGag(current.t, d, t);
          orb.feel(current.t < 3.15 ? "Fighting the current" : "Free");
        } else if (current.done) {
          orb.drive({ at: rp(d + 8, 0.8, 3.0 + 0.1 * Math.sin(t * 1.9), at), size: S, free: true });
          orb.feel("Free");
        } else {
          orb.drive({ at: rp(d, 0, 0.35 + 0.15 * Math.sin(t * 1.7), at), size: S, free: true });
          orb.feel("Riding the current");
        }
      } else if (j < 0.45) {
        // behind and between the two photos of 2022, drifting away down the river
        orb.drive({ at: rp(lerp(103.5, 109, smooth(0.37, 0.45, j)), -4.85 + 0.5 * Math.sin(t * 0.5), 1.3 + 0.1 * Math.sin(t * 1.1), at), size: S, free: true });
        orb.feel("Drifting");
      } else if (touch(touches[1], j, t)) {
        // the ERP
      } else if (j < 0.49) {
        // waiting at 2024, looking back at you
        const w = smooth(0.45, 0.475, j);
        rp(112, 0.9 * Math.sin(t * 0.5), 1.6, at).lerp(o3.copy(touches[1].front).add(o2.set(0, 0.05 * Math.sin(t * 2.2), 0)), w);
        orb.drive({ at, size: S, look: ctx.camera.position, lookAmt: w });
        orb.feel("Waiting for you");
      } else if (j < 0.655) {
        // out of the ERP, back into the stream and over to the far bank
        const u = smooth(0.612, 0.655, j);
        orb.drive({ at: rp(lerp(140, 152, u), lerp(0.5, 3.1, u), 0.6 + u, at).lerp(touches[1].front, 1 - smooth(0.605, 0.62, j)), size: S, free: true });
        orb.feel("Crossing");
      } else if (j < 0.765) {
        // along the far bank, behind the report; it peeks out at the edge, and ducks back
        const d = j < 0.715 ? lerp(152, 171.2, smooth(0.655, 0.705, j)) : lerp(171.2, 186, smooth(0.735, 0.765, j));
        const peek = smooth(0.713, 0.72, j) * (1 - smooth(0.728, 0.735, j));
        rp(lerp(d, 172.35, peek), lerp(3.15, 2.85, peek), 1.6, at);
        orb.drive({ at, size: S, look: ctx.camera.position, lookAmt: peek, pin: 0.4 * peek });
        orb.feel(peek > 0.3 ? "Peeking" : "Hiding");
      } else if (j < 0.89) {
        // round Amdocs, against the camera, passing behind it
        const th = 0.6 - TAU * smooth(0.815, 0.89, j), come = smooth(0.765, 0.815, j);
        o2.copy(MP[4]).addScaledVector(FF(4), Math.cos(th) * 1.9).addScaledVector(amdocsSide, Math.sin(th) * 1.9).add(o3.set(0, 0.25 * Math.sin(t * 1.3), 0));
        orb.drive({ at: rp(186, 3.1, 1.4, at).lerp(o2, come), size: S, free: come < 1 });
        orb.feel("Orbiting");
      } else {
        // on toward the light; it stops short, looks back at you once, and goes in
        const go = smooth(0.955, 0.975, j), back = smooth(0.935, 0.941, j) * (1 - smooth(0.949, 0.955, j));
        o2.copy(MP[4]).addScaledVector(FF(4), Math.cos(0.6 - TAU) * 1.9).addScaledVector(amdocsSide, Math.sin(0.6 - TAU) * 1.9);
        at.copy(o2).lerp(STOP, smooth(0.89, 0.93, j)).lerp(END, go);
        look.copy(END).lerp(ctx.camera.position, back);
        orb.drive({ at, size: 0.6 * (1 - smooth(0.968, 0.98, j)), look, lookAmt: 0.5 + 0.5 * back, pin: go, glow: 0.35 + 0.65 * go });
        orb.feel(back > 0.5 ? "Looking back" : "Into the light");
        if (back > 0.5) orb.squash(-0.12 * Math.sin(Math.PI * smooth(0.941, 0.947, j)), UPV);
        if (j >= 0.972 && !trig.flare) {
          trig.flare = true;
          orb.burst(END, 1.1);
        }
      }
    }
    riverU.uSurge.value = surge;
    phase += dt * riverU.uSurge.value * 14;
    riverU.uPhase.value = phase;
  };
  /** the journey owns the orb from just before the river comes into view to the end of it */
  const GGon = (GG: number, j: number) => GG >= 0.515 && j <= 1;
  const sizes = new Map<HTMLElement, { w: number; h: number; at: number }>();
  // the memories' words re-measure once the web fonts have arrived
  document.fonts?.ready.then(() => sizes.clear());

  const api = {
    keys,
    /** the river's brightness (Horizon dims it as the light takes over) */
    gain: riverU.uGain,
    /** how much a memory is the subject right now (0..1): the ambient moments keep out of its way */
    focus: 0,
    update(f: Frame) {
      const { GG } = f, W = ctx.W, H = ctx.H, camera = ctx.camera;
      steer(f, (GG - JS0) / (JS1 - JS0));
      title.style.opacity = String(smooth(JG(-0.01), JG(0.0), GG) * (1 - smooth(JG(0.03), JG(0.075), GG)));
      title.style.transform = `translateY(${(-smooth(JG(0), JG(0.09), GG) * 50).toFixed(1)}px)`;
      let focus = 0;
      // the photos only exist once the film is near the river (a wide phone lens would catch them from far off)
      const near = GG > 0.47;
      // the river itself only once it can be seen (it is dark before 0.3, see Horizon)
      stream.visible = riverDust.pts.visible = GG > 0.3;
      for (const p of [...plates, ...loose]) p.g.visible = near;
      for (const p of plates) {
        if (p.extra) p.extra.g.visible = near;
        for (const e of [p.env, p.envX]) if (e) e.dust.pts.visible = e.haze.visible = near;
      }
      const float = (p: Plate, amt: number) => {
        p.g.position.copy(p.base).y += Math.sin(f.time * 0.55 + p.seed) * 0.04 * amt;
        p.g.quaternion.copy(p.quat).multiply(q1.setFromEuler(e1.set(Math.sin(f.time * 0.37 + p.seed) * 0.026 * amt, Math.sin(f.time * 0.29 + p.seed * 2) * 0.026 * amt, 0)));
      };
      for (const p of loose) {
        float(p, 1);
        p.mat.color.setScalar(0.45);
      }
      plates.forEach((p, i) => {
        const [a, b] = p.m.win.map(JG), on = smooth(a - 0.008, a + 0.003, GG) * (1 - smooth(b - 0.003, b + 0.008, GG));
        focus = Math.max(focus, on);
        // the orb's touch: a soft spill of light on the photo and the dust round it, never a flash
        const spill = flash[i] + 0.35 * inside[i] * (0.5 + 0.5 * Math.sin(f.time * 2.6));
        p.mat.color.setScalar(0.55 + 0.4 * on + 0.08 * spill);
        float(p, 1 - 0.6 * on);
        p.env.dust.gain.value = 0.35 + 0.65 * on + 0.6 * spill;
        p.env.haze.material.opacity = 0.035 * on;
        if (p.extra && p.envX) {
          p.extra.mat.color.setScalar(0.5 + 0.4 * on);
          float(p.extra, 1 - 0.6 * on);
          p.envX.dust.gain.value = 0.35 + 0.65 * on;
          p.envX.haze.material.opacity = 0.03 * on;
        }
        // dust off the torn edges: a little always, more while it is the memory you're in, a puff at the orb's touch
        p.shed.u.uShed.value = TORN.dust * (0.3 + 0.7 * on) + 0.25 * flash[i];
        p.shed.u.uGain.value = p.shed.ready * (0.55 + 0.45 * on);
        p.shed.u.uPuff.value = flash[i];
        if (p.shedX) {
          p.shedX.u.uShed.value = TORN.dust * (0.3 + 0.7 * on);
          p.shedX.u.uGain.value = p.shedX.ready * (0.55 + 0.45 * on);
        }
        if (on <= 0.001) {
          p.label.style.opacity = "0";
          return;
        }
        // the words go where no photo is: beside the photos on whichever side has room, else below or above
        // its size, read from the page only when the screen changes (not every frame, just after moving it)
        let sz = sizes.get(p.label);
        if (!sz || sz.at !== W * 1e5 + H) sizes.set(p.label, (sz = { w: p.label.offsetWidth || 330, h: p.label.offsetHeight || 150, at: W * 1e5 + H }));
        const mw = sz.w, mh = sz.h, narrow = ctx.form.narrow;
        const rects = [rectOf(p, camera, W, H)];
        if (p.extra) rects.push(rectOf(p.extra, camera, W, H));
        const seen = rects.filter((r) => r.front);
        // (on a phone the words sit in the bottom of the frame, just above the dock)
        let tx = 24, ty = narrow ? ctx.floor - mh : ctx.VH - mh - 40;
        if (!narrow && seen.length) {
          const u = seen.reduce((a, r) => ({ l: Math.min(a.l, r.l), t: Math.min(a.t, r.t), r: Math.max(a.r, r.r), b: Math.max(a.b, r.b) }), { l: 1e9, t: 1e9, r: -1e9, b: -1e9 });
          const main = seen[0], cy = (main.t + main.b) / 2 - mh / 2, L = 48, R = W - 230 - mw, T = 96, B = ctx.VH - 90 - mh;
          const free = (x: number, y: number) => x >= L && x <= R && y >= T && y <= B && seen.every((r) => x + mw < r.l - 16 || x > r.r + 16 || y + mh < r.t - 16 || y > r.b + 16);
          const tries: [number, number][] = [
            [main.r + 40, cy], [main.l - 40 - mw, cy], [u.r + 40, cy], [u.l - 40 - mw, cy],
            [clamp(main.l, L, R), main.b + 28], [clamp(main.l, L, R), main.t - 28 - mh], [L, B],
          ];
          const pick = tries.find(([x, y]) => free(x, clamp(y, T, B))) ?? tries[tries.length - 1];
          tx = pick[0];
          ty = clamp(pick[1], T, B);
        }
        // it slides to a new spot rather than jumping
        if (!Number.isFinite(p.lx)) Object.assign(p, { lx: tx, ly: ty });
        const k = f.fixed ? 1 : 1 - Math.exp(-f.dt * 6);
        p.lx += (tx - p.lx) * k;
        p.ly += (ty - p.ly) * k;
        p.label.style.opacity = (seen.length || narrow ? on : 0).toFixed(3);
        p.label.style.transform = `translate(${(p.lx + f.layerX).toFixed(1)}px, ${(p.ly + (1 - on) * 20 + f.layerY).toFixed(1)}px)`;
      });
      api.focus = focus;
    },
  };
  return api;
}
