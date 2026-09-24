import * as THREE from "three";
import type { Ctx, Frame } from "./ctx";
import { DUST_FRAG } from "./glsl";
import { blobGeometry, glass, sprite } from "./helpers";
import { V, clamp, gauss, smooth } from "./math";

/** What the section that owns the orb this frame wants from it. */
export type Drive = {
  /** where it wants to be */
  at: THREE.Vector3;
  /** body radius; 0 lets it vanish */
  size: number;
  /** what it looks at (its core slides toward it), and how hard */
  look?: THREE.Vector3 | null;
  lookAmt?: number;
  /** 0 = sprung, 1 = held exactly on `at` */
  pin?: number;
  glow?: number;
  /** between beats: an ambient moment may borrow its attention */
  free?: boolean;
};

const STIFF = 14, DAMP = 4.4, MAX_V = 14;
const Y = V(0, 1, 0);

/**
 * The orb as a character. One small glass body with an ember core that Projects, Stack and Journey
 * take turns to direct: each calls `drive()` every frame inside its own window, and when nobody
 * does it shrinks away. It rides an under-damped spring (it overshoots, then settles), squashes and
 * stretches, looks at things with its core, shies from the cursor, and can burst or gather in sparks.
 */
export function makeOrb(ctx: Ctx) {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = new THREE.Group(), shape = new THREE.Group();
  const body = new THREE.Mesh(blobGeometry(17, 0.14, 0.78, 40), glass());
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 3), new THREE.MeshBasicMaterial({ color: 0xff9a4a, toneMapped: false }));
  shape.add(body, core);
  root.add(shape);
  root.visible = false;
  ctx.scene.add(root);
  const glow = sprite(ctx, 0xff8a40, 3.4, V(), 0, root);

  // sparks: one reusable set, flung out for a burst or drawn in for a gather
  const NS = Math.max(30, Math.round(150 * ctx.quality));
  const sparkU = { uO: { value: V() }, uAge: { value: -1 }, uMode: { value: 1 }, uAmt: { value: 1 }, uTime: ctx.u.TIME, uScale: ctx.u.SCALE, uFocus: ctx.u.FOCUS };
  {
    const D = new Float32Array(NS * 3), S = new Float32Array(NS), Z = new Float32Array(NS);
    for (let i = 0; i < NS; i++) {
      const d = V(gauss(), gauss(), gauss()).normalize();
      D.set([d.x, d.y, d.z], i * 3);
      S[i] = 0.4 + Math.random() * 1.1;
      Z[i] = 0.12 + Math.random() * 0.12;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(D, 3));
    g.setAttribute("aSpd", new THREE.BufferAttribute(S, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(Z, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: sparkU,
      vertexShader: /* glsl */ `
        attribute float aSpd, aSize; uniform vec3 uO; uniform float uAge, uMode, uAmt, uScale, uFocus; varying vec3 vC; varying float vCoc;
        void main(){
          float out1 = step(0.0, uMode), t = mix(max(0.0, 0.8 - uAge), uAge, out1);
          float r = (1.0 - exp(-t * 5.0 * aSpd)) * uAmt * (0.5 + aSpd);
          vec3 p = uO + position * r + vec3(0.0, -0.7, 0.0) * t * t * out1;
          float a = mix(smoothstep(0.0, 0.2, uAge) * (1.0 - smoothstep(0.6, 0.8, uAge)), exp(-uAge * 3.0), out1) * step(0.0, uAge);
          vec4 mv = modelViewMatrix * vec4(p, 1.0); float d = -mv.z;
          float coc = clamp(abs(d - uFocus) * 0.045, 0.0, 1.0);
          gl_PointSize = min(aSize * (260.0 * uScale / d) * (1.0 + coc * 2.0), 40.0); vCoc = coc;
          vC = vec3(1.0, 0.66, 0.36) * 2.6 * a * mix(1.0, 0.35, coc); gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: DUST_FRAG,
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    ctx.scene.add(pts);
  }
  const flash = sprite(ctx, 0xffc896, 1, V(), 0);
  let flashAge = 9, flashSize = 1;

  const pos = V(), vel = V(), at = V(), look = V(), attendP = V(), gaze = V(), axis = V(0, 1, 0), sqAxis = V(0, 1, 0);
  const tmp = V(), tmp2 = V(), acc = V(), prev = V(), qInv = new THREE.Quaternion();
  let driven = false, size = 0, sizeV = 0, want = 0, wantLook = 0, hasLook = false, pin = 0, glowWant = 0.3;
  let sq = 0, sqV = 0, sqWant = 0, attendLook = 0, attendPull = 0;

  const orb = {
    pos,
    vel,
    still,
    /** true while visible and not in the middle of a beat of its own */
    free: false,
    get size() {
      return size;
    },
    get visible() {
      return root.visible;
    },
    /** Take charge of the orb for this frame. */
    drive(d: Drive) {
      driven = true;
      at.copy(d.at);
      want = d.size;
      hasLook = !!d.look;
      if (d.look) look.copy(d.look);
      wantLook = d.lookAmt ?? 1;
      pin = d.pin ?? 0;
      glowWant = d.glow ?? 0.3;
      orb.free = !!d.free;
    },
    /** Squash (negative) or stretch (positive) along an axis, this frame. */
    squash(amt: number, ax: THREE.Vector3) {
      sqWant = amt;
      sqAxis.copy(ax).normalize();
    },
    /** Let something else catch its eye (and, with pull, draw it off course) this frame. */
    attend(p: THREE.Vector3, lookAmt: number, pull = 0) {
      attendP.copy(p);
      attendLook = lookAmt;
      attendPull = pull;
    },
    kick(v: THREE.Vector3) {
      vel.add(v);
    },
    /** Fling sparks out from a point (or, with gather, draw them in to it). */
    burst(p: THREE.Vector3, amt = 1, gather = false) {
      if (still) return;
      sparkU.uO.value.copy(p);
      sparkU.uAge.value = 0;
      sparkU.uMode.value = gather ? -1 : 1;
      sparkU.uAmt.value = amt;
      flash.position.copy(p);
      flashAge = gather ? 0.55 : 0;
      flashSize = amt * 2.6;
    },
    update(f: Frame) {
      const { dt, time, mouse } = f, cam = ctx.camera;
      // sparks and flash run on their own, whoever owns the orb
      if (sparkU.uAge.value >= 0) sparkU.uAge.value = sparkU.uAge.value > 1.8 ? -1 : sparkU.uAge.value + dt;
      flashAge += dt;
      const fl = flashAge < 0.9 ? Math.exp(-flashAge * 5) * smooth(0, 0.05, flashAge) : 0;
      flash.material.opacity = 0.9 * fl;
      flash.scale.setScalar(flashSize * (0.4 + 0.8 * smooth(0, 0.25, flashAge)));
      flash.visible = fl > 0.002;

      const target = driven ? want : 0;
      sizeV += (60 * (target - size) - 7 * sizeV) * dt;
      size = Math.max(0, size + sizeV * dt);
      if (!driven && size < 0.003) {
        root.visible = false;
        size = sizeV = 0;
        orb.free = false;
        attendLook = attendPull = 0;
        return;
      }
      // appearing somewhere new: it forms there, it doesn't fly in from wherever it vanished
      if (!root.visible) {
        pos.copy(at);
        vel.set(0, 0, 0);
        gaze.set(0, 0, 0);
      }
      root.visible = true;

      // the spring, with anything that has caught its eye pulling on the target
      const goal = tmp2.copy(at).lerp(attendP, attendPull);
      acc.copy(goal).sub(pos).multiplyScalar(STIFF).addScaledVector(vel, still ? -2 * Math.sqrt(STIFF) : -DAMP);
      // the cursor: it shies from a restless pointer, and leans a little toward one that lingers
      let near = 0;
      const toCam = cam.position.distanceTo(pos);
      if (ctx.u.CUR.uActive.value > 0) {
        tmp.copy(pos).project(cam);
        if (tmp.z < 1) {
          const px = Math.hypot(((mouse.x - tmp.x) * ctx.W) / 2, ((mouse.y - tmp.y) * ctx.H) / 2);
          near = smooth(170, 50, px);
          if (near > 0) {
            const cur = tmp.set(mouse.x, mouse.y, tmp.z).unproject(cam);
            const restless = ctx.u.CUR.uStir.value > 0.03 ? 1 : -0.3;
            acc.addScaledVector(cur.sub(pos).normalize(), -near * restless * toCam * 1.6 * (still ? 0.3 : 1));
          }
        }
      }
      vel.addScaledVector(acc, dt);
      if (vel.lengthSq() > MAX_V * MAX_V) vel.setLength(MAX_V);
      prev.copy(pos);
      pos.addScaledVector(vel, dt);
      if (pin > 0) {
        pos.lerp(goal, pin);
        vel.lerp(tmp.copy(pos).sub(prev).divideScalar(Math.max(dt, 1e-3)), pin);
      }
      root.position.copy(pos);
      root.scale.setScalar(size);

      // squash and stretch: it stretches along its own speed unless a beat asks for more
      const speed = vel.length();
      let amt = Math.min(0.4, speed * 0.035);
      const ax = tmp.copy(speed > 0.05 ? vel : axis).normalize();
      if (Math.abs(sqWant) > amt) {
        amt = sqWant;
        ax.copy(sqAxis);
      }
      if (ax.dot(axis) < 0) ax.negate();
      axis.lerp(ax, 1 - Math.exp(-dt * 12)).normalize();
      sqV += (220 * (amt - sq) - 14 * sqV) * dt;
      sq += sqV * dt;
      const a = 1 + clamp(sq, -0.6, 1.2), p = 1 / Math.sqrt(a);
      shape.quaternion.setFromUnitVectors(Y, axis);
      shape.scale.set(p, a, p);
      body.rotation.set(time * 0.13, time * 0.4, 0);

      // the gaze: its core slides toward what it looks at; by default, where it is going
      const g = tmp2.set(0, 0, 0);
      if (hasLook) g.copy(look).sub(pos).normalize().multiplyScalar(wantLook);
      else if (speed > 0.4) g.copy(vel).divideScalar(speed).multiplyScalar(0.45);
      else g.copy(cam.position).sub(pos).normalize().multiplyScalar(0.25);
      if (near > 0) g.lerp(tmp.set(mouse.x, mouse.y, 0.5).unproject(cam).sub(pos).normalize(), near);
      if (attendLook > 0) g.lerp(tmp.copy(attendP).sub(pos).normalize(), attendLook);
      gaze.lerp(g, 1 - Math.exp(-dt * 9));
      qInv.copy(shape.quaternion).invert();
      core.position.copy(gaze).applyQuaternion(qInv).divide(shape.scale).multiplyScalar(0.42);

      glow.material.opacity = Math.min(1, glowWant * smooth(0, 0.08, size));

      // this frame's asks are spent
      driven = false;
      sqWant = 0;
      attendLook = attendPull = 0;
    },
  };
  return orb;
}
export type Orb = ReturnType<typeof makeOrb>;
