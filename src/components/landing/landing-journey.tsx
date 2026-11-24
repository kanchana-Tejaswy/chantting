import {
  CalendarDays,
  Clock,
  Flame,
  Target,
  Users,
} from "lucide-react";
import { LotusEmblem } from "@/components/sacred/ornaments";
import { SacredRingProgress } from "@/components/ui/progress";
import { MotionReveal } from "@/components/ui/motion-reveal";

export function LandingJourney() {
  return (
    <section id="journey" className="relative mx-auto max-w-6xl px-4 py-14 xs:px-5 xs:py-18 sm:px-8 sm:py-28">
      <MotionReveal className="mx-auto max-w-3xl text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#C29438]/35 bg-[#24171B]/90 px-3.5 py-1 text-xs font-medium text-[#E5C378] shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-transform duration-300 hover:scale-[1.02]">
          <LotusEmblem size={13} className="text-[#C29438]" />
          <span>Devotional Path · साधना मार्ग</span>
        </div>

        <h2 className="mt-5 font-display text-2xl xs:text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Your Spiritual Journey
        </h2>

        <p className="mt-3.5 sm:mt-4 text-sm xs:text-base leading-relaxed text-slate-300 text-pretty sm:text-lg">
          A thoughtful progression engineered to help you deepen remembrance,
          sustain vows, and walk steadily toward Krishna.
        </p>
      </MotionReveal>

      {/* Narrative Milestone Tiles with Staggered Elevation */}
      <div className="mt-10 sm:mt-14 grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Milestone 1: Daily Consistency */}
        <MotionReveal delayMs={30} className="h-full">
          <div className="group flex h-full flex-col justify-between rounded-3xl border border-white/[0.08] bg-[#1C1417]/80 p-5 xs:p-6 sm:p-7 shadow-[0_12px_36px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-[transform,box-shadow,border-color,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-[#C29438]/45 hover:bg-[#23181C] hover:shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div>
              <span className="flex size-9 xs:size-10 items-center justify-center rounded-xl border border-[#7A2638]/20 bg-[#281A1F] text-[#E5C378] transition-[transform,border-color] duration-300 ease-out group-hover:scale-105 group-hover:border-[#C29438]/40">
                <Clock className="size-4.5 xs:size-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3 className="mt-4 sm:mt-5 font-display text-base xs:text-lg font-semibold text-white">
                Building a Consistent Daily Practice
              </h3>
              <p className="mt-2 text-xs xs:text-sm leading-relaxed text-slate-300">
                Establish a peaceful morning rhythm. Move from rushed chanting to calm,
                focused meditation with bead-by-bead awareness.
              </p>
            </div>

            <div className="mt-5 sm:mt-6 rounded-xl border border-white/[0.06] bg-[#0F0A0C] p-2.5 xs:p-3 text-[11px] xs:text-xs text-slate-400 transition-colors group-hover:border-white/[0.1]">
              <span className="text-white font-medium">Brahma-muhūrta Rhythm</span> · Best practiced before dawn
            </div>
          </div>
        </MotionReveal>

        {/* Milestone 2: Graceful Carry-Forward */}
        <MotionReveal delayMs={60} className="h-full">
          <div className="group flex h-full flex-col justify-between rounded-3xl border border-white/[0.08] bg-[#1C1417]/80 p-5 xs:p-6 sm:p-7 shadow-[0_12px_36px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-[transform,box-shadow,border-color,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-[#C29438]/45 hover:bg-[#23181C] hover:shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div>
              <span className="flex size-9 xs:size-10 items-center justify-center rounded-xl border border-[#7A2638]/20 bg-[#281A1F] text-[#E5C378] transition-[transform,border-color] duration-300 ease-out group-hover:scale-105 group-hover:border-[#C29438]/40">
                <Target className="size-4.5 xs:size-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3 className="mt-4 sm:mt-5 font-display text-base xs:text-lg font-semibold text-white">
                Graceful Daily Carry-Forward
              </h3>
              <p className="mt-2 text-xs xs:text-sm leading-relaxed text-slate-300">
                Life has unpredictable days. Incomplete rounds roll into tomorrow&apos;s
                effective target so your momentum stays unbroken without guilt.
              </p>
            </div>

            <div className="mt-5 sm:mt-6 rounded-xl border border-white/[0.06] bg-[#0F0A0C] p-2.5 xs:p-3 text-[11px] xs:text-xs text-[#E5C378] transition-colors group-hover:border-white/[0.1]">
              <span>Formula: Base (16) + Pending (5) = 21 Target</span>
            </div>
          </div>
        </MotionReveal>

        {/* Milestone 3: Sacred Sankalpa Vows */}
        <MotionReveal delayMs={90} className="h-full">
          <div className="group flex h-full flex-col justify-between rounded-3xl border border-white/[0.08] bg-[#1C1417]/80 p-5 xs:p-6 sm:p-7 shadow-[0_12px_36px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-[transform,box-shadow,border-color,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-[#C29438]/45 hover:bg-[#23181C] hover:shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div>
              <span className="flex size-9 xs:size-10 items-center justify-center rounded-xl border border-[#7A2638]/20 bg-[#281A1F] text-[#E5C378] transition-[transform,border-color] duration-300 ease-out group-hover:scale-105 group-hover:border-[#C29438]/40">
                <Flame className="size-4.5 xs:size-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3 className="mt-4 sm:mt-5 font-display text-base xs:text-lg font-semibold text-white">
                Sacred Sankalpa Vows
              </h3>
              <p className="mt-2 text-xs xs:text-sm leading-relaxed text-slate-300">
                Establish formal commitments like Kartik vows or 1 Lakh Nama Japa.
                Track independent vow progress while every round still counts toward
                your daily target.
              </p>
            </div>

            <div className="mt-5 sm:mt-6 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0F0A0C] p-2.5 xs:p-3 transition-colors group-hover:border-white/[0.1]">
              <div className="shrink-0 transition-transform duration-300 group-hover:scale-105">
                <SacredRingProgress
                  value={84}
                  max={108}
                  size={44}
                  strokeWidth={4.5}
                  darkSurface={true}
                  label="Kartika Vow progress"
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-white truncate">
                  Kartika Vow · 108 Rounds
                </span>
                <span className="block text-[10px] xs:text-[11px] text-[#E8A4B2] font-medium">
                  84 completed · 24 remaining
                </span>
              </div>
            </div>
          </div>
        </MotionReveal>

        {/* Milestone 4: Honest Annual Heatmap (spanning 2 cols on lg) */}
        <MotionReveal delayMs={120} className="h-full md:col-span-2 lg:col-span-2">
          <div className="group flex h-full flex-col justify-between rounded-3xl border border-white/[0.08] bg-[#1C1417]/80 p-5 xs:p-6 sm:p-7 shadow-[0_12px_36px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-[transform,box-shadow,border-color,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-[#C29438]/45 hover:bg-[#23181C] hover:shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div>
              <span className="flex size-9 xs:size-10 items-center justify-center rounded-xl border border-[#7A2638]/20 bg-[#281A1F] text-[#E5C378] transition-[transform,border-color] duration-300 ease-out group-hover:scale-105 group-hover:border-[#C29438]/40">
                <CalendarDays className="size-4.5 xs:size-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3 className="mt-4 sm:mt-5 font-display text-base xs:text-lg font-semibold text-white">
                Honest Annual Heatmap
              </h3>
              <p className="mt-2 text-xs xs:text-sm leading-relaxed text-slate-300">
                View your genuine devotion across 365 days. A truthful GitHub-style
                activity matrix showing completed rounds and real consistency, grounded
                in actual database records.
              </p>
            </div>

            {/* Micro Heatmap Preview with Interactive Cell Motion */}
            <div className="mt-5 sm:mt-6 rounded-xl border border-white/[0.06] bg-[#0F0A0C] p-3 xs:p-4 transition-colors group-hover:border-white/[0.1]">
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 text-[11px] xs:text-xs text-slate-400">
                <span className="text-white font-medium">Daily Chanting Heatmap (365 Days)</span>
                <span className="text-[#E8A4B2]">16 Rounds / Day Average</span>
              </div>
              <div className="mt-2.5 xs:mt-3 grid grid-cols-12 gap-1 xs:gap-1.5 sm:grid-cols-24">
                {[...Array(24)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-3.5 xs:h-4 rounded-xs transition-[transform,box-shadow] duration-200 hover:scale-125 hover:z-10 hover:shadow-[0_0_8px_rgba(229,195,120,0.6)] cursor-pointer ${
                      i % 7 === 0
                        ? "bg-white/10"
                        : i % 3 === 0
                          ? "bg-[#7A2638]/40"
                          : i % 2 === 0
                            ? "bg-[#9E364C]"
                            : "bg-[#E5C378]"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </MotionReveal>

        {/* Milestone 5: Devotional Fellowship */}
        <MotionReveal delayMs={150} className="h-full">
          <div className="group flex h-full flex-col justify-between rounded-3xl border border-white/[0.08] bg-[#1C1417]/80 p-5 xs:p-6 sm:p-7 shadow-[0_12px_36px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-[transform,box-shadow,border-color,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-[#C29438]/45 hover:bg-[#23181C] hover:shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div>
              <span className="flex size-9 xs:size-10 items-center justify-center rounded-xl border border-[#7A2638]/20 bg-[#281A1F] text-[#E5C378] transition-[transform,border-color] duration-300 ease-out group-hover:scale-105 group-hover:border-[#C29438]/40">
                <Users className="size-4.5 xs:size-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3 className="mt-4 sm:mt-5 font-display text-base xs:text-lg font-semibold text-white">
                Devotional Fellowship
              </h3>
              <p className="mt-2 text-xs xs:text-sm leading-relaxed text-slate-300">
                Join fellow Vaishnavas in quiet shared chanting goals. Encouragement,
                brotherhood, and collective strength without comparison or competition.
              </p>
            </div>

            <div className="mt-5 sm:mt-6 rounded-xl border border-white/[0.06] bg-[#0F0A0C] p-2.5 xs:p-3 text-[11px] xs:text-xs text-slate-400 transition-colors group-hover:border-white/[0.1]">
              <span className="text-white font-medium">Shared Nama Japa</span> · Circles of sincere devotees
            </div>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
