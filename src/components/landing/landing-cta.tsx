import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { LotusEmblem } from "@/components/sacred/ornaments";
import { MotionReveal } from "@/components/ui/motion-reveal";

export function LandingCta() {
  return (
    <section className="group relative flex min-h-[520px] xs:min-h-[580px] sm:min-h-[700px] lg:min-h-[780px] flex-col justify-end overflow-hidden border-t border-white/[0.08] bg-[#0D090B] px-4 xs:px-5 pb-10 sm:pb-16 pt-28 xs:pt-36 sm:pt-48 text-center text-white">
      {/* Full-Cover Background Artwork — Calibrated to Padmaraga & Temple Night Theme with Subtle Dynamic Hover Depth */}
      <div className="absolute inset-0 size-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/media/pancha-tattva-sankirtana.jpg"
          alt="Śrī Pañca-Tattva Harināma Saṅkīrtana led by Lord Caitanya and Lord Nityānanda in divine bliss"
          className="size-full object-cover object-[center_top] brightness-[0.90] contrast-[1.18] saturate-[1.16] transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
        />

        {/* 1. Subtle warm temple tone grade to integrate image shadows with the app theme */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[#140E10]/20 mix-blend-multiply"
        />

        {/* 2. Top seamless blend from preceding section */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#140E10] via-[#140E10]/50 to-transparent"
        />

        {/* 3. Perimeter vignette framing the upper scene */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_25%,transparent_60%,rgba(10,6,8,0.55)_100%)]"
        />

        {/* 4. Deep velvety black shadow rising from the bottom — no box, pure seamless shade */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[400px] sm:h-[500px] bg-gradient-to-t from-[#0D090B] via-[#0D090B]/92 via-50% to-transparent"
        />
      </div>

      {/* Text, Badge & Actions — Floating directly inside the deep black shadow with Majestic Entrance Reveal */}
      <MotionReveal delayMs={40} className="relative z-10 mx-auto w-full max-w-3xl">
        {/* Devotional Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#C29438]/40 bg-[#140E10]/85 px-3.5 py-1 xs:px-4 xs:py-1.5 text-xs font-medium text-[#E5C378] backdrop-blur-md shadow-sm transition-transform duration-300 hover:scale-[1.02]">
          <LotusEmblem size={14} className="text-[#C29438]" />
          <span>Śrī Pañca-Tattva Harināma Saṅkīrtana</span>
        </div>

        {/* Headline with Cormorant Editorial Typography */}
        <h2 className="mt-4 sm:mt-5 font-display text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-semibold leading-[1.14] tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] text-balance">
          Let remembrance become a part of your day.
        </h2>

        {/* Subtitle */}
        <p className="mt-2.5 sm:mt-3 font-serif text-sm xs:text-base sm:text-xl font-medium text-[#F3E2B8] drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
          Start wherever you are. Begin with one round.
        </p>

        {/* Call-to-Action Buttons */}
        <div className="mt-6 sm:mt-8 flex flex-col xs:flex-row items-stretch xs:items-center justify-center gap-3 xs:gap-3.5 w-full xs:w-auto">
          <Link
            href="/auth?next=/sadhana"
            className="group/cta inline-flex h-11 sm:h-12 w-full xs:w-auto items-center justify-center gap-2 rounded-xl border border-[#9E364C]/50 bg-[#7A2638] px-6 sm:px-8 text-sm font-semibold text-white shadow-[0_4px_24px_rgba(122,38,56,0.5),inset_0_1px_0_rgba(255,255,255,0.25)] transition-[transform,background-color,box-shadow] duration-200 hover:bg-[#641C2C] hover:shadow-[0_6px_32px_rgba(122,38,56,0.7)] active:scale-[0.97]"
          >
            <Flame className="size-4 text-[#E5C378]" aria-hidden="true" />
            <span>Begin Your Journey</span>
            <ArrowRight
              className="size-4 transition-transform duration-200 ease-out group-hover/cta:translate-x-1.5"
              aria-hidden="true"
            />
          </Link>
          <Link
            href="/auth"
            className="inline-flex h-11 sm:h-12 w-full xs:w-auto items-center justify-center rounded-xl border border-white/20 bg-white/[0.08] px-6 sm:px-7 text-sm font-medium text-slate-100 backdrop-blur-md transition-[transform,background-color,border-color,color] duration-200 hover:border-[#C29438]/50 hover:bg-[#7A2638]/20 hover:text-white active:scale-[0.97]"
          >
            Sign In
          </Link>
        </div>

        <p className="mt-6 sm:mt-7 text-xs font-medium text-slate-400 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
          Non-profit devotional sanctuary · Free for all sincere devotees
        </p>
      </MotionReveal>
    </section>
  );
}
