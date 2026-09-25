/** What kind of screen the film is on. Everything that changes between a phone and a desktop asks here. */
export type Form = {
  /** portrait: taller than wide (phones held upright, tablets in portrait); the film shoots its vertical cut */
  tall: boolean;
  /** a phone's width (held upright): the chrome moves to the bottom, into the thumb's reach */
  narrow: boolean;
  /** a phone on its side: little height to spare */
  short: boolean;
  /** a finger, not a mouse: no hover, and the camera's sway comes from tilting the device */
  touch: boolean;
};

export const formOf = (W: number, H: number): Form => ({
  tall: W / H < 0.85,
  narrow: W < 760 && H >= 500,
  short: H < 500,
  touch: window.matchMedia("(pointer: coarse)").matches,
});

type Orientable = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

/**
 * Tilt, as a cursor: the device's orientation becomes the camera's handheld sway on a touch screen.
 * Measured against a rest that follows slowly (about four seconds), so however the phone is held is
 * the middle, and a tilt that is held drifts back to rest. ±15° from rest is a full sway of ±0.6.
 * On iOS the page must ask first, from a tap; elsewhere it simply starts. Never with reduced motion.
 */
export function makeTilt(onFirst?: () => void) {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DOE = typeof DeviceOrientationEvent === "undefined" ? null : (DeviceOrientationEvent as Orientable);
  const needsPermission = !!DOE && typeof DOE.requestPermission === "function";
  const raw = { x: 0, y: 0 }, rest = { x: 0, y: 0 }, out = { x: 0, y: 0 };
  let on = false, have = false;

  const onOri = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    // turn the device's axes into the screen's (sideways, left-right tilt is the device's front-back)
    const a = ((screen.orientation?.angle ?? 0) + 360) % 360;
    const [x, y] = a === 90 ? [e.beta, -e.gamma] : a === 270 ? [-e.beta, e.gamma] : a === 180 ? [-e.gamma, -e.beta] : [e.gamma, e.beta];
    raw.x = x;
    raw.y = y;
    if (!have) {
      have = true;
      rest.x = x;
      rest.y = y;
      onFirst?.();
    }
  };
  const start = () => {
    if (on || still || !DOE) return;
    on = true;
    window.addEventListener("deviceorientation", onOri);
  };

  return {
    /** iOS: tilt waits for a tap that asks */
    needsPermission: needsPermission && !still,
    /** a reading has arrived: tilt is steering */
    get active() {
      return on && have;
    },
    /** start listening (where no permission is needed) */
    start() {
      if (!needsPermission) start();
    },
    /** ask (iOS, from a tap), then start; resolves whether tilt is on */
    async request() {
      if (still || !DOE) return false;
      if (!needsPermission) {
        start();
        return true;
      }
      try {
        if ((await DOE.requestPermission!()) !== "granted") return false;
      } catch {
        return false;
      }
      start();
      return true;
    },
    /** this frame's sway, about -0.6..0.6 on each axis; null until tilt has a reading */
    sample(dt: number) {
      if (!have) return null;
      const k = 1 - Math.exp(-dt / 4);
      rest.x += (raw.x - rest.x) * k;
      rest.y += (raw.y - rest.y) * k;
      // tilt right looks right; tip the top away and the camera rises, as through a window
      out.x = Math.max(-1, Math.min(1, (raw.x - rest.x) / 15)) * 0.6;
      out.y = Math.max(-1, Math.min(1, (rest.y - raw.y) / 15)) * 0.6;
      return out;
    },
    dispose() {
      if (on) window.removeEventListener("deviceorientation", onOri);
      on = false;
    },
  };
}
export type Tilt = ReturnType<typeof makeTilt>;
