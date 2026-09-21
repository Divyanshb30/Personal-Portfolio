"use client";

import { useEffect, useRef } from "react";
import { CHAPTERS, CHAPTER_LABEL, chapterAt, goTo, film, type Chapter } from "@/lib/scroll";

/**
 * A recessive chapter index down the right edge. Marks the current chapter and
 * jumps on click (reuses goTo / Lenis). No bar chrome — the interface defers to
 * the world. Current chapter is tracked via RAF (no per-frame re-render).
 */
export default function Nav() {
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    let last = "";
    const loop = () => {
      const c = chapterAt(film.progress);
      if (c !== last) {
        last = c;
        CHAPTERS.forEach((ch, i) => {
          const el = items.current[i];
          if (el) el.dataset.active = ch === c ? "1" : "0";
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <nav className="pointer-events-none fixed inset-x-0 top-5 z-[60] hidden justify-center md:flex">
      <div className="pointer-events-auto flex items-center gap-4">
        {CHAPTERS.map((ch: Chapter, i) => (
          <button
            key={ch}
            ref={(el) => {
              items.current[i] = el;
            }}
            data-cursor
            data-active="0"
            onClick={() => goTo(ch)}
            aria-label={`Go to ${CHAPTER_LABEL[ch]}`}
            className="group flex flex-col items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.24em] text-faint transition-colors data-[active=1]:text-bone hover:text-smoke"
          >
            <span className="opacity-0 transition-opacity group-data-[active=1]:opacity-100 group-hover:opacity-100">
              {CHAPTER_LABEL[ch]}
            </span>
            <span className="h-[3px] w-[3px] rounded-full bg-current opacity-50 transition-all group-data-[active=1]:opacity-100" />
          </button>
        ))}
      </div>
    </nav>
  );
}
