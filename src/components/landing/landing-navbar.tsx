"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { LotusEmblem } from "@/components/sacred/ornaments";
import { createClient } from "@/lib/supabase/client";

export function LandingNavbar() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          setIsAuthenticated(true);
        }
      });
    } catch {
      // In SSR or test environment without Supabase URL
    }
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/[0.08] bg-[#140E10]/85 backdrop-blur-xl transition-all duration-300 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.6)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-1.5 px-2.5 xs:gap-2 xs:px-4 sm:gap-4 sm:px-8 py-2.5 sm:py-3.5">
        {/* Brand Lockup */}
        <Link
          href={isAuthenticated ? "/sadhana" : "/"}
          className="group flex shrink-0 items-center gap-1.5 text-slate-100 transition-opacity hover:opacity-95 xs:gap-2 sm:gap-3"
          aria-label="SMARAN Home"
        >
          <span className="flex size-7.5 shrink-0 items-center justify-center rounded-xl border border-[#C29438]/40 bg-[#24171B] text-[#E5C378] shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] transition-transform duration-300 group-hover:scale-105 group-hover:border-[#C29438]/60 xs:size-8 sm:size-9">
            <LotusEmblem size={17} />
          </span>
          <div className="flex flex-col whitespace-nowrap">
            <span className="font-display text-sm font-semibold tracking-tight text-white xs:text-base sm:text-xl leading-tight">
              SMARAN{" "}
              <span className="font-devanagari text-xs font-normal text-[#E5C378] sm:text-sm">
                स्मरण
              </span>
            </span>
            <span className="hidden sm:inline text-[10px] tracking-[0.16em] text-slate-400 uppercase leading-tight">
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
            className="rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300 whitespace-nowrap transition-[background-color,color,transform] duration-200 hover:bg-white/[0.08] hover:text-white active:scale-95"
          >
            Experience
          </a>
          <a
            href="#journey"
            className="rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300 whitespace-nowrap transition-[background-color,color,transform] duration-200 hover:bg-white/[0.08] hover:text-white active:scale-95"
          >
            Your Journey
          </a>
          <a
            href="#about"
            className="rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300 whitespace-nowrap transition-[background-color,color,transform] duration-200 hover:bg-white/[0.08] hover:text-white active:scale-95"
          >
            About
          </a>
          <a
            href="#privacy"
            className="rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300 whitespace-nowrap transition-[background-color,color,transform] duration-200 hover:bg-white/[0.08] hover:text-white active:scale-95"
          >
            Privacy
          </a>
        </nav>

        {/* Auth CTA Actions — Strictly Single-Line with whitespace-nowrap */}
        <div className="flex shrink-0 items-center gap-1 xs:gap-1.5 sm:gap-2.5">
          {isAuthenticated ? (
            <Link
              href="/sadhana"
              className="group inline-flex h-8.5 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-[#9E364C]/50 bg-[#7A2638] px-2.5 text-xs font-semibold text-white shadow-[0_2px_14px_rgba(122,38,56,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[#641C2C] hover:shadow-[0_4px_20px_rgba(122,38,56,0.6)] active:scale-[0.97] xs:h-9 xs:px-3 sm:h-10 sm:px-5 sm:text-sm"
            >
              <Flame className="size-3.5 shrink-0 text-[#E5C378]" aria-hidden="true" />
              <span>Go to Sādhana</span>
              <ArrowRight className="size-3.5 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link
                href="/auth"
                className="inline-flex h-8.5 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-white/15 bg-white/[0.05] px-2 text-[11px] font-medium text-slate-200 backdrop-blur-xs transition-[background-color,border-color,color,transform] duration-200 hover:border-[#C29438]/40 hover:bg-white/[0.1] hover:text-white active:scale-[0.97] xs:h-9 xs:px-2.5 xs:text-xs sm:h-10 sm:px-4 sm:text-sm"
              >
                Sign In
              </Link>
              <Link
                href="/auth?next=/sadhana"
                className="group inline-flex h-8.5 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-xl border border-[#9E364C]/50 bg-[#7A2638] px-2.5 text-[11px] font-semibold text-white shadow-[0_2px_14px_rgba(122,38,56,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[#641C2C] hover:shadow-[0_4px_20px_rgba(122,38,56,0.6)] active:scale-[0.97] xs:h-9 xs:gap-1.5 xs:px-3 xs:text-xs sm:h-10 sm:px-4.5 sm:text-sm"
              >
                <Flame className="size-3 shrink-0 text-[#E5C378] xs:size-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Begin Your Journey</span>
                <span className="sm:hidden">Begin</span>
                <ArrowRight className="size-3 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-1 xs:size-3.5" aria-hidden="true" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
