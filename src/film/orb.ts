import * as THREE from "three";
import type { Ctx, Frame } from "./ctx";
import { DUST_FRAG } from "./glsl";
import { blobGeometry, fluid, fluidify, glass, sprite } from "./helpers";
import { TAU, V, clamp, gauss, lerp, smooth } from "./math";

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
  /** between beats: an ambient moment may borrow its attention, and it may get up to something on its own */
  free?: boolean;
  /** how much the cursor sways it: 1 = it shies from a restless one and leans toward one that lingers, 0 = none */
  cursor?: number;
};

/** A game the cursor has started with it: while one runs, it leaves its post to play. */
export type Play = "" | "orbit" | "chase" | "dizzy";
/** A small thing it does on its own, now and then, when nothing else is going on. */
type Quirk = "" | "sneeze" | "twirl" | "round";

const STIFF = 14, DAMP = 4.4, MAX_V = 14;
const Y = V(0, 1, 0);

/**
 * The orb as a character. One small glass body with an ember core that Projects, Stack and Journey
 * take turns to direct: each calls `drive()` every frame inside its own window, and when nobody
 * does it shrinks away. It rides an under-damped spring (it overshoots, then settles), stretches as
 * it speeds up and flattens as it brakes, looks at things with its core, shies from the cursor, and
 * can burst or gather in sparks. Circle the cursor round it and it circles the cursor back; flick
 * the cursor away and it chases it for a second. Left alone, now and then it sneezes, twirls itself
 * dizzy, or goes perfectly round for a blink.
 */
export function makeOrb(ctx: Ctx) {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // the games need a cursor that rests where it is: a mouse, not a finger
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const root = new THREE.Group(), shape = new THREE.Group();
  // its droplet body, with a perfect sphere of the same size held in reserve (it becomes one, for a blink)
  const bodyGeo = blobGeometry(17, 0.14, 0.78, 32);
  {
    const p = bodyGeo.attributes.position, n = p.count, v = V();
    let mean = 0;
    for (let i = 0; i < n; i++) mean += v.fromBufferAttribute(p, i).length() / n;
    const sp = new Float32Array(n * 3), sn = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(p, i).normalize();
      sn.set([v.x, v.y, v.z], i * 3);
      sp.set([v.x * mean, v.y * mean, v.z * mean], i * 3);
    }
    bodyGeo.morphAttributes.position = [new THREE.BufferAttribute(sp, 3)];
    bodyGeo.morphAttributes.normal = [new THREE.BufferAttribute(sn, 3)];
  }
  // and the droplet is liquid: it shimmers on its own, lags and sloshes as it is thrown about, rings where it lands
  const liquid = fluid(ctx, 0.01, 0.8);
  const body = new THREE.Mesh(bodyGeo, fluidify(glass(), liquid));
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 3), new THREE.MeshBasicMaterial({ color: 0xff9a4a, toneMapped: false }));
  shape.add(body, core);
  root.add(shape);
  root.visible = false;
  ctx.scene.add(root);
  const glow = sprite(ctx, 0xff8a40, 3.4, V(), 0, root);

  // sparks: one reusable set, flung out for a burst or drawn in for a gather
  const NS = Math.max(30, Math.round(150 * ctx.quality));
  const sparkU = { uO: { value: V() }, uAge: { value: -1 }, uMode: { value: 1 }, uAmt: { value: 1 }, uGain: { value: 1 }, uTime: ctx.u.TIME, uScale: ctx.u.SCALE, uFocus: ctx.u.FOCUS };
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
        attribute float aSpd, aSize; uniform vec3 uO; uniform float uAge, uMode, uAmt, uGain, uScale, uFocus; varying vec3 vC; varying float vCoc;
        void main(){
          float out1 = step(0.0, uMode), t = mix(max(0.0, 0.8 - uAge), uAge, out1);
          float r = (1.0 - exp(-t * 5.0 * aSpd)) * uAmt * (0.5 + aSpd);
          vec3 p = uO + position * r + vec3(0.0, -0.7, 0.0) * t * t * out1;
          float a = mix(smoothstep(0.0, 0.2, uAge) * (1.0 - smoothstep(0.6, 0.8, uAge)), exp(-uAge * 3.0), out1) * step(0.0, uAge);
          // (a smaller burst is fewer sparks, and dimmer)
          a *= uGain * step(aSpd, 0.4 + 1.1 * uGain);
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
  let flashAge = 9, flashSize = 1, flashGain = 1;

  const pos = V(), vel = V(), at = V(), look = V(), attendP = V(), gaze = V(), axis = V(0, 1, 0), sqAxis = V(0, 1, 0);
  const tmp = V(), tmp2 = V(), acc = V(), prev = V(), qInv = new THREE.Quaternion(), qBody = new THREE.Quaternion(), slosh = V();
  /** a world direction, in the droplet's own space (where its liquid lives) */
  const toBody = (v: THREE.Vector3) => v.applyQuaternion(qBody.copy(shape.quaternion).multiply(body.quaternion).invert());
  let sqWas = 0;
  const goal = V(), g = V(), cursorW = V(), chaseFrom = V(), holdAt = V(), prevVel = V(), accS = V(), right = V(), up = V(), toCamV = V(), sneezeDir = V();
  let driven = false, size = 0, sizeV = 0, want = 0, wantLook = 0, hasLook = false, pin = 0, glowWant = 0.3;
  let sq = 0, sqV = 0, sqWant = 0, attendLook = 0, attendPull = 0, spinA = 0, spinV = 0, snapNext = false, feeling = "", cursorAmt = 1;
  let lastGG = -1, lastScroll = -9;
  // the cursor in px: last frame's spot, its velocity, its angle round the orb and how far that has turned
  let pcx = 0, pcy = 0, cvx = 0, cvy = 0, curInit = false, lastA = 0, angOk = false, turn = 0, angV = 0, nearAt = -9;
  let play: Play = "", playT = 0, orbitCool = 0, chaseCool = 0, theta = 0, turnDir = 1, omega = 4, restT = 0;
  let quirk: Quirk = "", lastQuirk: Quirk = "", quirkT = 0, quiet = 0, quirkGap = 16 + Math.random() * 10, fired = false, round = 0;

  const startPlay = (p: Play) => {
    play = p;
    playT = 0;
    restT = 0;
    fired = false;
  };
  const stopPlay = (t: number) => {
    if (play === "chase") chaseCool = t + 2.5;
    else if (play) orbitCool = t + 4;
    play = "";
    playT = 0;
    turn = 0;
  };

  const orb = {
    pos,
    vel,
    still,
    /** true while visible and not in the middle of a beat of its own */
    free: false,
    /** how it feels this frame, as named by whoever directs it ("" when it isn't around) */
    mood: "",
    /** where the cursor is from it on screen (px; huge when there's none), its speed and how fast it is moving
     *  away (px/s), and how far it has been circling it lately (radians, signed) */
    pointer: { px: 1e9, speed: 0, away: 0, turn: 0 },
    get size() {
      return size;
    },
    get visible() {
      return root.visible;
    },
    /** the game the cursor has started with it, if any */
    get play() {
      return play;
    },
    /** the small thing it is doing on its own, if any */
    get quirk() {
      return quirk;
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
      cursorAmt = d.cursor ?? 1;
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
      // knocked: a ring from where it was hit, and the liquid thrown back against the knock
      if (root.visible && v.lengthSq() > 1) {
        liquid.ripple(toBody(tmp2.copy(v).negate()), Math.min(0.025, 0.005 * v.length()));
        liquid.shake(toBody(tmp2.copy(v)).multiplyScalar(-0.05));
      }
    },
    /** Name its mood this frame (the last caller wins, so the ambient moments can override a section). */
    feel(word: string) {
      feeling = word;
    },
    /** A twirl of the body (radians per second, decaying). */
    spin(v: number) {
      spinV += v;
    },
    /** Next frame, appear exactly where it is driven (after a jump, it shouldn't fly across the world). */
    snap() {
      snapNext = true;
    },
    /** Is this screen point (NDC) on the orb? */
    hit(nx: number, ny: number) {
      if (!root.visible || size < 0.02) return false;
      const cam = ctx.camera;
      tmp.copy(pos).project(cam);
      if (tmp.z > 1) return false;
      const d = cam.position.distanceTo(pos), rpx = (size / (d * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)))) * (ctx.H / 2);
      return Math.hypot(((nx - tmp.x) * ctx.W) / 2, ((ny - tmp.y) * ctx.H) / 2) < rpx * 1.3 + 12;
    },
    /** Fling sparks out from a point (or, with gather, draw them in to it); gain below 1 makes it a smaller
     *  thing: fewer, dimmer sparks and hardly a flash. */
    burst(p: THREE.Vector3, amt = 1, gather = false, gain = 1) {
      if (still) return;
      sparkU.uO.value.copy(p);
      sparkU.uAge.value = 0;
      sparkU.uMode.value = gather ? -1 : 1;
      sparkU.uAmt.value = amt;
      sparkU.uGain.value = gain;
      flash.position.copy(p);
      flashAge = gather ? 0.55 : 0;
      flashSize = amt * 2.6 * (0.4 + 0.6 * gain);
      flashGain = gain * gain;
    },
    update(f: Frame) {
      const { dt, time, mouse, GG } = f, cam = ctx.camera;
      orb.mood = feeling;
      feeling = "";
      // sparks and flash run on their own, whoever owns the orb
      if (sparkU.uAge.value >= 0) sparkU.uAge.value = sparkU.uAge.value > 1.8 ? -1 : sparkU.uAge.value + dt;
      flashAge += dt;
      const fl = flashAge < 0.9 ? Math.exp(-flashAge * 5) * smooth(0, 0.05, flashAge) : 0;
      flash.material.opacity = 0.9 * fl * flashGain;
      flash.scale.setScalar(flashSize * (0.4 + 0.8 * smooth(0, 0.25, flashAge)));
      flash.visible = fl > 0.002;
      if (Math.abs(GG - lastGG) > 1e-6) lastScroll = time;
      lastGG = GG;

      const target = driven ? want : 0;
      sizeV += (60 * (target - size) - 7 * sizeV) * dt;
      size = Math.max(0, size + sizeV * dt);
      if (!driven && size < 0.003) {
        root.visible = false;
        size = sizeV = 0;
        orb.free = false;
        attendLook = attendPull = 0;
        orb.pointer.px = 1e9;
        if (play) stopPlay(time);
        quirk = "";
        round = 0;
        return;
      }
      // appearing somewhere new: it forms there, it doesn't fly in from wherever it vanished
      if (!root.visible || snapNext) {
        snapNext = false;
        pos.copy(at);
        vel.set(0, 0, 0);
        prevVel.set(0, 0, 0);
        accS.set(0, 0, 0);
        gaze.set(0, 0, 0);
        if (play) stopPlay(time);
      }
      root.visible = true;

      // where it is on screen, and where the cursor is from it
      right.setFromMatrixColumn(cam.matrixWorld, 0);
      up.setFromMatrixColumn(cam.matrixWorld, 1);
      const toCam = cam.position.distanceTo(pos);
      toCamV.copy(cam.position).sub(pos).divideScalar(Math.max(toCam, 1e-6));
      tmp.copy(pos).project(cam);
      const depth = tmp.z, onScreen = depth < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05;
      const ox = (tmp.x * 0.5 + 0.5) * ctx.W, oy = (0.5 - tmp.y * 0.5) * ctx.H;
      // (world units per px, at its depth)
      const wpp = (2 * toCam * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) / ctx.H;
      const active = ctx.u.CUR.uActive.value > 0, idt = 1 / Math.max(dt, 1e-3);
      const cx = (mouse.x * 0.5 + 0.5) * ctx.W, cy = (0.5 - mouse.y * 0.5) * ctx.H;
      if (!curInit) {
        pcx = cx;
        pcy = cy;
        curInit = true;
      }
      const kv = 1 - Math.exp(-dt * 25);
      cvx += ((cx - pcx) * idt - cvx) * kv;
      cvy += ((cy - pcy) * idt - cvy) * kv;
      pcx = cx;
      pcy = cy;
      const dx = cx - ox, dy = cy - oy, r = Math.hypot(dx, dy), sp = Math.hypot(cvx, cvy);
      orb.pointer.px = active && depth < 1 ? r : 1e9;
      orb.pointer.away = r > 1 ? (cvx * dx + cvy * dy) / r : 0;
      orb.pointer.speed = sp;
      cursorW.set(mouse.x, mouse.y, depth).unproject(cam);

      // ---- the games the cursor starts ----
      const calm = time - lastScroll > 0.3 && pin < 0.3;
      // (a game starts only where it can be seen; once going, it may play into a corner)
      const keepPlay = fine && !still && active && calm && cursorAmt >= 0.5 && size > 0.03, canPlay = keepPlay && onScreen;
      // circling it: add up how far the cursor has turned round it (a straight pass never makes half a turn)
      const ang = Math.atan2(dy, dx), rpx = size / wpp;
      if (canPlay && !play && angOk && r > rpx + 10 && r < rpx + 300 && sp > 120) {
        let da = ang - lastA;
        if (da > Math.PI) da -= TAU;
        else if (da < -Math.PI) da += TAU;
        turn += da;
        angV += (Math.abs(da) * idt - angV) * (1 - Math.exp(-dt * 5));
      }
      angOk = canPlay;
      lastA = ang;
      turn = canPlay ? turn * Math.exp(-dt * 0.3) : 0;
      orb.pointer.turn = turn;
      if (active && r < 160) nearAt = time;
      if (!play && canPlay) {
        if (Math.abs(turn) > TAU * 1.1 && time > orbitCool) {
          // it takes the hint, and circles you back, the same way round
          startPlay("orbit");
          turnDir = Math.sign(turn);
          theta = Math.atan2(oy - cy, ox - cx);
          omega = clamp(angV, 3, 6.5);
        } else if (time > chaseCool && time - nearAt < 0.35 && r > 110 && sp > 1300 && orb.pointer.away > 0.7 * sp) {
          // the cursor left it in a hurry: it goes after it
          startPlay("chase");
          chaseFrom.copy(pos);
        }
      }
      // spun too fast, it gets dizzy
      if (!play && !still && calm && Math.abs(spinV) > 24) startPlay("dizzy");

      let stiff = STIFF, damp = DAMP, playLook = 0, playMood = "";
      goal.copy(at).lerp(attendP, attendPull);
      if (play) playT += dt;
      if (play === "orbit") {
        restT = sp < 40 ? restT + dt : 0;
        if (!keepPlay) stopPlay(time);
        else if (restT > 1.2 || playT > 6) {
          // round and round: once it stops, the world keeps going for a moment
          spinV += 14 * turnDir;
          startPlay("dizzy");
        } else {
          theta += turnDir * omega * dt;
          // round the cursor, clear of it, and never off the screen
          const R0 = 40 + rpx * 2.2, m = rpx + 6;
          const gx = clamp(cx + Math.cos(theta) * R0, m, ctx.W - m), gy = clamp(cy + Math.sin(theta) * R0, m, ctx.H - m);
          goal.set((gx / ctx.W) * 2 - 1, 1 - (gy / ctx.H) * 2, depth).unproject(cam);
          stiff = 110;
          damp = 12;
          playLook = 1;
          playMood = "Orbiting";
        }
      } else if (play === "chase") {
        if (!keepPlay || (playT > 0.15 && r < 50) || playT > 1.5) stopPlay(time);
        else if (playT < 0.9) {
          // it lunges after it, and only ever makes half the gap
          const gap = chaseFrom.distanceTo(cursorW);
          goal.copy(chaseFrom).lerp(cursorW, Math.min(0.55, (260 * wpp) / Math.max(gap, 1e-6)));
          stiff = 70;
          damp = 8;
          playLook = 1;
          playMood = "Chasing";
        } else {
          // then gives up: skids to a stop and stares after it
          if (!fired) {
            fired = true;
            holdAt.copy(pos);
          }
          if (playT < 1.05 && vel.lengthSq() > 1e-4) orb.squash(-0.35, vel);
          goal.copy(holdAt);
          stiff = 40;
          damp = 10;
          playLook = 1;
          playMood = "Lost you";
        }
      }
      if (play === "dizzy") {
        if (!calm || playT > 1.5) stopPlay(time);
        else {
          // a wobbly little loop, shrinking as its head clears
          const w = 1 - playT / 1.5;
          goal.addScaledVector(right, Math.cos(playT * 9) * size * 0.7 * w).addScaledVector(up, Math.sin(playT * 9) * size * 0.45 * w);
          orb.squash(0.14 * Math.sin(playT * 13) * w, tmp2.copy(right).multiplyScalar(Math.cos(playT * 5)).addScaledVector(up, Math.sin(playT * 5)));
          playMood = "Dizzy";
        }
      }

      // ---- the small things it does on its own ----
      const canQuirk = !still && orb.free && !play && calm && time - lastScroll > 2 && onScreen && size > 0.03 && orb.pointer.px > 220 && attendLook === 0 && attendPull === 0;
      if (!quirk && canQuirk) {
        quiet += dt;
        if (quiet > quirkGap) {
          const pick = (["sneeze", "twirl", "round"] as Quirk[]).filter((q) => q !== lastQuirk);
          quirk = lastQuirk = pick[Math.floor(Math.random() * pick.length)];
          quirkT = 0;
          quiet = 0;
          quirkGap = 24 + Math.random() * 20;
          fired = false;
        }
      }
      let qMood = "";
      if (quirk) {
        quirkT += dt;
        const t = quirkT;
        // (a game, or a beat of its owner's, comes first)
        if (play || pin >= 0.3 || !orb.free) {
          quirk = "";
          round = 0;
        } else if (quirk === "sneeze") {
          if (t < 1.1) {
            // ah… ah…: it draws itself up, twice, looking up
            const inhale = t < 0.45 ? 0.16 * smooth(0, 0.45, t) : t < 0.6 ? lerp(0.16, 0.06, smooth(0.45, 0.6, t)) : lerp(0.06, 0.3, smooth(0.6, 1.05, t));
            orb.squash(inhale, up);
            goal.addScaledVector(up, size * 0.35 * smooth(0.6, 1.1, t));
            qMood = "Ah… ah…";
          } else {
            if (!fired) {
              // choo: a tiny puff of sparks out the front, and it jolts back from it
              fired = true;
              sneezeDir.copy(toCamV).addScaledVector(up, -0.4).normalize();
              orb.burst(tmp2.copy(pos).addScaledVector(sneezeDir, size * 1.15), size * 1.6, false, 0.35);
              vel.addScaledVector(sneezeDir, -size * 9);
              spinV += 3;
            }
            if (t < 1.3) orb.squash(-0.45, sneezeDir);
            qMood = "Achoo";
            if (t > 2.1) quirk = "";
          }
        } else if (quirk === "twirl") {
          // it starts to twirl, faster and faster, spreading as it goes, until it's too fast (and dizzy)
          const u = smooth(0, 2.2, t);
          spinV = Math.max(spinV, 30 * u * u);
          orb.squash(-0.16 * u, up);
          qMood = "Twirling";
          if (t > 2.6) quirk = "";
        } else if (quirk === "round") {
          // perfectly round, for a blink, then a wobble back into a droplet
          round = t < 0.1 ? smooth(0, 0.1, t) : t < 0.55 ? 1 : 1 - smooth(0.55, 0.68, t);
          if (t >= 0.55 && !fired) {
            fired = true;
            sqV += 5;
          }
          if (t > 1.0) {
            quirk = "";
            round = 0;
          }
        }
      }

      // the spring, with anything that has caught its eye pulling on the target
      acc.copy(goal).sub(pos).multiplyScalar(stiff).addScaledVector(vel, still ? -2 * Math.sqrt(stiff) : -damp);
      // the cursor: it shies from a restless pointer, and leans a little toward one that lingers
      let near = 0;
      if (active && !play && depth < 1) {
        near = smooth(170, 50, r) * cursorAmt;
        if (near > 0) {
          // (it backs off from a restless cursor coming at it; one going round and round it isn't a threat,
          // so it stays put and watches)
          const coming = smooth(60, 400, -orb.pointer.away) * (1 - smooth(1.2, 3.5, Math.abs(turn)));
          const restless = ctx.u.CUR.uStir.value > 0.03 ? coming : -0.3;
          acc.addScaledVector(tmp.copy(cursorW).sub(pos).normalize(), -near * restless * toCam * 1.6 * (still ? 0.3 : 1));
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

      // squash and stretch: it stretches along its speed, more while speeding up, and flattens as it brakes
      // hard, unless a beat asks for more
      accS.lerp(tmp.copy(vel).sub(prevVel).multiplyScalar(idt), 1 - Math.exp(-dt * 14));
      prevVel.copy(vel);
      const speed = vel.length(), aPar = speed > 0.05 ? accS.dot(vel) / speed : 0;
      let amt = clamp(Math.min(0.4, speed * 0.035) + clamp(aPar * 0.012, -0.2, 0.25), -0.2, 0.6);
      const ax = tmp.copy(speed > 0.05 ? vel : axis).normalize();
      if (Math.abs(sqWant) > Math.abs(amt)) {
        amt = sqWant;
        ax.copy(sqAxis);
      }
      if (ax.dot(axis) < 0) ax.negate();
      axis.lerp(ax, 1 - Math.exp(-dt * 12)).normalize();
      sqV += (220 * (amt - sq) - 14 * sqV) * dt;
      sq += sqV * dt;
      // (while it's perfectly round, nothing bends it)
      const a = 1 + clamp(sq, -0.6, 1.2) * (1 - round), p = 1 / Math.sqrt(a);
      shape.quaternion.setFromUnitVectors(Y, axis);
      shape.scale.set(p, a, p);
      body.morphTargetInfluences![0] = round;
      spinV *= Math.exp(-dt * 2.2);
      spinA += spinV * dt;
      body.rotation.set(time * 0.13, time * 0.4 + spinA, 0);

      // the liquid inside: it lags behind every change of speed, swelling against it and ringing down after,
      // and a hard landing (a sharp flatten) sends a ring round it from where it hit
      if (!still) {
        toBody(slosh.copy(accS)).multiplyScalar(-0.0007 * dt * 60);
        if (slosh.length() > 0.035) slosh.setLength(0.035);
        liquid.shake(slosh);
        if (sqWant < -0.25 && sqWas >= -0.25) liquid.ripple(toBody(tmp2.copy(sqAxis).negate()), Math.min(0.025, -sqWant * 0.04));
      }
      sqWas = sqWant;
      liquid.u.uFluid.value = 1 - round;
      liquid.update(dt);

      // the gaze: its core slides toward what it looks at; by default, where it is going
      g.set(0, 0, 0);
      if (hasLook) g.copy(look).sub(pos).normalize().multiplyScalar(wantLook);
      else if (speed > 0.4) g.copy(vel).divideScalar(speed).multiplyScalar(0.45);
      else g.copy(toCamV).multiplyScalar(0.25);
      if (near > 0) g.lerp(tmp.set(mouse.x, mouse.y, 0.5).unproject(cam).sub(pos).normalize(), near);
      if (attendLook > 0) g.lerp(tmp.copy(attendP).sub(pos).normalize(), attendLook);
      if (playLook > 0) g.lerp(tmp.copy(cursorW).sub(pos).normalize(), playLook);
      if (play === "dizzy") g.copy(right).multiplyScalar(Math.cos(-playT * 6) * 0.6).addScaledVector(up, Math.sin(-playT * 6) * 0.6);
      if (quirk === "sneeze") g.lerp(quirkT < 1.1 ? tmp.copy(up).multiplyScalar(0.55) : tmp.copy(sneezeDir).multiplyScalar(0.5), 0.9);
      // twirling, the core whirls round inside it (too fast to ease after)
      const whirl = quirk === "twirl" || (play === "dizzy" && Math.abs(spinV) > 10);
      if (whirl) g.copy(right).multiplyScalar(Math.cos(spinA) * 0.55).addScaledVector(toCamV, Math.sin(spinA) * 0.55);
      g.multiplyScalar(1 - round);
      if (whirl) gaze.copy(g);
      else gaze.lerp(g, 1 - Math.exp(-dt * 9));
      qInv.copy(shape.quaternion).invert();
      core.position.copy(gaze).applyQuaternion(qInv).divide(shape.scale).multiplyScalar(0.42);

      glow.material.opacity = Math.min(1, glowWant * smooth(0, 0.08, size));
      const m = playMood || qMood;
      if (m) orb.mood = m;

      // this frame's asks are spent
      driven = false;
      sqWant = 0;
      attendLook = attendPull = 0;
    },
  };
  return orb;
}
export type Orb = ReturnType<typeof makeOrb>;
