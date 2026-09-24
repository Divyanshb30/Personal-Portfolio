import * as THREE from "three";
import type { Ctx, Frame } from "../ctx";
import type { Shot } from "../director";
import { block, el } from "../ctx";
import { blobGeometry, livingSkin, molten, glass, blackRim, banded, sprite, poke } from "../helpers";
import { TAU, V, smooth, smoother } from "../math";
import { BUD, FL0, FL1, O1, ORB_R, PC, PL_R, PLANET_UP, SBUD, orbitAt, planetRot, toPlanet } from "../layout";
import type { Being } from "./being";
import type { Orb } from "../orb";
import { THINK } from "../data";

/**
 * THINK. The dust gathers into the orb beside him; the orb loosens and flies as a comet, shedding
 * four pieces that condense into moons as their words appear (Question, Understand, Iterate, Build);
 * the rest arrives and becomes the planet, and the moons fall into orbit around it.
 */
export function buildThink(ctx: Ctx, being: Being, orbGeo: THREE.BufferGeometry, planetGeo: THREE.BufferGeometry, orbMood: Orb) {
  const orbSkin = livingSkin(ctx, molten(), toPlanet);
  const orb = new THREE.Mesh(orbGeo, orbSkin.mat);
  orb.scale.setScalar(ORB_R);
  orb.position.copy(O1);
  ctx.scene.add(orb);
  const planetSkin = livingSkin(ctx, molten(), V(-1, 0, 0.3).normalize());
  const planet = new THREE.Mesh(planetGeo, planetSkin.mat);
  planet.scale.setScalar(PL_R);
  planet.position.copy(PC);
  planet.rotation.copy(planetRot);
  ctx.scene.add(planet);
  const orbGlow = sprite(ctx, 0xff8a40, 3.4, O1.clone().add(V(0, 0, -0.6)), 0);
  const planetGlow = sprite(ctx, 0xff8a40, 9.5, PC.clone().add(V(0, 0, -1.5)), 0);

  const skins = [blackRim, banded, glass, molten];
  const radii = [0.36, 0.5, 0.4, 0.44];
  const angles = [3.55, 2.85, 2.2, 1.5];
  const moons = THINK.steps.map((step, i) => {
    const m = new THREE.Mesh(blobGeometry(40 + i * 7, i === 1 ? 0.05 : 0.12, 0.78, 40), skins[i]());
    m.rotation.set(0.2 + i, 0.5 + i, 0);
    ctx.scene.add(m);
    if (i === 2) m.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 3), new THREE.MeshBasicMaterial({ color: 0xff9a4a, toneMapped: false })));
    const label = el(ctx, "lbl mono", step.word);
    const bud = el(ctx, "bud", `<div class="mono sub">0${i + 1} / 04</div><div class="w" style="margin-top:8px">${step.word}</div><div class="l">${step.line}</div>`);
    return { m, a: angles[i], r: radii[i], label, bud };
  });
  const orbitLine = (() => {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 240; k++) pts.push(orbitAt((k / 240) * TAU));
    const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0xffd2b0, dashSize: 0.06, gapSize: 0.08, transparent: true, opacity: 0 }));
    ln.computeLineDistances();
    ctx.scene.add(ln);
    return ln;
  })();

  const words = block(ctx, "think");
  const tmp = V(), tmp2 = V(), c = V(), lo = V(), hi = V(), q = V(), t3 = V(), side = V(-toPlanet.z, 0, toPlanet.x).multiplyScalar(-1);
  const ray = new THREE.Raycaster(), inv = new THREE.Matrix4();

  return {
    /** during the flight the camera follows the dust itself, tracking alongside it */
    shot(f: Frame, sh: Shot) {
      const w = Math.sin(Math.PI * smooth(FL0 - 0.005, FL1 + 0.02, f.s));
      if (w <= 0.001) return;
      const u2 = smooth(FL0, FL1, f.s);
      being.flightCloud(u2, c, lo, hi, q, t3);
      const ext = Math.max(6, lo.distanceTo(hi));
      sh.tgt.lerp(c, w);
      sh.pos.lerp(c.clone().addScaledVector(side, ext * 1.15).add(V(0, ext * 0.22, 0)).addScaledVector(toPlanet, -ext * 0.2), w);
    },
    update(f: Frame) {
      const { s, G, dt, time } = f;
      const orbVis = smooth(0.15, 0.2, s) * (1 - smooth(0.27, 0.32, s));
      orbSkin.u.uReveal.value = orbVis;
      orb.visible = orbVis > 0.001;
      orbGlow.material.opacity = 0.3 * orbVis;
      orb.rotation.set(time * 0.05, time * 0.08, 0);
      const plVis = smooth(0.57, 0.64, s) * (1 - smooth(0.465, 0.505, G));
      if (G > 0.455) planetSkin.u.uDir.value.copy(PLANET_UP); // it lifts away from the top, toward the work
      planetSkin.u.uReveal.value = plVis;
      planet.visible = plVis > 0.001;
      planet.rotation.y = planetRot.y + time * 0.02;
      planetGlow.material.opacity = 0.35 * plVis * (1 - smooth(0.465, 0.5, G));
      orbitLine.material.opacity = 0.22 * smooth(0.62, 0.68, s) * (1 - smooth(0.455, 0.48, G));
      poke(ctx, orb, orbSkin.u, ORB_R, f.mouse, dt, ray, tmp, tmp2, inv);
      // the orb, grown: it is thinking, or on the move between its forms
      if (s > FL0 && s < FL1 + 0.02) orbMood.feel("Flying");
      else if (orbVis > 0.3 || plVis > 0.3) orbMood.feel("Thinking");
      poke(ctx, planet, planetSkin.u, PL_R, f.mouse, dt, ray, tmp, tmp2, inv);

      const toOrbit = smooth(0.57, 0.67, s), ab = [0, 0, 0, 0];
      moons.forEach((mo, i) => {
        const sb = SBUD[i], grow = smooth(sb - 0.006, sb + 0.02, s) * (1 - smooth(0.46, 0.5, G));
        ab[i] = smooth(sb + 0.004, sb + 0.03, s);
        mo.m.position.copy(BUD[i]).lerp(orbitAt(mo.a + time * 0.04), smoother(toOrbit));
        mo.m.scale.setScalar(mo.r * grow);
        mo.m.visible = grow > 0.001;
        mo.m.rotation.y += dt * 0.25;
        tmp.copy(mo.m.position).project(ctx.camera);
        const px = (tmp.x * 0.5 + 0.5) * ctx.W, py = (-tmp.y * 0.5 + 0.5) * ctx.H, vis = tmp.z < 1;
        const rpx = ((mo.r * grow) / (ctx.camera.position.distanceTo(mo.m.position) * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov / 2)))) * ctx.H / 2;
        // the word it stands for, large while it is born, handing over to the next; then a small label rides with it
        const nx = i < 3 ? SBUD[i + 1] : sb + 0.05;
        const big = smooth(sb, sb + 0.01, s) * (1 - smooth(nx - 0.006, nx + 0.004, s));
        const small = smooth(0.66, 0.7, s) * (1 - smooth(0.455, 0.47, G));
        mo.bud.style.opacity = String(vis ? big : 0);
        mo.bud.style.transform = `translate(${(px + rpx + 26 - f.cam.x * 10).toFixed(1)}px, ${(py - 30 + f.cam.y * 6).toFixed(1)}px)`;
        mo.label.style.opacity = String(vis ? small : 0);
        mo.label.style.transform = `translate(${(px + rpx + 14).toFixed(1)}px, ${(py - 7).toFixed(1)}px)`;
      });
      being.u.uAbsorb.value.set(ab[0], ab[1], ab[2], ab[3]);
      words.style.opacity = String(smooth(0.64, 0.68, s) * (1 - smooth(0.755, 0.77, s)));
    },
  };
}
