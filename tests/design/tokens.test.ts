import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cn } from "@/lib/cn";
import {
  CONTRAST_PAIRS,
  PALETTE,
  Z_INDEX,
  getContrastRatio,
} from "@/lib/design/tokens";

describe("Phase 2 design tokens & accessibility contrast", () => {
  it("satisfies WCAG AA contrast (>= 4.5:1) across all paired tokens", () => {
    for (const pair of CONTRAST_PAIRS) {
      const ratio = getContrastRatio(pair.fg, pair.bg);
      expect(ratio, `${pair.name} (${pair.fg} on ${pair.bg})`).toBeGreaterThanOrEqual(
        pair.minRatio
      );
    }
  });

  it("maintains strictly monotonic z-index scale", () => {
    expect(Z_INDEX.base).toBeLessThan(Z_INDEX.raised);
    expect(Z_INDEX.raised).toBeLessThan(Z_INDEX.sticky);
    expect(Z_INDEX.sticky).toBeLessThan(Z_INDEX.nav);
    expect(Z_INDEX.nav).toBeLessThan(Z_INDEX.overlay);
    expect(Z_INDEX.overlay).toBeLessThan(Z_INDEX.modal);
    expect(Z_INDEX.modal).toBeLessThan(Z_INDEX.toast);
  });

  it("merges Tailwind classes cleanly via cn()", () => {
    expect(cn("px-4 py-2 text-sm", "px-6", false && "hidden")).toBe(
      "py-2 text-sm px-6"
    );
  });

  it("defines CSS variables and reduced-motion rules in globals.css matching PALETTE", () => {
    const css = fs.readFileSync(
      path.resolve(process.cwd(), "src", "app", "globals.css"),
      "utf8"
    );
    expect(css.toLowerCase()).toContain(PALETTE.krishnaMidnight.toLowerCase());
    expect(css.toLowerCase()).toContain(PALETTE.warmIvory.toLowerCase());
    expect(css.toLowerCase()).toContain(PALETTE.antiqueGold.toLowerCase());
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});

