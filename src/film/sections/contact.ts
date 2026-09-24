import * as THREE from "three";
import type { Ctx, Frame } from "../ctx";
import type { Key } from "../director";
import { block } from "../ctx";
import { DUST_FRAG, GLSL_FN, STIR_GLSL } from "../glsl";
import { livingSkin, molten, poke, sprite } from "../helpers";
import { R, V, clamp, emberAt, fbm, gauss, smooth } from "../math";
import { END } from "./journey";

/** where the scroll hands over: past this "Let's talk" is in, and the orb forms on its own */
const FORM_AT = 0.958, UNFORM_AT = 0.946;
const FORM_SECS = 5, UNFORM_SECS = 2.2;

/**
 * CONTACT. After the Horizon statement, scrolling brings "Let's talk" in and the page ends there.
 * Then, with no more scrolling, the light sends its dust across and the dust becomes the orb again,
 * molten, jelly under the cursor. Scrolling back up sends it home to the light.
 */
export function buildContact(ctx: Ctx, orbGeo: THREE.BufferGeometry) {
  const CT = END.clone().add(V(-4.5, 0.4, 7)), OC = CT.clone().add(V(0, 0.3, 0)), OR = 1.05;
  const contactU = { uF: { value: 0 }, uHide: { value: 0 }, uTime: ctx.u.TIME, uScale: ctx.u.SCALE, uFocus: ctx.u.FOCUS, ...ctx.u.CUR };
  {
    // every grain starts in the light and lands on the orb's surface, from the ground up
    const n = Math.round(70000 * ctx.quality);
    const P0 = new Float32Array(n * 3), P1 = new Float32Array(n * 3), DL = new Float32Array(n), LT = new Float32Array(n), CO = new Float32Array(n * 3), SZ = new Float32Array(n);
    const Lk = V(-0.6, 0.5, 0.6).normalize(), d = V(), p = V();
    for (let i = 0; i < n; i++) {
      d.set(gauss(), gauss(), gauss()).normalize();
      p.copy(OC).addScaledVector(d, OR * (1 + fbm(d.x * 0.78 + 9, d.y * 0.78 + 6.3, d.z * 0.78 - 9) * 0.34));
      P1.set([p.x, p.y, p.z], i * 3);
      const s0 = V(gauss(), gauss(), gauss()).multiplyScalar(0.45).add(END);
      P0.set([s0.x, s0.y, s0.z], i * 3);
      DL[i] = clamp((p.y - CT.y + 1.45) / 2.9, 0, 1) * 0.5 + R() * 0.08;
      LT[i] = (0.2 + 0.6 * Math.max(0, d.dot(Lk)) + 0.8 * Math.pow(1 - Math.abs(d.z), 3)) * 1.6;
      CO.set(emberAt(0.12 + R() * 0.5), i * 3);
      SZ[i] = 0.016 + R() * 0.028;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(P1, 3));
    g.setAttribute("aS", new THREE.BufferAttribute(P0, 3));
    g.setAttribute("aDel", new THREE.BufferAttribute(DL, 1));
    g.setAttribute("aL", new THREE.BufferAttribute(LT, 1));
    g.setAttribute("aCol", new THREE.BufferAttribute(CO, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(SZ, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: contactU,
      vertexShader: /* glsl */ `
        attribute vec3 aS, aCol; attribute float aDel, aL, aSize; uniform float uF, uHide, uTime, uScale, uFocus; varying vec3 vC; varying float vCoc;
        ${GLSL_FN}
        ${STIR_GLSL}
        void main(){
          float x = clamp((uF - aDel) / 0.5, 0.0, 1.0), e = x * x * (3.0 - 2.0 * x), f = sin(3.14159 * e);
          vec3 p = mix(aS, position, e) + (vec3(0.0, 0.8, 0.6) + flow(position * 0.5 + uTime * 0.05) * 0.9) * f + flow(position * 1.1 + uTime * 0.07) * 0.012;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); float d = -mv.z; float st = stir(mv, d * e, 20.0);
          float coc = clamp(abs(d - uFocus) * 0.045, 0.0, 1.0), shown = step(0.001, uF) * (1.0 - uHide);
          gl_PointSize = min(aSize * (260.0 * uScale / d) * (1.0 + 1.2 * f) * (1.0 + coc * 2.0), 36.0); vCoc = coc;
          vC = aCol * (mix(0.3, aL, e) + 1.1 * f) * mix(1.0, 0.3, coc) * (1.0 + st * 0.5) * shown; gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: DUST_FRAG,
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    ctx.scene.add(pts);
  }
  const skin = livingSkin(ctx, molten(), V(0, -1, 0));
  const orb = new THREE.Mesh(orbGeo, skin.mat);
  orb.scale.setScalar(OR);
  orb.position.copy(OC);
  orb.visible = false;
  ctx.scene.add(orb);
  const glow = sprite(ctx, 0xff8a40, 4.4, OC.clone().add(V(0, 0, -0.8)), 0);

  const keys: Key[] = [
    { s: 0.965, name: "Contact", pos: CT.clone().add(V(-1.0, 0.1, 7.4)), tgt: CT.clone().add(V(-1.0, 0.05, 0)), fov: 30 },
    { s: 1.0, name: "Contact · hold", pos: CT.clone().add(V(-0.8, 0.2, 7.0)), tgt: CT.clone().add(V(-0.95, 0.08, 0)), fov: 30 },
  ];
  const words = block(ctx, "contact");
  const ray = new THREE.Raycaster(), inv = new THREE.Matrix4(), tmp = V(), tmp2 = V();
  let form = 0, forming = false;

  return {
    keys,
    update(f: Frame) {
      const { GG, dt, time } = f;
      const op = smooth(0.935, 0.962, GG);
      words.style.opacity = String(op);
      words.style.pointerEvents = op > 0.5 ? "auto" : "none";
      // the orb keeps its own clock: once the words are in it forms, and it unforms if you scroll back
      if (GG > FORM_AT) forming = true;
      else if (GG < UNFORM_AT) forming = false;
      form = clamp(form + (forming ? dt / FORM_SECS : -dt / UNFORM_SECS), 0, 1);
      contactU.uF.value = 1.1 * smooth(0, 0.72, form);
      const reveal = smooth(0.58, 0.95, form);
      contactU.uHide.value = 0.88 * smooth(0.72, 1, form);
      skin.u.uReveal.value = reveal;
      orb.visible = reveal > 0.001;
      glow.material.opacity = 0.28 * reveal;
      orb.rotation.set(time * 0.05, time * 0.08, 0);
      if (orb.visible) poke(ctx, orb, skin.u, OR, f.mouse, dt, ray, tmp, tmp2, inv);
    },
  };
}
