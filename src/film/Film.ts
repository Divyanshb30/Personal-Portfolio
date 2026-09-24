import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { block, makeShared, type Ctx, type Frame, type Section } from "./ctx";
import { Director, firstHalfKeys, type Key } from "./director";
import { environment, points, blobGeometry } from "./helpers";
import { R, V, emberAt, gauss, smooth, COOL } from "./math";
import { A_SPAN, OS, PLACES, PLACE_AT, filmT, placeAt, scrollFor, type Place } from "./layout";
import { loadFigure } from "./figure";
import { buildBeing } from "./sections/being";
import { buildThink } from "./sections/think";

export type FilmOptions = {
  canvas: HTMLCanvasElement;
  root: HTMLElement;
  labels: HTMLElement;
  onPlace?: (p: Place) => void;
  onReady?: () => void;
};

/** Pick a particle budget for this device. */
function qualityFor() {
  const small = Math.min(window.innerWidth, window.innerHeight) < 700 || window.matchMedia("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency || 4;
  return small ? 0.45 : cores <= 4 ? 0.7 : 1;
}

/**
 * The film: one continuous three.js world, directed by scroll. Sections build their part of the
 * world and update it each frame; the director places the camera; the cursor adds a sprung,
 * handheld parallax on top.
 */
export class Film {
  private ctx!: Ctx;
  private composer!: EffectComposer;
  private bloom!: UnrealBloomPass;
  private director!: Director;
  private sections: Section[] = [];
  private raf = 0;
  private last = 0;
  private sSmooth = 0;
  private fix: number | null = null;
  private stirRaw = 0;
  private mouse = { x: 0, y: 0 };
  private cam = { x: 0, y: 0, vx: 0, vy: 0 };
  private place: Place | null = null;
  private disposed = false;
  private tmp = V();
  private rightV = V();
  private upV = V();
  private cleanup: (() => void)[] = [];
  private blocks!: { arrival: HTMLElement; hint: HTMLElement; layer: HTMLElement };

  constructor(private opts: FilmOptions) {}

  async init() {
    const { canvas, root, labels } = this.opts;
    const W = window.innerWidth, H = window.innerHeight;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(W, H);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050507);
    scene.environment = environment(renderer);
    const camera = new THREE.PerspectiveCamera(30, W / H, 0.05, 500);
    this.ctx = { scene, camera, renderer, root, labels, u: makeShared(W, H, renderer.getPixelRatio()), quality: qualityFor(), W, H };
    const ctx = this.ctx;

    // far stars, and dust drifting through the whole set
    points(ctx, 2200, () => V(gauss(), gauss(), gauss()).normalize().multiplyScalar(120 + R() * 40).add(V(8, 0, -8)), () => {
      const w = 0.5 + R() * 0.5, cool = R() < 0.5;
      return [cool ? 0.75 * w : 0.9 * w, cool ? 0.82 * w : 0.85 * w, w];
    }, () => 0.6 + R(), 0);
    points(ctx, 26000, () => V(-8 + R() * 34, gauss() * 5, 6 - R() * 32), () => (R() < 0.7 ? emberAt(0.2 + R() * 0.6) : COOL).map((v) => v * 0.2), () => 0.025 + R() * 0.06);

    const fig = await loadFigure();
    if (this.disposed) return;
    const orbGeo = blobGeometry(9, 0.17), planetGeo = blobGeometry(21, 0.17);
    const being = buildBeing(ctx, fig, orbGeo, planetGeo);
    this.sections.push(being, buildThink(ctx, being, orbGeo, planetGeo));

    const keys: Key[] = [...firstHalfKeys()];
    this.director = new Director(keys);

    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.62, 0.55, 0.38);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.blocks = { arrival: block(ctx, "arrival"), hint: block(ctx, "hint"), layer: block(ctx, "layer") };
    this.bindInput();
    const q = new URLSearchParams(location.search);
    if (q.has("s")) this.fix = +q.get("s")!;
    this.sSmooth = this.fix ?? this.progress();
    this.last = performance.now();
    this.opts.onReady?.();
    this.raf = requestAnimationFrame(this.tick);
  }

  private progress() {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    return filmT(window.scrollY / max || 0);
  }

  private bindInput() {
    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1, ny = -((e.clientY / window.innerHeight) * 2 - 1);
      this.stirRaw += Math.hypot(nx - this.mouse.x, ny - this.mouse.y);
      this.mouse.x = nx;
      this.mouse.y = ny;
      this.ctx.u.CUR.uActive.value = 1;
    };
    let rt = 0;
    const onResize = () => {
      clearTimeout(rt);
      rt = window.setTimeout(() => {
        const W = window.innerWidth, H = window.innerHeight, c = this.ctx;
        c.W = W;
        c.H = H;
        c.renderer.setSize(W, H);
        this.composer.setSize(W, H);
        c.camera.aspect = W / H;
        c.camera.updateProjectionMatrix();
        c.u.SCALE.value = (c.renderer.getPixelRatio() * H) / 900;
        c.u.CUR.uAspect.value = W / H;
      }, 150);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", onResize);
    this.cleanup.push(() => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
    });
  }

  /** Scroll the page to a section. */
  goTo(p: Place) {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo({ top: scrollFor(PLACE_AT[p]) * max, behavior: "smooth" });
  }

  private tick = (now: number) => {
    if (this.disposed) return;
    const ctx = this.ctx, u = ctx.u;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    u.TIME.value = now / 1000;
    const target = this.progress();
    this.sSmooth = this.fix ?? this.sSmooth + (target - this.sSmooth) * (1 - Math.exp(-dt * 2.2));
    const GG = this.sSmooth, G = Math.min(1, GG / OS), s = Math.min(1, G / A_SPAN);
    const sh = this.director.shot(GG);

    // the cursor spring: the camera orbits its focus, near layers swing one way and far ones the other
    const cam = this.cam, m = this.mouse, STIFF = 7.5, DAMP = 2 * Math.sqrt(STIFF) * 0.82;
    cam.vx += (STIFF * (m.x - cam.x) - DAMP * cam.vx) * dt;
    cam.x += cam.vx * dt;
    cam.vy += (STIFF * (m.y - cam.y) - DAMP * cam.vy) * dt;
    cam.y += cam.vy * dt;
    const calm = 0.3 + 0.7 * smooth(0.03, 0.09, G); // Arrival holds still; the rest of the film swings
    const f: Frame = { dt, time: u.TIME.value, GG, G, s, cam, mouse: m, calm, fixed: this.fix !== null };
    for (const sec of this.sections) sec.shot?.(f, sh);

    const camera = ctx.camera;
    camera.position.copy(sh.pos);
    camera.up.set(0, 1, 0);
    camera.lookAt(sh.tgt);
    camera.updateMatrixWorld(true);
    this.rightV.setFromMatrixColumn(camera.matrixWorld, 0);
    this.upV.setFromMatrixColumn(camera.matrixWorld, 1);
    const k = Math.min(3.4, sh.pos.distanceTo(sh.tgt) * 0.2) * calm;
    camera.position.addScaledVector(this.rightV, cam.x * k).addScaledVector(this.upV, cam.y * k * 0.65);
    camera.lookAt(this.tmp.copy(sh.tgt).addScaledVector(this.rightV, cam.x * k * 0.14).addScaledVector(this.upV, cam.y * k * 0.1));
    camera.rotateZ(sh.roll - cam.vx * 0.028 * calm);
    camera.fov = sh.fov;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    u.FOCUS.value = sh.pos.distanceTo(sh.tgt);
    u.CUR.uMouse.value.lerp(new THREE.Vector2(m.x, m.y), 1 - Math.exp(-dt * 10));
    u.CUR.uStir.value += (Math.min(1.6, (this.stirRaw / Math.max(dt, 1e-3)) * 0.12) - u.CUR.uStir.value) * (1 - Math.exp(-dt * 3));
    this.stirRaw = 0;

    for (const sec of this.sections) sec.update(f);

    // words on the first screen, and the text layer drifting against the camera
    this.blocks.arrival.style.opacity = String(1 - smooth(0.02, 0.07, s));
    this.blocks.hint.style.opacity = String(1 - smooth(0.01, 0.05, s));
    this.blocks.layer.style.transform = `translate(${(-cam.x * 22 * calm).toFixed(1)}px, ${(cam.y * 14 * calm).toFixed(1)}px)`;

    const here = placeAt(GG, G);
    if (here !== this.place) {
      this.place = here;
      this.opts.onPlace?.(here);
    }

    this.composer.render();
    this.raf = requestAnimationFrame(this.tick);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    for (const c of this.cleanup) c();
    if (!this.ctx) return;
    this.ctx.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose?.();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose?.();
    });
    this.composer?.dispose();
    this.ctx.renderer.dispose();
  }
}

export { PLACES };
