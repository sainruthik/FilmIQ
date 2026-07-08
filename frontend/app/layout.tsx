import type { Metadata } from "next";
import { Instrument_Serif, Schibsted_Grotesk, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const schibstedGrotesk = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const splineSansMono = Spline_Sans_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FilmIQ — AI Film Acquisition Intelligence",
  description:
    "Upload your film documents. Our AI specialist team delivers a complete acquisition analysis with bid range in minutes.",
  openGraph: {
    title: "FilmIQ",
    description: "AI-powered film acquisition intelligence",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${schibstedGrotesk.variable} ${splineSansMono.variable}`}
    >
      <body className="min-h-screen bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
