/**
 * SMARAN (स्मरण) — Canonical Design Tokens (Phase 2)
 *
 * Palette grounded in Pahari/Rajasthani devotional manuscripts,
 * Yamuna twilight, peacock plumage, antique gold leaf, warm ivory paper,
 * and muted sandalwood.
 */

export const PALETTE = {
  // Midnight Krishna & Deep Peacock Blues
  krishnaMidnight: "#0C152B",
  krishnaElevated: "#132244",
  peacockDeep: "#16325B",
  peacockSlate: "#214875",

  // Peacock Green & Tulsi
  peacockGreen: "#145B51",
  peacockEmeraldInk: "#114E45",
  tulsiTint: "#E5EFEA",

  // Antique Gold
  antiqueGold: "#C79A3B",
  antiqueGoldBorder: "#B4862E",
  burnishedGoldInk: "#78520F",
  goldWash: "#F5ECD8",

  // Warm Ivory & Sandalwood
  warmIvory: "#FAF6EC",
  ivoryPaper: "#FFFDF8",
  sandalwoodLinen: "#F2EBD9",
  sandalwoodBorder: "#DDD1B8",
  sandalwoodStrong: "#C4B496",

  // Ink Hierarchy
  midnightInk: "#111B33",
  sandalwoodUmber: "#524B3E",
  ivoryOnDark: "#F7F1E3",
  sandalwoodOnDark: "#C9BEAA",

  // Semantic Destructive (Sacred Kumkum)
  kumkum: "#9E2F26",
  kumkumSurface: "#FAECE9",
} as const;

export const Z_INDEX = {
  base: 0,
  raised: 10,
  sticky: 20,
  nav: 30,
  overlay: 40,
  modal: 50,
  toast: 60,
} as const;

export const RADII = {
  control: "10px",
  inner: "12px",
  card: "16px",
  sanctum: "20px",
  pill: "9999px",
} as const;

export const SPACING = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
  "3xl": "4rem",
} as const;

export const CONTRAST_PAIRS = [
  { name: "Light primary body ink", fg: PALETTE.midnightInk, bg: PALETTE.warmIvory, minRatio: 4.5 },
  { name: "Light secondary umber ink", fg: PALETTE.sandalwoodUmber, bg: PALETTE.warmIvory, minRatio: 4.5 },
  { name: "Light linen body ink", fg: PALETTE.midnightInk, bg: PALETTE.sandalwoodLinen, minRatio: 4.5 },
  { name: "Light linen umber ink", fg: PALETTE.sandalwoodUmber, bg: PALETTE.sandalwoodLinen, minRatio: 4.5 },
  { name: "Primary button text", fg: PALETTE.ivoryOnDark, bg: PALETTE.peacockDeep, minRatio: 4.5 },
  { name: "Peacock emerald ink on ivory", fg: PALETTE.peacockEmeraldInk, bg: PALETTE.warmIvory, minRatio: 4.5 },
  { name: "Burnished gold ink on ivory", fg: PALETTE.burnishedGoldInk, bg: PALETTE.warmIvory, minRatio: 4.5 },
  { name: "Destructive kumkum button", fg: PALETTE.ivoryPaper, bg: PALETTE.kumkum, minRatio: 4.5 },
  { name: "Sanctum dark primary ink", fg: PALETTE.ivoryOnDark, bg: PALETTE.krishnaMidnight, minRatio: 4.5 },
  { name: "Sanctum dark muted ink", fg: PALETTE.sandalwoodOnDark, bg: PALETTE.krishnaMidnight, minRatio: 4.5 },
  { name: "Sanctum gold accent text", fg: PALETTE.antiqueGold, bg: PALETTE.krishnaMidnight, minRatio: 4.5 },
  { name: "Sanctum elevated card ink", fg: PALETTE.ivoryOnDark, bg: PALETTE.krishnaElevated, minRatio: 4.5 },
] as const;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Computes WCAG 2.1 contrast ratio between two hex colors.
 */
export function getContrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(hexToRgb(fgHex));
  const l2 = relativeLuminance(hexToRgb(bgHex));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

