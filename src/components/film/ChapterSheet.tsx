"use client";

import { useEffect, useRef } from "react";
import { PLACES, type Place } from "@/film/layout";
import { PROFILE, RESUME } from "@/film/data";

/**
 * The chapters, on a phone: a sheet that rises from the bottom, in the thumb's reach, with every
 * section a row. A row cuts straight there (behind the loading screen); the backdrop, ✕, Esc or a
 * drag down on its top closes it. The résumé and the email ride along at the bottom.
 */
export default function ChapterSheet({ open, place, onClose, onPick }: { open: boolean; place: Place; onClose: () => void; onPick: (p: Place) => void }) {
  const sheet = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  const drag = useRef({ id: -1, y0: 0, dy: 0, t0: 0 });

  useEffect(() => {
    if (!open) return;
    first.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // a drag down on the top of the sheet takes it with the finger; far or fast enough, and it goes
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest("button")) return;
    drag.current = { id: e.pointerId, y0: e.clientY, dy: 0, t0: performance.now() };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    sheet.current?.classList.add("dragging");
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (d.id !== e.pointerId || !sheet.current) return;
    d.dy = Math.max(0, e.clientY - d.y0);
    sheet.current.style.transform = `translateY(${d.dy}px)`;
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (d.id !== e.pointerId || !sheet.current) return;
    d.id = -1;
    sheet.current.classList.remove("dragging");
    sheet.current.style.transform = "";
    if (d.dy > 80 || d.dy / Math.max(1, performance.now() - d.t0) > 0.6) onClose();
  };

  return (
    <div className={`film-sheet-wrap${open ? " open" : ""}`} aria-hidden={!open} inert={!open}>
      <div className="film-sheet-backdrop" onClick={onClose} />
      <div ref={sheet} className="film-sheet" role="dialog" aria-modal="true" aria-label="Chapters">
        <div className="film-sheet-top" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <span className="grab" aria-hidden />
          <span className="mono sub">Chapters</span>
          <button type="button" className="mono sub film-x" onClick={onClose}>
            Close ✕
          </button>
        </div>
        <ol className="film-sheet-list">
          {PLACES.map((p, i) => (
            <li key={p}>
              <button ref={i === 0 ? first : undefined} type="button" className={p === place ? "on" : undefined} aria-current={p === place ? "true" : undefined} onClick={() => onPick(p)}>
                <span className="mono sub">{String(i + 1).padStart(2, "0")}</span>
                <span className="disp">{p}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="film-sheet-foot mono sub">
          <a href={RESUME} target="_blank" rel="noopener noreferrer">
            Résumé ↗
          </a>
          <a href={`mailto:${PROFILE.email}`}>Email ↗</a>
        </div>
      </div>
    </div>
  );
}
