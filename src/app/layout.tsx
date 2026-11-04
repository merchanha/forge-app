import type { Metadata } from "next";
import { Barlow_Condensed, Inter_Tight } from "next/font/google";

import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-inter-tight",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FORGE",
  description: "Build your training. Track your progress. Become stronger.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${barlowCondensed.variable} ${interTight.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
