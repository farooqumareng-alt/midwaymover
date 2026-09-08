import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Midway Mover",
  description:
    "Private, dedicated small and mid-size load transportation. Private. Dedicated. Direct. Secure. Confidential.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
