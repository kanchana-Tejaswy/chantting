import { AppShell } from "@/components/layout/app-shell";
import { GitaOverviewView } from "@/components/gita/gita-overview-view";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadGitaOverview } from "@/lib/gita/queries";

export const dynamic = "force-dynamic";

export default async function GitaPage() {
  const result = await loadGitaOverview();

  if (result.status === "schema_not_ready") {
    return (
      <AppShell pageTitle="Bhagavad Gītā">
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
      <AppShell pageTitle="Bhagavad Gītā">
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle>Could not load Bhagavad Gītā centre</CardTitle>
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
      pageTitle="Bhagavad Gītā"
      userSummary={
        result.viewer
          ? { displayName: result.viewer.displayName, email: result.viewer.email }
          : null
      }
    >
      <GitaOverviewView
        viewer={result.viewer}
        chapterSlots={result.chapterSlots}
        totalPublishedVerses={result.totalPublishedVerses}
        totalReadVerses={result.totalReadVerses}
        overallProgressPct={result.overallProgressPct}
        bookmarkCount={result.bookmarkCount}
        dailyWisdom={result.dailyWisdom}
      />
    </AppShell>
  );
}
