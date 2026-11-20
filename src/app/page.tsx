import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingIntro } from "@/components/landing/landing-intro";
import { LandingExperience } from "@/components/landing/landing-experience";
import { LandingJourney } from "@/components/landing/landing-journey";
import { LandingPrivacy } from "@/components/landing/landing-privacy";
import { LandingCta } from "@/components/landing/landing-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function HomePage() {
  return (
    <div className="flex flex-col w-full min-h-dvh bg-[#140E10] text-white selection:bg-[#7A2638]/40 selection:text-[#FDF1F3]">
      {/* Standalone In-Page Sacred Navbar */}
      <LandingNavbar />

      {/* Cinematic Vrindavan Hero Section */}
      <LandingHero />

      {/* Sacred Introduction & Purpose */}
      <LandingIntro />

      {/* The Four Core Product Spaces: Dṛṣṭi, Japa, Lakshya, Satsang */}
      <LandingExperience />

      {/* The Devotional Journey & Practice Previews */}
      <LandingJourney />

      {/* Sacred Privacy & Personal Practice Commitments */}
      <LandingPrivacy />

      {/* Final Devotional Call to Action */}
      <LandingCta />

      {/* Devotional Footer */}
      <LandingFooter />
    </div>
  );
}
