"use client";

import { useEffect, useState } from "react";
import { LOADING_LINES } from "@/film/data";

/**
 * The loading screen: black, a line with dots that keep filling in, and a new line every beat or so,
 * even within one showing. It fades in to cover a jump and fades away when the film is there;
 * a quick jump (from the bar) blinks it in and out.
 */
export default function LoadingVeil({ covered, failed, quick = false }: { covered: boolean; failed: boolean; quick?: boolean }) {
  const [line, setLine] = useState(0);
  const [dots, setDots] = useState(1);

  useEffect(() => {
    if (!covered) return;
    const n = LOADING_LINES.length, next = (i: number) => (i + 1 + Math.floor(Math.random() * (n - 1))) % n;
    // a fresh line each time the screen comes up, then a new one every 1.3s while it stays
    const fresh = window.setTimeout(() => setLine(next), 0);
    const lines = window.setInterval(() => setLine(next), 1300);
    const beat = window.setInterval(() => setDots((d) => (d % 3) + 1), 380);
    return () => {
      window.clearTimeout(fresh);
      window.clearInterval(lines);
      window.clearInterval(beat);
    };
  }, [covered]);

  return (
    <div className={`film-loading mono sub${covered ? " cover" : " done"}${quick ? " quick" : ""}`} aria-hidden={!covered}>
      {failed ? (
        "This film needs WebGL. Try a recent desktop browser."
      ) : (
        <span className="film-loading-line">
          <span key={line} className="film-loading-words">
            {LOADING_LINES[line]}
          </span>
          <span className="film-loading-dots">{".".repeat(dots)}</span>
        </span>
      )}
    </div>
  );
}
