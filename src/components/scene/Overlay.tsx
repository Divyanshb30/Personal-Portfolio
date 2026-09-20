"use client";

import { useEffect, useRef } from "react";
import { film, CHAPTERS } from "@/lib/scroll";
import { profile, regions } from "@/lib/content";

/**
 * The DOM layer over the film. Provides scroll length (chapter anchors) and the
 * minimal, recessive typography — arrival identity and the contact close —
 * toggled by film progress via RAF (never React state per frame). Interface
 * defers to the world (Lusion principle).
 */
export default function Overlay() {
  const arrival = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const contact = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const p = film.progress;
      // arrival identity: present 0 -> fades out by macro (0.085)
      if (arrival.current) {
        const o = 1 - smooth(p, 0.045, 0.085);
        arrival.current.style.opacity = String(o);
        arrival.current.style.transform = `translateY(${(1 - o) * -18}px)`;
      }
      if (hint.current) hint.current.style.opacity = String((1 - smooth(p, 0.02, 0.06)) * 0.7);
      // contact close: appears near the end
      if (contact.current) {
        const o = smooth(p, 0.95, 0.99);
        contact.current.style.opacity = String(o);
        contact.current.style.pointerEvents = o > 0.5 ? "auto" : "none";
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      {/* scroll length — one anchor per chapter */}
      <div className="relative z-10">
        {CHAPTERS.map((c) => (
          <section key={c} id={c} className="h-[120svh]" aria-hidden />
        ))}
        <div className="h-[40svh]" aria-hidden />
      </div>

      {/* 01 — arrival identity (beside/below the figure, never over the face) */}
      <div ref={arrival} className="pointer-events-none fixed bottom-[12%] left-6 z-20 md:left-14">
        <h1 className="font-display text-[10vw] font-semibold leading-[0.86] tracking-[-0.03em] text-bone md:text-[5.4rem]">
          Divyansh
          <br />
          Bansal
        </h1>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.34em] text-smoke">AI · LLM Engineer</p>
        <p className="mt-2 max-w-[24ch] font-body text-[13px] leading-relaxed text-faint">
          I build intelligent systems.
        </p>
      </div>

      {/* discovery hint — diegetic, not a HUD */}
      <div ref={hint} className="pointer-events-none fixed bottom-8 left-1/2 z-20 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.4em] text-faint">
        move · explore
      </div>

      {/* 08 — contact close */}
      <div ref={contact} className="fixed inset-0 z-20 flex flex-col items-center justify-center gap-8 px-6 text-center opacity-0">
        <h2 className="max-w-[16ch] font-display text-[8vw] font-semibold leading-[0.92] tracking-[-0.03em] text-bone md:text-[4.4rem]">
          Let&rsquo;s build something intelligent.
        </h2>
        <div className="flex flex-col items-center gap-4">
          <a href={`mailto:${profile.email}`} data-cursor className="border border-hair px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-bone transition-colors hover:border-bone">
            {profile.email}
          </a>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-smoke">
            <a href={profile.socials.github} target="_blank" rel="noopener noreferrer" data-cursor className="link-underline hover:text-bone">GitHub</a>
            <a href={profile.socials.linkedin} target="_blank" rel="noopener noreferrer" data-cursor className="link-underline hover:text-bone">LinkedIn</a>
            <span className="text-faint">Résumé</span>
            {regions.map((r) => (
              <a key={r.code} href={r.file} target="_blank" rel="noopener noreferrer" data-cursor className="link-underline text-smoke hover:text-bone">
                {r.code}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/** 0 below a, 1 above b, smooth between. */
function smooth(x: number, a: number, b: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
