"use client";

import { useEffect, useRef } from "react";

/** what the ring opens for, besides anything the film itself marks with a pointer */
const HOT = "a, button, [role='button'], .proj, .pill";

/**
 * The cursor, on screens with a mouse: a small ember dot exactly on the pointer, and a hairline ring
 * that trails it on a short spring. Over anything that can be clicked (a link, a button, a project's
 * name, or whatever the film marks with a pointer: the orb, the constellations) the ring opens and
 * fills faintly, and pressing tightens it. The ring runs on its own frame loop, which rests once it
 * has caught up. On a touch screen it is never switched on, and the system's cursor stays.
 */
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const d = dot.current, r = ring.current;
    if (!d || !r) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const html = document.documentElement;
    html.classList.add("film-cursor");

    let x = 0, y = 0, rx = 0, ry = 0, raf = 0, last = 0, shown = false, overHot = false, filmHot = false, hot = false;
    const setHot = () => {
      const h = overHot || filmHot;
      if (h === hot) return;
      hot = h;
      d.classList.toggle("hot", h);
      r.classList.toggle("hot", h);
    };
    const show = (v: boolean) => {
      if (v === shown) return;
      shown = v;
      d.style.opacity = r.style.opacity = v ? "1" : "0";
    };
    const frame = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const k = still ? 1 : 1 - Math.exp(-dt * 18);
      rx += (x - rx) * k;
      ry += (y - ry) * k;
      r.style.transform = `translate3d(${rx.toFixed(2)}px, ${ry.toFixed(2)}px, 0)`;
      if (Math.abs(x - rx) + Math.abs(y - ry) > 0.1) raf = requestAnimationFrame(frame);
      else raf = last = 0;
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      x = e.clientX;
      y = e.clientY;
      if (!shown) {
        // (arriving, the ring starts on the pointer rather than flying in from wherever it was)
        rx = x;
        ry = y;
      }
      d.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      show(true);
      wake();
    };
    const onOver = (e: PointerEvent) => {
      overHot = !!(e.target instanceof Element && e.target.closest(HOT));
      setHot();
    };
    const onDown = () => r.classList.add("down");
    const onUp = () => r.classList.remove("down");
    const onOut = (e: MouseEvent) => {
      if (!e.relatedTarget) show(false);
    };
    // the film marks what it makes clickable on the canvas (the orb, the constellations) by the page's cursor
    const marks = new MutationObserver(() => {
      filmHot = document.body.style.cursor === "pointer";
      setHot();
    });
    marks.observe(document.body, { attributes: true, attributeFilter: ["style"] });

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("mouseout", onOut);
    return () => {
      cancelAnimationFrame(raf);
      marks.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("mouseout", onOut);
      html.classList.remove("film-cursor");
    };
  }, []);

  return (
    <>
      <div ref={ring} className="film-cursor-ring" aria-hidden>
        <svg viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="14.5" />
        </svg>
      </div>
      <div ref={dot} className="film-cursor-dot" aria-hidden>
        <i />
      </div>
    </>
  );
}
