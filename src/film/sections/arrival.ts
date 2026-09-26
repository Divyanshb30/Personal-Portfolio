import type * as THREE from "three";
import type { Ctx, Frame } from "../ctx";
import { block } from "../ctx";
import { points } from "../helpers";
import { COOL, R, V, clamp, emberAt, fbm, gauss, lerp, smooth } from "../math";
import { FIG_X, O1 } from "../layout";
import type { Orb } from "../orb";

// The nudge, keyframed (seconds into it). Where the hint's arrow is (px pushed down): pushed and sliding,
// held, let go (it springs back a little past); the same again, harder.
const back = (t: number, amp: number) => amp * Math.exp(-t * 6) * Math.cos(t * 13);
const easeOut = (e: number, a: number, b: number) => 1 - (1 - clamp((e - a) / (b - a), 0, 1)) ** 3;
function arrowAt(e: number) {
  if (e < 2.2) return 0;
  if (e < 2.75) return 24 * easeOut(e, 2.2, 2.75);
  if (e < 3.5) return 24;
  if (e < 4.95) return back(e - 3.5, 24);
  if (e < 5.3) return 36 * easeOut(e, 4.95, 5.3);
  if (e < 6.0) return 36;
  return back(e - 6.0, 36);
}
// How far above the arrow the orb hovers (px): down onto it, riding it, a wind-up, the slam, then up to look at you.
function hoverAt(e: number) {
  if (e < 1.8) return 44;
  if (e < 2.2) return 44 * (1 - smooth(1.8, 2.2, e));
  if (e < 4.4) return 0;
  if (e < 4.8) return 30 * smooth(4.4, 4.75, e);
  if (e < 4.95) return 30 * (1 - smooth(4.8, 4.95, e));
  if (e < 6.2) return 0;
  return 24 * smooth(6.2, 6.7, e) + 3 * Math.sin(Math.max(0, e - 6.7) * 2.4);
}

/**
 * ARRIVAL, around him. Depth, all behind him: a faint cloud of grains far back, tiny specks nearer.
 * And the orb, small, waiting by his head before it becomes the Think orb. It is curious about the
 * cursor and shy of it up close, reacts when clicked, wanders off to look at him when you go quiet,
 * and when the cursor rests on his name it comes over and reads it. If nobody scrolls, it goes down
 * to the hint and does it itself: pushes the arrow down, again, and looks back at you; scroll, and it
 * dives.
 */
export function buildArrival(ctx: Ctx, orb: Orb) {
  // all of it behind him: a faint cloud made of grains (clumped by noise, no glow) far back, and a
  // sparse field of tiny specks in front of it
  const cloudAt = () => V(-14 + R() * 34, gauss() * 3.5, -16 - R() * 14);
  const cloud = points(
    ctx,
    9000,
    () => {
      for (let k = 0; k < 80; k++) {
        const p = cloudAt();
        if (fbm(p.x * 0.09, p.y * 0.18, p.z * 0.09, 3) > 0.16 + R() * 0.16) return p;
      }
      return cloudAt();
    },
    () => (R() < 0.8 ? emberAt(0.15 + R() * 0.5) : COOL).map((v) => v * 0.7),
    () => 0.1 + R() * 0.1,
    0.25,
  );
  const far = points(ctx, 1400, () => V(-9 + R() * 22, gauss() * 3.2, -3 - R() * 12), () => (R() < 0.75 ? emberAt(0.2 + R() * 0.6) : COOL).map((v) => v * 0.6), () => 0.02 + R() * 0.026, 0.6);

  // home is up beside his head; in the vertical cut (framed close on him) it waits just off his shoulder, by his ear
  const HOME_WIDE = V(FIG_X + 1.4, 1.55, 0.3), HOME_TALL = V(FIG_X + 0.85, 1.75, 0.4), HOME = HOME_WIDE.clone();
  const HIDE = V(FIG_X + 0.3, 0.85, -0.8), PEEK = V(FIG_X + 0.62, 1.05, -0.4);
  const FACE = V(FIG_X - 0.05, 0.45, 0.35), SNIFF = V(FIG_X + 0.3, 0.5, 0.95), OTHER = V(FIG_X - 0.95, 0.35, 0.55);
  const SIZE = 0.13, UPV = V(0, 1, 0), DEG = Math.PI / 180;
  const at = V(), look = V(), tmp = V(), cur = V(), right = V();
  const hud = block(ctx, "hud");
  // the words it reads: where the block, the kicker and the name sit in the text layer. Read from the page
  // only when the screen or the fonts change; the layer's drift with the camera is added each frame
  const layer = block(ctx, "layer"), words = block(ctx, "arrival"), kicker = words.firstElementChild as HTMLElement, name = words.querySelector("h1")!;
  const txt = { l: 0, t: 0, r: 0, b: 0, gap: 0, nl: 0, nr: 0, nt: 0 };
  let sizedAt = 0, sized = false;
  document.fonts?.ready.then(() => (sized = false));
  const measure = () => {
    // the text itself, not its block (on a narrow screen the block runs the full width, over his figure)
    const lr = layer.getBoundingClientRect(), kr = kicker.getBoundingClientRect(), nr = name.getBoundingClientRect(), range = document.createRange();
    range.selectNodeContents(kicker);
    const line = range.getBoundingClientRect();
    range.selectNodeContents(name);
    const letters = range.getBoundingClientRect();
    txt.l = Math.min(line.left, letters.left) - lr.left;
    txt.r = Math.max(line.right, letters.right) - lr.left;
    txt.t = line.top - lr.top;
    txt.b = letters.bottom - lr.top;
    txt.gap = (kr.bottom + nr.top) / 2 - lr.top + 2;
    txt.nl = letters.left - lr.left;
    txt.nr = letters.right - lr.left;
    txt.nt = nr.top - lr.top;
  };
  // only with a mouse: on a touch screen there is no cursor to rest
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const st = {
    mood: "home" as "home" | "shy" | "peek" | "poof" | "sulk" | "wander" | "read" | "nudge" | "dive",
    until: 0,
    clicks: 0,
    lastInput: 0,
    lastMouse: { x: 9, y: 9 },
    lastS: -1,
    poofed: false,
    /** how long the cursor has rested on the words */
    over: 0,
  };

  // the hint's arrow: where it sits (read from the page when a nudge starts or the screen changes), and
  // how far it has been pushed down (px). The svg inside it moves; its box stays put.
  const NUDGE_SIZE = 0.055, NUDGE_END = 12.5;
  const arrow = { el: null as HTMLElement | null, svg: null as SVGElement | null, x: 0, top: 0, key: 0, off: 0, v: 0, loose: false, held: false, want: 0, push: 0, shownOff: 0, shownA: 1 };
  const findArrow = (fresh = false) => {
    if (fresh || !arrow.el || !arrow.el.isConnected) {
      arrow.el = ctx.root.querySelector<HTMLElement>('[data-block="arrow"]');
      arrow.svg = arrow.el?.querySelector("svg") ?? null;
      arrow.key = 0;
    }
    if (!arrow.el || !arrow.svg) return false;
    const key = ctx.W * 1e5 + ctx.H;
    if (arrow.key !== key) {
      const r = arrow.el.getBoundingClientRect();
      if (r.width === 0) return false;
      arrow.x = r.left + r.width / 2;
      // (the stroke starts a pixel into its box)
      arrow.top = r.top + 1;
      arrow.key = key;
    }
    return true;
  };
  /** The arrow, one step: held where the nudge puts it (or wherever the orb's weight pushes it), springing
   *  back when let go, or falling once knocked loose. Its style is written only when it changes. */
  const stepArrow = (dt: number) => {
    if (arrow.loose) {
      arrow.v += 1500 * dt;
      arrow.off = Math.min(90, arrow.off + arrow.v * dt);
    } else if (arrow.held) {
      const next = clamp(Math.max(arrow.want, arrow.push), -8, 44);
      arrow.v = (next - arrow.off) / Math.max(dt, 1e-3);
      arrow.off = next;
    } else if (arrow.off !== 0 || arrow.v !== 0) {
      arrow.v += (-260 * arrow.off - 14 * arrow.v) * dt;
      arrow.off += arrow.v * dt;
      if (Math.abs(arrow.off) < 0.05 && Math.abs(arrow.v) < 1) arrow.off = arrow.v = 0;
    }
    arrow.held = false;
    arrow.push = 0;
    if (!arrow.svg) return;
    const o = Math.round(arrow.off * 10) / 10, a = arrow.loose ? Math.round((1 - smooth(16, 84, arrow.off)) * 100) / 100 : 1;
    if (o !== arrow.shownOff) {
      arrow.svg.style.transform = o ? `translateY(${o}px)` : "";
      arrow.shownOff = o;
    }
    if (a !== arrow.shownA) {
      arrow.svg.style.opacity = a < 1 ? String(a) : "";
      arrow.shownA = a;
    }
  };
  const nudge = { t0: 0, n: 0, next: 0, born: -1, done: false };
  const dive = { at: V(), last: 0 };
  const P = V(), A = V(), down = V();
  /** a screen point (px) at home's depth */
  const atPx = (x: number, y: number, z: number, out: THREE.Vector3) => out.set((x / ctx.W) * 2 - 1, 1 - (y / ctx.H) * 2, z).unproject(ctx.camera);

  const onClick = (e: MouseEvent) => {
    if (e.target !== ctx.renderer.domElement || !orb.visible) return;
    const nx = (e.clientX / ctx.W) * 2 - 1, ny = -((e.clientY / ctx.H) * 2 - 1);
    if (!orb.hit(nx, ny) || st.mood === "poof") return;
    const t = ctx.u.TIME.value, kind = st.clicks++ % 3;
    st.lastInput = t;
    if (kind === 0) {
      // boop: it squashes flat and twirls
      orb.spin(orb.still ? 4 : 14);
      st.mood = "home";
      st.until = t + 0.35;
    } else if (kind === 1) {
      // poof: it bursts into sparks, and gathers itself back a moment later
      orb.burst(orb.pos, 0.8);
      st.mood = "poof";
      st.until = t + 0.7;
      st.poofed = true;
    } else {
      // hop, and a sulk: it turns its back on you for a second
      if (!orb.still) orb.kick(tmp.copy(UPV).multiplyScalar(5));
      st.mood = "sulk";
      st.until = t + 1.6;
    }
  };
  window.addEventListener("click", onClick);

  return {
    dispose() {
      window.removeEventListener("click", onClick);
    },
    update(f: Frame) {
      const { s, G, time, mouse } = f;
      const cam = ctx.camera;
      const here = 1 - smooth(0.03, 0.08, G);
      cloud.gain.value = here;
      cloud.pts.visible = here > 0.001;
      far.gain.value = 0.35 + 0.65 * here;
      hud.style.opacity = String(1 - smooth(0.02, 0.07, s));

      // the arrow: gone with the hint, it is put back where it belongs
      if (s > 0.05 && (arrow.off !== 0 || arrow.loose)) {
        arrow.off = arrow.v = 0;
        arrow.loose = false;
      }
      stepArrow(f.dt);

      // it owns the orb until it has handed itself to the Think orb
      if (s > 0.165) return;
      HOME.copy(ctx.form.tall ? HOME_TALL : HOME_WIDE);
      if (nudge.born < 0) nudge.born = time;
      if (Math.abs(mouse.x - st.lastMouse.x) + Math.abs(mouse.y - st.lastMouse.y) > 0.002 || Math.abs(s - st.lastS) > 1e-5) {
        if (st.mood === "wander") st.mood = "home";
        st.lastInput = time;
      }
      // the first scroll: nobody needs showing any more, and if it was showing, it goes first
      if (st.lastS >= 0 && s > st.lastS + 1e-6) {
        nudge.done = true;
        if (st.mood === "nudge") {
          st.mood = "dive";
          // straight down, past the bottom of the frame, with a shove to start it
          const z = tmp.copy(orb.pos).project(cam).z;
          atPx(arrow.x, ctx.H + 160, z, dive.at);
          down.setFromMatrixColumn(cam.matrixWorld, 1).multiplyScalar(-cam.position.distanceTo(orb.pos) * 0.35);
          orb.kick(down);
          // and the arrow is knocked loose
          arrow.loose = true;
          arrow.v = Math.max(arrow.v, 220);
        }
      }
      if (st.lastS >= 0 && Math.abs(s - st.lastS) > 0.002 * f.dt) dive.last = time;
      st.lastMouse.x = mouse.x;
      st.lastMouse.y = mouse.y;
      st.lastS = s;

      // the hand-off: as the dust peels off him it flies to where the Think orb forms, and goes in
      const go = smooth(0.035, 0.13, s), gone = smooth(0.125, 0.16, s);
      if (go > 0) {
        // (from wherever it went: home, or down where it dove)
        at.copy(st.mood === "dive" ? dive.at : HOME).lerp(O1, go * go * (3 - 2 * go));
        if (s > 0.14 && s < 0.146) orb.burst(O1, 0.9, true);
        orb.drive({ at, size: SIZE * (1 + go * 0.6) * (1 - gone), look: O1, lookAmt: 0.7 * go, pin: 0.25 * go });
        orb.feel("Gathering");
        return;
      }

      // where the cursor is, in the orb's depth
      tmp.copy(orb.visible ? orb.pos : HOME).project(cam);
      const active = ctx.u.CUR.uActive.value > 0;
      const px = active ? Math.hypot(((mouse.x - tmp.x) * ctx.W) / 2, ((mouse.y - tmp.y) * ctx.H) / 2) : 1e9;
      cur.set(mouse.x, mouse.y, tmp.z).unproject(cam);
      const restless = ctx.u.CUR.uStir.value > 0.05, depth = tmp.z;

      // is the cursor resting on the words? (they drift with the camera, just as the film moves them this frame)
      const tx = f.layerX, ty = f.layerY;
      if (fine && s < 0.02 && (!sized || sizedAt !== ctx.W * 1e5 + ctx.H)) {
        measure();
        sizedAt = ctx.W * 1e5 + ctx.H;
        sized = true;
      }
      const mx = (mouse.x * 0.5 + 0.5) * ctx.W, my = (0.5 - mouse.y * 0.5) * ctx.H;
      const onWords = fine && active && s < 0.02 && sized && mx > txt.l + tx - 24 && mx < txt.r + tx + 24 && my > txt.t + ty - 24 && my < txt.b + ty + 24;
      // the rest counts only while the cursor is calm there, and is forgotten the moment it leaves
      st.over = onWords ? st.over + (ctx.u.CUR.uStir.value < 0.12 ? f.dt : 0) : 0;

      // mood changes (they wait while the cursor has it playing a game: it comes back to where it was)
      // resting on his name, it comes over to read it; leaving the words sends it home, and only a dart scares it off
      // (only a cursor coming at it scares it: one going round it starts a game, and one leaving in a hurry
      // it chases)
      const pt = orb.pointer, darting = pt.away < -0.6 * pt.speed && pt.speed > 150 && Math.abs(pt.turn) < 2.4;
      if (orb.play) {
        // (playing: its moods wait)
      } else if ((st.mood === "home" || st.mood === "wander") && st.over > 0.25 && time > st.until) {
        st.mood = "read";
      } else if (st.mood === "read" && st.over === 0) {
        st.mood = "home";
      } else if (st.mood === "read" && px < 90 && ctx.u.CUR.uStir.value > 0.3 && darting) {
        st.mood = "shy";
        st.until = time + 1.3;
      }
      // a sudden cursor up close scares it behind his head; a slow one it lets come near (and be clicked)
      else if (st.mood === "home" && px < 90 && restless && darting && time > st.until) {
        st.mood = "shy";
        st.until = time + 1.3;
      } else if (st.mood === "shy" && time > st.until) {
        st.mood = "peek";
        st.until = time + 1.6;
      } else if ((st.mood === "peek" || st.mood === "sulk") && time > st.until) {
        st.mood = "home";
      } else if (st.mood === "poof" && time > st.until) {
        st.mood = "home";
        orb.burst(orb.pos, 0.8, true);
      }
      // nobody has scrolled: it goes down to the hint and shows them (a few times at most, and never again once they
      // have). Only in a wide frame: on a phone the hint sits on the dock, under the shade that keeps the words legible
      else if (
        st.mood === "home" &&
        !orb.still &&
        !ctx.form.tall &&
        !ctx.form.narrow &&
        !ctx.form.short &&
        !nudge.done &&
        nudge.n < 3 &&
        s < 0.002 &&
        time > nudge.next &&
        time - nudge.born > 5.5 &&
        time - st.lastInput > 2 &&
        orb.pointer.px > 200 &&
        !orb.quirk &&
        findArrow(true)
      ) {
        st.mood = "nudge";
        nudge.t0 = time;
        nudge.n++;
        nudge.next = time + NUDGE_END + 30;
      } else if (st.mood === "nudge" && time - nudge.t0 > NUDGE_END) {
        st.mood = "home";
        st.lastInput = time;
      }
      // dove and nobody followed far: it comes back up (and the arrow with it)
      else if (st.mood === "dive" && time - dive.last > 1.2) {
        st.mood = "home";
        st.lastInput = time;
        arrow.loose = false;
        arrow.off = -10;
        arrow.v = 0;
      } else if (st.mood === "home" && !orb.still && time - st.lastInput > 6) {
        st.mood = "wander";
        st.until = time;
      }

      let size = SIZE, lookAmt = 0.5, pin = 0, mood = "Watching";
      look.copy(cam.position);
      switch (st.mood) {
        case "home": {
          at.copy(HOME).add(tmp.set(Math.sin(time * 0.9) * 0.05, Math.sin(time * 1.3) * 0.06, 0));
          // curious: it creeps toward a cursor that lingers nearby, on a short leash
          if (px < 300 && !restless) {
            const lean = 0.3 * smooth(300, 110, px);
            at.lerp(cur, lean);
            if (at.distanceTo(HOME) > 0.6) at.sub(HOME).setLength(0.6).add(HOME);
            look.copy(cur);
            lookAmt = 0.9;
            mood = "Curious";
          }
          if (st.poofed && time < st.until + 0.3) orb.squash(0.35, cam.position.clone().sub(orb.pos));
          if (time < st.until && st.clicks % 3 === 1) {
            orb.squash(-0.45, tmp.copy(cam.position).sub(orb.pos));
            mood = "Startled";
          }
          break;
        }
        case "read": {
          // it skims the gap between the kicker and his name, just ahead of the cursor, at its own depth,
          // looking down at the letters
          const x = clamp(mx + 14, txt.nl + tx + 16, txt.nr + tx - 16), y = txt.gap + ty;
          at.set((x / ctx.W) * 2 - 1, 1 - (y / ctx.H) * 2, depth).unproject(cam);
          look.set((x / ctx.W) * 2 - 1, 1 - ((txt.nt + ty + 30) / ctx.H) * 2, depth).unproject(cam);
          size = 0.12;
          lookAmt = 0.95;
          mood = "Reading";
          break;
        }
        case "shy":
          // up close it darts behind his head
          at.copy(HIDE);
          size = SIZE * 0.9;
          look.copy(cur);
          lookAmt = 0.3;
          mood = "Shy";
          break;
        case "peek":
          // and peeks back out at you
          at.copy(PEEK);
          look.copy(cur);
          lookAmt = 1;
          if (time - (st.until - 1.6) < 0.2) orb.squash(0.2, UPV);
          mood = "Peeking";
          break;
        case "poof":
          at.copy(orb.pos);
          size = 0;
          pin = 1;
          mood = "Startled";
          break;
        case "sulk":
          // turned away from you
          at.copy(HOME);
          right.setFromMatrixColumn(cam.matrixWorld, 0);
          look.copy(orb.pos).addScaledVector(right, 2).add(tmp.set(0, 0.3, -1));
          lookAmt = 1;
          mood = "Sulking";
          break;
        case "nudge": {
          // it doesn't point at the hint: it goes down and does it. Touches the arrow, pushes it down and
          // follows it; nothing happens. Looks round. Tries again, harder. Then looks back at you.
          const e = time - nudge.t0, zH = tmp.copy(HOME).project(cam).z, ao = arrowAt(e), hv = hoverAt(e);
          const wpp = (2 * cam.position.distanceTo(HOME) * Math.tan(DEG * cam.fov * 0.5)) / ctx.H;
          const rpx = Math.max(orb.size, 0.02) / wpp;
          atPx(arrow.x, arrow.top + ao - rpx - hv, zH, P);
          atPx(arrow.x, arrow.top + ao + 8, zH, A);
          // it floats over from home, in a soft arc, and settles on the arrow
          if (e < 1.8) {
            const u = smooth(0, 1.8, e);
            at.copy(HOME).lerp(P, u);
            at.y += Math.sin(Math.PI * u) * 0.25;
          } else at.copy(P);
          size = lerp(SIZE, NUDGE_SIZE, smooth(0, 1.6, e));
          pin = 0.35 * smooth(1.6, 2.0, e);
          // the arrow is where the beat says, or wherever the orb's weight has pushed it
          arrow.held = true;
          arrow.want = ao;
          if ((e > 2.2 && e < 3.5) || (e > 4.9 && e < 6.0)) arrow.push = tmp.copy(orb.pos).project(cam).y * -0.5 * ctx.H + ctx.H / 2 + rpx - arrow.top;
          // the touches: a squash against it, and a harder one the second time
          if (e > 2.2 && e < 2.34) orb.squash(-0.3, UPV);
          if (e > 4.95 && e < 5.1) orb.squash(-0.5, UPV);
          if (e > 6.3 && e < 6.45) orb.squash(0.2, UPV);
          // its eyes: on the arrow; then round about (nothing happened?); then on you, with a glance down now and then
          right.setFromMatrixColumn(cam.matrixWorld, 0);
          look.copy(A);
          lookAmt = 0.9;
          mood = e < 1.8 ? "Curious" : "Nudging";
          if (e > 3.55 && e < 4.4) {
            look.copy(orb.pos).addScaledVector(right, e < 3.95 ? -1.5 : 1.5).add(tmp.set(0, 0.15, 0));
            lookAmt = 1;
            mood = "Puzzled";
          } else if (e > 6.2) {
            // are you coming?
            mood = "Waiting";
            if (!((e > 8.0 && e < 8.5) || (e > 10.2 && e < 10.7))) {
              look.copy(cam.position);
              lookAmt = 1;
            }
          }
          break;
        }
        case "dive":
          // it went down, so you'd follow: it waits below the frame while you do
          at.copy(dive.at);
          size = NUDGE_SIZE;
          look.copy(dive.at);
          lookAmt = 0.8;
          mood = "Diving";
          break;
        case "wander": {
          // bored: it goes to look at him up close, sniffs, drifts round the other side, and back
          const e = time - st.until, loop = e % 14;
          if (loop < 3) at.copy(HOME).lerp(SNIFF, smooth(0, 3, loop));
          else if (loop < 6) {
            at.copy(SNIFF).add(tmp.set(0, Math.sin(loop * 7) * 0.03, 0));
            if (Math.sin(loop * 9) > 0.7) orb.squash(-0.18, tmp.copy(FACE).sub(orb.pos));
          } else if (loop < 9.5) at.copy(SNIFF).lerp(OTHER, smooth(6, 9.5, loop));
          else at.copy(OTHER).lerp(HOME, smooth(9.5, 14, loop));
          look.copy(loop < 6 ? FACE : at);
          lookAmt = loop < 6 ? 1 : 0.4;
          mood = "Bored";
          break;
        }
      }
      // (reading, it holds its line above the letters rather than leaning down to the cursor on them; showing
      // you how to scroll, it pays the cursor no mind; at home or wandering, it may get up to something)
      const performing = st.mood === "read" || st.mood === "nudge" || st.mood === "dive";
      orb.drive({ at, size, look, lookAmt, pin, cursor: performing ? 0 : 1, free: st.mood === "home" || st.mood === "wander" });
      orb.feel(mood);
      // a pointer over it, so it reads as something you can poke
      if (orb.hit(mouse.x, mouse.y)) document.body.style.cursor = "pointer";
    },
  };
}
