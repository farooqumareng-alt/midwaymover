{/* deploy-trigger: re-run Vercel build */}
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Sans } from "next/font/google";
import Script from "next/script";
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

// Google Analytics 4 measurement ID (public by design — visible in page source).
const GA_MEASUREMENT_ID = "G-VX4SY2N0X7";

export const metadata: Metadata = {
  title: "Midway Mover",
  description:
    "Private, dedicated small and mid-size load transportation. Private. Dedicated. Direct. Secure. Confidential.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={ibmPlexSans.variable}>
      <body>{children}</body>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag("js", new Date());gtag("config", "${GA_MEASUREMENT_ID}");`}
      </Script>
    </html>
  );
}
