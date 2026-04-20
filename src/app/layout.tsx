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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${fraunces.variable} ${jost.variable} ${plex.variable} antialiased`}
        data-accent="clay"
      >
        {children}
      </body>
    </html>
  );
}
