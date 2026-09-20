"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ask, SUGGESTIONS, topicToChapter, isNavIntent, retrieve, type AskResult } from "@/lib/intelligence";
import { goTo } from "@/lib/scroll";

type Msg = { role: "you" | "intelligence"; text: string; pending?: boolean };

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The Intelligence — the entity's other face. A restrained indicator that
 * expands into a conversational panel; it answers from real content AND
 * navigates the world (nav-intent questions move the film to a chapter).
 */
export default function Intelligence() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [msgs, reduce]);

  async function send(q: string) {
    const query = q.trim();
    if (!query || busy) return;
    setValue("");
    setBusy(true);
    setMsgs((m) => [...m, { role: "you", text: query }, { role: "intelligence", text: "", pending: true }]);

    let res: AskResult;
    try {
      res = await ask(query);
    } catch {
      res = { text: "Something interrupted the signal. Try again.", topic: null, source: "local" };
    }

    // world navigation: take the visitor there
    const topic = res.topic ?? retrieve(query)[0]?.doc.topic ?? null;
    const chapter = topicToChapter(topic);
    let text = res.text;
    if (chapter && isNavIntent(query)) {
      text += ` — taking you there.`;
      goTo(chapter);
      setTimeout(() => setOpen(false), 900);
    }

    setMsgs((m) => {
      const next = [...m];
      next[next.length - 1] = { role: "intelligence", text };
      return next;
    });
    setBusy(false);
  }

  return (
    <>
      {/* resting indicator — the entity's other face */}
      <button
        data-cursor
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close the intelligence" : "Ask the intelligence"}
        aria-expanded={open}
        className="group fixed bottom-6 right-6 z-[70] flex items-center gap-3 md:bottom-8 md:right-8"
      >
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-hair bg-void/60 backdrop-blur-sm">
          {!reduce && (
            <span className="absolute inset-0 rounded-full border border-white/25 motion-safe:animate-ping [animation-duration:2.8s]" />
          )}
          <span className="h-2 w-2 rounded-full bg-bone shadow-[0_0_12px_2px_rgba(236,236,238,0.7)]" />
        </span>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.28em] text-smoke transition-colors group-hover:text-bone md:inline">
          {open ? "Close" : "Ask"}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="fixed bottom-24 right-6 z-[69] flex h-[min(70vh,520px)] w-[min(92vw,380px)] flex-col border border-hair bg-void-deep/92 backdrop-blur-md md:right-8"
          >
            <div className="flex items-center justify-between border-b border-hair px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-bone shadow-[0_0_8px_1px_rgba(236,236,238,0.7)]" />
                <span className="font-mono text-[10px] uppercase tracking-[0.26em] text-bone">Intelligence</span>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-faint">interface · portfolio</span>
            </div>

            <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto px-4 py-4" data-lenis-prevent>
              {msgs.length === 0 && (
                <p className="max-w-[46ch] font-body text-[13px] leading-relaxed text-smoke">
                  Ask about Divyansh, the production agent platform, the projects,
                  the published research, or how to reach him. Say &ldquo;show me&rdquo; and I&rsquo;ll take you there.
                </p>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={m.role === "you" ? "text-right" : "text-left"}>
                  <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.24em] text-faint">{m.role}</span>
                  {m.pending ? (
                    <span className="inline-flex gap-1">
                      {[0, 1, 2].map((dd) => (
                        <span key={dd} className="h-1.5 w-1.5 rounded-full bg-white/60 motion-safe:animate-pulse" style={{ animationDelay: `${dd * 160}ms` }} />
                      ))}
                    </span>
                  ) : (
                    <p className={`inline-block max-w-[52ch] font-body text-[13.5px] leading-relaxed ${m.role === "you" ? "text-bone" : "text-smoke"}`}>{m.text}</p>
                  )}
                </div>
              ))}
            </div>

            {msgs.length === 0 && (
              <div className="flex flex-wrap gap-2 px-4 pb-3">
                {SUGGESTIONS.map((s) => (
                  <button key={s} data-cursor onClick={() => send(s)} className="border border-hair px-2.5 py-1.5 font-mono text-[10px] tracking-wide text-faint transition-colors hover:border-white/40 hover:text-bone">
                    {s}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); send(value); }} className="flex items-center gap-2 border-t border-hair px-3 py-3">
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Ask the intelligence…"
                aria-label="Ask the intelligence"
                className="flex-1 bg-transparent font-body text-[13.5px] text-bone placeholder:text-faint focus:outline-none"
              />
              <button type="submit" data-cursor disabled={busy || !value.trim()} className="font-mono text-[10px] uppercase tracking-[0.2em] text-bone transition-opacity disabled:opacity-30">
                Send
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
