"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { LotusEmblem } from "@/components/sacred/ornaments";

export function LandingNavbar() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/[0.08] bg-[#140E10]/85 backdrop-blur-xl transition-colors shadow-[0_4px_24px_-8px_rgba(0,0,0,0.6)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-8 sm:py-3.5">
        {/* Brand Lockup */}
        <Link
          href="/"
          className="group flex items-center gap-3 text-slate-100 transition-opacity hover:opacity-95"
          aria-label="SMARAN Home"
        >
          <span className="flex size-9 items-center justify-center rounded-xl border border-[#C29438]/40 bg-[#24171B] text-[#E5C378] shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] transition-transform duration-200 group-hover:scale-105">
            <LotusEmblem size={20} />
          </span>
          <div className="flex flex-col">
            <span className="font-display text-lg font-semibold tracking-tight text-white sm:text-xl">
              SMARAN{" "}
              <span className="font-devanagari text-xs font-normal text-[#E5C378] sm:text-sm">
                स्मरण
              </span>
            </span>
            <span className="text-[10px] tracking-wider text-slate-400 uppercase">
              Devotional Sanctuary
            </span>
          </div>
        </Link>

        {/* Minimal Anchor Navigation */}
        <nav
          aria-label="Landing page sections"
          className="hidden items-center gap-1 md:flex"
        >
          <a
            href="#experience"
            className="rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            Experience
          </a>
          <a
            href="#journey"
            className="rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            Your Journey
          </a>
          <a
            href="#about"
            className="rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            About
          </a>
          <a
            href="#privacy"
            className="rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            Privacy
          </a>
        </nav>

        {/* Auth CTA Actions */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/auth"
            className="inline-flex h-9 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-3.5 text-xs font-medium text-slate-200 backdrop-blur-xs transition-all hover:border-[#7A2638]/60 hover:bg-[#7A2638]/15 hover:text-white active:scale-[0.98] sm:text-sm"
          >
            Sign In
          </Link>
          <Link
            href="/auth?next=/sadhana"
            className="group inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#9E364C]/50 bg-[#7A2638] px-4 text-xs font-semibold text-white shadow-[0_2px_14px_rgba(122,38,56,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all hover:bg-[#641C2C] active:scale-[0.98] sm:text-sm"
          >
            <Flame className="size-3.5 text-[#E5C378]" aria-hidden="true" />
            <span>Begin Your Journey</span>
            <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
