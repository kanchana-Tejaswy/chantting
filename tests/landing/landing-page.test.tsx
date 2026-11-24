import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import HomePage from "@/app/page";

describe("SMARAN — Premium Landing Page Implementation", () => {
  it("renders the complete landing page with all 8 required sections and authentic devotional copy", () => {
    const html = renderToStaticMarkup(<HomePage />);

    // 1. Navigation
    expect(html).toContain("SMARAN");
    expect(html).toContain("स्मरण");
    expect(html).toContain('href="#experience"');
    expect(html).toContain('href="#journey"');
    expect(html).toContain('href="#about"');
    expect(html).toContain('href="#privacy"');
    expect(html).toContain('href="/auth"');
    expect(html).toContain('href="/auth?next=/sadhana"');
    expect(html).toContain("Sign In");
    expect(html).toContain("Begin Your Journey");

    // 2. Hero Section
    expect(html).toContain("SMARAN");
    expect(html).toContain("स्मरण");
    expect(html).toContain("One mantra at a time.");
    expect(html).toContain(
      "A peaceful space to build your chanting practice, deepen your devotion and stay connected with Krishna."
    );
    expect(html).toContain("Begin Your Journey");
    expect(html).toContain("Explore SMARAN");
    expect(html).toContain("हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे");
    expect(html).toContain("Private chanting records by default");

    // 3. Introduction Section
    expect(html).toContain("Make remembrance a part of your everyday life.");
    expect(html).toContain("Chanting the holy names of Lord Krishna");
    expect(html).toContain("Nitya Sādhana");
    expect(html).toContain("Pavitra Sankalpa");

    // 4. Experience SMARAN (4 core areas)
    expect(html).toContain("Experience SMARAN");
    expect(html).toContain("Dṛṣṭi");
    expect(html).toContain("Japa");
    expect(html).toContain("Lakshya");
    expect(html).toContain("Satsang");
    expect(html).toContain("/sadhana/chant");
    expect(html).toContain("/sadhana");
    expect(html).toContain("/rooms");

    // 5. Your Spiritual Journey
    expect(html).toContain("Your Spiritual Journey");
    expect(html).toContain("Building a Consistent Daily Practice");
    expect(html).toContain("Graceful Daily Carry-Forward");
    expect(html).toContain("Sacred Sankalpa Vows");
    expect(html).toContain("Honest Annual Heatmap");
    expect(html).toContain("Devotional Fellowship");

    // 6. Privacy & Personal Practice
    expect(html).toContain("Privacy &amp; Personal Practice");
    expect(html).toContain("Private by Default");
    expect(html).toContain("Voluntary Sharing");
    expect(html).toContain("Instant Revocation");
    expect(html).toContain("Zero Competition");

    // 7. Final Call to Action
    expect(html).toContain("Let remembrance become a part of your day.");
    expect(html).toContain("Start wherever you are. Begin with one round.");
    expect(html).toContain("Begin Your Journey");

    // 8. Footer
    expect(html).toContain("Remember Him. Stay Connected.");
    expect(html).toContain("© 2026 SMARAN");
    expect(html).toContain("Non-profit devotional platform dedicated to Sri Krishna.");
  });

  it("strictly excludes postponed reading modules and fabricated metrics from landing page", () => {
    const html = renderToStaticMarkup(<HomePage />);

    // Must NOT contain Bhagavad Gita learning centre, spiritual library, or books in landing content
    expect(html).not.toContain("Bhagavad Gītā Centre");
    expect(html).not.toContain("Spiritual Library");
    expect(html).not.toContain("Explore 18 Chapters");
    expect(html).not.toContain("Browse Library");

    // Must NOT contain fake testimonials or fabricated user count claims
    expect(html).not.toContain("10,000+ active devotees");
    expect(html).not.toContain("5-star reviews");
    expect(html).not.toContain("rated 4.9");
  });

  it("strictly excludes AppShell, application sidebar, dashboard navigation, and authenticated UI from the public landing page", () => {
    const html = renderToStaticMarkup(<HomePage />);

    // Must NOT render AppShell primary navigation aside or mobile bottom bar
    expect(html).not.toContain('aria-label="Primary navigation"');
    expect(html).not.toContain('aria-label="Mobile navigation"');
    expect(html).not.toContain('href="#main-content"');

    // Must NOT render authenticated profile or sign-out options
    expect(html).not.toContain("Sign out");
    expect(html).not.toContain("devotee-profile");

    // Must contain only minimal in-page anchor navigation and auth CTAs
    expect(html).toContain('href="#experience"');
    expect(html).toContain('href="#journey"');
    expect(html).toContain('href="#privacy"');
    expect(html).toContain('href="/auth"');
    expect(html).toContain('href="/auth?next=/sadhana"');
  });

  it("verifies universal responsive and mobile screen adaptations across landing sections", () => {
    const html = renderToStaticMarkup(<HomePage />);

    // 1. Mobile & desktop responsive button labels in navbar
    expect(html).toContain("Begin</span>");
    expect(html).toContain("Begin Your Journey</span>");

    // 2. Responsive hero heading typography
    expect(html).toContain("text-4xl xs:text-5xl");

    // 3. Full-width mobile CTA buttons with inline desktop progression
    expect(html).toContain("w-full xs:w-auto");

    // 4. Lakshya overlay responsive labels to prevent text squishing on mobile
    expect(html).toContain("Base Target");
    expect(html).toContain("Daily Base Target");
    expect(html).toContain("Carried");
    expect(html).toContain("Yesterday Balance");
    expect(html).toContain("Effective");
    expect(html).toContain("Today Effective Target");

    // 5. Responsive rhythm and flex containers
    expect(html).toContain("flex-col xs:flex-row");
  });
});

