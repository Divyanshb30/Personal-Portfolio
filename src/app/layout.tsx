import type { Metadata } from "next";
import { Archivo, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Display: a wide, mission-grade grotesk (set expanded via font-stretch)
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
// Body
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
// Data, labels, instruments
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

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
      className={`${archivo.variable} ${geist.variable} ${geistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
