import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { TrustStrip } from "@/components/TrustStrip";
import { HowItWorks } from "@/components/HowItWorks";
import { CommandsGrid } from "@/components/CommandsGrid";
import { StreakNFTs } from "@/components/StreakNFTs";
import { HallOfFame } from "@/components/HallOfFame";
import { FAQ } from "@/components/FAQ";
import { CTABand } from "@/components/CTABand";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <TrustStrip />
        <HowItWorks />
        <CommandsGrid />
        <StreakNFTs />
        <HallOfFame />
        <CTABand />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
