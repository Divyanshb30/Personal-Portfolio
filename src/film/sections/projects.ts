import * as THREE from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import type { Ctx, Frame } from "../ctx";
import type { Shot } from "../director";
import { block, el } from "../ctx";
import { DUST_FRAG, GLSL_FN, STIR_GLSL } from "../glsl";
import { R, TAU, V, clamp, emberAt, gauss, lerp, rng, smooth } from "../math";
import { DIVE, PC, PJ, PL_R, planetRot } from "../layout";
import { PROJECTS, type Project } from "../data";
import type { Orb } from "../orb";

const TEMPS = [[0.74, 0.84, 1.0], [1, 1, 1], [1, 0.9, 0.76]];

/** Each project's constellation: stars, the lines between them, and pulses of light travelling the lines. */
function shape(id: Project["id"]) {
  const r = rng(id.charCodeAt(0) * 17 + id.length);
  const P: THREE.Vector3[] = [], S: number[] = [], E: [number, number][] = [], pulses: [number, number, number][] = [];
  const add = (x: number, y: number, z: number, s: number) => (P.push(V(x, y, z)), S.push(s), P.length - 1);
  if (id === "rag") {
    // a query at the centre, candidates around it, the long tail beyond
    const c = add(0, 0, 0, 1.7), inner: number[] = [];
    for (let k = 0; k < 6; k++) {
      const a = (k * TAU) / 6 + 0.3 + (r() - 0.5) * 0.3, rr = 0.72 + (r() - 0.5) * 0.18;
      inner.push(add(Math.cos(a) * rr, Math.sin(a) * rr, (r() - 0.5) * 0.5, 0.75 + r() * 0.3));
      E.push([c, inner[k]]);
    }
    for (let k = 0; k < 9; k++) {
      const a = (k * TAU) / 9 + r() * 0.4, rr = 1.25 + r() * 0.35;
      const o = add(Math.cos(a) * rr, Math.sin(a) * rr, (r() - 0.5) * 0.7, 0.4 + r() * 0.35);
      E.push([inner[Math.floor(((((a - 0.3) % TAU) + TAU) % TAU / TAU) * 6) % 6], o]);
    }
    pulses.push([1, 0.45, -1], [4, 0.62, -1], [9, 0.5, 1]);
  }
  if (id === "gpt") {
    // a grid of tokens, one attending to all the others
    const idx: number[] = [];
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 5; col++) idx.push(add((col - 2) * 0.52, (1.5 - row) * 0.46, (col - 2) * 0.1 + (r() - 0.5) * 0.15, 0.5 + r() * 0.3));
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) E.push([idx[row * 5 + col], idx[row * 5 + col + 1]]);
    const q = idx[14];
    S[q] = 1.5;
    for (let k = 0; k < 14; k++) E.push([q, idx[k]]);
    pulses.push([19, 0.5, 1], [24, 0.35, 1], [27, 0.6, 1]);
  }
  if (id === "loan") {
    // three lanes of models converging on the stacked decision
    const fin = add(1.55, 0, 0, 1.6);
    for (let lane = 0; lane < 3; lane++) {
      let prev = -1;
      for (let k = 0; k < 6; k++) {
        const t = k / 5, x = -1.6 + t * 2.6, y = (lane - 1) * 0.75 * (1 - t * 0.75) + Math.sin(t * 5 + lane) * 0.08, z = (lane - 1) * 0.3 * (1 - t);
        const i = add(x, y, z, 0.45 + r() * 0.3);
        if (prev >= 0) E.push([prev, i]);
        prev = i;
      }
      E.push([prev, fin]);
    }
    pulses.push([1, 0.6, 1], [8, 0.3, 1], [14, 0.7, 1], [11, 0.5, 1]);
  }
  if (id === "agents") {
    // an orchestrator at the core, five agents around it handing work on to each other, each with its tools
    const c = add(0, 0, 0, 2.1), ring: number[] = [];
    for (let k = 0; k < 5; k++) {
      const a = (k * TAU) / 5 + Math.PI / 2;
      ring.push(add(Math.cos(a) * 1.25, Math.sin(a) * 1.0, Math.sin(a) * 0.3, 1.15));
    }
    for (let k = 0; k < 5; k++) {
      E.push([c, ring[k]]);
      E.push([ring[k], ring[(k + 1) % 5]]);
    }
    for (let k = 0; k < 5; k++) {
      const a = (k * TAU) / 5 + Math.PI / 2;
      for (const o of [-0.22, 0.22]) E.push([ring[k], add(Math.cos(a + o) * 1.95, Math.sin(a + o) * 1.55, (r() - 0.5) * 0.5, 0.45 + r() * 0.2)]);
    }
    // work leaving the core for an agent, and agents passing it along
    pulses.push([0, 0.55, 1], [4, 0.4, 1], [1, 0.5, 1], [5, 0.6, 1], [3, 0.35, 1], [8, 0.5, 1]);
  }
  if (id === "dtu") {
    // a hub and the ring of modules around it
    const c = add(0, 0, 0, 1.3), ring: number[] = [];
    for (let k = 0; k < 8; k++) {
      const a = (k * TAU) / 8 + 0.2;
      ring.push(add(Math.cos(a) * 1.05, Math.sin(a) * 0.82, Math.sin(a) * 0.35, 0.55 + r() * 0.3));
    }
    for (let k = 0; k < 8; k++) {
      E.push([ring[k], ring[(k + 1) % 8]]);
      E.push([c, ring[k]]);
    }
    pulses.push([0, 0.5, 1], [6, 0.4, 1], [10, 0.6, 1]);
  }
  return { P, S, E, pulses };
}

/** Stars with a core, bloom and halo; the brightest carry thin diffraction spikes. */
function richStars(ctx: Ctx, pos: number[], col: number[], size: number[], spike: number[], parent: THREE.Object3D) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aColor", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("aSize", new THREE.Float32BufferAttribute(size, 1));
  g.setAttribute("aSpike", new THREE.Float32BufferAttribute(spike, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uScale: ctx.u.SCALE, uGain: { value: 0 }, uTime: ctx.u.TIME },
    vertexShader: /* glsl */ `
      attribute float aSize, aSpike; attribute vec3 aColor; uniform float uScale, uTime; varying vec3 vC; varying float vS;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float tw = 0.85 + 0.15 * sin(uTime * 2.0 + position.x * 13.0 + position.y * 7.0);
        gl_PointSize = min(aSize * 900.0 * uScale / -mv.z, 256.0); vC = aColor * tw; vS = aSpike;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uGain; varying vec3 vC; varying float vS;
      void main(){
        vec2 q = gl_PointCoord - 0.5; float r = length(q);
        float core = exp(-r * r * 480.0), bl = exp(-r * r * 70.0) * 0.36, halo = exp(-r * 8.0) * 0.12 * smoothstep(0.5, 0.2, r);
        float sp = vS * (exp(-abs(q.x) * 130.0) * smoothstep(0.5, 0.0, abs(q.y)) + exp(-abs(q.y) * 130.0) * smoothstep(0.5, 0.0, abs(q.x))) * 0.5;
        float a = (core + bl + halo + sp) * uGain; if (a < 0.004) discard;
        gl_FragColor = vec4(mix(vC, vec3(1.0), clamp(core, 0.0, 1.0) * 0.7) * a, a);
      }`,
  });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  parent.add(p);
  return m;
}

/** Lines that fade toward their middle (or ramp up to a head, for the pulses' tails). */
function fadeLines(segs: [THREE.Vector3, THREE.Vector3][], rgb: number[], op: number, parent: THREE.Object3D, ramp = false) {
  const p: number[] = [], c: number[] = [], n = ramp ? 8 : 14;
  const f = (t: number) => op * (ramp ? t * t : 0.16 + 0.84 * Math.pow(Math.abs(2 * t - 1), 2.4));
  for (const [a, b] of segs)
    for (let i = 0; i < n; i++) {
      const t0 = ramp ? i / n : 0.08 + (0.84 * i) / n, t1 = ramp ? (i + 1) / n : 0.08 + (0.84 * (i + 1)) / n;
      const A = a.clone().lerp(b, t0), B = a.clone().lerp(b, t1);
      p.push(A.x, A.y, A.z, B.x, B.y, B.z);
      c.push(...rgb.map((q) => q * f(t0)), ...rgb.map((q) => q * f(t1)));
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
  const m = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const l = new THREE.LineSegments(g, m);
  l.frustumCulled = false;
  parent.add(l);
  return m;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
const or = (s: string, ph: string) => (s ? `<p>${esc(s)}</p>` : `<p class="ph">${ph}</p>`);
const panelHTML = (pr: Project) => `
  <div style="display:flex;justify-content:space-between;align-items:center">
    <span class="mono sub">${esc(pr.kind)}</span><button type="button" data-close class="mono sub">Close ✕</button>
  </div>
  <h3>${esc(pr.title)}</h3><p>${esc(pr.line)}</p>
  <div class="sec"><div class="mono sub">Result</div><div class="disp" style="font-size:28px;color:#ffc896;margin-top:10px">${esc(pr.metric)}</div></div>
  <div class="sec"><div class="mono sub">The problem</div>${or(pr.problem, "Placeholder: what was broken or slow, and for whom.")}</div>
  <div class="sec"><div class="mono sub">What I built</div>${
    Array.isArray(pr.built) ? `<ul>${pr.built.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : or(pr.built, "Placeholder: the system, its key decisions, and why they held up.")
  }</div>
  <div class="sec"><div class="mono sub">Outcome</div>${or(pr.outcome, "Placeholder: what changed after it shipped.")}</div>
  <div class="sec"><div class="mono sub">Built with</div><p>${pr.uses.map(esc).join(" · ")}</p></div>
  ${
    pr.also?.length
      ? `<div class="sec also"><div class="mono sub">Also at Amdocs</div>${pr.also
          .map((a) => `<h4>${esc(a.title)}</h4><p>${esc(a.line)}</p><p class="mono sub uses">${a.uses.map(esc).join(" · ")}</p>`)
          .join("")}</div>`
      : ""
  }
  ${
    pr.links.length
      ? `<div style="margin-top:26px;display:flex;flex-wrap:wrap;gap:10px">${pr.links
          .map((l) => `<a class="mono pill" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)} ↗</a>`)
          .join("")}</div>`
      : `<div class="mono sub" style="margin-top:26px">Proprietary · built at Amdocs for AT&amp;T</div>`
  }`;

/**
 * PROJECTS. The planet's dust rises, top first, and settles into named constellations, one per
 * project, the featured one (his work at Amdocs) biggest and in the middle. One wide shot: hover brightens a constellation, a click flies the camera to it and
 * opens its story beside it. Esc, ✕ or any scroll closes it; scrolling on leads down into the stack.
 * The orb follows as a small glass guide, then dives down the roots into the stack. Leave it alone
 * by the transformer for a while and it wanders into the attention field, which notices it.
 */
export function buildProjects(ctx: Ctx, planetGeo: THREE.BufferGeometry, orb: Orb) {
  const projs = PROJECTS.map((pr) => {
    const center = PJ.clone().add(V(...pr.off));
    const grp = new THREE.Group();
    grp.position.copy(center);
    grp.scale.setScalar(pr.sc);
    ctx.scene.add(grp);
    grp.updateMatrixWorld(true);
    const sh = shape(pr.id), r2 = rng(pr.id.length * 91 + pr.id.charCodeAt(1));
    const p: number[] = [], c: number[] = [], s: number[] = [], k: number[] = [];
    sh.P.forEach((v, i) => {
      p.push(v.x, v.y, v.z);
      c.push(...TEMPS[Math.floor(r2() * 3)]);
      s.push(sh.S[i] * 0.42);
      k.push(sh.S[i] > 1.2 ? 1 : 0);
    });
    const stars = richStars(ctx, p, c, s, k, grp);
    const lines = fadeLines(sh.E.map(([a, b]) => [sh.P[a], sh.P[b]] as [THREE.Vector3, THREE.Vector3]), [0.8, 0.86, 1], 0.5, grp);
    const pp: number[] = [], pc: number[] = [], ps: number[] = [], pk: number[] = [], tail: [THREE.Vector3, THREE.Vector3][] = [];
    for (const [e, t, dir] of sh.pulses) {
      const [a, b] = sh.E[e].map((i) => sh.P[i]), from = dir > 0 ? a : b, to = dir > 0 ? b : a, h = from.clone().lerp(to, t);
      pp.push(h.x, h.y, h.z);
      pc.push(1, 0.9, 0.78);
      ps.push(0.3);
      pk.push(0);
      tail.push([from.clone().lerp(to, Math.max(0.04, t - 0.24)), h]);
    }
    const pulses = richStars(ctx, pp, pc, ps, pk, grp);
    const tails = fadeLines(tail, [1, 0.86, 0.68], 1.3, grp, true);
    const world = sh.P.map((v) => v.clone().applyMatrix4(grp.matrixWorld));
    const box = new THREE.Box3().setFromPoints(world);
    const edgeWorld = sh.E.map(([a, b]) => [world[a], world[b]] as [THREE.Vector3, THREE.Vector3]);
    const label = el(
      ctx,
      pr.featured ? "proj featured" : "proj",
      `<div class="mono sub">${esc(pr.kind)}</div><div class="t">${esc(pr.title)}</div><div class="mono m">${esc(pr.metric)}</div><div class="mono o">Explore →</div>`,
    );
    label.setAttribute("role", "button");
    label.setAttribute("aria-label", `Open ${pr.title}`);
    label.tabIndex = -1;
    return { data: pr, grp, local: sh.P, center, stars, lines, pulses, tails, world, box, edgeWorld, label, hl: 0, sx: 0, sy: 0, lx: 0, ly: 0, lw: 260, lh: 110, tf: "", op: "", pe: "" };
  });

  // the rising dust: grains leave the planet's surface (top first) and settle on the stars and lines
  const NR = Math.round(18000 * ctx.quality);
  const RS = new Float32Array(NR * 3), RE = new Float32Array(NR * 3), RD = new Float32Array(NR), RC = new Float32Array(NR * 3), RZ = new Float32Array(NR);
  {
    const pm = new THREE.Mesh(planetGeo);
    pm.scale.setScalar(PL_R);
    pm.position.copy(PC);
    pm.rotation.copy(planetRot);
    pm.updateMatrixWorld(true);
    const sampler = new MeshSurfaceSampler(new THREE.Mesh(planetGeo)).build(), p = V();
    const starWorld = projs.flatMap((pr) => pr.world), allEdges = projs.flatMap((pr) => pr.edgeWorld);
    for (let i = 0; i < NR; i++) {
      sampler.sample(p);
      p.applyMatrix4(pm.matrixWorld);
      RS.set([p.x, p.y, p.z], i * 3);
      RD[i] = clamp(0.5 - ((p.y - PC.y) / PL_R) * 0.4 + (R() - 0.5) * 0.2, 0, 0.9);
      let q: THREE.Vector3;
      if (R() < 0.45) q = starWorld[Math.floor(R() * starWorld.length)].clone().add(V(gauss() * 0.05, gauss() * 0.05, gauss() * 0.05));
      else {
        const [a, b] = allEdges[Math.floor(R() * allEdges.length)];
        q = a.clone().lerp(b, R()).add(V(gauss() * 0.03, gauss() * 0.03, gauss() * 0.03));
      }
      RE.set([q.x, q.y, q.z], i * 3);
      RC.set(emberAt(0.1 + R() * 0.5), i * 3);
      RZ[i] = 0.016 + R() * 0.026;
    }
  }
  const riseU = { uR: { value: 0 }, uOut: { value: 0 }, uTime: ctx.u.TIME, uScale: ctx.u.SCALE, uFocus: ctx.u.FOCUS, ...ctx.u.CUR };
  let rise: THREE.Points;
  {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(RS, 3));
    g.setAttribute("aE", new THREE.BufferAttribute(RE, 3));
    g.setAttribute("aD", new THREE.BufferAttribute(RD, 1));
    g.setAttribute("aCol", new THREE.BufferAttribute(RC, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(RZ, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: riseU,
      vertexShader: /* glsl */ `
        attribute vec3 aE, aCol; attribute float aD, aSize; uniform float uR, uOut, uTime, uScale, uFocus; varying vec3 vC; varying float vCoc;
        ${GLSL_FN}
        ${STIR_GLSL}
        void main(){
          float x = clamp((uR - aD) / (1.0 - aD * 0.9), 0.0, 1.0), e = x * x * (3.0 - 2.0 * x), f = sin(3.14159 * e);
          vec3 p = mix(position, aE, e) + vec3(0.0, 2.5, 0.0) * f + flow(position * 0.4 + uTime * 0.05) * 1.3 * f;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); float d = -mv.z; stir(mv, d, 20.0);
          float coc = clamp(abs(d - uFocus) * 0.04, 0.0, 1.0), vis = step(0.001, uR) * (1.0 - uOut);
          gl_PointSize = min(aSize * (260.0 * uScale / d) * (1.0 + f * 1.4) * (1.0 + coc * 2.0), 36.0); vCoc = coc;
          vC = aCol * (0.35 + 1.2 * f + 0.25 * e) * mix(1.0, 0.3, coc) * vis; gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: DUST_FRAG,
    });
    rise = new THREE.Points(g, m);
    rise.frustumCulled = false;
    ctx.scene.add(rise);
  }

  // the orb, now small and glass, guiding you from project to project
  const guideAt = projs.map((pr) => V(pr.box.max.x + 0.5, pr.box.max.y + 0.1, pr.center.z + 0.8));

  // the transformer's attention, all of it at once, on the orb: a line from every token to it
  const gpt = projs.find((pr) => pr.data.id === "gpt")!;
  const attnU = { uOrb: { value: V() }, uAmt: { value: 0 } };
  {
    const p: number[] = [], e: number[] = [];
    for (const q of gpt.local) {
      p.push(q.x, q.y, q.z, q.x, q.y, q.z);
      e.push(0, 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("aEnd", new THREE.Float32BufferAttribute(e, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: attnU,
      vertexShader: /* glsl */ `
        attribute float aEnd; uniform vec3 uOrb; varying float vE;
        void main(){ vE = aEnd; gl_Position = projectionMatrix * modelViewMatrix * vec4(mix(position, uOrb, aEnd), 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uAmt; varying float vE;
        void main(){ if (uAmt < 0.003) discard; gl_FragColor = vec4(vec3(1.0, 0.9, 0.78) * uAmt * mix(1.1, 0.25, vE), 1.0); }`,
    });
    const l = new THREE.LineSegments(g, m);
    l.frustumCulled = false;
    gpt.grp.add(l);
  }
  // left by the transformer, the orb drifts in among the tokens; a clock per visit, then a long rest
  const EGG = { idle: 0, t: -1, wait: 6, fled: false };
  const INTO = gpt.grp.localToWorld(V(0.26, 0.23, 0.35)), QUERY = gpt.grp.localToWorld(gpt.local[14].clone());

  // picking: hover a constellation to brighten it, click to fly in and read its story
  const panel = block(ctx, "panel"), work = block(ctx, "build");
  const PICK = { on: false, hover: -1, idx: -1, last: -1, amt: 0, at: 0 };
  const open = (i: number) => {
    if (!PICK.on) return;
    PICK.idx = i;
    PICK.at = window.scrollY;
    panel.innerHTML = panelHTML(projs[i].data);
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    panel.setAttribute("aria-label", projs[i].data.title);
    panel.querySelector<HTMLButtonElement>("[data-close]")?.addEventListener("click", close);
  };
  const close = () => {
    if (PICK.idx < 0) return;
    const was = projs[PICK.idx]?.label;
    PICK.idx = -1;
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    if (panel.contains(document.activeElement)) was?.focus({ preventScroll: true });
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };
  const onClick = (e: MouseEvent) => {
    // only clicks on the open sky count, not on the rail, the bar or the panel
    if (!PICK.on || PICK.idx >= 0 || e.target !== ctx.renderer.domElement) return;
    if (PICK.hover >= 0) open(PICK.hover);
  };
  window.addEventListener("keydown", onKey);
  window.addEventListener("click", onClick);
  projs.forEach((pr, i) => {
    pr.label.addEventListener("click", (e) => {
      e.stopPropagation();
      open(i);
    });
    pr.label.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(i);
      }
    });
  });
  const tmp = V(), tmp2 = V(), home = V(), UPV = V(0, 1, 0);
  let wasOn = false, sized = false, sizedAt = 0;
  // the names re-measure once the web fonts have arrived
  document.fonts?.ready.then(() => (sized = false));

  return {
    dispose() {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
      document.body.style.cursor = "";
    },
    /** the projects' stars in world space, for the roots that drop to the stack */
    // the roots reach every tool a project was built with, and those of the work told beside it
    stars: projs.map((pr) => ({ uses: [...new Set([...pr.data.uses, ...(pr.data.also ?? []).flatMap((a) => a.uses)])], world: pr.world })),
    shot(f: Frame, sh: Shot) {
      const { dt, mouse } = f;
      PICK.hover = -1;
      if (PICK.on && PICK.idx < 0) {
        let best = 1e9;
        const mx = (mouse.x * 0.5 + 0.5) * ctx.W, my = (-mouse.y * 0.5 + 0.5) * ctx.H;
        projs.forEach((pr, i) => {
          const d = Math.hypot(mx - pr.sx, my - pr.sy);
          if (d < 170 && d < best) {
            best = d;
            PICK.hover = i;
          }
        });
      }
      document.body.style.cursor = PICK.hover >= 0 ? "pointer" : "";
      if (PICK.idx >= 0 && Math.abs(window.scrollY - PICK.at) > 40) close();
      PICK.amt += ((PICK.idx >= 0 ? 1 : 0) - PICK.amt) * (1 - Math.exp(-dt * 2.6));
      if (PICK.idx >= 0) PICK.last = PICK.idx;
      if (PICK.amt > 0.001 && PICK.last >= 0) {
        const pr = projs[PICK.last], e = PICK.amt * PICK.amt * (3 - 2 * PICK.amt);
        sh.pos.lerp(tmp.copy(pr.center).add(V(2.0, -0.35, 7.2)), e);
        sh.tgt.lerp(tmp.copy(pr.center).add(V(2.0, 0, 0)), e);
        sh.fov = lerp(sh.fov, 40, e);
      }
    },
    update(f: Frame) {
      const { G, dt, time } = f;
      riseU.uR.value = smooth(0.46, 0.53, G);
      riseU.uOut.value = 0.8 * smooth(0.53, 0.58, G);
      const lit = smooth(0.5, 0.53, G), leave = 1 - 0.65 * smooth(0.76, 0.84, G), pick = smooth(0.515, 0.53, G) * (1 - smooth(0.72, 0.735, G));
      // the sky is drawn from the moment its dust rises until the camera has dived below it
      const sky = G > 0.455 && G < 0.83;
      rise.visible = sky;
      for (const pr of projs) pr.grp.visible = sky && lit > 0.001;
      PICK.on = pick > 0.5;
      if (PICK.on !== wasOn) {
        wasOn = PICK.on;
        for (const pr of projs) pr.label.tabIndex = PICK.on ? 0 : -1;
        if (!PICK.on) close();
      }
      projs.forEach((pr, i) => {
        const hot = PICK.hover === i ? 1 : 0, foc = PICK.idx === i ? 1 : 0;
        pr.hl += ((PICK.idx >= 0 ? foc : hot) - pr.hl) * (1 - Math.exp(-dt * 8));
        const g = lit * leave * (1 + 0.5 * pr.hl) * (PICK.idx >= 0 && !foc ? 1 - 0.7 * PICK.amt : 1);
        pr.stars.uniforms.uGain.value = g;
        pr.pulses.uniforms.uGain.value = g;
        pr.lines.opacity = g;
        pr.tails.opacity = g;
        // names alternate above and below their constellations so neighbours never collide
        const up = pr.data.label ? pr.data.label === "above" : i === 1 || i === 3;
        tmp.set(pr.center.x, up ? pr.box.max.y + 0.3 : pr.box.min.y - 0.35, pr.center.z).project(ctx.camera);
        const px = (tmp.x * 0.5 + 0.5) * ctx.W, py = (-tmp.y * 0.5 + 0.5) * ctx.H - (up ? 92 : 0);
        tmp2.copy(pr.center).project(ctx.camera);
        pr.sx = (tmp2.x * 0.5 + 0.5) * ctx.W;
        pr.sy = (-tmp2.y * 0.5 + 0.5) * ctx.H;
        const op = (tmp.z < 1 ? pick * (1 - PICK.amt) : 0).toFixed(3), pe = PICK.on && PICK.idx < 0 ? "auto" : "none";
        if (op !== pr.op) pr.label.style.opacity = pr.op = op;
        if (pe !== pr.pe) pr.label.style.pointerEvents = pr.pe = pe;
        pr.label.classList.toggle("hot", hot > 0);
        pr.lx = px - 110;
        pr.ly = py;
      });
      // the names' sizes, read from the page only when the screen or the fonts change (reading them every
      // frame, just after moving them, would make the browser lay the page out again each time)
      if (pick > 0.001 && (sizedAt !== ctx.W * 1e5 + ctx.H || !sized)) {
        for (const pr of projs) {
          pr.lw = pr.label.offsetWidth || 260;
          pr.lh = pr.label.offsetHeight || 110;
        }
        sizedAt = ctx.W * 1e5 + ctx.H;
        sized = true;
      }
      // on a narrow screen names can still meet: nudge any that overlap apart, then place them
      if (pick > 0.001) {
        for (let a = 0; a < projs.length; a++)
          for (let b = a + 1; b < projs.length; b++) {
            const A = projs[a], B = projs[b];
            const ox = Math.min(A.lx + A.lw, B.lx + B.lw) - Math.max(A.lx, B.lx), oy = Math.min(A.ly + A.lh, B.ly + B.lh) - Math.max(A.ly, B.ly);
            if (ox <= 0 || oy <= 0) continue;
            const lower = A.ly > B.ly ? A : B;
            lower.ly += oy + 12;
          }
      }
      // and every name stays inside the page, whatever its height
      for (const pr of projs) {
        pr.lx = clamp(pr.lx, 16, ctx.W - pr.lw - 16);
        pr.ly = clamp(pr.ly, 84, ctx.H - pr.lh - 64);
        const tf = `translate(${pr.lx.toFixed(1)}px, ${pr.ly.toFixed(1)}px)`;
        if (tf !== pr.tf) pr.label.style.transform = pr.tf = tf;
      }
      // the guide hovers by whichever project has your attention, then dives down the roots
      const dive = smooth(0.745, 0.8, G);
      const gs = 0.28 * smooth(0.53, 0.56, G) * (1 - smooth(0.785, 0.8, G));
      home.copy(guideAt[PICK.idx >= 0 ? PICK.idx : PICK.hover >= 0 ? PICK.hover : 1]).add(tmp.set(0, Math.sin(time * 1.3) * 0.06, 0));

      // the attention egg: it only runs while the orb is parked by the transformer and nobody is choosing
      const parked = PICK.on && PICK.idx < 0 && PICK.hover < 0 && gs > 0.27 && !orb.still;
      if (EGG.t < 0) {
        EGG.idle = parked ? EGG.idle + dt : 0;
        if (EGG.idle > EGG.wait) Object.assign(EGG, { t: 0, idle: 0, wait: 45, fled: false });
      } else EGG.t = parked && EGG.t < 2.6 ? EGG.t + dt : -1;
      const et = EGG.t, attn = et < 1.2 ? 0 : et < 1.3 ? 1 : Math.exp(-(et - 1.3) * 14);
      attnU.uAmt.value = et < 0 ? 0 : attn;
      gpt.lines.opacity *= 1 - 0.8 * attnU.uAmt.value;
      gpt.stars.uniforms.uGain.value *= 1 + 0.5 * attnU.uAmt.value;

      if (gs > 0.001) {
        if (et >= 0 && et < 1.55) {
          // wanders in, curious; holds still while every token turns to it; notices
          const inn = smooth(0, 1.2, et);
          orb.drive({ at: tmp.copy(home).lerp(INTO, inn), size: gs, look: QUERY, lookAmt: 0.5 + 0.5 * smooth(1.25, 1.35, et), pin: 0.6 * smooth(1.0, 1.2, et) });
          orb.feel(et < 1.25 ? "Curious" : "Noticed");
          if (et > 1.3 && et < 1.45) orb.squash(-0.3, UPV);
        } else {
          if (et >= 1.55 && !EGG.fled) {
            EGG.fled = true;
            orb.kick(tmp.copy(home).sub(INTO).normalize().multiplyScalar(7).add(tmp2.set(0, 2, 0)));
          }
          orb.drive({ at: tmp.copy(home).lerp(DIVE, dive * dive), size: gs, pin: dive * dive });
          orb.feel(dive > 0.1 ? "Diving" : et >= 1.55 ? "Startled" : PICK.idx >= 0 ? "Reading along" : PICK.hover >= 0 ? "Pointing" : "Guiding");
        }
        attnU.uOrb.value.copy(orb.pos);
        gpt.grp.worldToLocal(attnU.uOrb.value);
      }
      work.style.opacity = String(smooth(0.51, 0.525, G) * (1 - smooth(0.72, 0.735, G)) * (1 - PICK.amt));
    },
  };
}
