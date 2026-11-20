import Link from "next/link";
import { ArrowRight, Flame, ShieldCheck, Sparkles } from "lucide-react";
import { LotusEmblem } from "@/components/sacred/ornaments";
import { VeoHeroBackground } from "@/components/sacred/veo-media-frame";

export function LandingHero() {
  return (
    <section className="relative flex min-h-[calc(100dvh-7.25rem-env(safe-area-inset-bottom))] items-center overflow-hidden border-b border-white/[0.08] bg-[#140E10] text-white lg:min-h-[calc(100dvh-3.5rem-1px)]">
      <VeoHeroBackground
        videoSrc="/media/vrindavan-lake-boat.mp4"
        alt="Tranquil Vrindavan twilight lake with a wooden devotional boat drifting across calm water"
      />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-10 px-5 pt-10 pb-16 sm:px-8 sm:pt-14 sm:pb-20 lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:gap-14 lg:py-20">
        {/* Left Column: Heading, Devotional Pitch & CTAs */}
        <div className="flex flex-col items-start">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C29438]/35 bg-[#24171B]/80 px-3.5 py-1 text-xs font-medium text-[#E5C378] backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            <LotusEmblem size={13} className="text-[#C29438]" />
            <span> devotional platform</span>
          </div>

          <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.08] tracking-tight text-white text-balance drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] sm:text-6xl lg:text-7xl">
            SMARAN
            <span className="mt-2 block font-devanagari text-2xl font-normal text-[#E5C378] sm:text-3xl lg:text-4xl">
              स्मरण
            </span>
          </h1>

          <p className="mt-3 font-serif text-lg font-medium tracking-wide text-[#F3E2B8]/95 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] sm:text-2xl">
            One mantra at a time.
          </p>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 text-pretty drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] sm:text-lg">
            A peaceful space to build your chanting practice, deepen your devotion
            and stay connected with Krishna.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Link
              href="/auth?next=/sadhana"
              className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#9E364C]/50 bg-[#7A2638] px-6 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(122,38,56,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all hover:bg-[#641C2C] active:scale-[0.98]"
            >
              <Flame className="size-4 text-[#E5C378]" aria-hidden="true" />
              <span>Begin Your Journey</span>
              <ArrowRight
                className="size-4 transition-transform duration-150 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
            <a
              href="#experience"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/20 bg-white/[0.06] px-5 text-sm font-medium text-slate-100 backdrop-blur-md transition-all hover:border-[#7A2638]/60 hover:bg-[#7A2638]/15 active:scale-[0.98]"
            >
              Explore SMARAN
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/[0.12] pt-6 text-xs text-slate-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck
                className="size-4 text-[#E5C378]"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              Private chanting records by default
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles
                className="size-4 text-[#E5C378]"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              Technology in service of devotion
            </span>
          </div>
        </div>

        {/* Right Column: Contemplative Sanctum Mahamantra & Sacred Darshan Card */}
        <div className="relative mx-auto w-full max-w-md lg:mx-0">
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.14] bg-[#1E1518]/90 p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl sm:p-6">
            {/* Ambient illumination */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 -right-24 size-60 rounded-full bg-[#C29438]/15 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 -left-24 size-60 rounded-full bg-[#7A2638]/25 blur-3xl"
            />

            <div className="relative z-10 flex flex-col">
              {/* Sacred Darshan Painting of Sri Krishna */}
              <div className="group relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-[#C29438]/35 bg-[#0F0A0C] shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/media/krishna-flute-vrindavan.jpg"
                  alt="Bhagavan Sri Krishna playing the flute under the kadamba tree by the Yamuna with peaceful cows in Vrindavan"
                  className="size-full object-cover object-[center_35%] transition-transform duration-700 ease-out group-hover:scale-105"
                />
                {/* Subtle soft vignette & bottom gradient to blend gently */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1E1518] via-transparent to-black/20"
                />

                {/* Top Devotional Pill */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full border border-[#C29438]/40 bg-[#140E10]/85 px-2.5 py-1 text-[11px] font-medium text-[#E5C378] backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
                  <LotusEmblem size={12} className="text-[#C29438]" />
                  <span></span>
                </div>
              </div>

              {/* Mantra Header & Sacred Lotus */}
              <div className="mt-4 flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold tracking-widest text-[#E5C378] uppercase">
                  Mahā-mantra · महामन्त्र
                </span>
                <span className="flex size-7 items-center justify-center rounded-lg border border-[#C29438]/30 bg-[#24171B] text-[#E5C378]">
                  <LotusEmblem size={15} />
                </span>
              </div>

              {/* Sacred Chanting Verse Box */}
              <div className="mt-2.5 w-full space-y-1.5 rounded-2xl border border-white/[0.08] bg-[#120B0E]/80 px-4 py-3.5 text-center backdrop-blur-sm">
                <p className="font-devanagari text-base leading-relaxed font-medium text-[#F3E2B8] drop-shadow-sm sm:text-lg">
                  हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे ।
                </p>
                <p className="font-devanagari text-base leading-relaxed font-medium text-[#F3E2B8] drop-shadow-sm sm:text-lg">
                  हरे राम हरे राम राम राम हरे हरे ॥
                </p>
                <p className="mt-1 font-serif text-[11px] tracking-wider text-slate-400 italic">
                  hare kṛṣṇa hare kṛṣṇa kṛṣṇa kṛṣṇa hare hare
                  <br />
                  hare rāma hare rāma rāma rāma hare hare
                </p>
              </div>

              {/* Japa Bead Rhythm Indicator */}
              <div className="mt-4 flex w-full items-center justify-between gap-3 border-t border-white/[0.08] pt-3 text-left">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">
                    Daily Sādhana Rhythm
                  </span>
                  <p className="text-sm font-semibold text-white">
                    108 Beads · 16 Rounds Target
                  </p>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-[#7A2638]/40 bg-[#7A2638]/20 px-3 py-1 text-xs font-medium text-[#E8A4B2]">
                  <span className="size-2 animate-pulse rounded-full bg-[#9E364C]" />
                  <span>Sacred Japa</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
