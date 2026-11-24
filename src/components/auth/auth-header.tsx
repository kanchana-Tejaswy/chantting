"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LanguageSelector } from "@/components/i18n/language-selector";
import { useTranslation } from "@/lib/i18n/context";

export function AuthHeader() {
  const { t, isRtl } = useTranslation();

  return (
    <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-3.5 pt-4 sm:px-8 sm:pt-7">
      <Link
        href="/"
        className="group inline-flex items-center gap-2 rounded-full border border-[#E5BF73]/28 bg-[#1E150E]/55 px-3 py-1.5 text-xs font-medium text-[#FBF7EE] backdrop-blur-md transition-colors hover:border-[#E5BF73]/55 hover:bg-[#1E150E]/75 sm:px-3.5 sm:py-2"
        aria-label="Return to SMARAN Home"
      >
        <ArrowLeft
          className={`size-3.5 text-[#E5BF73] transition-transform duration-150 ${
            isRtl ? "rotate-180 group-hover:translate-x-0.5" : "group-hover:-translate-x-0.5"
          }`}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <span className="hidden sm:inline">{t("nav.returnToSmaran", "Return to SMARAN")}</span>
        <span className="sm:hidden">SMARAN</span>
      </Link>

      <LanguageSelector variant="pill" />
    </header>
  );
}
