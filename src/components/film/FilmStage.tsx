"use client";

import { useEffect, useRef, useState } from "react";
import { PLACES, type Place } from "@/film/layout";
import { registerNav, goTo } from "@/film/nav";
import { PROFILE } from "@/film/data";

/**
 * Mounts the film: a fixed WebGL canvas, the words that live over it, and the section rail.
 * The page itself is a tall, empty scroll track; scroll position is the film's clock.
 */
export default function FilmStage() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<Place>("Arrival");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let film: import("@/film/Film").Film | null = null;
    (async () => {
      const { Film } = await import("@/film/Film");
      if (!alive || !canvas.current || !root.current || !labels.current) return;
      film = new Film({ canvas: canvas.current, root: root.current, labels: labels.current, onPlace: setPlace, onReady: () => setReady(true) });
      registerNav((p) => film?.goTo(p));
      try {
        await film.init();
      } catch (e) {
        console.error(e);
        setFailed(true);
      }
    })();
    return () => {
      alive = false;
      registerNav(null);
      film?.dispose();
    };
  }, []);

  return (
    <>
      <canvas ref={canvas} className="film-canvas" aria-hidden />
      <div ref={root} className="film-ui">
        <div className="film-name disp">{PROFILE.name.toUpperCase()}</div>
        <div data-block="layer" className="film-layer">
          <section data-block="arrival" className="blk" style={{ left: 72, top: "30vh", opacity: 1 }}>
            <div className="mono sub">An observer found him</div>
            <h1 className="disp" style={{ fontSize: "clamp(56px,6.6vw,96px)", lineHeight: 0.98, marginTop: 18 }}>
              Divyansh
              <br />
              Bansal
            </h1>
            <div className="mono" style={{ marginTop: 26, color: "#ffc896" }}>{PROFILE.roles}</div>
            <p style={{ marginTop: 14, fontSize: 17, lineHeight: 1.55, color: "#a9a9b0", maxWidth: 380 }}>{PROFILE.line}</p>
          </section>
        </div>
        <div ref={labels} className="film-labels" />
        <div data-block="hint" className="mono sub film-hint">Scroll · move your cursor</div>
        <nav className="film-rail mono" aria-label="Sections">
          {PLACES.map((p) => (
            <button key={p} onClick={() => goTo(p)} className={p === place ? "on" : undefined} aria-current={p === place ? "true" : undefined}>
              {p}
            </button>
          ))}
        </nav>
      </div>
      <div className={`film-loading mono sub${ready ? " done" : ""}`} aria-hidden={ready}>
        {failed ? "This film needs WebGL. Try a recent desktop browser." : "Gathering dust…"}
      </div>
      <div className="film-track" aria-hidden />
    </>
  );
}
