import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { mockUsePathname } = vi.hoisted(() => ({
  mockUsePathname: vi.fn(() => "/"),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

import { AppShell } from "@/components/layout/app-shell";
import DesignSystemPage from "@/app/design-system/page";
import GitaLoading from "@/app/gita/loading";
import LibraryLoading from "@/app/library/loading";
import AccountLoading from "@/app/account/loading";
import SadhanaLoading from "@/app/sadhana/loading";
import RoomDetailLoading from "@/app/rooms/[slug]/loading";
import { Button } from "@/components/ui/button";
import { ProgressBar, SacredRingProgress } from "@/components/ui/progress";
import { FormField, Input } from "@/components/ui/input";

describe("Phase 2 UI components & responsive AppShell routes", () => {
  it("renders accessible Button variants with 44px touch heights and icon labels", () => {
    const html = renderToStaticMarkup(
      <Button variant="gold" size="icon" aria-label="Confirm check">
        OK
      </Button>
    );
    expect(html).toContain('aria-label="Confirm check"');
    expect(html).toContain("size-11");
    expect(html).toContain("active:scale-[0.96]");
  });

  it("renders ProgressBar and SacredRingProgress with ARIA progressbar semantics and tabular-nums", () => {
    const barHtml = renderToStaticMarkup(
      <ProgressBar value={8} max={16} label="Daily rounds" />
    );
    expect(barHtml).toContain('role="progressbar"');
    expect(barHtml).toContain('aria-valuenow="8"');
    expect(barHtml).toContain('aria-valuemax="16"');
    expect(barHtml).toContain("tabular-nums");

    const ringHtml = renderToStaticMarkup(
      <SacredRingProgress value={12} max={16} label="Ring progress" />
    );
    expect(ringHtml).toContain('role="progressbar"');
    expect(ringHtml).toContain("75%");
    expect(ringHtml).toContain("12/16");
  });

  it("renders FormField inline errors with aria-invalid", () => {
    const html = renderToStaticMarkup(
      <FormField id="devotee-name" label="Display Name" error="Required field">
        <Input id="devotee-name" hasError />
      </FormField>
    );
    expect(html).toContain('for="devotee-name"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('role="alert"');
    expect(html).toContain("Required field");
  });

  it("renders responsive AppShell navigation (desktop rail + mobile bottom bar) across all routes", () => {
    const routes = [
      () => (
        <AppShell pageTitle="SMARAN — स्मरण">
          <div>Sanctum</div>
        </AppShell>
      ),
      DesignSystemPage,
      GitaLoading,
      LibraryLoading,
      AccountLoading,
      SadhanaLoading,
      RoomDetailLoading,
    ];

    for (const PageComponent of routes) {
      const html = renderToStaticMarkup(<PageComponent />);
      expect(html).toContain('href="#main-content"');
      expect(html).toContain('aria-label="Primary navigation"');
      expect(html).toContain('aria-label="Mobile navigation"');
      const asideMatch = html.match(/<aside aria-label="Primary navigation"[\s\S]*?<\/aside>/)?.[0] ?? "";
      const mobileNavMatch = html.match(/<nav aria-label="Mobile navigation"[\s\S]*?<\/nav>/)?.[0] ?? "";
      expect(asideMatch).not.toContain(">Spiritual Library<");
      expect(asideMatch).not.toContain('href="/library"');
      expect(asideMatch).not.toContain(">Bhagavad Gītā<");
      expect(asideMatch).not.toContain('href="/gita"');
      expect(mobileNavMatch).not.toContain(">Library<");
      expect(mobileNavMatch).not.toContain('href="/library"');
      expect(mobileNavMatch).not.toContain(">Gītā<");
      expect(mobileNavMatch).not.toContain('href="/gita"');
      expect(html).not.toContain(">Chanting<");
      expect(html).toContain(">DṚṢṬI<");
      expect(html).toContain(">Japa<");
      expect(html).toContain(">Lakshya<");
      expect(html).toContain(">Satsang<");
      expect(html).toContain('href="/sadhana/chant"');
      expect(html).toContain('href="/sadhana"');
      expect(html).toContain("SMARAN");
      expect(html).toContain("स्मरण");
      expect(html).toContain("Remember Him. Stay Connected.");
      expect(html).toContain("safe-area-inset-bottom");
      expect(html).toContain("min-h-dvh");
      expect(html).not.toContain("h-screen");
    }
  });

  it("includes IAST and Devanagari typography classes on DesignSystemPage without inventing scripture", () => {
    const html = renderToStaticMarkup(<DesignSystemPage />);
    expect(html).toContain("font-devanagari");
    expect(html).toContain("font-display");
    expect(html).toContain("font-serif");
    expect(html).toContain("Vrindavan Dusk");
  });

  it("renders uploaded sidebar images on DṚṢṬI, Japa, Lakshya, and Satsang in active vs hover-inactive states with Bhagavad Gītā hidden from navbar", () => {
    const drstiPath = path.resolve(process.cwd(), "public/media/nav-drsti.jpg");
    expect(fs.existsSync(drstiPath)).toBe(true);
    expect(fs.statSync(drstiPath).size).toBe(62871);

    const japaPath = path.resolve(process.cwd(), "public/media/nav-japa.jpg");
    expect(fs.existsSync(japaPath)).toBe(true);
    expect(fs.statSync(japaPath).size).toBe(184365);

    const lakshyaPath = path.resolve(process.cwd(), "public/media/nav-lakshya.jpg");
    expect(fs.existsSync(lakshyaPath)).toBe(true);
    expect(fs.statSync(lakshyaPath).size).toBe(52422);

    const gitaPath = path.resolve(process.cwd(), "public/media/nav-gita.jpg");
    expect(fs.existsSync(gitaPath)).toBe(true);
    expect(fs.statSync(gitaPath).size).toBe(81310);

    const satsangPath = path.resolve(process.cwd(), "public/media/nav-satsang.jpg");
    expect(fs.existsSync(satsangPath)).toBe(true);
    expect(fs.statSync(satsangPath).size).toBe(82259);

    // 1. On "/" — DṚṢṬI is active (opacity-100) while Japa, Lakshya & Satsang stay hidden until hover
    mockUsePathname.mockReturnValue("/");
    const homeHtml = renderToStaticMarkup(
      <AppShell pageTitle="SMARAN — स्मरण">
        <div>Sanctum</div>
      </AppShell>
    );
    expect(homeHtml.match(/src="\/media\/nav-drsti\.jpg"/g) ?? []).toHaveLength(2);
    expect(homeHtml.match(/src="\/media\/nav-japa\.jpg"/g) ?? []).toHaveLength(2);
    expect(homeHtml.match(/src="\/media\/nav-lakshya\.jpg"/g) ?? []).toHaveLength(2);
    expect(homeHtml.match(/src="\/media\/nav-gita\.jpg"/g) ?? []).toHaveLength(0);
    expect(homeHtml.match(/src="\/media\/nav-satsang\.jpg"/g) ?? []).toHaveLength(2);
    expect(homeHtml).toContain("opacity-100");
    expect(
      homeHtml.match(/opacity-0 \[@media\(hover:hover\)\]:group-hover:opacity-100/g) ?? []
    ).toHaveLength(6);

    // 1b. On "/drsti" — DṚṢṬI is active (opacity-100)
    mockUsePathname.mockReturnValue("/drsti");
    const drstiHtml = renderToStaticMarkup(
      <AppShell pageTitle="DṚṢṬI">
        <div>Sanctum</div>
      </AppShell>
    );
    expect(drstiHtml.match(/src="\/media\/nav-drsti\.jpg"/g) ?? []).toHaveLength(2);
    expect(drstiHtml).toContain("opacity-100");

    // 2. On "/sadhana/chant" — Japa is active (opacity-100)
    mockUsePathname.mockReturnValue("/sadhana/chant");
    const japaHtml = renderToStaticMarkup(<SadhanaLoading />);
    expect(japaHtml.match(/src="\/media\/nav-japa\.jpg"/g) ?? []).toHaveLength(2);
    expect(japaHtml).toContain("opacity-100");

    // 3. On "/sadhana" — Lakshya is active (opacity-100)
    mockUsePathname.mockReturnValue("/sadhana");
    const lakshyaHtml = renderToStaticMarkup(<SadhanaLoading />);
    expect(lakshyaHtml.match(/src="\/media\/nav-lakshya\.jpg"/g) ?? []).toHaveLength(2);
    expect(lakshyaHtml).toContain("opacity-100");

    // 4. On "/gita" — Bhagavad Gītā is hidden from navbar (0 occurrences of nav-gita.jpg)
    mockUsePathname.mockReturnValue("/gita");
    const gitaHtml = renderToStaticMarkup(<GitaLoading />);
    expect(gitaHtml.match(/src="\/media\/nav-gita\.jpg"/g) ?? []).toHaveLength(0);

    // 5. On "/rooms" — Satsang is active (opacity-100)
    mockUsePathname.mockReturnValue("/rooms");
    const roomsHtml = renderToStaticMarkup(<RoomDetailLoading />);
    expect(roomsHtml.match(/src="\/media\/nav-satsang\.jpg"/g) ?? []).toHaveLength(2);
    expect(roomsHtml).toContain("opacity-100");

    // 6. On "/library" — all four image-backed items stay hidden until hover/focus (4 desktop + 4 mobile = 8)
    mockUsePathname.mockReturnValue("/library");
    const libraryHtml = renderToStaticMarkup(<LibraryLoading />);
    expect(
      libraryHtml.match(/opacity-0 \[@media\(hover:hover\)\]:group-hover:opacity-100/g) ?? []
    ).toHaveLength(8);

    // Restore default
    mockUsePathname.mockReturnValue("/");
  });
});
