"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PLACES, TRACK_VH, type Place } from "@/film/layout";
import { registerNav, goTo } from "@/film/nav";
import { BUILD, CONTACT, JOURNEY, MEMORIES, NOW, PROFILE, PROJECTS, RESUME, STACK, THINK } from "@/film/data";
import LoadingVeil from "./LoadingVeil";
import Cursor from "./Cursor";
import ChapterSheet from "./ChapterSheet";

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

/** The sections a link can open on (#work, #contact, …); the landing has none. */
const SLUG: Partial<Record<Place, string>> = { Think: "think", Build: "work", Stack: "stack", Journey: "journey", Now: "now", Contact: "contact" };
const placeOfHash = (hash: string): Place | null => {
  const k = hash.replace(/^#/, "").toLowerCase();
  if (k === "build") return "Build";
  return PLACES.find((p) => SLUG[p] === k) ?? null;
};

/**
 * Mounts the film: a fixed WebGL canvas, the words that live over it, the section rail and the bar.
 * The page itself is a tall, empty scroll track; scroll position is the film's clock.
 */
export default function FilmStage() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLButtonElement>(null);
  const [place, setPlace] = useState<Place>("Arrival");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [lost, setLost] = useState(false);
  const [touch, setTouch] = useState(false);
  // tilt, on a touch screen: "ask" waits for a tap (iOS), "on" is steering, "none" isn't there
  const [tilt, setTilt] = useState<"none" | "ask" | "on">("none");
  const [sheet, setSheet] = useState(false);
  const ist = useIST();
  const index = PLACES.indexOf(place) + 1;
  // the loading screen: up while the film loads, and again to cover a jump between sections
  const [veil, setVeil] = useState(false);
  const [quick, setQuick] = useState(false);
  const film = useRef<import("@/film/Film").Film | null>(null);
  const jumping = useRef(false);
  const covered = (!ready && !failed) || veil || lost;

  /**
   * Cover the screen, cut to the section, then reveal it. From the rail the cover holds long enough
   * for a line or two; from the bar (or a phone's chapters) it is quick, for someone short on time.
   */
  const jump = useCallback((p: Place, fast = false) => {
    const f = film.current;
    if (!f || jumping.current) return;
    jumping.current = true;
    setQuick(fast);
    setVeil(true);
    const t0 = performance.now();
    window.setTimeout(
      () => {
        f.jumpTo(p);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            window.setTimeout(
              () => {
                setVeil(false);
                jumping.current = false;
              },
              Math.max(0, (fast ? 600 : 2100) - (performance.now() - t0)),
            );
          }),
        );
      },
      fast ? 200 : 450,
    );
  }, []);

  const closeSheet = useCallback(() => {
    setSheet(false);
    // (focus goes back to what opened it, if it was inside the sheet)
    if (document.activeElement?.closest(".film-sheet")) dock.current?.focus({ preventScroll: true });
  }, []);
  const pickChapter = useCallback(
    (p: Place) => {
      setSheet(false);
      dock.current?.focus({ preventScroll: true });
      jump(p, true);
    },
    [jump],
  );

  const askTilt = useCallback(async () => {
    const ok = await film.current?.requestTilt();
    if (!ok) setTilt("none");
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
      const f = new Film({
        canvas: canvas.current,
        root: root.current,
        labels: labels.current,
        onPlace: setPlace,
        onReady: () => {
          // a link to a section (#work, #contact) opens there, behind the first loading screen
          const p = placeOfHash(location.hash);
          if (p) f.jumpTo(p);
          setReady(true);
          if (f.tiltNeedsPermission) setTilt((t) => (t === "on" ? t : "ask"));
        },
        onLost: () => setLost(true),
        onTilt: () => setTilt("on"),
      });
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

  // the address follows the visitor, so any moment can be linked to
  useEffect(() => {
    if (!ready) return;
    const slug = SLUG[place], base = location.pathname + location.search;
    const url = slug ? `${base}#${slug}` : base;
    if (url !== base + location.hash) history.replaceState(history.state, "", url);
  }, [place, ready]);

  const hint = !touch ? "Scroll · move your cursor" : tilt === "on" ? "Scroll · tilt to look around" : "Scroll · tap the orb";

  return (
    <>
      <canvas ref={canvas} className="film-canvas" aria-hidden hidden={failed} />
      <div ref={root} className="film-ui" hidden={failed}>
        {/* on a phone, a little shade at the top and bottom keeps the chrome legible over the film */}
        <div className="film-scrim film-scrim-t" aria-hidden />
        <div className="film-scrim film-scrim-b" aria-hidden />
        <div data-block="brand" className="film-name disp">
          {PROFILE.name.toUpperCase()}
        </div>
        <div data-block="layer" className="film-layer">
          <section data-block="arrival" className="blk blk-arrival">
            <div className="mono sub">Somewhere between curious and obsessed.</div>
            <h1 className="disp">
              Divyansh
              <br />
              Bansal
            </h1>
            <p>{PROFILE.line}</p>
          </section>
          <section data-block="think" className="blk blk-think">
            <div className="mono sub">Think</div>
            <h2 className="disp">
              The
              <br />
              process
            </h2>
            <p>{THINK.line}</p>
          </section>
          <section data-block="build" className="blk blk-build">
            <div className="mono sub">{BUILD.kicker}</div>
            <h2 className="disp">{BUILD.title}</h2>
            <p>{BUILD.line}</p>
          </section>
          <section data-block="journey" className="blk blk-journey">
            <div className="mono sub">{JOURNEY.kicker}</div>
            <h2 className="disp">{JOURNEY.title}</h2>
          </section>
          <section data-block="now" className="blk blk-now">
            <div className="mono sub">{NOW.kicker}</div>
            <h2 className="disp">{NOW.title}</h2>
            <p>{NOW.line}</p>
          </section>
          <section data-block="contact" className="blk blk-contact" aria-label="Contact">
            <div className="mono sub">{CONTACT.kicker}</div>
            <h2 className="disp">
              Let&apos;s
              <br />
              talk.
            </h2>
            <a className="film-link blk-email" href={`mailto:${PROFILE.email}`}>
              {PROFILE.email}
            </a>
            <div className="mono blk-links">
              <a className="film-link" href={PROFILE.github} target="_blank" rel="noopener noreferrer">
                GitHub ↗
              </a>
              <a className="film-link" href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer">
                LinkedIn ↗
              </a>
            </div>
            <a className="mono chip" href={RESUME} target="_blank" rel="noopener noreferrer">
              Résumé ↗
            </a>
          </section>
          <section data-block="stack" className="blk blk-stack">
            <div className="mono sub">Stack</div>
            <h2 className="disp">What it runs on</h2>
          </section>
        </div>
        <div ref={labels} className="film-labels" />
        <aside data-block="panel" className="film-panel" role="dialog" aria-hidden="true" />
        {/* quiet details on the first screen (a phone shows the time where the name will be), and a progress line that stays */}
        <div data-block="hud" className="film-hud mono sub" aria-hidden>
          <div className="film-hud-l">
            <div className="film-hud-where">New Delhi · 28.61°N 77.21°E</div>
            <div className="film-hud-time">
              <span className="film-hud-city">New Delhi · </span>
              {ist ? `${ist} IST` : " "}
            </div>
          </div>
        </div>
        {/* the progress line; on a phone it is the dock, and opens the chapters */}
        <div className="film-progress mono sub">
          <div data-block="mood" className="film-mood" aria-hidden />
          <button
            ref={dock}
            type="button"
            className="film-progress-row"
            aria-haspopup="dialog"
            aria-expanded={sheet}
            aria-label={`Chapters: ${String(index).padStart(2, "0")} of ${String(PLACES.length).padStart(2, "0")}, ${place}`}
            onClick={() => setSheet(true)}
          >
            <span className="film-progress-n" aria-hidden>
              {String(index).padStart(2, "0")} / {String(PLACES.length).padStart(2, "0")}
            </span>
            <span className="film-progress-place" aria-hidden>
              {place}
            </span>
            <span className="film-progress-track" aria-hidden>
              <span data-block="progress" className="film-progress-fill" />
            </span>
            <span className="film-progress-menu" aria-hidden>
              <i />
              <i />
              <i />
            </span>
          </button>
        </div>
        <div data-block="hint" className="mono sub film-hint">
          {tilt === "ask" ? (
            <button type="button" onClick={askTilt}>
              Scroll · tap to tilt
            </button>
          ) : (
            hint
          )}
        </div>
        <nav className="film-rail mono" aria-label="Sections">
          {PLACES.map((p) => (
            <button key={p} onClick={() => goTo(p)} className={p === place ? "on" : undefined} aria-current={p === place ? "true" : undefined}>
              {p}
            </button>
          ))}
        </nav>
        {/* the fast path, for anyone short on time */}
        <nav className="film-bar mono" aria-label="Quick links">
          <button type="button" onClick={() => jump("Build", true)}>
            Work
          </button>
          <a href={RESUME} target="_blank" rel="noopener noreferrer">
            Résumé
          </a>
          <button type="button" onClick={() => jump("Contact", true)}>
            Contact
          </button>
        </nav>
      </div>
      <ChapterSheet open={sheet} place={place} onClose={closeSheet} onPick={pickChapter} />
      <LoadingVeil covered={covered} lost={lost} quick={quick} />
      <Cursor />
      {!failed && <div className="film-track" style={{ height: `${TRACK_VH}vh` }} aria-hidden />}
      {/* the whole story as plain text, for screen readers and search engines; and, where the film can't
          run (no WebGL), shown as a quiet page of its own */}
      <article className={failed ? "film-fallback" : "sr-only"}>
        {failed && (
          <header>
            <div className="mono sub">Somewhere between curious and obsessed.</div>
            <h1 className="disp">{PROFILE.name}</h1>
          </header>
        )}
        <p>{PROFILE.line}</p>
        <h2>{THINK.title}</h2>
        <p>{THINK.line}</p>
        <h2>{BUILD.title}</h2>
        <p>{BUILD.line}</p>
        <ul>
          {PROJECTS.map((p) => (
            <li key={p.id}>
              <h3>{p.title}</h3>
              <p>
                {p.kind}. {p.line} {p.metric}. {p.problem} {Array.isArray(p.built) ? p.built.join(" ") : p.built} {p.outcome} Built with {p.uses.join(", ")}.
              </p>
              {p.also?.map((a) => (
                <p key={a.title}>
                  Also at Amdocs, {a.title}: {a.line} Built with {a.uses.join(", ")}.
                </p>
              ))}
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
          {STACK.map(([cap, , items, , note]) => (
            <li key={cap}>
              {cap}: {items.join(", ")}
              {note ? `. ${note.join(", ")}` : ""}
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
        {failed && (
          <footer>
            <h2>{CONTACT.title}</h2>
            <p>
              <a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>
            </p>
            <p className="mono">
              <a href={PROFILE.github} target="_blank" rel="noopener noreferrer">
                GitHub ↗
              </a>
              <a href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer">
                LinkedIn ↗
              </a>
              <a href={RESUME} target="_blank" rel="noopener noreferrer">
                Résumé ↗
              </a>
            </p>
            <p className="sub">This page is the film&apos;s plain version: this browser couldn&apos;t run its 3D.</p>
          </footer>
        )}
      </article>
    </>
  );
}
