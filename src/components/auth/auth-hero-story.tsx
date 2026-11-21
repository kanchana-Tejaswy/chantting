"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { LotusEmblem } from "@/components/sacred/ornaments";
import { useTranslation } from "@/lib/i18n/context";

export function AuthHeroStory() {
  const { t } = useTranslation();

  return (
    <section
      aria-label="SMARAN Sanctuary Introduction"
      className="space-y-5 text-left"
    >
      <div className="inline-flex items-center gap-3 rounded-full border border-[#E5BF73]/30 bg-[#22170F]/60 px-3.5 py-1.5 backdrop-blur-sm">
        <span className="flex size-6 items-center justify-center rounded-full bg-[#E5BF73]/18 text-[#E5BF73]">
          <LotusEmblem size={14} />
        </span>
        <span className="text-xs font-semibold tracking-[0.16em] uppercase text-[#FBF7EE]">
          SMARAN
        </span>
        <span className="h-3 w-px bg-[#E5BF73]/35" aria-hidden="true" />
        <span lang="sa" className="text-sm font-medium text-[#E5BF73]">
          स्मरण
        </span>
      </div>

      <div className="space-y-3.5">
        <h1 className="max-w-xl font-display text-3xl font-semibold leading-[1.08] tracking-[-0.02em] text-[#FBF7EE] drop-shadow-[0_2px_18px_rgba(12,8,4,0.45)] sm:text-5xl lg:text-[3.25rem]">
          {t("auth.heroTitle", "Remember Him. Stay Connected.")}
        </h1>
        <p className="max-w-lg text-base leading-relaxed text-[#F2E8D5]/92 sm:text-lg">
          {t("auth.heroSub", "A space for chanting, sadhana and devotion.")}
        </p>
        <p className="max-w-md text-sm leading-relaxed text-[#DECDB1]/82">
          {t(
            "auth.heroDescription",
            "Continue your personal Japa rounds, maintain your daily target carry-forward, and deepen your devotional discipline in quiet peace."
          )}
        </p>
      </div>

      <div className="hidden flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-[#E6D8BF]/80 sm:flex">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck
            className="size-3.5 text-[#E5BF73]"
            strokeWidth={1.6}
            aria-hidden="true"
          />
          {t("auth.featurePrivate", "Private chanting records by default")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="size-1.5 rounded-full bg-[#92B47D]"
            aria-hidden="true"
          />
          {t("auth.featureSynced", "Daily rounds synced across devices")}
        </span>
      </div>
    </section>
  );
}
