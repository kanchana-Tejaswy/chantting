import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import manifest from "@/app/manifest";
import { AppShell } from "@/components/layout/app-shell";
import { JapaMalaWheel } from "@/components/chant/japa-mala-wheel";
import { triggerBeadFeedback, unlockAudioContext } from "@/lib/chant/feedback";
import { Input, Textarea, FormField } from "@/components/ui/input";
import { ConsistencyHeatmap } from "@/components/sadhana/consistency-heatmap";
import { buildSadhanaAnalytics } from "@/lib/sadhana/analytics";

vi.mock("next/navigation", () => ({
  usePathname: () => "/sadhana/chant",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

describe("SMARAN Universal Cross-Platform & Responsive Compatibility", () => {
  describe("1. PWA, Manifest & Native Mobile Shell", () => {
    it("provides a valid Progressive Web App manifest with standalone display and sacred icons", () => {
      const m = manifest();
      expect(m.name).toContain("SMARAN");
      expect(m.short_name).toBe("SMARAN");
      expect(m.display).toBe("standalone");
      expect(m.scope).toBe("/");
      expect(m.start_url).toBe("/");
      expect(m.theme_color).toBe("#0C152B");
      expect(m.background_color).toBe("#0D1628");
      expect(m.icons).toBeDefined();
      expect(m.icons!.length).toBeGreaterThanOrEqual(2);
      expect(m.icons!.some((i) => i.purpose === "maskable")).toBe(true);
      expect(m.icons!.some((i) => i.purpose === "any")).toBe(true);
    });
  });

  describe("2. Viewport & Mobile iOS Safari Zoom Immunity", () => {
    it("renders form inputs with text-base on mobile (16px) to prevent iOS Safari auto-zoom", () => {
      const html = renderToStaticMarkup(
        <FormField id="test-email" label="Email Address">
          <Input id="test-email" type="email" placeholder="devotee@example.com" />
        </FormField>
      );
      // Must contain text-base to prevent iOS Safari from zooming into the viewport
      expect(html).toContain("text-base");
      expect(html).toContain("sm:text-sm");
      expect(html).toContain("min-h-11"); // 44px minimum touch target height
    });

    it("renders textarea with text-base on mobile to prevent iOS auto-zoom", () => {
      const html = renderToStaticMarkup(
        <FormField id="test-note" label="Sādhana Reflection">
          <Textarea id="test-note" placeholder="Write reflection..." />
        </FormField>
      );
      expect(html).toContain("text-base");
      expect(html).toContain("sm:text-sm");
    });
  });

  describe("3. Mobile Navigation & Responsive AppShell", () => {
    it("renders top mobile navbar with compact 36px touch targets and zero clipping", () => {
      const html = renderToStaticMarkup(
        <AppShell
          userSummary={{
            displayName: "Tejaswy Kanchana",
            email: "devotee@example.com",
            unreadNotificationsCount: 5,
          }}
        >
          <div>Sanctum Content</div>
        </AppShell>
      );

      // Notification Bell
      expect(html).toContain("Open notifications inbox (5 unread)");
      expect(html).toContain("size-9");

      // Devotee Avatar chip on mobile has size-9 and hidden sm:inline for name
      expect(html).toContain("Devotee Profile: Tejaswy Kanchana");
      expect(html).toContain("hidden sm:inline truncate");

      // Settings button is size-9 icon button on mobile and has text on sm+
      expect(html).toContain("Settings &amp; Privacy");

      // Language Selector is present and accessible
      expect(html).toContain("Select language");
    });

    it("renders mobile bottom navigation bar with balanced 4-column layout", () => {
      const html = renderToStaticMarkup(
        <AppShell>
          <div>Page Body</div>
        </AppShell>
      );

      const mobileNav = html.match(/<nav aria-label="Mobile navigation"[\s\S]*?<\/nav>/)?.[0] ?? "";
      // Must be grid-cols-4 (not grid-cols-5) for 4 navigation items
      expect(mobileNav).toContain("grid-cols-4");
      expect(mobileNav).not.toContain("grid-cols-5");

      // Must contain all 4 primary spaces
      expect(mobileNav).toContain("DṚṢṬI");
      expect(mobileNav).toContain("Japa");
      expect(mobileNav).toContain("Lakshya");
      expect(mobileNav).toContain("Satsang");
      expect(mobileNav).toContain("min-h-12"); // 48px touch height
    });
  });

  describe("4. Japa Mala Wheel Touch & Interaction Ergonomics", () => {
    it("renders Japa Mala central button with touch-manipulation and accessible tap bounds", () => {
      const onAdvance = vi.fn();
      const html = renderToStaticMarkup(
        <JapaMalaWheel
          currentBead={27}
          isPaused={false}
          isBusy={false}
          onAdvanceBead={onAdvance}
          sessionRounds={2}
          todayRounds={4}
        />
      );

      expect(html).toContain("touch-manipulation");
      expect(html).toContain("Advance to bead 28 of 108");
      expect(html).toContain("Bead Progress");
      expect(html).toContain("27");
      expect(html).toContain("/108");
      expect(html).toContain("Rounds today: 4");
    });
  });

  describe("5. Web Audio & Tactile Vibration Cross-Platform Fallbacks", () => {
    it("handles Web Audio unlock and bead feedback safely across platforms without throwing", () => {
      expect(() => {
        unlockAudioContext();
      }).not.toThrow();

      expect(() => {
        triggerBeadFeedback({
          soundEnabled: true,
          tactileEnabled: true,
          isRoundComplete: false,
        });
      }).not.toThrow();

      expect(() => {
        triggerBeadFeedback({
          soundEnabled: true,
          tactileEnabled: true,
          isRoundComplete: true,
        });
      }).not.toThrow();
    });

    it("handles environments where navigator.vibrate is undefined or unsupported gracefully", () => {
      // Simulate Safari or desktop browser without vibration
      const originalVibrate = (navigator as unknown as { vibrate?: unknown }).vibrate;
      delete (navigator as unknown as { vibrate?: unknown }).vibrate;

      expect(() => {
        triggerBeadFeedback({
          soundEnabled: false,
          tactileEnabled: true,
          isRoundComplete: true,
        });
      }).not.toThrow();

      if (originalVibrate) {
        (navigator as unknown as { vibrate?: unknown }).vibrate = originalVibrate;
      }
    });
  });

  describe("6. Consistency Heatmap Mobile Usability & Month Jump", () => {
    it("renders quick month jump buttons for mobile and touch devices", () => {
      const analytics = buildSadhanaAnalytics({
        rows: [],
        todayDate: "2026-11-23",
        selectedYear: 2026,
      });

      const html = renderToStaticMarkup(
        <ConsistencyHeatmap
          selectedYear={2026}
          currentYear={2026}
          todayDate="2026-11-23"
          weeks={analytics.weeks}
          initialDayDetail={{
            date: "2026-11-23",
            hasRecord: false,
            dailySadhana: null,
            sessions: [],
            records: [],
            ledgerEntry: null,
          }}
        />
      );

      // Mobile Quick Month Jump
      expect(html).toContain("Jump:");
      expect(html).toContain("Jan");
      expect(html).toContain("Nov");
      expect(html).toContain("Dec");

      // Cell buttons have expanded hit areas with touch-manipulation
      expect(html).toContain("touch-manipulation");
    });
  });
});
