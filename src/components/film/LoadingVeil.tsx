"use client";

import { useEffect, useRef, useState } from "react";
import { LOADING_LINES } from "@/film/data";

type Grain = { x: number; y: number; tx: number; ty: number; vx: number; vy: number; delay: number; life: number; size: number; tint: number };

/** Where the letters of the line are on screen, as points (CSS pixels), from its rendered font. */
function letterPoints(el: HTMLElement, max = 1800) {
  const r = el.getBoundingClientRect(), cs = getComputedStyle(el), dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.ceil(r.width * dpr), h = Math.ceil(r.height * dpr);
  if (!w || !h) return [];
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const g = cv.getContext("2d")!;
  const size = parseFloat(cs.fontSize) * dpr, ls = (parseFloat(cs.letterSpacing) || 0) * dpr;
  g.font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
  g.fillStyle = "#fff";
  g.textBaseline = "middle";
  let x = 0;
  for (const ch of (el.textContent || "").toUpperCase()) {
    g.fillText(ch, x, h / 2);
    x += g.measureText(ch).width + ls;
  }
  const px = g.getImageData(0, 0, w, h).data, pts: [number, number][] = [], step = Math.max(1, Math.round(dpr));
  for (let y = 0; y < h; y += step) for (let xx = 0; xx < w; xx += step) if (px[(y * w + xx) * 4 + 3] > 110) pts.push([r.left + xx / dpr, r.top + y / dpr]);
  while (pts.length > max) pts.splice(Math.floor(Math.random() * pts.length), 1);
  return pts;
}

/**
 * The loading screen. A line with dots that keep filling in, on the dark. When it lets the film
 * through, the line dissolves into ember dust that drifts up while the scene fades in; when it
 * covers a jump, dust drifts in from everywhere and gathers into the line while the scene dims.
 */
export default function LoadingVeil({ covered, failed }: { covered: boolean; failed: boolean }) {
  const [line, setLine] = useState(0);
  const [dots, setDots] = useState(1);
  const lineEl = useRef<HTMLSpanElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const grains = useRef<Grain[]>([]), mode = useRef<"out" | "in" | null>(null), t0 = useRef(0), raf = useRef(0), done = useRef<(() => void) | null>(null);
  const first = useRef(true), busy = useRef(false);

  // the line and its dots, only while the screen is covered
  useEffect(() => {
    if (!covered) return;
    const n = LOADING_LINES.length;
    const a = window.setInterval(() => setDots((d) => (d % 3) + 1), 380);
    const b = window.setInterval(() => {
      if (!busy.current) setLine((i) => (i + 1 + Math.floor(Math.random() * (n - 1))) % n);
    }, 2500);
    return () => {
      window.clearInterval(a);
      window.clearInterval(b);
    };
  }, [covered]);

  useEffect(() => {
    const cv = canvas.current, text = lineEl.current;
    if (!cv || !text) return;
    const g = cv.getContext("2d")!, dpr = Math.min(2, window.devicePixelRatio || 1);
    const fit = () => {
      cv.width = window.innerWidth * dpr;
      cv.height = window.innerHeight * dpr;
    };
    fit();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const frame = (now: number) => {
      const t = (now - t0.current) / 1000;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, cv.width, cv.height);
      let alive = 0;
      for (const p of grains.current) {
        const u = t - p.delay;
        let a = 0, x = p.x, y = p.y;
        if (mode.current === "out") {
          // loosen from the letter, drift up and out, fade
          const k = Math.max(0, u);
          x = p.tx + p.vx * k + Math.sin(k * 3 + p.tint * 9) * 6 * k;
          y = p.ty + p.vy * k - 14 * k * k;
          a = u < 0 ? 1 : Math.max(0, 1 - u / p.life);
        } else {
          // come in from wherever it was, settle on the letter
          const k = Math.min(1, Math.max(0, u / 0.75)), e = 1 - Math.pow(1 - k, 3);
          x = p.x + (p.tx - p.x) * e + Math.sin(t * 4 + p.tint * 7) * 5 * (1 - e);
          y = p.y + (p.ty - p.y) * e;
          a = Math.min(1, Math.max(0, u / 0.25)) * (t > 1.05 ? Math.max(0, 1 - (t - 1.05) / 0.25) : 1);
        }
        if (a <= 0.01) continue;
        alive++;
        g.fillStyle = `rgba(255,${190 + Math.round(p.tint * 45)},${140 + Math.round(p.tint * 60)},${a.toFixed(3)})`;
        g.fillRect(x, y, p.size, p.size);
      }
      if (mode.current === "in" && t > 1.0 && done.current) {
        done.current();
        done.current = null;
      }
      if (alive > 0 || (mode.current === "in" && t < 1.3)) raf.current = requestAnimationFrame(frame);
      else {
        g.clearRect(0, 0, cv.width, cv.height);
        mode.current = null;
        busy.current = false;
      }
    };
    const run = (m: "out" | "in") => {
      cancelAnimationFrame(raf.current);
      mode.current = m;
      busy.current = true;
      t0.current = performance.now();
      raf.current = requestAnimationFrame(frame);
    };

    if (first.current) {
      first.current = false;
      if (covered) return; // the first load starts covered: nothing to animate yet
    }
    if (!covered) {
      // out: the letters become dust and the film comes up behind them
      if (!reduce) {
        const r = text.getBoundingClientRect();
        grains.current = letterPoints(text).map(([x, y]) => ({
          x, y, tx: x, ty: y,
          vx: (x - (r.left + r.width / 2)) * 0.25 + (Math.random() - 0.5) * 30,
          vy: -(18 + Math.random() * 46),
          delay: ((x - r.left) / Math.max(1, r.width)) * 0.3 + Math.random() * 0.12,
          life: 0.9 + Math.random() * 0.6,
          size: 1 + Math.random() * 0.8,
          tint: Math.random(),
        }));
        run("out");
      }
      text.style.opacity = "0";
    } else {
      // in: dust from everywhere gathers into the line, then the crisp line takes over
      text.style.opacity = "0";
      if (reduce) {
        text.style.opacity = "1";
        return;
      }
      const W = window.innerWidth, H = window.innerHeight;
      grains.current = letterPoints(text).map(([tx, ty]) => {
        const edge = Math.random() < 0.5;
        return {
          x: edge ? (Math.random() < 0.5 ? -20 : W + 20) : Math.random() * W,
          y: edge ? Math.random() * H : Math.random() < 0.5 ? -20 : H + 20,
          tx, ty, vx: 0, vy: 0,
          delay: Math.random() * 0.25,
          life: 1,
          size: 1 + Math.random() * 0.8,
          tint: Math.random(),
        };
      });
      done.current = () => {
        text.style.opacity = "1";
      };
      run("in");
    }
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [covered]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return (
    <>
      <div className={`film-loading mono sub${covered ? " cover" : " done"}`} aria-hidden={!covered}>
        {failed ? (
          "This film needs WebGL. Try a recent desktop browser."
        ) : (
          <span ref={lineEl} className="film-loading-line">
            <span key={line} className="film-loading-words">
              {LOADING_LINES[line]}
            </span>
            <span className="film-loading-dots">{".".repeat(dots)}</span>
          </span>
        )}
      </div>
      <canvas ref={canvas} className="film-loading-dust" aria-hidden />
    </>
  );
}
