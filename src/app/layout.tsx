import type { Metadata } from "next";
import { Archivo, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Display: a wide, mission-grade grotesk (set expanded via font-stretch)
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
// Body
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
// Data, labels, instruments
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

// What a shared link shows. The favicon, the home-screen icon and the share image live beside this file
// (favicon.ico, apple-icon.png, opengraph-image.png, twitter-image.png) and are picked up by Next.
export const metadata: Metadata = {
  metadataBase: new URL("https://www.divyansh-bansal.space"),
  title: "Divyansh Bansal",
  description: "Perpetually Curious",
  openGraph: {
    title: "Divyansh Bansal",
    description: "Perpetually Curious",
    url: "/",
    siteName: "Divyansh Bansal",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Divyansh Bansal",
    description: "Perpetually Curious",
  },
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
