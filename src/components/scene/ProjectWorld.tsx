"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSelected, selectProject } from "@/lib/director";
import { builds } from "@/lib/content";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The project world — one cinematic composition per project (never a page or a
 * card grid). Opens when a project is selected in the universe; the focused
 * signature swells behind it in 3D. Back / Esc / click-scrim returns.
 */
export default function ProjectWorld() {
  const id = useSelected();
  const reduce = useReducedMotion();
  const b = builds.find((x) => x.id === id);

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") selectProject(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id]);

  return (
    <AnimatePresence>
      {b && (
        <motion.div
          key={b.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="fixed inset-0 z-40"
        >
          {/* scrim — darkens the left so the composition reads; click to exit */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-void via-void/80 to-void/10"
            onClick={() => selectProject(null)}
          />

          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -16 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="relative flex h-full max-w-[46ch] flex-col justify-center gap-6 px-8 md:px-16"
          >
            <button
              data-cursor
              onClick={() => selectProject(null)}
              className="mb-2 w-fit font-mono text-[10px] uppercase tracking-[0.24em] text-smoke transition-colors hover:text-bone"
            >
              ← universe
            </button>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-smoke">{b.kind}</p>
              <h2 className="mt-2 font-display text-[8vw] font-semibold leading-[0.92] tracking-[-0.03em] text-bone md:text-[3.4rem]">
                {b.title}
              </h2>
            </div>

            <p className="font-body text-[14px] leading-relaxed text-smoke">{b.hint}</p>

            {/* the flow the orb guides you through */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
              {b.flow.map((stage, i) => (
                <span key={stage} className="flex items-center gap-2">
                  <span className="text-bone">{stage}</span>
                  {i < b.flow.length - 1 && <span className="text-faint">→</span>}
                </span>
              ))}
            </div>

            <div className="mt-2 flex flex-col gap-3 border-t border-hair pt-5">
              <div className="flex items-baseline gap-3">
                <span className="w-16 shrink-0 font-mono text-[9px] uppercase tracking-[0.22em] text-faint">Impact</span>
                <span className="font-body text-[13px] text-bone">{b.metric}</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="w-16 shrink-0 font-mono text-[9px] uppercase tracking-[0.22em] text-faint">Stack</span>
                <span className="font-body text-[13px] text-smoke">{b.tags}</span>
              </div>
              {b.href && (
                <div className="flex items-baseline gap-3">
                  <span className="w-16 shrink-0 font-mono text-[9px] uppercase tracking-[0.22em] text-faint">Code</span>
                  <a
                    href={b.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-cursor
                    className="link-underline font-mono text-[12px] text-bone"
                  >
                    github ↗
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
