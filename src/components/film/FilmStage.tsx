"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PLACES, TRACK_VH, type Place } from "@/film/layout";
import { registerNav, goTo } from "@/film/nav";
import { BUILD, CONTACT, JOURNEY, MEMORIES, NOW, PROFILE, PROJECTS, RESUME, STACK, THINK } from "@/film/data";
import LoadingVeil from "./LoadingVeil";

/** The local time in New Delhi, for the landing's corner. */
function useIST() {
  const [t, setT] = useState("");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
    const tick = () => setT(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 10000);
    return () => window.clearInterval(id);
  }, []);
  return t;
}

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
  const ist = useIST();
  const index = PLACES.indexOf(place) + 1;
  // the loading screen: up while the film loads, and again to cover a jump between sections
  const [veil, setVeil] = useState(false);
  const film = useRef<import("@/film/Film").Film | null>(null);
  const jumping = useRef(false);
  const covered = !ready || veil;

  /** Cover the screen (dust gathers into a line), cut to the section, give it a beat, then reveal it (the line lets go). */
  const jump = useCallback((p: Place) => {
    const f = film.current;
    if (!f || jumping.current) return;
    jumping.current = true;
    setVeil(true);
    const t0 = performance.now();
    window.setTimeout(() => {
      f.jumpTo(p);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          window.setTimeout(() => {
            setVeil(false);
            jumping.current = false;
          }, Math.max(0, 1400 - (performance.now() - t0)));
        }),
      );
    }, 480);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once on mount, the server cannot know
    setTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { Film } = await import("@/film/Film");
      if (!alive || !canvas.current || !root.current || !labels.current) return;
      const f = new Film({ canvas: canvas.current, root: root.current, labels: labels.current, onPlace: setPlace, onReady: () => setReady(true) });
      film.current = f;
      registerNav(jump);
      try {
        await f.init();
      } catch (e) {
        console.error(e);
        setFailed(true);
      }
    })();
    return () => {
      alive = false;
      registerNav(null);
      film.current?.dispose();
      film.current = null;
    };
  }, [jump]);

  return (
    <>
      <canvas ref={canvas} className="film-canvas" aria-hidden />
      <div ref={root} className="film-ui">
        <div data-block="brand" className="film-name disp">
          {PROFILE.name.toUpperCase()}
        </div>
        <div data-block="layer" className="film-layer">
          <section data-block="arrival" className="blk" style={{ left: 72, top: "30vh", opacity: 1 }}>
            <div className="mono sub">Somewhere between curious and obsessed.</div>
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
              The
              <br />
              process
            </h2>
            <p style={{ marginTop: 22, fontSize: 17, lineHeight: 1.55, color: "#a9a9b0", maxWidth: 340 }}>{THINK.line}</p>
          </section>
          <section data-block="build" className="blk" style={{ left: 72, top: "16vh" }}>
            <div className="mono sub">{BUILD.kicker}</div>
            <h2 className="disp" style={{ fontSize: "clamp(40px,3.9vw,56px)", lineHeight: 1.02, marginTop: 14 }}>
              {BUILD.title}
            </h2>
            <p style={{ marginTop: 16, fontSize: 16, lineHeight: 1.55, color: "#a9a9b0", maxWidth: 330 }}>{BUILD.line}</p>
          </section>
          <section data-block="journey" className="blk" style={{ left: 0, right: 0, top: "36%", textAlign: "center" }}>
            <div className="mono sub">{JOURNEY.kicker}</div>
            <h2 className="disp" style={{ fontSize: "clamp(44px,5.4vw,78px)", lineHeight: 1, marginTop: 22 }}>
              {JOURNEY.title}
            </h2>
          </section>
          <section data-block="now" className="blk" style={{ left: 16, right: 16, top: "16vh", textAlign: "center" }}>
            <div className="mono sub">{NOW.kicker}</div>
            <h2 className="disp" style={{ fontSize: "clamp(40px,4.4vw,64px)", lineHeight: 1.05, marginTop: 18 }}>
              {NOW.title}
            </h2>
            <p style={{ marginTop: 22, fontSize: 17, lineHeight: 1.6, color: "#c9c9cf", whiteSpace: "pre-line" }}>{NOW.line}</p>
          </section>
          <section data-block="contact" className="blk" style={{ left: 72, top: "22vh" }} aria-label="Contact">
            <div className="mono sub">{CONTACT.kicker}</div>
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
            <a className="mono chip" style={{ marginTop: 30 }} href={RESUME} target="_blank" rel="noopener noreferrer">
              Résumé ↗
            </a>
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
        {/* quiet details on the first screen, and a progress line that stays */}
        <div data-block="hud" className="film-hud mono sub" aria-hidden>
          <div className="film-hud-l">
            <div>New Delhi · 28.61°N 77.21°E</div>
            <div className="film-hud-time">{ist ? `${ist} IST` : "\u00a0"}</div>
          </div>
        </div>
        <div className="film-progress mono sub" aria-hidden>
          <div data-block="mood" className="film-mood" />
          <div className="film-progress-row">
            <span>
              {String(index).padStart(2, "0")} / {String(PLACES.length).padStart(2, "0")}
            </span>
            <span className="film-progress-track">
              <span data-block="progress" className="film-progress-fill" />
            </span>
          </div>
        </div>
        <div data-block="hint" className="mono sub film-hint">{touch ? "Scroll · tap the work" : "Scroll · move your cursor"}</div>
        <nav className="film-rail mono" aria-label="Sections">
          {PLACES.map((p) => (
            <button key={p} onClick={() => goTo(p)} className={p === place ? "on" : undefined} aria-current={p === place ? "true" : undefined}>
              {p}
            </button>
          ))}
        </nav>
      </div>
      <LoadingVeil covered={covered} failed={failed} />
      <div className="film-track" style={{ height: `${TRACK_VH}vh` }} aria-hidden />
      {/* the whole story as plain text, for screen readers and search engines */}
      <article className="sr-only">
        <p>
          {PROFILE.roles}. {PROFILE.line}
        </p>
        <h2>{THINK.title}</h2>
        <p>{THINK.line}</p>
        <h2>{BUILD.title}</h2>
        <p>{BUILD.line}</p>
        <ul>
          {PROJECTS.map((p) => (
            <li key={p.id}>
              <h3>{p.title}</h3>
              <p>
                {p.kind}. {p.line} {p.metric}. {p.problem} {p.built} {p.outcome} Built with {p.uses.join(", ")}.
              </p>
              {p.links.map((l) => (
                <a key={l.url} href={l.url}>
                  {p.title}: {l.label}
                </a>
              ))}
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
        <h2>{JOURNEY.title}</h2>
        <ul>
          {MEMORIES.map((m) => (
            <li key={m.y + m.t}>
              {m.y}, {m.t}: {m.k ? `${m.k}. ` : ""}
              {m.n}
            </li>
          ))}
        </ul>
        <h2>{NOW.title}</h2>
        <p>{NOW.line.replace(/\n/g, " ")}</p>
      </article>
    </>
  );
}
