import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

import HomePage from "@/app/page";
import DesignSystemPage from "@/app/design-system/page";
import GitaLoading from "@/app/gita/loading";
import SadhanaLoading from "@/app/sadhana/loading";
import { VeoHeroBackground } from "@/components/sacred/veo-media-frame";

describe("Cinematic Lake Video Integration", () => {
  it("keeps the original Veo 3 lake-and-boat MP4 asset available in public/media", () => {
    const assetPath = path.resolve(
      process.cwd(),
      "public/media/vrindavan-lake-boat.mp4"
    );
    expect(fs.existsSync(assetPath)).toBe(true);
    const stat = fs.statSync(assetPath);
    expect(stat.size).toBe(3044368);
  });

  it("renders HomePage hero with muted looping playsInline background video, gradient overlay, static fallback, and reduced-motion hooks", () => {
    const html = renderToStaticMarkup(<HomePage />);

    expect(html).toContain('src="/media/vrindavan-lake-boat.mp4"');
    expect(html).toContain("<video");
    expect(html).toContain("muted");
    expect(html).toContain("loop");
    expect(html).toContain("playsInline");
    expect(html).toContain("autoPlay");
    expect(html).toContain('preload="auto"');
    expect(html).toContain("object-cover object-center");
    expect(html).toContain("pointer-events-none");
    expect(html).toContain("motion-reduce:hidden");
    expect(html).toContain('data-veo-motion="video"');
    expect(html).toContain('data-veo-scrim="neutral"');
    expect(html).toContain("min-h-[calc(100dvh-7.25rem-env(safe-area-inset-bottom))]");
    expect(html).toContain("lg:min-h-[calc(100dvh-3.5rem-1px)]");
    expect(html).toContain("rgba(10,12,16,0)");
    expect(html).not.toContain("from-krishna-midnight");
    expect(html).not.toContain("262/");
    expect(html).not.toContain("185/");
    expect(html).toContain("<svg");
    expect(html).toContain('aria-label="Pause ambient lake scene"');
  });

  it("supports an explicit poster fallback image alongside non-blocking backdrop layering", () => {
    const html = renderToStaticMarkup(
      <VeoHeroBackground
        videoSrc="/media/vrindavan-lake-boat.mp4"
        posterUrl="/media/lake-poster.jpg"
        alt="Vrindavan twilight lake with boat"
      />
    );

    expect(html).toContain('src="/media/lake-poster.jpg"');
    expect(html).toContain('poster="/media/lake-poster.jpg"');
    expect(html).toContain("pointer-events-none absolute inset-0 overflow-hidden");
    expect(html).toContain("z-20");
    expect(html).toContain("object-cover");
  });

  it("does not inject the 3 MB hero video asset onto unrelated subpages", () => {
    const pages = [DesignSystemPage, GitaLoading, SadhanaLoading];
    for (const Page of pages) {
      const html = renderToStaticMarkup(<Page />);
      expect(html).not.toContain("vrindavan-lake-boat.mp4");
    }
  });
});

