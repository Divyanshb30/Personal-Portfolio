import * as THREE from "three";
import type { Ctx, Frame } from "../ctx";
import { block } from "../ctx";
import { DUST_FRAG, GLSL_FN } from "../glsl";
import { sprite } from "../helpers";
import { R, V, gauss, smooth } from "../math";
import type { Orb } from "../orb";

/** A glyph as points: filled pixels of it drawn on a canvas, centred, one unit tall. */
function glyphPoints(ctx: Ctx, ch: string, n: number) {
  const w = 120, h = 160, cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const g = cv.getContext("2d")!;
  const disp = ctx.root.querySelector(".disp");
  g.fillStyle = "#fff";
  g.font = `600 150px ${disp ? getComputedStyle(disp).fontFamily : "sans-serif"}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(ch, w / 2, h / 2 + 8);
  const px = g.getImageData(0, 0, w, h).data, filled: number[] = [];
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (px[(y * w + x) * 4] > 140) filled.push(x, y);
  const out = new Float32Array(n * 2), m = filled.length / 2;
  for (let i = 0; i < n && m; i++) {
    const k = Math.floor(R() * m) * 2;
    out[i * 2] = (filled[k] - w / 2) / h;
    out[i * 2 + 1] = (h / 2 - filled[k + 1]) / h;
  }
  return out;
}

/**
 * The small things that happen on their own. When you stop scrolling on the river, a little of the
 * dust gathers into a question mark beside the orb, and the orb looks at it. Now and then a star
 * falls across the far sky. On the river, a stray spark drifts by and the orb, briefly, follows it.
 */
export function buildAmbient(ctx: Ctx, orb: Orb) {
  const still = orb.still, panel = block(ctx, "panel");
  const cam = ctx.camera, right = V(), up = V(), fwd = V(), tmp = V(), tmp2 = V();
  let lastGG = -1, lastMove = 0;

  // ---- the question mark ----
  const NQ = Math.max(60, Math.round(170 * ctx.quality));
  const qU = {
    uA: { value: V() },
    uRt: { value: V(1, 0, 0) },
    uUp: { value: V(0, 1, 0) },
    uFw: { value: V(0, 0, 1) },
    uH: { value: 1 },
    uForm: { value: 0 },
    uGain: { value: 0 },
    uTime: ctx.u.TIME,
    uScale: ctx.u.SCALE,
    uFocus: ctx.u.FOCUS,
  };
  const qGeo = new THREE.BufferGeometry();
  {
    const S = new Float32Array(NQ * 3), SD = new Float32Array(NQ), Z = new Float32Array(NQ);
    for (let i = 0; i < NQ; i++) {
      const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 1.1;
      S.set([Math.cos(a) * r, Math.sin(a) * r, gauss() * 0.4], i * 3);
      SD[i] = R();
      Z[i] = 0.16 + R() * 0.1;
    }
    qGeo.setAttribute("position", new THREE.BufferAttribute(S, 3));
    qGeo.setAttribute("aGly", new THREE.BufferAttribute(new Float32Array(NQ * 2), 2));
    qGeo.setAttribute("aSeed", new THREE.BufferAttribute(SD, 1));
    qGeo.setAttribute("aSize", new THREE.BufferAttribute(Z, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: qU,
      vertexShader: /* glsl */ `
        attribute vec2 aGly; attribute float aSeed, aSize; uniform vec3 uA, uRt, uUp, uFw; uniform float uH, uForm, uGain, uTime, uScale, uFocus;
        varying vec3 vC; varying float vCoc;
        ${GLSL_FN}
        void main(){
          float k = clamp(uForm * 1.4 - aSeed * 0.4, 0.0, 1.0), e = k * k * (3.0 - 2.0 * k);
          vec2 g = mix(position.xy, aGly, e);
          vec3 p = uA + (uRt * g.x + uUp * g.y + uFw * position.z * (1.0 - e)) * uH + flow(position * 3.0 + uTime * 0.2) * uH * 0.14 * (1.0 - e);
          vec4 mv = modelViewMatrix * vec4(p, 1.0); float d = -mv.z;
          float coc = clamp(abs(d - uFocus) * 0.045, 0.0, 1.0);
          gl_PointSize = min(aSize * (260.0 * uScale / d) * (1.0 + coc * 2.0), 30.0); vCoc = coc;
          float tw = 0.8 + 0.2 * sin(uTime * 3.0 + aSeed * 40.0);
          vC = vec3(1.0, 0.72, 0.45) * (0.5 + 1.3 * e) * tw * uGain * mix(1.0, 0.35, coc); gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: DUST_FRAG,
    });
    const pts = new THREE.Points(qGeo, m);
    pts.frustumCulled = false;
    ctx.scene.add(pts);
  }
  const Q = { t: -1, next: 0, glyph: false };

  // ---- the falling star ----
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(6), 3));
  const star = new THREE.Line(starGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  star.frustumCulled = false;
  star.visible = false;
  ctx.scene.add(star);
  const starHead = sprite(ctx, 0xffe2c0, 1, V(), 0);
  const ST = { t: -1, next: 14 + R() * 12, from: V(), dir: V(), len: 1, tail: 1, dur: 0.9 };

  // ---- the stray spark ----
  const spark = sprite(ctx, 0xffc896, 0.2, V(), 0);
  const SP = { t: -1, next: 9 + R() * 8, from: V(), to: V(), dist: 1 };
  const UPV = V(0, 1, 0);

  return {
    update(f: Frame) {
      const { dt, time, GG } = f;
      if (Math.abs(GG - lastGG) > 1e-6) lastMove = time;
      lastGG = GG;
      const idle = time - lastMove;
      cam.matrixWorld.extractBasis(right, up, fwd);
      fwd.negate();
      const toOrb = cam.position.distanceTo(orb.pos);

      // the question mark: only for someone who has stopped to look, and not too often
      const where = GG >= 0.515 && GG <= 0.8;
      if (Q.t < 0 && !still && where && orb.visible && orb.free && SP.t < 0 && idle > 1.8 && time > Q.next) {
        if (!Q.glyph) {
          (qGeo.attributes.aGly.array as Float32Array).set(glyphPoints(ctx, "?", NQ));
          qGeo.attributes.aGly.needsUpdate = true;
          Q.glyph = true;
        }
        Q.t = 0;
        qU.uH.value = toOrb * 0.13;
        qU.uA.value.copy(orb.pos).addScaledVector(right, toOrb * 0.17).addScaledVector(up, toOrb * 0.04);
        qU.uRt.value.copy(right);
        qU.uUp.value.copy(up);
        qU.uFw.value.copy(fwd);
      }
      if (Q.t >= 0) {
        // scrolling on scatters it at once
        Q.t += dt * (idle < 0.2 && Q.t < 3.8 ? 6 : 1);
        const form = smooth(0.2, 1.6, Q.t) * (1 - smooth(3.8, 5.2, Q.t));
        qU.uForm.value = form;
        qU.uGain.value = smooth(0, 0.4, Q.t) * (1 - smooth(4.6, 5.6, Q.t));
        if (orb.visible) orb.attend(qU.uA.value, 0.85 * smooth(0.9, 1.4, Q.t) * (1 - smooth(3.4, 3.9, Q.t)));
        if (Q.t > 5.6 || !where) {
          Q.t = -1;
          Q.next = time + 35;
          qU.uGain.value = 0;
        }
      }

      // a falling star across the far sky
      if (ST.t < 0 && !still && GG > 0.07 && time > ST.next && !panel.classList.contains("open")) {
        ST.t = 0;
        const halfH = 90 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), halfW = halfH * cam.aspect, flip = R() < 0.5 ? -1 : 1;
        ST.from.copy(cam.position).addScaledVector(fwd, 90).addScaledVector(right, flip * (-0.7 + R() * 0.8) * halfW).addScaledVector(up, (0.3 + R() * 0.5) * halfH);
        ST.dir.copy(right).multiplyScalar(flip).addScaledVector(up, -0.35 - R() * 0.2).normalize();
        ST.len = halfW * (0.45 + R() * 0.25);
        ST.tail = halfW * 0.14;
      }
      if (ST.t >= 0) {
        ST.t += dt;
        const u = Math.min(1, ST.t / ST.dur), b = Math.sin(Math.PI * u), P = starGeo.attributes.position.array as Float32Array, C = starGeo.attributes.color.array as Float32Array;
        const head = tmp.copy(ST.from).addScaledVector(ST.dir, ST.len * u), tail = tmp2.copy(head).addScaledVector(ST.dir, -ST.tail * (0.4 + 0.6 * b));
        P.set([tail.x, tail.y, tail.z, head.x, head.y, head.z]);
        C.set([0, 0, 0, 1.6 * b, 1.35 * b, 1.1 * b]);
        starGeo.attributes.position.needsUpdate = true;
        starGeo.attributes.color.needsUpdate = true;
        star.visible = true;
        starHead.position.copy(head);
        starHead.scale.setScalar(ST.tail * 0.12);
        starHead.material.opacity = 0.9 * b;
        if (u >= 1) {
          ST.t = -1;
          ST.next = time + 18 + R() * 22;
          star.visible = false;
          starHead.material.opacity = 0;
        }
      }

      // on the river: a stray spark drifts by, and the orb forgets itself for a second
      const river = GG >= 0.515 && GG <= 0.8;
      if (SP.t < 0 && !still && river && orb.visible && orb.free && Q.t < 0 && time > SP.next) {
        SP.t = 0;
        SP.dist = toOrb;
        SP.from.copy(orb.pos).addScaledVector(right, -toOrb * 0.2).addScaledVector(up, toOrb * 0.05).addScaledVector(fwd, -toOrb * 0.05);
        SP.to.copy(orb.pos).addScaledVector(right, toOrb * 0.22).addScaledVector(up, toOrb * 0.1);
      }
      if (SP.t >= 0) {
        SP.t += dt;
        const e = SP.t, u = smooth(0, 2.6, e);
        spark.position.copy(SP.from).lerp(SP.to, u).addScaledVector(up, Math.sin(e * 5) * SP.dist * 0.01);
        spark.scale.setScalar(SP.dist * 0.018);
        spark.material.opacity = 0.9 * smooth(0, 0.3, e) * (1 - smooth(2.2, 2.6, e));
        if (orb.free) {
          orb.attend(spark.position, smooth(0.15, 0.4, e) * (1 - smooth(1.3, 1.45, e)), 0.45 * smooth(0.35, 0.7, e) * (1 - smooth(1.25, 1.35, e)));
          if (e > 1.35 && e < 1.5) orb.squash(-0.2, UPV);
        }
        if (e > 2.6 || !river) {
          SP.t = -1;
          SP.next = time + 12 + R() * 13;
          spark.material.opacity = 0;
        }
      }
    },
  };
}
