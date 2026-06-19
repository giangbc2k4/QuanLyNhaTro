import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import FeatureShowcase from "@/components/landing/FeatureShowcase";
import StatsSection from "@/components/landing/StatsSection";
import HowItWorks from "@/components/landing/HowItWorks";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="relative">
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <FeaturesGrid />
        <FeatureShowcase />
        <HowItWorks />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
