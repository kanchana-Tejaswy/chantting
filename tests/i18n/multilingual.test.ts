import { describe, expect, it } from "vitest";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE_NAME,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  formatLocaleDate,
  formatLocaleNumber,
  getLanguageDefinition,
  isRtlLanguage,
  type LanguageCode,
} from "@/lib/i18n/languages";
import {
  DICTIONARIES,
  getDictionary,
  interpolate,
  resolveTranslation,
} from "@/lib/i18n/dictionaries";
import {
  SUPPORTED_LANGUAGES as VALIDATION_LANGUAGES,
  accountProfileUpdateSchema,
  accountProfilePatchSchema,
} from "@/lib/account/validation";

describe("SMARAN Multilingual Support (20 Languages)", () => {
  const EXPECTED_LANGUAGE_CODES: LanguageCode[] = [
    "en",
    "as",
    "bn",
    "brx",
    "doi",
    "gu",
    "hi",
    "kn",
    "kok",
    "mai",
    "ml",
    "mni",
    "mr",
    "ne",
    "or",
    "pa",
    "sa",
    "sat",
    "ta",
    "te",
  ];

  it("supports exactly 20 languages with Perso-Arabic scripts removed", () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(20);
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    expect(codes).toEqual(expect.arrayContaining(EXPECTED_LANGUAGE_CODES));
    expect(codes).not.toContain("ur");
    expect(codes).not.toContain("ks");
    expect(codes).not.toContain("sd");
  });

  it("contains valid metadata (native name, script, locale) for all 20 languages", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(lang.code).toBeTruthy();
      expect(lang.name.trim().length).toBeGreaterThan(0);
      expect(lang.nativeName.trim().length).toBeGreaterThan(0);
      expect(lang.script.trim().length).toBeGreaterThan(0);
      expect(lang.locale.trim().length).toBeGreaterThan(0);
      expect(lang.dir).toBe("ltr");
    }
  });

  it("verifies all remaining supported languages are LTR", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(isRtlLanguage(lang.code)).toBe(false);
    }
  });

  it("has a dictionary for all 20 languages with no runtime errors", () => {
    for (const code of EXPECTED_LANGUAGE_CODES) {
      const dict = DICTIONARIES[code];
      expect(dict).toBeDefined();
      expect(dict.common).toBeDefined();
      expect(dict.nav).toBeDefined();
      expect(dict.auth).toBeDefined();
      expect(dict.japa).toBeDefined();

      // Common essential keys
      expect(dict.common.save.length).toBeGreaterThan(0);
      expect(dict.common.cancel.length).toBeGreaterThan(0);
      expect(dict.common.language.length).toBeGreaterThan(0);

      // Nav essential keys
      expect(dict.nav.japa.length).toBeGreaterThan(0);
      expect(dict.nav.drsti.length).toBeGreaterThan(0);

      // Auth essential keys
      expect(dict.auth.signInTitle.length).toBeGreaterThan(0);
      expect(dict.auth.btnSignIn.length).toBeGreaterThan(0);
    }
  });

  it("falls back to English when an unsupported language code is queried", () => {
    const fallback = getDictionary("unknown-lang" as LanguageCode);
    expect(fallback).toBe(DICTIONARIES.en);
  });

  it("falls back to English when an individual key is missing from a translation", () => {
    const partialDict = {
      common: {
        save: "साधना सुरक्षित",
      },
    } as any;

    const resolvedSave = resolveTranslation(partialDict, "common.save");
    expect(resolvedSave).toBe("साधना सुरक्षित");

    const resolvedCancel = resolveTranslation(partialDict, "common.cancel");
    expect(resolvedCancel).toBe(DICTIONARIES.en.common.cancel);
  });

  it("interpolates template parameters correctly", () => {
    const template = "Round {current} of {total} completed";
    const result = interpolate(template, { current: 16, total: 16 });
    expect(result).toBe("Round 16 of 16 completed");
  });

  it("formats numbers and dates in locale-aware representations", () => {
    const num = 108;
    const formattedEn = formatLocaleNumber(num, "en");
    expect(formattedEn).toContain("108");

    const d = new Date("2026-11-21T12:00:00Z");
    const dateFormatted = formatLocaleDate(d, "hi");
    expect(dateFormatted.length).toBeGreaterThan(0);
  });

  it("validates all 20 languages in profile validation schemas and rejects removed ones", () => {
    expect(VALIDATION_LANGUAGES).toHaveLength(20);

    for (const code of EXPECTED_LANGUAGE_CODES) {
      const validProfile = {
        displayName: "Arjuna Dasa",
        timezone: "Asia/Kolkata",
        preferredLanguage: code,
      };
      const res = accountProfileUpdateSchema.safeParse(validProfile);
      expect(res.success).toBe(true);
    }

    // Explicitly check that removed Perso-Arabic codes are rejected
    for (const removed of ["ur", "ks", "sd", "klingon"]) {
      const invalidProfile = {
        displayName: "Arjuna Dasa",
        timezone: "Asia/Kolkata",
        preferredLanguage: removed,
      };
      const badRes = accountProfileUpdateSchema.safeParse(invalidProfile);
      expect(badRes.success).toBe(false);
    }
  });

  it("supports partial profile updates with language only", () => {
    const partialPatch = {
      preferredLanguage: "te",
    };
    const res = accountProfilePatchSchema.safeParse(partialPatch);
    expect(res.success).toBe(true);
  });
});
