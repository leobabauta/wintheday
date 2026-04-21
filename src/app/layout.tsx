import type { Metadata } from "next";
import { Fraunces, Jost, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
  display: "swap",
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

// ZHD uses IBM Plex Mono (warmer, less technical than JetBrains Mono).
// CSS custom property kept as --font-plex; update globals.css to match.
const plex = IBM_Plex_Mono({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Win the Day",
  description: "A small enough day to win.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

// Runs before first paint so theme + accent are applied without flash.
// Placed inline in <head> and targets documentElement so CSS vars cascade
// to html and body (keeps iOS rubber-band scroll matching the theme).
const prePaint = `
try {
  var t = localStorage.getItem('wtd.theme') || 'light';
  var a = localStorage.getItem('wtd.accent') || 'clay';
  var resolved = t === 'auto'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : t;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.accent = a;
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-accent="clay" data-theme="light">
      <head>
        <script dangerouslySetInnerHTML={{ __html: prePaint }} />
      </head>
      <body
        className={`${fraunces.variable} ${jost.variable} ${plex.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
