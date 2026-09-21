"use client";

import { useEffect } from "react";
import { film, CHAPTERS } from "@/lib/scroll";
import { identity, builds, stack, journey, explore, now, profile, regions } from "@/lib/content";

/**
 * The DOM layer over the film — scroll length (chapter anchors) plus recessive,
 * per-chapter typography that fades in on its scroll window and sits OPPOSITE the
 * orb (which drifts left/right). Interface defers to the world.
 */
export default function Overlay() {
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const p = film.progress;
      document.querySelectorAll<HTMLElement>(".chap").forEach((el) => {
        const from = parseFloat(el.dataset.from || "0");
        const to = parseFloat(el.dataset.to || "1");
        const o = windowOpacity(p, from, to);
        el.style.opacity = String(o);
        el.style.transform = `translateY(${(1 - o) * 16}px)`;
        el.style.pointerEvents = o > 0.6 ? "auto" : "none";
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      {/* scroll length — one anchor per chapter */}
      <div className="relative z-10">
        {CHAPTERS.map((c) => (
          <section key={c} id={c} className="h-[130svh]" aria-hidden />
        ))}
        <div className="h-[30svh]" aria-hidden />
      </div>

      {/* ---------- IDENTITY (orb centre → text lower-left) ---------- */}
      <Block from={-0.03} to={0.075} className="left-6 bottom-[14%] md:left-14">
        <h1 className="font-display text-[11vw] font-semibold leading-[0.86] tracking-[-0.03em] text-bone md:text-[5.6rem]">
          Divyansh
          <br />
          Bansal
        </h1>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.34em] text-smoke">
          {identity.roles.join("  ·  ")}
        </p>
        <p className="mt-2 max-w-[30ch] font-body text-[13px] leading-relaxed text-faint">{identity.line}</p>
      </Block>

      {/* ---------- THINK (orb left → text right) ---------- */}
      <Block from={0.12} to={0.235} className="right-6 top-1/2 -translate-y-1/2 text-right md:right-14">
        <Kicker>How he thinks</Kicker>
        <h2 className="font-display text-[8vw] font-medium leading-[0.95] tracking-[-0.03em] text-bone md:text-[4rem]">
          Question<span className="text-smoke">, </span>then build.
        </h2>
        <p className="ml-auto mt-4 max-w-[36ch] font-body text-[13.5px] leading-relaxed text-smoke">
          Curiosity first. Every problem worth solving reveals a bigger one — so
          the work is to keep expanding the system until it holds.
        </p>
        <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.24em] text-faint">
          question → explore → understand → build
        </p>
      </Block>

      {/* ---------- BUILD (orb right → text left) ---------- */}
      <Block from={0.25} to={0.4} className="left-6 top-1/2 -translate-y-1/2 md:left-14">
        <Kicker>What he builds</Kicker>
        <h2 className="font-display text-[8vw] font-semibold leading-[0.9] tracking-[-0.03em] text-bone md:text-[4rem]">Build.</h2>
        <ul className="mt-5 space-y-3">
          {builds.map((b) => (
            <li key={b.title} className="max-w-[42ch]">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-bone/80">{b.kind}</span>
                <span className="font-body text-[14px] text-smoke">{b.title}</span>
              </div>
              <p className="mt-0.5 font-body text-[12px] leading-snug text-faint">{b.hint}</p>
            </li>
          ))}
        </ul>
      </Block>

      {/* ---------- STACK (orb centre-back → capability columns) ---------- */}
      <Block from={0.4} to={0.545} className="left-1/2 top-[58%] w-[min(92vw,760px)] -translate-x-1/2 -translate-y-1/2 text-center">
        <Kicker>The machinery beneath it</Kicker>
        <h2 className="font-display text-[8vw] font-semibold leading-[0.9] tracking-[-0.03em] text-bone md:text-[3.6rem]">Stack.</h2>
        <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-5 text-left sm:grid-cols-3">
          {stack.map((s) => (
            <div key={s.cap}>
              <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bone/80">{s.cap}</div>
              <div className="mt-1 font-body text-[12px] leading-relaxed text-faint">{s.items.join(" · ")}</div>
            </div>
          ))}
        </div>
      </Block>

      {/* ---------- JOURNEY (orb left → timeline right) ---------- */}
      <Block from={0.55} to={0.695} className="right-6 top-1/2 -translate-y-1/2 text-right md:right-14">
        <Kicker>How he got here</Kicker>
        <h2 className="font-display text-[8vw] font-semibold leading-[0.9] tracking-[-0.03em] text-bone md:text-[4rem]">Journey.</h2>
        <ul className="ml-auto mt-5 max-w-[40ch] space-y-2.5">
          {journey.map((j) => (
            <li key={j.year} className="flex items-baseline justify-end gap-3">
              <span className="max-w-[30ch] font-body text-[12.5px] leading-snug text-faint">{j.note}</span>
              <span className="font-mono text-[11px] tracking-wide text-bone/80">{j.title}</span>
              <span className="w-10 shrink-0 font-mono text-[10.5px] text-faint">{j.year}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 font-body text-[13px] italic text-smoke">It started with a form. It became a platform.</p>
      </Block>

      {/* ---------- EXPLORE (orb right → text left) ---------- */}
      <Block from={0.7} to={0.83} className="left-6 top-1/2 -translate-y-1/2 md:left-14">
        <Kicker>Beyond the title</Kicker>
        <h2 className="font-display text-[8vw] font-semibold leading-[0.9] tracking-[-0.03em] text-bone md:text-[4rem]">Explore.</h2>
        <ul className="mt-5 max-w-[40ch] space-y-2.5">
          {explore.map((e) => (
            <li key={e.title}>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-bone/80">{e.title}</span>
              <span className="ml-3 font-body text-[12.5px] text-faint">{e.note}</span>
            </li>
          ))}
        </ul>
      </Block>

      {/* ---------- NOW (orb left → text right) ---------- */}
      <Block from={0.83} to={0.92} className="right-6 top-1/2 -translate-y-1/2 text-right md:right-14">
        <Kicker>Present tense</Kicker>
        <h2 className="font-display text-[8vw] font-semibold leading-[0.9] tracking-[-0.03em] text-bone md:text-[4rem]">Now.</h2>
        <dl className="ml-auto mt-5 max-w-[40ch] space-y-3">
          <Row label="Building">{now.building}</Row>
          <Row label="Exploring">{now.exploring}</Row>
          <Row label="Open to">{now.open}</Row>
        </dl>
      </Block>

      {/* ---------- HUMAN — the close ---------- */}
      <Block from={0.95} to={1.01} className="inset-0 flex flex-col items-center justify-center gap-8 px-6 text-center">
        <h2 className="max-w-[16ch] font-display text-[9vw] font-semibold leading-[0.92] tracking-[-0.03em] text-bone md:text-[4.6rem]">
          Let&rsquo;s talk.
        </h2>
        <div className="flex flex-col items-center gap-4">
          <a href={`mailto:${profile.email}`} data-cursor className="border border-hair px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-bone transition-colors hover:border-bone">
            {profile.email}
          </a>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-smoke">
            <a href={profile.socials.github} target="_blank" rel="noopener noreferrer" data-cursor className="link-underline hover:text-bone">GitHub</a>
            <a href={profile.socials.linkedin} target="_blank" rel="noopener noreferrer" data-cursor className="link-underline hover:text-bone">LinkedIn</a>
            <span className="text-faint">Résumé</span>
            {regions.map((r) => (
              <a key={r.code} href={r.file} target="_blank" rel="noopener noreferrer" data-cursor className="link-underline text-smoke hover:text-bone">
                {r.code}
              </a>
            ))}
          </div>
        </div>
      </Block>
    </>
  );
}

function Block({ from, to, className = "", children }: { from: number; to: number; className?: string; children: React.ReactNode }) {
  return (
    <div className={`chap fixed z-20 opacity-0 ${className}`} data-from={from} data-to={to}>
      {children}
    </div>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-faint">{children}</p>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-end gap-3">
      <dd className="max-w-[32ch] font-body text-[12.5px] leading-snug text-smoke">{children}</dd>
      <dt className="w-16 shrink-0 font-mono text-[9.5px] uppercase tracking-[0.2em] text-faint">{label}</dt>
    </div>
  );
}

/** 0 outside [from,to], 1 in the middle, smooth fades at both edges. */
function windowOpacity(p: number, from: number, to: number) {
  const fade = 0.028;
  const rise = clamp01((p - from) / fade);
  const fall = clamp01((to - p) / fade);
  const t = Math.min(rise, fall);
  return t * t * (3 - 2 * t);
}
function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
