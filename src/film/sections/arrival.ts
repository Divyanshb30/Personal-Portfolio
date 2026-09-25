import type { Ctx, Frame } from "../ctx";
import { block } from "../ctx";
import { points } from "../helpers";
import { COOL, R, V, clamp, emberAt, fbm, gauss, smooth } from "../math";
import { FIG_X, O1 } from "../layout";
import type { Orb } from "../orb";

/**
 * ARRIVAL, around him. Depth, all behind him: a faint cloud of grains far back, tiny specks nearer.
 * And the orb, small, waiting by his head before it becomes the Think orb. It is curious about the
 * cursor and shy of it up close, reacts when clicked, wanders off to look at him when you go quiet,
 * and when the cursor rests on his name it comes over and reads it.
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

  // home is up beside his head; on a tall, narrow screen (where his right side is cropped) it waits above him
  const HOME_WIDE = V(FIG_X + 1.4, 1.55, 0.3), HOME_TALL = V(FIG_X - 0.15, 2.6, 0.3), HOME = HOME_WIDE.clone();
  const HIDE = V(FIG_X + 0.3, 0.85, -0.8), PEEK = V(FIG_X + 0.62, 1.05, -0.4);
  const FACE = V(FIG_X - 0.05, 0.45, 0.35), SNIFF = V(FIG_X + 0.3, 0.5, 0.95), OTHER = V(FIG_X - 0.95, 0.35, 0.55);
  const SIZE = 0.13, UPV = V(0, 1, 0);
  const at = V(), look = V(), tmp = V(), cur = V(), right = V();
  const hud = block(ctx, "hud");
  // the words it reads: where the block, the kicker and the name sit in the text layer. Read from the page
  // only when the screen or the fonts change; the layer's drift with the camera is added each frame
  const layer = block(ctx, "layer"), words = block(ctx, "arrival"), kicker = words.firstElementChild as HTMLElement, name = words.querySelector("h1")!;
  const txt = { l: 0, t: 0, r: 0, b: 0, gap: 0, nl: 0, nr: 0, nt: 0 };
  let sizedAt = 0, sized = false;
  document.fonts?.ready.then(() => (sized = false));
  const measure = () => {
    const lr = layer.getBoundingClientRect(), br = words.getBoundingClientRect(), kr = kicker.getBoundingClientRect();
    const nr = name.getBoundingClientRect(), range = document.createRange();
    range.selectNodeContents(name);
    const letters = range.getBoundingClientRect();
    txt.l = br.left - lr.left;
    txt.r = br.right - lr.left;
    txt.t = br.top - lr.top;
    txt.b = br.bottom - lr.top;
    txt.gap = (kr.bottom + nr.top) / 2 - lr.top + 2;
    txt.nl = letters.left - lr.left;
    txt.nr = letters.right - lr.left;
    txt.nt = nr.top - lr.top;
  };
  // only with a mouse: on a touch screen there is no cursor to rest
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const st = {
    mood: "home" as "home" | "shy" | "peek" | "poof" | "sulk" | "wander" | "read",
    until: 0,
    clicks: 0,
    lastInput: 0,
    lastMouse: { x: 9, y: 9 },
    lastS: -1,
    poofed: false,
    /** how long the cursor has rested on the words */
    over: 0,
  };

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

      // it owns the orb until it has handed itself to the Think orb
      if (s > 0.165) return;
      HOME.copy(ctx.W / ctx.H < 0.9 ? HOME_TALL : HOME_WIDE);
      if (Math.abs(mouse.x - st.lastMouse.x) + Math.abs(mouse.y - st.lastMouse.y) > 0.002 || Math.abs(s - st.lastS) > 1e-5) {
        if (st.mood === "wander") st.mood = "home";
        st.lastInput = time;
      }
      st.lastMouse.x = mouse.x;
      st.lastMouse.y = mouse.y;
      st.lastS = s;

      // the hand-off: as the dust peels off him it flies to where the Think orb forms, and goes in
      const go = smooth(0.035, 0.13, s), gone = smooth(0.125, 0.16, s);
      if (go > 0) {
        at.copy(HOME).lerp(O1, go * go * (3 - 2 * go));
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
      const tx = -f.cam.x * 22 * f.calm, ty = f.cam.y * 14 * f.calm;
      if (fine && s < 0.02 && (!sized || sizedAt !== ctx.W * 1e5 + ctx.H)) {
        measure();
        sizedAt = ctx.W * 1e5 + ctx.H;
        sized = true;
      }
      const mx = (mouse.x * 0.5 + 0.5) * ctx.W, my = (0.5 - mouse.y * 0.5) * ctx.H;
      const onWords = fine && active && s < 0.02 && sized && mx > txt.l + tx - 24 && mx < txt.r + tx + 24 && my > txt.t + ty - 24 && my < txt.b + ty + 24;
      // the rest counts only while the cursor is calm there, and is forgotten the moment it leaves
      st.over = onWords ? st.over + (ctx.u.CUR.uStir.value < 0.12 ? f.dt : 0) : 0;

      // mood changes
      // resting on his name, it comes over to read it; leaving the words sends it home, and only a dart scares it off
      if ((st.mood === "home" || st.mood === "wander") && st.over > 0.25 && time > st.until) {
        st.mood = "read";
      } else if (st.mood === "read" && st.over === 0) {
        st.mood = "home";
      } else if (st.mood === "read" && px < 90 && ctx.u.CUR.uStir.value > 0.3) {
        st.mood = "shy";
        st.until = time + 1.3;
      }
      // a sudden cursor up close scares it behind his head; a slow one it lets come near (and be clicked)
      else if (st.mood === "home" && px < 90 && restless && time > st.until) {
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
      // (reading, it holds its line above the letters rather than leaning down to the cursor on them)
      orb.drive({ at, size, look, lookAmt, pin, cursor: st.mood === "read" ? 0 : 1 });
      orb.feel(mood);
      // a pointer over it, so it reads as something you can poke
      if (orb.hit(mouse.x, mouse.y)) document.body.style.cursor = "pointer";
    },
  };
}
