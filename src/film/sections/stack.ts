import * as THREE from "three";
import type { Ctx, Frame } from "../ctx";
import { block, el } from "../ctx";
import { DUST_FRAG, STIR_GLSL } from "../glsl";
import { R, TAU, V, clamp, emberAt, gauss, smooth } from "../math";
import { DIVE, SF } from "../layout";
import { LEAD_OF, STACK } from "../data";

type Tag = {
  el: HTMLElement;
  at: THREE.Vector3;
  lead: boolean;
  chars: number;
  sx: number;
  sy: number;
  sc: number;
  w: number;
  h: number;
  tx: number;
  ty: number;
  ox: number;
  oy: number;
  near: number;
  blur: number;
  behind: boolean;
};

/**
 * STACK. Roots drop from each project's stars to the tools it was built with; the guide dives down
 * them and bursts into dust layers, and every tool rides those layers as a name, lead tools large.
 * Names are projected each frame and pushed apart so no two collide and all stay on the page.
 * A dark veil beneath the layers dims whatever lies below, and lifts on the way down to the river.
 */
export function buildStack(ctx: Ctx, projects: { uses: string[]; world: THREE.Vector3[] }[]) {
  const fieldAt = (o: [number, number, number]) => SF.clone().add(V(o[0] * 1.12, o[1] * 1.55, o[2] * 1.1));
  const toolPos: Record<string, THREE.Vector3> = {};
  const tags: Tag[] = [];
  const tag = (html: string, at: THREE.Vector3, lead: boolean, chars: number) => {
    const e = el(ctx, lead ? "tool lead" : "tool", html);
    tags.push({ el: e, at, lead, chars, sx: 0, sy: 0, sc: 1, w: 0, h: 0, tx: 0, ty: 0, ox: 0, oy: 0, near: 1, blur: 0, behind: false });
  };
  for (const [cap, lead, items, o] of STACK) {
    const c = fieldAt(o);
    tag(`<div class="mono cap">${cap}</div><div class="big">${lead}</div>`, c, true, lead.length);
    toolPos[LEAD_OF[lead] || lead] = c;
    const rest = items.filter((t) => t !== lead && t !== LEAD_OF[lead]);
    rest.forEach((t, i) => {
      const a = (i / rest.length) * TAU + cap.length * 0.37, rr = i % 2 ? 2.7 : 1.95;
      const q = c.clone().add(V(Math.cos(a) * rr * 1.3, ((i % 3) - 1) * 0.3, Math.sin(a) * rr * 0.8));
      tag(t, q, false, t.length);
      toolPos[t] = q;
    });
  }

  // dust sheets: the layers the names ride on, grown out of the orb as it dives in
  const NSH = Math.round(16000 * ctx.quality);
  const HS = new Float32Array(NSH * 3), HD = new Float32Array(NSH), HC = new Float32Array(NSH * 3), HZ = new Float32Array(NSH);
  for (let i = 0; i < NSH; i++) {
    const c = fieldAt(STACK[i % STACK.length][3]), a = R() * TAU, rr = Math.sqrt(R()) * 3.4;
    const q = c.add(V(Math.cos(a) * rr * 1.3, gauss() * 0.08, Math.sin(a) * rr * 0.9));
    HS.set([q.x, q.y, q.z], i * 3);
    HD[i] = R() * 0.5;
    HC.set((R() < 0.75 ? emberAt(0.2 + R() * 0.6) : [0.62, 0.68, 0.9]).map((v) => v * 0.55), i * 3);
    HZ[i] = 0.018 + R() * 0.03;
  }
  const sheetU = { uOut: { value: 0 }, uG: { value: 0 }, uFrom: { value: DIVE }, uTime: ctx.u.TIME, uScale: ctx.u.SCALE, uFocus: ctx.u.FOCUS, ...ctx.u.CUR };
  {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(HS, 3));
    g.setAttribute("aD", new THREE.BufferAttribute(HD, 1));
    g.setAttribute("aCol", new THREE.BufferAttribute(HC, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(HZ, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: sheetU,
      vertexShader: /* glsl */ `
        attribute vec3 aCol; attribute float aD, aSize; uniform float uG, uOut, uTime, uScale, uFocus; uniform vec3 uFrom; varying vec3 vC; varying float vCoc;
        ${STIR_GLSL}
        void main(){
          float x = clamp((uG - aD) / 0.5, 0.0, 1.0), e = 1.0 - pow(1.0 - x, 3.0);
          vec3 p = mix(uFrom, position, e); p.y += sin(uTime * 0.4 + position.x * 0.7 + position.z) * 0.06;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); float d = -mv.z; stir(mv, d, 16.0);
          float coc = clamp(abs(d - uFocus) * 0.05, 0.0, 1.0);
          gl_PointSize = min(aSize * (260.0 * uScale / d) * (1.0 + coc * 2.5), 60.0); vCoc = coc;
          vC = aCol * step(0.001, uG) * (0.35 + 0.65 * e) * mix(1.0, 0.3, coc) * (1.0 - uOut); gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: DUST_FRAG,
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    pts.renderOrder = 2; // drawn after the veil, so the veil dims only what lies beneath
    ctx.scene.add(pts);
  }

  // roots: threads drop from each project's stars down to the tools it was built with
  const threadU = { uGrow: { value: 0 }, uOp: { value: 0 } };
  {
    const p: number[] = [], t: number[] = [];
    for (const pr of projects)
      for (const u of pr.uses) {
        const to = toolPos[u];
        if (!to) continue;
        const from = pr.world[Math.floor(R() * pr.world.length)];
        p.push(from.x, from.y, from.z, to.x, to.y + 0.25, to.z);
        t.push(0, 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("aT", new THREE.Float32BufferAttribute(t, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: threadU,
      vertexShader: /* glsl */ `
        attribute float aT; varying float vT;
        void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uGrow, uOp; varying float vT;
        void main(){ if (vT > uGrow) discard; float head = smoothstep(uGrow - 0.08, uGrow, vT); gl_FragColor = vec4(vec3(1.0, 0.62, 0.3) * (0.35 + 1.2 * head) * uOp, 1.0); }`,
    });
    const l = new THREE.LineSegments(g, m);
    l.frustumCulled = false;
    l.renderOrder = 2;
    ctx.scene.add(l);
  }

  // the veil: a dark translucent floor under the layers, so the river below reads as a dim glow
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshBasicMaterial({ color: 0x050507, transparent: true, opacity: 0, depthWrite: false }));
  veil.rotation.x = -Math.PI / 2;
  veil.position.copy(SF).add(V(0, -5.2, 0));
  veil.renderOrder = 1;
  ctx.scene.add(veil);

  const words = block(ctx, "stack"), tmp = V();

  return {
    update(f: Frame) {
      const { G, GG, dt } = f;
      threadU.uGrow.value = smooth(0.735, 0.79, G);
      // the roots step back once the names arrive, and are gone on the way down
      threadU.uOp.value = smooth(0.73, 0.745, G) * (1 - 0.96 * smooth(0.815, 0.86, G)) * (1 - smooth(0.505, 0.52, GG));
      const vo = 0.9 * smooth(0.77, 0.81, G) * (1 - smooth(0.503, 0.512, GG));
      veil.material.opacity = vo;
      veil.visible = vo > 0.001;
      sheetU.uG.value = smooth(0.785, 0.845, G);
      sheetU.uOut.value = smooth(0.505, 0.53, GG);
      words.style.opacity = String(smooth(0.83, 0.85, G) * (1 - smooth(0.502, 0.512, GG)));

      const tv = smooth(0.8, 0.84, G) * (1 - smooth(0.501, 0.509, GG));
      if (tv <= 0) {
        for (const t of tags) t.el.style.opacity = "0";
        return;
      }
      const cam = ctx.camera, W = ctx.W, H = ctx.H, fd = ctx.u.FOCUS.value;
      // page margins: the rail takes the right edge on wide screens
      const narrow = W < 760, mL = narrow ? 16 : 48, mR = narrow ? 16 : 170, mT = narrow ? 80 : 92, mB = narrow ? 110 : 120;
      // project every name, then push the small ones apart; the big lead words mostly hold their place
      for (const t of tags) {
        tmp.copy(t.at).project(cam);
        const d = cam.position.distanceTo(t.at), base = t.lead ? 46 : 16;
        t.behind = tmp.z > 1;
        t.sx = (tmp.x * 0.5 + 0.5) * W;
        t.sy = (-tmp.y * 0.5 + 0.5) * H;
        t.sc = clamp(12.5 / d, 0.4, 2.4) * (narrow ? 0.62 : 1);
        t.near = smooth(1.0, 2.2, d);
        t.blur = Math.min(3, Math.abs(d - fd) * 0.22);
        t.w = t.chars * (t.lead ? 0.68 : 0.56) * base * t.sc + 18;
        t.h = base * t.sc * (t.lead ? 1.9 : 1.5) + 6;
        t.tx = 0;
        t.ty = 0;
      }
      for (let it = 0; it < (narrow ? 28 : 14); it++) {
        for (let a = 0; a < tags.length; a++)
          for (let b = a + 1; b < tags.length; b++) {
            const A = tags[a], B = tags[b];
            if (A.behind || B.behind) continue;
            const ox = (A.w + B.w) / 2 - Math.abs(A.sx + A.tx - B.sx - B.tx), oy = (A.h + B.h) / 2 - Math.abs(A.sy + A.ty - B.sy - B.ty);
            if (ox <= 0 || oy <= 0) continue;
            const wa = A.lead === B.lead ? 0.5 : A.lead ? 0.15 : 0.85, wb = 1 - wa;
            if (oy < ox) {
              const s2 = Math.sign(A.sy + A.ty - B.sy - B.ty) || 1;
              A.ty += s2 * oy * wa;
              B.ty -= s2 * oy * wb;
            } else {
              const s2 = Math.sign(A.sx + A.tx - B.sx - B.tx) || 1;
              A.tx += s2 * ox * wa;
              B.tx -= s2 * ox * wb;
            }
          }
        // and every name stays on the page, clear of the chrome
        for (const t of tags) {
          if (t.behind) continue;
          const x = clamp(t.sx + t.tx, mL + t.w / 2, W - mR - t.w / 2), y = clamp(t.sy + t.ty, mT + t.h / 2, H - mB - t.h / 2);
          t.tx = x - t.sx;
          t.ty = y - t.sy;
        }
      }
      const k = f.fixed ? 1 : 1 - Math.exp(-dt * 8);
      for (const t of tags) {
        t.ox += (t.tx - t.ox) * k;
        t.oy += (t.ty - t.oy) * k;
        t.el.style.opacity = t.behind ? "0" : (tv * t.near).toFixed(3);
        t.el.style.filter = `blur(${t.blur.toFixed(2)}px)`;
        t.el.style.transform = `translate(${(t.sx + t.ox).toFixed(1)}px, ${(t.sy + t.oy).toFixed(1)}px) translate(-50%, -50%) scale(${t.sc.toFixed(3)})`;
      }
    },
  };
}
