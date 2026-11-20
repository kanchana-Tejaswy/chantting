import { EyeOff, Lock, ShieldCheck, Trophy } from "lucide-react";
import { ManuscriptDivider } from "@/components/sacred/ornaments";

export function LandingPrivacy() {
  return (
    <section id="privacy" className="relative border-t border-white/[0.08] bg-[#0F0A0C]/90 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <ManuscriptDivider className="mb-14 opacity-40" />

        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#C29438]/35 bg-[#24171B]/90 px-3.5 py-1 text-xs font-medium text-[#E5C378] shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            <ShieldCheck size={13} className="text-[#C29438]" />
            <span>Sacred Trust · गोपनीयता</span>
          </div>

          <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Privacy &amp; Personal Practice
          </h2>

          <p className="mt-4 text-base leading-relaxed text-slate-300 text-pretty sm:text-lg">
            Devotional life is sacred and deeply personal. We treat your chanting
            discipline with reverence, ensuring your records remain strictly yours.
          </p>
        </div>

        {/* 4 Trust Commitments */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Commitment 1 */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#1C1417]/75 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-all duration-300 hover:border-[#7A2638]/45 hover:bg-[#23181C]">
            <div>
              <div className="flex size-10 items-center justify-center rounded-xl border border-[#7A2638]/20 bg-[#281A1F] text-[#E5C378]">
                <Lock className="size-4.5" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-white">
                Private by Default
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Every single round you chant, every vow you set, and every milestone
                you achieve is locked exclusively to your account.
              </p>
            </div>
            <span className="mt-5 text-[11px] font-medium text-[#E8A4B2]">
              Protected by PostgreSQL RLS
            </span>
          </div>

          {/* Commitment 2 */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#1C1417]/75 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-all duration-300 hover:border-[#7A2638]/45 hover:bg-[#23181C]">
            <div>
              <div className="flex size-10 items-center justify-center rounded-xl border border-[#7A2638]/20 bg-[#281A1F] text-[#E5C378]">
                <ShieldCheck className="size-4.5" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-white">
                Voluntary Sharing
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                You explicitly choose what activity to contribute to a chanting circle.
                Personal notes and daily thoughts never leave your private sanctuary.
              </p>
            </div>
            <span className="mt-5 text-[11px] font-medium text-[#E8A4B2]">
              Explicit Member Consent
            </span>
          </div>

          {/* Commitment 3 */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#1C1417]/75 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-all duration-300 hover:border-[#7A2638]/45 hover:bg-[#23181C]">
            <div>
              <div className="flex size-10 items-center justify-center rounded-xl border border-[#7A2638]/20 bg-[#281A1F] text-[#E5C378]">
                <EyeOff className="size-4.5" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-white">
                Instant Revocation
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Leave a room or revoke shared visibility at any moment. Your past
                activity is instantly scrubbed from group visibility across the platform.
              </p>
            </div>
            <span className="mt-5 text-[11px] font-medium text-[#E8A4B2]">
              Immediate Data Purge
            </span>
          </div>

          {/* Commitment 4 */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#1C1417]/75 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-all duration-300 hover:border-[#7A2638]/45 hover:bg-[#23181C]">
            <div>
              <div className="flex size-10 items-center justify-center rounded-xl border border-[#7A2638]/20 bg-[#281A1F] text-[#E5C378]">
                <Trophy className="size-4.5" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-white">
                Zero Competition
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                No public leaderboards, vanity points, or gamified comparisons.
                Chanting is an offering to Sri Krishna, not a public scoreboard.
              </p>
            </div>
            <span className="mt-5 text-[11px] font-medium text-[#E8A4B2]">
              Sanctuary of Devotion
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
