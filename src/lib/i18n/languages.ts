/**
 * SMARAN (स्मरण) — Multilingual Language Specification
 *
 * Supports the 22 scheduled Indian languages recognized by the Constitution of India
 * plus English (total 23 languages).
 */

export type Direction = "ltr" | "rtl";

export type LanguageCode =
  | "en"
  | "as"
  | "bn"
  | "brx"
  | "doi"
  | "gu"
  | "hi"
  | "kn"
  | "kok"
  | "mai"
  | "ml"
  | "mni"
  | "mr"
  | "ne"
  | "or"
  | "pa"
  | "sa"
  | "sat"
  | "ta"
  | "te";

export interface LanguageDefinition {
  code: LanguageCode;
  name: string;
  nativeName: string;
  dir: Direction;
  script: string;
  locale: string;
  /** Whether translations for this language require review by native speakers */
  needsReview: boolean;
}

export const DEFAULT_LANGUAGE: LanguageCode = "en";

export const LANGUAGE_STORAGE_KEY = "smaran-language";
export const LANGUAGE_COOKIE_NAME = "smaran-language";

export const SUPPORTED_LANGUAGES: readonly LanguageDefinition[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    dir: "ltr",
    script: "Latin",
    locale: "en-IN",
    needsReview: false,
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    dir: "ltr",
    script: "Devanagari",
    locale: "hi-IN",
    needsReview: false,
  },
  {
    code: "sa",
    name: "Sanskrit",
    nativeName: "संस्कृतम्",
    dir: "ltr",
    script: "Devanagari",
    locale: "sa-IN",
    needsReview: false,
  },
  {
    code: "bn",
    name: "Bengali",
    nativeName: "বাংলা",
    dir: "ltr",
    script: "Bengali",
    locale: "bn-IN",
    needsReview: false,
  },
  {
    code: "ta",
    name: "Tamil",
    nativeName: "தமிழ்",
    dir: "ltr",
    script: "Tamil",
    locale: "ta-IN",
    needsReview: false,
  },
  {
    code: "te",
    name: "Telugu",
    nativeName: "తెలుగు",
    dir: "ltr",
    script: "Telugu",
    locale: "te-IN",
    needsReview: false,
  },
  {
    code: "gu",
    name: "Gujarati",
    nativeName: "ગુજરાતી",
    dir: "ltr",
    script: "Gujarati",
    locale: "gu-IN",
    needsReview: false,
  },
  {
    code: "kn",
    name: "Kannada",
    nativeName: "ಕನ್ನಡ",
    dir: "ltr",
    script: "Kannada",
    locale: "kn-IN",
    needsReview: false,
  },
  {
    code: "ml",
    name: "Malayalam",
    nativeName: "മലയാളം",
    dir: "ltr",
    script: "Malayalam",
    locale: "ml-IN",
    needsReview: false,
  },
  {
    code: "mr",
    name: "Marathi",
    nativeName: "मराठी",
    dir: "ltr",
    script: "Devanagari",
    locale: "mr-IN",
    needsReview: false,
  },
  {
    code: "pa",
    name: "Punjabi",
    nativeName: "ਪੰਜਾਬੀ",
    dir: "ltr",
    script: "Gurmukhi",
    locale: "pa-IN",
    needsReview: false,
  },
  {
    code: "or",
    name: "Odia",
    nativeName: "ଓଡ଼ିଆ",
    dir: "ltr",
    script: "Odia",
    locale: "or-IN",
    needsReview: true,
  },
  {
    code: "as",
    name: "Assamese",
    nativeName: "অসমীয়া",
    dir: "ltr",
    script: "Bengali-Assamese",
    locale: "as-IN",
    needsReview: true,
  },
  {
    code: "ne",
    name: "Nepali",
    nativeName: "नेपाली",
    dir: "ltr",
    script: "Devanagari",
    locale: "ne-NP",
    needsReview: true,
  },
  {
    code: "mai",
    name: "Maithili",
    nativeName: "मैथिली",
    dir: "ltr",
    script: "Devanagari",
    locale: "mai-IN",
    needsReview: true,
  },
  {
    code: "kok",
    name: "Konkani",
    nativeName: "कोंकणी",
    dir: "ltr",
    script: "Devanagari",
    locale: "kok-IN",
    needsReview: true,
  },
  {
    code: "brx",
    name: "Bodo",
    nativeName: "बड़ो",
    dir: "ltr",
    script: "Devanagari",
    locale: "brx-IN",
    needsReview: true,
  },
  {
    code: "doi",
    name: "Dogri",
    nativeName: "डोगरी",
    dir: "ltr",
    script: "Devanagari",
    locale: "doi-IN",
    needsReview: true,
  },
  {
    code: "mni",
    name: "Meitei (Manipuri)",
    nativeName: "মৈতৈলোন্",
    dir: "ltr",
    script: "Bengali-Meitei",
    locale: "mni-IN",
    needsReview: true,
  },
  {
    code: "sat",
    name: "Santali",
    nativeName: "ᱥᱟᱱᱛᱟᱲᱤ",
    dir: "ltr",
    script: "Ol Chiki",
    locale: "sat-IN",
    needsReview: true,
  },
] as const;

export const LANGUAGE_CODES: readonly LanguageCode[] = SUPPORTED_LANGUAGES.map(
  (l) => l.code
);

export function isValidLanguageCode(code: unknown): code is LanguageCode {
  if (typeof code !== "string") return false;
  return LANGUAGE_CODES.includes(code as LanguageCode);
}

export function getLanguageDefinition(code: string): LanguageDefinition {
  const match = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return match ?? SUPPORTED_LANGUAGES[0]!;
}

export function isRtlLanguage(code: string): boolean {
  return getLanguageDefinition(code).dir === "rtl";
}

/**
 * Locale-aware integer and decimal formatter with native numeral representation where appropriate.
 */
export function formatLocaleNumber(
  value: number,
  languageCode: LanguageCode = "en",
  options?: Intl.NumberFormatOptions
): string {
  try {
    const def = getLanguageDefinition(languageCode);
    return new Intl.NumberFormat(def.locale, options).format(value);
  } catch {
    return value.toLocaleString();
  }
}

/**
 * Locale-aware date formatter honoring script and regional standards.
 */
export function formatLocaleDate(
  date: Date | string | number,
  languageCode: LanguageCode = "en",
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const d = typeof date === "object" ? date : new Date(date);
    const def = getLanguageDefinition(languageCode);
    return new Intl.DateTimeFormat(def.locale, options).format(d);
  } catch {
    const d = typeof date === "object" ? date : new Date(date);
    return d.toLocaleDateString();
  }
}
