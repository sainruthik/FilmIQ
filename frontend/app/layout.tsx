import type { Metadata } from "next";
import { Cormorant_Garamond, Figtree, JetBrains_Mono, IBM_Plex_Sans } from "next/font/google";
import { MotionProvider } from "@/components/MotionProvider";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

// Memo theme fonts
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-figtree",
  display: "swap",
});

// Terminal theme fonts
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});
const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});

// Runs before paint so a saved theme never flashes the default one.
const themeInit = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="memo"||t==="terminal")document.documentElement.dataset.theme=t}catch(e){}`;

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
      data-theme="memo"
      suppressHydrationWarning
      className={`${cormorant.variable} ${figtree.variable} ${jetbrains.variable} ${plex.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-screen antialiased">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
