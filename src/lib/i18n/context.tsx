"use client";

import * as React from "react";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE_NAME,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  formatLocaleDate,
  formatLocaleNumber,
  getLanguageDefinition,
  isRtlLanguage,
  type Direction,
  type LanguageCode,
  type LanguageDefinition,
} from "./languages";
import {
  getDictionary,
  interpolate,
  resolveTranslation,
} from "./dictionaries";
import type { TranslationDictionary } from "./dictionaries/types";

export interface TranslationContextValue {
  language: LanguageCode;
  dir: Direction;
  isRtl: boolean;
  dict: TranslationDictionary;
  t: (key: string, fallback?: string, params?: Record<string, string | number>) => string;
  setLanguage: (code: LanguageCode) => Promise<void>;
  langDef: LanguageDefinition;
  languages: readonly LanguageDefinition[];
  formatNumber: (n: number) => string;
  formatDate: (d: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
}

const LanguageContext = React.createContext<TranslationContextValue | null>(null);

function getInitialLanguage(serverLang?: string | null): LanguageCode {
  if (serverLang && SUPPORTED_LANGUAGES.some((l) => l.code === serverLang)) {
    return serverLang as LanguageCode;
  }
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) {
        return stored as LanguageCode;
      }
      const match = document.cookie.match(
        new RegExp(`(?:^|; )${LANGUAGE_COOKIE_NAME}=([^;]+)`)
      );
      if (match && match[1]) {
        const decoded = decodeURIComponent(match[1]);
        if (SUPPORTED_LANGUAGES.some((l) => l.code === decoded)) {
          return decoded as LanguageCode;
        }
      }
    } catch {
      // Ignore storage/cookie exceptions
    }
  }
  return DEFAULT_LANGUAGE;
}

export function LanguageProvider({
  children,
  initialLanguage,
}: {
  children: React.ReactNode;
  initialLanguage?: string | null;
}) {
  const [language, setLanguageState] = React.useState<LanguageCode>(() =>
    getInitialLanguage(initialLanguage)
  );

  const langDef = React.useMemo(
    () => getLanguageDefinition(language),
    [language]
  );
  const dir: Direction = langDef.dir;
  const isRtl = dir === "rtl";

  const dict = React.useMemo(() => getDictionary(language), [language]);

  // Synchronize DOM attributes and storage on change
  React.useEffect(() => {
    try {
      document.documentElement.lang = language;
      document.documentElement.dir = dir;
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      document.cookie = `${LANGUAGE_COOKIE_NAME}=${encodeURIComponent(
        language
      )}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Ignore DOM or cookie failure in restricted environments
    }
  }, [language, dir]);

  const setLanguage = React.useCallback(
    async (newLang: LanguageCode) => {
      if (!SUPPORTED_LANGUAGES.some((l) => l.code === newLang)) {
        return;
      }
      setLanguageState(newLang);

      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
        document.cookie = `${LANGUAGE_COOKIE_NAME}=${encodeURIComponent(
          newLang
        )}; path=/; max-age=31536000; SameSite=Lax`;
        document.documentElement.lang = newLang;
        document.documentElement.dir = isRtlLanguage(newLang) ? "rtl" : "ltr";
      } catch {
        // Local storage write error
      }

      // If user is authenticated, attempt non-blocking sync with backend
      try {
        // Attempt silent sync to profile if user has an active session
        fetch("/api/account/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferredLanguage: newLang }),
        }).catch(() => {
          // Silent catch if unauthenticated or offline
        });
      } catch {
        // Ignore network errors
      }
    },
    []
  );

  const t = React.useCallback(
    (key: string, fallback?: string, params?: Record<string, string | number>) => {
      const resolved = resolveTranslation(dict, key, fallback);
      return interpolate(resolved, params);
    },
    [dict]
  );

  const formatNumber = React.useCallback(
    (n: number) => formatLocaleNumber(n, language),
    [language]
  );

  const formatDate = React.useCallback(
    (d: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      formatLocaleDate(d, language, options),
    [language]
  );

  const contextValue = React.useMemo<TranslationContextValue>(
    () => ({
      language,
      dir,
      isRtl,
      dict,
      t,
      setLanguage,
      langDef,
      languages: SUPPORTED_LANGUAGES,
      formatNumber,
      formatDate,
    }),
    [language, dir, isRtl, dict, t, setLanguage, langDef, formatNumber, formatDate]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation(): TranslationContextValue {
  const context = React.useContext(LanguageContext);
  if (!context) {
    // Provide a safe fallback if used outside LanguageProvider
    const defaultDict = getDictionary(DEFAULT_LANGUAGE);
    const defaultDef = getLanguageDefinition(DEFAULT_LANGUAGE);
    return {
      language: DEFAULT_LANGUAGE,
      dir: "ltr",
      isRtl: false,
      dict: defaultDict,
      t: (key: string, fallback?: string, params?: Record<string, string | number>) =>
        interpolate(resolveTranslation(defaultDict, key, fallback), params),
      setLanguage: async () => {},
      langDef: defaultDef,
      languages: SUPPORTED_LANGUAGES,
      formatNumber: (n: number) => n.toLocaleString("en-IN"),
      formatDate: (d: Date | string | number) => new Date(d).toLocaleDateString("en-IN"),
    };
  }
  return context;
}
