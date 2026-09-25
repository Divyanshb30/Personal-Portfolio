"use client";

import { useEffect, useRef } from "react";
import { LOADING_LINES } from "@/film/data";

/** how long each line holds the screen, in seconds */
const BEAT = 1.1;
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
 * The loading screen: black, a line with dots that keep filling in, and a new line every beat, even
 * within one showing. It fades in to cover a jump and fades away when the film is there; a quick jump
 * (from the bar) blinks it in and out. Each showing after the first starts from a line picked at random.
 * If the GPU drops the film (a phone does, to a page left in the background), it says so and offers a reload.
 */
export default function LoadingVeil({ covered, lost = false, quick = false }: { covered: boolean; lost?: boolean; quick?: boolean }) {
  const lines = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (!covered) return;
    // the first showing plays as served with the page; later ones start the loop over from a random line
    if (first.current) {
      first.current = false;
      return;
    }
    const el = lines.current;
    if (!el) return;
    const from = Math.floor(Math.random() * N);
    el.querySelectorAll<HTMLElement>(".film-loading-words").forEach((w, i) => {
      w.style.animationDelay = `${(((i - from + N) % N) * BEAT).toFixed(2)}s`;
    });
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
        </>
      )}
    </div>
  );
}
