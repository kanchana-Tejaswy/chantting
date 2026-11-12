import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BookOpen, Compass, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { sanitizeRedirectPath } from "@/lib/auth/validation";
import { LotusEmblem } from "@/components/sacred/ornaments";
import { AuthPanel, type AuthMode } from "@/components/auth/auth-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign In",
};

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const nextPath = sanitizeRedirectPath(params.next, "/sadhana");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(nextPath);
  }

  const initialMode: AuthMode =
    params.mode === "signup"
      ? "signup"
      : params.mode === "forgot"
        ? "forgot"
        : "signin";

  return (
    <div className="relative flex min-h-dvh flex-col justify-between overflow-x-hidden bg-[#1A130D] text-[#FBF7EE]">
      {/* Full-screen Vrindavan Yamuna dawn backdrop */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/media/vrindavan-login-bg.jpg"
          alt=""
          className="size-full object-cover object-[58%_50%] select-none animate-ks-login-bg sm:object-center"
        />
        {/* Warm earthy & dusk-gold scrims preserving crisp legibility on desktop and mobile */}
        <div
          className="absolute inset-0 hidden lg:block"
          style={{
            background:
              "linear-gradient(102deg, rgba(22, 15, 10, 0.80) 0%, rgba(28, 19, 12, 0.58) 44%, rgba(24, 17, 11, 0.34) 72%, rgba(20, 14, 9, 0.44) 100%)",
          }}
        />
        <div
          className="absolute inset-0 lg:hidden"
          style={{
            background:
              "linear-gradient(180deg, rgba(20, 14, 9, 0.78) 0%, rgba(22, 15, 10, 0.56) 42%, rgba(20, 14, 9, 0.72) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 85% 65% at 72% 45%, rgba(236, 187, 104, 0.10), transparent 70%)",
          }}
        />
      </div>

      {/* Minimal Top Navigation */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 pt-5 sm:px-8 sm:pt-7">
        <Link
          href="/"
          className="group inline-flex items-center gap-2.5 rounded-full border border-[#E5BF73]/28 bg-[#1E150E]/55 px-3.5 py-2 text-xs font-medium text-[#FBF7EE] backdrop-blur-md transition-colors hover:border-[#E5BF73]/55 hover:bg-[#1E150E]/75"
        >
          <ArrowLeft
            className="size-3.5 text-[#E5BF73] transition-transform duration-150 group-hover:-translate-x-0.5"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span>Return to SMARAN</span>
        </Link>

        <div className="hidden items-center gap-4 text-xs text-[#E8DEC9]/85 sm:flex">
          <Link
            href="/gita"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-[#E5BF73]"
          >
            <BookOpen className="size-3.5" strokeWidth={1.6} aria-hidden="true" />
            <span>Bhagavad Gītā</span>
          </Link>
          <Link
            href="/library"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-[#E5BF73]"
          >
            <Compass className="size-3.5" strokeWidth={1.6} aria-hidden="true" />
            <span>Library</span>
          </Link>
        </div>
      </header>

      {/* Main Balanced Immersive Composition */}
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-5 py-8 sm:px-8 sm:py-10">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.08fr_minmax(0,440px)] lg:gap-14">
          {/* Left Sanctuary Story & Brand Identity */}
          <section
            aria-label="SMARAN Sanctuary Introduction"
            className="space-y-5 text-left"
          >
            <div className="inline-flex items-center gap-3 rounded-full border border-[#E5BF73]/30 bg-[#22170F]/60 px-3.5 py-1.5 backdrop-blur-sm">
              <span className="flex size-6 items-center justify-center rounded-full bg-[#E5BF73]/18 text-[#E5BF73]">
                <LotusEmblem size={14} />
              </span>
              <span className="text-xs font-semibold tracking-[0.16em] uppercase text-[#FBF7EE]">
                SMARAN
              </span>
              <span className="h-3 w-px bg-[#E5BF73]/35" aria-hidden="true" />
              <span lang="sa" className="text-sm font-medium text-[#E5BF73]">
                स्मरण
              </span>
            </div>

            <div className="space-y-3.5">
              <h1 className="max-w-xl font-display text-3xl font-semibold leading-[1.08] tracking-[-0.02em] text-[#FBF7EE] drop-shadow-[0_2px_18px_rgba(12,8,4,0.45)] sm:text-5xl lg:text-[3.25rem]">
                Remember Him. Stay Connected.
              </h1>
              <p className="max-w-lg text-base leading-relaxed text-[#F2E8D5]/92 sm:text-lg">
                A space for chanting, learning and devotion.
              </p>
              <p className="max-w-md text-sm leading-relaxed text-[#DECDB1]/82">
                Continue your personal Japa rounds, study Bhagavad Gītā verses,
                and maintain quiet remembrance with peaceful privacy defaults.
              </p>
            </div>

            <div className="hidden flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-[#E6D8BF]/80 sm:flex">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck
                  className="size-3.5 text-[#E5BF73]"
                  strokeWidth={1.6}
                  aria-hidden="true"
                />
                Private chanting records by default
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-1.5 rounded-full bg-[#92B47D]"
                  aria-hidden="true"
                />
                Daily rounds synced across devices
              </span>
            </div>
          </section>

          {/* Right Translucent Warm Ivory Login Interface */}
          <section
            aria-label="Sign in interface"
            className="flex w-full justify-center lg:justify-end"
          >
            <AuthPanel
              nextPath={nextPath}
              callbackError={params.error}
              initialMode={initialMode}
            />
          </section>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-[#E5BF73]/18 px-5 py-4 text-xs text-[#E4D6BE]/78 sm:px-8">
        <p>
          <span className="font-medium text-[#FBF7EE]">SMARAN</span>{" "}
          <span lang="sa" className="text-[#E5BF73]">
            स्मरण
          </span>{" "}
          · Remember Him. Stay Connected.
        </p>
        <nav aria-label="Sanctuary links" className="flex items-center gap-4">
          <Link href="/" className="transition-colors hover:text-[#FBF7EE]">
            Home
          </Link>
          <Link href="/gita" className="transition-colors hover:text-[#FBF7EE]">
            Gītā
          </Link>
          <Link
            href="/library"
            className="transition-colors hover:text-[#FBF7EE]"
          >
            Library
          </Link>
        </nav>
      </footer>
    </div>
  );
}
