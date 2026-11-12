import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ChantingWorkspace } from "@/components/chant/chanting-workspace";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loadChantWorkspaceData } from "@/lib/sadhana/queries";

export const dynamic = "force-dynamic";

export default async function ChantPage() {
  const result = await loadChantWorkspaceData();

  if (result.status === "unauthenticated") {
    redirect("/auth?next=/sadhana/chant");
  }

  if (result.status === "needs_onboarding") {
    redirect("/onboarding");
  }

  if (result.status === "schema_not_ready") {
    return (
      <AppShell
        pageTitle="Chanting Practice"
        userSummary={{
          displayName: result.userEmail ?? "Devotee",
          email: result.userEmail,
        }}
      >
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <Badge variant="gold" className="w-fit">
                Database Setup Required
              </Badge>
              <CardTitle className="mt-2 font-display text-3xl">
                Supabase migrations have not been applied yet
              </CardTitle>
              <CardDescription>
                Apply <code className="text-ink">supabase/migrations/0001</code>{" "}
                through <code className="text-ink">0008</code> before recording
                chanting rounds.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-ink-muted">
              {result.detail}
            </CardContent>
            <CardFooter>
              <Link
                href="/sadhana"
                className={buttonStyles({ variant: "secondary", size: "md" })}
              >
                Return to Dashboard
              </Link>
            </CardFooter>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (result.status === "error") {
    return (
      <AppShell
        pageTitle="Chanting Practice"
        userSummary={{
          displayName: result.userEmail ?? "Devotee",
          email: result.userEmail,
        }}
      >
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle>Unable to load chanting workspace</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-kumkum">
              {result.message}
            </CardContent>
            <CardFooter>
              <Link
                href="/sadhana"
                className={buttonStyles({ variant: "primary", size: "md" })}
              >
                Return to Dashboard
              </Link>
            </CardFooter>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      pageTitle="Chanting Practice"
      userSummary={{
        displayName: result.data.displayName,
        email: result.data.userEmail,
      }}
    >
      <ChantingWorkspace initialData={result.data} />
    </AppShell>
  );
}
