import Link from "next/link";
import { LotusEmblem } from "@/components/sacred/ornaments";

export function LandingFooter() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#0D090B] text-slate-400">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-18">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="sm:col-span-2 space-y-4">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-white"
              aria-label="SMARAN Home"
            >
              <span className="flex size-9 items-center justify-center rounded-xl border border-[#C29438]/35 bg-[#24171B] text-[#E5C378] shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                <LotusEmblem size={20} />
              </span>
              <span className="font-display text-xl font-semibold tracking-tight text-white">
                SMARAN{" "}
                <span className="font-devanagari text-sm font-normal text-[#E5C378]">
                  स्मरण
                </span>
              </span>
            </Link>

            <p className="font-serif text-sm tracking-wide text-[#F3E2B8]/85 italic">
              Remember Him. Stay Connected.
            </p>

            <p className="max-w-sm text-xs leading-relaxed text-slate-400 text-pretty">
              A peaceful digital sanctuary dedicated to sustaining daily Japa
              practice, personal spiritual discipline, and genuine devotional
              fellowship without commercial distraction.
            </p>
          </div>

          {/* Navigation Column: Spaces */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold tracking-wider text-[#E5C378] uppercase">
              Sanctuary
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/"
                  className="transition-colors hover:text-white"
                >
                  Dṛṣṭi · Contemplation
                </Link>
              </li>
              <li>
                <Link
                  href="/sadhana/chant"
                  className="transition-colors hover:text-white"
                >
                  Japa · 108 Beads
                </Link>
              </li>
              <li>
                <Link
                  href="/sadhana"
                  className="transition-colors hover:text-white"
                >
                  Lakshya · Daily Goals
                </Link>
              </li>
              <li>
                <Link
                  href="/rooms"
                  className="transition-colors hover:text-white"
                >
                  Satsang · Chanting Circles
                </Link>
              </li>
            </ul>
          </div>

          {/* Navigation Column: Practice & Sādhana */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold tracking-wider text-[#E5C378] uppercase">
              Practice
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/sadhana"
                  className="transition-colors hover:text-white"
                >
                  Personal Sādhana
                </Link>
              </li>
              <li>
                <Link
                  href="/sadhana/analytics"
                  className="transition-colors hover:text-white"
                >
                  Annual Heatmap
                </Link>
              </li>
              <li>
                <Link
                  href="/account"
                  className="transition-colors hover:text-white"
                >
                  Account &amp; Security
                </Link>
              </li>
              <li>
                <Link
                  href="/design-system"
                  className="transition-colors hover:text-white"
                >
                  Design System
                </Link>
              </li>
            </ul>
          </div>

          {/* Privacy & Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold tracking-wider text-[#E5C378] uppercase">
              Devotional Trust
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/account?tab=privacy"
                  className="transition-colors hover:text-white"
                >
                  Privacy Policy &amp; Controls
                </Link>
              </li>
              <li>
                <a
                  href="#privacy"
                  className="transition-colors hover:text-white"
                >
                  Private by Default
                </a>
              </li>
              <li>
                <span className="text-slate-500">
                  Terms of Devotional Use
                </span>
              </li>
              <li>
                <span className="text-slate-500">
                  Zero Commercial Ads
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Attribution */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/[0.08] pt-8 text-center text-xs text-slate-500 sm:flex-row sm:text-left">
          <p>
            &copy; 2026 SMARAN. Non-profit devotional platform dedicated to Sri
            Krishna.
          </p>
          <p className="text-[11px] text-[#F3E2B8]/70">
            Dedicated with devotion for Vaishnavas and practitioners worldwide.
          </p>
        </div>
      </div>
    </footer>
  );
}
