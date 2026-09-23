"use client";

import { useEffect, useRef } from "react";
import { film, CHAPTERS } from "@/lib/scroll";
import { identity, stack, journey, explore, now, profile, regions } from "@/lib/content";
import Nav from "@/components/ui/Nav";

/** 0 below a, 1 above b, smooth between. */
function smooth(x: number, a: number, b: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * A chapter's DOM content, faded in/out over a progress window via RAF (no
 * per-frame React re-render). Positioned to sit opposite the orb's drift.
 */
function Beat({
  a,
  b,
  className = "",
  children,
}: {
  a: number;
  b: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const m = 0.028;
    const loop = () => {
      const p = film.progress;
      const o = smooth(p, a, a + m) * (1 - smooth(p, b - m, b));
      const el = ref.current;
      if (el) {
        el.style.opacity = String(o);
        el.style.transform = `translateY(${(1 - o) * 12}px)`;
        el.style.pointerEvents = o > 0.6 ? "auto" : "none";
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [a, b]);
  return (
    <div ref={ref} className={`fixed z-20 ${className}`} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}

const flow = ["QUESTION", "EXPLORE", "UNDERSTAND", "BUILD"];

/**
 * The DOM layer over the film — recessive, chapter-by-chapter. Interface defers
 * to the world (Lusion). Real content from content.ts.
 */
export default function Overlay() {
  return (
    <>
      {/* scroll length — one anchor per chapter. pointer-events-none so clicks
          fall through to the 3D project hit-proxies underneath. */}
      <div className="pointer-events-none relative z-10">
        {CHAPTERS.map((c) => (
          <section key={c} id={c} className="h-[130svh]" aria-hidden />
        ))}
        <div className="h-[40svh]" aria-hidden />
      </div>

      <Nav />

      {/* 01 IDENTITY — name beside the figure, never over the face */}
      <Beat a={-0.05} b={0.09} className="bottom-[12%] left-6 md:left-14">
        <h1 className="font-display text-[10vw] font-semibold leading-[0.86] tracking-[-0.03em] text-bone md:text-[5.4rem]">
          {identity.name.split(" ")[0]}
          <br />
          {identity.name.split(" ")[1]}
        </h1>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.32em] text-smoke">
          {identity.roles.join(" · ")}
        </p>
        <p className="mt-2 max-w-[30ch] font-body text-[13px] leading-relaxed text-faint">
          {identity.line}
        </p>
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.4em] text-faint/70">move · explore</p>
      </Beat>

      {/* 02 THINK — how he thinks (right; orb sits left) */}
      <Beat a={0.11} b={0.22} className="right-6 top-1/2 -translate-y-1/2 text-right md:right-16">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.34em] text-smoke">How I think</p>
        <ul className="space-y-2">
          {flow.map((f, i) => (
            <li key={f} className="font-display text-[6vw] leading-[1.02] tracking-[-0.02em] text-bone md:text-[2rem]">
              <span className="mr-2 align-middle font-mono text-[11px] text-faint">{i + 1}</span>
              {f}
            </li>
          ))}
        </ul>
      </Beat>

      {/* 03 BUILD — the project universe is the content (3D). DOM stays a caption. */}
      <Beat a={0.24} b={0.36} className="bottom-[12%] left-6 md:left-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-smoke">What I build</p>
        <p className="mt-2 max-w-[30ch] font-body text-[13px] leading-relaxed text-faint">
          Five bodies of work, alive in space. Approach one to enter it.
        </p>
      </Beat>

      {/* 04 STACK — capability legend (the constellation carries the tech) */}
      <Beat a={0.38} b={0.49} className="bottom-[14%] left-6 md:left-16">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.34em] text-smoke">Underneath — the machinery</p>
        <ul className="flex flex-wrap gap-x-6 gap-y-1 max-w-[42ch]">
          {stack.map((s) => (
            <li key={s.cap} className="font-mono text-[11px] uppercase tracking-[0.18em] text-bone">{s.cap}</li>
          ))}
        </ul>
      </Beat>

      {/* 05 JOURNEY — the DTU ERP documentary (the ecosystem grows in 3D).
          The story is told as captions over the growing world; the arc frames it. */}
      <Beat a={0.51} b={0.665} className="bottom-[13%] left-6 md:left-16">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.34em] text-smoke">DTU ERP · a system that kept growing</p>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {journey.map((j) => (
            <span key={j.year} className="font-mono text-[10px] tracking-[0.12em] text-faint">
              <span className="text-smoke">{j.year}</span> {j.title}
            </span>
          ))}
        </div>
      </Beat>

      {/* DTU documentary captions — change as the world grows */}
      <Beat a={0.51} b={0.556} className="bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2 text-center">
        <p className="font-display text-[6vw] font-medium leading-tight tracking-[-0.02em] text-bone md:text-[2.4rem]">It started with one form.</p>
      </Beat>
      <Beat a={0.556} b={0.6} className="bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2 text-center">
        <p className="font-display text-[6vw] font-medium leading-tight tracking-[-0.02em] text-bone md:text-[2.4rem]">Then the problem kept growing.</p>
      </Beat>
      <Beat a={0.6} b={0.632} className="bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2 text-center">
        <p className="font-display text-[6vw] font-medium leading-tight tracking-[-0.02em] text-bone md:text-[2.4rem]">It became a department&rsquo;s platform.</p>
      </Beat>
      <Beat a={0.632} b={0.67} className="bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2 text-center">
        <p className="font-display text-[7vw] font-semibold leading-tight tracking-[-0.02em] text-bone md:text-[3rem]">2,000+ students. Still live.</p>
      </Beat>

      {/* 06 EXPLORE — deliberately broad (left; orb right) */}
      <Beat a={0.67} b={0.78} className="left-6 top-1/2 max-w-[36ch] -translate-y-1/2 md:left-16">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.34em] text-smoke">Beyond the title</p>
        <ul className="space-y-3">
          {explore.map((e) => (
            <li key={e.title}>
              <div className="font-display text-[1.4rem] tracking-[-0.01em] text-bone">{e.title}</div>
              <p className="max-w-[36ch] font-body text-[12px] leading-snug text-faint">{e.note}</p>
            </li>
          ))}
        </ul>
      </Beat>

      {/* 07 NOW — present tense (right) */}
      <Beat a={0.8} b={0.9} className="right-6 top-1/2 max-w-[34ch] -translate-y-1/2 text-right md:right-16">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.34em] text-smoke">Now</p>
        <p className="font-display text-[1.5rem] leading-snug tracking-[-0.01em] text-bone">{now.building}</p>
        <p className="mt-3 font-body text-[12.5px] leading-relaxed text-smoke">Exploring — {now.exploring}</p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">{now.open}</p>
      </Beat>

      {/* 08 HUMAN — the close */}
      <Beat a={0.94} b={1.06} className="inset-0 flex flex-col items-center justify-center gap-8 px-6 text-center">
        <h2 className="font-display text-[9vw] font-semibold leading-[0.9] tracking-[-0.03em] text-bone md:text-[4.6rem]">
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
      </Beat>
    </>
  );
}
