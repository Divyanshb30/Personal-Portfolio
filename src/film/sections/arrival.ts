import type { Ctx, Frame } from "../ctx";
import { block } from "../ctx";
import { points } from "../helpers";
import { COOL, R, V, emberAt, gauss, smooth } from "../math";
import { FIG_X, O1 } from "../layout";
import type { Orb } from "../orb";

/**
 * ARRIVAL, around him. Depth: big soft motes drift between you and him, fine specks far behind.
 * And the orb, small, waiting by his head before it becomes the Think orb. It is curious about the
 * cursor and shy of it up close, reacts when clicked, and wanders off to look at him when you go quiet.
 */
export function buildArrival(ctx: Ctx, orb: Orb) {
  // near motes (they fall far out of focus: soft bokeh) and fine specks far behind him
  const near = points(ctx, 130, () => V(-3.2 + R() * 7.6, gauss() * 1.1, 2.4 + R() * 3.8), () => emberAt(0.25 + R() * 0.5).map((v) => v * 0.24), () => 0.16 + R() * 0.3, 0.5);
  const far = points(ctx, 1600, () => V(-9 + R() * 22, gauss() * 3.2, -3 - R() * 12), () => (R() < 0.75 ? emberAt(0.2 + R() * 0.6) : COOL).map((v) => v * 0.42), () => 0.02 + R() * 0.035, 0.6);

  // home is up beside his head; on a tall, narrow screen (where his right side is cropped) it waits above him
  const HOME_WIDE = V(FIG_X + 1.4, 1.55, 0.3), HOME_TALL = V(FIG_X - 0.15, 2.6, 0.3), HOME = HOME_WIDE.clone();
  const HIDE = V(FIG_X + 0.3, 0.85, -0.8), PEEK = V(FIG_X + 0.62, 1.05, -0.4);
  const FACE = V(FIG_X - 0.05, 0.45, 0.35), SNIFF = V(FIG_X + 0.3, 0.5, 0.95), OTHER = V(FIG_X - 0.95, 0.35, 0.55);
  const SIZE = 0.13, UPV = V(0, 1, 0);
  const at = V(), look = V(), tmp = V(), cur = V(), right = V();
  const hud = block(ctx, "hud");
  const st = {
    mood: "home" as "home" | "shy" | "peek" | "poof" | "sulk" | "wander",
    until: 0,
    clicks: 0,
    lastInput: 0,
    lastMouse: { x: 9, y: 9 },
    lastS: -1,
    poofed: false,
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
      near.gain.value = here;
      far.gain.value = 0.35 + 0.65 * here;
      near.pts.visible = here > 0.001;
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
      const restless = ctx.u.CUR.uStir.value > 0.05;

      // mood changes
      // a sudden cursor up close scares it behind his head; a slow one it lets come near (and be clicked)
      if (st.mood === "home" && px < 90 && restless && time > st.until) {
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
      orb.drive({ at, size, look, lookAmt, pin });
      orb.feel(mood);
      // a pointer over it, so it reads as something you can poke
      if (orb.hit(mouse.x, mouse.y)) document.body.style.cursor = "pointer";
    },
  };
}
