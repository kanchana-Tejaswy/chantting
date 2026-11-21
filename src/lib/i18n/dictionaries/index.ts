/**
 * SMARAN (स्मरण) — Translation Dictionary Index
 *
 * Consolidates all 23 supported languages (22 scheduled Indian languages + English)
 * and provides safe dictionary resolution with English fallback.
 */

import type { LanguageCode } from "../languages";
import type { TranslationDictionary } from "./types";

import { en } from "./en";
import { hi } from "./hi";
import { sa } from "./sa";
import { bn } from "./bn";
import { ta } from "./ta";
import { te } from "./te";
import { gu } from "./gu";
import { kn } from "./kn";
import { ml } from "./ml";
import { mr } from "./mr";
import { pa } from "./pa";
import { or } from "./or";
import { as } from "./as";
import {
  ne,
  mai,
  kok,
  brx,
  doi,
  mni,
  sat,
} from "./regional";

export const DICTIONARIES: Record<LanguageCode, TranslationDictionary> = {
  en,
  hi,
  sa,
  bn,
  ta,
  te,
  gu,
  kn,
  ml,
  mr,
  pa,
  or,
  as,
  ne,
  mai,
  kok,
  brx,
  doi,
  mni,
  sat,
};

/**
 * Returns the dictionary for the requested language code.
 * Falls back to English if the requested language is unavailable.
 */
export function getDictionary(code: LanguageCode | string): TranslationDictionary {
  const normalized = (code || "en").toLowerCase() as LanguageCode;
  return DICTIONARIES[normalized] || DICTIONARIES.en;
}

/**
 * Safely resolves a nested key path (e.g., 'common.save', 'auth.btnSignIn')
 * from the dictionary, falling back to English and then to the provided fallback.
 */
export function resolveTranslation(
  dict: TranslationDictionary,
  keyPath: string,
  fallback?: string
): string {
  const parts = keyPath.split(".");
  
  let current: unknown = dict;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      current = undefined;
      break;
    }
  }

  if (typeof current === "string" && current.trim().length > 0) {
    return current;
  }

  // Fallback to English dictionary
  let fallbackVal: unknown = DICTIONARIES.en;
  for (const part of parts) {
    if (fallbackVal && typeof fallbackVal === "object" && part in fallbackVal) {
      fallbackVal = (fallbackVal as Record<string, unknown>)[part];
    } else {
      fallbackVal = undefined;
      break;
    }
  }

  if (typeof fallbackVal === "string" && fallbackVal.trim().length > 0) {
    return fallbackVal;
  }

  return fallback || keyPath;
}

/**
 * Interpolates variables in a template string, e.g. "Round {current} of {total}"
 */
export function interpolate(
  text: string,
  params?: Record<string, string | number>
): string {
  if (!params) return text;
  return text.replace(/{([a-zA-Z0-9_-]+)}/g, (_, key) => {
    return key in params ? String(params[key]) : `{${key}}`;
  });
}
