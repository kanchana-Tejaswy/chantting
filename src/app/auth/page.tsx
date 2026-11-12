import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sanitizeRedirectPath } from "@/lib/auth/validation";
import { AppShell } from "@/components/layout/app-shell";
import { AuthPanel, type AuthMode } from "@/components/auth/auth-panel";

export const dynamic = "force-dynamic";

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
    <AppShell pageTitle="Sign In">
      <AuthPanel
        nextPath={nextPath}
        callbackError={params.error}
        initialMode={initialMode}
      />
    </AppShell>
  );
}
