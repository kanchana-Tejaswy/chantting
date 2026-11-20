import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reset Password",
};

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/auth?error=Your+password+reset+session+is+missing+or+expired.+Request+a+new+reset+link."
    );
  }

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
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(102deg, rgba(22, 15, 10, 0.88) 0%, rgba(28, 19, 12, 0.72) 44%, rgba(20, 14, 9, 0.82) 100%)",
          }}
        />
      </div>

      {/* Minimal Top Navigation — Return to SMARAN */}
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
      </header>

      {/* Main Container */}
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 items-center px-5 py-8 sm:px-8 sm:py-10">
        <div className="w-full">
          <ResetPasswordForm email={user.email} />
        </div>
      </main>

      {/* Minimal Dedicated Auth Footer */}
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

