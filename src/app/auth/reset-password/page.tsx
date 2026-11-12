import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const dynamic = "force-dynamic";

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
    <AppShell pageTitle="Reset Password">
      <ResetPasswordForm email={user.email} />
    </AppShell>
  );
}

