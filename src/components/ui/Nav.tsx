"use client";

import { useEffect, useRef, useState } from "react";
import { CHAPTERS, CHAPTER_LABEL, chapterAt, goTo, film, type Chapter } from "@/lib/scroll";

/**
 * Minimal nav — the chapters as a single line of markers. The current chapter
 * lights up; clicking one glides the film there (via the AI's goTo). Recessive,
 * single line at desktop; on mobile it collapses to the name + a compact rail.
 */
export default function Nav() {
  const [active, setActive] = useState<Chapter>("identity");
  const last = useRef<Chapter>("identity");

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const c = chapterAt(film.progress);
      if (c !== last.current) {
        last.current = c;
        setActive(c);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-[60] flex items-center justify-between px-6 py-4 md:px-10">
      <button
        data-cursor
        onClick={() => goTo("identity")}
        className="font-mono text-[11px] uppercase tracking-[0.22em] text-bone transition-opacity hover:opacity-70"
      >
        Divyansh Bansal
      </button>

      <nav className="hidden items-center gap-5 md:flex">
        {CHAPTERS.map((c) => (
          <button
            key={c}
            data-cursor
            onClick={() => goTo(c)}
            className={`font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
              active === c ? "text-bone" : "text-faint hover:text-smoke"
            }`}
          >
            {CHAPTER_LABEL[c]}
          </button>
        ))}
      </nav>

      {/* mobile: current chapter + availability dot */}
      <div className="flex items-center gap-2 md:hidden">
        <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-bone)]" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-smoke">{CHAPTER_LABEL[active]}</span>
      </div>
    </header>
  );
}
