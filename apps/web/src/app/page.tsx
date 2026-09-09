import { Header } from "../components/marketing/Header.tsx";
import { Hero } from "../components/marketing/Hero.tsx";
import { TrustBar } from "../components/marketing/TrustBar.tsx";
import { HowItWorks } from "../components/marketing/HowItWorks.tsx";
import { WhatWeMove } from "../components/marketing/WhatWeMove.tsx";
import { Security } from "../components/marketing/Security.tsx";
import { BusinessAccounts } from "../components/marketing/BusinessAccounts.tsx";
import { ClosingCta } from "../components/marketing/ClosingCta.tsx";
import { Footer } from "../components/marketing/Footer.tsx";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <TrustBar />
        <HowItWorks />
        <WhatWeMove />
        <Security />
        <BusinessAccounts />
        <ClosingCta />
      </main>
      <Footer />
    </>
  );
}
