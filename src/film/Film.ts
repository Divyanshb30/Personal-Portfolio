import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { block, makeShared, type Ctx, type Frame, type Section } from "./ctx";
import { Director, firstHalfKeys, type Key } from "./director";
import { environment, points, blobGeometry } from "./helpers";
import { R, V, emberAt, gauss, smooth, COOL } from "./math";
import { A_SPAN, OS, PLACES, PLACE_AT, filmT, placeAt, scrollFor, type Place } from "./layout";
import { loadFigure } from "./figure";
import { buildBeing } from "./sections/being";
import { buildThink } from "./sections/think";
import { buildProjects } from "./sections/projects";
import { buildStack } from "./sections/stack";
import { buildJourney } from "./sections/journey";
import { buildHorizon } from "./sections/horizon";
import { buildContact } from "./sections/contact";
import { buildAmbient } from "./sections/ambient";
import { buildArrival } from "./sections/arrival";
import { makeOrb } from "./orb";
import { finishPass, maskBloom, photoMask } from "./post";

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
 * Shots are composed for a landscape screen. On narrower screens, open the vertical field of view so
 * more of the horizontal composition survives (fully down to aspect 0.75, then it simply crops).
 */
function fitFov(fov: number, aspect: number) {
  if (aspect >= 1.6) return fov;
  const t = Math.tan(THREE.MathUtils.degToRad(fov / 2)) * 1.6;
  return THREE.MathUtils.radToDeg(2 * Math.atan(t / Math.max(aspect, 0.75)));
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
  private mask!: ReturnType<typeof photoMask>;
  private orb!: ReturnType<typeof makeOrb>;
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
  private blocks!: { arrival: HTMLElement; hint: HTMLElement; layer: HTMLElement; progress: HTMLElement; mood: HTMLElement; brand: HTMLElement };
  /** the orb's mood in the corner: a new one must hold a moment before it shows */
  private moodShown = "";
  private moodCand = "";
  private moodSince = 0;
  private moodSwap = 0;
  /** visitors who ask for less motion get a much gentler cursor camera */
  private still = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /**
   * The film's rhythm: about sixty frames a second on every screen, evenly spaced. An even rate reads as
   * smooth, and one that alternates between one refresh and two reads as stutter, so on a fast screen
   * the film draws every other refresh (60 on 120Hz, 72 on 144Hz, 60 on 240Hz every fourth). Then it
   * holds the sharpest resolution that keeps those frames on time: a step down when they keep missing, a
   * step back up after a quiet spell. Only at the softest does the frame rate halve, as a last resort.
   */
  private pace = { iv: 16.7, ivMin: 1e9, ivN: 0, lastRaf: 0, k: 1, kBase: 1, beat: 0, n: 0, miss: 0, calm: 0, cool: 0, need: 4, raised: 0 };
  private ratios: number[] = [];
  private ratio = 0;
  private mouse2 = new THREE.Vector2();
  private maskOn = false;

  constructor(private opts: FilmOptions) {}

  async init() {
    const { canvas, root, labels } = this.opts;
    const W = window.innerWidth, H = window.innerHeight;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    // the resolutions the film may step between, sharpest first
    const top = Math.min(window.devicePixelRatio, 1.5);
    this.ratios = [top, 1.25, 1, 0.85].filter((r, i) => i === 0 || r < top);
    renderer.setPixelRatio(top);
    // the glass orb sees what is behind it through a copy of the frame; half resolution is plenty for a small orb
    renderer.transmissionResolutionScale = 0.5;
    renderer.setSize(W, H);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050507);
    scene.environment = environment(renderer);
    const camera = new THREE.PerspectiveCamera(30, W / H, 0.05, 500);
    this.ctx = { scene, camera, base: camera.clone(), renderer, root, labels, u: makeShared(W, H, renderer.getPixelRatio()), quality: qualityFor(), W, H };
    const ctx = this.ctx;

    // far stars, and dust drifting through the whole set
    points(ctx, 2200, () => V(gauss(), gauss(), gauss()).normalize().multiplyScalar(120 + R() * 40).add(V(8, 0, -8)), () => {
      const w = 0.5 + R() * 0.5, cool = R() < 0.5;
      return [cool ? 0.75 * w : 0.9 * w, cool ? 0.82 * w : 0.85 * w, w];
    }, () => 0.6 + R(), 0);
    points(ctx, 26000, () => V(-8 + R() * 34, gauss() * 5, 6 - R() * 32), () => (R() < 0.7 ? emberAt(0.2 + R() * 0.6) : COOL).map((v) => v * 0.2), () => 0.025 + R() * 0.06);

    const fig = await loadFigure();
    if (this.disposed) return;
    // (detail 40 keeps their silhouettes true to a fraction of a pixel, at a third of the triangles)
    const orbGeo = blobGeometry(9, 0.17, 0.78, 40), planetGeo = blobGeometry(21, 0.17, 0.78, 40);
    // the sections are built one at a time, with a breath between them, so the page never locks up
    // for long while the film is made (the loading screen's own motion runs on regardless)
    const breathe = () => new Promise((r) => setTimeout(r, 0));
    const being = buildBeing(ctx, fig, orbGeo, planetGeo);
    await breathe();
    // the small glass orb that travels from the work, through the stack, down the river of his years
    const orb = (this.orb = makeOrb(ctx));
    const projects = buildProjects(ctx, planetGeo, orb);
    await breathe();
    const journey = buildJourney(ctx, orb);
    await breathe();
    const horizon = buildHorizon(ctx, journey.gain), contact = buildContact(ctx, orbGeo, orb);
    await breathe();
    const think = buildThink(ctx, being, orbGeo, planetGeo, orb), stack = buildStack(ctx, projects.stars, orb);
    if (this.disposed) return;
    this.sections.push(being, think, projects, stack, journey, horizon, contact);
    // the landing's own life, the ambient moments, then the orb itself, last: it moves once whoever owns it has said where
    this.sections.push(buildArrival(ctx, orb), buildAmbient(ctx, orb, () => journey.focus), orb);

    const keys: Key[] = [...firstHalfKeys(), ...journey.keys, ...horizon.keys, ...contact.keys];
    this.director = new Director(keys);

    // photographs skip the bloom and the filmic grade: a mask of where they are, rendered each frame
    this.mask = photoMask(renderer, scene, camera, ctx.u.TIME);
    this.mask.setSize(W * renderer.getPixelRatio(), H * renderer.getPixelRatio());
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.62, 0.55, 0.38);
    maskBloom(this.bloom, this.mask.texture);
    this.composer.addPass(this.bloom);
    this.composer.addPass(finishPass(this.mask.texture, renderer.toneMappingExposure));

    // Sections hide what their moment doesn't need, and three compiles a shader (and uploads its buffers)
    // the first time something is drawn. So, behind the loading screen, compile every shader and draw
    // the whole world once (the photos' mask too): nothing compiles or uploads mid-scroll. Shaders are
    // compiled as the film draws them, into its own buffers (linear, graded later), not for the screen.
    const warm = (o: THREE.Object3D) => {
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(this.composer.readBuffer);
      const done = renderer.compileAsync(o, camera, scene);
      renderer.setRenderTarget(prev);
      return done;
    };
    ctx.warm = (o) => void warm(o);
    await Promise.all([warm(scene), warm(new THREE.Mesh(new THREE.PlaneGeometry(), this.mask.material))]);
    if (this.disposed) return;
    this.composer.render();
    this.mask.render();
    this.mask.clear();

    this.blocks = { arrival: block(ctx, "arrival"), hint: block(ctx, "hint"), layer: block(ctx, "layer"), progress: block(ctx, "progress"), mood: block(ctx, "mood"), brand: block(ctx, "brand") };
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
      if (!this.ctx) return;
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
        this.mask.setSize(W * c.renderer.getPixelRatio(), H * c.renderer.getPixelRatio());
        c.camera.aspect = W / H;
        c.camera.updateProjectionMatrix();
        c.u.SCALE.value = (c.renderer.getPixelRatio() * H) / 900;
        c.u.CUR.uAspect.value = W / H;
      }, 150);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true }); // a tap also places the cursor
    window.addEventListener("resize", onResize);
    this.cleanup.push(() => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("resize", onResize);
    });
  }

  /** Scroll the page to a section, gliding through everything between. */
  goTo(p: Place) {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo({ top: scrollFor(PLACE_AT[p]) * max, behavior: "smooth" });
  }

  /** Cut straight to a section (behind the loading screen): no glide, and the orb appears where it belongs. */
  jumpTo(p: Place) {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo({ top: scrollFor(PLACE_AT[p]) * max, behavior: "instant" });
    this.sSmooth = this.fix ?? this.progress();
    this.orb?.snap();
  }

  private tick = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.tick);
    if (!this.onBeat(now)) return;
    const ctx = this.ctx, u = ctx.u;
    // (the first frame's timestamp can be a little earlier than the moment we started: never step backwards)
    const since = now - this.last, dt = Math.min(0.05, Math.max(0, since / 1000));
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
    // Arrival holds still; the rest of the film swings (gently, for reduced motion)
    const calm = (0.3 + 0.7 * smooth(0.03, 0.09, G)) * (this.still ? 0.25 : 1);
    const f: Frame = { dt, time: u.TIME.value, GG, G, s, cam, mouse: m, calm, fixed: this.fix !== null };
    for (const sec of this.sections) sec.shot?.(f, sh);

    // the shot as directed, before the cursor sways it (words that must hold still are laid out from this)
    const base = ctx.base;
    base.position.copy(sh.pos);
    base.up.set(0, 1, 0);
    base.lookAt(sh.tgt);
    base.rotateZ(sh.roll);
    base.aspect = ctx.camera.aspect;
    base.fov = fitFov(sh.fov, base.aspect);
    base.updateProjectionMatrix();
    base.updateMatrixWorld(true);

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
    camera.fov = fitFov(sh.fov, camera.aspect);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    u.FOCUS.value = sh.pos.distanceTo(sh.tgt);
    u.CUR.uMouse.value.lerp(this.mouse2.set(m.x, m.y), 1 - Math.exp(-dt * 10));
    u.CUR.uStir.value += (Math.min(1.6, (this.stirRaw / Math.max(dt, 1e-3)) * 0.12) - u.CUR.uStir.value) * (1 - Math.exp(-dt * 3));
    this.stirRaw = 0;

    for (const sec of this.sections) sec.update(f);

    // words on the first screen, and the text layer drifting against the camera
    this.blocks.arrival.style.opacity = String(1 - smooth(0.02, 0.07, s));
    // the small name in the corner waits until the big one has gone
    this.blocks.brand.style.opacity = String(smooth(0.02, 0.07, s));
    this.blocks.hint.style.opacity = String(1 - smooth(0.01, 0.05, s));
    this.blocks.layer.style.transform = `translate(${(-cam.x * 22 * calm).toFixed(1)}px, ${(cam.y * 14 * calm).toFixed(1)}px)`;
    this.blocks.progress.style.transform = `scaleX(${Math.min(1, Math.max(0, window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight))).toFixed(4)})`;

    this.showMood(u.TIME.value);

    const here = placeAt(GG, G);
    if (here !== this.place) {
      this.place = here;
      this.opts.onPlace?.(here);
    }

    // the photographs' mask, only while photographs can be on screen (cleared once when they can't)
    const wantMask = GG > 0.46;
    if (wantMask) this.mask.render();
    else if (this.maskOn) this.mask.clear();
    this.maskOn = wantMask;
    this.composer.render();
    this.govern(since);
  };

  /** Whether this refresh gets a frame. Also learns the display's refresh interval as it goes. */
  private onBeat(now: number) {
    const p = this.pace, raw = now - p.lastRaf;
    p.lastRaf = now;
    // the refresh interval: the shortest gap between callbacks over the last ninety or so
    if (raw > 3 && raw < 60) p.ivMin = Math.min(p.ivMin, raw);
    if (++p.ivN >= 90) {
      if (p.ivMin < 1e9) {
        p.iv = p.ivMin;
        // about sixty a second, evenly: every refresh at 60Hz, every other at 120 or 144Hz, every fourth at 240Hz
        const kb = Math.max(1, Math.floor(1000 / p.iv / 58));
        if (kb !== p.kBase) {
          p.k = kb * (p.k > p.kBase ? 2 : 1);
          p.kBase = kb;
        }
      }
      p.ivMin = 1e9;
      p.ivN = 0;
    }
    if (this.fix !== null) return true;
    return ++p.beat % p.k === 0;
  }

  /**
   * Keeps frames on time. Judged over ~90 frames: if more than one in seven is late, soften the
   * resolution a step (at the softest, halve the frame rate); after a quiet spell, win back the frame
   * rate first, then the sharpness. A step back that fails is tried again only after a longer wait, so
   * the film never flickers between settings.
   */
  private govern(since: number) {
    const p = this.pace;
    if (this.fix !== null || since > 250) return; // a frozen shot, or the tab was away
    if (p.cool > 0) {
      p.cool--;
      return;
    }
    p.n++;
    if (since > p.iv * p.k * 1.4) p.miss++;
    if (p.n < 90) return;
    const rate = p.miss / p.n;
    p.n = p.miss = 0;
    if (p.raised) p.raised = p.raised > 3 ? 0 : p.raised + 1;
    if (rate > 0.15) {
      if (p.raised) p.need = Math.min(40, p.need * 2);
      p.raised = 0;
      p.calm = 0;
      if (this.ratio < this.ratios.length - 1) this.setRatio(this.ratio + 1);
      else if (p.k === p.kBase) p.k = p.kBase * 2;
      p.cool = 60;
    } else if (rate < 0.03) {
      if (++p.calm >= p.need && (p.k > p.kBase || this.ratio > 0)) {
        if (p.k > p.kBase) p.k = p.kBase;
        else this.setRatio(this.ratio - 1);
        p.raised = 1;
        p.calm = 0;
        p.cool = 60;
      }
    } else p.calm = 0;
  }

  /** Render at one of the film's resolutions (0 is the sharpest). */
  private setRatio(i: number) {
    i = Math.max(0, Math.min(this.ratios.length - 1, i));
    if (i === this.ratio) return;
    this.ratio = i;
    const r = this.ratios[i], c = this.ctx;
    c.renderer.setPixelRatio(r);
    this.composer.setPixelRatio(r);
    this.mask.setSize(c.W * r, c.H * r);
    c.u.SCALE.value = (r * c.H) / 900;
  }

  /** The corner line that says how the orb feels: steady for 0.35s before it changes, with a quick crossfade. */
  private showMood(time: number) {
    const m = this.orb?.mood ?? "";
    if (m !== this.moodCand) {
      this.moodCand = m;
      this.moodSince = time;
    }
    if (this.moodCand === this.moodShown || time - this.moodSince < 0.35) return;
    this.moodShown = this.moodCand;
    const el = this.blocks.mood, next = this.moodShown;
    el.style.opacity = "0";
    window.clearTimeout(this.moodSwap);
    this.moodSwap = window.setTimeout(() => {
      if (next) el.textContent = `Orb · ${next}`;
      el.style.opacity = next ? "1" : "0";
    }, 180);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    for (const c of this.cleanup) c();
    window.clearTimeout(this.moodSwap);
    for (const sec of this.sections) sec.dispose?.();
    if (!this.ctx) return;
    this.ctx.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose?.();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose?.();
    });
    this.composer?.dispose();
    this.mask?.dispose();
    this.ctx.renderer.dispose();
  }
}

export { PLACES };
