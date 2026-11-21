import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { sanitizeRedirectPath } from "@/lib/auth/validation";
import { AuthPanel, type AuthMode } from "@/components/auth/auth-panel";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeroStory } from "@/components/auth/auth-hero-story";

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
              "linear-gradient(102deg, rgba(22, 15, 10, 0.82) 0%, rgba(28, 19, 12, 0.62) 44%, rgba(24, 17, 11, 0.40) 72%, rgba(20, 14, 9, 0.50) 100%)",
          }}
        />
        <div
          className="absolute inset-0 lg:hidden"
          style={{
            background:
              "linear-gradient(180deg, rgba(20, 14, 9, 0.82) 0%, rgba(22, 15, 10, 0.65) 42%, rgba(20, 14, 9, 0.78) 100%)",
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

      {/* Minimal Top Navigation — Return to SMARAN & Language Selector */}
      <AuthHeader />

      {/* Main Balanced Immersive Composition */}
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-5 py-8 sm:px-8 sm:py-10">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.08fr_minmax(0,440px)] lg:gap-14">
          {/* Left Sanctuary Story & Brand Identity */}
          <AuthHeroStory />

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

      {/* Minimal Dedicated Auth Footer — No Application Navigation */}
      <footer className="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-[#E5BF73]/18 px-5 py-4 text-xs text-[#E4D6BE]/78 sm:px-8">
        <p>
          <span className="font-medium text-[#FBF7EE]">SMARAN</span>{" "}
          <span lang="sa" className="text-[#E5BF73]">
            स्मरण
          </span>{" "}
          · Remember Him. Stay Connected.
        </p>
        <p className="text-[#DECDB1]/70">
          Private by default · Devotional sanctuary
        </p>
      </footer>
    </div>
  );
}
