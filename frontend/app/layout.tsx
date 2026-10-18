import type { Metadata } from "next";
import { Courier_Prime, Schibsted_Grotesk } from "next/font/google";
import { SmoothScroll } from "@/components/SmoothScroll";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

// FilmIQ's own words.
const grotesk = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
});

// The screenplay typeface: marks what came from the uploaded document.
const courier = Courier_Prime({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-doc",
  display: "swap",
});

// Runs before paint so a saved theme never flashes the default one.
// Maps the old theme names (memo, terminal) so returning users keep their choice.
const themeInit = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");t=t==="memo"?"draft":t==="terminal"?"screening":t;if(t==="draft"||t==="screening")document.documentElement.dataset.theme=t}catch(e){}`;

export const metadata: Metadata = {
  title: "FilmIQ: film acquisition due diligence",
  description:
    "Upload a film's script, press kit or financials. Seven analysts source every figure and return a bid range you can take to committee.",
  openGraph: {
    title: "FilmIQ",
    description: "Film acquisition due diligence with a sourced bid range",
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
      data-theme="draft"
      suppressHydrationWarning
      className={`${grotesk.variable} ${courier.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-[100dvh]">
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
