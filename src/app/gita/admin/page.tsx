import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { GitaAdminStudio } from "@/components/gita/gita-admin-studio";
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
import { loadGitaAdminWorkspace } from "@/lib/gita/queries";

export const dynamic = "force-dynamic";

export default async function GitaAdminRoute() {
  const result = await loadGitaAdminWorkspace();

  if (result.status === "unauthenticated") {
    redirect("/auth?next=/gita/admin");
  }

  if (result.status === "forbidden") {
    return (
      <AppShell
        pageTitle="Gītā Administration"
        userSummary={{
          displayName: result.viewer.displayName,
          email: result.viewer.email,
        }}
      >
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <Badge variant="kumkum" className="w-fit">
                403 · Administrator Access Required
              </Badge>
              <CardTitle className="mt-2 font-display text-3xl">
                Scripture Content Studio is Restricted
              </CardTitle>
              <CardDescription>
                Only authorized scripture administrators listed in{" "}
                <code className="text-ink">public.platform_admins</code> may
                ingest, review, approve, or modify Bhagavad Gītā chapters,
                verses, translations, sources, and commentary.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Link
                href="/gita"
                className={buttonStyles({ variant: "primary", size: "md" })}
              >
                Return to Bhagavad Gītā
              </Link>
            </CardFooter>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (result.status === "schema_not_ready") {
    return (
      <AppShell pageTitle="Gītā Administration">
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <Badge variant="gold" className="w-fit">
                Database Setup Required
              </Badge>
              <CardTitle className="mt-2 font-display text-3xl">
                Migrations 0001–0010 must be applied first
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-ink-muted">
              {result.detail}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (result.status === "error") {
    return (
      <AppShell pageTitle="Gītā Administration">
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle>Could not load Content Studio</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-kumkum">
              {result.message}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      pageTitle="Gītā Content Studio"
      userSummary={{
        displayName: result.viewer.displayName,
        email: result.viewer.email,
      }}
    >
      <GitaAdminStudio
        viewer={result.viewer}
        sources={result.sources}
        chapters={result.chapters}
        verses={result.verses}
        translations={result.translations}
        explanations={result.explanations}
        feedback={result.feedback}
        auditLogs={result.auditLogs}
      />
    </AppShell>
  );
}

