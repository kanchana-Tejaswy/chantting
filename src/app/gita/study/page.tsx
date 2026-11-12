import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { GitaStudyView } from "@/components/gita/gita-study-view";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadGitaStudyVault } from "@/lib/gita/queries";

export const dynamic = "force-dynamic";

export default async function GitaStudyRoute() {
  const result = await loadGitaStudyVault();

  if (result.status === "unauthenticated") {
    redirect("/auth?next=/gita/study");
  }

  if (result.status === "schema_not_ready") {
    return (
      <AppShell pageTitle="Gītā Study Vault">
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <Badge variant="gold" className="w-fit">
                Database Setup Required
              </Badge>
              <CardTitle className="mt-2 font-display text-3xl">
                Supabase migrations have not been applied yet
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
      <AppShell pageTitle="Gītā Study Vault">
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle>Could not load Personal Study Vault</CardTitle>
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
      pageTitle="Gītā Study Vault"
      userSummary={{
        displayName: result.viewer.displayName,
        email: result.viewer.email,
      }}
    >
      <GitaStudyView
        viewer={result.viewer}
        chapterSlots={result.chapterSlots}
        totalPublishedVerses={result.totalPublishedVerses}
        totalReadVerses={result.totalReadVerses}
        overallProgressPct={result.overallProgressPct}
        bookmarks={result.bookmarks}
        notes={result.notes}
        history={result.history}
        collections={result.collections}
        feedback={result.feedback}
        approvedVerseOptions={result.approvedVerseOptions}
      />
    </AppShell>
  );
}

