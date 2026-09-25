import * as THREE from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import type { Ctx, Frame } from "../ctx";
import type { Figure } from "../figure";
import { DENT_GLSL, DUST_FRAG, GLSL_FN, STIR_GLSL, turnGLSL } from "../glsl";
import { R, V, emberAt, gauss, smooth } from "../math";
import { ARC, FIG_X, FL0, FL1, FRAC, O1, ORB_R, PC, PL_R, planetRot, toPlanet } from "../layout";

/** how much brighter he glows on the first screen than the dust he is made of */
const GLOW = 1.0;

/**
 * ARRIVAL, and the being itself: one body of ember dust that is his figure, peels off his
 * shoulder, gathers into the orb, flies (shedding the four moons) and becomes the Think planet.
 * A second, finer layer of the same dust gives the figure its presence on the first screen.
 */
export function buildBeing(ctx: Ctx, fig: Figure, orbGeo: THREE.BufferGeometry, planetGeo: THREE.BufferGeometry) {
  const N = Math.round(60000 * ctx.quality);
  const FIGM = fig.matrixAt(FIG_X, 0, 0);
  const A = new Float32Array(N * 3), B = new Float32Array(N * 3), C = new Float32Array(N * 3), COL = new Float32Array(N * 3);
  const SZ = new Float32Array(N), LA = new Float32Array(N), LB = new Float32Array(N), D1 = new Float32Array(N);
  const D2S = new Float32Array(N), D2W = new Float32Array(N), FR = new Float32Array(N), GRP = new Float32Array(N), SEED = new Float32Array(N);
  {
    const fs = new MeshSurfaceSampler(fig.mesh).build(), p = V(), n = V(), Lk = V(-0.6, 0.5, 0.6).normalize(), figPts: THREE.Vector3[] = [];
    for (let i = 0; i < N; i++) {
      fs.sample(p, n);
      p.applyMatrix4(FIGM);
      figPts.push(p.clone());
      A.set([p.x, p.y, p.z], i * 3);
      LA[i] = (0.2 + 0.6 * Math.max(0, n.dot(Lk)) + 0.8 * Math.pow(1 - Math.abs(n.z), 3)) * 1.75;
    }
    let sh = V(-99, 0, 0);
    for (const q of figPts) if (q.y > 0.8 && q.y < 1.0 && q.x > sh.x) sh = q.clone();
    const om = new THREE.Mesh(orbGeo);
    om.scale.setScalar(ORB_R);
    om.position.copy(O1);
    om.updateMatrixWorld(true);
    const pm = new THREE.Mesh(planetGeo);
    pm.scale.setScalar(PL_R);
    pm.position.copy(PC);
    pm.rotation.copy(planetRot);
    pm.updateMatrixWorld(true);
    const os = new MeshSurfaceSampler(new THREE.Mesh(orbGeo)).build(), ps = new MeshSurfaceSampler(new THREE.Mesh(planetGeo)).build(), nm = new THREE.Matrix3();
    for (let i = 0; i < N; i++) {
      const seed = R();
      SEED[i] = seed;
      D1[i] = Math.min(1, figPts[i].distanceTo(sh) / 2.4 + R() * 0.12); // it leaves his shoulder first
      os.sample(p, n);
      p.applyMatrix4(om.matrixWorld);
      n.applyMatrix3(nm.getNormalMatrix(om.matrixWorld)).normalize();
      if (seed < 0.18) p.addScaledVector(n, 0.05 + Math.abs(gauss()) * 0.35);
      else p.addScaledVector(n, -0.02);
      B.set([p.x, p.y, p.z], i * 3);
      LB[i] = seed < 0.18 ? 0.3 : (0.06 + 0.8 * Math.pow(Math.max(0, n.dot(Lk)), 1.4)) * 0.6;
      const d2 = Math.min(1, Math.max(0, 0.5 - (p.clone().sub(O1).dot(toPlanet) / ORB_R) * 0.5 + (R() - 0.5) * 0.25)); // held in dust: the side facing the planet goes first
      ps.sample(p, n);
      p.applyMatrix4(pm.matrixWorld);
      n.applyMatrix3(nm.getNormalMatrix(pm.matrixWorld)).normalize();
      if (seed < 0.22) p.addScaledVector(n, 0.12 + Math.abs(gauss()) * 1.0);
      else p.addScaledVector(n, -0.06);
      C.set([p.x, p.y, p.z], i * 3);
      D2S[i] = d2 * 0.72;
      D2W[i] = 1 - D2S[i];
      FR[i] = 1;
      GRP[i] = 0;
      COL.set(emberAt(0.12 + R() * 0.5), i * 3);
      SZ[i] = 0.016 + R() * 0.028;
    }
    // every 25th grain belongs to a moon: it rides at the head of the comet and stops where its moon buds
    for (let i = 0; i < N; i++) {
      const k = i % 25;
      if (k > 3) continue;
      const r = [0.36, 0.5, 0.4, 0.44][k], d = V(gauss(), gauss(), gauss()).normalize().multiplyScalar(r * (0.9 + R() * 0.25)), c = O1.clone().lerp(PC, FRAC[k]).add(d);
      C.set([c.x, c.y, c.z], i * 3);
      D2S[i] = R() * 0.03;
      D2W[i] = FRAC[k] - D2S[i];
      FR[i] = FRAC[k];
      GRP[i] = k + 1;
    }
  }
  let dust: THREE.Points, skin: THREE.Points;
  const u = {
    ...ctx.u.TURN,
    ...ctx.u.CUR,
    uFade: { value: 1 },
    // he glows a little brighter while he is whole; the dust is its usual self once it has left him
    uGlow: { value: GLOW },
    uT1: { value: 0 },
    uT2: { value: 0 },
    uArc: { value: ARC },
    uAbsorb: { value: new THREE.Vector4() },
    uTime: ctx.u.TIME,
    uFocus: ctx.u.FOCUS,
    uScale: ctx.u.SCALE,
  };
  {
    const g = new THREE.BufferGeometry(),
      at = (k: string, a: Float32Array, n: number) => g.setAttribute(k, new THREE.BufferAttribute(a, n));
    at("position", A, 3); at("aB", B, 3); at("aC", C, 3); at("aCol", COL, 3); at("aSize", SZ, 1); at("aLA", LA, 1); at("aLB", LB, 1);
    at("aD1", D1, 1); at("aD2", D2S, 1); at("aW2", D2W, 1); at("aFr", FR, 1); at("aGrp", GRP, 1); at("aSeed", SEED, 1);
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: u,
      vertexShader: /* glsl */ `
        attribute vec3 aB, aC, aCol; attribute float aSize, aLA, aLB, aD1, aD2, aW2, aFr, aGrp, aSeed;
        uniform float uT1, uT2, uTime, uFocus, uScale, uFade, uGlow; uniform vec3 uArc; uniform vec4 uAbsorb; varying vec3 vC; varying float vCoc;
        ${GLSL_FN}
        ${STIR_GLSL}
        ${DENT_GLSL}
        ${turnGLSL(FIG_X)}
        void main(){
          float d1 = aD1 * 0.35, s1 = smoothstep(0.0, 1.0, clamp((uT1 - d1) / (1.0 - d1), 0.0, 1.0));
          float s2 = smoothstep(0.0, 1.0, clamp((uT2 - aD2) / aW2, 0.0, 1.0));
          vec3 p = mix(mix(turnP(position), aB, s1), aC, s2); float f1 = sin(3.14159 * s1), f2 = sin(3.14159 * s2 * aFr);
          p += (vec3(0.25, 0.7, 0.35) + flow(p * 0.6 + uTime * 0.05) * 0.5) * f1;
          p += (vec3(0.0, 1.2, 0.0) + uArc + flow(p * 0.3 + 3.0 + uTime * 0.05) * 0.5) * f2;
          p += flow(p * 0.9 + uTime * 0.08) * 0.015;
          float moving = sin(3.14159 * s2);
          float b = mix(mix(aLA, aLB, s1), aLB * 0.9 + step(aSeed, 0.22) * 0.1, s2) + 0.7 * f1 + 1.1 * moving;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); float d = -mv.z;
          float st = stir(mv, d * s1, 22.0);
          float dn = dent(mv, 1.0 - s1);
          float coc = clamp(abs(d - uFocus) * 0.045, 0.0, 1.0);
          gl_PointSize = min(aSize * (260.0 * uScale / d) * (1.0 + 1.4 * (f1 + f2)) * (1.0 + coc * 2.0), 36.0); vCoc = coc;
          float gone = aGrp < 0.5 ? 0.0 : aGrp < 1.5 ? uAbsorb.x : aGrp < 2.5 ? uAbsorb.y : aGrp < 3.5 ? uAbsorb.z : uAbsorb.w;
          vC = aCol * b * mix(1.0, 0.3, coc) * (1.0 + st * 0.5) * (1.0 - 0.72 * dn) * (1.0 - gone) * uFade * uGlow;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: DUST_FRAG,
    });
    dust = new THREE.Points(g, m);
    dust.frustumCulled = false;
    ctx.scene.add(dust);
  }

  // the finer layer of the same dust on his figure: it gives the bust its presence, then lifts away with the rest
  const NS = Math.round(70000 * ctx.quality);
  const KP = new Float32Array(NS * 3), KN = new Float32Array(NS * 3), KD = new Float32Array(NS), KS = new Float32Array(NS), KZ = new Float32Array(NS);
  {
    const fs = new MeshSurfaceSampler(fig.mesh).build(), p = V(), n = V(), nm = new THREE.Matrix3().getNormalMatrix(FIGM);
    for (let i = 0; i < NS; i++) {
      fs.sample(p, n);
      p.applyMatrix4(FIGM);
      n.applyMatrix3(nm).normalize();
      KP.set([p.x, p.y, p.z], i * 3);
      KN.set([n.x, n.y, n.z], i * 3);
      KS[i] = R();
      KZ[i] = 0.018 + R() * 0.028;
    }
    const shd = V(-99, 0, 0);
    for (let k = 0; k < NS; k++) {
      const y = KP[k * 3 + 1];
      if (y > 0.8 && y < 1.0 && KP[k * 3] > shd.x) shd.set(KP[k * 3], y, KP[k * 3 + 2]);
    }
    for (let k = 0; k < NS; k++) KD[k] = Math.min(1, Math.hypot(KP[k * 3] - shd.x, KP[k * 3 + 1] - shd.y, KP[k * 3 + 2] - shd.z) / 2.4 + R() * 0.12);
  }
  const skinU = { ...ctx.u.TURN, ...ctx.u.CUR, uT1: { value: 0 }, uGlow: u.uGlow, uTime: ctx.u.TIME, uScale: ctx.u.SCALE, uFocus: ctx.u.FOCUS };
  {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(KP, 3));
    g.setAttribute("aN", new THREE.BufferAttribute(KN, 3));
    g.setAttribute("aD", new THREE.BufferAttribute(KD, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(KS, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(KZ, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: skinU,
      vertexShader: /* glsl */ `
        attribute vec3 aN; attribute float aD, aSeed, aSize; uniform float uT1, uGlow, uTime, uScale, uFocus; varying vec3 vC; varying float vCoc;
        ${GLSL_FN}
        ${STIR_GLSL}
        ${DENT_GLSL}
        ${turnGLSL(FIG_X)}
        void main(){
          float tw0 = turnW(position); vec3 n = normalize(turnV(aN, tw0)), p = turnP(position);
          float key = max(dot(n, normalize(vec3(-0.6, 0.5, 0.6))), 0.0), edge = pow(1.0 - abs(n.z), 3.0);
          vec3 ember = mix(vec3(1.0, 0.86, 0.66), vec3(0.86, 0.38, 0.15), fract(aSeed * 7.13));
          vec3 col = ember * (0.2 + 0.6 * key + 0.8 * edge) * 1.6;
          col *= 0.85 + 0.2 * sin(uTime * 2.1 + aSeed * 60.0);
          float dis = clamp((uT1 * 1.7 - aD * 0.8) / 0.55, 0.0, 1.0);
          p += (vec3(0.25, 0.9, 0.3) + flow(p * 0.8 + uTime * 0.06) * 0.6) * dis * 1.3 + flow(p * 1.3 + uTime * 0.07) * 0.006;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); float dn = dent(mv, 1.0); float d = -mv.z;
          float coc = clamp(abs(d - uFocus) * 0.05, 0.0, 1.0);
          gl_PointSize = min(aSize * (260.0 * uScale / d) * (1.0 - 0.25 * dn) * (1.0 + coc * 2.0), 30.0); vCoc = coc;
          vC = col * (1.0 - 0.76 * dn) * (1.0 - dis) * mix(1.0, 0.35, coc) * uGlow;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: DUST_FRAG,
    });
    skin = new THREE.Points(g, m);
    skin.frustumCulled = false;
    ctx.scene.add(skin);
  }

  // a sample of the grains, for the chase camera to follow the flight
  const PROBE = Array.from({ length: 600 }, (_, k) => Math.floor((k * N) / 600) + 7).filter((i) => i < N && GRP[i] === 0);

  return {
    u,
    /** where the flying dust actually is: its centre and spread */
    flightCloud(u2: number, c: THREE.Vector3, lo: THREE.Vector3, hi: THREE.Vector3, q: THREE.Vector3, tmp: THREE.Vector3) {
      c.set(0, 0, 0);
      lo.set(1e9, 1e9, 1e9);
      hi.set(-1e9, -1e9, -1e9);
      for (const i of PROBE) {
        const d = D2S[i], x = Math.min(1, Math.max(0, (u2 - d) / D2W[i])), e = x * x * (3 - 2 * x), f = Math.sin(Math.PI * e);
        q.set(B[i * 3], B[i * 3 + 1], B[i * 3 + 2]).lerp(tmp.set(C[i * 3], C[i * 3 + 1], C[i * 3 + 2]), e).addScaledVector(ARC, f);
        q.y += 1.2 * f;
        c.add(q);
        lo.min(q);
        hi.max(q);
      }
      return c.multiplyScalar(1 / PROBE.length);
    },
    update(f: Frame) {
      const t1 = smooth(0.05, 0.17, f.s), t2 = smooth(FL0, FL1, f.s);
      u.uT1.value = t1;
      u.uT2.value = t2;
      skinU.uT1.value = t1;
      u.uGlow.value = 1 + (GLOW - 1) * (1 - t1);
      // he looks toward you while he is still whole
      const still = 1 - smooth(0.03, 0.08, f.G);
      ctx.u.TURN.uYaw.value = f.cam.x * 0.38 * still;
      ctx.u.TURN.uPitch.value = f.cam.y * 0.14 * still;
      // the cursor presses a soft dent into him, only on the first screen
      const want = ctx.u.CUR.uActive.value * (1 - smooth(0.035, 0.07, f.G));
      ctx.u.CUR.uDentAmt.value += (want - ctx.u.CUR.uDentAmt.value) * (1 - Math.exp(-f.dt * 5));
      u.uFade.value = 1 - smooth(0.46, 0.5, f.G);
      // drawn only while they can be seen: the skin has lifted away by s 0.17, the dust has faded by G 0.5
      skin.visible = f.s < 0.17;
      dust.visible = f.G < 0.5;
    },
  };
}
export type Being = ReturnType<typeof buildBeing>;
