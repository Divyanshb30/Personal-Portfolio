import * as THREE from "three";
import type { Ctx, Frame } from "../ctx";
import type { Key } from "../director";
import { block, el } from "../ctx";
import { STIR_GLSL } from "../glsl";
import { glowTex, points } from "../helpers";
import { COOL, R, TAU, UP, V, clamp, emberAt, gauss, lerp, rng, smooth } from "../math";
import { JG, JO, JS0, JS1 } from "../layout";
import { MEMORIES } from "../data";
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

/** Photos become ember duotones (black → ember → warm white) with a soft vignette. */
async function duotone(src: string, crop: [number, number, number, number], outW = 1024) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const [sx, sy, sw, sh] = crop, w = outW, h = Math.round((outW * sh) / sw);
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const g = cv.getContext("2d")!;
  g.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h), px = d.data;
  const stops: [number, number[]][] = [[0, [5, 5, 7]], [0.32, [52, 19, 7]], [0.58, [158, 70, 30]], [0.8, [250, 152, 84]], [1, [255, 234, 208]]];
  const ramp = (t: number) => {
    for (let k = 1; k < stops.length; k++)
      if (t <= stops[k][0]) {
        const [a, ca] = stops[k - 1], [b, cb] = stops[k], f = (t - a) / (b - a);
        return ca.map((c, j) => c + (cb[j] - c) * f);
      }
    return stops[4][1];
  };
  for (let i = 0; i < px.length; i += 4) {
    const x = (i / 4) % w, y = Math.floor(i / 4 / w), vig = 1 - 0.4 * Math.pow(Math.hypot(x / w - 0.5, y / h - 0.5) * 1.4, 2.2);
    const lum = clamp(((0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255 - 0.06) * 1.18, 0, 1) * vig;
    const c = ramp(lum);
    px[i] = c[0];
    px[i + 1] = c[1];
    px[i + 2] = c[2];
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A warm plate that says a photo is on its way. */
function placeholder(ctx: Ctx, cap: string) {
  const w = 1024, h = 680, cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  const draw = () => {
    const g = cv.getContext("2d")!;
    const bg = g.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h / 2, w * 0.7);
    bg.addColorStop(0, "#5a2a12");
    bg.addColorStop(1, "#140a06");
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(255,200,160,.8)";
    g.setLineDash([8, 10]);
    g.lineWidth = 3;
    g.strokeRect(24, 24, w - 48, h - 48);
    if (cap) {
      const mono = ctx.root.querySelector(".mono");
      g.fillStyle = "rgba(255,225,195,.95)";
      g.font = `500 30px ${mono ? getComputedStyle(mono).fontFamily : "monospace"}`;
      g.textAlign = "center";
      g.fillText(`Photo coming · ${cap}`.toUpperCase(), w / 2, h / 2);
    }
    t.needsUpdate = true;
  };
  draw();
  document.fonts?.ready.then(draw);
  return t;
}

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
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0x000000, side: THREE.DoubleSide });
  g.add(new THREE.Mesh(new THREE.PlaneGeometry(wid, hgt), mat));
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTex(), color: 0xff9a50, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }),
  );
  glow.scale.set(wid * 1.7, hgt * 1.5, 1);
  glow.position.set(0, 0, -0.35);
  g.add(glow);
  return { g, mat, glow, wid, hgt };
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
    const l = new THREE.LineSegments(g, m);
    l.frustumCulled = false;
    ctx.scene.add(l);
  }
  // dust drifting all along the river
  points(
    ctx,
    40000,
    () => {
      const d = R() * RL, f = rframe(d);
      return river(d).addScaledVector(f.R, gauss() * 9).addScaledVector(f.U, gauss() * 6).addScaledVector(f.T, gauss() * 3);
    },
    () => (R() < 0.7 ? emberAt(0.2 + R() * 0.6) : COOL).map((v) => v * 0.2),
    () => 0.025 + R() * 0.06,
  );

  // his memories, standing on the banks
  const plates = MEMORIES.map((m, i) => {
    const f = rframe(m.d), pos = river(m.d).addScaledVector(f.R, m.bank).addScaledVector(f.U, m.h);
    const aspect = m.photo ? m.photo[3] / m.photo[4] : 1024 / 680;
    const p = plate(ctx, placeholder(ctx, m.photo ? "" : m.cap), aspect, 3.3, pos, FACES[i](f).normalize());
    if (m.photo) {
      const [src, ...crop] = m.photo;
      duotone(src, crop as [number, number, number, number]).then((t) => {
        p.mat.map = t;
        p.mat.needsUpdate = true;
      }, console.error);
    }
    let extra: ReturnType<typeof plate> | null = null;
    if (m.extra) {
      const e = m.extra, fe = rframe(e.d), [src, ...crop] = e.photo;
      const at = river(e.d).addScaledVector(fe.R, e.bank).addScaledVector(fe.U, e.h);
      // it faces the spot on the river it is filmed from, or else the same way as the memory's own plate
      const face = e.look !== undefined ? river(e.look).addScaledVector(rframe(e.look).U, 1).sub(at).normalize() : FACES[i](fe).normalize();
      const ep = plate(ctx, placeholder(ctx, ""), e.photo[3] / e.photo[4], e.w, at, face);
      duotone(src, crop as [number, number, number, number], 700).then((t) => {
        ep.mat.map = t;
        ep.mat.needsUpdate = true;
      }, console.error);
      extra = ep;
    }
    const label = el(ctx, "mem", `<div class="yr">${m.y}</div><div class="mono t">${m.t}</div>${m.k ? `<div class="k">${m.k}</div>` : ""}<div class="n">${m.n}</div>`);
    return { ...p, m, pos, extra, label };
  });

  // the shots: sixteen setups on the journey's own clock
  const MP = plates.map((p) => p.pos), FF = (i: number) => FACES[i](rframe(MEMORIES[i].d)).normalize();
  const keys: Key[] = [
    { s: 0.0, name: "Journey · establishing", pos: JO.clone().add(V(0, 0.4, 11.5)), tgt: JO.clone(), fov: 40 },
    { s: 0.055, name: "Journey · establishing", pos: JO.clone().add(V(1.6, 0.5, 10.8)), tgt: JO.clone().add(V(1.6, 0, 0)), fov: 40 },
    { s: 0.125, name: "Crane down, bank into the turn", pos: river(44).addScaledVector(rframe(44).U, 1.1).addScaledVector(rframe(44).T, -3), tgt: river(56).addScaledVector(rframe(56).U, 0.2), fov: 54, roll: -0.1 },
    { s: 0.19, name: "Ride the current", pos: river(52).addScaledVector(rframe(52).U, 1.0).addScaledVector(rframe(52).R, -0.6), tgt: MP[0].clone(), fov: 48, roll: -0.03 },
    { s: 0.25, name: "Pan past 2021", pos: river(61).addScaledVector(rframe(61).U, 0.9).addScaledVector(rframe(61).R, -0.4), tgt: MP[0].clone(), fov: 44, roll: 0.04 },
    { s: 0.3, name: "Ride the current", pos: river(70).addScaledVector(rframe(70).U, 1.3), tgt: river(84), fov: 50 },
    { s: 0.37, name: "Crane up, overhead", pos: river(94).add(V(0, 21, 3)), tgt: river(99).add(V(0, 0, -1)), fov: 42 },
    { s: 0.445, name: "Overhead drift, 2022", pos: river(104).add(V(0, 19, 3)), tgt: river(107).add(V(0, 0, -1)), fov: 42 },
    { s: 0.505, name: "Swoop down, low angle on 2024", pos: MP[2].clone().addScaledVector(FF(2), 5).add(V(0, -1.9, 0)), tgt: MP[2].clone().add(V(0, 0.25, 0)), fov: 42, roll: 0.05 },
    { s: 0.585, name: "Slow push in", pos: MP[2].clone().addScaledVector(FF(2), 4.6).add(V(0, -0.9, 0)), tgt: MP[2].clone(), fov: 36 },
    { s: 0.655, name: "Track alongside, 2025", pos: river(158).addScaledVector(rframe(158).R, -11).add(V(0, 0.9, 0)), tgt: river(161), fov: 40 },
    { s: 0.755, name: "Track alongside, 2025", pos: river(172).addScaledVector(rframe(172).R, -11).add(V(0, 0.7, 0)), tgt: river(171), fov: 40 },
    { s: 0.815, name: "Orbit, Amdocs", pos: orbitPt(MP[4], FF(4).multiplyScalar(7.4), -0.9, 0.4), tgt: MP[4].clone(), fov: 38 },
    { s: 0.89, name: "Orbit, Amdocs", pos: orbitPt(MP[4], FF(4).multiplyScalar(6.8), 0.55, 1.1), tgt: MP[4].clone(), fov: 36 },
    { s: 0.955, name: "Pull back, toward the light", pos: river(196).add(V(0, 11, 0)).addScaledVector(rframe(196).T, -16), tgt: END.clone(), fov: 46 },
    { s: 1.0, name: "Toward the light", pos: river(214).add(V(0, 6, 0)).addScaledVector(rframe(214).T, -8), tgt: END.clone(), fov: 44 },
  ].map((k) => ({ ...k, s: JG(k.s) }));

  const title = block(ctx, "journey"), tmp = V();

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
      } else if (j < 0.37 || (current.t >= 0 && j < 0.45)) {
        // (once it has started, the current's joke keeps the orb until it's told: past 0.40 it hurries)
        const d = lerp(82, 94, smooth(0.3, 0.37, j));
        if (current.t >= 0) surge = currentGag(current.t, d, t);
        else if (current.done) orb.drive({ at: rp(d + 8, 0.8, 3.0 + 0.1 * Math.sin(t * 1.9), at), size: S, free: true });
        else orb.drive({ at: rp(d, 0, 0.35 + 0.15 * Math.sin(t * 1.7), at), size: S, free: true });
      } else if (j < 0.45) {
        // far off, down the river, while you look down on 2022
        orb.drive({ at: rp(lerp(106, 112, smooth(0.37, 0.45, j)), 0.9 * Math.sin(t * 0.5), 1.6, at), size: S, free: true });
      } else if (touch(touches[1], j, t)) {
        // the ERP
      } else if (j < 0.49) {
        // waiting at 2024, looking back at you
        const w = smooth(0.45, 0.475, j);
        rp(112, 0.9 * Math.sin(t * 0.5), 1.6, at).lerp(o3.copy(touches[1].front).add(o2.set(0, 0.05 * Math.sin(t * 2.2), 0)), w);
        orb.drive({ at, size: S, look: ctx.camera.position, lookAmt: w });
      } else if (j < 0.655) {
        // out of the ERP, back into the stream and over to the far bank
        const u = smooth(0.612, 0.655, j);
        orb.drive({ at: rp(lerp(140, 152, u), lerp(0.5, 3.1, u), 0.6 + u, at).lerp(touches[1].front, 1 - smooth(0.605, 0.62, j)), size: S, free: true });
      } else if (j < 0.765) {
        // along the far bank, behind the report; it peeks out at the edge, and ducks back
        const d = j < 0.715 ? lerp(152, 171.2, smooth(0.655, 0.705, j)) : lerp(171.2, 186, smooth(0.735, 0.765, j));
        const peek = smooth(0.713, 0.72, j) * (1 - smooth(0.728, 0.735, j));
        rp(lerp(d, 172.35, peek), lerp(3.15, 2.85, peek), 1.6, at);
        orb.drive({ at, size: S, look: ctx.camera.position, lookAmt: peek, pin: 0.4 * peek });
      } else if (j < 0.89) {
        // round Amdocs, against the camera, passing behind it
        const th = 0.6 - TAU * smooth(0.815, 0.89, j), come = smooth(0.765, 0.815, j);
        o2.copy(MP[4]).addScaledVector(FF(4), Math.cos(th) * 1.9).addScaledVector(amdocsSide, Math.sin(th) * 1.9).add(o3.set(0, 0.25 * Math.sin(t * 1.3), 0));
        orb.drive({ at: rp(186, 3.1, 1.4, at).lerp(o2, come), size: S, free: come < 1 });
      } else {
        // on toward the light; it stops short, looks back at you once, and goes in
        const go = smooth(0.955, 0.975, j), back = smooth(0.935, 0.941, j) * (1 - smooth(0.949, 0.955, j));
        o2.copy(MP[4]).addScaledVector(FF(4), Math.cos(0.6 - TAU) * 1.9).addScaledVector(amdocsSide, Math.sin(0.6 - TAU) * 1.9);
        at.copy(o2).lerp(STOP, smooth(0.89, 0.93, j)).lerp(END, go);
        look.copy(END).lerp(ctx.camera.position, back);
        orb.drive({ at, size: 0.6 * (1 - smooth(0.968, 0.98, j)), look, lookAmt: 0.5 + 0.5 * back, pin: go, glow: 0.35 + 0.65 * go });
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

  return {
    keys,
    /** the river's brightness (Horizon dims it as the light takes over) */
    gain: riverU.uGain,
    update(f: Frame) {
      const { GG, cam } = f, W = ctx.W, H = ctx.H, camera = ctx.camera;
      steer(f, (GG - JS0) / (JS1 - JS0));
      title.style.opacity = String(smooth(JG(-0.01), JG(0.0), GG) * (1 - smooth(JG(0.03), JG(0.075), GG)));
      title.style.transform = `translateY(${(-smooth(JG(0), JG(0.09), GG) * 50).toFixed(1)}px)`;
      plates.forEach((p, i) => {
        const [a, b] = p.m.win.map(JG), on = smooth(a - 0.008, a + 0.003, GG) * (1 - smooth(b - 0.003, b + 0.008, GG));
        // it answers the orb's touch with a flash, and glows faintly, like a pulse, while the orb is inside
        p.mat.color.setScalar(0.42 + 0.4 * on + 0.7 * flash[i]);
        p.glow.material.opacity = 0.05 + 0.15 * on + 0.5 * flash[i] + 0.08 * inside[i] * (0.5 + 0.5 * Math.sin(f.time * 2.6));
        p.g.scale.setScalar(1 + 0.035 * flash[i]);
        if (p.extra) p.extra.mat.color.setScalar(0.35 + 0.3 * on);
        if (on <= 0.001) {
          p.label.style.opacity = "0";
          return;
        }
        // the words sit beside the plate, on whichever side has room
        tmp.copy(p.pos).project(camera);
        const x = (tmp.x * 0.5 + 0.5) * W, y = (-tmp.y * 0.5 + 0.5) * H, dist = camera.position.distanceTo(p.pos);
        const half = (p.wid / 2 / (dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))) * (H / 2), leftSide = x > W * 0.5;
        const mw = p.label.offsetWidth || 330, narrow = W < 760;
        const tx = narrow ? 24 : clamp(leftSide ? x - half - 40 - mw : x + half + 40, 48, W - mw - 230);
        const ty = narrow ? H - p.label.offsetHeight - 40 : clamp(y - 60, 110, H - 260);
        p.label.style.opacity = (tmp.z < 1 ? on : 0).toFixed(3);
        p.label.style.transform = `translate(${(tx - cam.x * 22).toFixed(1)}px, ${(ty + (1 - on) * 20 + cam.y * 14).toFixed(1)}px)`;
      });
    },
  };
}
