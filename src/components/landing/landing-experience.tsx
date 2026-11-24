import Link from "next/link";
import { ArrowRight, Compass, Flame, Target, Users } from "lucide-react";
import { LotusEmblem } from "@/components/sacred/ornaments";
import { MotionReveal } from "@/components/ui/motion-reveal";

export function LandingExperience() {
  return (
    <section
      id="experience"
      className="relative border-y border-white/[0.08] bg-[#0F0A0C]/90 py-14 xs:py-18 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 xs:px-5 sm:px-8">
        {/* Section Header */}
        <MotionReveal className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C29438]/35 bg-[#24171B]/90 px-3.5 py-1 text-xs font-medium text-[#E5C378] shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-transform duration-300 hover:scale-[1.02]">
            <LotusEmblem size={13} className="text-[#C29438]" />
            <span>Four Sacred Spaces · चार धाम</span>
          </div>

          <h2 className="mt-5 font-display text-2xl xs:text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Experience SMARAN
          </h2>

          <p className="mt-3.5 sm:mt-4 text-sm xs:text-base leading-relaxed text-slate-300 text-pretty sm:text-lg">
            Purposefully designed devotional environments created to elevate your
            meditation, clarify your commitments, and connect you with sincere
            devotees.
          </p>
        </MotionReveal>

        {/* 4 Sacred Experiences in Custom Devotional Bento Grid with Staggered Reveals */}
        <div className="mt-10 sm:mt-14 grid gap-6 sm:gap-8 lg:grid-cols-2">
          {/* 1. JAPA (The Core Practice) */}
          <MotionReveal delayMs={30} className="h-full">
            <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/[0.08] bg-[#1C1417]/85 p-5 xs:p-6 sm:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-[transform,box-shadow,border-color,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-[#C29438]/50 hover:bg-[#23181C]/95 hover:shadow-[0_20px_50px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div>
                {/* Devotional Art Frame: Japa Meditation with Sri Krishna in Clear View */}
                <div className="group/japa relative h-52 xs:h-60 sm:h-72 w-full overflow-hidden rounded-2xl border border-[#C29438]/30 bg-[#0F0A0C] shadow-inner transition-colors group-hover:border-[#C29438]/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/media/japa-devotee-meditation.jpg"
                    alt="Devotee immersed in Japa meditation with Sri Krishna in clear remembrance"
                    className="size-full object-cover object-[center_35%] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/japa:scale-105"
                  />
                  {/* Subtle bottom vignette to keep artwork completely clear and visible */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0F0A0C]/90 via-[#0F0A0C]/15 to-transparent"
                  />

                  {/* Bottom Floating Japa Progress Controller */}
                  <div className="absolute inset-x-2.5 xs:inset-x-3 bottom-2.5 xs:bottom-3 flex items-center justify-between rounded-xl border border-white/[0.12] bg-[#1E1518]/92 px-3 xs:px-4 py-2 xs:py-2.5 text-[11px] xs:text-xs backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:translate-y-[-2px]">
                    <span className="font-medium text-slate-200">Bead 64 of 108</span>
                    <span className="font-semibold text-[#E5C378]">Round 4 / 16</span>
                  </div>
                </div>

                {/* Title & Description */}
                <div className="mt-5 sm:mt-6 flex items-center gap-2.5">
                  <span className="flex size-8.5 xs:size-9 items-center justify-center rounded-xl border border-[#7A2638]/20 bg-[#281A1F] text-[#E5C378] transition-[transform,border-color] duration-300 ease-out group-hover:scale-105 group-hover:border-[#C29438]/40">
                    <Flame className="size-4 xs:size-4.5" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <h3 className="font-display text-xl xs:text-2xl font-semibold text-white">
                    Japa · Sacred 108-Bead Mala
                  </h3>
                </div>

                <p className="mt-2.5 sm:mt-3 text-xs xs:text-sm leading-relaxed text-slate-300 text-pretty">
                  A distraction-free counting experience. Choose between tactile 108-bead
                  Japa Mala navigation with soft haptics or instant Manual Counter. Every
                  round is recorded once, protected by transactional database integrity.
                </p>
              </div>

              <div className="mt-6 sm:mt-7 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2.5 xs:gap-4 border-t border-white/[0.08] pt-4 sm:pt-5">
                <span className="text-[11px] xs:text-xs font-medium text-slate-400">
                  Supports offline sync &amp; multi-session pause
                </span>
                <Link
                  href="/sadhana/chant"
                  className="group/btn inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#E8A4B2] transition-colors hover:text-white active:scale-[0.97]"
                >
                  <span>Enter Japa</span>
                  <ArrowRight className="size-3.5 transition-transform duration-200 ease-out group-hover/btn:translate-x-1.5" />
                </Link>
              </div>
            </div>
          </MotionReveal>

          {/* 2. LAKSHYA (Daily Targets & Carry-Forward Engine) */}
          <MotionReveal delayMs={60} className="h-full">
            <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/[0.08] bg-[#1C1417]/85 p-5 xs:p-6 sm:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-[transform,box-shadow,border-color,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-[#C29438]/50 hover:bg-[#23181C]/95 hover:shadow-[0_20px_50px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div>
                {/* Carry-Forward Live Ledger & Devotional Surrender Frame */}
                <div className="group/lakshya relative h-52 xs:h-60 sm:h-72 w-full overflow-hidden rounded-2xl border border-[#C29438]/30 bg-[#0F0A0C] shadow-inner transition-colors group-hover:border-[#C29438]/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/media/lakshya-devotional-surrender.jpg"
                    alt="Devotees offering dandavat prostrations before Sri Krishna in devotional determination and surrender"
                    className="size-full object-cover object-[center_30%] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/lakshya:scale-105"
                  />
                  {/* Subtle bottom vignette */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0F0A0C]/95 via-[#0F0A0C]/30 to-transparent"
                  />

                  {/* Carry-Forward Live Ledger Overlay with Safe Responsive Column Labels */}
                  <div className="absolute inset-x-2.5 xs:inset-x-3 bottom-2.5 xs:bottom-3 rounded-xl border border-white/[0.12] bg-[#1E1518]/92 p-2 xs:p-2.5 text-xs backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:translate-y-[-2px]">
                    <div className="grid grid-cols-3 gap-1.5 xs:gap-2 text-center">
                      <div className="rounded-lg border border-white/[0.06] bg-white/[0.04] p-1 xs:p-1.5">
                        <span className="block text-[9px] xs:text-[10px] text-slate-400 truncate">
                          <span className="hidden sm:inline">Daily Base Target</span>
                          <span className="sm:hidden">Base Target</span>
                        </span>
                        <span className="font-semibold text-xs xs:text-sm text-white">16 Rounds</span>
                      </div>
                      <div className="rounded-lg border border-[#C29438]/25 bg-[#C29438]/10 p-1 xs:p-1.5">
                        <span className="block text-[9px] xs:text-[10px] text-[#E5C378] truncate">
                          <span className="hidden sm:inline">Yesterday Balance</span>
                          <span className="sm:hidden">Carried</span>
                        </span>
                        <span className="font-semibold text-xs xs:text-sm text-[#E5C378]">+5 Rounds</span>
                      </div>
                      <div className="rounded-lg border border-[#7A2638]/30 bg-[#281A1F] p-1 xs:p-1.5 font-medium">
                        <span className="block text-[9px] xs:text-[10px] text-slate-300 truncate">
                          <span className="hidden sm:inline">Today Effective Target</span>
                          <span className="sm:hidden">Effective</span>
                        </span>
                        <span className="font-bold text-xs xs:text-sm text-[#E5C378]">21 Rounds</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Title & Description */}
                <div className="mt-5 sm:mt-6 flex items-center gap-2.5">
                  <span className="flex size-8.5 xs:size-9 items-center justify-center rounded-xl border border-[#7A2638]/20 bg-[#281A1F] text-[#E5C378] transition-[transform,border-color] duration-300 ease-out group-hover:scale-105 group-hover:border-[#C29438]/40">
                    <Target className="size-4 xs:size-4.5" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <h3 className="font-display text-xl xs:text-2xl font-semibold text-white">
                    Lakshya · Automatic Carry-Forward
                  </h3>
                </div>

                <p className="mt-2.5 sm:mt-3 text-xs xs:text-sm leading-relaxed text-slate-300 text-pretty">
                  Spiritual discipline without artificial guilt. Yesterday&apos;s unfinished rounds
                  automatically become part of today&apos;s effective goal through our verified
                  carry-forward formula. Four flexible policies: Automatic, Optional, Fresh Daily, or Custom Cap.
                </p>
              </div>

              <div className="mt-6 sm:mt-7 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2.5 xs:gap-4 border-t border-white/[0.08] pt-4 sm:pt-5">
                <span className="text-[11px] xs:text-xs font-medium text-slate-400">
                  Formula: Target = Base + Carried Balance
                </span>
                <Link
                  href="/sadhana"
                  className="group/btn inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#E8A4B2] transition-colors hover:text-white active:scale-[0.97]"
                >
                  <span>View Lakshya Dashboard</span>
                  <ArrowRight className="size-3.5 transition-transform duration-200 ease-out group-hover/btn:translate-x-1.5" />
                </Link>
              </div>
            </div>
          </MotionReveal>

          {/* 3. DRSTI (Sanctuary of Contemplation) */}
          <MotionReveal delayMs={90} className="h-full">
            <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/[0.08] bg-[#1C1417]/85 p-5 xs:p-6 sm:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-[transform,box-shadow,border-color,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-[#C29438]/50 hover:bg-[#23181C]/95 hover:shadow-[0_20px_50px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div>
                {/* Twilight Contemplation Window with Sacred Dṛṣṭi Artwork */}
                <div className="group/frame relative h-64 xs:h-72 sm:h-80 w-full overflow-hidden rounded-2xl border border-[#C29438]/30 bg-[#0F0A0C] shadow-inner transition-colors group-hover:border-[#C29438]/50">
                  {/* Ambient blurred backdrop to match lighting */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/media/krishna-jharokha-drsti.jpg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 size-full scale-110 object-cover object-center blur-2xl opacity-35"
                  />

                  {/* Primary crisp, fully-fitted sacred artwork */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/media/krishna-jharokha-drsti.jpg"
                    alt="Śrī Śrī Rādhā-Kṛṣṇa Divine Rāsa Līlā in the groves of sacred Vṛndāvana"
                    className="relative z-10 size-full object-contain object-center transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/frame:scale-102"
                  />

                  {/* Subtle depth vignette */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-[#0F0A0C] via-transparent to-black/30"
                  />

                  {/* Bottom Contemplative Verse */}
                  <div className="absolute inset-x-4 bottom-2.5 xs:bottom-3 z-30 text-center">
                    <p className="font-serif text-[11px] xs:text-xs italic text-[#F3E2B8]/95 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                      &ldquo;Whenever the mind wanders, bring it back to Krishna.&rdquo;
                    </p>
                  </div>
                </div>

                {/* Title & Description */}
                <div className="mt-5 sm:mt-6 flex items-center gap-2.5">
                  <span className="flex size-8.5 xs:size-9 items-center justify-center rounded-xl border border-[#7A2638]/20 bg-[#281A1F] text-[#E5C378] transition-[transform,border-color] duration-300 ease-out group-hover:scale-105 group-hover:border-[#C29438]/40">
                    <Compass className="size-4 xs:size-4.5" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <h3 className="font-display text-xl xs:text-2xl font-semibold text-white">
                    Dṛṣṭi · Contemplative Vision
                  </h3>
                </div>

                <p className="mt-2.5 sm:mt-3 text-xs xs:text-sm leading-relaxed text-slate-300 text-pretty">
                  Centering the heart before beginning your beads. Reflective sacred
                  compositions and Vrindavan vistas designed to still mental chatter and
                  ground your consciousness in devotional presence.
                </p>
              </div>

              <div className="mt-6 sm:mt-7 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2.5 xs:gap-4 border-t border-white/[0.08] pt-4 sm:pt-5">
                <span className="text-[11px] xs:text-xs font-medium text-slate-400">
                  Peaceful, distraction-free environment
                </span>
                <Link
                  href="/drsti"
                  className="group/btn inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#E8A4B2] transition-colors hover:text-white active:scale-[0.97]"
                >
                  <span>Enter Sanctum</span>
                  <ArrowRight className="size-3.5 transition-transform duration-200 ease-out group-hover/btn:translate-x-1.5" />
                </Link>
              </div>
            </div>
          </MotionReveal>

          {/* 4. SATSANG (Devotional Circles) */}
          <MotionReveal delayMs={120} className="h-full">
            <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/[0.08] bg-[#1C1417]/85 p-5 xs:p-6 sm:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-[transform,box-shadow,border-color,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-[#C29438]/50 hover:bg-[#23181C]/95 hover:shadow-[0_20px_50px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div>
                {/* Sacred Satsang Assembly & Community Circles Frame */}
                <div className="group/satsang relative h-64 xs:h-72 sm:h-80 w-full overflow-hidden rounded-2xl border border-[#C29438]/30 bg-[#0F0A0C] shadow-inner transition-colors group-hover:border-[#C29438]/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/media/satsang-sacred-assembly.jpg"
                    alt="Holy assembly of devotees and sages in devotional Satsang hearing the sacred nectar"
                    className="size-full object-cover object-[center_30%] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/satsang:scale-105"
                  />
                  {/* Gentle twilight vignette and bottom gradient */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0F0A0C]/95 via-[#0F0A0C]/25 to-black/20"
                  />

                  {/* Bottom Floating Community Fellowship Progress Bar */}
                  <div className="absolute inset-x-2.5 xs:inset-x-3 bottom-2.5 xs:bottom-3 rounded-xl border border-white/[0.12] bg-[#1E1518]/92 p-2.5 xs:p-3 text-xs backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:translate-y-[-2px]">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white truncate max-w-[150px] xs:max-w-none">Vrindavan Morning Circle</span>
                      <span className="rounded-full border border-[#7A2638]/40 bg-[#7A2638]/20 px-2 py-0.5 text-[10px] font-medium text-[#E8A4B2]">
                        Active Satsang
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] xs:text-[11px] text-slate-300">
                      <span>Shared Community Target</span>
                      <span className="font-semibold text-[#E5C378]">640 / 1,000 Rounds</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-[64%] rounded-full bg-gradient-to-r from-[#C29438] to-[#9E364C]" />
                    </div>
                  </div>
                </div>

                {/* Title & Description */}
                <div className="mt-5 sm:mt-6 flex items-center gap-2.5">
                  <span className="flex size-8.5 xs:size-9 items-center justify-center rounded-xl border border-[#7A2638]/20 bg-[#281A1F] text-[#E5C378] transition-[transform,border-color] duration-300 ease-out group-hover:scale-105 group-hover:border-[#C29438]/40">
                    <Users className="size-4 xs:size-4.5" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <h3 className="font-display text-xl xs:text-2xl font-semibold text-white">
                    Satsang · Chanting Circles
                  </h3>
                </div>

                <p className="mt-2.5 sm:mt-3 text-xs xs:text-sm leading-relaxed text-slate-300 text-pretty">
                  Chant together in public and private fellowship circles. Set collective
                  milestones, share voluntary daily rounds, and support fellow devotees
                  while maintaining absolute ownership over your private chanting records.
                </p>
              </div>

              <div className="mt-6 sm:mt-7 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2.5 xs:gap-4 border-t border-white/[0.08] pt-4 sm:pt-5">
                <span className="text-[11px] xs:text-xs font-medium text-slate-400">
                  Zero competitive rankings or leaderboards
                </span>
                <Link
                  href="/rooms"
                  className="group/btn inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#E8A4B2] transition-colors hover:text-white active:scale-[0.97]"
                >
                  <span>Explore Chanting Circles</span>
                  <ArrowRight className="size-3.5 transition-transform duration-200 ease-out group-hover/btn:translate-x-1.5" />
                </Link>
              </div>
            </div>
          </MotionReveal>
        </div>
      </div>
    </section>
  );
}
