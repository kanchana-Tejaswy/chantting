import { Flame, Heart, Shield } from "lucide-react";
import { LotusEmblem, ManuscriptDivider } from "@/components/sacred/ornaments";

export function LandingIntro() {
  return (
    <section id="about" className="relative mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
      <ManuscriptDivider className="mb-14 opacity-40" />

      <div className="mx-auto max-w-3xl text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#C29438]/35 bg-[#24171B]/90 px-3.5 py-1 text-xs font-medium text-[#E5C378] shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
          <LotusEmblem size={13} className="text-[#C29438]" />
          <span>Devotional Discipline · साधना</span>
        </div>

        <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-white text-balance sm:text-4xl lg:text-5xl">
          Make remembrance a part of your everyday life.
        </h2>

        <p className="mt-5 text-base leading-relaxed text-slate-300 text-pretty sm:text-lg">
          Chanting the holy names of Lord Krishna is not a hurried chore—it is an
          intimate spiritual discipline of love, attention, and heartfelt
          remembrance. SMARAN is built to gently support your daily chanting practice,
          giving you a calm refuge away from noise, commercial distractions, and
          digital anxiety.
        </p>
      </div>

      {/* 3 Devotional Principles — Refined Glass Panels */}
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {/* 1. Nitya Sadhana */}
        <div className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#1C1417]/80 p-7 shadow-[0_8px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-all duration-300 hover:border-[#7A2638]/45 hover:bg-[#23181C]/90">
          <div>
            <div className="flex size-11 items-center justify-center rounded-xl border border-[#7A2638]/20 bg-[#281A1F] text-[#E5C378] shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
              <Flame className="size-5" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <h3 className="mt-5 font-display text-xl font-semibold text-white">
              Nitya Sādhana · Steady Rhythm
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-300 text-pretty">
              Move from sporadic chanting to a steady, peaceful morning discipline.
              Clear daily targets and forgiving carry-forward balance keep your practice
              grounded without guilt.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 border-t border-white/[0.06] pt-4 text-xs font-medium text-[#E8A4B2]">
            <span>Daily Rollover &amp; Tracking</span>
          </div>
        </div>

        {/* 2. Pavitra Sankalpa */}
        <div className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#1C1417]/80 p-7 shadow-[0_8px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-all duration-300 hover:border-[#7A2638]/45 hover:bg-[#23181C]/90">
          <div>
            <div className="flex size-11 items-center justify-center rounded-xl border border-[#7A2638]/20 bg-[#281A1F] text-[#E5C378] shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
              <Heart className="size-5" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <h3 className="mt-5 font-display text-xl font-semibold text-white">
              Pavitra Sankalpa · Sacred Vows
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-300 text-pretty">
              Dedicate your chanting to personal vows—whether a Kartik commitment,
              16 daily rounds, or 1 Lakh Nama Japa. Your spiritual commitments are
              held sacred in your private ledger.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 border-t border-white/[0.06] pt-4 text-xs font-medium text-[#E8A4B2]">
            <span>Dedicated Vow Ledgers</span>
          </div>
        </div>

        {/* 3. Santi */}
        <div className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#1C1417]/80 p-7 shadow-[0_8px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-all duration-300 hover:border-[#7A2638]/45 hover:bg-[#23181C]/90">
          <div>
            <div className="flex size-11 items-center justify-center rounded-xl border border-[#7A2638]/20 bg-[#281A1F] text-[#E5C378] shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
              <Shield className="size-5" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <h3 className="mt-5 font-display text-xl font-semibold text-white">
              Śānti · Sacred Privacy
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-300 text-pretty">
              Spiritual growth is personal, not a social contest. SMARAN keeps your
              chanting history completely private by default, with zero public
              rankings or vanity metrics.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 border-t border-white/[0.06] pt-4 text-xs font-medium text-[#E8A4B2]">
            <span>100% Private by Default</span>
          </div>
        </div>
      </div>
    </section>
  );
}
