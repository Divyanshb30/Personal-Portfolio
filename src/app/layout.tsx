import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, Martian_Mono } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/providers/SmoothScroll";
import Cursor from "@/components/ui/Cursor";

// Display — monumental, humanist-industrial (person's name, scene titles)
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});
// Body/UI — clean workhorse
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});
// Instrument — telemetry, HUD labels, agent readouts
const martian = Martian_Mono({
  subsets: ["latin"],
  variable: "--font-martian",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Divyansh Bansal — AI Engineer",
  description:
    "AI Engineer building production agentic systems at Amdocs (AT&T). Five agents live in production, a published method, a transformer from scratch. Open to senior AI roles worldwide.",
  metadataBase: new URL("https://divyanshbansal.vercel.app"),
  openGraph: {
    title: "Divyansh Bansal — AI Engineer",
    description:
      "Production agentic AI systems, shipped at telecom scale. Open to senior AI roles worldwide.",
    type: "website",
  },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${hanken.variable} ${martian.variable}`}
    >
      <body className="grain">
        <Cursor />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
