import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// Self-hosted via next/font (no runtime request to Google Fonts, unlike a
// <link> tag — better performance and privacy, same typeface used in the
// approved homepage mockup).
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Midway Mover",
  description:
    "Private, dedicated small and mid-size load transportation. Private. Dedicated. Direct. Secure. Confidential.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={ibmPlexSans.variable}>
      <body>{children}</body>
    </html>
  );
}
