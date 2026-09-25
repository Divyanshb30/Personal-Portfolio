"use client";

import { useEffect, useRef } from "react";
import { LOADING_LINES } from "@/film/data";

/** how long each line holds the screen, in seconds */
const BEAT = 1.5;
const N = LOADING_LINES.length;
/**
 * One loop, a slot per line: each rises in, holds and drifts out in its turn. The browser runs it on
 * its compositor, so the lines keep changing (and the dots keep filling in) even while the film is
 * still being built and the page itself is too busy to do anything else.
 */
const CYCLE = (() => {
  const at = (f: number) => `${((100 / N) * f).toFixed(3)}%`;
  return `@keyframes loading-cycle { 0% { opacity: 0; transform: translateY(6px); } ${at(0.14)} { opacity: 1; transform: none; } ${at(0.86)} { opacity: 1; transform: none; } ${at(1)}, 100% { opacity: 0; transform: translateY(-4px); } }`;
})();

/**
 * Deal the lines a new order: a shuffle, written as a stylesheet that gives each line its slot in the loop.
 * It must stand alone (it is also sent as source, to run in the page before anything else does).
 */
function shuffleLines(n: number, beat: number) {
  const order: number[] = [];
  for (let i = 0; i < n; i++) order.push(i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)), t = order[i];
    order[i] = order[j];
    order[j] = t;
  }
  let css = "";
  for (let k = 0; k < n; k++) css += `.film-loading-words:nth-child(${order[k] + 1}){animation-delay:${(k * beat).toFixed(2)}s !important}`;
  let s = document.getElementById("loading-order");
  if (!s) {
    s = document.createElement("style");
    s.id = "loading-order";
    document.head.appendChild(s);
  }
  s.textContent = css;
}
// (runs as the page arrives, so even the first line is a surprise; the page is prerendered, the same for everyone)
const SHUFFLE_NOW = `try{(${shuffleLines.toString()})(${N},${BEAT})}catch(e){}`;

/**
 * The loading screen: black, a line with dots that keep filling in, and a new line every beat, even
 * within one showing. It fades in to cover a jump and fades away when the film is there; a quick jump
 * (from the bar) blinks it in and out. Every showing deals the lines in a new random order.
 * If the GPU drops the film (a phone does, to a page left in the background), it says so and offers a reload.
 */
export default function LoadingVeil({ covered, lost = false, quick = false }: { covered: boolean; lost?: boolean; quick?: boolean }) {
  const lines = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (!covered) return;
    // the first showing was dealt as the page arrived; each later one deals a new order and starts over
    if (first.current) {
      first.current = false;
      return;
    }
    const el = lines.current;
    if (!el) return;
    shuffleLines(N, BEAT);
    for (const a of el.getAnimations({ subtree: true })) {
      a.cancel();
      a.play();
    }
  }, [covered]);

  return (
    <div className={`film-loading mono sub${covered ? " cover" : " done"}${quick ? " quick" : ""}`} aria-hidden={!covered}>
      <style>{CYCLE}</style>
      {lost ? (
        <span className="film-lost">
          The film paused.
          <button type="button" className="mono chip" onClick={() => location.reload()}>
            Tap to reload
          </button>
        </span>
      ) : (
        <>
          <span className="sr-only">Loading</span>
          <span ref={lines} className="film-loading-lines" aria-hidden>
            {LOADING_LINES.map((l, i) => (
              <span key={l} className="film-loading-words" style={{ animationDuration: `${(N * BEAT).toFixed(2)}s`, animationDelay: `${(i * BEAT).toFixed(2)}s` }}>
                {l}
                <span className="film-loading-dots">
                  <i>.</i>
                  <i>.</i>
                  <i>.</i>
                </span>
              </span>
            ))}
          </span>
          <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: SHUFFLE_NOW }} />
        </>
      )}
    </div>
  );
}
