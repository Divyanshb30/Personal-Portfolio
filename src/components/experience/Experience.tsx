"use client";

import dynamic from "next/dynamic";
import Overlay from "@/components/scene/Overlay";
import Intelligence from "@/components/ui/Intelligence";

// The WebGL film never server-renders.
const FilmCanvas = dynamic(() => import("@/components/scene/FilmCanvas"), { ssr: false });

export default function Experience() {
  return (
    <>
      <FilmCanvas />
      <Overlay />
      <Intelligence />
    </>
  );
}
