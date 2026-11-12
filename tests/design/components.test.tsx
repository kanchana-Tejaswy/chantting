import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

import HomePage from "@/app/page";
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
      HomePage,
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
});
