import { EyeOff, Lock, ShieldCheck, Trophy } from "lucide-react";
import { ManuscriptDivider } from "@/components/sacred/ornaments";
import { MotionReveal } from "@/components/ui/motion-reveal";

export function LandingPrivacy() {
  return (
    <section id="privacy" className="relative overflow-hidden border-t border-white/[0.08] bg-[#0F0A0C]/90 py-20 sm:py-28">
      {/* Sacred Sanctum Ambient Backlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] max-w-[90vw] h-[380px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(122,38,56,0.14),rgba(194,148,56,0.06),transparent_70%)] blur-[96px] will-change-transform"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8">
        <ManuscriptDivider className="mb-14 opacity-40 transition-opacity duration-700 hover:opacity-70" />

        <MotionReveal durationMs={680} yOffset={20} className="mx-auto max-w-3xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#C29438]/35 bg-[#24171B]/90 px-3.5 py-1 text-xs font-medium text-[#E5C378] shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105 hover:border-[#C29438]/60 hover:shadow-[0_0_18px_rgba(194,148,56,0.22)]">
            <ShieldCheck size={13} className="text-[#C29438] transition-transform duration-300 group-hover:scale-110" />
            <span>Sacred Trust · गोपनीयता</span>
          </div>

          <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Privacy &amp; Personal Practice
          </h2>

          <p className="mt-4 text-base leading-relaxed text-slate-300 text-pretty sm:text-lg">
            Devotional life is sacred and deeply personal. We treat your chanting
            discipline with reverence, ensuring your records remain strictly yours.
          </p>
        </MotionReveal>

        {/* 4 Trust Commitments with Orchestrated Motion & Tactile Elevation */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Commitment 1 */}
          <MotionReveal delayMs={40} durationMs={680} yOffset={24} className="h-full">
            <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1C1417]/80 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-[transform,box-shadow,border-color,background-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-2 hover:border-[#C29438]/50 hover:bg-[#23181C]/95 hover:shadow-[0_20px_45px_rgba(0,0,0,0.6),0_0_24px_rgba(194,148,56,0.12),inset_0_1px_0_rgba(255,255,255,0.12)]">
              {/* Subtle Ambient Specular Gleam */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-[#C29438]/12 via-transparent to-transparent opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
              />

              <div className="relative z-10">
                <div className="relative flex size-11 items-center justify-center rounded-xl border border-[#7A2638]/25 bg-[#281A1F] text-[#E5C378] shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-[transform,border-color,box-shadow,color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:border-[#C29438]/60 group-hover:text-[#F3E2B8] group-hover:shadow-[0_0_20px_rgba(194,148,56,0.3)]">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-xl bg-[#C29438]/0 transition-colors duration-500 group-hover:bg-[#C29438]/10"
                  />
                  <Lock className="size-5 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105" strokeWidth={1.75} aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-white transition-colors duration-300 group-hover:text-[#FFF8EE]">
                  Private by Default
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-300 transition-colors duration-300 group-hover:text-slate-200">
                  Every single round you chant, every vow you set, and every milestone
                  you achieve is locked exclusively to your account.
                </p>
              </div>

              <div className="relative z-10 mt-6 flex items-center gap-2 border-t border-white/[0.04] pt-4 transition-colors duration-300 group-hover:border-[#C29438]/20">
                <span className="relative flex size-2 items-center justify-center" aria-hidden="true">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#C29438]/40 opacity-75 motion-reduce:hidden group-hover:opacity-100" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-[#C29438]/80 transition-colors duration-300 group-hover:bg-[#F3E2B8]" />
                </span>
                <span className="text-[11px] font-medium tracking-wide text-[#E8A4B2] transition-[color,transform] duration-300 group-hover:translate-x-0.5 group-hover:text-[#F3E2B8]">
                  Protected by PostgreSQL RLS
                </span>
              </div>
            </div>
          </MotionReveal>

          {/* Commitment 2 */}
          <MotionReveal delayMs={100} durationMs={680} yOffset={24} className="h-full">
            <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1C1417]/80 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-[transform,box-shadow,border-color,background-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-2 hover:border-[#C29438]/50 hover:bg-[#23181C]/95 hover:shadow-[0_20px_45px_rgba(0,0,0,0.6),0_0_24px_rgba(194,148,56,0.12),inset_0_1px_0_rgba(255,255,255,0.12)]">
              {/* Subtle Ambient Specular Gleam */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-[#C29438]/12 via-transparent to-transparent opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
              />

              <div className="relative z-10">
                <div className="relative flex size-11 items-center justify-center rounded-xl border border-[#7A2638]/25 bg-[#281A1F] text-[#E5C378] shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-[transform,border-color,box-shadow,color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:border-[#C29438]/60 group-hover:text-[#F3E2B8] group-hover:shadow-[0_0_20px_rgba(194,148,56,0.3)]">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-xl bg-[#C29438]/0 transition-colors duration-500 group-hover:bg-[#C29438]/10"
                  />
                  <ShieldCheck className="size-5 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105" strokeWidth={1.75} aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-white transition-colors duration-300 group-hover:text-[#FFF8EE]">
                  Voluntary Sharing
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-300 transition-colors duration-300 group-hover:text-slate-200">
                  You explicitly choose what activity to contribute to a chanting circle.
                  Personal notes and daily thoughts never leave your private sanctuary.
                </p>
              </div>

              <div className="relative z-10 mt-6 flex items-center gap-2 border-t border-white/[0.04] pt-4 transition-colors duration-300 group-hover:border-[#C29438]/20">
                <span className="relative flex size-2 items-center justify-center" aria-hidden="true">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#C29438]/40 opacity-75 motion-reduce:hidden group-hover:opacity-100" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-[#C29438]/80 transition-colors duration-300 group-hover:bg-[#F3E2B8]" />
                </span>
                <span className="text-[11px] font-medium tracking-wide text-[#E8A4B2] transition-[color,transform] duration-300 group-hover:translate-x-0.5 group-hover:text-[#F3E2B8]">
                  Explicit Member Consent
                </span>
              </div>
            </div>
          </MotionReveal>

          {/* Commitment 3 */}
          <MotionReveal delayMs={160} durationMs={680} yOffset={24} className="h-full">
            <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1C1417]/80 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-[transform,box-shadow,border-color,background-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-2 hover:border-[#C29438]/50 hover:bg-[#23181C]/95 hover:shadow-[0_20px_45px_rgba(0,0,0,0.6),0_0_24px_rgba(194,148,56,0.12),inset_0_1px_0_rgba(255,255,255,0.12)]">
              {/* Subtle Ambient Specular Gleam */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-[#C29438]/12 via-transparent to-transparent opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
              />

              <div className="relative z-10">
                <div className="relative flex size-11 items-center justify-center rounded-xl border border-[#7A2638]/25 bg-[#281A1F] text-[#E5C378] shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-[transform,border-color,box-shadow,color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:border-[#C29438]/60 group-hover:text-[#F3E2B8] group-hover:shadow-[0_0_20px_rgba(194,148,56,0.3)]">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-xl bg-[#C29438]/0 transition-colors duration-500 group-hover:bg-[#C29438]/10"
                  />
                  <EyeOff className="size-5 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105" strokeWidth={1.75} aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-white transition-colors duration-300 group-hover:text-[#FFF8EE]">
                  Instant Revocation
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-300 transition-colors duration-300 group-hover:text-slate-200">
                  Leave a room or revoke shared visibility at any moment. Your past
                  activity is instantly scrubbed from group visibility across the platform.
                </p>
              </div>

              <div className="relative z-10 mt-6 flex items-center gap-2 border-t border-white/[0.04] pt-4 transition-colors duration-300 group-hover:border-[#C29438]/20">
                <span className="relative flex size-2 items-center justify-center" aria-hidden="true">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#C29438]/40 opacity-75 motion-reduce:hidden group-hover:opacity-100" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-[#C29438]/80 transition-colors duration-300 group-hover:bg-[#F3E2B8]" />
                </span>
                <span className="text-[11px] font-medium tracking-wide text-[#E8A4B2] transition-[color,transform] duration-300 group-hover:translate-x-0.5 group-hover:text-[#F3E2B8]">
                  Immediate Data Purge
                </span>
              </div>
            </div>
          </MotionReveal>

          {/* Commitment 4 */}
          <MotionReveal delayMs={220} durationMs={680} yOffset={24} className="h-full">
            <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1C1417]/80 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-[transform,box-shadow,border-color,background-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-2 hover:border-[#C29438]/50 hover:bg-[#23181C]/95 hover:shadow-[0_20px_45px_rgba(0,0,0,0.6),0_0_24px_rgba(194,148,56,0.12),inset_0_1px_0_rgba(255,255,255,0.12)]">
              {/* Subtle Ambient Specular Gleam */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-[#C29438]/12 via-transparent to-transparent opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
              />

              <div className="relative z-10">
                <div className="relative flex size-11 items-center justify-center rounded-xl border border-[#7A2638]/25 bg-[#281A1F] text-[#E5C378] shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-[transform,border-color,box-shadow,color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:border-[#C29438]/60 group-hover:text-[#F3E2B8] group-hover:shadow-[0_0_20px_rgba(194,148,56,0.3)]">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-xl bg-[#C29438]/0 transition-colors duration-500 group-hover:bg-[#C29438]/10"
                  />
                  <Trophy className="size-5 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105" strokeWidth={1.75} aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-white transition-colors duration-300 group-hover:text-[#FFF8EE]">
                  Zero Competition
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-300 transition-colors duration-300 group-hover:text-slate-200">
                  No public leaderboards, vanity points, or gamified comparisons.
                  Chanting is an offering to Sri Krishna, not a public scoreboard.
                </p>
              </div>

              <div className="relative z-10 mt-6 flex items-center gap-2 border-t border-white/[0.04] pt-4 transition-colors duration-300 group-hover:border-[#C29438]/20">
                <span className="relative flex size-2 items-center justify-center" aria-hidden="true">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#C29438]/40 opacity-75 motion-reduce:hidden group-hover:opacity-100" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-[#C29438]/80 transition-colors duration-300 group-hover:bg-[#F3E2B8]" />
                </span>
                <span className="text-[11px] font-medium tracking-wide text-[#E8A4B2] transition-[color,transform] duration-300 group-hover:translate-x-0.5 group-hover:text-[#F3E2B8]">
                  Sanctuary of Devotion
                </span>
              </div>
            </div>
          </MotionReveal>
        </div>
      </div>
    </section>
  );
}
