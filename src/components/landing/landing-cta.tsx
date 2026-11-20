import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { LotusEmblem } from "@/components/sacred/ornaments";

export function LandingCta() {
  return (
    <section className="relative overflow-hidden border-t border-white/[0.08] bg-[#140E10] px-5 py-20 text-center text-white sm:px-8 sm:py-28">
      {/* Subtle radial illumination */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_35%,rgba(122,38,56,0.22),transparent_70%)]"
      />

      <div className="relative z-10 mx-auto max-w-4xl">
        {/* Pancha Tattva Harinama Sankirtana Sacred Frame */}
        <div className="group relative mx-auto mb-12 aspect-[16/8] w-full max-w-3xl overflow-hidden rounded-3xl border border-[#C29438]/35 bg-[#0F0A0C] shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/media/pancha-tattva-sankirtana.jpg"
            alt="Śrī Pañca-Tattva Harināma Saṅkīrtana led by Lord Caitanya and Lord Nityānanda in divine bliss"
            className="size-full object-cover object-[center_32%] transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#140E10] via-transparent to-black/20"
          />
          <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 rounded-full border border-[#C29438]/40 bg-[#140E10]/85 px-3 py-1 text-xs font-medium text-[#E5C378] backdrop-blur-md shadow-sm">
            <LotusEmblem size={13} className="text-[#C29438]" />
            <span>Śrī Pañca-Tattva Harināma Saṅkīrtana</span>
          </div>
        </div>

        <div className="mx-auto max-w-2xl text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-[#C29438]/40 bg-[#24171B] text-[#E5C378] shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
            <LotusEmblem size={24} />
          </span>

          <h2 className="mt-6 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Let remembrance become a part of your day.
          </h2>

          <p className="mt-4 font-serif text-lg text-[#F3E2B8]/90 sm:text-xl">
            Start wherever you are. Begin with one round.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href="/auth?next=/sadhana"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#9E364C]/50 bg-[#7A2638] px-7 text-sm font-semibold text-white shadow-[0_4px_24px_rgba(122,38,56,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all hover:bg-[#641C2C] active:scale-[0.98]"
            >
              <Flame className="size-4 text-[#E5C378]" aria-hidden="true" />
              <span>Begin Your Journey</span>
              <ArrowRight
                className="size-4 transition-transform duration-150 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/auth"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 bg-white/[0.06] px-6 text-sm font-medium text-slate-100 backdrop-blur-md transition-all hover:border-[#7A2638]/60 hover:bg-[#7A2638]/15 active:scale-[0.98]"
            >
              Sign In
            </Link>
          </div>

          <p className="mt-8 text-xs text-slate-400">
            Non-profit devotional sanctuary · Free for all sincere devotees
          </p>
        </div>
      </div>
    </section>
  );
}
