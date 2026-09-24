"use client";

import { useEffect, useRef, useState } from "react";
import { PLACES, type Place } from "@/film/layout";
import { registerNav, goTo } from "@/film/nav";
import { HORIZON, MEMORIES, PROFILE, PROJECTS, RESUMES, STACK, THINK } from "@/film/data";

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
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once on mount, the server cannot know
    setTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

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
          <section data-block="think" className="blk" style={{ left: 72, top: "27vh" }}>
            <div className="mono sub">Think</div>
            <h2 className="disp" style={{ fontSize: "clamp(44px,4.4vw,64px)", lineHeight: 1.02, marginTop: 16 }}>
              How he
              <br />
              thinks
            </h2>
            <p style={{ marginTop: 22, fontSize: 17, lineHeight: 1.55, color: "#a9a9b0", maxWidth: 340 }}>{THINK.line}</p>
          </section>
          <section data-block="work" className="blk" style={{ left: 72, top: "16vh" }}>
            <div className="mono sub">Projects</div>
            <h2 className="disp" style={{ fontSize: "clamp(40px,3.9vw,56px)", lineHeight: 1.02, marginTop: 14 }}>
              The work
            </h2>
            <p style={{ marginTop: 16, fontSize: 16, lineHeight: 1.55, color: "#a9a9b0", maxWidth: 320 }}>
              Everything it learned about how he thinks, turned into what he built.
            </p>
          </section>
          <section data-block="journey" className="blk" style={{ left: 0, right: 0, top: "36%", textAlign: "center" }}>
            <div className="mono sub">Journey · 2021 to now</div>
            <h2 className="disp" style={{ fontSize: "clamp(44px,5.4vw,78px)", lineHeight: 1, marginTop: 22 }}>
              What made him
            </h2>
          </section>
          <section data-block="horizon" className="blk" style={{ left: 16, right: 16, top: "16vh", textAlign: "center" }}>
            <div className="mono sub">{HORIZON.kicker}</div>
            <h2 className="disp" style={{ fontSize: "clamp(34px,3.8vw,54px)", lineHeight: 1.1, marginTop: 18, whiteSpace: "pre-line" }}>
              {HORIZON.title}
            </h2>
            <p style={{ marginTop: 22, fontSize: 17, lineHeight: 1.6, color: "#c9c9cf", whiteSpace: "pre-line" }}>
              {HORIZON.line.split("Amdocs").map((part, i) => (
                <span key={i}>
                  {i > 0 && <span style={{ color: "#ffb57a" }}>Amdocs</span>}
                  {part}
                </span>
              ))}
            </p>
          </section>
          <section data-block="contact" className="blk" style={{ left: 72, top: "22vh" }} aria-label="Contact">
            <div className="mono sub">It&apos;s listening</div>
            <h2 className="disp" style={{ fontSize: "clamp(56px,6.6vw,96px)", lineHeight: 0.98, marginTop: 18 }}>
              Let&apos;s
              <br />
              talk.
            </h2>
            <a
              className="film-link"
              href={`mailto:${PROFILE.email}`}
              style={{ marginTop: 30, fontSize: 21, display: "inline-block", borderBottom: "1px solid rgba(255,200,150,.4)", paddingBottom: 6 }}
            >
              {PROFILE.email}
            </a>
            <div className="mono" style={{ marginTop: 24, display: "flex", gap: 26 }}>
              <a className="film-link" style={{ color: "#ffc896" }} href={PROFILE.github} target="_blank" rel="noopener noreferrer">
                GitHub ↗
              </a>
              <a className="film-link" style={{ color: "#ffc896" }} href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer">
                LinkedIn ↗
              </a>
            </div>
            <div className="mono sub" style={{ marginTop: 32 }}>
              Résumé
            </div>
            <div style={{ marginTop: 14 }}>
              {RESUMES.map((r) => (
                <a key={r.code} className="mono chip" href={r.file} target="_blank" rel="noopener noreferrer">
                  {r.code}
                </a>
              ))}
            </div>
          </section>
          <section data-block="stack" className="blk" style={{ left: 48, bottom: 84 }}>
            <div className="mono sub">Stack</div>
            <h2 className="disp" style={{ fontSize: 26, lineHeight: 1.1, marginTop: 8 }}>
              What it runs on
            </h2>
          </section>
        </div>
        <div ref={labels} className="film-labels" />
        <aside data-block="panel" className="film-panel" role="dialog" aria-hidden="true" />
        <div data-block="hint" className="mono sub film-hint">{touch ? "Scroll · tap the work" : "Scroll · move your cursor"}</div>
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
      {/* the whole story as plain text, for screen readers and search engines */}
      <article className="sr-only">
        <p>{PROFILE.roles}. {PROFILE.line}</p>
        <h2>{THINK.title}</h2>
        <p>{THINK.line}</p>
        <h2>Projects</h2>
        <ul>
          {PROJECTS.map((p) => (
            <li key={p.id}>
              <h3>{p.title}</h3>
              <p>
                {p.kind}. {p.line} {p.metric}. Built with {p.uses.join(", ")}.
              </p>
              {p.href && <a href={p.href}>{p.title} on GitHub</a>}
            </li>
          ))}
        </ul>
        <h2>Stack</h2>
        <ul>
          {STACK.map(([cap, , items]) => (
            <li key={cap}>
              {cap}: {items.join(", ")}
            </li>
          ))}
        </ul>
        <h2>Journey</h2>
        <ul>
          {MEMORIES.map((m) => (
            <li key={m.y + m.t}>
              {m.y}, {m.t}: {m.n}
            </li>
          ))}
        </ul>
        <h2>Now</h2>
        <p>
          {HORIZON.title.replace(/\n/g, " ")} {HORIZON.line.replace(/\n/g, " ")}
        </p>
      </article>
    </>
  );
}
