import type { Metadata } from "next";
import { Header } from "../../components/marketing/Header.tsx";
import { Footer } from "../../components/marketing/Footer.tsx";
import {
  VisionHero,
  VisionStandard,
  VisionServices,
  VisionCompare,
  VisionArea,
  VisionAbout,
  VisionBusiness,
} from "../../components/vision/VisionSections.tsx";
import {
  VisionRoadmap,
  VisionFaq,
  VisionBooking,
} from "../../components/vision/VisionInteractive.tsx";
import vstyles from "../../components/vision/vision.module.css";

export const metadata: Metadata = {
  title: "Our Vision — Midway Mover",
  description:
    "One load. One vehicle. No consolidation. How Midway Mover runs private dedicated cargo in DFW — and where it's headed.",
};

export default function VisionPage() {
  return (
    <div className={vstyles.vision}>
      <Header />
      <main>
        <VisionHero />
        <VisionStandard />
        <VisionServices />
        <VisionCompare />
        <VisionArea />
        <VisionAbout />
        <section className={vstyles.section}>
          <div className="container">
            <VisionRoadmap />
          </div>
        </section>
        <VisionBusiness />
        <VisionFaq />
        <VisionBooking />
      </main>
      <Footer />
    </div>
  );
}
