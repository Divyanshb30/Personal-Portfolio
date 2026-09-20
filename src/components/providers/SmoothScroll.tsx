"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { film, updateScroll, setPointer } from "@/lib/scroll";

export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const lenis = new Lenis({
      lerp: reduce ? 1 : 0.08,
      smoothWheel: !reduce,
      wheelMultiplier: 1,
    });
    film.lenis = lenis;

    lenis.on("scroll", (e: { progress: number; velocity: number }) => {
      updateScroll(e.progress ?? 0, e.velocity ?? 0);
      ScrollTrigger.update();
    });

    // debug handle (harmless): drive the film reliably during verification
    (window as unknown as { __film?: typeof film }).__film = film;

    const ticker = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    const onPointer = (ev: PointerEvent) => {
      setPointer(
        (ev.clientX / window.innerWidth) * 2 - 1,
        (ev.clientY / window.innerHeight) * 2 - 1,
        true
      );
    };
    const onLeave = () => setPointer(film.px, film.py, false);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerout", onLeave, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerout", onLeave);
      gsap.ticker.remove(ticker);
      lenis.destroy();
      film.lenis = null;
    };
  }, []);

  return <>{children}</>;
}
