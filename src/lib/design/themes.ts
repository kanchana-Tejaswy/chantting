import * as React from "react";

/**
 * SMARAN (स्मरण) — Devotional Theme System
 *
 * Canonical Theme: Padmaraga Lotus Sanctum (Warm Lotus & Terracotta)
 * Inspired by sacred pink lotuses at Radha Kund, warm temple terracotta,
 * rosewood sandalwood, and radiant temple gold.
 * Meticulously calibrated to exceed WCAG AA contrast (>= 4.5:1).
 */

export type DevotionalThemeId = "padmaraga-lotus";

export const DEFAULT_THEME_ID: DevotionalThemeId = "padmaraga-lotus";

export interface ThemeSwatch {
  name: string;
  token: string;
  hex: string;
  dark: boolean;
}

export interface ContrastPairSpec {
  name: string;
  fg: string;
  bg: string;
  ratio: string;
}

export interface DevotionalTheme {
  id: DevotionalThemeId;
  name: string;
  hindi: string;
  tag: string;
  description: string;
  isDark: boolean;
  previewColors: string[];
  swatches: ThemeSwatch[];
  contrastPairs: ContrastPairSpec[];
}

export const PADMARAGA_LOTUS_THEME: DevotionalTheme = {
  id: "padmaraga-lotus",
  name: "Padmaraga Lotus Sanctum",
  hindi: "पद्मराग कमल गर्भगृह",
  tag: "Warm Lotus & Terracotta",
  description:
    "Inspired by sacred pink lotuses at Radha Kund, warm temple terracotta, and rosewood sandalwood.",
  isDark: false,
  previewColors: ["#1A1315", "#7A2638", "#9E364C", "#C29438", "#FAF7F2", "#665F55"],
  swatches: [
    { name: "Midnight Sanctum", token: "--ks-krishna-midnight", hex: "#1A1315", dark: true },
    { name: "Lotus Crimson", token: "--ks-peacock-deep", hex: "#7A2638", dark: true },
    { name: "Rose Crimson", token: "--ks-peacock-green", hex: "#9E364C", dark: true },
    { name: "Radiant Temple Gold", token: "--ks-gold-antique", hex: "#C29438", dark: false },
    { name: "Warm Alabaster", token: "--ks-ivory", hex: "#FAF7F2", dark: false },
    { name: "Rose Sandalwood Linen", token: "--ks-linen", hex: "#F4EFE6", dark: false },
    { name: "Muted Umber", token: "--ks-ink-muted", hex: "#665F55", dark: true },
    { name: "Sacred Kumkum", token: "--ks-kumkum", hex: "#A24136", dark: true },
  ],
  contrastPairs: [
    { name: "Primary ink on alabaster", fg: "#1F1D1A", bg: "#FAF7F2", ratio: "15.3:1" },
    { name: "Muted ink on alabaster", fg: "#665F55", bg: "#FAF7F2", ratio: "5.8:1" },
    { name: "Primary ink on rose linen", fg: "#1F1D1A", bg: "#F4EFE6", ratio: "14.2:1" },
    { name: "Muted ink on rose linen", fg: "#665F55", bg: "#F4EFE6", ratio: "5.4:1" },
    { name: "Primary button text", fg: "#FBF5F6", bg: "#7A2638", ratio: "9.8:1" },
    { name: "Rose crimson ink on alabaster", fg: "#4F1220", bg: "#FAF7F2", ratio: "11.2:1" },
    { name: "Burnished gold ink on alabaster", fg: "#7E5B13", bg: "#FAF7F2", ratio: "6.2:1" },
    { name: "Destructive kumkum button", fg: "#FFFFFF", bg: "#A24136", ratio: "6.8:1" },
    { name: "Sanctum dark primary ink", fg: "#FBF5F6", bg: "#1A1315", ratio: "15.8:1" },
    { name: "Sanctum dark muted ink", fg: "#D6CBCF", bg: "#1A1315", ratio: "10.4:1" },
    { name: "Sanctum gold accent text", fg: "#C29438", bg: "#1A1315", ratio: "6.9:1" },
    { name: "Sanctum elevated card ink", fg: "#FBF5F6", bg: "#261C20", ratio: "13.6:1" },
  ],
};

export const DEVOTIONAL_THEMES: DevotionalTheme[] = [PADMARAGA_LOTUS_THEME];

export const THEME_STORAGE_KEY = "smaran-theme";

export function getStoredTheme(): DevotionalThemeId {
  return "padmaraga-lotus";
}

export function applyTheme(): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", "padmaraga-lotus");
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, "padmaraga-lotus");
    window.dispatchEvent(
      new CustomEvent("smaran:theme-changed", { detail: { themeId: "padmaraga-lotus" } })
    );
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export function previewTheme(): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", "padmaraga-lotus");
}

export type DevotionalFontSize = "compact" | "normal" | "large" | "serene";

export interface FontSizeOption {
  id: DevotionalFontSize;
  label: string;
  shortLabel: string;
  px: number;
  rem: string;
}

export const FONT_SIZES: FontSizeOption[] = [
  { id: "compact", label: "Compact (14px)", shortLabel: "14px", px: 14, rem: "0.875rem" },
  { id: "normal", label: "Normal (16px · Default)", shortLabel: "16px · Default", px: 16, rem: "1rem" },
  { id: "large", label: "Large (18px)", shortLabel: "18px", px: 18, rem: "1.125rem" },
  { id: "serene", label: "Serene (20px)", shortLabel: "20px", px: 20, rem: "1.25rem" },
];

export const FONT_SIZE_STORAGE_KEY = "smaran-font-size";

export function getStoredFontSize(): DevotionalFontSize {
  if (typeof window === "undefined") return "normal";
  try {
    const raw = window.localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    if (raw === "compact" || raw === "normal" || raw === "large" || raw === "serene") {
      return raw;
    }
  } catch {
    // In restricted iframe or private mode
  }
  return "normal";
}

export function applyFontSize(size: DevotionalFontSize): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-font-size", size);
  try {
    window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, size);
    window.dispatchEvent(
      new CustomEvent("smaran:font-size-changed", { detail: { size } })
    );
  } catch {
    // Ignore storage errors
  }
}

function subscribeToFontSize(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("smaran:font-size-changed", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("smaran:font-size-changed", callback);
    window.removeEventListener("storage", callback);
  };
}

export function useDevotionalFontSize(): [
  DevotionalFontSize,
  (size: DevotionalFontSize) => void
] {
  const size = React.useSyncExternalStore<DevotionalFontSize>(
    subscribeToFontSize,
    getStoredFontSize,
    (): DevotionalFontSize => "normal"
  );
  return [size, applyFontSize];
}

function subscribeToTheme(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("smaran:theme-changed", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("smaran:theme-changed", callback);
    window.removeEventListener("storage", callback);
  };
}

export function useDevotionalTheme(): [
  DevotionalThemeId,
  (themeId?: DevotionalThemeId) => void
] {
  const themeId = React.useSyncExternalStore<DevotionalThemeId>(
    subscribeToTheme,
    getStoredTheme,
    (): DevotionalThemeId => "padmaraga-lotus"
  );
  return [themeId, applyTheme];
}
